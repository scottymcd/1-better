import type { ComponentProps } from 'react';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { CATEGORY_IDS, type CategoryId } from '@/lib/types';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface CategoryInfo {
  id: CategoryId;
  title: string;
  shortTitle: string;
  description: string;
  icon: IconName;
  /** Starter ideas shown when the category is empty. */
  suggestions: string[];
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  health: {
    id: 'health',
    title: 'Health & Wellbeing',
    shortTitle: 'Health',
    description: 'Body, mind, sleep and energy',
    icon: 'heart-pulse',
    suggestions: [
      'Move for 30 minutes',
      'Drink 8 glasses of water',
      'Sleep 7+ hours',
      'Meditate for 10 minutes',
      'Eat a vegetable with every meal',
      'No screens the hour before bed',
    ],
  },
  finance: {
    id: 'finance',
    title: 'Financial & Career Stability',
    shortTitle: 'Finance & Career',
    description: 'Money, work and growth',
    icon: 'briefcase-variant',
    suggestions: [
      'Log every purchase',
      'No impulse buys',
      'Put $10 into savings',
      'Learn a career skill for 20 minutes',
      'Reach out to someone in my network',
      'Plan tomorrow’s top 3 tasks',
    ],
  },
  relationships: {
    id: 'relationships',
    title: 'Relationship & Home Life',
    shortTitle: 'Relationships & Home',
    description: 'People you love and the place you live',
    icon: 'home-heart',
    suggestions: [
      'Call or text someone I love',
      'Tidy up for 10 minutes',
      'Phone-free dinner',
      'Say thank you to someone',
      'Cook a meal at home',
      'Plan a date or family activity',
    ],
  },
};

export const CATEGORY_LIST = CATEGORY_IDS.map((id) => CATEGORIES[id]);

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}
