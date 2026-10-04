import { useColorScheme } from 'react-native';

import { Colors, type ThemeColors } from '@/constants/theme';

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

export function useTheme(): ThemeColors {
  return useIsDark() ? Colors.dark : Colors.light;
}
