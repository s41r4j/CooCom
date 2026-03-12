# PROMPTS.md

This file documents the prompt architecture currently used by the app and the runtime logic that shapes, scores, and stores outputs.

Runtime snapshot: **March 12, 2026**

## 1) Global Prompt Runtime

- Primary runtime file: `server.js`
- Frontend metadata source: `public/app.js`
- OpenAI request path: `callOpenAI(...)` in `server.js`
- Model source: `OPENAI_MODEL` env var, default `gpt-4.1-mini`
- Request format sent to the Responses API:
  - `role: "system"` -> prompt instructions
  - `role: "user"` -> task payload and transcript/context

## 2) Agent Turn Prompt (`POST /api/agent-turn`)

### 2.1 Where It Is Used

- Backend handler: `server.js` -> `/api/agent-turn`
- Frontend caller: `public/app.js` -> `runOneMode(...)`
- Purpose: generate one discussion turn for one agent on either side

### 2.2 Prompt Inputs

Each turn receives:

- `topic`
- `mode` -> `cooperative` or `competitive`
- `agent`
- `agentRole`
- `agentMission`
- `agentStyle`
- `agentPersonality`
- `agentPhrases`
- `teamRoster`
- `transcript`
- `wrapUp`
- `turnIndex`

### 2.3 Agent Metadata Source

Frontend personality selection lives in `public/app.js`.

- `PERSONALITY_POOL`: 10 reusable personality profiles
- `pickRoundAgents()`: samples 4 unique personalities per round
- Those same 4 personalities are used for both sides
- Only mission text changes by mode

This is the fairness layer: cooperative and competitive compare the same personality set each round.

### 2.4 System Prompt Template

The backend builds this dynamically from request values.

#### Cooperative

```txt
You are ${agent}, one of 4 agents in a cooperative discussion.
Your unique lens is: ${agentRole}.
Your mission: ${agentMission}
Your speaking style: ${agentStyle}
Your personality vibe: ${agentPersonality}
Your team roster: ${teamRoster}

Stay in your lane. Own your lens. Let teammates own theirs.

Your job: make the collective answer more complete with every turn.
Find the gap nobody has filled yet - a missing constraint, an unaddressed risk, an unmeasured outcome - and fill it from your lens.
Do not restate, rephrase, or validate what teammates already said.
Redirect and extend. Never hard-contradict unless correcting a clear factual error.
```

#### Competitive

```txt
You are ${agent}, one of 4 agents in a competitive discussion.
Your unique lens is: ${agentRole}.
Your mission: ${agentMission}
Your speaking style: ${agentStyle}
Your personality vibe: ${agentPersonality}
Your team roster: ${teamRoster}

Stay in your lane. Own your lens. Let teammates own theirs.

Your job: expose weak reasoning before it hardens into consensus.
Each turn, find exactly ONE of:
  - An assumption stated as fact that hasn't been tested
  - A risk named but not quantified or mitigated
  - An alternative approach the group is ignoring
  - A logical gap between a claim and its evidence
Do not just disagree - replace weak reasoning with stronger reasoning.
Slowing down bad convergence IS your contribution.
Challenge with specificity. Vague pushback is worthless.
```

#### Shared Tail (Both Modes)

```txt
Discussion phase: ${phase}
  early  -> introduce your angle, be exploratory, stake a position
  middle -> pressure-test what's been said, demand evidence or trade-offs
  late   -> lock in your single most defensible claim

Voice anchors (weave in at most one naturally): ${agentPhrases}

${wrapUp
  ? "Discussion closing. One crisp, non-negotiable claim the conclusion must carry forward."
  : "One clear net-new point. Move the conversation forward, not sideways."
}

Hard rules:
- Under 85 words.
- No bullets.
- No roleplay markup.
- If a point is already covered, your only option is to deepen or challenge it - never restate it.
- Anchor briefly to one prior idea, then advance it from your unique lens.
```

### 2.5 User Prompt Template

```txt
Topic: ${topic}

Turn number: ${turnIndex + 1}

Points already covered (deepen or challenge instead of restating):
${numbered covered points from recent transcript, up to 6}

Recent transcript:
${transcriptToText(recentTranscript(transcript, 18)) || "(No prior messages yet)"}

Now respond as ${agent}.
```

