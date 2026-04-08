import path from 'path';
import fs from 'fs';
import { ProviderInfo } from '../types';
import { RenderProvider, RenderOptions, RenderResult } from './interface';

export class RemotionRenderProvider implements RenderProvider {
  name = 'remotion';
  private remotionDir: string;

  constructor(remotionDir?: string) {
    this.remotionDir =
      remotionDir ?? path.join(process.cwd(), 'remotion');
  }

  async validateAvailability(): Promise<ProviderInfo> {
    // Check that the remotion directory and entry point exist
    const entryPoint = path.join(this.remotionDir, 'src', 'Root.tsx');
    if (!fs.existsSync(entryPoint)) {
      return {
        name: this.name,
        status: 'unavailable',
        error: `Remotion entry point not found at ${entryPoint}`,
      };
    }

    // Check that @remotion/bundler and @remotion/renderer are importable
    try {
      require.resolve('@remotion/bundler');
      require.resolve('@remotion/renderer');
    } catch {
      return {
        name: this.name,
        status: 'unavailable',
        error:
          '@remotion/bundler or @remotion/renderer is not installed in the project',
      };
    }

    return { name: this.name, status: 'available' };
  }

  async render(
    compositionId: string,
    props: Record<string, any>,
    options: RenderOptions,
  ): Promise<RenderResult> {
    // Dynamic imports so the module can be loaded even if remotion is not installed
    const { bundle } = await import('@remotion/bundler');
    const {
      renderMedia,
      selectComposition,
    } = await import('@remotion/renderer');

    const entryPoint = path.join(this.remotionDir, 'src', 'Root.tsx');

    // Ensure output directory exists
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`[remotion] Bundling project from ${entryPoint}...`);
    const bundleLocation = await bundle({
      entryPoint,
      // Use a temp directory for the webpack bundle
      onProgress: (progress: number) => {
        if (progress % 20 === 0) {
          console.log(`[remotion] Bundle progress: ${progress}%`);
        }
      },
    });

    console.log(`[remotion] Bundle complete: ${bundleLocation}`);
    console.log(
      `[remotion] Selecting composition "${compositionId}"...`,
    );

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps: props,
    });

    // Override composition dimensions and FPS if provided
    const finalComposition = {
      ...composition,
      width: options.width ?? composition.width,
      height: options.height ?? composition.height,
      fps: options.fps ?? composition.fps,
    };

    console.log(
      `[remotion] Rendering ${finalComposition.width}x${finalComposition.height} @ ${finalComposition.fps}fps, ` +
        `${finalComposition.durationInFrames} frames...`,
    );

    const codec = (options.codec as any) ?? 'h264';

    await renderMedia({
      composition: finalComposition,
      serveUrl: bundleLocation,
      codec,
      outputLocation: options.outputPath,
      inputProps: props,
      onProgress: ({ progress }: { progress: number }) => {
        const pct = Math.round(progress * 100);
        if (pct % 10 === 0) {
          console.log(`[remotion] Render progress: ${pct}%`);
        }
      },
    });

    console.log(`[remotion] Render complete: ${options.outputPath}`);

    // Read output file stats
    const stats = fs.statSync(options.outputPath);
    const durationSeconds =
      finalComposition.durationInFrames / finalComposition.fps;

    return {
      outputPath: options.outputPath,
      durationSeconds,
      fileSizeBytes: stats.size,
    };
  }
}
