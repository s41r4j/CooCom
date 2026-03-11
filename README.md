# CooCom Agentic Chat (Simple)

Two-side OpenAI API decision chat:
- Left: 4 cooperative agents
- Right: 4 competitive agents

Rules implemented:
- Max 4 agents per side.
- Turn-based speaking (one at a time per side) with dynamic queueing (non-fixed order).
- Agent role cards (different lens per agent) to reduce repetitive outputs.
- 30-second discussion window.
- At 20s elapsed (10s remaining), moderator sends wrap-up alert.
- Final conclusion generated for each side.
- Automatic judge scores both conclusions (clarity, practicality, usefulness, overall) and picks a winner.
- Session scoreboard tracks cumulative wins for cooperative vs competitive (and ties).

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
