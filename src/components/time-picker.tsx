import DateTimePicker from '@react-native-community/datetimepicker';

import { useIsDark } from '@/hooks/use-theme';

export interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
}

/** The native iOS time wheel (a dialog on Android). */
export function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const isDark = useIsDark();
  return (
    <DateTimePicker
      value={new Date(2000, 0, 1, hour, minute)}
      mode="time"
      display="spinner"
      minuteInterval={5}
      themeVariant={isDark ? 'dark' : 'light'}
      onValueChange={(_event, date) => onChange(date.getHours(), date.getMinutes())}
    />
  );
}
