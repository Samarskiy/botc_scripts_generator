// Shared domain types for the BotC balanced script generator.
// Imported by both the client (React) and the server (Node).

export type Team =
  | 'townsfolk'
  | 'outsider'
  | 'minion'
  | 'demon'
  | 'traveller'
  | 'fabled'
  | 'loric';

export type Edition = 'tb' | 'bmr' | 'snv' | 'experimental';

export type Complexity = 'simple' | 'medium' | 'complex';

export interface Jinx {
  /** id of the other character this jinx applies with */
  with: string;
  reason: string;
}

export interface Character {
  id: string;
  name: string;
  team: Team;
  edition: Edition;
  /** Ability text — the primary signal for LLM balance evaluation. */
  ability: string;
  /** Optional mechanical tags for filtering / concept matching (info, protection, death, disruption…). */
  tags?: string[];
  jinxes?: Jinx[];
  /** Whether the character modifies the game's setup counts (e.g. Baron). */
  setup?: boolean;
  /** Storyteller reminder text for the wake order. */
  firstNightReminder?: string;
  otherNightReminder?: string;
  /** Icon URL/path for PDF rendering. */
  icon?: string;
  /** True for user-defined homebrew characters. */
  homebrew?: boolean;
}

/** Canonical wake order as lists of ids (including meta steps like dusk/dawn). */
export interface NightOrder {
  firstNight: string[];
  otherNight: string[];
}

// ---- Generation request / response ----

export interface GenerateRequest {
  /** Free-text concept / theme. */
  concept: string;
  players: { min: number; max: number };
  complexity: Complexity;
  editions: Edition[];
  includeHomebrew: boolean;
  mustInclude: string[];
  exclude: string[];
  /** Homebrew characters supplied by the client (server is stateless). */
  homebrew: Character[];
  /** Optional note for a refinement pass ("↻ Доопрацювати"). */
  refineNote?: string;
}

export interface Script {
  name: string;
  author?: string;
  /** Chosen character ids, grouped for display. */
  characters: Character[];
  conceptRationale: string;
}

export interface EvaluationResult {
  /** Overall balance score, 0–10. */
  overall: number;
  axes: {
    infoDensity: number;
    goodEvil: number;
    redundancy: number;
    degenerate: number;
    jinxLoad: number;
    complexity: number;
    conceptFit: number;
  };
  critique: string;
  suggestedSwaps: { out: string; in: string; why: string }[];
}

export interface GenerateResult {
  script: Script;
  evaluation: EvaluationResult;
  /** Set when the loop hit the iteration cap below the balance threshold. */
  belowThreshold: boolean;
}

// ---- SSE progress events ----

export type ProgressStage =
  | 'pool'
  | 'generating'
  | 'validating'
  | 'evaluating'
  | 'refining'
  | 'done'
  | 'error';

export interface ProgressEvent {
  stage: ProgressStage;
  iteration?: number;
  message?: string;
  /** Present on the final 'done' event. */
  result?: GenerateResult;
  /** Present on 'error'. */
  error?: string;
}
