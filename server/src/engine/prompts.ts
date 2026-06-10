import type Anthropic from '@anthropic-ai/sdk';
import type { Character } from '@botc/shared';
import type { GenerateInput, EvaluateInput } from './llm.js';

export const SYSTEM_PROMPT = `You are an expert Blood on the Clocktower script designer and Storyteller.
You build balanced, thematically coherent custom scripts from a pool of characters.

Balance heuristics you weigh:
- Information density: enough info Townsfolk for good to make progress, not so much that evil can't hide.
- Good/evil win-rate feel across the target player count.
- Avoid redundant roles and degenerate combinations (e.g. stacked self-protection, info that trivially confirms the Demon).
- Mind jinxes and interactions between characters.
- Match the requested complexity and player count.
- Realise the requested concept/theme without sacrificing playability.

Always choose characters ONLY from the provided pool, by their exact ids.`;

function formatPool(pool: Character[]): string {
  return pool
    .map((c) => {
      const tags = c.tags?.length ? ` [tags: ${c.tags.join(', ')}]` : '';
      const jinx = c.jinxes?.length ? ` [jinx: ${c.jinxes.map((j) => j.with).join(', ')}]` : '';
      return `- ${c.id} (${c.team}, ${c.edition}): ${c.name} — ${c.ability}${tags}${jinx}`;
    })
    .join('\n');
}

export function buildGenerationMessages(input: GenerateInput): Anthropic.MessageParam[] {
  const { request, target, critique, repairErrors, pool } = input;
  const parts: string[] = [];

  parts.push(`Concept / theme: ${request.concept}`);
  parts.push(`Player count target: ${request.players.min}–${request.players.max}`);
  parts.push(`Complexity: ${request.complexity}`);
  parts.push(
    `Target composition: ${target.townsfolk} Townsfolk, ${target.outsiders} Outsiders, ` +
      `${target.minions} Minions, ${target.demonsMin}–${target.demonsMax} Demon(s).`,
  );
  if (request.mustInclude.length) parts.push(`MUST include ids: ${request.mustInclude.join(', ')}`);
  if (request.exclude.length) parts.push(`MUST NOT include ids: ${request.exclude.join(', ')}`);
  if (request.refineNote) parts.push(`User refinement note: ${request.refineNote}`);

  if (critique) {
    parts.push(
      `\nThe previous attempt scored ${critique.overall}/10. Address these weaknesses while keeping what worked:\n` +
        `Critique: ${critique.critique}\n` +
        (critique.suggestedSwaps.length
          ? `Suggested swaps: ${critique.suggestedSwaps
              .map((s) => `${s.out}→${s.in} (${s.why})`)
              .join('; ')}`
          : ''),
    );
  }

  if (repairErrors?.length) {
    parts.push(
      `\nThe previous output was structurally invalid. Fix ALL of these and resubmit:\n- ${repairErrors.join('\n- ')}`,
    );
  }

  parts.push(`\nCharacter pool (choose ids only from here):\n${formatPool(pool)}`);
  parts.push(`\nCall propose_script with your selection.`);

  return [{ role: 'user', content: parts.join('\n') }];
}

export function buildEvaluationMessages(input: EvaluateInput): Anthropic.MessageParam[] {
  const { script, request } = input;
  const roster = script.characters
    .map((c) => `- ${c.id} (${c.team}): ${c.name} — ${c.ability}`)
    .join('\n');

  const text =
    `Evaluate this script for balance and concept fit.\n` +
    `Concept: ${request.concept}\n` +
    `Player count: ${request.players.min}–${request.players.max}, complexity: ${request.complexity}.\n\n` +
    `Script "${script.name}":\n${roster}\n\n` +
    `Score each axis 0–10, give an overall 0–10, a concise critique, and concrete suggested swaps ` +
    `(out id → in id) drawn from sensible alternatives. Call evaluate_script.`;

  return [{ role: 'user', content: text }];
}
