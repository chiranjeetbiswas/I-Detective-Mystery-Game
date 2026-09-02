# Identity Hunt — AI Detective Mystery Game

A text-based detective game powered by AI. Every game gives you a new mystery.
You look for clues, talk to the guests, and get **one final guess** to name the
person who is hiding who they really are.

All text in the game is written in **simple English**: short sentences and
everyday words.

This is **not a chatbot**. It is a detective game that keeps its own state. The
AI writes one full case at the start and stores it. Everything after that uses
the stored case, so the answer never changes while you play.

## Architecture

```
Mystery Game/
├── backend/          FastAPI (Python) — game engine, LLM adapters, prompts, state
│   ├── app/
│   │   ├── core/       config, logging
│   │   ├── models/     Pydantic domain models (Case, Character, GameState, ...)
│   │   ├── llm/        adapter pattern (base, agentrouter, mock) + factory
│   │   ├── prompts/    separate prompts (case gen, NPC, narrator, hint, ending)
│   │   ├── engine/     game engine: generation, trust/suspicion/time, action routing
│   │   ├── services/   save + statistics (JSON store)
│   │   └── api/         FastAPI routes
│   └── requirements.txt
└── frontend/         Next.js 15 + TS + Tailwind + shadcn/ui
    └── src/
        ├── app/        screens (routes)
        ├── components/  reusable UI
        ├── lib/         API client, types, store
```

### Key design rules
- **One case per game.** Generated once, stored as structured JSON, immutable.
- **No full-conversation replay.** Structured game state is maintained; only the
  minimal relevant context is sent to the LLM each turn.
- **Provider adapter pattern.** Swap AgentRouter for any provider by implementing the
  `LLMProvider` interface. A `MockProvider` lets the whole game run with **no API key**.
- **Separate prompt modules** — never one giant prompt.

## Quick start

### With Docker (One-Command Startup)

The easiest way to run the full application (both frontend and backend):

```bash
# Optional: customize AgentRouter API key (defaults to offline Mock Provider if unset)
cp .env.example .env

# Build and start both services
docker compose up --build
```

- **Frontend App**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

To run in the background:
```bash
docker compose up -d
```

To stop:
```bash
docker compose down
```

### Manual Setup (Without Docker)

### Backend
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # add AGENTROUTER_API_KEY (optional; mock provider works without it)
uvicorn app.main:app --reload --port 8000
```
Docs: http://localhost:8000/docs

If `AGENTROUTER_API_KEY` is unset, the backend uses the built-in **mock provider** so the
game is fully playable offline.

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
App: http://localhost:3000

## Difficulty
Beginner · Normal · Expert · Master Detective — controls clue density, NPC honesty,
lies, red herrings and hint availability.

## Character count
4, 5, 6 (recommended), 8, 10, 12.
