import { ProviderInfo } from '../types';
import { VoiceProvider, VoiceSynthesisResult, VoiceOptions } from './interface';

/**
 * Stub voice provider that is always unavailable.
 * Acts as a placeholder until a real provider (ElevenLabs, Google TTS, etc.)
 * is integrated.
 */
export class StubVoiceProvider implements VoiceProvider {
  name = 'stub-voice';

  async validateAvailability(): Promise<ProviderInfo> {
    return {
      name: this.name,
      status: 'unavailable',
      error:
        'No voice synthesis provider is configured. Set up ElevenLabs or another TTS provider.',
    };
  }

  async synthesizeVoice(
    _text: string,
    _outputPath: string,
    _options?: VoiceOptions,
  ): Promise<VoiceSynthesisResult> {
    throw new Error(
      'Voice synthesis is not available. No provider is configured. ' +
        'To enable voice synthesis, integrate a provider like ElevenLabs, ' +
        'Google Cloud TTS, or Azure Speech Services.',
    );
  }

  async listVoices(): Promise<{ id: string; name: string; language: string }[]> {
    return [];
  }
}
