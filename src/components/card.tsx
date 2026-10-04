import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

export function Card({ style, ...rest }: ViewProps) {
  const colors = useTheme();
  return <View style={[styles.card, { backgroundColor: colors.surface }, style]} {...rest} />;
}

/** Small uppercase label above a grouped section, like iOS Settings. */
export function SectionLabel({ children, action }: { children: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionLabel}>
      <AppText variant="footnote" tone="secondary" style={styles.sectionText}>
        {children.toUpperCase()}
      </AppText>
      {action}
    </View>
  );
}

export function Separator({ inset = Spacing.lg }: { inset?: number }) {
  const colors = useTheme();
  return <View style={[styles.separator, { marginLeft: inset, backgroundColor: colors.separator }]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  sectionText: {
    letterSpacing: 0.4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
});
