import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';

import { CATEGORIES } from '@/constants/categories';
import { useTheme } from '@/hooks/use-theme';
import { DAILY_CATEGORY_CAP } from '@/lib/scoring';
import type { CategoryId } from '@/lib/types';
import { AppText } from './app-text';

export function CategoryIcon({ categoryId, size = 44 }: { categoryId: CategoryId; size?: number }) {
  const colors = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.27),
        borderCurve: 'continuous',
        backgroundColor: colors.category[categoryId],
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <MaterialCommunityIcons name={CATEGORIES[categoryId].icon} size={Math.round(size * 0.56)} color="#FFFFFF" />
    </View>
  );
}

/** Today's points in a category as five pips plus a text label (never color alone). */
export function PointsPips({ categoryId, points, large = false }: { categoryId: CategoryId; points: number; large?: boolean }) {
  const colors = useTheme();
  const width = large ? 22 : 14;
  const height = large ? 8 : 6;
  return (
    <View
      style={styles.pips}
      accessible
      accessibilityLabel={`${points} of ${DAILY_CATEGORY_CAP} points today`}>
      {Array.from({ length: DAILY_CATEGORY_CAP }, (_, index) => (
        <View
          key={index}
          style={{
            width,
            height,
            borderRadius: height / 2,
            backgroundColor: index < points ? colors.category[categoryId] : colors.surfaceAlt,
          }}
        />
      ))}
      <AppText variant={large ? 'subhead' : 'footnote'} tone="secondary" weight="600" style={styles.pipsLabel}>
        {points}/{DAILY_CATEGORY_CAP} pts
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pipsLabel: {
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
});
