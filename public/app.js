const PERSONALITY_POOL = [
  {
    id: "goal_framer",
    name: "Maya Chen",
    lens: "Goal Framer",
    missionCooperative: "Clarify decision goal, constraints, and shared success criteria.",
    missionCompetitive: "Challenge goal ambiguity and force sharper success criteria.",
    style: "Structured and concise.",
    personality: "Calm strategist who keeps the group grounded.",
    signaturePhrases: ["Let's define the objective first.", "What outcome are we optimizing for?", "Frame it before we solve it."],
    keywords: ["goal", "scope", "constraint", "criteria", "objective"]
  },
  {
    id: "execution_planner",
    name: "Arjun Mehta",
    lens: "Execution Planner",
    missionCooperative: "Convert ideas into practical steps, resources, and timeline.",
    missionCompetitive: "Stress-test execution plans for weak sequencing and unrealistic effort.",
    style: "Operational and action-oriented.",
    personality: "Energetic builder who turns ideas into action fast.",
    signaturePhrases: ["Let's make this executable.", "Who's doing what by when?", "Convert that into a concrete step."],
    keywords: ["timeline", "plan", "execution", "resource", "deliver"]
  },
  {
    id: "risk_analyst",
    name: "Leila Torres",
    lens: "Risk Analyst",
    missionCooperative: "Spot failure modes, dependencies, and mitigations early.",
    missionCompetitive: "Expose hidden downside risk and punish hand-wavy mitigation claims.",
    style: "Cautious but pragmatic.",
    personality: "Thoughtful skeptic who anticipates problems early.",
    signaturePhrases: ["What could break first?", "Name the failure mode explicitly.", "Mitigation needs a trigger, not hope."],
    keywords: ["risk", "failure", "dependency", "mitigate", "uncertainty"]
  },
  {
    id: "value_checker",
    name: "Noah Patel",
    lens: "Value Checker",
    missionCooperative: "Keep focus on user impact, adoption, and measurable outcomes.",
    missionCompetitive: "Challenge proposals that do not prove direct user or market value.",
    style: "Customer-first and evidence-led.",
    personality: "Empathetic product thinker obsessed with real user value.",
    signaturePhrases: ["Where is user value in this?", "What changes for the user tomorrow?", "Value without adoption is noise."],
    keywords: ["user", "adoption", "value", "metric", "outcome"]
  },
  {
    id: "cost_controller",
    name: "Victor Hale",
    lens: "Cost Controller",
    missionCooperative: "Keep plans lean and cost-aware without losing quality.",
    missionCompetitive: "Attack expensive assumptions and force a lower-cost path.",
    style: "Hard-nosed and economical.",
    personality: "Direct realist who fights waste and bloated plans.",
    signaturePhrases: ["What's the cheapest proof?", "Cost is a decision, not a footnote.", "If it can't pay for itself, cut it."],
    keywords: ["cost", "budget", "spend", "roi", "efficiency"]
  },
  {
    id: "speed_operator",
    name: "Zara Flynn",
    lens: "Speed Operator",
    missionCooperative: "Accelerate learning loops while preserving direction.",
    missionCompetitive: "Punish slow cycles and push faster proof through tight iterations.",
    style: "Urgent and tactical.",
    personality: "Fast-paced operator who values momentum over theory.",
    signaturePhrases: ["Shorter loop, better signal.", "Ship the smallest test first.", "Speed is information."],
    keywords: ["speed", "fast", "quick", "iterate", "time"]
  },
  {
    id: "quality_guard",
    name: "Ibrahim Cole",
    lens: "Quality Guard",
    missionCooperative: "Protect reliability, correctness, and maintainability.",
    missionCompetitive: "Challenge fragile shortcuts and demand robust quality bars.",
    style: "Strict and standards-driven.",
    personality: "Disciplined engineer who refuses fragile shortcuts.",
    signaturePhrases: ["Prove it under stress.", "Fragile wins are expensive losses.", "Quality debt compounds fast."],
    keywords: ["quality", "reliability", "maintainability", "debt", "stability"]
  },
  {
    id: "contrarian_probe",
    name: "Rhea Kapoor",
    lens: "Contrarian Probe",
    missionCooperative: "Surface blind spots while helping the team improve the plan.",
    missionCompetitive: "Pressure-test assumptions with hard counterexamples.",
    style: "Sharp and provocative.",
    personality: "Bold debater who exposes blind spots quickly.",
    signaturePhrases: ["What's the assumption hiding here?", "Counterexample: this fails when...", "Too neat usually means missing risk."],
    keywords: ["assumption", "evidence", "trade-off", "counterexample", "proof"]
  },
  {
    id: "data_interpreter",
    name: "Elena Park",
    lens: "Data Interpreter",
    missionCooperative: "Anchor recommendations in signal quality and measurement design.",
    missionCompetitive: "Call out weak evidence and invalid inferences.",
    style: "Analytical and precise.",
    personality: "Methodical analyst who values evidence over noise.",
    signaturePhrases: ["What's the baseline?", "Correlation is not enough here.", "Show the signal-to-noise ratio."],
    keywords: ["data", "signal", "metric", "evidence", "baseline"]
  },
  {
    id: "ethics_sentinel",
    name: "Samir Rao",
    lens: "Ethics Sentinel",
    missionCooperative: "Integrate ethical safeguards and long-term societal impact.",
    missionCompetitive: "Challenge risky choices that externalize harm or abuse trust.",
    style: "Principled and direct.",
    personality: "Values-driven thinker who flags hidden ethical costs.",
    signaturePhrases: ["Who carries the downside?", "Legality is not the same as legitimacy.", "Trust lost is hard to regain."],
    keywords: ["ethics", "harm", "trust", "fairness", "impact"]
  }
];

