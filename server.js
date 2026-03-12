import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.2";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const VALID_MODES = new Set(["cooperative", "competitive"]);
const VALID_PROVIDERS = new Set(["openai", "gemini"]);

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

function normalizeProvider(value) {
  const token = String(value || "").trim().toLowerCase();
  if (!token) return "openai";
  return VALID_PROVIDERS.has(token) ? token : null;
}

function resolveProviderSelection(body = {}) {
  const provider = normalizeProvider(body?.provider);
  if (!provider) {
    throw new Error("Invalid provider. Use openai or gemini.");
  }
  return {
    provider,
    apiKey: String(body?.apiKey || "").trim(),
    model: normalizeModel(body?.model, provider)
  };
}

function defaultModelForProvider(provider) {
  return provider === "gemini" ? GEMINI_MODEL : OPENAI_MODEL;
}

function normalizeModel(value, provider = "openai") {
  let token = String(value || "").trim();
  if (!token) return defaultModelForProvider(provider);
  if (provider === "gemini") {
    token = token.replace(/^models\//i, "");
  }
  return token;
}

function resolveTemperature(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const bounded = Math.max(0, Math.min(2, n));
  return Math.round(bounded * 100) / 100;
}

function resolveBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (token === "true") return true;
    if (token === "false") return false;
  }
  return fallback;
}

function isGemini25FlashFamily(model) {
  return /^gemini-2\.5-flash/i.test(String(model || "").trim());
}

function isGemini3Family(model) {
  return /^gemini-3/i.test(String(model || "").trim());
}

function recentTranscript(transcript = [], maxItems = 16) {
  if (!Array.isArray(transcript)) return [];
  return transcript.slice(-maxItems);
}

