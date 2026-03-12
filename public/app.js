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
// Safety cap only; the 30-second deadline should usually end the round first.
const MAX_TURNS_PER_MODE = 24;
const SCORE_STORAGE_KEY = "coocom_round_score_tally_v1";
const SCORE_HISTORY_STORAGE_KEY = "coocom_round_score_history_v1";
const CSV_INPUT_STORAGE_KEY = "coocom_csv_input_v1";
const PROVIDER_SETTINGS_STORAGE_KEY = "coocom_provider_settings_v1";
const MAX_HISTORY_ITEMS = 60;
const DEFAULT_PROVIDER_MODELS = {
  openai: "gpt-5.2",
  gemini: "gemini-2.5-flash"
};
const DEFAULT_RUNTIME_SETTINGS = {
  cooperativeTemperature: 0.72,
  competitiveTemperature: 0.85,
  conclusionTemperature: 0.4,
  judgeTemperature: 0.2,
  separateJudgeModel: false,
  judgeGeminiThinking: false
};

const els = {
  topic: document.getElementById("topic"),
  startBtn: document.getElementById("startBtn"),
  stopBtn: document.getElementById("stopBtn"),
  timer: document.getElementById("timer"),
  status: document.getElementById("status"),
  settingsToggle: document.getElementById("settingsToggle"),
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
  settingsPanel: document.getElementById("settingsPanel"),
  settingsBackdrop: document.getElementById("settingsBackdrop"),
  openaiKeyInput: document.getElementById("openaiKeyInput"),
  geminiKeyInput: document.getElementById("geminiKeyInput"),
  chatProviderSelect: document.getElementById("chatProviderSelect"),
  chatModelSelect: document.getElementById("chatModelSelect"),
  chatModelLoadBtn: document.getElementById("chatModelLoadBtn"),
  coopTempInput: document.getElementById("coopTempInput"),
  compTempInput: document.getElementById("compTempInput"),
  conclusionTempInput: document.getElementById("conclusionTempInput"),
  separateJudgeToggle: document.getElementById("separateJudgeToggle"),
  judgeConfigGroup: document.getElementById("judgeConfigGroup"),
  judgeModeHint: document.getElementById("judgeModeHint"),
  judgeProviderSelect: document.getElementById("judgeProviderSelect"),
  judgeModelSelect: document.getElementById("judgeModelSelect"),
  judgeModelLoadBtn: document.getElementById("judgeModelLoadBtn"),
  judgeTempInput: document.getElementById("judgeTempInput"),
  judgeGeminiThinkingToggle: document.getElementById("judgeGeminiThinkingToggle"),
  judgeThinkingRow: document.getElementById("judgeThinkingRow"),
  settingsHint: document.getElementById("settingsHint"),
  settingsSaveBtn: document.getElementById("settingsSaveBtn"),
  settingsCloseBtn: document.getElementById("settingsCloseBtn"),
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
let isSettingsPanelOpen = false;
let isDiscussionRunning = false;
let stopRequested = false;
let providerSettings = loadProviderSettings();
const activeRequestControllers = new Set();
const providerModelCatalog = {
  openai: [],
  gemini: []
};
const modelLoadState = {
  chat: false,
  judge: false
};

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

function defaultModelForProvider(provider) {
  return provider === "gemini" ? DEFAULT_PROVIDER_MODELS.gemini : DEFAULT_PROVIDER_MODELS.openai;
}

function sanitizeModelValue(value, provider = "openai") {
  let model = String(value || "").trim();
  if (!model) return defaultModelForProvider(provider);
  if (provider === "gemini") {
    model = model.replace(/^models\//i, "");
  }
  return model;
}

function sanitizeTemperatureValue(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const bounded = Math.max(0, Math.min(2, n));
  return Math.round(bounded * 100) / 100;
}

function effectiveJudgeProvider(settings = providerSettings) {
  return settings?.judge?.separate ? sanitizeProvider(settings?.judge?.provider) : sanitizeProvider(settings?.chat?.provider);
}

function effectiveJudgeModel(settings = providerSettings) {
  const provider = effectiveJudgeProvider(settings);
  const sourceModel = settings?.judge?.separate ? settings?.judge?.model : settings?.chat?.model;
  return sanitizeModelValue(sourceModel, provider);
}

async function postJson(url, body, options = {}) {
  const activeProvider = sanitizeProvider(options?.provider ?? providerSettings?.chat?.provider);
  const activeKey = sanitizeKeyValue(options?.apiKey ?? providerSettings?.keys?.[activeProvider]);
  const activeModel = sanitizeModelValue(options?.model ?? providerSettings?.chat?.model, activeProvider);
  const controller = new AbortController();
  activeRequestControllers.add(controller);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        ...body,
        provider: activeProvider,
        apiKey: activeKey,
        model: activeModel,
        enableThinking: options?.enableThinking ?? body?.enableThinking ?? false
      })
    });

    const rawText = await resp.text();
    const contentType = String(resp.headers.get("content-type") || "").toLowerCase();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      const snippet = rawText.trim().replace(/\s+/g, " ").slice(0, 140) || "Non-JSON response body";
      throw new Error(`${resp.status} ${resp.statusText || "Request failed"}: ${snippet}`);
    }
    if (!resp.ok) {
      throw new Error(data.error || "Request failed");
    }
    if (!contentType.includes("application/json")) {
      throw new Error(`Expected JSON response but received ${contentType || "unknown content type"}`);
    }
    return data;
  } finally {
    activeRequestControllers.delete(controller);
  }
}