function samplePersonalities(pool, count) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled.slice(0, Math.max(0, Math.min(count, shuffled.length)));
}

function buildAgentCardsForMode(personalities, mode) {
  return personalities.map(profile => ({
    id: profile.id,
    name: profile.name,
    lens: profile.lens,
    mission: mode === "cooperative" ? profile.missionCooperative : profile.missionCompetitive,
    style: profile.style,
    personality: profile.personality,
    signaturePhrases: Array.isArray(profile.signaturePhrases) ? profile.signaturePhrases : [],
    keywords: profile.keywords
  }));
}

function pickRoundAgents() {
  const selected = samplePersonalities(PERSONALITY_POOL, 4);
  return {
    cooperative: buildAgentCardsForMode(selected, "cooperative"),
    competitive: buildAgentCardsForMode(selected, "competitive")
  };
}

const MAX_MS = 30 * 1000;
const ALERT_THRESHOLD_MS = 10 * 1000;
const MAX_TURNS_PER_MODE = 12;
const SCORE_STORAGE_KEY = "coocom_round_score_tally_v1";
const SCORE_HISTORY_STORAGE_KEY = "coocom_round_score_history_v1";
const CSV_INPUT_STORAGE_KEY = "coocom_csv_input_v1";
const MAX_HISTORY_ITEMS = 60;

