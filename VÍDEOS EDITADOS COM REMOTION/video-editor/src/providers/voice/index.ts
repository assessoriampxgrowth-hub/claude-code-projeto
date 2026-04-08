import { VoiceProvider } from './interface';
import { StubVoiceProvider } from './stub';

/**
 * Returns the available voice provider. Currently only a stub.
 * When a real provider (e.g. ElevenLabs) is added, it should be
 * checked first before falling back to the stub.
 */
export async function getVoiceProvider(): Promise<VoiceProvider> {
  // Future: add real providers here and check availability
  // const elevenlabs = new ElevenLabsVoiceProvider();
  // const info = await elevenlabs.validateAvailability();
  // if (info.status === 'available') return elevenlabs;

  return new StubVoiceProvider();
}

export { StubVoiceProvider } from './stub';
export type {
  VoiceProvider,
  VoiceOptions,
  VoiceSynthesisResult,
} from './interface';
