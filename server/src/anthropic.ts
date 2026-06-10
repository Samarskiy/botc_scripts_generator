import Anthropic from '@anthropic-ai/sdk';
import type { EvaluationResult } from '@botc/shared';
import type { LlmClient, GenerateInput, EvaluateInput } from './engine/llm.js';
import type { GenerationResult } from './engine/schemas.js';
import { generationTool, evaluationTool } from './engine/schemas.js';
import { SYSTEM_PROMPT, buildGenerationMessages, buildEvaluationMessages } from './engine/prompts.js';
import { config } from './config.js';

/**
 * Real LlmClient backed by the Anthropic SDK. Uses forced tool use for
 * structured output. The SDK retries 429/5xx with exponential backoff
 * (maxRetries), so no hand-rolled backoff is needed.
 */
export class AnthropicLlmClient implements LlmClient {
  private client: Anthropic;

  constructor(
    apiKey: string = config.anthropicApiKey,
    private model: string = config.model,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 3 });
  }

  async generate(input: GenerateInput): Promise<GenerationResult> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [generationTool],
      tool_choice: { type: 'tool', name: generationTool.name },
      messages: buildGenerationMessages(input),
    });
    return extractToolInput<GenerationResult>(res, generationTool.name);
  }

  async evaluate(input: EvaluateInput): Promise<EvaluationResult> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: [evaluationTool],
      tool_choice: { type: 'tool', name: evaluationTool.name },
      messages: buildEvaluationMessages(input),
    });
    return extractToolInput<EvaluationResult>(res, evaluationTool.name);
  }
}

function extractToolInput<T>(res: Anthropic.Message, toolName: string): T {
  const block = res.content.find((b) => b.type === 'tool_use' && b.name === toolName);
  if (!block || block.type !== 'tool_use') {
    throw new Error(`Модель не повернула очікуваний виклик інструмента «${toolName}»`);
  }
  return block.input as T;
}
