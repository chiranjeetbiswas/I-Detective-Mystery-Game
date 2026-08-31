// Types mirroring the backend serializer payloads.

export type Difficulty = "beginner" | "normal" | "expert" | "master";
export type GameStatus = "in_progress" | "won" | "lost";
export type Gender = "female" | "male" | "nonbinary";
export type Mood =
  | "calm"
  | "happy"
  | "confident"
  | "suspicious"
  | "nervous"
  | "scared"
  | "angry";
export type NPCStatus =
  | "available"
  | "talking"
  | "busy"
  | "sleeping"
  | "missing";

export interface Room {
  id: string;
  name: string;
  description: string;
}

export interface CaseBrief {
  id: string;
  title: string;
  difficulty: Difficulty;
  location_type: string;
  location_name: string;
  introduction: string;
  crime: string;
  start_time: string;
  num_characters: number;
  rooms: Room[];
}

export interface CharacterView {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  occupation: string;
  personality: string;
  speaking_style: string;
  habits: string;
  avatar_seed: string;
  trust: number;
  stress: number;
  suspicion_of_player: number;
  times_questioned: number;
  mood: Mood;
  status: NPCStatus;
  has_met: boolean;
  is_active: boolean;
}

export interface EvidenceView {
  id: string;
  name: string;
  description: string;
  location: string;
}

export interface GameStateView {
  game_id: string;
  case_id: string;
  status: GameStatus;
  clock: string;
  minutes_elapsed: number;
  current_location: string;
  current_objective: string;
  inventory: string[];
  hints_used: number;
  accusation_made: boolean;
  discovered_evidence_count: number;
  active_character_id: string;
}

export interface NotebookEntry {
  kind: string;
  title: string;
  detail: string;
  at_time: string;
}

export interface Notebook {
  characters: NotebookEntry[];
  evidence: NotebookEntry[];
  contradictions: NotebookEntry[];
  timeline: NotebookEntry[];
  secrets: NotebookEntry[];
  open_questions: NotebookEntry[];
}

export interface TranscriptLine {
  at_time: string;
  speaker: string;
  text: string;
  kind: "dialogue" | "narration" | "system";
  character_id?: string;
}

export interface Solution {
  target_id: string;
  target_name: string;
  true_identity: string;
  reasoning: string;
}

export interface Snapshot {
  brief: CaseBrief;
  state: GameStateView;
  characters: CharacterView[];
  evidence: EvidenceView[];
  notebook: Notebook;
  transcript: TranscriptLine[];
  rooms: Room[];
  solution?: Solution;
}

export interface ActionResult {
  game_id: string;
  narration: string;
  speaker: string;
  speaker_character_id: string;
  dialogue: string;
  at_time: string;
  minutes_elapsed: number;
  new_evidence: string[];
  status: string;
  trust_changes: Record<string, number>;
  active_character_id: string;
  mood: string;
}

export interface ActionResponse {
  result: ActionResult;
  state: GameStateView;
  characters: CharacterView[];
  evidence: EvidenceView[];
  notebook: Notebook;
  transcript: TranscriptLine[];
}

export interface AccuseResult {
  game_id: string;
  correct: boolean;
  status: GameStatus;
  verdict: string;
  true_target_id: string;
  true_target_name: string;
  reasoning: string;
}

export interface AccuseResponse {
  result: AccuseResult;
  snapshot: Snapshot;
}

export interface SaveSlot {
  slot: string;
  title: string;
  status: GameStatus;
  updated_at: string;
  game_id: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked_at: string;
}

export interface Statistics {
  cases_solved: number;
  cases_failed: number;
  total_games: number;
  fastest_solve_minutes: number | null;
  total_solve_minutes: number;
  achievements: Achievement[];
  accuracy: number;
  average_solve_minutes: number;
  rank: string;
}
