import { Platform } from 'react-native';

/**
 * Color tokens. Category hues are the first three slots of a palette that was
 * checked for color-vision-deficiency separation in both modes; status colors
 * (yes/no, warnings) are kept separate from them and always paired with an
 * icon or label.
 */
const light = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F5',
  separator: '#E3E3E8',
  text: '#0B0B0B',
  textSecondary: '#52514E',
  textMuted: '#7A7974',
  tint: '#4A3AA7',
  tintSoft: 'rgba(74, 58, 167, 0.10)',
  onTint: '#FFFFFF',
  good: '#0CA30C',
  goodText: '#006300',
  goodSoft: 'rgba(12, 163, 12, 0.12)',
  critical: '#D03B3B',
  criticalText: '#B42318',
  criticalSoft: 'rgba(208, 59, 59, 0.12)',
  warning: '#FAB219',
  warningText: '#8A5A00',
  warningSoft: 'rgba(250, 178, 25, 0.16)',
  gridline: '#E1E0D9',
  baseline: '#C3C2B7',
  /** Bars that give context next to the one that's emphasized. */
  deemphasis: '#BDBCB6',
  scrim: 'rgba(0, 0, 0, 0.45)',
  category: {
    health: '#1BAF7A',
    finance: '#2A78D6',
    relationships: '#EB6834',
  },
  /** Heatmap: a neutral "tracked, zero points" cell, then a blue ramp from low to high. */
  heatZero: '#E9E9EE',
  heat: ['#86B6EF', '#5598E7', '#2A78D6', '#1C5CAB', '#104281'],
};

const dark: typeof light = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceAlt: '#2C2C2E',
  separator: '#38383A',
  text: '#FFFFFF',
  textSecondary: '#C3C2B7',
  textMuted: '#9A9993',
  tint: '#9085E9',
  tintSoft: 'rgba(144, 133, 233, 0.18)',
  onTint: '#0B0B0B',
  good: '#0CA30C',
  goodText: '#3CCB3C',
  goodSoft: 'rgba(12, 163, 12, 0.22)',
  critical: '#D03B3B',
  criticalText: '#F07A7A',
  criticalSoft: 'rgba(208, 59, 59, 0.24)',
  warning: '#FAB219',
  warningText: '#FAB219',
  warningSoft: 'rgba(250, 178, 25, 0.18)',
  gridline: '#2C2C2A',
  baseline: '#48484A',
  deemphasis: '#5A5A5F',
  scrim: 'rgba(0, 0, 0, 0.6)',
  category: {
    health: '#199E70',
    finance: '#3987E5',
    relationships: '#D95926',
  },
  heatZero: '#2C2C2E',
  heat: ['#184F95', '#256ABF', '#3987E5', '#6DA7EC', '#B7D3F6'],
};

export const Colors = { light, dark };

export type ThemeColors = typeof light;

/** The welcome screen and celebration always use this dark "charging" look. */
export const Brand = {
  night: '#0B0A1F',
  nightAlt: '#1D1645',
  glow: '#3CEB6E',
  bolt: '#FFFFFF',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.72)',
  accent: '#B7AEFF',
};

/** Battery fill colors by charge level. */
export function batteryColors(level: number): [string, string] {
  if (level < 20) return ['#F05A5A', '#D03B3B'];
  if (level < 50) return ['#FFC94D', '#F2A100'];
  return ['#5BF08A', '#0CA30C'];
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Fonts = {
  /** SF Pro Rounded on iOS; used for the battery read-out. */
  rounded: Platform.select({ ios: 'ui-rounded', web: 'ui-rounded, system-ui, sans-serif', default: undefined }),
};

export const MaxContentWidth = 640;