const els = {
  topic: document.getElementById("topic"),
  startBtn: document.getElementById("startBtn"),
  timer: document.getElementById("timer"),
  status: document.getElementById("status"),
  coopLog: document.getElementById("coopLog"),
  compLog: document.getElementById("compLog"),
  coopConclusion: document.getElementById("coopConclusion"),
  compConclusion: document.getElementById("compConclusion"),
  scoreCoop: document.getElementById("scoreCoop"),
  scoreComp: document.getElementById("scoreComp"),
  judgeWinner: document.getElementById("judgeWinner"),
  judgeRationale: document.getElementById("judgeRationale"),
  judgeTally: document.getElementById("judgeTally"),
  judgePanel: document.getElementById("judgePanel"),
  judgeToggle: document.getElementById("judgeToggle"),
  judgeHistory: document.getElementById("judgeHistory"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
  judgeBackdrop: document.getElementById("judgeBackdrop"),
  csvToggle: document.getElementById("csvToggle"),
  csvPanel: document.getElementById("csvPanel"),
  csvBackdrop: document.getElementById("csvBackdrop"),
  csvInput: document.getElementById("csvInput"),
  csvHint: document.getElementById("csvHint"),
  csvRunBtn: document.getElementById("csvRunBtn"),
  csvCloseBtn: document.getElementById("csvCloseBtn")
};

let countdownHandle = null;
let roundTally = loadTally();
let roundHistory = loadHistory();
let isJudgePanelOpen = false;
let isCsvPanelOpen = false;
let isDiscussionRunning = false;

function formatMs(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function setStatus(text) {
  els.status.textContent = text;
}

function appendMessage(logEl, speaker, text, cls = "") {
  const row = document.createElement("p");
  row.className = `msg ${cls}`.trim();

  const speakerNode = document.createElement("span");
  speakerNode.className = "speaker";
  speakerNode.textContent = `${speaker}:`;
  row.appendChild(speakerNode);
  row.append(` ${text}`);

  logEl.appendChild(row);
  logEl.scrollTop = logEl.scrollHeight;
  return row;
}

function appendTyping(logEl, speaker) {
  return appendMessage(logEl, speaker, "is speaking...", "typing");
}

function clearUI() {
  els.coopLog.innerHTML = "";
  els.compLog.innerHTML = "";
  els.coopConclusion.textContent = "";
  els.compConclusion.textContent = "";
  setJudgePending("Scoring will appear after both final conclusions.");
}

async function postJson(url, body) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function createAgentState(agentCards) {
  const state = new Map();
  for (const card of agentCards) {
    state.set(card.id, { talks: 0, lastTurn: -Infinity });
  }
  return state;
}

function freshTally() {
  return { rounds: 0, cooperative: 0, competitive: 0, tie: 0 };
}

function sanitizeCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function loadTally() {
  try {
    const raw = localStorage.getItem(SCORE_STORAGE_KEY);
    if (!raw) return freshTally();
    const parsed = JSON.parse(raw);
    return {
      rounds: sanitizeCount(parsed?.rounds),
      cooperative: sanitizeCount(parsed?.cooperative),
      competitive: sanitizeCount(parsed?.competitive),
      tie: sanitizeCount(parsed?.tie)
    };
  } catch {
    return freshTally();
  }
}

function saveTally() {
  try {
    localStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(roundTally));
  } catch {
    // Ignore localStorage write failures and keep in-memory tally.
  }
}

function freshHistory() {
  return [];
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_STORAGE_KEY);
    if (!raw) return freshHistory();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return freshHistory();
    return parsed.filter(item => item && typeof item === "object").slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return freshHistory();
  }
}