function isAbortError(err) {
  return err?.name === "AbortError";
}

function abortActiveRequests() {
  activeRequestControllers.forEach(controller => controller.abort());
  activeRequestControllers.clear();
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

function freshProviderSettings() {
  return {
    keys: {
      openai: "",
      gemini: ""
    },
    chat: {
      provider: "openai",
      model: DEFAULT_PROVIDER_MODELS.openai,
      cooperativeTemperature: DEFAULT_RUNTIME_SETTINGS.cooperativeTemperature,
      competitiveTemperature: DEFAULT_RUNTIME_SETTINGS.competitiveTemperature,
      conclusionTemperature: DEFAULT_RUNTIME_SETTINGS.conclusionTemperature
    },
    judge: {
      separate: DEFAULT_RUNTIME_SETTINGS.separateJudgeModel,
      provider: "openai",
      model: DEFAULT_PROVIDER_MODELS.openai,
      temperature: DEFAULT_RUNTIME_SETTINGS.judgeTemperature,
      geminiThinking: DEFAULT_RUNTIME_SETTINGS.judgeGeminiThinking
    }
  };
}

function sanitizeProvider(value) {
  return value === "gemini" ? "gemini" : "openai";
}

function sanitizeKeyValue(value) {
  return String(value || "").trim();
}

function normalizeModelOption(option, provider) {
  const id = sanitizeModelValue(option?.id ?? option, provider);
  const label = String(option?.label || id).trim() || id;
  return { id, label };
}

function dedupeModelOptions(options = [], provider = "openai") {
  const seen = new Set();
  return options
    .map(option => normalizeModelOption(option, provider))
    .filter(option => {
      if (!option.id || seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    })
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }));
}

function loadProviderSettings() {
  try {
    const raw = localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);
    if (!raw) return freshProviderSettings();
    const parsed = JSON.parse(raw);
    const next = freshProviderSettings();
    next.keys.openai = sanitizeKeyValue(parsed?.keys?.openai);
    next.keys.gemini = sanitizeKeyValue(parsed?.keys?.gemini);

    // Backward compatibility with the older single-provider settings shape.
    const legacyProvider = sanitizeProvider(parsed?.provider);
    next.chat.provider = sanitizeProvider(parsed?.chat?.provider ?? legacyProvider);
    next.chat.model = sanitizeModelValue(
      parsed?.chat?.model ?? parsed?.models?.[next.chat.provider] ?? parsed?.models?.openai,
      next.chat.provider
    );
    next.chat.cooperativeTemperature = sanitizeTemperatureValue(
      parsed?.chat?.cooperativeTemperature,
      DEFAULT_RUNTIME_SETTINGS.cooperativeTemperature
    );
    next.chat.competitiveTemperature = sanitizeTemperatureValue(
      parsed?.chat?.competitiveTemperature,
      DEFAULT_RUNTIME_SETTINGS.competitiveTemperature
    );
    next.chat.conclusionTemperature = sanitizeTemperatureValue(
      parsed?.chat?.conclusionTemperature,
      DEFAULT_RUNTIME_SETTINGS.conclusionTemperature
    );

    next.judge.separate = Boolean(parsed?.judge?.separate);
    next.judge.provider = sanitizeProvider(parsed?.judge?.provider ?? next.chat.provider);
    next.judge.model = sanitizeModelValue(
      parsed?.judge?.model ?? parsed?.models?.[next.judge.provider] ?? next.chat.model,
      next.judge.provider
    );
    next.judge.temperature = sanitizeTemperatureValue(
      parsed?.judge?.temperature,
      DEFAULT_RUNTIME_SETTINGS.judgeTemperature
    );
    next.judge.geminiThinking = Boolean(parsed?.judge?.geminiThinking);
    return next;
  } catch {
    return freshProviderSettings();
  }
}

