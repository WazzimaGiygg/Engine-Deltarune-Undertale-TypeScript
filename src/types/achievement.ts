export type AchievementCategory = 'boss' | 'exploration' | 'story' | 'secret' | 'special';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  secretDescription?: string;
  icon: string;
  category: AchievementCategory;
  isSecret?: boolean;
  unlocked: boolean;
  unlockedAt?: string; // ISO date string
  points: number; // Determination points (e.g. 10, 20, 50, 100)
}

export interface AchievementUnlockNotification {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  timestamp: number;
}
