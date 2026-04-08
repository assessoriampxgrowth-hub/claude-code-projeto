import { ProviderInfo } from '../types';

export interface RenderOptions {
  width: number;
  height: number;
  fps: number;
  codec?: string;
  outputPath: string;
}

export interface RenderResult {
  outputPath: string;
  durationSeconds: number;
  fileSizeBytes: number;
}

export interface RenderProvider {
  name: string;
  validateAvailability(): Promise<ProviderInfo>;
  render(
    compositionId: string,
    props: Record<string, any>,
    options: RenderOptions,
  ): Promise<RenderResult>;
}
