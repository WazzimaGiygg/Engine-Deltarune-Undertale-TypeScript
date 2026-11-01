import { EnemyAct, EnemyData } from '../types/game';

export type BattleTurnPhase =
  | 'INTRO'
  | 'PLAYER_MENU'
  | 'PLAYER_SUBMENU'
  | 'PLAYER_TARGET'
  | 'PLAYER_ACTION_RESOLVE'
  | 'ENEMY_DIALOGUE'
  | 'ENEMY_ATTACK_PREP'
  | 'ENEMY_ATTACK'
  | 'ENEMY_ATTACK_RESOLVE'
  | 'VICTORY'
  | 'GAME_OVER';

export interface TurnManagerEvents {
  onPhaseChange?: (newPhase: BattleTurnPhase, oldPhase: BattleTurnPhase) => void;
  onTurnIncrement?: (turnNumber: number) => void;
  onEnemyDialogue?: (text: string) => void;
  onEnemyAttackStart?: (pattern: string, durationMs: number) => void;
  onEnemyAttackEnd?: () => void;
  onPlayerTurnStart?: (turnNumber: number, flavorText: string) => void;
}

/**
 * BattleTurnManager: Orchestrates the robust turn-based state machine for battles,
 * toggling cleanly between the player's action phase and the enemy's bullet-hell attack phase.
 */
export class BattleTurnManager {
  private currentPhase: BattleTurnPhase = 'INTRO';
  private previousPhase: BattleTurnPhase = 'INTRO';
  private turnNumber: number = 1;
  private isTransitioning: boolean = false;
  private inputLocked: boolean = false;

  private enemyData: EnemyData;
  private events: TurnManagerEvents;
  private pendingTimerCleanups: Array<() => void> = [];

  constructor(enemyData: EnemyData, events: TurnManagerEvents = {}) {
    this.enemyData = enemyData;
    this.events = events;
  }

  public getPhase(): BattleTurnPhase {
    return this.currentPhase;
  }

  public getTurnNumber(): number {
    return this.turnNumber;
  }

  public isInputAllowed(): boolean {
    return (
      !this.inputLocked &&
      !this.isTransitioning &&
      (this.currentPhase === 'PLAYER_MENU' ||
        this.currentPhase === 'PLAYER_SUBMENU' ||
        this.currentPhase === 'PLAYER_TARGET' ||
        this.currentPhase === 'ENEMY_DIALOGUE')
    );
  }

  public isBulletHellActive(): boolean {
    return this.currentPhase === 'ENEMY_ATTACK';
  }

  public registerCleanup(cleanupFn: () => void): void {
    this.pendingTimerCleanups.push(cleanupFn);
  }

  public clearPendingCleanups(): void {
    while (this.pendingTimerCleanups.length > 0) {
      const fn = this.pendingTimerCleanups.pop();
      if (fn) {
        try {
          fn();
        } catch {
          // ignore cleanup errors on destroyed items
        }
      }
    }
  }

  /**
   * Fully cleans up and destroys turn manager listeners and state
   */
  public destroy(): void {
    this.clearPendingCleanups();
    this.events = {};
    this.inputLocked = true;
    this.isTransitioning = false;
  }

  /**
   * Transition to a new phase safely
   */
  public transitionTo(newPhase: BattleTurnPhase): boolean {
    if (this.currentPhase === newPhase) return false;

    // Terminal states cannot be transitioned out of
    if (this.currentPhase === 'VICTORY' || this.currentPhase === 'GAME_OVER') {
      return false;
    }

    const oldPhase = this.currentPhase;
    this.previousPhase = oldPhase;
    this.currentPhase = newPhase;

    // Phase-specific input lock defaults
    if (newPhase === 'PLAYER_MENU' || newPhase === 'PLAYER_SUBMENU') {
      this.inputLocked = false;
      this.isTransitioning = false;
    } else if (newPhase === 'PLAYER_TARGET') {
      this.inputLocked = false;
      this.isTransitioning = false;
    } else if (newPhase === 'ENEMY_DIALOGUE') {
      // Allows Z to skip
      this.inputLocked = false;
      this.isTransitioning = false;
    } else {
      this.inputLocked = true;
    }

    if (this.events.onPhaseChange) {
      this.events.onPhaseChange(newPhase, oldPhase);
    }

    return true;
  }

  /**
   * Starts battle from Intro to Player Turn
   */
  public startBattle(): void {
    this.turnNumber = 1;
    this.transitionTo('PLAYER_MENU');
    if (this.events.onPlayerTurnStart) {
      this.events.onPlayerTurnStart(this.turnNumber, this.enemyData.introText);
    }
  }

  /**
   * Player opens a sub-menu (ACT, ITEM, MERCY)
   */
  public openSubMenu(): void {
    this.transitionTo('PLAYER_SUBMENU');
  }

  /**
   * Player returns from sub-menu back to primary button selection
   */
  public returnToMainMenu(flavorText?: string): void {
    this.transitionTo('PLAYER_MENU');
    const text = flavorText || this.getEncounterFlavorText();
    if (this.events.onPlayerTurnStart) {
      this.events.onPlayerTurnStart(this.turnNumber, text);
    }
  }

