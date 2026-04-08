import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { ProviderInfo } from '../types';
import { ImageProvider, ImageGenerationResult } from './interface';

/**
 * Generates a minimal SVG placeholder image and saves it as a file.
 * This provider is always available and requires no external API.
 */
export class PlaceholderImageProvider implements ImageProvider {
  name = 'placeholder';

  async validateAvailability(): Promise<ProviderInfo> {
    return { name: this.name, status: 'available' };
  }

  async generateImage(
    prompt: string,
    options?: { width?: number; height?: number; style?: string },
  ): Promise<ImageGenerationResult> {
    const width = options?.width ?? 1080;
    const height = options?.height ?? 1920;

    // Derive a consistent color from the prompt string
    const hash = simpleHash(prompt);
    const hue = hash % 360;
    const bgColor = `hsl(${hue}, 40%, 12%)`;
    const accentColor = `hsl(${(hue + 180) % 360}, 80%, 55%)`;

    // Truncate prompt for display
    const displayText = prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt;

    // Word-wrap the display text into lines of ~25 chars
    const lines = wordWrap(displayText, 25);

    const textElements = lines
      .map(
        (line, i) =>
          `<text x="${width / 2}" y="${height / 2 + i * 36 - ((lines.length - 1) * 18)}" text-anchor="middle" fill="white" font-family="sans-serif" font-size="28" opacity="0.8">${escapeXml(line)}</text>`,
      )
      .join('\n    ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor}"/>
      <stop offset="100%" style="stop-color:black"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${width / 2}" cy="${height / 2 - 80}" r="40" fill="none" stroke="${accentColor}" stroke-width="3" opacity="0.6"/>
  <polygon points="${width / 2 - 12},${height / 2 - 96} ${width / 2 - 12},${height / 2 - 64} ${width / 2 + 18},${height / 2 - 80}" fill="${accentColor}" opacity="0.6"/>
  <text x="${width / 2}" y="${height / 2 - 20}" text-anchor="middle" fill="${accentColor}" font-family="sans-serif" font-size="16" font-weight="bold" letter-spacing="3">PLACEHOLDER</text>
  ${textElements}
</svg>`;

    const dir = path.join(process.cwd(), 'uploads', 'generated-images');
    await mkdir(dir, { recursive: true });

    const filename = `placeholder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.svg`;
    const localPath = path.join(dir, filename);
    await writeFile(localPath, svg, 'utf-8');

    return {
      localPath,
      width,
      height,
      provider: this.name,
    };
  }
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function wordWrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (currentLine.length + word.length + 1 > maxChars && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
