import ffmpegPath from 'ffmpeg-static';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffprobePath = require('ffprobe-static');
import ffmpeg from 'fluent-ffmpeg';
import { FFMPEG_DEFAULTS } from '@/config/defaults';

// Set binary paths
ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfprobePath(ffprobePath.path);

/**
 * Normalize video to H.264, AAC audio, CFR 30fps, yuv420p.
 */
export async function normalizeVideo(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec(FFMPEG_DEFAULTS.videoCodec)
      .audioCodec(FFMPEG_DEFAULTS.audioCodec)
      .outputOptions([
        `-r ${FFMPEG_DEFAULTS.fps}`,
        `-pix_fmt ${FFMPEG_DEFAULTS.pixelFormat}`,
        `-preset ${FFMPEG_DEFAULTS.preset}`,
        `-crf ${FFMPEG_DEFAULTS.crf}`,
        '-vsync cfr',
        `-ar ${FFMPEG_DEFAULTS.audioSampleRate}`,
        `-b:a ${FFMPEG_DEFAULTS.audioBitrate}`,
        '-movflags +faststart',
      ])
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`normalizeVideo failed: ${err.message}`))
      )
      .save(outputPath);
  });
}

/**
 * Extract audio from video to WAV (PCM) or MP3.
 */
export async function extractAudio(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const isWav = outputPath.toLowerCase().endsWith('.wav');

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath).noVideo();

    if (isWav) {
      cmd.audioCodec('pcm_s16le').audioFrequency(16000).audioChannels(1);
    } else {
      cmd
        .audioCodec('libmp3lame')
        .audioBitrate('192k')
        .audioFrequency(FFMPEG_DEFAULTS.audioSampleRate);
    }

    cmd
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`extractAudio failed: ${err.message}`))
      )
      .save(outputPath);
  });
}

/**
 * Get detailed video info using ffprobe.
 */
export async function getVideoInfo(
  inputPath: string
): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  hasAudio: boolean;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) {
        return reject(new Error(`getVideoInfo failed: ${err.message}`));
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === 'video'
      );
      const audioStream = metadata.streams.find(
        (s) => s.codec_type === 'audio'
      );

      if (!videoStream) {
        return reject(new Error('No video stream found'));
      }

      let fps = 30;
      if (videoStream.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2) {
          fps = parseInt(parts[0], 10) / parseInt(parts[1], 10);
        } else {
          fps = parseFloat(videoStream.r_frame_rate);
        }
      }

      resolve({
        duration: metadata.format.duration ?? 0,
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        fps: Math.round(fps * 100) / 100,
        codec: videoStream.codec_name ?? 'unknown',
        hasAudio: !!audioStream,
      });
    });
  });
}

/**
 * Detect silence periods in an audio/video file using the silencedetect filter.
 */
export async function detectSilences(
  inputPath: string,
  options?: { threshold?: string; minDuration?: number }
): Promise<{ start: number; end: number }[]> {
  const threshold = options?.threshold ?? '-30dB';
  const minDuration = options?.minDuration ?? 0.5;

  return new Promise((resolve, reject) => {
    const silences: { start: number; end: number }[] = [];
    let currentStart: number | null = null;
    let stderrData = '';

    ffmpeg(inputPath)
      .audioFilters(
        `silencedetect=noise=${threshold}:d=${minDuration}`
      )
      .outputFormat('null')
      .output(process.platform === 'win32' ? 'NUL' : '/dev/null')
      .on('stderr', (line: string) => {
        stderrData += line + '\n';
      })
      .on('end', () => {
        // Parse silence_start and silence_end from stderr
        const lines = stderrData.split('\n');
        for (const line of lines) {
          const startMatch = line.match(/silence_start:\s*([\d.]+)/);
          const endMatch = line.match(
            /silence_end:\s*([\d.]+)/
          );

          if (startMatch) {
            currentStart = parseFloat(startMatch[1]);
          }
          if (endMatch && currentStart !== null) {
            silences.push({
              start: currentStart,
              end: parseFloat(endMatch[1]),
            });
            currentStart = null;
          }
        }

        resolve(silences);
      })
      .on('error', (err: Error) => {
        // Sometimes ffmpeg returns error code but still produces output
        // Try to parse what we have
        if (stderrData.includes('silence_start')) {
          const lines = stderrData.split('\n');
          for (const line of lines) {
            const startMatch = line.match(/silence_start:\s*([\d.]+)/);
            const endMatch = line.match(
              /silence_end:\s*([\d.]+)/
            );
            if (startMatch) {
              currentStart = parseFloat(startMatch[1]);
            }
            if (endMatch && currentStart !== null) {
              silences.push({
                start: currentStart,
                end: parseFloat(endMatch[1]),
              });
              currentStart = null;
            }
          }
          resolve(silences);
        } else {
          reject(
            new Error(`detectSilences failed: ${err.message}`)
          );
        }
      })
      .run();
  });
}