  /**
   * Player selects FIGHT -> Target meter activates
   */
  public startFightTarget(): void {
    this.transitionTo('PLAYER_TARGET');
  }

  /**
   * Player finishes action (hit/act/item) and prepares enemy dialogue or attack
   */
  public completePlayerAction(dialogueLine?: string): void {
    this.transitionTo('PLAYER_ACTION_RESOLVE');
    this.inputLocked = true;
  }

  /**
   * Transition to Enemy Dialogue Bubble
   */
  public startEnemyDialogue(customText?: string): void {
    this.transitionTo('ENEMY_DIALOGUE');

    let line = customText;
    if (!line) {
      const lines = this.enemyData.dialogueLines;
      line = lines.length > 0 ? lines[Math.floor(Math.random() * lines.length)] : '...';
    }

    if (this.events.onEnemyDialogue) {
      this.events.onEnemyDialogue(line);
    }
  }

  /**
   * Prepares and starts the bullet-hell dodging phase
   */
  public startEnemyAttack(pattern?: string, durationMs: number = 6500): void {
    this.transitionTo('ENEMY_ATTACK_PREP');

    let selectedPattern = pattern;
    if (!selectedPattern) {
      const patterns = this.enemyData.bulletPatterns;
      selectedPattern =
        patterns.length > 0
          ? patterns[Math.floor(Math.random() * patterns.length)]
          : 'froggit_hops';
    }

    // After box morphs, call onEnemyAttackStart
    if (this.events.onEnemyAttackStart) {
      this.events.onEnemyAttackStart(selectedPattern, durationMs);
    }
  }

  /**
   * Concludes bullet hell attack phase and switches back to player turn
   */
  public endEnemyAttack(): void {
    this.clearPendingCleanups();
    this.transitionTo('ENEMY_ATTACK_RESOLVE');

    if (this.events.onEnemyAttackEnd) {
      this.events.onEnemyAttackEnd();
    }
  }

  /**
   * Returns control back to player for the next turn
   */
  public advanceToNextPlayerTurn(): void {
    this.clearPendingCleanups();
    this.turnNumber += 1;

    if (this.events.onTurnIncrement) {
      this.events.onTurnIncrement(this.turnNumber);
    }

    this.transitionTo('PLAYER_MENU');

    const flavorText = this.getEncounterFlavorText();
    if (this.events.onPlayerTurnStart) {
      this.events.onPlayerTurnStart(this.turnNumber, flavorText);
    }
  }

  /**
   * Handles Player Defeat
   */
  public triggerGameOver(): void {
    this.clearPendingCleanups();
    this.transitionTo('GAME_OVER');
  }

  /**
   * Handles Enemy Victory (Defeat or Spare)
   */
  public triggerVictory(): void {
    this.clearPendingCleanups();
    this.transitionTo('VICTORY');
  }

  /**
   * Generates dynamic Undertale-style flavor text based on enemy state and turn number
   */
  public getEncounterFlavorText(): string {
    const enemy = this.enemyData;

    if (enemy.canSpare || enemy.mercyProgress >= 100) {
      return `* ${enemy.name} parece pronto para ser poupado!`;
    }

    const hpPercent = (enemy.hp / enemy.maxHp) * 100;
    if (hpPercent <= 25) {
      return `* ${enemy.name} está ofegante e muito enfraquecido.`;
    } else if (hpPercent <= 50) {
      return `* ${enemy.name} parece hesitante após receber seus golpes.`;
    }

    if (this.turnNumber === 1) {
      return enemy.introText;
    } else if (this.turnNumber === 2) {
      if (enemy.id === 'froggit') {
        return '* Froggit não parece entender por que está aqui.';
      } else if (enemy.id === 'sir_ossos') {
        return '* O ar fica gelado com os ossos flutuando ao redor.';
      } else if (enemy.id === 'dummy') {
        return '* O Manequim continua inexpressivo.';
      } else if (enemy.id === 'deltajester') {
        return '* Bufão Caótico dá gargalhadas e rodopia no ar!';
      }
      return `* ${enemy.name} ainda está cheio de energia.`;
    } else if (this.turnNumber === 3) {
      if (enemy.id === 'froggit') {
        return '* Você sente o cheiro de mostarda e folhas úmidas.';
      } else if (enemy.id === 'sir_ossos') {
        return '* Sir Ossos ajeita seu laço com elegância de esqueleto.';
      } else if (enemy.id === 'dummy') {
        return '* O algodão de dentro do Manequim parece acolhedor.';
      }
      return `* A batalha continua. Mantenha sua DETERMINAÇÃO.`;
    } else {
      const genericLines = [
        `* ${enemy.name} prepara o próximo ataque.`,
        `* O vento das cavernas sopra calmamente.`,
        `* Você respira fundo e se enche de DETERMINAÇÃO.`,
        `* ${enemy.name} olha atentamente para os seus movimentos.`,
      ];
      return genericLines[(this.turnNumber + 1) % genericLines.length];
    }
  }

  public setInputLocked(locked: boolean): void {
    this.inputLocked = locked;
  }

  public isLocked(): boolean {
    return this.inputLocked;
  }
}
