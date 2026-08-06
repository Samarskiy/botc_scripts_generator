import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';

// The dev server runs with cwd = server/, but .env lives at the repo root
// (two levels up from this module in both dev and prod). Load it explicitly.
loadDotenv({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

/** Central runtime configuration, sourced from environment with sane defaults. */
export const config = {
  port: Number(process.env.PORT ?? 5174),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  /** Balance judgement is the hard part here, so default to the strongest model. */
  model: process.env.BOTC_MODEL ?? 'claude-opus-5',
  /** Overall balance score (0–10) at or above which the loop stops. */
  balanceThreshold: Number(process.env.BOTC_BALANCE_THRESHOLD ?? 8.0),
  /** Max refinement iterations after the initial generation. */
  maxIterations: Number(process.env.BOTC_MAX_ITERATIONS ?? 2),
  /** Retries when the model returns a structurally invalid script. */
  autoRepairAttempts: Number(process.env.BOTC_AUTO_REPAIR_ATTEMPTS ?? 2),
  /** Whether the static client build should be served (production). */
  serveClient: process.env.NODE_ENV === 'production',
} as const;

export function hasApiKey(): boolean {
  return config.anthropicApiKey.trim().length > 0;
}