function saveProviderSettings() {
  try {
    localStorage.setItem(PROVIDER_SETTINGS_STORAGE_KEY, JSON.stringify(providerSettings));
  } catch {
    // Ignore localStorage write failures and keep in-memory settings.
  }
}

function providerLabel(provider) {
  return provider === "gemini" ? "Gemini" : "OpenAI";
}

function setSettingsHint(text, isError = false) {
  if (!els.settingsHint) return;
  els.settingsHint.textContent = text;
  els.settingsHint.classList.toggle("is-error", Boolean(isError));
}

function renderModelOptions(selectEl, provider = "openai", selectedModel) {
  if (!selectEl) return;
  const normalizedProvider = sanitizeProvider(provider);
  const currentModel = sanitizeModelValue(
    selectedModel ?? defaultModelForProvider(normalizedProvider),
    normalizedProvider
  );
  const catalog = Array.isArray(providerModelCatalog[normalizedProvider]) ? providerModelCatalog[normalizedProvider] : [];
  const options = dedupeModelOptions(
    [
      { id: currentModel, label: currentModel },
      { id: defaultModelForProvider(normalizedProvider), label: defaultModelForProvider(normalizedProvider) },
      ...catalog
    ],
    normalizedProvider
  );

  selectEl.innerHTML = "";
  options.forEach(option => {
    const node = document.createElement("option");
    node.value = option.id;
    node.textContent = option.label;
    selectEl.appendChild(node);
  });
  selectEl.value = currentModel;
}

function setModelLoaderBusy(target, busy) {
  modelLoadState[target] = Boolean(busy);
  const loadBtn = target === "judge" ? els.judgeModelLoadBtn : els.chatModelLoadBtn;
  if (loadBtn) {
    loadBtn.disabled = isDiscussionRunning || modelLoadState[target];
    loadBtn.textContent = modelLoadState[target] ? "Loading..." : "Load Models";
  }
  setControlsBusy(isDiscussionRunning);
}

async function loadModelsForProvider(target = "chat", provider = providerSettings.chat.provider) {
  const normalizedProvider = sanitizeProvider(provider);
  const selectEl = target === "judge" ? els.judgeModelSelect : els.chatModelSelect;
  const requestedModel = sanitizeModelValue(selectEl?.value, normalizedProvider);
  const apiKey =
    normalizedProvider === "gemini"
      ? sanitizeKeyValue(els.geminiKeyInput?.value || providerSettings?.keys?.gemini)
      : sanitizeKeyValue(els.openaiKeyInput?.value || providerSettings?.keys?.openai);

  setModelLoaderBusy(target, true);
  setSettingsHint(`Loading ${providerLabel(normalizedProvider)} models for the ${target} role...`);
  try {
    const data = await postJson(
      "/api/models",
      {},
      {
        provider: normalizedProvider,
        apiKey,
        model: requestedModel
      }
    );
    const models = Array.isArray(data?.models) ? data.models : [];
    providerModelCatalog[normalizedProvider] = dedupeModelOptions(models, normalizedProvider);
    const nextModel = sanitizeModelValue(
      data?.selectedModel ?? requestedModel ?? data?.defaultModel,
      normalizedProvider
    );
    const currentProvider =
      target === "judge"
        ? sanitizeProvider(els.judgeProviderSelect?.value)
        : sanitizeProvider(els.chatProviderSelect?.value);
    if (currentProvider === normalizedProvider) {
      renderModelOptions(selectEl, normalizedProvider, nextModel);
      setSettingsHint(
        `Loaded ${providerModelCatalog[normalizedProvider].length} ${providerLabel(normalizedProvider)} models for the ${target} role. Current model: ${nextModel}.`
      );
    }
  } catch (err) {
    providerModelCatalog[normalizedProvider] = [];
    const currentProvider =
      target === "judge"
        ? sanitizeProvider(els.judgeProviderSelect?.value)
        : sanitizeProvider(els.chatProviderSelect?.value);
    if (currentProvider === normalizedProvider) {
      renderModelOptions(selectEl, normalizedProvider, requestedModel);
      setSettingsHint(
        `Could not load ${providerLabel(normalizedProvider)} models for the ${target} role. Using ${requestedModel}. ${err.message || ""}`.trim(),
        true
      );
    }
  } finally {
    setModelLoaderBusy(target, false);
  }
}

