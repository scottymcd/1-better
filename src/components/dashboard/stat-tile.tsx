import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from '../app-text';
import { Card } from '../card';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Label · value · optional detail, per the stat-tile contract. */
export function StatTile({ icon, label, value, detail }: { icon: IconName; label: string; value: string; detail?: string }) {
  const colors = useTheme();
  return (
    <Card style={styles.tile}>
      <View style={styles.label}>
        <Ionicons name={icon} size={14} color={colors.textSecondary} />
        <AppText variant="footnote" tone="secondary" numberOfLines={1} style={styles.shrink}>
          {label}
        </AppText>
      </View>
      <AppText variant="title2">{value}</AppText>
      {detail ? (
        <AppText variant="caption" tone="muted" numberOfLines={2}>
          {detail}
        </AppText>
      ) : null}
    </Card>
  );
}

/** A meter: the fill carries the value; the track is a lighter step of the same hue. */
export function MeterBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const fraction = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2, backgroundColor: `${color}2E` }]}>
      <View
        style={{
          width: `${fraction * 100}%`,
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          minWidth: fraction > 0 ? height : 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexBasis: '30%',
    flexGrow: 1,
    padding: Spacing.md,
    gap: 2,
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shrink: {
    flexShrink: 1,
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
});
