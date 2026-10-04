import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { useAppStore } from '@/state/store';

type Feedback = 'tap' | 'select' | 'success' | 'warning';

function play(feedback: Feedback): void {
  if (Platform.OS === 'web') return;
  const run = async () => {
    switch (feedback) {
      case 'tap':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'select':
        return Haptics.selectionAsync();
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  run().catch(() => {
    // Haptics are a nicety; ignore devices without a Taptic Engine.
  });
}

/** Haptic feedback that respects the user's setting. */
export function useHaptics(): (feedback: Feedback) => void {
  const enabled = useAppStore((state) => state.settings.haptics);
  return (feedback) => {
    if (enabled) play(feedback);
  };
}
