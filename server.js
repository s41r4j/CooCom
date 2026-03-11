import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const VALID_MODES = new Set(["cooperative", "competitive"]);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": MIME[".json"] });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function transcriptToText(transcript = []) {
  return transcript
    .map((item, idx) => {
      const speaker = item?.name || item?.role || `speaker-${idx + 1}`;
      const lens = item?.lens ? ` [${item.lens}]` : "";
      const content = String(item?.content || "").trim();
      return `${speaker}${lens}: ${content}`;
    })
    .join("\n");
}

function recentTranscript(transcript = [], maxItems = 16) {
  if (!Array.isArray(transcript)) return [];
  return transcript.slice(-maxItems);
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  const bounded = Math.max(0, Math.min(10, n));
  return Math.round(bounded * 10) / 10;
}

function normalizeScoreBlock(block) {
  return {
    clarity: clampScore(block?.clarity),
    practicality: clampScore(block?.practicality),
    usefulness: clampScore(block?.usefulness),
    overall: clampScore(block?.overall)
  };
}

function normalizeWinner(value) {
  const token = String(value || "").trim().toLowerCase();
  if (token === "cooperative" || token === "competitive" || token === "tie") {
    return token;
  }
  return null;
}

function areScoresExactlyEqual(scores) {
  const coop = scores.cooperative;
  const comp = scores.competitive;
  return (
    coop.overall === comp.overall &&
    coop.practicality === comp.practicality &&
    coop.usefulness === comp.usefulness &&
    coop.clarity === comp.clarity
  );
}

function decideWinnerFromScores(scores) {
  if (areScoresExactlyEqual(scores)) return "tie";

  const comparisons = [
    ["overall", 1],
    ["practicality", 1],
    ["usefulness", 1],
    ["clarity", 1]
  ];

  for (const [key] of comparisons) {
    const diff = scores.cooperative[key] - scores.competitive[key];
    if (diff > 0) return "cooperative";
    if (diff < 0) return "competitive";
  }

  // Safety fallback; should not happen unless both blocks are exactly equal.
  return "tie";
}

function buildJudgePrompt(topic, cooperativeConclusion, competitiveConclusion) {
  const question = String(topic || "").trim();
  const answer1 = String(cooperativeConclusion || "").trim();
  const answer2 = String(competitiveConclusion || "").trim();

  return `which answer you like most for question \`${question}\`:


1:
\`\`\`
${answer1}
\`\`\`

2:
\`\`\`
${answer2}
\`\`\``;
}

function parseJudgeJson(rawText) {
  const raw = String(rawText || "").trim();
  if (!raw) throw new Error("Judge response was empty");

  const candidates = [];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  candidates.push(raw);

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(raw.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Continue trying fallback candidates.
    }
  }

  throw new Error("Judge response was not valid JSON");
}

function normalizeJudgeResult(parsed) {
  const scores = {
    cooperative: normalizeScoreBlock(parsed?.scores?.cooperative),
    competitive: normalizeScoreBlock(parsed?.scores?.competitive)
  };

  let winner = normalizeWinner(parsed?.winner);
  if (!winner) {
    winner = decideWinnerFromScores(scores);
  } else if (winner === "tie" && !areScoresExactlyEqual(scores)) {
    // Prevent overuse of tie when numeric scores are not truly equal.
    winner = decideWinnerFromScores(scores);
  }

  const rationale =
    String(parsed?.rationale || "").trim() || "Winner selected from comparative quality scores.";

  return { winner, rationale, scores };
}

