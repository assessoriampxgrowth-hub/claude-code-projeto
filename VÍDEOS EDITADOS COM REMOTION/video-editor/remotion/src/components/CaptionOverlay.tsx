import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import type { CaptionBlock, CaptionStyleProps } from '../types';

interface Props {
  captions: CaptionBlock[];
  style: CaptionStyleProps;
}

export const CaptionOverlay: React.FC<Props> = ({ captions, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;

  // Find the active caption block
  const activeBlock = captions.find(
    (b) => currentTime >= b.startTime && currentTime < b.endTime
  );

  if (!activeBlock) return null;

  const blockDuration = activeBlock.endTime - activeBlock.startTime;
  const blockProgress =
    (currentTime - activeBlock.startTime) / blockDuration;

  // Position
  const positionStyle = getPositionStyle(style.position);

  // Animation
  const animationStyle = getAnimationStyle(
    style.animation,
    blockProgress,
    frame,
    fps,
    activeBlock.startTime
  );

  // Text shadow / outline
  const textShadow = buildTextShadow(style);

  return (
    <AbsoluteFill style={{ ...positionStyle, pointerEvents: 'none' }}>
      <div
        style={{
          ...animationStyle,
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
          padding: '12px 24px',
          maxWidth: '90%',
          ...(style.backgroundColor
            ? {
                backgroundColor: style.backgroundColor,
                borderRadius: '12px',
              }
            : {}),
        }}
      >
        {activeBlock.words.map((word, i) => {
          const wordProgress = getWordProgress(
            currentTime,
            word.start,
            word.end
          );
          const isActive = currentTime >= word.start;

          return (
            <span
              key={`${activeBlock.id}-${i}`}
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
                transform: word.isHighlight && isActive
                  ? `scale(${interpolate(wordProgress, [0, 0.5, 1], [1, 1.15, 1])})`
                  : undefined,
                transition: 'color 0.1s',
                lineHeight: 1.2,
                ...(style.outlineColor && style.outlineWidth
                  ? {
                      WebkitTextStroke: `${style.outlineWidth}px ${style.outlineColor}`,
                      paintOrder: 'stroke fill',
                    }
                  : {}),
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

function getPositionStyle(
  position: 'top' | 'center' | 'bottom'
): React.CSSProperties {
  switch (position) {
    case 'top':
      return {
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '15%',
      };
    case 'center':
      return {
        justifyContent: 'center',
        alignItems: 'center',
      };
    case 'bottom':
      return {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: '18%',
      };
  }
}

function getAnimationStyle(
  animation: string,
  progress: number,
  frame: number,
  fps: number,
  blockStart: number
): React.CSSProperties {
  const enterFrame = blockStart * fps;
  const framesIn = frame - enterFrame;
  const enterDuration = 8; // frames

  switch (animation) {
    case 'fade': {
      const opacity = interpolate(framesIn, [0, enterDuration], [0, 1], {
        extrapolateRight: 'clamp',
      });
      return { opacity };
    }
    case 'pop': {
      const scale = interpolate(
        framesIn,
        [0, enterDuration * 0.6, enterDuration],
        [0.5, 1.1, 1],
        { extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) }
      );
      const opacity = interpolate(framesIn, [0, enterDuration * 0.4], [0, 1], {
        extrapolateRight: 'clamp',
      });
      return { transform: `scale(${scale})`, opacity };
    }
    case 'slide': {
      const translateY = interpolate(
        framesIn,
        [0, enterDuration],
        [30, 0],
        { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
      );
      const opacity = interpolate(framesIn, [0, enterDuration * 0.5], [0, 1], {
        extrapolateRight: 'clamp',
      });
      return { transform: `translateY(${translateY}px)`, opacity };
    }
    case 'typewriter': {
      const opacity = interpolate(framesIn, [0, 3], [0, 1], {
        extrapolateRight: 'clamp',
      });
      return { opacity };
    }
    default:
      return {};
  }
}

function getWordProgress(
  currentTime: number,
  wordStart: number,
  wordEnd: number
): number {
  if (currentTime < wordStart) return 0;
  if (currentTime > wordEnd) return 1;
  return (currentTime - wordStart) / (wordEnd - wordStart);
}

function buildTextShadow(style: CaptionStyleProps): string {
  const shadows: string[] = [];
  if (style.shadowColor && style.shadowBlur) {
    shadows.push(`0 2px ${style.shadowBlur}px ${style.shadowColor}`);
  }
  // Always add a basic shadow for readability
  if (shadows.length === 0) {
    shadows.push('0 2px 8px rgba(0,0,0,0.8)');
  }
  return shadows.join(', ');
}
