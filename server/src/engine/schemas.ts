import type Anthropic from '@anthropic-ai/sdk';

/** Structured shape the model returns when proposing a script. */
export interface GenerationResult {
  name: string;
  characterIds: string[];
  conceptRationale: string;
}

/** Forced tool that constrains the generation output to a valid shape. */
export const generationTool: Anthropic.Tool = {
  name: 'propose_script',
  description:
    'Propose a balanced Blood on the Clocktower script by selecting character ids from the provided pool.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Evocative script title fitting the concept.' },
      characterIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Ids of the chosen characters, grouped by team is not required.',
      },
      conceptRationale: {
        type: 'string',
        description: 'Short explanation of how the selection realises the concept.',
      },
    },
    required: ['name', 'characterIds', 'conceptRationale'],
  },
};

/** Forced tool that constrains the evaluation/critique output. */
export const evaluationTool: Anthropic.Tool = {
  name: 'evaluate_script',
  description: 'Critique a Blood on the Clocktower script for balance and concept fit.',
  input_schema: {
    type: 'object',
    properties: {
      overall: { type: 'number', description: 'Overall balance score, 0–10.' },
      axes: {
        type: 'object',
        properties: {
          infoDensity: { type: 'number' },
          goodEvil: { type: 'number' },
          redundancy: { type: 'number' },
          degenerate: { type: 'number' },
          jinxLoad: { type: 'number' },
          complexity: { type: 'number' },
          conceptFit: { type: 'number' },
        },
        required: [
          'infoDensity',
          'goodEvil',
          'redundancy',
          'degenerate',
          'jinxLoad',
          'complexity',
          'conceptFit',
        ],
      },
      critique: { type: 'string' },
      suggestedSwaps: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            out: { type: 'string' },
            in: { type: 'string' },
            why: { type: 'string' },
          },
          required: ['out', 'in', 'why'],
        },
      },
    },
    required: ['overall', 'axes', 'critique', 'suggestedSwaps'],
  },
};
