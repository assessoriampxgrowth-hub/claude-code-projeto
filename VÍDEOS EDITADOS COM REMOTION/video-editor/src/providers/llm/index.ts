import { LLMProvider } from './interface';
import { ClaudeLLMProvider } from './claude';

const providers: LLMProvider[] = [new ClaudeLLMProvider()];

/**
 * Returns the first available LLM provider. Currently defaults to Claude.
 */
export async function getLLMProvider(): Promise<LLMProvider> {
  for (const provider of providers) {
    const info = await provider.validateAvailability();
    if (info.status === 'available') {
      return provider;
    }
  }

  console.warn(
    '[llm] No LLM provider is currently available. Returning Claude as default (will fail at runtime without ANTHROPIC_API_KEY).',
  );
  return providers[0];
}

export { ClaudeLLMProvider } from './claude';
export type {
  LLMProvider,
  EditPlan,
  EditPlanScene,
} from './interface';
