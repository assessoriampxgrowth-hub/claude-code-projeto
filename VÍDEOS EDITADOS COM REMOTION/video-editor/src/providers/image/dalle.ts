import OpenAI from 'openai';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { ProviderInfo } from '../types';
import { ImageProvider, ImageGenerationResult } from './interface';

/**
 * Map of requested dimensions to the closest DALL-E 3 supported size.
 * DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
 */
function pickDalleSize(
  width?: number,
  height?: number,
): '1024x1024' | '1024x1792' | '1792x1024' {
  if (!width || !height) return '1024x1792'; // default: vertical
  const ratio = width / height;
  if (ratio > 1.3) return '1792x1024'; // landscape
  if (ratio < 0.77) return '1024x1792'; // portrait
  return '1024x1024'; // square-ish
}

export class DalleImageProvider implements ImageProvider {
  name = 'dall-e-3';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async validateAvailability(): Promise<ProviderInfo> {
    if (!process.env.OPENAI_API_KEY) {
      return {
        name: this.name,
        status: 'unavailable',
        error: 'OPENAI_API_KEY environment variable is not set',
      };
    }

    try {
      await this.client.models.list();
      return { name: this.name, status: 'available' };
    } catch (err: any) {
      return {
        name: this.name,
        status: 'error',
        error: `OpenAI API error: ${err.message ?? String(err)}`,
      };
    }
  }

  async generateImage(
    prompt: string,
    options?: { width?: number; height?: number; style?: string },
  ): Promise<ImageGenerationResult> {
    const size = pickDalleSize(options?.width, options?.height);
    const [w, h] = size.split('x').map(Number);

    const stylePrefix =
      options?.style ??
      'cinematic, dark background, vibrant colors, vertical 9:16';

    const response = await this.client.images.generate({
      model: 'dall-e-3',
      prompt: `${prompt}. Style: ${stylePrefix}`,
      size,
      quality: 'standard',
      n: 1,
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) {
      throw new Error('DALL-E returned no image URL');
    }

    // Download the image to a local temp path
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to download generated image: ${imageRes.status}`);
    }
    const imageBuffer = Buffer.from(await imageRes.arrayBuffer());

    const dir = path.join(process.cwd(), 'uploads', 'generated-images');
    await mkdir(dir, { recursive: true });

    const filename = `dalle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const localPath = path.join(dir, filename);
    await writeFile(localPath, imageBuffer);

    return {
      url: imageUrl,
      localPath,
      width: w,
      height: h,
      provider: this.name,
    };
  }
}
