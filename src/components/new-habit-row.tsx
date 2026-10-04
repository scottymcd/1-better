import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MAX_HABIT_NAME_LENGTH } from '@/state/store';
import { AppText } from './app-text';

interface NewHabitRowProps {
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Returns false if the habit couldn't be added. */
  onSubmit: (name: string) => boolean;
}

/**
 * The "+ New Habit" row, modeled on iOS Reminders: tap it, type, press return,
 * and the next blank row is ready for another habit.
 */
export function NewHabitRow({ editing, onEditingChange, onSubmit }: NewHabitRowProps) {
  const colors = useTheme();
  const [text, setText] = useState('');
  // Submit and blur can fire back to back; the ref keeps one habit from being added twice.
  const latestText = useRef('');

  const updateText = (value: string) => {
    latestText.current = value;
    setText(value);
  };

  const submit = (keepEditing: boolean) => {
    const name = latestText.current.trim();
    if (name && onSubmit(name)) updateText('');
    if (!keepEditing || !name) onEditingChange(false);
  };

  if (!editing) {
    return (
      <Pressable
        onPress={() => onEditingChange(true)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
        accessibilityRole="button">
        <Ionicons name="add-circle" size={26} color={colors.tint} />
        <AppText variant="body" tone="tint" weight="600">
          New Habit
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <View style={[styles.circle, { borderColor: colors.separator }]} />
      <TextInput
        autoFocus
        value={text}
        onChangeText={updateText}
        placeholder="What will you do every day?"
        placeholderTextColor={colors.textMuted}
        maxLength={MAX_HABIT_NAME_LENGTH}
        returnKeyType="done"
        submitBehavior="submit"
        // react-native-web only understands the older prop.
        blurOnSubmit={false}
        onSubmitEditing={() => submit(true)}
        onBlur={() => submit(false)}
        style={[styles.input, { color: colors.text }]}
        accessibilityLabel="New habit name"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    marginHorizontal: 1,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: Spacing.md,
  },
});
