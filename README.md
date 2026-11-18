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
│   │   ├── llm/        adapter pattern (base, agentrouter, groq, mock) + factory
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
- **Provider adapter pattern.** Swap AgentRouter or Groq for any provider by implementing the
  `LLMProvider` interface. A `MockProvider` lets the whole game run with **no API key**.
- **Separate prompt modules** — never one giant prompt.

## Quick start

### With Docker (One-Command Startup)

The easiest way to run the full application (both frontend and backend):

```bash
# Optional: add an AgentRouter and/or Groq API key (defaults to offline Mock Provider if unset)
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
cp .env.example .env      # add GROQ_API_KEY and/or AGENTROUTER_API_KEY (optional; mock provider works without them)
uvicorn app.main:app --reload --port 8000
```
Docs: http://localhost:8000/docs

If no API key is set, the backend uses the built-in **mock provider** so the
game is fully playable offline.

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
App: http://localhost:3000

## Accounts and guest play

Players can **sign in with an email and password** or **play as a guest**. Nobody
is forced to sign in.

- **Guest:** no account. Everything works. Results go to a shared guest record.
- **Signed in:** results, record and awards are saved to your own account.
- Passwords are hashed with scrypt (never stored as text). Logins use signed JWT tokens.
- Accounts live in a SQLite file in `DATA_DIR` by default. Set `DATABASE_URL` to a
  Postgres URL to use Postgres instead.
- In production set `JWT_SECRET` to a long random value, otherwise everyone is
  signed out on every restart.

| Method | Path | What it does |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account, returns a token |
| POST | `/api/auth/login` | Sign in, returns a token |
| GET | `/api/auth/me` | Who am I (needs a token) |

Run the backend tests:

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests
```

## Difficulty
Beginner · Normal · Expert · Master Detective — controls clue density, NPC honesty,
lies, red herrings and hint availability.

## Character count
4, 5, 6 (recommended), 8, 10, 12.
