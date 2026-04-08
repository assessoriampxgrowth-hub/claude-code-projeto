import { ProviderInfo } from '../types';

export interface ImageGenerationResult {
  url?: string;
  localPath?: string;
  width: number;
  height: number;
  provider: string;
}

export interface ImageProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
  generateImage(
    prompt: string,
    options?: { width?: number; height?: number; style?: string },
  ): Promise<ImageGenerationResult>;
}
