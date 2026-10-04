import { StyleSheet, Text, type TextProps } from 'react-native';

import type { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant =
  | 'largeTitle'
  | 'title'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

type Tone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'tint'
  | 'good'
  | 'critical'
  | 'warning'
  | 'onTint';

export interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  weight?: '400' | '500' | '600' | '700' | '800';
  align?: 'left' | 'center' | 'right';
}

function toneColor(colors: ThemeColors, tone: Tone): string {
  switch (tone) {
    case 'primary':
      return colors.text;
    case 'secondary':
      return colors.textSecondary;
    case 'muted':
      return colors.textMuted;
    case 'tint':
      return colors.tint;
    case 'good':
      return colors.goodText;
    case 'critical':
      return colors.criticalText;
    case 'warning':
      return colors.warningText;
    case 'onTint':
      return colors.onTint;
  }
}

/** iOS-style text with dynamic color tokens. */
export function AppText({
  variant = 'body',
  tone = 'primary',
  weight,
  align,
  style,
  ...rest
}: AppTextProps) {
  const colors = useTheme();
  return (
    <Text
      style={[
        styles[variant],
        { color: toneColor(colors, tone) },
        weight && { fontWeight: weight },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.37 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, letterSpacing: -0.32 },
  subhead: { fontSize: 15, lineHeight: 20, letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16 },
});