function saveHistory() {
  try {
    localStorage.setItem(SCORE_HISTORY_STORAGE_KEY, JSON.stringify(roundHistory.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // Ignore localStorage write failures and keep in-memory history.
  }
}

function loadCsvInput() {
  try {
    return localStorage.getItem(CSV_INPUT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveCsvInput(raw) {
  try {
    localStorage.setItem(CSV_INPUT_STORAGE_KEY, String(raw || ""));
  } catch {
    // Ignore localStorage write failures.
  }
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function trimText(text, max = 120) {
  const value = String(text || "").trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function formatScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(1);
}

const EMPTY_SCORE_LINE = "C - | P - | U - | R - | O -";

function scoreLine(score = {}) {
  return `C ${formatScore(score.clarity)} | P ${formatScore(score.practicality)} | U ${formatScore(score.usefulness)} | R ${formatScore(score.rigor)} | O ${formatScore(score.overall)}`;
}

function winnerLabel(winner) {
  if (winner === "cooperative") return "Cooperative";
  if (winner === "competitive") return "Competitive";
  return "Tie";
}

function renderTally() {
  els.judgeTally.textContent = `Session (${roundTally.rounds} rounds): Cooperative ${roundTally.cooperative} | Competitive ${roundTally.competitive} | Ties ${roundTally.tie}`;
}

function renderHistory() {
  if (!els.judgeHistory) return;

  els.judgeHistory.innerHTML = "";
  if (roundHistory.length === 0) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "No rounds scored yet.";
    els.judgeHistory.appendChild(empty);
    return;
  }

  roundHistory.forEach((entry, index) => {
    const item = document.createElement("article");
    item.className = "history-item";

    const meta = document.createElement("p");
    meta.className = "history-meta";
    const left = document.createElement("span");
    left.textContent = `#${roundHistory.length - index} • ${formatTimestamp(entry?.timestamp)}`;
    const right = document.createElement("span");
    right.textContent = `Winner: ${winnerLabel(entry?.winner)}`;
    meta.append(left, right);

    const topic = document.createElement("p");
    topic.className = "history-topic";
    topic.textContent = `Topic: ${trimText(entry?.topic, 96) || "N/A"}`;

    const coopScores = document.createElement("p");
    coopScores.className = "history-overall";
    coopScores.textContent = `Coop ${scoreLine(entry?.scores?.cooperative)}`;

    const compScores = document.createElement("p");
    compScores.className = "history-overall";
    compScores.textContent = `Comp ${scoreLine(entry?.scores?.competitive)}`;

    const rationale = document.createElement("p");
    rationale.className = "history-rationale";
    rationale.textContent = trimText(entry?.rationale, 180) || "No rationale.";

    item.append(meta, topic, coopScores, compScores, rationale);
    els.judgeHistory.appendChild(item);
  });
}

function addRoundHistory({ topic, winner, scores, rationale }) {
  const record = {
    timestamp: new Date().toISOString(),
    topic: String(topic || "").trim(),
    winner,
    scores,
    rationale: String(rationale || "").trim()
  };
  roundHistory.unshift(record);
  if (roundHistory.length > MAX_HISTORY_ITEMS) {
    roundHistory = roundHistory.slice(0, MAX_HISTORY_ITEMS);
  }
  saveHistory();
  renderHistory();
}

function clearScoreHistory() {
  roundHistory = freshHistory();
  roundTally = freshTally();
  saveHistory();
  saveTally();
  renderHistory();
  renderTally();
  setJudgePending("History cleared. Start a new round to generate scores.");
}

function setControlsBusy(busy) {
  isDiscussionRunning = Boolean(busy);
  els.startBtn.disabled = isDiscussionRunning;
  els.topic.disabled = isDiscussionRunning;
  if (els.csvToggle) {
    els.csvToggle.disabled = isDiscussionRunning;
  }
  if (els.csvRunBtn) {
    els.csvRunBtn.disabled = isDiscussionRunning;
  }
}

function setJudgePanelOpen(open) {
  isJudgePanelOpen = Boolean(open);
  if (!els.judgePanel || !els.judgeToggle) return;
  if (isJudgePanelOpen && isCsvPanelOpen) {
    setCsvPanelOpen(false);
  }
  els.judgePanel.classList.toggle("is-collapsed", !isJudgePanelOpen);
  els.judgePanel.setAttribute("aria-hidden", isJudgePanelOpen ? "false" : "true");
  if (els.judgeBackdrop) {
    els.judgeBackdrop.classList.toggle("is-hidden", !isJudgePanelOpen);
    els.judgeBackdrop.setAttribute("aria-hidden", isJudgePanelOpen ? "false" : "true");
  }
  els.judgeToggle.setAttribute("aria-expanded", isJudgePanelOpen ? "true" : "false");
  const label = isJudgePanelOpen ? "Hide scoreboard" : "Show scoreboard";
  els.judgeToggle.setAttribute("aria-label", label);
  els.judgeToggle.setAttribute("title", label);
  els.judgeToggle.classList.toggle("is-active", isJudgePanelOpen);
}

function toggleJudgePanel() {
  setJudgePanelOpen(!isJudgePanelOpen);
}

function setCsvHint(text, isError = false) {
  if (!els.csvHint) return;
  els.csvHint.textContent = text;
  els.csvHint.classList.toggle("is-error", Boolean(isError));
}

function setCsvPanelOpen(open) {
  isCsvPanelOpen = Boolean(open);
  if (!els.csvPanel || !els.csvToggle) return;
  if (isCsvPanelOpen && isJudgePanelOpen) {
    setJudgePanelOpen(false);
  }
  els.csvPanel.classList.toggle("is-collapsed", !isCsvPanelOpen);
  els.csvPanel.setAttribute("aria-hidden", isCsvPanelOpen ? "false" : "true");
  if (els.csvBackdrop) {
    els.csvBackdrop.classList.toggle("is-hidden", !isCsvPanelOpen);
    els.csvBackdrop.setAttribute("aria-hidden", isCsvPanelOpen ? "false" : "true");
  }
  els.csvToggle.setAttribute("aria-expanded", isCsvPanelOpen ? "true" : "false");
  const label = isCsvPanelOpen ? "Close CSV test runner" : "Open CSV test runner";
  els.csvToggle.setAttribute("aria-label", label);
  els.csvToggle.setAttribute("title", label);
  if (isCsvPanelOpen && els.csvInput) {
    requestAnimationFrame(() => els.csvInput.focus());
  }
}

function toggleCsvPanel() {
  setCsvPanelOpen(!isCsvPanelOpen);
}

function stopCountdown() {
  if (!countdownHandle) return;
  clearInterval(countdownHandle);
  countdownHandle = null;
}

function parseCsvRows(raw) {
  const text = String(raw || "");
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      if (row.some(item => String(item).trim() !== "")) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += ch;
  }

  row.push(field);
  if (row.some(item => String(item).trim() !== "")) {
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error("CSV has unclosed quotes. Please fix and try again.");
  }
  return rows;
}

function parseQuestionCsv(raw) {
  const rows = parseCsvRows(raw);
  if (rows.length < 2) {
    throw new Error("CSV must include a header and at least one row.");
  }

  const header = rows[0].map(value => String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase());
  const questionIdx = header.indexOf("question");
  const idIdx = header.indexOf("id");
  if (questionIdx === -1) {
    throw new Error("Missing 'question' column in CSV header.");
  }

  const parsed = [];
  rows.slice(1).forEach((row, idx) => {
    const question = String(row[questionIdx] || "").trim();
    if (!question) {
      return;
    }
    const idRaw = idIdx === -1 ? "" : String(row[idIdx] || "").trim();
    const id = idRaw || String(idx + 1);
    parsed.push({ id, question });
  });

  if (parsed.length === 0) {
    throw new Error("No non-empty questions found in CSV.");
  }
  return parsed;
}

function clearWinnerClasses() {
  els.judgeWinner.classList.remove("winner-cooperative", "winner-competitive", "winner-tie");
}

function setJudgePending(message) {
  els.scoreCoop.textContent = EMPTY_SCORE_LINE;
  els.scoreComp.textContent = EMPTY_SCORE_LINE;
  clearWinnerClasses();
  els.judgeWinner.textContent = "Winner: Pending";
  els.judgeRationale.textContent = message;
}

function setJudgeError(message) {
  clearWinnerClasses();
  els.judgeWinner.textContent = "Winner: Unavailable";
  els.judgeRationale.textContent = message;
}

function applyWinnerToTally(winner) {
  if (!["cooperative", "competitive", "tie"].includes(winner)) return;
  roundTally.rounds += 1;
  roundTally[winner] += 1;
  saveTally();
  renderTally();
}

function renderJudgeResult(judge, topic, options = {}) {
  const coop = judge?.scores?.cooperative || {};
  const comp = judge?.scores?.competitive || {};
  const winner = ["cooperative", "competitive", "tie"].includes(judge?.winner) ? judge.winner : "tie";
  const shouldOpenPanel = options.openPanel !== false;

  els.scoreCoop.textContent = scoreLine(coop);
  els.scoreComp.textContent = scoreLine(comp);
  clearWinnerClasses();
  els.judgeWinner.classList.add(`winner-${winner}`);
  els.judgeWinner.textContent = `Winner: ${winnerLabel(winner)}`;
  els.judgeRationale.textContent = String(
    judge?.rationale || "Score generated from conclusion and transcript quality."
  ).trim();
  applyWinnerToTally(winner);
  addRoundHistory({
    topic,
    winner,
    scores: { cooperative: coop, competitive: comp },
    rationale: els.judgeRationale.textContent
  });
  if (shouldOpenPanel) {
    setJudgePanelOpen(true);
  }
  return winner;
}

function hasUsableConclusion(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return !value.toLowerCase().startsWith("failed to generate conclusion");
}

function agentLabel(card) {
  return `${card.name} (${card.lens})`;
}

function pickNextAgent({ agentCards, agentState, turn, lastSpeakerId, alertSent, transcript }) {
  const lastContent = String(transcript[transcript.length - 1]?.content || "").toLowerCase();
  const unspoken = agentCards.filter(card => agentState.get(card.id).talks === 0);
  const pool = unspoken.length > 0 ? unspoken : agentCards;

  let best = null;
  for (const card of pool) {
    const state = agentState.get(card.id);
    const turnsSinceLast = turn - state.lastTurn;
    const keywordHit = card.keywords.some(word => lastContent.includes(word));

    let score = 0;
    score += Math.max(0, 4 - state.talks) * 2;
    score += Math.min(6, turnsSinceLast);
    if (alertSent && state.talks === 0) score += 8;
    if (keywordHit) score += 3;
    if (card.id === lastSpeakerId) score -= 10;
    if (turnsSinceLast <= 1) score -= 5;
    score += Math.random() * 2;

    if (!best || score > best.score) {
      best = { card, score };
    }
  }

  return best.card;
}

async function runOneMode({ mode, topic, deadline, logEl, conclusionEl, agentCards }) {
  if (!Array.isArray(agentCards) || agentCards.length === 0) {
    conclusionEl.textContent = "Failed to generate conclusion: No agent personalities available for this round.";
    return { transcript: [], conclusion: conclusionEl.textContent };
  }
  const teamRoster = agentCards.map(card => ({ name: card.name, lens: card.lens }));
  const transcript = [];
  const agentState = createAgentState(agentCards);
  let alertSent = false;
  let turnsAfterAlert = 0;
  let lastSpeakerId = null;
  let turn = 0;

  while (Date.now() < deadline && turn < MAX_TURNS_PER_MODE) {
    const remaining = deadline - Date.now();
    if (remaining <= ALERT_THRESHOLD_MS && !alertSent) {
      const alertText = "10 seconds left. Wrap up your strongest points.";
      appendMessage(logEl, "Moderator", alertText, "moderator");
      transcript.push({ role: "moderator", name: "Moderator", content: alertText });
      alertSent = true;
    }

    const agentCard = pickNextAgent({
      agentCards,
      agentState,
      turn,
      lastSpeakerId,
      alertSent,
      transcript
    });

    const typingNode = appendTyping(logEl, agentLabel(agentCard));

    try {
      const data = await postJson("/api/agent-turn", {
        topic,
        mode,
        agent: agentCard.name,
        agentRole: agentCard.lens,
        agentMission: agentCard.mission,
        agentStyle: agentCard.style,
        agentPersonality: agentCard.personality,
        agentPhrases: agentCard.signaturePhrases,
        teamRoster,
        transcript,
        wrapUp: alertSent,
        turnIndex: turn
      });
      typingNode.remove();
      appendMessage(logEl, agentLabel(agentCard), data.text);
      transcript.push({
        role: "assistant",
        name: agentCard.name,
        lens: agentCard.lens,
        content: data.text
      });

      const current = agentState.get(agentCard.id);
      current.talks += 1;
      current.lastTurn = turn;
      lastSpeakerId = agentCard.id;
    } catch (err) {
      typingNode.remove();
      appendMessage(logEl, "Error", err.message || "Failed to fetch agent response.");
      break;
    }

    turn += 1;

    if (alertSent) {
      turnsAfterAlert += 1;
      if (turnsAfterAlert >= agentCards.length) break;
    }
  }

  try {
    const out = await postJson("/api/conclusion", { topic, mode, transcript });
    conclusionEl.textContent = out.text;
  } catch (err) {
    conclusionEl.textContent = `Failed to generate conclusion: ${err.message || "Unknown error"}`;
  }

  return { transcript, conclusion: String(conclusionEl.textContent || "").trim() };
}

function startCountdown(deadline) {
  stopCountdown();

  const tick = () => {
    const remaining = deadline - Date.now();
    els.timer.textContent = formatMs(remaining);
    if (remaining <= 0) {
      stopCountdown();
    }
  };

  tick();
  countdownHandle = setInterval(tick, 250);
}

async function runRound({ topic, historyTopic = topic, statusPrefix = "", openJudgePanel = true }) {
  const prefix = statusPrefix ? `${statusPrefix}: ` : "";
  const roundAgents = pickRoundAgents();
  const roster = roundAgents.cooperative.map(card => `${card.name} (${card.lens})`).join(", ");
  clearUI();
  setStatus(`${prefix}Running both discussions... Matched personalities: ${roster}`);

  const deadline = Date.now() + MAX_MS;
  startCountdown(deadline);

  try {
    const [coopResult, compResult] = await Promise.all([
      runOneMode({
        mode: "cooperative",
        topic,
        deadline,
        logEl: els.coopLog,
        conclusionEl: els.coopConclusion,
        agentCards: roundAgents.cooperative
      }),
      runOneMode({
        mode: "competitive",
        topic,
        deadline,
        logEl: els.compLog,
        conclusionEl: els.compConclusion,
        agentCards: roundAgents.competitive
      })
    ]);

    const cooperativeConclusion = String(coopResult?.conclusion || els.coopConclusion.textContent || "").trim();
    const competitiveConclusion = String(compResult?.conclusion || els.compConclusion.textContent || "").trim();
    const cooperativeTranscript = Array.isArray(coopResult?.transcript) ? coopResult.transcript : [];
    const competitiveTranscript = Array.isArray(compResult?.transcript) ? compResult.transcript : [];

    if (hasUsableConclusion(cooperativeConclusion) && hasUsableConclusion(competitiveConclusion)) {
      setStatus(`${prefix}Scoring final conclusions...`);
      try {
        const judge = await postJson("/api/judge", {
          topic,
          cooperativeConclusion,
          competitiveConclusion,
          cooperativeTranscript,
          competitiveTranscript
        });
        const winner = renderJudgeResult(judge, historyTopic, { openPanel: openJudgePanel });
        setStatus(`${prefix}Done. ${winnerLabel(winner)} won this round.`);
        return { winner, scored: true };
      } catch (err) {
        setJudgeError(`Scoring failed: ${err.message || "Unknown error"}`);
        setStatus(`${prefix}Done. Conclusions generated, but scoring failed.`);
        return { winner: null, scored: false };
      }
    } else {
      setJudgeError("Scoring skipped because one of the conclusions was unavailable.");
      setStatus(`${prefix}Done. Conclusions generated (scoring skipped).`);
      return { winner: null, scored: false };
    }
  } finally {
    stopCountdown();
    els.timer.textContent = "00:00";
  }
}

async function startDiscussion() {
  if (isDiscussionRunning) return;
  const topic = els.topic.value.trim();
  if (!topic) {
    setStatus("Please enter a topic first.");
    return;
  }

  setControlsBusy(true);
  try {
    await runRound({ topic, openJudgePanel: true });
  } finally {
    setControlsBusy(false);
  }
}

async function runCsvTests() {
  if (isDiscussionRunning) return;
  const csvRaw = String(els.csvInput?.value || "");
  saveCsvInput(csvRaw);

  let rows;
  try {
    rows = parseQuestionCsv(csvRaw);
    setCsvHint(`Parsed ${rows.length} question(s). Running sequential tests...`);
  } catch (err) {
    setCsvHint(err.message || "Unable to parse CSV.", true);
    return;
  }

  setCsvPanelOpen(false);
  setControlsBusy(true);

  const totals = { cooperative: 0, competitive: 0, tie: 0, failed: 0 };
  try {
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      els.topic.value = row.question;
      const prefix = `Batch ${i + 1}/${rows.length} [ID ${row.id}]`;
      const result = await runRound({
        topic: row.question,
        historyTopic: `[${row.id}] ${row.question}`,
        statusPrefix: prefix,
        openJudgePanel: false
      });
      if (result.winner && Object.prototype.hasOwnProperty.call(totals, result.winner)) {
        totals[result.winner] += 1;
      } else {
        totals.failed += 1;
      }
    }
    setJudgePanelOpen(true);
    const failedPart = totals.failed > 0 ? ` | Failed ${totals.failed}` : "";
    setStatus(
      `Batch complete (${rows.length}): Cooperative ${totals.cooperative} | Competitive ${totals.competitive} | Ties ${totals.tie}${failedPart}.`
    );
    setCsvHint(`Completed ${rows.length} test round(s).`);
  } finally {
    setControlsBusy(false);
  }
}

els.startBtn.addEventListener("click", startDiscussion);
if (els.judgeToggle) {
  els.judgeToggle.addEventListener("click", toggleJudgePanel);
}
if (els.judgeBackdrop) {
  els.judgeBackdrop.addEventListener("click", () => setJudgePanelOpen(false));
}
if (els.clearHistoryBtn) {
  els.clearHistoryBtn.addEventListener("click", clearScoreHistory);
}
if (els.csvToggle) {
  els.csvToggle.addEventListener("click", toggleCsvPanel);
}
if (els.csvBackdrop) {
  els.csvBackdrop.addEventListener("click", () => setCsvPanelOpen(false));
}
if (els.csvCloseBtn) {
  els.csvCloseBtn.addEventListener("click", () => setCsvPanelOpen(false));
}
if (els.csvRunBtn) {
  els.csvRunBtn.addEventListener("click", runCsvTests);
}
if (els.csvInput) {
  els.csvInput.value = loadCsvInput();
  els.csvInput.addEventListener("input", event => {
    saveCsvInput(event.target.value);
    setCsvHint("Each row runs one full 30-second round and appends to saved scoreboard history.");
  });
}
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (isCsvPanelOpen) {
    setCsvPanelOpen(false);
    return;
  }
  if (isJudgePanelOpen) {
    setJudgePanelOpen(false);
  }
});
els.timer.textContent = formatMs(MAX_MS);
renderTally();
renderHistory();
setJudgePending("Scoring will appear after both final conclusions.");
setJudgePanelOpen(false);
setCsvPanelOpen(false);
