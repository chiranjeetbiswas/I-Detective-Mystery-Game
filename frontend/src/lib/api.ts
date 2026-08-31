import type {
  AccuseResponse,
  ActionResponse,
  Difficulty,
  SaveSlot,
  Snapshot,
  Statistics,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string; provider: string }>("/health"),

  newGame: (num_characters: number, difficulty: Difficulty) =>
    req<Snapshot>("/games", {
      method: "POST",
      body: JSON.stringify({ num_characters, difficulty }),
    }),

  getGame: (gameId: string) => req<Snapshot>(`/games/${gameId}`),

  action: (gameId: string, text: string) =>
    req<ActionResponse>(`/games/${gameId}/action`, {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, text }),
    }),

  selectCharacter: (gameId: string, characterId: string) =>
    req<ActionResponse>(`/games/${gameId}/select`, {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, character_id: characterId }),
    }),

  talk: (gameId: string, text: string, characterId = "") =>
    req<ActionResponse>(`/games/${gameId}/talk`, {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, text, character_id: characterId }),
    }),

  hint: (gameId: string) =>
    req<ActionResponse>(`/games/${gameId}/hint`, {
      method: "POST",
      body: JSON.stringify({ game_id: gameId }),
    }),

  accuse: (gameId: string, characterId: string) =>
    req<AccuseResponse>(`/games/${gameId}/accuse`, {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, character_id: characterId }),
    }),

  save: (gameId: string, slot: string) =>
    req<{ ok: boolean; slot: string }>("/saves", {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, slot }),
    }),

  listSaves: () => req<{ saves: SaveSlot[] }>("/saves"),

  resume: (slot: string) =>
    req<Snapshot>(`/saves/${slot}/resume`, { method: "POST" }),

  restart: (gameId: string) =>
    req<Snapshot>(`/games/${gameId}/restart`, { method: "POST" }),

  stats: () => req<Statistics>("/stats"),
};
