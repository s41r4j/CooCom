const AGENT_CARDS = {
  cooperative: [
    {
      id: "coop_goal_framer",
      name: "Maya Chen",
      lens: "Goal Framer",
      mission: "Clarify decision goal, constraints, and success criteria.",
      style: "Structured and concise.",
      personality: "Calm strategist who keeps the group grounded.",
      keywords: ["goal", "scope", "constraint", "criteria", "objective"]
    },
    {
      id: "coop_execution_planner",
      name: "Arjun Mehta",
      lens: "Execution Planner",
      mission: "Convert ideas into practical steps, resources, and timeline.",
      style: "Operational and action-oriented.",
      personality: "Energetic builder who turns ideas into action fast.",
      keywords: ["timeline", "plan", "execution", "resource", "deliver"]
    },
    {
      id: "coop_risk_analyst",
      name: "Leila Torres",
      lens: "Risk Analyst",
      mission: "Spot failure modes, dependencies, and mitigations early.",
      style: "Cautious but pragmatic.",
      personality: "Thoughtful skeptic who anticipates problems early.",
      keywords: ["risk", "failure", "dependency", "mitigate", "uncertainty"]
    },
    {
      id: "coop_user_value_checker",
      name: "Noah Patel",
      lens: "User Value Checker",
      mission: "Keep focus on user impact, adoption, and measurable outcomes.",
      style: "Customer-first and evidence-led.",
      personality: "Empathetic product thinker obsessed with real user value.",
      keywords: ["user", "adoption", "value", "metric", "outcome"]
    }
  ],
  competitive: [
    {
      id: "comp_cost_skeptic",
      name: "Victor Hale",
      lens: "Cost Skeptic",
      mission: "Challenge expensive ideas and push for lean alternatives.",
      style: "Hard-nosed and economical.",
      personality: "Direct realist who fights waste and bloated plans.",
      keywords: ["cost", "budget", "spend", "roi", "efficiency"]
    },
    {
      id: "comp_speed_optimizer",
      name: "Zara Flynn",
      lens: "Speed Optimizer",
      mission: "Prioritize fast learning loops and shortest path to signal.",
      style: "Urgent and tactical.",
      personality: "Fast-paced operator who values momentum over theory.",
      keywords: ["speed", "fast", "quick", "iterate", "time"]
    },
    {
      id: "comp_quality_gatekeeper",
      name: "Ibrahim Cole",
      lens: "Quality Gatekeeper",
      mission: "Defend reliability, correctness, and long-term maintainability.",
      style: "Strict and standards-driven.",
      personality: "Disciplined engineer who refuses fragile shortcuts.",
      keywords: ["quality", "reliability", "maintainability", "debt", "stability"]
    },
    {
      id: "comp_contrarian_challenger",
      name: "Rhea Kapoor",
      lens: "Contrarian Challenger",
      mission: "Attack hidden assumptions and pressure-test weak logic.",
      style: "Sharp and provocative.",
      personality: "Bold debater who exposes blind spots quickly.",
      keywords: ["assumption", "evidence", "trade-off", "counterexample", "proof"]
    }
  ]
};

const MAX_MS = 30 * 1000;
const ALERT_THRESHOLD_MS = 10 * 1000;
const MAX_TURNS_PER_MODE = 12;
const SCORE_STORAGE_KEY = "coocom_round_score_tally_v1";
const SCORE_HISTORY_STORAGE_KEY = "coocom_round_score_history_v1";
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
  judgeBackdrop: document.getElementById("judgeBackdrop")
};

let countdownHandle = null;
let roundTally = loadTally();
let roundHistory = loadHistory();
let isJudgePanelOpen = false;

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