function normalizePointFingerprint(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeCoveredPoints(transcript = [], maxItems = 6) {
  const seen = new Set();
  const points = [];

  for (let i = transcript.length - 1; i >= 0 && points.length < maxItems; i -= 1) {
    const item = transcript[i];
    const content = String(item?.content || "").trim();
    if (!content) continue;

    const fingerprint = normalizePointFingerprint(content).slice(0, 120);
    if (!fingerprint || seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    const speaker = String(item?.name || item?.role || "speaker").trim();
    points.push(`${speaker}: ${content}`);
  }

  return points.reverse();
}

function sanitizePhraseList(agentPhrases = [], maxItems = 3) {
  if (!Array.isArray(agentPhrases)) return [];
  return agentPhrases
    .map(item => String(item || "").trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildTeamRosterText(teamRoster = [], currentAgent = "", currentLens = "") {
  if (!Array.isArray(teamRoster) || teamRoster.length === 0) {
    return currentAgent && currentLens ? `${currentAgent} - ${currentLens}` : "(Roster unavailable)";
  }

  const clean = teamRoster
    .map(member => {
      const name = String(member?.name || "").trim();
      const lens = String(member?.lens || "").trim();
      if (!name && !lens) return "";
      if (!name) return lens;
      if (!lens) return name;
      return `${name} - ${lens}`;
    })
    .filter(Boolean)
    .slice(0, 8);

  return clean.join(", ") || "(Roster unavailable)";
}

function inferDiscussionPhase(turnIndex, wrapUp) {
  if (wrapUp) return "late";
  const turn = Number(turnIndex);
  if (!Number.isFinite(turn) || turn <= 1) return "early";
  if (turn <= 5) return "middle";
  return "late";
}

function phaseDirective(phase) {
  return [
    `Discussion phase: ${phase}`,
    "  early  -> introduce your angle, be exploratory, stake a position",
    "  middle -> pressure-test what's been said, demand evidence or trade-offs",
    "  late   -> lock in your single most defensible claim"
  ].join("\n");
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
    rigor: clampScore(block?.rigor),
    overall: clampScore(block?.overall)
  };
}

function normalizeWinner(value) {
  const token = String(value || "").trim().toLowerCase();
  if (token === "answer1" || token === "answer 1" || token === "1") {
    return "cooperative";
  }
  if (token === "answer2" || token === "answer 2" || token === "2") {
    return "competitive";
  }
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
    coop.rigor === comp.rigor &&
    coop.usefulness === comp.usefulness &&
    coop.clarity === comp.clarity
  );
}

function decideWinnerFromScores(scores) {
  if (areScoresExactlyEqual(scores)) return "tie";

  const comparisons = [
    ["overall", 1],
    ["practicality", 1],
    ["rigor", 1],
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

function buildJudgePrompt({
  topic,
  cooperativeConclusion,
  competitiveConclusion,
  cooperativeTranscript = [],
  competitiveTranscript = []
}) {
  const question = String(topic || "").trim();
  const answer1 = String(cooperativeConclusion || "").trim();
  const answer2 = String(competitiveConclusion || "").trim();
  const coopDiscussion = transcriptToText(recentTranscript(cooperativeTranscript, 24));
  const compDiscussion = transcriptToText(recentTranscript(competitiveTranscript, 24));

  return `which answer you like most for question \`${question}\`:


1:
\`\`\`
${answer1}
\`\`\`

2:
\`\`\`
${answer2}
\`\`\`

cooperative discussion evidence:
\`\`\`
${coopDiscussion || "(No cooperative transcript provided)"}
\`\`\`

competitive discussion evidence:
\`\`\`
${compDiscussion || "(No competitive transcript provided)"}
\`\`\``;
}

function countWords(text) {
  return String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function isWeakAgentTurn(text) {
  const value = String(text || "").trim();
  if (!value) return true;
  if (countWords(value) < 16) return true;
  if (/[,:;]$/.test(value)) return true;
  if (!/[.!?]["')\]]?$/.test(value)) return true;
  return false;
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
  const coopRaw = parsed?.scores?.cooperative || parsed?.scores?.answer1 || parsed?.scores?.one;
  const compRaw = parsed?.scores?.competitive || parsed?.scores?.answer2 || parsed?.scores?.two;
  const scores = {
    cooperative: normalizeScoreBlock(coopRaw),
    competitive: normalizeScoreBlock(compRaw)
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

async function callOpenAI({
  apiKey,
  model = OPENAI_MODEL,
  systemPrompt,
  userPrompt,
  maxOutputTokens = 180,
  temperature = 0.7
}) {
  const resolvedKey = String(apiKey || OPENAI_API_KEY || "").trim();
  if (!resolvedKey) {
    throw new Error("OpenAI API key is missing");
  }

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
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

function extractGeminiText(responseJson) {
  const candidates = Array.isArray(responseJson?.candidates) ? responseJson.candidates : [];
  const parts = candidates.flatMap(candidate => {
    const contentParts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    return contentParts
      .map(part => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean);
  });

  const text = parts.join("\n").trim();
  if (text) return text;

  const blockReason = responseJson?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the prompt: ${blockReason}`);
  }
  throw new Error("Gemini response was empty");
}

async function callGemini({
  apiKey,
  model = GEMINI_MODEL,
  systemPrompt,
  userPrompt,
  maxOutputTokens = 180,
  temperature = 0.7,
  enableThinking = false
}) {
  const resolvedKey = String(apiKey || GEMINI_API_KEY || "").trim();
  if (!resolvedKey) {
    throw new Error("Gemini API key is missing");
  }

  const generationConfig = {
    maxOutputTokens,
    responseMimeType: "text/plain"
  };

  if (isGemini3Family(model)) {
    generationConfig.temperature = 1.0;
  } else {
    generationConfig.temperature = temperature;
  }

  if (isGemini25FlashFamily(model) && !enableThinking) {
    // This app needs low-latency, finished turns more than Gemini's default dynamic thinking.
    generationConfig.thinkingConfig = {
      thinkingBudget: 0
    };
  }

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig
  };

  if (systemPrompt) {
    payload.system_instruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": resolvedKey
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await resp.json();
  if (!resp.ok) {
    const msg = data?.error?.message || "Gemini request failed";
    throw new Error(msg);
  }

  return extractGeminiText(data);
}

async function callModel({
  provider = "openai",
  apiKey = "",
  model = "",
  systemPrompt,
  userPrompt,
  maxOutputTokens = 180,
  temperature = 0.7,
  enableThinking = false
}) {
  if (provider === "gemini") {
    return callGemini({
      apiKey,
      model: normalizeModel(model, "gemini"),
      systemPrompt,
      userPrompt,
      maxOutputTokens,
      temperature,
      enableThinking
    });
  }

  const resolvedKey = String(apiKey || OPENAI_API_KEY || "").trim();
  if (!resolvedKey) {
    throw new Error("OpenAI API key is missing");
  }

  return callOpenAI({
    apiKey: resolvedKey,
    model: normalizeModel(model, "openai"),
    systemPrompt,
    userPrompt,
    maxOutputTokens,
    temperature
  });
}

function dedupeModelOptions(items = []) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const id = String(item?.id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push({
      id,
      label: String(item?.label || id).trim() || id
    });
  }
  return output.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }));
}

async function listOpenAIModels({ apiKey }) {
  const resolvedKey = String(apiKey || OPENAI_API_KEY || "").trim();
  if (!resolvedKey) {
    throw new Error("OpenAI API key is missing");
  }

  const resp = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${resolvedKey}`,
      "Content-Type": "application/json"
    }
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || "OpenAI model list request failed");
  }

  const items = Array.isArray(data?.data)
    ? data.data.map(entry => ({
        id: String(entry?.id || "").trim(),
        label: String(entry?.id || "").trim()
      }))
    : [];

  return dedupeModelOptions(items);
}

async function listGeminiModels({ apiKey }) {
  const resolvedKey = String(apiKey || GEMINI_API_KEY || "").trim();
  if (!resolvedKey) {
    throw new Error("Gemini API key is missing");
  }

  const params = new URLSearchParams({
    key: resolvedKey,
    pageSize: "1000"
  });
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data?.error?.message || "Gemini model list request failed");
  }

  const items = Array.isArray(data?.models)
    ? data.models
        .filter(modelInfo => {
          const methods = Array.isArray(modelInfo?.supportedGenerationMethods)
            ? modelInfo.supportedGenerationMethods
            : [];
          return methods.includes("generateContent");
        })
        .map(modelInfo => {
          const id = normalizeModel(modelInfo?.name, "gemini");
          const displayName = String(modelInfo?.displayName || "").trim();
          return {
            id,
            label: displayName && displayName !== id ? `${displayName} (${id})` : id
          };
        })
    : [];

  return dedupeModelOptions(items);
}

async function listProviderModels({ provider, apiKey }) {
  if (provider === "gemini") {
    return listGeminiModels({ apiKey });
  }
  return listOpenAIModels({ apiKey });
}

async function generateAgentTurn({
  provider,
  apiKey,
  model,
  systemPrompt,
  userPrompt,
  maxOutputTokens,
  temperature
}) {
  const firstPass = await callModel({
    provider,
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    maxOutputTokens,
    temperature
  });

  if (!isWeakAgentTurn(firstPass)) {
    return firstPass;
  }

  const repairedSystemPrompt = [
    systemPrompt,
    "Additional requirement:",
    "- Write 2 to 4 complete sentences, roughly 28 to 85 words.",
    "- Finish every sentence. No fragments, no trailing clauses, no opener-only responses.",
    "- Make one self-contained contribution with a concrete claim, risk, trade-off, or action."
  ].join("\n");

  const repairedUserPrompt = [
    userPrompt,
    "Important: your previous attempt was too short or incomplete.",
    "Return a fully finished response now."
  ].join("\n\n");

  return callModel({
    provider,
    apiKey,
    model,
    systemPrompt: repairedSystemPrompt,
    userPrompt: repairedUserPrompt,
    maxOutputTokens,
    temperature: Math.max(0.65, temperature - 0.05)
  });
}

function result(status, payload) {
  return { status, payload };
}

export async function handleAgentTurnRequest(body = {}) {
  let providerConfig;
  try {
    providerConfig = resolveProviderSelection(body);
  } catch (err) {
    return result(400, { error: err.message || "Invalid provider configuration" });
  }

  const {
    topic,
    mode,
    agent,
    agentRole = "Generalist",
    agentMission = "",
    agentStyle = "",
    agentPersonality = "",
    agentPhrases = [],
    teamRoster = [],
    transcript = [],
    wrapUp = false,
    turnIndex = 0,
    temperature
  } = body;
  if (!topic || !mode || !agent) {
    return result(400, { error: "topic, mode, and agent are required" });
  }
  if (!VALID_MODES.has(mode)) {
    return result(400, { error: "Invalid mode. Use cooperative or competitive." });
  }

  const phase = inferDiscussionPhase(turnIndex, wrapUp);
  const rosterText = buildTeamRosterText(teamRoster, agent, agentRole);
  const phraseList = sanitizePhraseList(agentPhrases, 3);
  const modeDirective =
    mode === "cooperative"
      ? [
          "Your job: make the collective answer more complete with every turn.",
          "Find the gap nobody has filled yet - a missing constraint, an unaddressed risk, an unmeasured outcome - and fill it from your lens.",
          "Do not restate, rephrase, or validate what teammates already said.",
          "Redirect and extend. Never hard-contradict unless correcting a clear factual error."
        ].join("\n")
      : [
          "Your job: expose weak reasoning before it hardens into consensus.",
          "Each turn, find exactly ONE of:",
          "  - An assumption stated as fact that hasn't been tested",
          "  - A risk named but not quantified or mitigated",
          "  - An alternative approach the group is ignoring",
          "  - A logical gap between a claim and its evidence",
          "Do not just disagree - replace weak reasoning with stronger reasoning.",
          "Slowing down bad convergence IS your contribution.",
          "Challenge with specificity. Vague pushback is worthless."
        ].join("\n");

  const systemPrompt = [
    `You are ${agent}, one of 4 agents in a ${mode} discussion.`,
    `Your unique lens is: ${agentRole}.`,
    agentMission ? `Your mission: ${agentMission}` : "",
    agentStyle ? `Your speaking style: ${agentStyle}` : "",
    agentPersonality ? `Your personality vibe: ${agentPersonality}` : "",
    `Your team roster: ${rosterText}`,
    "Stay in your lane. Own your lens. Let teammates own theirs.",
    modeDirective,
    phaseDirective(phase),
    wrapUp
      ? "Discussion closing. One crisp, non-negotiable claim the conclusion must carry forward."
      : "One clear net-new point. Move the conversation forward, not sideways.",
    phraseList.length > 0
      ? `Voice anchors (weave in at most one naturally): ${phraseList.map(p => `"${p}"`).join(", ")}.`
      : "",
    "Hard rules:",
    "- Write 2 to 4 complete sentences, roughly 28 to 85 words.",
    "- No bullets.",
    "- No roleplay markup.",
    "- Finish every sentence. No fragments or trailing clauses.",
    "- If a point is already covered, your only option is to deepen or challenge it - never restate it.",
    "- Anchor briefly to one prior idea, then advance it from your unique lens."
  ]
    .filter(Boolean)
    .join("\n");

  const trimmedTranscript = recentTranscript(transcript, 18);
  const coveredPoints = summarizeCoveredPoints(trimmedTranscript, 6);

  const userPrompt = [
    `Topic: ${topic}`,
    `Turn number: ${Number(turnIndex) + 1}`,
    "Points already covered (deepen or challenge instead of restating):",
    coveredPoints.map((point, idx) => `${idx + 1}. ${point}`).join("\n") || "(None yet)",
    "Recent transcript:",
    transcriptToText(trimmedTranscript) || "(No prior messages yet)",
    `Now respond as ${agent}.`
  ].join("\n\n");

  const defaultTurnTemperature = mode === "competitive" ? 0.85 : 0.72;
  const turnTemperature = resolveTemperature(temperature, defaultTurnTemperature);

  const text = await generateAgentTurn({
    provider: providerConfig.provider,
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    systemPrompt,
    userPrompt,
    maxOutputTokens: 150,
    temperature: turnTemperature
  });

  return result(200, { text });
}

export async function handleConclusionRequest(body = {}) {
  let providerConfig;
  try {
    providerConfig = resolveProviderSelection(body);
  } catch (err) {
    return result(400, { error: err.message || "Invalid provider configuration" });
  }

  const { topic, mode, transcript = [], temperature } = body;
  if (!topic || !mode) {
    return result(400, { error: "topic and mode are required" });
  }

  const systemPrompt =
    mode === "cooperative"
      ? [
          "You are the synthesis moderator for a cooperative decision discussion.",
          "Write exactly 3 bullet points and one final line starting with 'Conclusion:'.",
          "",
          "Bullet 1: The core recommended action with its primary condition or trigger.",
          "Bullet 2: The most important risk identified and how it is controlled.",
          "Bullet 3: The single clearest success signal - how you know it's working.",
          "",
          "Rules:",
          "- Each bullet must be a complete, standalone claim. No vague language.",
          "- No bullet may depend on another bullet to make sense.",
          "- Conclusion line must commit to a position. No 'it depends' endings.",
          "- Concrete and practical. If you can't measure it, don't say it."
        ].join("\n")
      : [
          "You are the synthesis moderator for a competitive decision discussion.",
          "Write exactly 3 bullet points and one final line starting with 'Conclusion:'.",
          "",
          "Bullet 1: The strongest position that survived all challenges in the discussion.",
          "Bullet 2: The most critical assumption that must be validated before committing - and what happens if it fails.",
          "Bullet 3: One concrete, falsifiable test that determines go or no-go within a defined timeframe.",
          "",
          "Rules:",
          "- Each bullet must be a complete, standalone claim. No vague language.",
          "- No bullet may depend on another bullet to make sense.",
          "- Conclusion line must commit to a position. No 'it depends' endings.",
          "- Rigorous and decisive. If you can't test it, don't claim it."
        ].join("\n");

  const userPrompt = [
    `Topic: ${topic}`,
    "Discussion transcript:",
    transcriptToText(transcript) || "(No discussion)",
    "Provide final conclusion now."
  ].join("\n\n");

  const text = await callModel({
    provider: providerConfig.provider,
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    systemPrompt,
    userPrompt,
    maxOutputTokens: 200,
    temperature: resolveTemperature(temperature, 0.4)
  });

  return result(200, { text });
}

export async function handleModelsRequest(body = {}) {
  let providerConfig;
  try {
    providerConfig = resolveProviderSelection(body);
  } catch (err) {
    return result(400, { error: err.message || "Invalid provider configuration" });
  }

  const models = await listProviderModels({
    provider: providerConfig.provider,
    apiKey: providerConfig.apiKey
  });

  return result(200, {
    provider: providerConfig.provider,
    defaultModel: defaultModelForProvider(providerConfig.provider),
    selectedModel: providerConfig.model,
    models
  });
}

export async function handleJudgeRequest(body = {}) {
  let providerConfig;
  try {
    providerConfig = resolveProviderSelection(body);
  } catch (err) {
    return result(400, { error: err.message || "Invalid provider configuration" });
  }

  const {
    topic,
    cooperativeConclusion,
    competitiveConclusion,
    cooperativeTranscript = [],
    competitiveTranscript = [],
    temperature,
    enableThinking = false
  } = body;
  if (!topic || !cooperativeConclusion || !competitiveConclusion) {
    return result(400, {
      error: "topic, cooperativeConclusion, and competitiveConclusion are required"
    });
  }

  const systemPrompt = [
    "You are an impartial judge evaluating two approaches to the same decision question.",
    "Answer 1 = cooperative. Answer 2 = competitive.",
    "Use only the content provided in this prompt. No prior context.",
    "Score each answer on five dimensions (0-10, one decimal): clarity, practicality, usefulness, rigor, overall.",
    "Use transcript evidence to inform practicality, usefulness, and rigor scores.",
    "Process quality means: novelty of challenges, logical soundness, evidence use, and quality of trade-off handling in the discussion.",
    "Scoring rules:",
    "- Do not reward length or structural complexity over substance.",
    "- Rigor should reward falsification, assumption-testing, and explicit failure modes - not just having more bullet points.",
    "- Practicality should reward clarity of next steps, not just naming them.",
    "- Do not default to tie for politeness. Ties require all five metrics to be exactly equal.",
    "- A well-structured synthesis and a rigorous falsification approach are equally valid paths to a high score - judge the quality of each on its own terms.",
    "Return only JSON with this exact shape:",
    '{"winner":"cooperative|competitive|tie","rationale":"short reason","scores":{"cooperative":{"clarity":0,"practicality":0,"usefulness":0,"rigor":0,"overall":0},"competitive":{"clarity":0,"practicality":0,"usefulness":0,"rigor":0,"overall":0}}}'
  ].join("\n");

  const userPrompt = buildJudgePrompt({
    topic,
    cooperativeConclusion,
    competitiveConclusion,
    cooperativeTranscript,
    competitiveTranscript
  });

  const text = await callModel({
    provider: providerConfig.provider,
    apiKey: providerConfig.apiKey,
    model: providerConfig.model,
    systemPrompt,
    userPrompt,
    maxOutputTokens: 260,
    temperature: resolveTemperature(temperature, 0.2),
    enableThinking: resolveBoolean(enableThinking, false)
  });

  const parsed = parseJudgeJson(text);
  const normalized = normalizeJudgeResult(parsed);
  return result(200, normalized);
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
      const body = await readBody(req);
      const outcome = await handleAgentTurnRequest(body);
      sendJson(res, outcome.status, outcome.payload);
      return;
    }

    if (method === "POST" && pathname === "/api/conclusion") {
      const body = await readBody(req);
      const outcome = await handleConclusionRequest(body);
      sendJson(res, outcome.status, outcome.payload);
      return;
    }

    if (method === "POST" && pathname === "/api/models") {
      const body = await readBody(req);
      const outcome = await handleModelsRequest(body);
      sendJson(res, outcome.status, outcome.payload);
      return;
    }

    if (method === "POST" && pathname === "/api/judge") {
      const body = await readBody(req);
      const outcome = await handleJudgeRequest(body);
      sendJson(res, outcome.status, outcome.payload);
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

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export { server };