function extractText(responseJson) {
  if (typeof responseJson?.output_text === "string" && responseJson.output_text.trim()) {
    return responseJson.output_text.trim();
  }

  const outputs = Array.isArray(responseJson?.output) ? responseJson.output : [];
  const chunks = [];
  for (const out of outputs) {
    const contentArr = Array.isArray(out?.content) ? out.content : [];
    for (const c of contentArr) {
      if (c?.type === "output_text" && c?.text) {
        chunks.push(c.text);
      } else if (c?.type === "text" && c?.text) {
        chunks.push(c.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function callOpenAI({ systemPrompt, userPrompt, maxOutputTokens = 180, temperature = 0.7 }) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature,
      max_output_tokens: maxOutputTokens,
      input: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.error?.message || "OpenAI request failed";
    throw new Error(msg);
  }

  const text = extractText(data);
  if (!text) {
    throw new Error("OpenAI response was empty");
  }
  return text;
}

async function serveStatic(req, res, pathname) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const fullPath = path.join(publicDir, cleanPath);
  const relative = path.relative(publicDir, fullPath);
  if (relative.startsWith("..")) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const data = await fs.readFile(fullPath);
    const ext = path.extname(fullPath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method || "GET";
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = url.pathname;

  try {
    if (method === "POST" && pathname === "/api/agent-turn") {
      const {
        topic,
        mode,
        agent,
        agentRole = "Generalist",
        agentMission = "",
        agentStyle = "",
        agentPersonality = "",
        transcript = [],
        wrapUp = false,
        turnIndex = 0
      } = await readBody(req);
      if (!topic || !mode || !agent) {
        sendJson(res, 400, { error: "topic, mode, and agent are required" });
        return;
      }
      if (!VALID_MODES.has(mode)) {
        sendJson(res, 400, { error: "Invalid mode. Use cooperative or competitive." });
        return;
      }

      const systemPrompt = [
        `You are ${agent}, one of 4 agents in a ${mode} discussion.`,
        `Your unique lens is: ${agentRole}.`,
        agentMission ? `Your mission: ${agentMission}` : "",
        agentStyle ? `Your speaking style: ${agentStyle}` : "",
        agentPersonality ? `Your personality vibe: ${agentPersonality}` : "",
        mode === "cooperative"
          ? "Be collaborative, build on prior ideas, and avoid unnecessary disagreement."
          : "Be competitive: challenge weak ideas, propose better alternatives, and defend your position.",
        wrapUp
          ? "Moderator alert: final seconds remaining. Give concise, high-value points to help final conclusion."
          : "Discussion is ongoing. Give one clear point that moves the conversation forward.",
        "Do not repeat existing points. If something is already covered, contribute a new trade-off, risk, metric, or action step.",
        "Briefly anchor to one prior idea, then advance it from your unique lens.",
        "Sound like a real teammate with a clear personal voice, not a generic assistant.",
        "Keep response under 85 words. No bullets. No roleplay markup."
      ]
        .filter(Boolean)
        .join(" ");

      const trimmedTranscript = recentTranscript(transcript, 18);

      const userPrompt = [
        `Topic: ${topic}`,
        `Turn number: ${Number(turnIndex) + 1}`,
        "Recent transcript:",
        transcriptToText(trimmedTranscript) || "(No prior messages yet)",
        `Now respond as ${agent}.`
      ].join("\n\n");

      const text = await callOpenAI({
        systemPrompt,
        userPrompt,
        maxOutputTokens: 150,
        temperature: 0.8
      });

      sendJson(res, 200, { text });
      return;
    }

    if (method === "POST" && pathname === "/api/conclusion") {
      const { topic, mode, transcript = [] } = await readBody(req);
      if (!topic || !mode) {
        sendJson(res, 400, { error: "topic and mode are required" });
        return;
      }

      const systemPrompt = [
        `You are the moderator for a ${mode} multi-agent decision chat.`,
        "Summarize final recommendation using exactly 3 short bullet points and one final line starting with 'Conclusion:'.",
        "Be concrete and practical."
      ].join(" ");

      const userPrompt = [
        `Topic: ${topic}`,
        "Discussion transcript:",
        transcriptToText(transcript) || "(No discussion)",
        "Provide final conclusion now."
      ].join("\n\n");

      const text = await callOpenAI({
        systemPrompt,
        userPrompt,
        maxOutputTokens: 200,
        temperature: 0.4
      });

      sendJson(res, 200, { text });
      return;
    }

    if (method === "POST" && pathname === "/api/judge") {
      const { topic, cooperativeConclusion, competitiveConclusion } = await readBody(req);
      if (!topic || !cooperativeConclusion || !competitiveConclusion) {
        sendJson(res, 400, { error: "topic, cooperativeConclusion, and competitiveConclusion are required" });
        return;
      }

      const systemPrompt = [
        "You are an impartial judge comparing answer 1 and answer 2 for one question.",
        "Use only the current prompt content. Do not use any prior conversation context.",
        "Score each answer from 0 to 10 (one decimal allowed) on: clarity, practicality, usefulness, overall.",
        "Pick a winner. Use tie only if all four scores are exactly equal.",
        "Return only JSON with this exact shape:",
        '{"winner":"cooperative|competitive|tie","rationale":"short reason","scores":{"cooperative":{"clarity":0,"practicality":0,"usefulness":0,"overall":0},"competitive":{"clarity":0,"practicality":0,"usefulness":0,"overall":0}}}'
      ].join(" ");

      const userPrompt = buildJudgePrompt(topic, cooperativeConclusion, competitiveConclusion);

      const text = await callOpenAI({
        systemPrompt,
        userPrompt,
        maxOutputTokens: 260,
        temperature: 0.2
      });

      const parsed = parseJudgeJson(text);
      const result = normalizeJudgeResult(parsed);
      sendJson(res, 200, result);
      return;
    }

    if (method === "GET") {
      await serveStatic(req, res, pathname);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
