// Lightweight client-side persistence of the active game id.
const KEY = "identity-hunt:active-game";

export function setActiveGame(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, id);
}

export function getActiveGame(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function clearActiveGame() {
  if (typeof window !== "undefined") localStorage.removeItem(KEY);
}
