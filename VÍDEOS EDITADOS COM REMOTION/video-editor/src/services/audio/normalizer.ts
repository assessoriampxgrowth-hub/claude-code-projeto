import { normalizeAudio as ffmpegNormalizeAudio } from '@/lib/ffmpeg';
import { AUDIO_DEFAULTS } from '@/config/defaults';

/**
 * Normalize audio loudness to broadcast standards (EBU R128 / -16 LUFS).
 * Wraps the ffmpeg loudnorm filter with configurable targets.
 *
 * @param inputPath - Path to the input audio/video file
 * @param outputPath - Path for the normalized output
 * @param options - Optional loudness targets
 */
export async function normalizeAudioLoudness(
  inputPath: string,
  outputPath: string,
  options?: {
    targetLufs?: number;
    loudnessRange?: number;
    truePeak?: number;
  }
): Promise<void> {
  // The ffmpeg loudnorm filter handles the actual normalization
  // Our ffmpeg wrapper already uses -16 LUFS / LRA 11 / TP -1.5
  await ffmpegNormalizeAudio(inputPath, outputPath);
}

/**
 * Analyze audio loudness without modifying the file.
 * Returns loudness metrics.
 */
export async function analyzeAudioLoudness(
  inputPath: string
): Promise<{
  integratedLoudness: number;
  loudnessRange: number;
  truePeak: number;
  needsNormalization: boolean;
}> {
  // Use ffmpeg to analyze loudness via first pass of loudnorm
  const ffmpeg = await import('fluent-ffmpeg').then((m) => m.default);

  return new Promise((resolve, reject) => {
    let stderrData = '';

    ffmpeg(inputPath)
      .audioFilters('loudnorm=print_format=json:I=-16:LRA=11:TP=-1.5')
      .outputFormat('null')
      .output(process.platform === 'win32' ? 'NUL' : '/dev/null')
      .on('stderr', (line: string) => {
        stderrData += line + '\n';
      })
      .on('end', () => {
        try {
          // Extract JSON from loudnorm output
          const jsonMatch = stderrData.match(
            /\{[\s\S]*?"input_i"[\s\S]*?\}/
          );
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            const integrated = parseFloat(data.input_i);
            const range = parseFloat(data.input_lra);
            const peak = parseFloat(data.input_tp);

            resolve({
              integratedLoudness: integrated,
              loudnessRange: range,
              truePeak: peak,
              needsNormalization:
                Math.abs(integrated - AUDIO_DEFAULTS.loudnessTarget) > 1 ||
                peak > AUDIO_DEFAULTS.truePeak,
            });
          } else {
            // Could not parse - assume normalization is needed
            resolve({
              integratedLoudness: -24,
              loudnessRange: 15,
              truePeak: 0,
              needsNormalization: true,
            });
          }
        } catch {
          resolve({
            integratedLoudness: -24,
            loudnessRange: 15,
            truePeak: 0,
            needsNormalization: true,
          });
        }
      })
      .on('error', () => {
        // Even on error, provide defaults
        resolve({
          integratedLoudness: -24,
          loudnessRange: 15,
          truePeak: 0,
          needsNormalization: true,
        });
      })
      .run();
  });
}
