import { RenderProvider } from './interface';
import { RemotionRenderProvider } from './remotion';

/**
 * Returns the Remotion render provider if available.
 */
export async function getRenderProvider(): Promise<RenderProvider> {
  const provider = new RemotionRenderProvider();
  const info = await provider.validateAvailability();

  if (info.status !== 'available') {
    console.warn(
      `[render] Remotion provider unavailable: ${info.error ?? 'unknown reason'}`,
    );
  }

  return provider;
}

export { RemotionRenderProvider } from './remotion';
export type { RenderProvider, RenderOptions, RenderResult } from './interface';