function syncJudgeSettingsVisibility() {
  if (!els.judgeConfigGroup || !els.judgeThinkingRow || !els.judgeModeHint) return;
  const separate = Boolean(els.separateJudgeToggle?.checked);
  els.judgeConfigGroup.classList.toggle("is-hidden", !separate);
  els.judgeConfigGroup.setAttribute("aria-hidden", separate ? "false" : "true");

  const judgeProvider = separate
    ? sanitizeProvider(els.judgeProviderSelect?.value)
    : sanitizeProvider(els.chatProviderSelect?.value);
  const judgeModel = separate
    ? sanitizeModelValue(els.judgeModelSelect?.value, judgeProvider)
    : sanitizeModelValue(els.chatModelSelect?.value, judgeProvider);

  if (separate) {
    els.judgeModeHint.textContent = `Judge uses ${providerLabel(judgeProvider)} on ${judgeModel}.`;
  } else {
    els.judgeModeHint.textContent = `Judge inherits ${providerLabel(judgeProvider)} on ${judgeModel} from the discussion.`;
  }

  const showThinkingToggle = judgeProvider === "gemini";
  els.judgeThinkingRow.classList.toggle("is-hidden", !showThinkingToggle);
  els.judgeThinkingRow.setAttribute("aria-hidden", showThinkingToggle ? "false" : "true");
}

function syncSettingsForm() {
  if (!els.chatProviderSelect || !els.chatModelSelect || !els.judgeProviderSelect || !els.judgeModelSelect) return;

  els.openaiKeyInput.value = sanitizeKeyValue(providerSettings?.keys?.openai);
  els.geminiKeyInput.value = sanitizeKeyValue(providerSettings?.keys?.gemini);

  els.chatProviderSelect.value = sanitizeProvider(providerSettings?.chat?.provider);
  renderModelOptions(
    els.chatModelSelect,
    providerSettings.chat.provider,
    sanitizeModelValue(providerSettings.chat.model, providerSettings.chat.provider)
  );

  els.coopTempInput.value = String(
    sanitizeTemperatureValue(providerSettings?.chat?.cooperativeTemperature, DEFAULT_RUNTIME_SETTINGS.cooperativeTemperature)
  );
  els.compTempInput.value = String(
    sanitizeTemperatureValue(providerSettings?.chat?.competitiveTemperature, DEFAULT_RUNTIME_SETTINGS.competitiveTemperature)
  );
  els.conclusionTempInput.value = String(
    sanitizeTemperatureValue(providerSettings?.chat?.conclusionTemperature, DEFAULT_RUNTIME_SETTINGS.conclusionTemperature)
  );

  els.separateJudgeToggle.checked = Boolean(providerSettings?.judge?.separate);
  els.judgeProviderSelect.value = sanitizeProvider(providerSettings?.judge?.provider);
  renderModelOptions(
    els.judgeModelSelect,
    providerSettings.judge.provider,
    sanitizeModelValue(providerSettings.judge.model, providerSettings.judge.provider)
  );
  els.judgeTempInput.value = String(
    sanitizeTemperatureValue(providerSettings?.judge?.temperature, DEFAULT_RUNTIME_SETTINGS.judgeTemperature)
  );
  els.judgeGeminiThinkingToggle.checked = Boolean(providerSettings?.judge?.geminiThinking);

  syncJudgeSettingsVisibility();

  const judgeProvider = effectiveJudgeProvider(providerSettings);
  const judgeModel = effectiveJudgeModel(providerSettings);
  setSettingsHint(
    `Discussion: ${providerLabel(providerSettings.chat.provider)} on ${providerSettings.chat.model}. Judge: ${providerLabel(judgeProvider)} on ${judgeModel}.`
  );
}

