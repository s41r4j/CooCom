# CooCom Agentic Chat (Simple)

Two-side OpenAI API decision chat:
- Left: 4 cooperative agents
- Right: 4 competitive agents

Rules implemented:
- Max 4 agents per side.
- Turn-based speaking (one at a time per side) with dynamic queueing (non-fixed order).
- Personality matching: each round randomly selects 4 personalities from a pool of 10, and both sides use the same 4 personalities (mode-specific missions) for fair comparison.
- Agent prompt includes peer roster awareness, lane discipline, discussion phase arc (early/middle/late), explicit gap-filling vs falsification behavior, and phrase-level voice anchors.
- 30-second discussion window.
- At 20s elapsed (10s remaining), moderator sends wrap-up alert.
- Final conclusion generated for each side with mode-specific templates (cooperative action/risk/success synthesis vs competitive position/assumption/falsification synthesis).
- Automatic judge scores both conclusions on `clarity`, `practicality`, `usefulness`, `rigor`, and `overall`, using transcript evidence for process quality, then picks a winner.
- Session scoreboard tracks cumulative wins for cooperative vs competitive (and ties).
- Scoreboard keeps per-round history in localStorage and can be cleared.
- CSV test runner (`+` icon) accepts pasted `id,question` data and executes rounds sequentially.

## Run

1. Export API key:
   ```bash
   export OPENAI_API_KEY="your_key_here"
   ```
2. Optional model override:
   ```bash
   export OPENAI_MODEL="gpt-4.1-mini"
   ```
3. Start server:
   ```bash
   npm start
   ```
4. Open:
   `http://localhost:3000`