/**
 * Mix voice audio with background music.
 * Supports optional ducking (lowers music volume when voice is present).
 */
export async function mixAudio(
  voicePath: string,
  musicPath: string,
  outputPath: string,
  options?: {
    musicVolume?: number;
    duckingEnabled?: boolean;
    duckAmount?: number;
  }
): Promise<void> {
  const musicVolume = options?.musicVolume ?? 0.2;
  const duckingEnabled = options?.duckingEnabled ?? true;
  const duckAmount = options?.duckAmount ?? 14;

  return new Promise((resolve, reject) => {
    const cmd = ffmpeg();

    cmd.input(voicePath);
    cmd.input(musicPath);

    if (duckingEnabled) {
      // Use sidechaincompress: voice signal controls music compression
      // This automatically lowers music when voice is present
      cmd.complexFilter([
        // Normalize voice volume
        '[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice]',
        // Adjust music base volume and format
        `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVolume}[music_vol]`,
        // Apply sidechain compression: music ducks when voice is present
        `[music_vol][voice]sidechaincompress=threshold=0.02:ratio=6:attack=200:release=1000:level_in=1:level_sc=1:mix=1:knee=${duckAmount}[ducked_music]`,
        // Mix voice and ducked music together
        '[voice][ducked_music]amix=inputs=2:duration=first:dropout_transition=2[out]',
      ]);
      cmd.outputOptions(['-map', '[out]']);
    } else {
      // Simple volume mixing without ducking
      cmd.complexFilter([
        '[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voice]',
        `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVolume}[music_vol]`,
        '[voice][music_vol]amix=inputs=2:duration=first:dropout_transition=2[out]',
      ]);
      cmd.outputOptions(['-map', '[out]']);
    }

    cmd
      .audioCodec(FFMPEG_DEFAULTS.audioCodec)
      .audioBitrate(FFMPEG_DEFAULTS.audioBitrate)
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`mixAudio failed: ${err.message}`))
      )
      .save(outputPath);
  });
}

/**
 * Normalize audio loudness using the loudnorm filter (EBU R128).
 */
export async function normalizeAudio(
  inputPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioFilters('loudnorm=I=-16:LRA=11:TP=-1.5')
      .audioCodec(FFMPEG_DEFAULTS.audioCodec)
      .audioBitrate(FFMPEG_DEFAULTS.audioBitrate)
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`normalizeAudio failed: ${err.message}`))
      )
      .save(outputPath);
  });
}

/**
 * Extract a single frame from a video as a JPEG thumbnail.
 */
export async function generateThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp?: number
): Promise<void> {
  const seekTime = timestamp ?? 1;

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(seekTime)
      .frames(1)
      .outputOptions(['-q:v', '2'])
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`generateThumbnail failed: ${err.message}`))
      )
      .save(outputPath);
  });
}

/**
 * Trim a video to only keep specified segments, concatenating them together.
 * This is used after silence removal to stitch together the non-silent parts.
 */
export async function trimVideo(
  inputPath: string,
  outputPath: string,
  segments: { start: number; end: number }[]
): Promise<void> {
  if (segments.length === 0) {
    throw new Error('trimVideo: no segments provided');
  }

  // For a single segment, use simple seek+duration
  if (segments.length === 1) {
    const seg = segments[0];
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(seg.start)
        .duration(seg.end - seg.start)
        .videoCodec('copy')
        .audioCodec('copy')
        .on('end', () => resolve())
        .on('error', (err: Error) =>
          reject(new Error(`trimVideo failed: ${err.message}`))
        )
        .save(outputPath);
    });
  }

  // For multiple segments, use the concat demuxer approach via complex filter
  // Build select/aselect filter expressions
  const videoSelects = segments
    .map((s) => `between(t\\,${s.start.toFixed(3)}\\,${s.end.toFixed(3)})`)
    .join('+');
  const audioSelects = segments
    .map((s) => `between(t\\,${s.start.toFixed(3)}\\,${s.end.toFixed(3)})`)
    .join('+');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters(`select='${videoSelects}',setpts=N/FRAME_RATE/TB`)
      .audioFilters(`aselect='${audioSelects}',asetpts=N/SR/TB`)
      .videoCodec(FFMPEG_DEFAULTS.videoCodec)
      .audioCodec(FFMPEG_DEFAULTS.audioCodec)
      .outputOptions([
        `-preset ${FFMPEG_DEFAULTS.preset}`,
        `-crf ${FFMPEG_DEFAULTS.crf}`,
        `-pix_fmt ${FFMPEG_DEFAULTS.pixelFormat}`,
        `-r ${FFMPEG_DEFAULTS.fps}`,
      ])
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(new Error(`trimVideo failed: ${err.message}`))
      )
      .save(outputPath);
  });
}

export { ffmpeg };