function readSettingsFromForm() {
  const chatProvider = sanitizeProvider(els.chatProviderSelect?.value);
  const judgeProvider = sanitizeProvider(els.judgeProviderSelect?.value);
  return {
    keys: {
      openai: sanitizeKeyValue(els.openaiKeyInput?.value),
      gemini: sanitizeKeyValue(els.geminiKeyInput?.value)
    },
    chat: {
      provider: chatProvider,
      model: sanitizeModelValue(els.chatModelSelect?.value, chatProvider),
      cooperativeTemperature: sanitizeTemperatureValue(
        els.coopTempInput?.value,
        DEFAULT_RUNTIME_SETTINGS.cooperativeTemperature
      ),
      competitiveTemperature: sanitizeTemperatureValue(
        els.compTempInput?.value,
        DEFAULT_RUNTIME_SETTINGS.competitiveTemperature
      ),
      conclusionTemperature: sanitizeTemperatureValue(
        els.conclusionTempInput?.value,
        DEFAULT_RUNTIME_SETTINGS.conclusionTemperature
      )
    },
    judge: {
      separate: Boolean(els.separateJudgeToggle?.checked),
      provider: judgeProvider,
      model: sanitizeModelValue(els.judgeModelSelect?.value, judgeProvider),
      temperature: sanitizeTemperatureValue(
        els.judgeTempInput?.value,
        DEFAULT_RUNTIME_SETTINGS.judgeTemperature
      ),
      geminiThinking: Boolean(els.judgeGeminiThinkingToggle?.checked)
    }
  };
}

function getDiscussionRequestOptions() {
  return {
    provider: sanitizeProvider(providerSettings?.chat?.provider),
    apiKey: sanitizeKeyValue(providerSettings?.keys?.[sanitizeProvider(providerSettings?.chat?.provider)]),
    model: sanitizeModelValue(providerSettings?.chat?.model, providerSettings?.chat?.provider)
  };
}

