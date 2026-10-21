import dialoguesData from '../data/dialogues.json';
import { CharacterVoice, DialogueDatabase, DialogueNode, DialoguePage } from '../types/dialogue';
import { gameState } from './gameState';

export class DialogueManager {
  private static database: DialogueDatabase = dialoguesData as unknown as DialogueDatabase;

  public static getRawDialogue(id: string): DialogueNode | undefined {
    return this.database[id];
  }

  /**
   * Resolves a dialogue ID considering game state flags and conditional redirects
   */
  public static resolveDialogue(id: string): {
    id: string;
    speaker?: string;
    pages: DialoguePage[];
    onComplete?: DialogueNode['onComplete'];
  } | null {
    let node = this.database[id];
    if (!node) {
      return null;
    }

    // Check if there is a condition flag set in gameState
    if (node.conditionFlag && gameState.getFlag(node.conditionFlag) && node.altDialogueId) {
      const alt = this.database[node.altDialogueId];
      if (alt) {
        node = alt;
      }
    }

    const defaultVoice: CharacterVoice = node.defaultVoice || 'monster';
    const defaultPortrait = node.defaultPortrait || null;

    const normalizedPages: DialoguePage[] = node.pages.map((p) => {
      if (typeof p === 'string') {
        return {
          text: this.formatUndertaleText(p),
          portrait: defaultPortrait,
          voice: defaultVoice,
        };
      }
      return {
        text: this.formatUndertaleText(p.text),
        portrait: p.portrait !== undefined ? p.portrait : defaultPortrait,
        voice: p.voice || defaultVoice,
        speed: p.speed,
      };
    });

    return {
      id: node.id,
      speaker: node.speaker,
      pages: normalizedPages,
      onComplete: node.onComplete,
    };
  }

  /**
   * Ensures classic Undertale asterisk prefix convention
   */
  public static formatUndertaleText(text: string): string {
    const trimmed = text.trim();
    if (!trimmed.startsWith('*') && !trimmed.startsWith('(')) {
      return `* ${trimmed}`;
    }
    return trimmed;
  }
}
