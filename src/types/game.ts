export type GameMode = 'OVERWORLD' | 'BATTLE' | 'GAME_OVER' | 'VICTORY';

export type ItemType = 'heal' | 'weapon' | 'armor';

export interface GameItem {
  id: string;
  name: string;
  type: ItemType;
  value: number; // heal amount or atk/def bonus
  description: string;
  flavor: string;
}

export interface PlayerStats {
  name: string;
  lv: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  exp: number;
  expNext: number;
  gold: number;
  weapon: GameItem;
  armor: GameItem;
  inventory: GameItem[];
  kills: number;
  spares: number;
}

export interface EnemyAct {
  name: string;
  description: string;
  resultText: string;
  enemyReply: string;
  mercyGain: number;
  specialAction?: 'DEF_DOWN' | 'ATK_DOWN' | 'HEAL_PLAYER';
}

export interface EnemyData {
  id: string;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  expReward: number;
  goldReward: number;
  spriteKey: string;
  dialogueLines: string[];
  acts: EnemyAct[];
  mercyProgress: number; // 0 to 100, turns yellow when 100
  canSpare: boolean;
  introText: string;
  bulletPatterns: string[];
}

export interface DialogueNode {
  speaker: string;
  text: string;
  voicePitch?: number;
  face?: string;
}

export interface GameSaveData {
  stats: PlayerStats;
  currentRoom: string;
  playerPos: { x: number; y: number };
  flags: Record<string, boolean>;
  timestamp: number;
}
