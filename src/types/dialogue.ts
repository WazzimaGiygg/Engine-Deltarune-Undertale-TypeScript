export type CharacterVoice = 'toriel' | 'sans' | 'papyrus' | 'monster' | 'flowey' | 'frisk';

export interface DialoguePage {
  text: string;
  portrait?: string | null;
  voice?: CharacterVoice;
  speed?: number; // Typewriter speed ms per char, default 35
}

export interface DialogueNode {
  id: string;
  speaker?: string;
  defaultVoice?: CharacterVoice;
  defaultPortrait?: string | null;
  conditionFlag?: string; // If this flag is true in gameState, may redirect or alter
  pages: (string | DialoguePage)[];
  onComplete?: {
    setFlag?: string;
    clearFlag?: string;
    startBattle?: string;
    startScene?: string;
    restoreHp?: boolean;
    giveGold?: number;
    giveItem?: string;
  };
  altDialogueId?: string; // If conditionFlag is set, route to this dialogue instead
}

export type DialogueDatabase = Record<string, DialogueNode>;
