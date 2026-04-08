export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const defaultColors = [
  { bg: '#050508', accent: '#FFB800', text: '#FFFFFF' },
  { bg: '#0A0F1A', accent: '#00D4FF', text: '#FFFFFF' },
  { bg: '#0F0A1A', accent: '#B800FF', text: '#FFFFFF' },
  { bg: '#0A1A0A', accent: '#00FF88', text: '#FFFFFF' },
  { bg: '#1A0A0A', accent: '#FF4444', text: '#FFFFFF' },
];