function getJudgeRequestOptions() {
  const provider = effectiveJudgeProvider(providerSettings);
  return {
    provider,
    apiKey: sanitizeKeyValue(providerSettings?.keys?.[provider]),
    model: effectiveJudgeModel(providerSettings),
    enableThinking: provider === "gemini" && Boolean(providerSettings?.judge?.geminiThinking)
  };
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
  if (els.stopBtn) {
    els.stopBtn.disabled = !isDiscussionRunning;
  }
  els.topic.disabled = isDiscussionRunning;
  if (els.settingsToggle) {
    els.settingsToggle.disabled = isDiscussionRunning;
  }
  if (els.settingsSaveBtn) {
    els.settingsSaveBtn.disabled = isDiscussionRunning;
  }
  if (els.openaiKeyInput) {
    els.openaiKeyInput.disabled = isDiscussionRunning;
  }
  if (els.geminiKeyInput) {
    els.geminiKeyInput.disabled = isDiscussionRunning;
  }
  if (els.chatProviderSelect) {
    els.chatProviderSelect.disabled = isDiscussionRunning;
  }
  if (els.chatModelSelect) {
    els.chatModelSelect.disabled = isDiscussionRunning || modelLoadState.chat;
  }
  if (els.chatModelLoadBtn) {
    els.chatModelLoadBtn.disabled = isDiscussionRunning || modelLoadState.chat;
  }
  if (els.coopTempInput) {
    els.coopTempInput.disabled = isDiscussionRunning;
  }
  if (els.compTempInput) {
    els.compTempInput.disabled = isDiscussionRunning;
  }
  if (els.conclusionTempInput) {
    els.conclusionTempInput.disabled = isDiscussionRunning;
  }
  if (els.separateJudgeToggle) {
    els.separateJudgeToggle.disabled = isDiscussionRunning;
  }
  if (els.judgeProviderSelect) {
    els.judgeProviderSelect.disabled = isDiscussionRunning || !els.separateJudgeToggle?.checked;
  }
  if (els.judgeModelSelect) {
    els.judgeModelSelect.disabled =
      isDiscussionRunning || modelLoadState.judge || !els.separateJudgeToggle?.checked;
  }
  if (els.judgeModelLoadBtn) {
    els.judgeModelLoadBtn.disabled =
      isDiscussionRunning || modelLoadState.judge || !els.separateJudgeToggle?.checked;
  }
  if (els.judgeTempInput) {
    els.judgeTempInput.disabled = isDiscussionRunning;
  }
  if (els.judgeGeminiThinkingToggle) {
    const judgeProvider = els.separateJudgeToggle?.checked
      ? sanitizeProvider(els.judgeProviderSelect?.value)
      : sanitizeProvider(els.chatProviderSelect?.value);
    els.judgeGeminiThinkingToggle.disabled = isDiscussionRunning || judgeProvider !== "gemini";
  }
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
  if (isJudgePanelOpen && isSettingsPanelOpen) {
    setSettingsPanelOpen(false);
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

function setSettingsPanelOpen(open) {
  isSettingsPanelOpen = Boolean(open);
  if (!els.settingsPanel || !els.settingsToggle) return;
  if (isSettingsPanelOpen && isJudgePanelOpen) {
    setJudgePanelOpen(false);
  }
  if (isSettingsPanelOpen && isCsvPanelOpen) {
    setCsvPanelOpen(false);
  }
  if (isSettingsPanelOpen) {
    syncSettingsForm();
    void Promise.all([
      loadModelsForProvider("chat", providerSettings.chat.provider),
      providerSettings.judge.separate
        ? loadModelsForProvider("judge", providerSettings.judge.provider)
        : Promise.resolve()
    ]);
  }
  els.settingsPanel.classList.toggle("is-collapsed", !isSettingsPanelOpen);
  els.settingsPanel.setAttribute("aria-hidden", isSettingsPanelOpen ? "false" : "true");
  if (els.settingsBackdrop) {
    els.settingsBackdrop.classList.toggle("is-hidden", !isSettingsPanelOpen);
    els.settingsBackdrop.setAttribute("aria-hidden", isSettingsPanelOpen ? "false" : "true");
  }
  els.settingsToggle.setAttribute("aria-expanded", isSettingsPanelOpen ? "true" : "false");
  const label = isSettingsPanelOpen ? "Close provider settings" : "Open provider settings";
  els.settingsToggle.setAttribute("aria-label", label);
  els.settingsToggle.setAttribute("title", label);
  els.settingsToggle.classList.toggle("is-active", isSettingsPanelOpen);
  if (isSettingsPanelOpen && els.chatProviderSelect) {
    requestAnimationFrame(() => els.chatProviderSelect.focus());
  }
}

function toggleSettingsPanel() {
  setSettingsPanelOpen(!isSettingsPanelOpen);
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
  if (isCsvPanelOpen && isSettingsPanelOpen) {
    setSettingsPanelOpen(false);
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

function stopDiscussion() {
  if (!isDiscussionRunning) return;
  stopRequested = true;
  stopCountdown();
  els.timer.textContent = "00:00";
  setStatus("Stopping discussion...");
  abortActiveRequests();
}

function saveSettingsFromPanel() {
  providerSettings = readSettingsFromForm();
  saveProviderSettings();
  syncSettingsForm();
  setSettingsPanelOpen(false);
  const judgeProvider = effectiveJudgeProvider(providerSettings);
  const judgeModel = effectiveJudgeModel(providerSettings);
  setStatus(
    `Discussion set to ${providerLabel(providerSettings.chat.provider)} on ${providerSettings.chat.model}. Judge set to ${providerLabel(judgeProvider)} on ${judgeModel}.`
  );
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
  let lastSpeakerId = null;
  let turn = 0;

  while (!stopRequested && Date.now() < deadline && turn < MAX_TURNS_PER_MODE) {
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
      const discussionOptions = getDiscussionRequestOptions();
      const data = await postJson(
        "/api/agent-turn",
        {
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
          turnIndex: turn,
          temperature:
            mode === "competitive"
              ? providerSettings.chat.competitiveTemperature
              : providerSettings.chat.cooperativeTemperature
        },
        discussionOptions
      );
      if (stopRequested) {
        typingNode.remove();
        break;
      }
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
      if (stopRequested || isAbortError(err)) {
        break;
      }
      appendMessage(logEl, "Error", err.message || "Failed to fetch agent response.");
      break;
    }

    turn += 1;
  }

  if (stopRequested) {
    conclusionEl.textContent = "Discussion stopped before final conclusion.";
    return { transcript, conclusion: conclusionEl.textContent, stopped: true };
  }

  try {
    const out = await postJson(
      "/api/conclusion",
      {
        topic,
        mode,
        transcript,
        temperature: providerSettings.chat.conclusionTemperature
      },
      getDiscussionRequestOptions()
    );
    if (stopRequested) {
      conclusionEl.textContent = "Discussion stopped before final conclusion.";
      return { transcript, conclusion: conclusionEl.textContent, stopped: true };
    }
    conclusionEl.textContent = out.text;
  } catch (err) {
    if (stopRequested || isAbortError(err)) {
      conclusionEl.textContent = "Discussion stopped before final conclusion.";
      return { transcript, conclusion: conclusionEl.textContent, stopped: true };
    }
    conclusionEl.textContent = `Failed to generate conclusion: ${err.message || "Unknown error"}`;
  }

  return { transcript, conclusion: String(conclusionEl.textContent || "").trim(), stopped: false };
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

    if (stopRequested || coopResult?.stopped || compResult?.stopped) {
      setJudgePending("Scoring skipped because the discussion was stopped.");
      setStatus(`${prefix}Stopped. Discussion ended before scoring.`);
      return { winner: null, scored: false, stopped: true };
    }

    if (hasUsableConclusion(cooperativeConclusion) && hasUsableConclusion(competitiveConclusion)) {
      setStatus(`${prefix}Scoring final conclusions...`);
      try {
        const judge = await postJson(
          "/api/judge",
          {
            topic,
            cooperativeConclusion,
            competitiveConclusion,
            cooperativeTranscript,
            competitiveTranscript,
            temperature: providerSettings.judge.temperature
          },
          getJudgeRequestOptions()
        );
        if (stopRequested) {
          setJudgePending("Scoring skipped because the discussion was stopped.");
          setStatus(`${prefix}Stopped. Discussion ended before scoring.`);
          return { winner: null, scored: false, stopped: true };
        }
        const winner = renderJudgeResult(judge, historyTopic, { openPanel: openJudgePanel });
        setStatus(`${prefix}Done. ${winnerLabel(winner)} won this round.`);
        return { winner, scored: true, stopped: false };
      } catch (err) {
        if (stopRequested || isAbortError(err)) {
          setJudgePending("Scoring skipped because the discussion was stopped.");
          setStatus(`${prefix}Stopped. Discussion ended before scoring.`);
          return { winner: null, scored: false, stopped: true };
        }
        setJudgeError(`Scoring failed: ${err.message || "Unknown error"}`);
        setStatus(`${prefix}Done. Conclusions generated, but scoring failed.`);
        return { winner: null, scored: false, stopped: false };
      }
    } else {
      setJudgeError("Scoring skipped because one of the conclusions was unavailable.");
      setStatus(`${prefix}Done. Conclusions generated (scoring skipped).`);
      return { winner: null, scored: false, stopped: false };
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

  stopRequested = false;
  setControlsBusy(true);
  try {
    await runRound({ topic, openJudgePanel: true });
  } finally {
    abortActiveRequests();
    stopRequested = false;
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
  stopRequested = false;
  setControlsBusy(true);

  const totals = { cooperative: 0, competitive: 0, tie: 0, failed: 0 };
  let completed = 0;
  try {
    for (let i = 0; i < rows.length; i += 1) {
      if (stopRequested) break;
      const row = rows[i];
      els.topic.value = row.question;
      const prefix = `Batch ${i + 1}/${rows.length} [ID ${row.id}]`;
      const result = await runRound({
        topic: row.question,
        historyTopic: `[${row.id}] ${row.question}`,
        statusPrefix: prefix,
        openJudgePanel: false
      });
      if (result?.stopped || stopRequested) {
        break;
      }
      completed += 1;
      if (result.winner && Object.prototype.hasOwnProperty.call(totals, result.winner)) {
        totals[result.winner] += 1;
      } else {
        totals.failed += 1;
      }
    }
    if (stopRequested) {
      setJudgePanelOpen(true);
      setStatus(
        `Batch stopped after ${completed}/${rows.length} completed round(s). Cooperative ${totals.cooperative} | Competitive ${totals.competitive} | Ties ${totals.tie}.`
      );
      setCsvHint(`Stopped after ${completed} completed round(s).`);
      return;
    }
    setJudgePanelOpen(true);
    const failedPart = totals.failed > 0 ? ` | Failed ${totals.failed}` : "";
    setStatus(
      `Batch complete (${rows.length}): Cooperative ${totals.cooperative} | Competitive ${totals.competitive} | Ties ${totals.tie}${failedPart}.`
    );
    setCsvHint(`Completed ${rows.length} test round(s).`);
  } finally {
    abortActiveRequests();
    stopRequested = false;
    setControlsBusy(false);
  }
}

els.startBtn.addEventListener("click", startDiscussion);
if (els.stopBtn) {
  els.stopBtn.addEventListener("click", stopDiscussion);
}
if (els.settingsToggle) {
  els.settingsToggle.addEventListener("click", toggleSettingsPanel);
}
if (els.settingsBackdrop) {
  els.settingsBackdrop.addEventListener("click", () => setSettingsPanelOpen(false));
}
if (els.settingsCloseBtn) {
  els.settingsCloseBtn.addEventListener("click", () => setSettingsPanelOpen(false));
}
if (els.settingsSaveBtn) {
  els.settingsSaveBtn.addEventListener("click", saveSettingsFromPanel);
}
if (els.chatProviderSelect) {
  els.chatProviderSelect.addEventListener("change", event => {
    const provider = sanitizeProvider(event.target.value);
    renderModelOptions(els.chatModelSelect, provider, defaultModelForProvider(provider));
    syncJudgeSettingsVisibility();
    void loadModelsForProvider("chat", provider);
  });
}
if (els.judgeProviderSelect) {
  els.judgeProviderSelect.addEventListener("change", event => {
    const provider = sanitizeProvider(event.target.value);
    renderModelOptions(els.judgeModelSelect, provider, defaultModelForProvider(provider));
    syncJudgeSettingsVisibility();
    void loadModelsForProvider("judge", provider);
  });
}
if (els.chatModelSelect) {
  els.chatModelSelect.addEventListener("change", syncJudgeSettingsVisibility);
}
if (els.judgeModelSelect) {
  els.judgeModelSelect.addEventListener("change", syncJudgeSettingsVisibility);
}
if (els.separateJudgeToggle) {
  els.separateJudgeToggle.addEventListener("change", () => {
    syncJudgeSettingsVisibility();
    setControlsBusy(isDiscussionRunning);
    if (els.separateJudgeToggle.checked) {
      void loadModelsForProvider("judge", sanitizeProvider(els.judgeProviderSelect?.value));
    }
  });
}
if (els.chatModelLoadBtn) {
  els.chatModelLoadBtn.addEventListener("click", () => {
    void loadModelsForProvider("chat", sanitizeProvider(els.chatProviderSelect?.value));
  });
}
if (els.judgeModelLoadBtn) {
  els.judgeModelLoadBtn.addEventListener("click", () => {
    void loadModelsForProvider("judge", sanitizeProvider(els.judgeProviderSelect?.value));
  });
}
if (els.openaiKeyInput) {
  els.openaiKeyInput.addEventListener("input", () => {
    setSettingsHint("OpenAI key edited. Click Load Models to refresh any OpenAI model selectors.");
  });
}
if (els.geminiKeyInput) {
  els.geminiKeyInput.addEventListener("input", () => {
    setSettingsHint("Gemini key edited. Click Load Models to refresh any Gemini model selectors.");
  });
}
if (els.judgeGeminiThinkingToggle) {
  els.judgeGeminiThinkingToggle.addEventListener("change", syncJudgeSettingsVisibility);
}
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
  if (isSettingsPanelOpen) {
    setSettingsPanelOpen(false);
    return;
  }
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
syncSettingsForm();
setModelLoaderBusy("chat", false);
setModelLoaderBusy("judge", false);
setControlsBusy(false);
setSettingsPanelOpen(false);
setJudgePanelOpen(false);
setCsvPanelOpen(false);
