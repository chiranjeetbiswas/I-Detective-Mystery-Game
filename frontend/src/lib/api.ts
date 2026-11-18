import { getToken } from "./token";
import type {
  AccuseResponse,
  ActionResponse,
  AuthResponse,
  AuthUser,
  DetectiveInterviewResponse,
  DetectiveMessageResponse,
  Difficulty,
  SaveSlot,
  Snapshot,
  Statistics,
} from "./types";

// Strip any trailing slash so `${BASE}/api...` never produces a double slash
// (e.g. when NEXT_PUBLIC_API_URL is set to "https://host/" on the deploy host).
const BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

/** An API failure. `detail` is the server's short reason, ready to show a player. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    raw: string
  ) {
    super(`API ${status}: ${raw}`);
    this.name = "ApiError";
  }
}

/** FastAPI sends `detail` as a string, or as a list for validation errors. */
function readableDetail(raw: string, fallback: string): string {
  try {
    const detail = JSON.parse(raw)?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0];
      const field = Array.isArray(first?.loc) ? first.loc[first.loc.length - 1] : "";
      return field ? `${field}: ${first.msg}` : String(first?.msg ?? fallback);
    }
  } catch {
    /* not JSON */
  }
  return fallback;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      res.status,
      readableDetail(text, res.statusText || "Something went wrong"),
      text || res.statusText
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ status: string; provider: string }>("/health"),

  // ---- accounts (guests never call these) ----
  register: (email: string, password: string, display_name: string) =>
    req<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    }),

  login: (email: string, password: string) =>
    req<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => req<AuthUser>("/auth/me"),

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

  // ---- AI detective team ----
  detectiveMessage: (gameId: string, text: string) =>
    req<DetectiveMessageResponse>(`/games/${gameId}/detectives/message`, {
      method: "POST",
      body: JSON.stringify({ game_id: gameId, text }),
    }),

  detectiveInterview: (gameId: string, detectiveId: string, characterId: string) =>
    req<DetectiveInterviewResponse>(`/games/${gameId}/detectives/interview`, {
      method: "POST",
      body: JSON.stringify({
        game_id: gameId,
        detective_id: detectiveId,
        character_id: characterId,
      }),
    }),

  detectiveSettle: (gameId: string, detectiveId: string) =>
    req<{ detectives: import("./types").DetectiveView[] }>(
      `/games/${gameId}/detectives/settle`,
      {
        method: "POST",
        body: JSON.stringify({ game_id: gameId, detective_id: detectiveId }),
      }
    ),

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
