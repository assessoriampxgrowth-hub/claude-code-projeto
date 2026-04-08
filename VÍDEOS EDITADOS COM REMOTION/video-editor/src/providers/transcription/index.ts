import { TranscriptionProvider } from './interface';
import { WhisperTranscriptionProvider } from './whisper';

const providers: TranscriptionProvider[] = [
  new WhisperTranscriptionProvider(),
];

/**
 * Returns the first transcription provider whose API key / environment
 * is correctly configured. Falls back to the first provider in the list
 * if none pass validation (caller should check availability before use).
 */
export async function getTranscriptionProvider(): Promise<TranscriptionProvider> {
  for (const provider of providers) {
    const info = await provider.validateAvailability();
    if (info.status === 'available') {
      return provider;
    }
  }

  console.warn(
    '[transcription] No transcription provider is currently available. Returning Whisper as default (will fail at runtime without OPENAI_API_KEY).',
  );
  return providers[0];
}

export { WhisperTranscriptionProvider } from './whisper';
export type {
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionSegment,
  WordTimestamp,
} from './interface';