function scoreLine(score = {}) {
  return `C ${formatScore(score.clarity)} | P ${formatScore(score.practicality)} | U ${formatScore(score.usefulness)} | O ${formatScore(score.overall)}`;
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

    const overall = document.createElement("p");
    overall.className = "history-overall";
    overall.textContent = `Coop O ${formatScore(entry?.scores?.cooperative?.overall)} | Comp O ${formatScore(entry?.scores?.competitive?.overall)}`;

    const rationale = document.createElement("p");
    rationale.className = "history-rationale";
    rationale.textContent = trimText(entry?.rationale, 180) || "No rationale.";

    item.append(meta, topic, overall, rationale);
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

function setJudgePanelOpen(open) {
  isJudgePanelOpen = Boolean(open);
  if (!els.judgePanel || !els.judgeToggle) return;
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

function clearWinnerClasses() {
  els.judgeWinner.classList.remove("winner-cooperative", "winner-competitive", "winner-tie");
}

function setJudgePending(message) {
  els.scoreCoop.textContent = "C - | P - | U - | O -";
  els.scoreComp.textContent = "C - | P - | U - | O -";
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

function renderJudgeResult(judge, topic) {
  const coop = judge?.scores?.cooperative || {};
  const comp = judge?.scores?.competitive || {};
  const winner = ["cooperative", "competitive", "tie"].includes(judge?.winner) ? judge.winner : "tie";

  els.scoreCoop.textContent = scoreLine(coop);
  els.scoreComp.textContent = scoreLine(comp);
  clearWinnerClasses();
  els.judgeWinner.classList.add(`winner-${winner}`);
  els.judgeWinner.textContent = `Winner: ${winnerLabel(winner)}`;
  els.judgeRationale.textContent = String(judge?.rationale || "Score generated from conclusion quality.").trim();
  applyWinnerToTally(winner);
  addRoundHistory({
    topic,
    winner,
    scores: { cooperative: coop, competitive: comp },
    rationale: els.judgeRationale.textContent
  });
  setJudgePanelOpen(true);
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

async function runOneMode({ mode, topic, deadline, logEl, conclusionEl }) {
  const agentCards = AGENT_CARDS[mode];
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
}

function startCountdown(deadline) {
  if (countdownHandle) {
    clearInterval(countdownHandle);
  }

  const tick = () => {
    const remaining = deadline - Date.now();
    els.timer.textContent = formatMs(remaining);
    if (remaining <= 0) {
      clearInterval(countdownHandle);
      countdownHandle = null;
    }
  };

  tick();
  countdownHandle = setInterval(tick, 250);
}

async function startDiscussion() {
  const topic = els.topic.value.trim();
  if (!topic) {
    setStatus("Please enter a topic first.");
    return;
  }

  clearUI();
  els.startBtn.disabled = true;
  setStatus("Running both discussions...");

  const deadline = Date.now() + MAX_MS;
  startCountdown(deadline);

  try {
    await Promise.all([
      runOneMode({
        mode: "cooperative",
        topic,
        deadline,
        logEl: els.coopLog,
        conclusionEl: els.coopConclusion
      }),
      runOneMode({
        mode: "competitive",
        topic,
        deadline,
        logEl: els.compLog,
        conclusionEl: els.compConclusion
      })
    ]);

    const cooperativeConclusion = els.coopConclusion.textContent.trim();
    const competitiveConclusion = els.compConclusion.textContent.trim();

    if (hasUsableConclusion(cooperativeConclusion) && hasUsableConclusion(competitiveConclusion)) {
      setStatus("Scoring final conclusions...");
      try {
        const judge = await postJson("/api/judge", { topic, cooperativeConclusion, competitiveConclusion });
        renderJudgeResult(judge, topic);
        setStatus(`Done. ${winnerLabel(judge.winner)} won this round.`);
      } catch (err) {
        setJudgeError(`Scoring failed: ${err.message || "Unknown error"}`);
        setStatus("Done. Conclusions generated, but scoring failed.");
      }
    } else {
      setJudgeError("Scoring skipped because one of the conclusions was unavailable.");
      setStatus("Done. Conclusions generated (scoring skipped).");
    }
  } finally {
    els.startBtn.disabled = false;
    els.timer.textContent = "00:00";
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
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && isJudgePanelOpen) {
    setJudgePanelOpen(false);
  }
});
els.timer.textContent = formatMs(MAX_MS);
renderTally();
renderHistory();
setJudgePending("Scoring will appear after both final conclusions.");
setJudgePanelOpen(false);
