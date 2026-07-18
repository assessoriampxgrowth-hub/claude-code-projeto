import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { CaptionBlock, CaptionStyleProps, CaptionWord } from './types';

interface Props {
  captions: CaptionBlock[];
  style: CaptionStyleProps;
}

export const CaptionOverlay: React.FC<Props> = ({ captions, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  const activeBlock = captions.find(
    (b) => currentTime >= b.startTime && currentTime < b.endTime
  );
  if (!activeBlock) return null;

  const blockStart = activeBlock.startTime;
  const enterFrame = blockStart * fps;
  const framesIn = frame - enterFrame;
  const enterDuration = 8;
  const blockDuration = activeBlock.endTime - activeBlock.startTime;

  const positionStyle = getPositionStyle(style.position, style.positionYPercent);

  // Route to the correct renderer
  const renderer = style.renderer || 'default';

  switch (renderer) {
    case 'karaoke':
      return (
        <KaraokeRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
        />
      );
    case 'neon':
      return (
        <NeonRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
          frame={frame}
        />
      );
    case 'shadow3d':
      return (
        <Shadow3DRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
        />
      );
    case 'gradient':
      return (
        <GradientRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
          frame={frame}
        />
      );
    case 'bounce':
      return (
        <BounceRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
        />
      );
    case 'wave':
      return (
        <WaveRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          frame={frame}
        />
      );
    case 'glass':
      return (
        <GlassRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
        />
      );
    case 'spotlight':
      return (
        <SpotlightRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
        />
      );
    case 'outline-bold':
      return (
        <OutlineBoldRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
        />
      );
    default:
      return (
        <DefaultRenderer
          block={activeBlock}
          style={style}
          currentTime={currentTime}
          positionStyle={positionStyle}
          framesIn={framesIn}
          enterDuration={enterDuration}
        />
      );
  }
};

// ═══════════════════════════════════════════
// DEFAULT RENDERER (original behavior)
// ═══════════════════════════════════════════

interface RendererProps {
  block: CaptionBlock;
  style: CaptionStyleProps;
  currentTime: number;
  positionStyle: React.CSSProperties;
  framesIn?: number;
  enterDuration?: number;
  frame?: number;
}

const DefaultRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8,
}) => {
  const animStyle = getAnimationStyle(style.animation, framesIn, enterDuration);
  const textShadow = buildTextShadow(style);

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...animStyle, ...containerStyle(style) }}>
        {block.words.map((word, i) => (
          <WordSpan
            key={`${block.id}-${i}`}
            word={word}
            style={style}
            currentTime={currentTime}
            textShadow={textShadow}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// KARAOKE — word-by-word color fill
// ═══════════════════════════════════════════

const KaraokeRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8,
}) => {
  const fadeIn = interpolate(framesIn, [0, enterDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...containerStyle(style), opacity: fadeIn }}>
        {block.words.map((word, i) => {
          const wordProgress = getWordProgress(currentTime, word.start, word.end);
          const fillWidth = wordProgress * 100;
          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                position: 'relative',
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color: `${style.color}55`,
                lineHeight: 1.3,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {/* Filled overlay */}
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  color: word.isHighlight ? style.highlightColor : style.color,
                  clipPath: `inset(0 ${100 - fillWidth}% 0 0)`,
                  fontWeight: style.fontWeight,
                }}
              >
                {word.word}
              </span>
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// NEON — glowing text with pulsing effect
// ═══════════════════════════════════════════

const NeonRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8, frame = 0,
}) => {
  const fadeIn = interpolate(framesIn, [0, enterDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const pulse = Math.sin(frame * 0.15) * 0.3 + 1;
  const glowColor = style.glowColor || style.highlightColor;
  const intensity = (style.glowIntensity || 1) * pulse;

  const neonShadow = [
    `0 0 ${5 * intensity}px ${glowColor}`,
    `0 0 ${10 * intensity}px ${glowColor}`,
    `0 0 ${20 * intensity}px ${glowColor}`,
    `0 0 ${40 * intensity}px ${glowColor}88`,
  ].join(', ');

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...containerStyle(style), opacity: fadeIn }}>
        {block.words.map((word, i) => {
          const isActive = currentTime >= word.start;
          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color: isActive ? style.color : `${style.color}44`,
                textShadow: isActive ? neonShadow : 'none',
                lineHeight: 1.3,
                transition: 'color 0.1s',
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// SHADOW 3D — layered text shadows for depth
// ═══════════════════════════════════════════

const Shadow3DRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8,
}) => {
  const fadeIn = interpolate(framesIn, [0, enterDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const layers = 6;
  const shadow3d = Array.from({ length: layers }, (_, i) => {
    const offset = (i + 1) * 2;
    const opacity = 1 - i / layers;
    return `${offset}px ${offset}px 0 rgba(0,0,0,${opacity * 0.4})`;
  }).join(', ');

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...containerStyle(style), opacity: fadeIn }}>
        {block.words.map((word, i) => {
          const isActive = currentTime >= word.start;
          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: 900,
                fontSize: style.fontSize,
                color: word.isHighlight
                  ? style.highlightColor
                  : isActive
                    ? style.color
                    : `${style.color}66`,
                textShadow: shadow3d,
                lineHeight: 1.3,
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// GRADIENT — animated gradient text
// ═══════════════════════════════════════════

const GradientRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8, frame = 0,
}) => {
  const fadeIn = interpolate(framesIn, [0, enterDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const colors = style.gradientColors || ['#FFB800', '#FF6B00', '#FF0080'];
  const shift = frame * 2;
  const gradient = `linear-gradient(${90 + shift}deg, ${colors.join(', ')})`;

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...containerStyle(style), opacity: fadeIn }}>
        <span
          style={{
            fontFamily: style.fontFamily,
            fontWeight: style.fontWeight,
            fontSize: style.fontSize,
            background: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.3,
            textShadow: '0 4px 12px rgba(0,0,0,0.5)',
            filter: `drop-shadow(0 2px 8px rgba(0,0,0,0.6))`,
          }}
        >
          {block.words.map((w) => w.word).join(' ')}
        </span>
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// BOUNCE — per-word spring entrance
// ═══════════════════════════════════════════

const BounceRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0,
}) => {
  const { fps } = useVideoConfig();
  const textShadow = buildTextShadow(style);

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={containerStyle(style)}>
        {block.words.map((word, i) => {
          const wordFrame = (word.start - block.startTime) * fps;
          const localFrames = framesIn - wordFrame;
          const delayedFrames = Math.max(0, localFrames);

          const translateY = interpolate(
            delayedFrames,
            [0, 4, 8, 12],
            [40, -8, 3, 0],
            { extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) }
          );
          const opacity = interpolate(delayedFrames, [0, 4], [0, 1], {
            extrapolateRight: 'clamp',
          });
          const scale = interpolate(
            delayedFrames,
            [0, 6, 10],
            [0.3, 1.1, 1],
            { extrapolateRight: 'clamp' }
          );

          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color: word.isHighlight ? style.highlightColor : style.color,
                textShadow,
                lineHeight: 1.3,
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity,
                display: 'inline-block',
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// WAVE — sinusoidal per-character motion
// ═══════════════════════════════════════════

const WaveRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, frame = 0,
}) => {
  const text = block.words.map((w) => w.word).join(' ');
  const textShadow = buildTextShadow(style);

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={containerStyle(style)}>
        {text.split('').map((char, i) => {
          const yOffset = Math.sin((frame + i * 4) * 0.2) * 6;
          return (
            <span
              key={`${block.id}-char-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color: style.color,
                textShadow,
                transform: `translateY(${yOffset}px)`,
                display: 'inline-block',
                lineHeight: 1.3,
                whiteSpace: char === ' ' ? 'pre' : undefined,
              }}
            >
              {char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// GLASS — frosted glass background
// ═══════════════════════════════════════════

const GlassRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8,
}) => {
  const fadeIn = interpolate(framesIn, [0, enterDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const scaleIn = interpolate(framesIn, [0, enterDuration], [0.95, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div
        style={{
          opacity: fadeIn,
          transform: `scale(${scaleIn})`,
          backdropFilter: 'blur(16px)',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '16px',
          padding: '16px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: '6px',
          maxWidth: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        {block.words.map((word, i) => {
          const isActive = currentTime >= word.start;
          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color: word.isHighlight
                  ? style.highlightColor
                  : isActive
                    ? style.color
                    : `${style.color}88`,
                lineHeight: 1.3,
                textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// SPOTLIGHT — dims all, highlights active word
// ═══════════════════════════════════════════

const SpotlightRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8,
}) => {
  const fadeIn = interpolate(framesIn, [0, enterDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...containerStyle(style), opacity: fadeIn }}>
        {block.words.map((word, i) => {
          const isActive =
            currentTime >= word.start && currentTime < word.end;
          const isPast = currentTime >= word.end;
          const isFuture = currentTime < word.start;

          let color = style.color;
          let scale = 1;
          let glow = 'none';

          if (isActive) {
            color = word.isHighlight ? style.highlightColor : '#FFFFFF';
            scale = 1.15;
            glow = `0 0 20px ${style.highlightColor}88, 0 0 40px ${style.highlightColor}44`;
          } else if (isFuture) {
            color = `${style.color}33`;
          } else if (isPast) {
            color = `${style.color}88`;
          }

          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: style.fontWeight,
                fontSize: style.fontSize,
                color,
                transform: `scale(${scale})`,
                textShadow: glow,
                lineHeight: 1.3,
                display: 'inline-block',
                transition: 'all 0.1s ease',
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// OUTLINE BOLD — heavy stroke with fill
// ═══════════════════════════════════════════

const OutlineBoldRenderer: React.FC<RendererProps> = ({
  block, style, currentTime, positionStyle, framesIn = 0, enterDuration = 8,
}) => {
  const animStyle = getAnimationStyle('pop', framesIn, enterDuration);

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div style={{ ...animStyle, ...containerStyle(style) }}>
        {block.words.map((word, i) => {
          const isActive = currentTime >= word.start;
          const wordProgress = getWordProgress(currentTime, word.start, word.end);
          const pulse = isActive
            ? interpolate(wordProgress, [0, 0.3, 1], [1, 1.08, 1], {
                extrapolateRight: 'clamp',
              })
            : 1;

          return (
            <span
              key={`${block.id}-${i}`}
              style={{
                fontFamily: style.fontFamily,
                fontWeight: 900,
                fontSize: style.fontSize * 1.1,
                color: word.isHighlight ? style.highlightColor : style.color,
                WebkitTextStroke: `${style.outlineWidth || 4}px ${style.outlineColor || '#000'}`,
                paintOrder: 'stroke fill',
                textShadow: '0 4px 12px rgba(0,0,0,0.7)',
                lineHeight: 1.2,
                transform: `scale(${pulse})`,
                display: 'inline-block',
                textTransform: 'uppercase',
              }}
            >
              {word.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ═══════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════

function WordSpan({
  word, style, currentTime, textShadow,
}: {
  word: CaptionWord;
  style: CaptionStyleProps;
  currentTime: number;
  textShadow: string;
}) {
  const isActive = currentTime >= word.start;
  const wordProgress = getWordProgress(currentTime, word.start, word.end);

  return (
    <span
      style={{
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        fontSize: style.fontSize,
        color: word.isHighlight
          ? style.highlightColor
          : isActive
            ? style.color
            : `${style.color}88`,
        textShadow,
        transform:
          word.isHighlight && isActive
            ? `scale(${interpolate(wordProgress, [0, 0.5, 1], [1, 1.15, 1])})`
            : undefined,
        lineHeight: 1.2,
        display: 'inline-block',
        ...(style.outlineColor && style.outlineWidth
          ? {
              WebkitTextStroke: `${style.outlineWidth}px ${style.outlineColor}`,
              paintOrder: 'stroke fill' as const,
            }
          : {}),
        ...(style.uppercase ? { textTransform: 'uppercase' as const } : {}),
      }}
    >
      {word.word}
    </span>
  );
}

function containerStyle(style: CaptionStyleProps): React.CSSProperties {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 24px',
    maxWidth: '90%',
    ...(style.backgroundColor && style.renderer !== 'glass'
      ? { backgroundColor: style.backgroundColor, borderRadius: '12px' }
      : {}),
  };
}

function getPositionStyle(
  position: 'top' | 'center' | 'bottom',
  positionYPercent?: number
): React.CSSProperties {
  // Explicit vertical position (fraction of frame height) overrides the preset
  if (positionYPercent != null) {
    return {
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: `${positionYPercent * 100}%`,
    };
  }
  switch (position) {
    case 'top':
      return { justifyContent: 'center', alignItems: 'flex-start', paddingTop: '15%' };
    case 'center':
      return { justifyContent: 'center', alignItems: 'center' };
    case 'bottom':
      return { justifyContent: 'center', alignItems: 'flex-end', paddingBottom: '18%' };
  }
}

function getAnimationStyle(
  animation: string,
  framesIn: number,
  enterDuration: number
): React.CSSProperties {
  switch (animation) {
    case 'fade': {
      const opacity = interpolate(framesIn, [0, enterDuration], [0, 1], { extrapolateRight: 'clamp' });
      return { opacity };
    }
    case 'pop': {
      const scale = interpolate(framesIn, [0, enterDuration * 0.6, enterDuration], [0.5, 1.1, 1], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.back(1.5)),
      });
      const opacity = interpolate(framesIn, [0, enterDuration * 0.4], [0, 1], { extrapolateRight: 'clamp' });
      return { transform: `scale(${scale})`, opacity };
    }
    case 'slide': {
      const translateY = interpolate(framesIn, [0, enterDuration], [30, 0], {
        extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic),
      });
      const opacity = interpolate(framesIn, [0, enterDuration * 0.5], [0, 1], { extrapolateRight: 'clamp' });
      return { transform: `translateY(${translateY}px)`, opacity };
    }
    case 'typewriter': {
      const opacity = interpolate(framesIn, [0, 3], [0, 1], { extrapolateRight: 'clamp' });
      return { opacity };
    }
    default:
      return {};
  }
}

function getWordProgress(currentTime: number, wordStart: number, wordEnd: number): number {
  if (currentTime < wordStart) return 0;
  if (currentTime > wordEnd) return 1;
  return (currentTime - wordStart) / (wordEnd - wordStart);
}

function buildTextShadow(style: CaptionStyleProps): string {
  if (style.shadowColor && style.shadowBlur) {
    return `0 2px ${style.shadowBlur}px ${style.shadowColor}`;
  }
  return '0 2px 8px rgba(0,0,0,0.8)';
}
