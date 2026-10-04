import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppText } from './app-text';

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const colors = useTheme();
  return (
    <View
      style={[styles.track, { backgroundColor: colors.surfaceAlt }]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[
              styles.segment,
              selected && [styles.selected, { backgroundColor: colors.surface }],
            ]}>
            <AppText variant="footnote" weight={selected ? '700' : '500'} tone={selected ? 'primary' : 'secondary'}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.sm + 1,
    padding: 2,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.sm - 1,
  },
  selected: {
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12)',
  },
});