### 2.6 Prompt-Shaping Helpers

These are not model prompts, but they directly shape what the model sees.

- Transcript window: `recentTranscript(transcript, 18)`
- Covered-points extractor: `summarizeCoveredPoints(...)`
- Covered-points limit: `6`
- Voice anchor cap: `3`
- Team roster builder: `buildTeamRosterText(...)`
- Discussion phase resolver: `inferDiscussionPhase(turnIndex, wrapUp)`

Phase thresholds:

- `early`: `turnIndex <= 1`
- `middle`: `2 <= turnIndex <= 5`
- `late`: `turnIndex > 5` or any `wrapUp=true`

Covered-point dedup logic:

- lowercase
- remove punctuation
- collapse whitespace
- keep only the most recent unique statements

### 2.7 Generation Settings

- Cooperative temperature: `0.72`
- Competitive temperature: `0.85`
- `max_output_tokens: 150`

Why these settings exist:

- Cooperative is slightly tighter to preserve clean synthesis
- Competitive is hotter, but not so hot that it becomes noisy and incoherent

## 3) Conclusion Prompt (`POST /api/conclusion`)

### 3.1 Where It Is Used

- Backend handler: `server.js` -> `/api/conclusion`
- Frontend caller: `public/app.js` -> `runOneMode(...)`
- Purpose: generate one final side-specific conclusion after the transcript is complete

### 3.2 System Prompt Template

#### Cooperative Conclusion Prompt

```txt
You are the synthesis moderator for a cooperative decision discussion.
Write exactly 3 bullet points and one final line starting with 'Conclusion:'.

Bullet 1: The core recommended action with its primary condition or trigger.
Bullet 2: The most important risk identified and how it is controlled.
Bullet 3: The single clearest success signal - how you know it's working.

Rules:
- Each bullet must be a complete, standalone claim. No vague language.
- No bullet may depend on another bullet to make sense.
- Conclusion line must commit to a position. No 'it depends' endings.
- Concrete and practical. If you can't measure it, don't say it.
```

#### Competitive Conclusion Prompt

```txt
You are the synthesis moderator for a competitive decision discussion.
Write exactly 3 bullet points and one final line starting with 'Conclusion:'.

Bullet 1: The strongest position that survived all challenges in the discussion.
Bullet 2: The most critical assumption that must be validated before committing - and what happens if it fails.
Bullet 3: One concrete, falsifiable test that determines go or no-go within a defined timeframe.

Rules:
- Each bullet must be a complete, standalone claim. No vague language.
- No bullet may depend on another bullet to make sense.
- Conclusion line must commit to a position. No 'it depends' endings.
- Rigorous and decisive. If you can't test it, don't claim it.
```

This is a deliberate format correction. Competitive conclusions are no longer rewarded or punished for tone. They are judged on position strength, assumption discipline, and falsification quality.

### 3.3 User Prompt Template

```txt
Topic: ${topic}

Discussion transcript:
${transcriptToText(transcript) || "(No discussion)"}

Provide final conclusion now.
```

### 3.4 Generation Settings

- `temperature: 0.4`
- `max_output_tokens: 200`

## 4) Judge Prompt (`POST /api/judge`)

### 4.1 Where It Is Used

- Backend handler: `server.js` -> `/api/judge`
- User prompt builder: `buildJudgePrompt(...)` in `server.js`
- Frontend caller: `public/app.js` -> `runRound(...)`
- Purpose: compare cooperative vs competitive and return structured scores plus winner

### 4.2 System Prompt Template

```txt
You are an impartial judge evaluating two approaches to the same decision question.
Answer 1 = cooperative. Answer 2 = competitive.

Use only the content provided in this prompt. No prior context.

Score each answer on five dimensions (0-10, one decimal):
  clarity
  practicality
  usefulness
  rigor
  overall

Use transcript evidence to inform practicality, usefulness, and rigor scores.
Process quality means: novelty of challenges, logical soundness,
evidence use, and quality of trade-off handling in the discussion.

Scoring rules:
- Do not reward length or structural complexity over substance.
- Rigor should reward falsification, assumption-testing, and explicit failure modes - not just having more bullet points.
- Practicality should reward clarity of next steps, not just naming them.
- Do not default to tie for politeness. Ties require all five metrics to be exactly equal.
- A well-structured synthesis and a rigorous falsification approach are equally valid paths to a high score - judge the quality of each on its own terms.

Return only JSON:
{
  "winner": "cooperative|competitive|tie",
  "rationale": "short reason",
  "scores": {
    "cooperative": {"clarity":0,"practicality":0,"usefulness":0,"rigor":0,"overall":0},
    "competitive": {"clarity":0,"practicality":0,"usefulness":0,"rigor":0,"overall":0}
  }
}
```

