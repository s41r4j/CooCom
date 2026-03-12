# CooCom Decision Room

CooCom Decision Room is a browser-based decision arena that runs the same question through two parallel agent teams:

- **Cooperative**: agents build toward a shared recommendation
- **Competitive**: agents pressure-test assumptions, alternatives, and failure modes

Each round ends with:

- one conclusion per side
- an automated judge scorecard
- a round winner
- persistent local score history

## What It Does

- Runs **4 cooperative agents** and **4 competitive agents**
- Uses a **dynamic speaking queue** instead of a fixed `1-2-3-4` turn loop
- Randomly selects **4 shared personalities** from a pool of 10 each round, then reuses those same personalities on both sides for a fair comparison
- Generates side-specific conclusions after a **30-second timed discussion**
- Scores both conclusions using a multi-metric judge (`clarity`, `practicality`, `usefulness`, `rigor`, `overall`)
- Stores scoreboard history in browser localStorage
- Supports pasted CSV batch testing
- Supports **OpenAI** and **Gemini** through the in-app provider settings modal
- Loads provider model lists inside settings so you can pick a discussion model and, optionally, a different judge model

## Product Structure

### Frontend

Located in `public/`.

- `index.html`: application shell, controls, panels, and modal markup
- `styles.css`: neo-brutalist UI styling and responsive layout
- `app.js`: round orchestration, queueing, local persistence, provider settings, CSV runner, and scoreboard rendering

### Backend

- `server.js`: static file serving, prompt construction, provider routing, conclusion generation, and judge scoring

The app uses a small Node HTTP server rather than a framework.

## Provider Support

The app supports two model providers:

- **OpenAI**
- **Gemini**

Provider selection happens in the **settings button** inside the UI. Provider keys, discussion model settings, and judge model settings are stored in browser localStorage.

### OpenAI

- Default model: `gpt-5.2`
- Server env override: `OPENAI_MODEL`
- The settings modal can query your live OpenAI model list and save the selected model locally per browser

### Gemini

- Default model: `gemini-2.5-flash`
- Server env override: `GEMINI_MODEL`
- Gemini requests are sent as plain-text generation requests
- For `gemini-2.5-flash`, dynamic thinking is disabled in code to keep turn-by-turn discussion fast and stable for this app
- The settings modal can query Gemini's `generateContent`-capable models and save the selected model locally per browser

## Key Runtime Behaviors

### Fair Personality Matching

Each round:

1. samples 4 unique personalities from a pool of 10
2. builds cooperative agent cards from those 4
3. builds competitive agent cards from those same 4

This prevents one side from winning just because it got a stronger set of personas.

### Turn Queueing

Agents do **not** speak in a rigid loop.

The next speaker is chosen using:

- how often they have already spoken
- how long it has been since they last spoke
- whether the latest transcript content matches their keyword lens
- whether the wrap-up phase is active

### Stop Behavior

The UI includes a **Stop** button beside the timer.

Stopping a round:

- aborts active browser requests
- stops both discussion loops
- skips conclusion scoring for that interrupted round

### Judge Behavior

The judge compares both conclusions and recent transcript evidence, then scores:

- `clarity`
- `practicality`
- `usefulness`
- `rigor`
- `overall`

Winner normalization is handled server-side so invalid judge outputs do not silently become ties.

The judge can also run on a **different provider/model** from the discussion, with its own temperature and optional Gemini thinking toggle.

## Local Development

### Requirements

- Node.js 18+ recommended

### Install

This repo has no runtime dependencies beyond Node itself.

### Run

```bash
npm start
```

Then open:

```txt
http://localhost:3000
```

## Environment Variables

All keys are optional if you prefer entering them in the browser settings modal.

### OpenAI

```bash
export OPENAI_API_KEY="your_openai_key"
export OPENAI_MODEL="gpt-5.2"
```

### Gemini

```bash
export GEMINI_API_KEY="your_gemini_key"
export GEMINI_MODEL="gemini-2.5-flash"
```

## In-App Settings

The settings modal lets you:

- store one OpenAI key and one Gemini key locally in the browser
- choose the **discussion provider/model**
- choose whether the **judge inherits the discussion LLM** or uses a different provider/model
- load the provider's available models from the backend
- tune cooperative, competitive, conclusion, and judge temperatures
- enable Gemini judge thinking when the effective judge provider is Gemini

If a provider has no saved browser key, the app falls back to the matching server environment variable.

## CSV Batch Runner

The `+` button opens the CSV test runner.

Expected format:

```csv
id,question
1,"Should I do X or Y?"
2,"What risk should I accept in this tradeoff?"
```

Each row runs one full round and appends its result to the local scoreboard history.

## Local Storage

The browser stores:

- per-provider API keys
- discussion provider/model/temperatures
- judge provider/model/temperature settings
- judge Gemini thinking preference
- cumulative round tally
- round history
- the last pasted CSV input

This data persists until cleared manually, local storage is wiped, or the session runs in a private/incognito context that gets discarded.

## Deployment Notes

This project is a **Node server with backend API routes**, not a static-only site.

You should deploy it to a platform that can run a long-lived or serverless Node backend, for example:

- Vercel
- Google Cloud Run
- Railway
- Render

### Vercel

This repo now includes:

- `api/agent-turn.js`
- `api/conclusion.js`
- `api/judge.js`
- `api/models.js`

These are Vercel Functions that wrap the same backend logic used by local `server.js`.

If you deploy to Vercel:

- `public/` serves the frontend assets
- `api/*.js` serves the backend JSON routes
- `vercel.json` raises API function duration to `60` seconds

## Files Worth Reading

- `server.js`
- `public/app.js`
- `PROMPTS.md`

`PROMPTS.md` documents the active prompt architecture, scoring rules, and provider behavior in detail.
