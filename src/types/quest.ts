export type QuestCategory = 'main' | 'side' | 'exploration' | 'secret';

export type QuestStatus = 'active' | 'completed' | 'locked';

export interface QuestObjective {
  id: string;
  description: string;
  isCompleted: boolean;
  currentCount?: number;
  targetCount?: number;
}

export interface Quest {
  id: string;
  title: string;
  category: QuestCategory;
  chapter: string;
  status: QuestStatus;
  flavorText: string;
  summary: string;
  objectives: QuestObjective[];
  rewardText: string;
  progressPercent: number;
}

export interface QuestNotification {
  questId: string;
  questTitle: string;
  objectiveText?: string;
  isCompletion: boolean;
  timestamp: number;
}
