import { ImageProvider } from './interface';
import { DalleImageProvider } from './dalle';
import { PlaceholderImageProvider } from './placeholder';

const dalleProvider = new DalleImageProvider();
const placeholderProvider = new PlaceholderImageProvider();

/**
 * Returns DALL-E if the OpenAI API key is configured, otherwise falls back
 * to the placeholder provider which is always available.
 */
export async function getImageProvider(): Promise<ImageProvider> {
  const dalleInfo = await dalleProvider.validateAvailability();
  if (dalleInfo.status === 'available') {
    return dalleProvider;
  }

  console.warn(
    `[image] DALL-E unavailable (${dalleInfo.error ?? 'unknown reason'}). Using placeholder fallback.`,
  );
  return placeholderProvider;
}

export { DalleImageProvider } from './dalle';
export { PlaceholderImageProvider } from './placeholder';
export type { ImageProvider, ImageGenerationResult } from './interface';
