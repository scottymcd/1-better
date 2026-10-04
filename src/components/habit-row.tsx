import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useHaptics } from '@/hooks/use-haptics';
import { useTheme } from '@/hooks/use-theme';
import type { EntryStatus } from '@/lib/types';
import { AppText } from './app-text';

interface HabitRowProps {
  name: string;
  status?: EntryStatus;
  note?: string;
  streak: number;
  highlight?: boolean;
  onChange: (status: EntryStatus | undefined) => void;
  onOpen: () => void;
  onAddDetails: () => void;
}

export function HabitRow({
  name,
  status,
  note,
  streak,
  highlight = false,
  onChange,
  onOpen,
  onAddDetails,
}: HabitRowProps) {
  const colors = useTheme();
  const [flash] = useState(() => new Animated.Value(highlight ? 1 : 0));

  useEffect(() => {
    // Let the fade run to completion even if another habit takes the highlight.
    if (highlight) {
      flash.setValue(1);
      Animated.timing(flash, { toValue: 0, duration: 2400, delay: 600, useNativeDriver: true }).start();
    }
  }, [flash, highlight]);

  return (
    <View style={styles.row}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.tintSoft, opacity: flash }]}
      />
      <Pressable
        onPress={onOpen}
        style={styles.info}
        accessibilityRole="button"
        accessibilityLabel={`${name}. Open details`}>
        <AppText variant="body">{name}</AppText>
        <View style={styles.meta}>
          {streak >= 2 && (
            <View style={styles.metaItem}>
              <Ionicons name="flame" size={13} color={colors.category.relationships} />
              <AppText variant="footnote" tone="secondary" weight="600">
                {streak}-day streak
              </AppText>
            </View>
          )}
          {note ? (
            <View style={[styles.metaItem, styles.shrink]}>
              <Ionicons name="document-text" size={13} color={colors.textSecondary} />
              <AppText variant="footnote" tone="secondary" numberOfLines={1} style={styles.shrink}>
                {note}
              </AppText>
            </View>
          ) : status ? (
            <Pressable onPress={onAddDetails} hitSlop={8} accessibilityRole="button">
              <AppText variant="footnote" tone="tint" weight="600">
                + Add details
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="footnote" tone="secondary">
              Did you do this today?
            </AppText>
          )}
        </View>
      </Pressable>
      <View style={styles.choices}>
        <Choice kind="no" selected={status === 'no'} onPress={() => onChange(status === 'no' ? undefined : 'no')} />
        <Choice kind="yes" selected={status === 'yes'} onPress={() => onChange(status === 'yes' ? undefined : 'yes')} />
      </View>
    </View>
  );
}

function Choice({ kind, selected, onPress }: { kind: EntryStatus; selected: boolean; onPress: () => void }) {
  const colors = useTheme();
  const haptic = useHaptics();
  const isYes = kind === 'yes';
  const activeColor = isYes ? colors.good : colors.critical;
  return (
    <Pressable
      onPress={() => {
        haptic(isYes && !selected ? 'success' : 'select');
        onPress();
      }}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={isYes ? 'Yes, goal met' : 'No, goal not met'}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? activeColor : colors.surfaceAlt,
          borderColor: selected ? activeColor : colors.separator,
        },
        pressed && { transform: [{ scale: 0.94 }] },
      ]}>
      <Ionicons name={isYes ? 'checkmark' : 'close'} size={16} color={selected ? '#FFFFFF' : colors.textSecondary} />
      <AppText variant="subhead" weight="600" style={{ color: selected ? '#FFFFFF' : colors.textSecondary }}>
        {isYes ? 'Yes' : 'No'}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    minHeight: 64,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shrink: {
    flexShrink: 1,
  },
  choices: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: 62,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
