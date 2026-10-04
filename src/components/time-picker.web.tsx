import { useTheme } from '@/hooks/use-theme';
import type { TimePickerProps } from './time-picker';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** The browser's time input, for the web preview. */
export function TimePicker({ hour, minute, onChange }: TimePickerProps) {
  const colors = useTheme();
  return (
    <input
      type="time"
      aria-label="Reminder time"
      value={`${pad(hour)}:${pad(minute)}`}
      onChange={(event) => {
        const [nextHour, nextMinute] = event.target.value.split(':').map(Number);
        if (Number.isFinite(nextHour) && Number.isFinite(nextMinute)) onChange(nextHour, nextMinute);
      }}
      style={{
        alignSelf: 'center',
        fontSize: 28,
        padding: '10px 16px',
        borderRadius: 12,
        border: `1px solid ${colors.separator}`,
        background: colors.surfaceAlt,
        color: colors.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        margin: '12px auto',
        display: 'block',
      }}
    />
  );
}