### 4.3 User Prompt Template

The structure below is intentionally preserved because it already matches the user's benchmark framing.

~~~txt
which answer you like most for question `${topic}`:


1:
```
${cooperativeConclusion}
```

2:
```
${competitiveConclusion}
```

cooperative discussion evidence:
```
${recent cooperative transcript excerpt}
```

competitive discussion evidence:
```
${recent competitive transcript excerpt}
```
~~~

### 4.4 Transcript Evidence Rules

- `answer 1` always maps to cooperative
- `answer 2` always maps to competitive
- Transcript evidence is clipped to the most recent `24` messages per side
- The judge sees both final conclusions and recent process evidence

### 4.5 Generation Settings

- `temperature: 0.2`
- `max_output_tokens: 260`

### 4.6 Judge Metric Definitions

- `clarity`: how readable and direct the recommendation is
- `practicality`: how actionable and feasible the proposed path is
- `usefulness`: how much this helps someone make a real decision
- `rigor`: how well the answer tests assumptions and handles failure modes
- `overall`: aggregate judgment of decision quality

## 5) Judge Output Normalization

These rules live in `server.js` and matter as much as the prompt itself.

### 5.1 Parsing

- `parseJudgeJson(...)` accepts:
  - raw JSON
  - fenced JSON
  - JSON embedded inside surrounding text

### 5.2 Score Normalization

- `clampScore(...)` bounds every metric to `0..10`
- Values are rounded to one decimal place
- `normalizeScoreBlock(...)` normalizes:
  - `clarity`
  - `practicality`
  - `usefulness`
  - `rigor`
  - `overall`

### 5.3 Alias Handling

The app accepts score-key aliases if the model returns:

- `scores.answer1` instead of `scores.cooperative`
- `scores.answer2` instead of `scores.competitive`
- `answer1`, `answer 1`, or `1` as winner -> normalized to `cooperative`
- `answer2`, `answer 2`, or `2` as winner -> normalized to `competitive`

### 5.4 Tie and Winner Logic

Tie is only final when all five metrics are exactly equal:

- `overall`
- `practicality`
- `rigor`
- `usefulness`
- `clarity`

If the model says `tie` but the metrics are not identical, the app overrides the tie and derives a winner from score order.

Winner derivation priority order:

1. `overall`
2. `practicality`
3. `rigor`
4. `usefulness`
5. `clarity`

## 6) Frontend Scoreboard and Storage

### 6.1 Where Scores Are Shown

- Main scoreboard markup: `public/index.html`
- Score formatting and rendering: `public/app.js`
- Score display format:

```txt
C {clarity} | P {practicality} | U {usefulness} | R {rigor} | O {overall}
```

### 6.2 What Gets Stored

The browser stores cumulative score state in localStorage:

- tally key: `coocom_round_score_tally_v1`
- history key: `coocom_round_score_history_v1`
- CSV input cache key: `coocom_csv_input_v1`

Per-round history stores:

- timestamp
- topic
- winner
- cooperative score block
- competitive score block
- rationale

History cap: `60` rounds

### 6.3 Why This Matters

The scoreboard and saved history are part of the prompt architecture feedback loop:

- they expose whether one side is winning because of content or formatting
- they let prompt changes be benchmarked across multiple rounds
- they preserve judge outputs across reloads until local storage is cleared

## 7) Quick Map

- `server.js` -> prompt construction, judge parsing, score normalization
- `public/app.js` -> agent metadata, round orchestration, score rendering, localStorage history
- `public/index.html` -> scoreboard shell, CSV runner shell, discussion layout

## 8) Current Prompt Constants

- Agent transcript window: `18`
- Covered-point max list size: `6`
- Judge transcript evidence window per side: `24`
- Voice anchor cap: `3`
- Discussion duration: `30` seconds
- Wrap-up alert threshold: `10` seconds remaining
