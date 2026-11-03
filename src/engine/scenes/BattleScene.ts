import Phaser from 'phaser';
import { ENEMIES } from '../../data/defaultData';
import { soundManager } from '../../services/soundSynthesizer';
import { EnemyAct, EnemyData } from '../../types/game';
import { BattleTurnManager, BattleTurnPhase } from '../BattleTurnManager';
import { combatLogManager } from '../combatLogManager';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';
import { spawnHitExplosion, spawnMercySparkles, spawnMonsterDustExplosion } from '../utils/combatParticles';
import { triggerScreenShake } from '../utils/screenShake';

interface Bullet {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  type: 'normal' | 'blue';
  customUpdate?: (time: number, delta: number) => void;
}

interface ArenaBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class BattleScene extends Phaser.Scene {
  private enemyData!: EnemyData;
  public turnManager!: BattleTurnManager;

  // Visual Components
  private enemySprite!: Phaser.GameObjects.Sprite;
  private enemySpeechBubble!: Phaser.GameObjects.Container;
  private enemySpeechText!: Phaser.GameObjects.Text;
  private dialogueTimerEvent: Phaser.Time.TimerEvent | null = null;

  // Arena Bounds Constants
  private static readonly DEFAULT_BOX_BOUNDS: Readonly<ArenaBounds> = Object.freeze({ x: 70, y: 250, w: 500, h: 140 });
  private static readonly ATTACK_BOX_BOUNDS: Readonly<ArenaBounds> = Object.freeze({ x: 230, y: 240, w: 180, h: 150 });

  // Arena Bounds
  private battleBox!: Phaser.GameObjects.Graphics;
  private boxBounds: ArenaBounds = { ...BattleScene.DEFAULT_BOX_BOUNDS };

  // Turn Header / Status
  private turnIndicatorText!: Phaser.GameObjects.Text;

  // Souls & Reticle
  private soulCursor!: Phaser.GameObjects.Sprite;
  private soulPlayable!: Phaser.GameObjects.Sprite;
  private targetMeterContainer!: Phaser.GameObjects.Container;
  private targetBarLine!: Phaser.GameObjects.Rectangle;
  private targetMoving = false;
  private targetBarX = 0;

  // Narration / Menu Text
  private narrativeText!: Phaser.GameObjects.Text;
  private subMenuItems: Phaser.GameObjects.Text[] = [];

  // Bottom Action Buttons
  private buttons: Array<{
    name: 'FIGHT' | 'ACT' | 'ITEM' | 'MERCY';
    container: Phaser.GameObjects.Container;
    label: Phaser.GameObjects.Text;
  }> = [];
  private selectedButtonIndex = 0;
  private selectedSubMenuIndex = 0;

  // HUD
  private nameText!: Phaser.GameObjects.Text;
  private lvText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;

  // Bullet Hell
  private bullets: Bullet[] = [];
  private attackTimer = 0;
  private attackDuration = 6200;
  private invincibilityTimer = 0;
  private soulSpeed = 160;

  // Controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Z: Phaser.Input.Keyboard.Key;
    X: Phaser.Input.Keyboard.Key;
    C: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
    ESC: Phaser.Input.Keyboard.Key;
  };

  private isCleaningUp = false;
  private torielSpareCount = 0;

  constructor() {
    super('BattleScene');
  }

  init(data: { enemyId?: string }) {
    this.cleanupFullSceneLifecycle();

    const enemyFactory = (data?.enemyId && ENEMIES[data.enemyId]) || ENEMIES.froggit;
    this.enemyData = enemyFactory();
    gameState.recordEncounter(this.enemyData.id);
    this.selectedButtonIndex = 0;
    this.selectedSubMenuIndex = 0;
    this.torielSpareCount = 0;
    this.buttons = [];
    this.subMenuItems = [];
    this.bullets = [];
    this.attackTimer = 0;
    this.invincibilityTimer = 0;
    this.targetMoving = false;
    this.targetBarX = 0;
    this.boxBounds = { ...BattleScene.DEFAULT_BOX_BOUNDS };

    if (this.dialogueTimerEvent) {
      this.dialogueTimerEvent.remove(false);
      this.dialogueTimerEvent = null;
    }

    // Instantiate Turn Manager with callbacks
    this.turnManager = new BattleTurnManager(this.enemyData, {
      onPhaseChange: (newPhase, oldPhase) => {
        this.handlePhaseChange(newPhase, oldPhase);
      },
      onTurnIncrement: (turnNum) => {
        this.updateTurnIndicator(turnNum);
      },
      onPlayerTurnStart: (turnNum, flavorText) => {
        this.preparePlayerTurnUI(turnNum, flavorText);
      },
      onEnemyDialogue: (text) => {
        this.showEnemySpeech(text);
      },
      onEnemyAttackStart: (pattern, durationMs) => {
        this.executeAttackWaveSequence(pattern, durationMs);
      },
      onEnemyAttackEnd: () => {
        this.cleanupEnemyAttackWave();
      },
    });
  }

  create() {
    gameState.setActiveScene('BattleScene');
    gameState.recordEncounter(this.enemyData.id);
    SpriteGenerator.generateAllTextures(this);

    // Select distinct music theme based on enemy encounter
    if (this.enemyData.id === 'deltajester') {
      soundManager.playMusic('battle_boss_jester');
    } else if (this.enemyData.id === 'toriel') {
      soundManager.playMusic('battle_toriel');
    } else if (this.enemyData.id === 'dummy') {
      soundManager.playMusic('battle_dummy');
    } else {
      soundManager.playMusic('battle_standard');
    }

    combatLogManager.clearLog();
    combatLogManager.addEntry({
      turn: 1,
      source: 'system',
      actionType: 'intro',
      actor: 'Sistema',
      title: `Batalha contra ${this.enemyData.name}!`,
      description: this.enemyData.introText || `* ${this.enemyData.name} apareceu no seu caminho!`,
      reaction: `* Sua Alma (♥) se manifesta pronta para o confronto.`,
    });

    this.buttons = [];
    this.subMenuItems = [];
    this.bullets = [];
    this.boxBounds = { ...BattleScene.DEFAULT_BOX_BOUNDS };

    // Setup Keyboard Controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Z: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      X: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X),
      C: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
      ESC: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC),
    };

    // 1. Draw Enemy Sprite with balanced mob sizing
    let spriteScale = 1.0;
    let spriteY = 125;

    if (this.enemyData.id === 'sir_ossos') {
      spriteScale = 0.95;
      spriteY = 120;
    } else if (this.enemyData.id === 'froggit') {
      spriteScale = 0.9;
      spriteY = 135;
    } else if (this.enemyData.id === 'deltajester') {
      spriteScale = 1.0;
      spriteY = 125;
    } else if (this.enemyData.id === 'dummy') {
      spriteScale = 2.0;
      spriteY = 135;
    }

    this.enemySprite = this.add.sprite(320, spriteY, this.enemyData.spriteKey);
    this.enemySprite.setScale(spriteScale);
    this.enemySprite.setDepth(10);

    // Subtle enemy floating breathing animation
    this.tweens.add({
      targets: this.enemySprite,
      y: spriteY - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 2. Enemy Speech Bubble at Upper Right
    this.enemySpeechBubble = this.add.container(390, 65);
    this.enemySpeechBubble.setDepth(20);
    this.enemySpeechBubble.setVisible(false);

    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xffffff, 1);
    bubbleBg.fillRoundedRect(0, 0, 195, 58, 6);
    bubbleBg.fillTriangle(0, 20, -10, 24, 0, 28);
    this.enemySpeechBubble.add(bubbleBg);

    this.enemySpeechText = this.add.text(10, 8, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#000000',
      wordWrap: { width: 175 },
      lineSpacing: 4,
    });
    this.enemySpeechBubble.add(this.enemySpeechText);

    // 3. Battle Arena Box
    this.battleBox = this.add.graphics();
    this.battleBox.setDepth(5);
    this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);

    // 4. Narrative / Menu Text inside Box
    this.narrativeText = this.add.text(95, 268, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
      wordWrap: { width: 450 },
      lineSpacing: 10,
    });
    this.narrativeText.setDepth(8);

    // 5. Turn / Phase subtle indicator
    this.turnIndicatorText = this.add.text(560, 235, 'TURNO 1', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#666666',
    });
    this.turnIndicatorText.setOrigin(1, 1);
    this.turnIndicatorText.setDepth(6);

    // 6. Soul in Bullet Hell mode
    this.soulPlayable = this.add.sprite(320, 310, 'soul_red');
    this.soulPlayable.setDepth(25);
    this.soulPlayable.setVisible(false);

    // 7. Soul Cursor for Menu navigation
    this.soulCursor = this.add.sprite(80, 442, 'soul_red');
    this.soulCursor.setDepth(25);

    // 8. Target Meter Container for FIGHT minigame
    this.createTargetMeter();

    // 9. Bottom HUD Stats (LV, HP bar, HP numbers)
    this.createHUD();

    // 10. Bottom Action Buttons (LUTAR, AGIR, ITEM, POUPAR)
    this.createButtons();

    // Virtual action triggers from mobile D-Pad / virtual buttons (clear old listener first)
    this.events.off('virtual_action', this.handleVirtualAction, this);
    this.events.on('virtual_action', this.handleVirtualAction, this);

    // Clean up on scene shutdown and destroy
    this.events.once('shutdown', this.cleanupFullSceneLifecycle, this);
    this.events.once('destroy', this.cleanupFullSceneLifecycle, this);

    // Start Battle with Turn 1
    this.turnManager.startBattle();
  }

  private redrawBattleBox(bounds: { x: number; y: number; w: number; h: number }) {
    this.boxBounds.x = bounds.x;
    this.boxBounds.y = bounds.y;
    this.boxBounds.w = bounds.w;
    this.boxBounds.h = bounds.h;

    this.battleBox.clear();
    this.battleBox.fillStyle(0x000000, 1);
    this.battleBox.fillRect(this.boxBounds.x, this.boxBounds.y, this.boxBounds.w, this.boxBounds.h);
    this.battleBox.lineStyle(5, 0xffffff, 1);
    this.battleBox.strokeRect(this.boxBounds.x, this.boxBounds.y, this.boxBounds.w, this.boxBounds.h);
  }

  private updateTurnIndicator(turnNum: number) {
    if (this.turnIndicatorText) {
      this.turnIndicatorText.setText(`TURNO ${turnNum}`);
    }
  }

  private createTargetMeter() {
    this.targetMeterContainer = this.add.container(320, 320);
    this.targetMeterContainer.setDepth(12);
    this.targetMeterContainer.setVisible(false);

    const meterBg = this.add.image(0, 0, 'target_meter');
    this.targetMeterContainer.add(meterBg);

    this.targetBarLine = this.add.rectangle(-220, 0, 12, 100, 0xffffff, 1);
    this.targetMeterContainer.add(this.targetBarLine);
  }

  private createHUD() {
    const stats = gameState.getStats();

    this.nameText = this.add.text(70, 400, stats.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.nameText.setDepth(15);

    this.lvText = this.add.text(190, 400, `LV ${stats.lv}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.lvText.setDepth(15);

    const hpLabel = this.add.text(280, 402, 'HP', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffffff',
    });
    hpLabel.setDepth(15);

    this.hpBarBg = this.add.rectangle(320, 407, 100, 14, 0xc0392b);
    this.hpBarBg.setOrigin(0, 0.5);
    this.hpBarBg.setDepth(15);

    this.hpBarFill = this.add.rectangle(320, 407, 100, 14, 0xf1c40f);
    this.hpBarFill.setOrigin(0, 0.5);
    this.hpBarFill.setDepth(16);

    this.hpText = this.add.text(435, 400, `${stats.hp} / ${stats.maxHp}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
    });
    this.hpText.setDepth(15);

    this.refreshHUD();
  }

  private refreshHUD() {
    const stats = gameState.getStats();
    this.lvText.setText(`LV ${stats.lv}`);
    this.hpText.setText(`${stats.hp} / ${stats.maxHp}`);

    const ratio = Math.max(0, Math.min(1, stats.hp / stats.maxHp));
    this.hpBarFill.width = Math.floor(100 * ratio);
  }

  private createButtons() {
    const buttonConfigs: Array<{ name: 'FIGHT' | 'ACT' | 'ITEM' | 'MERCY'; label: string; x: number }> = [
      { name: 'FIGHT', label: 'LUTAR', x: 120 },
      { name: 'ACT', label: 'AGIR', x: 250 },
      { name: 'ITEM', label: 'ITEM', x: 380 },
      { name: 'MERCY', label: 'POUPAR', x: 510 },
    ];

    buttonConfigs.forEach((cfg, idx) => {
      const container = this.add.container(cfg.x, 442);
      container.setDepth(15);

      const border = this.add.graphics();
      border.lineStyle(3, 0xe67e22, 1);
      border.strokeRoundedRect(-52, -18, 104, 36, 4);
      container.add(border);

      const label = this.add.text(0, 0, cfg.label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#e67e22',
      });
      label.setOrigin(0.5);
      container.add(label);

      container.setSize(104, 36);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        if (this.turnManager.isInputAllowed() && this.turnManager.getPhase() === 'PLAYER_MENU') {
          this.selectedButtonIndex = idx;
          this.updateButtonSoulPosition();
          soundManager.playMenuSelect();
          this.confirmMainMenuSelection();
        }
      });

      this.buttons.push({
        name: cfg.name,
        container,
        label,
      });
    });
  }

  private updateButtonSoulPosition() {
    if (this.buttons.length === 0) return;
    if (this.turnManager.getPhase() === 'PLAYER_MENU') {
      const idx = Math.max(0, Math.min(this.buttons.length - 1, this.selectedButtonIndex));
      const btn = this.buttons[idx];
      if (btn && btn.container && btn.container.active) {
        this.soulCursor.setVisible(true);
        this.soulCursor.setPosition(btn.container.x - 42, btn.container.y);
      }

      this.buttons.forEach((b, i) => {
        if (b && b.label && b.label.active) {
          const isSelected = i === idx;
          b.label.setColor(isSelected ? '#ffff00' : '#e67e22');
        }
      });
    }
  }

  // --- STATE TRANSITION HANDLERS (Governed by BattleTurnManager) ---
  private handlePhaseChange(newPhase: BattleTurnPhase, oldPhase: BattleTurnPhase) {
    if (newPhase === 'PLAYER_MENU') {
      this.clearSubMenuItems();
      this.targetMeterContainer.setVisible(false);
      this.soulPlayable.setVisible(false);
      this.hideEnemySpeech();
      this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);
      this.narrativeText.setVisible(true);
      this.updateButtonSoulPosition();
    } else if (newPhase === 'ENEMY_ATTACK') {
      this.soulCursor.setVisible(false);
      this.buttons.forEach((b) => {
        if (b && b.label && b.label.active) {
          b.label.setColor('#e67e22');
        }
      });
    }
  }

  private preparePlayerTurnUI(turnNum: number, flavorText: string) {
    this.updateTurnIndicator(turnNum);
    this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);
    this.narrativeText.setVisible(true);
    this.narrativeText.setText(flavorText);
    this.clearSubMenuItems();
    this.updateButtonSoulPosition();

    if (turnNum > 1) {
      combatLogManager.addEntry({
        turn: turnNum,
        source: 'system',
        actionType: 'turn_start',
        actor: 'Turno',
        title: `--- TURNO ${turnNum} ---`,
        description: flavorText || `* O que você fará neste turno?`,
      });
    }
  }

  update(time: number, delta: number) {
    // Delta clamping (max 33.3ms) prevents bullet tunneling and physics stutter on frame spikes
    const clampedDelta = Math.min(delta, 33.34);
    const phase = this.turnManager.getPhase();

    if (phase === 'PLAYER_MENU') {
      this.handleMainMenuInput();
    } else if (phase === 'PLAYER_SUBMENU') {
      this.handleSubMenuInput();
    } else if (phase === 'PLAYER_TARGET') {
      this.handleTargetMeter(clampedDelta);
    } else if (phase === 'ENEMY_DIALOGUE') {
      this.handleDialogueInput();
    } else if (phase === 'ENEMY_ATTACK') {
      this.handleBulletHell(time, clampedDelta);
    } else if (phase === 'VICTORY') {
      this.handleVictoryInput();
    }
  }

  // --- 1. PLAYER MENU & INPUT ---
  private handleMainMenuInput() {
    if (!this.turnManager.isInputAllowed()) return;

    const left =
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.A);
    const right =
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.D);
    const confirm =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    if (left) {
      this.selectedButtonIndex = (this.selectedButtonIndex - 1 + 4) % 4;
      soundManager.playMenuMove();
      this.updateButtonSoulPosition();
    } else if (right) {
      this.selectedButtonIndex = (this.selectedButtonIndex + 1) % 4;
      soundManager.playMenuMove();
      this.updateButtonSoulPosition();
    }

    if (confirm) {
      soundManager.playMenuSelect();
      this.confirmMainMenuSelection();
    }
  }

  private confirmMainMenuSelection() {
    if (!this.turnManager.isInputAllowed()) return;

    const active = this.buttons[this.selectedButtonIndex].name;

    if (active === 'FIGHT') {
      this.startFightTarget();
    } else if (active === 'ACT') {
      this.openActSubMenu();
    } else if (active === 'ITEM') {
      this.openItemSubMenu();
    } else if (active === 'MERCY') {
      this.openMercySubMenu();
    }
  }

  // --- 2. FIGHT TARGET MINIGAME ---
  private startFightTarget() {
    this.turnManager.startFightTarget();
    this.narrativeText.setVisible(false);
    this.soulCursor.setVisible(false);
    this.targetMeterContainer.setVisible(true);

    this.targetBarX = -220;
    this.targetBarLine.setX(this.targetBarX);
    this.targetMoving = true;
  }

  private handleTargetMeter(delta: number) {
    if (!this.targetMoving) return;

    this.targetBarX += 450 * (delta / 1000);
    this.targetBarLine.setX(this.targetBarX);

    const hit =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER) ||
      (this.input.activePointer.isDown && this.input.activePointer.downTime > 0);

    if (hit || this.targetBarX >= 220) {
      this.targetMoving = false;
      this.executePlayerAttack(this.targetBarX);
    }
  }

  private executePlayerAttack(finalX: number) {
    this.turnManager.completePlayerAction();

    const distFromCenter = Math.abs(finalX);
    const stats = gameState.getStats();
    const weaponBonus = stats.weapon.value;
    const baseAtk = stats.atk + weaponBonus;

    let damage = 0;
    let isCritical = false;

    if (distFromCenter < 20) {
      damage = Math.floor(baseAtk * 2.2);
      isCritical = true;
    } else if (distFromCenter < 80) {
      damage = Math.floor(baseAtk * 1.5);
    } else if (distFromCenter < 160) {
      damage = Math.floor(baseAtk * 1.0);
    } else {
      damage = Math.max(1, Math.floor(baseAtk * 0.4));
    }

    soundManager.playSlash();
    const slash = this.add.sprite(this.enemySprite.x, this.enemySprite.y, 'fx_slash');
    slash.setDepth(30);

    // Visceral hit particle explosion & screen shake
    spawnHitExplosion(this, {
      x: this.enemySprite.x,
      y: this.enemySprite.y,
      isCritical,
      damage,
    });

    const isBoss = this.enemyData.id === 'sir_ossos' || this.enemyData.id === 'deltajester';
    if (isCritical && isBoss) {
      triggerScreenShake(this, 'boss_hit');
    } else if (isCritical) {
      triggerScreenShake(this, 'critical');
    }

    this.tweens.add({
      targets: this.enemySprite,
      x: this.enemySprite.x + (isCritical ? 14 : 7),
      duration: 60,
      yoyo: true,
      repeat: 4,
    });

    this.tweens.add({
      targets: slash,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 300,
      onComplete: () => slash.destroy(),
    });

    const dmgText = this.add.text(
      this.enemySprite.x,
      this.enemySprite.y - 40,
      isCritical ? `CRÍTICO! ${damage}` : `${damage}`,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: isCritical ? '16px' : '14px',
        color: isCritical ? '#e74c3c' : '#ffffff',
      }
    );
    dmgText.setOrigin(0.5);
    dmgText.setDepth(35);

    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => dmgText.destroy(),
    });

    this.enemyData.hp = Math.max(0, this.enemyData.hp - damage);

    const remainingHp = this.enemyData.hp;
    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'player',
      actionType: 'fight',
      actor: stats.name,
      title: isCritical ? `Ataque Crítico! (${damage} DMG)` : `Ataque Normal (${damage} DMG)`,
      description: `Você sincronizou o retículo de ataque e causou ${damage} de dano físico em ${this.enemyData.name}!`,
      reaction:
        remainingHp <= 0
          ? `${this.enemyData.name} sucumbiu ao impacto e se desfaz em poeira!`
          : `${this.enemyData.name} estremeceu com o golpe! Restam ${remainingHp}/${this.enemyData.maxHp} HP.`,
      statsChange: { hpChange: -damage },
    });

    const timer = this.time.delayedCall(1200, () => {
      this.targetMeterContainer.setVisible(false);
      this.narrativeText.setVisible(true);

      if (this.enemyData.hp <= 0) {
        this.turnManager.triggerVictory();
        this.handleEnemyDefeated();
      } else {
        this.startEnemyDialogueSequence();
      }
    });

    this.turnManager.registerCleanup(() => timer.remove(false));
  }

  // --- 3. SUBMENUS (ACT, ITEM, MERCY) ---
  private openActSubMenu() {
    this.turnManager.openSubMenu();
    this.narrativeText.setVisible(false);
    this.clearSubMenuItems();

    this.selectedSubMenuIndex = 0;
    this.enemyData.acts.forEach((act, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const text = this.add.text(120 + col * 220, 275 + row * 32, `* ${act.name}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#ffffff',
      });
      text.setDepth(10);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        if (this.turnManager.isInputAllowed()) {
          this.selectedSubMenuIndex = idx;
          this.confirmSubMenuSelection();
        }
      });
      this.subMenuItems.push(text);
    });

    this.updateSubMenuSoulPosition();
  }

  private openItemSubMenu() {
    this.turnManager.openSubMenu();
    this.narrativeText.setVisible(false);
    this.clearSubMenuItems();

    const stats = gameState.getStats();
    if (stats.inventory.length === 0) {
      const emptyText = this.add.text(110, 290, '* Você não tem nenhum item.', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: '#aaaaaa',
      });
      emptyText.setDepth(10);
      this.subMenuItems.push(emptyText);
      return;
    }

    this.selectedSubMenuIndex = 0;
    stats.inventory.forEach((item, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const text = this.add.text(120 + col * 220, 275 + row * 30, `* ${item.name}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffffff',
      });
      text.setDepth(10);
      text.setInteractive({ useHandCursor: true });
      text.on('pointerdown', () => {
        if (this.turnManager.isInputAllowed()) {
          this.selectedSubMenuIndex = idx;
          this.confirmSubMenuSelection();
        }
      });
      this.subMenuItems.push(text);
    });

    this.updateSubMenuSoulPosition();
  }

  private openMercySubMenu() {
    this.turnManager.openSubMenu();
    this.narrativeText.setVisible(false);
    this.clearSubMenuItems();

    this.selectedSubMenuIndex = 0;
    const canSpare = this.enemyData.mercyProgress >= 100;

    const spareText = this.add.text(
      120,
      285,
      `* Poupar (${this.enemyData.name})`,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: canSpare ? '#ffff00' : '#ffffff',
      }
    );
    spareText.setDepth(10);
    spareText.setInteractive({ useHandCursor: true });
    spareText.on('pointerdown', () => {
      if (this.turnManager.isInputAllowed()) {
        this.selectedSubMenuIndex = 0;
        this.confirmSubMenuSelection();
      }
    });
    this.subMenuItems.push(spareText);

    const fleeText = this.add.text(120, 325, '* Fugir do combate', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    fleeText.setDepth(10);
    fleeText.setInteractive({ useHandCursor: true });
    fleeText.on('pointerdown', () => {
      if (this.turnManager.isInputAllowed()) {
        this.selectedSubMenuIndex = 1;
        this.confirmSubMenuSelection();
      }
    });
    this.subMenuItems.push(fleeText);

    this.updateSubMenuSoulPosition();
  }

  private clearSubMenuItems() {
    this.subMenuItems.forEach((item) => item.destroy());
    this.subMenuItems = [];
  }

  private updateSubMenuSoulPosition() {
    if (this.subMenuItems.length === 0) return;
    const item = this.subMenuItems[this.selectedSubMenuIndex];
    if (item) {
      this.soulCursor.setVisible(true);
      this.soulCursor.setPosition(item.x - 20, item.y + 7);
    }
  }

  private handleSubMenuInput() {
    if (!this.turnManager.isInputAllowed()) return;

    const left =
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.A);
    const right =
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.D);
    const up =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.W);
    const down =
      Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.S);
    const confirm =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);
    const cancel =
      Phaser.Input.Keyboard.JustDown(this.wasd.X) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ESC);

    const total = this.subMenuItems.length;
    if (total > 0) {
      if (right || down) {
        this.selectedSubMenuIndex = (this.selectedSubMenuIndex + 1) % total;
        soundManager.playMenuMove();
        this.updateSubMenuSoulPosition();
      } else if (left || up) {
        this.selectedSubMenuIndex = (this.selectedSubMenuIndex - 1 + total) % total;
        soundManager.playMenuMove();
        this.updateSubMenuSoulPosition();
      }
    }

    if (confirm) {
      soundManager.playMenuSelect();
      this.confirmSubMenuSelection();
    } else if (cancel) {
      soundManager.playMenuSelect();
      this.returnToMainMenu();
    }
  }

  private returnToMainMenu() {
    this.clearSubMenuItems();
    this.turnManager.returnToMainMenu();
  }

  private confirmSubMenuSelection() {
    if (!this.turnManager.isInputAllowed()) return;

    const activeBtn = this.buttons[this.selectedButtonIndex].name;

    if (activeBtn === 'ACT') {
      const act = this.enemyData.acts[this.selectedSubMenuIndex];
      if (act) {
        this.executeAct(act);
      }
    } else if (activeBtn === 'ITEM') {
      const stats = gameState.getStats();
      const item = stats.inventory[this.selectedSubMenuIndex];
      if (item) {
        this.turnManager.completePlayerAction();
        const res = gameState.useItem(this.selectedSubMenuIndex);
        this.refreshHUD();
        this.clearSubMenuItems();
        this.narrativeText.setVisible(true);
        this.narrativeText.setText(res.message);
        this.soulCursor.setVisible(false);

        combatLogManager.addEntry({
          turn: this.turnManager.getTurnNumber(),
          source: 'player',
          actionType: 'item',
          actor: stats.name,
          title: `Item: ${item.name}`,
          description: res.message,
          reaction: `* A Alma de ${stats.name} foi nutrida.`,
          statsChange: { hpChange: item.value },
        });

        const timer = this.time.delayedCall(1600, () => {
          this.startEnemyDialogueSequence();
        });
        this.turnManager.registerCleanup(() => timer.remove(false));
      } else {
        this.returnToMainMenu();
      }
    } else if (activeBtn === 'MERCY') {
      if (this.selectedSubMenuIndex === 0) {
        if (this.enemyData.id === 'toriel') {
          this.torielSpareCount++;
          const torielSpareReplies = [
            '...?',
            'O que você está fazendo?',
            'Ataque ou fuja!',
            'O que você está provando com isso?',
            'Lute comigo ou vá embora!',
            'Pare de me olhar desse jeito...',
            'Eu sei que você quer ir para casa, mas...',
            'Por favor... apenas suba de volta...',
            'Eu prometo que cuidarei bem de você aqui...',
            '......',
            'Heh... Você é mesmo teimoso, não é?',
          ];
          const replyIdx = Math.min(torielSpareReplies.length - 1, this.torielSpareCount - 1);
          const reply = torielSpareReplies[replyIdx];

          if (this.torielSpareCount >= 5) {
            this.enemyData.mercyProgress = 100;
            this.enemyData.canSpare = true;
            this.turnManager.triggerVictory();
            this.handleEnemySpared();
            return;
          }

          this.turnManager.completePlayerAction();
          this.clearSubMenuItems();
          this.narrativeText.setVisible(true);
          this.narrativeText.setText(
            `* Você poupou Toriel.\n* Mas ela não parece querer desistir ainda.`
          );
          this.soulCursor.setVisible(false);

          combatLogManager.addEntry({
            turn: this.turnManager.getTurnNumber(),
            source: 'player',
            actionType: 'mercy',
            actor: gameState.getStats().name,
            title: `Poupar Toriel (${this.torielSpareCount}ª tentativa)`,
            description: `Você recusou-se a machucar Toriel e ofereceu misericórdia.`,
            reaction: `Toriel hesita com dor no coração: "${reply}"`,
          });

          const timer = this.time.delayedCall(1600, () => {
            this.startEnemyDialogueSequence(reply);
          });
          this.turnManager.registerCleanup(() => timer.remove(false));
          return;
        }

        if (this.enemyData.mercyProgress >= 100) {
          this.turnManager.triggerVictory();
          this.handleEnemySpared();
        } else {
          this.turnManager.completePlayerAction();
          this.clearSubMenuItems();
          this.narrativeText.setVisible(true);
          this.narrativeText.setText(
            `* O nome de ${this.enemyData.name} ainda não é amarelo. Ele ainda quer lutar!`
          );
          this.soulCursor.setVisible(false);

          combatLogManager.addEntry({
            turn: this.turnManager.getTurnNumber(),
            source: 'player',
            actionType: 'mercy',
            actor: gameState.getStats().name,
            title: `Poupar (Recusado)`,
            description: `Você ofereceu misericórdia e abaixou a guarda para ${this.enemyData.name}.`,
            reaction: `* O nome de ${this.enemyData.name} ainda não é amarelo (${this.enemyData.mercyProgress}% Piedade). O confronto prossegue!`,
          });

          const timer = this.time.delayedCall(1600, () => {
            this.startEnemyDialogueSequence();
          });
          this.turnManager.registerCleanup(() => timer.remove(false));
        }
      } else {
        this.turnManager.triggerVictory();
        this.handleFlee();
      }
    }
  }

  private executeAct(act: EnemyAct) {
    this.turnManager.completePlayerAction();

    this.enemyData.mercyProgress = Math.min(100, this.enemyData.mercyProgress + act.mercyGain);
    if (this.enemyData.mercyProgress >= 100) {
      this.enemyData.canSpare = true;
    }

    if (act.specialAction === 'DEF_DOWN') {
      this.enemyData.def = Math.max(0, this.enemyData.def - 2);
    }

    const stats = gameState.getStats();
    const canSpareNow = this.enemyData.mercyProgress >= 100;
    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'player',
      actionType: 'act',
      actor: stats.name,
      title: `Ação (ACT): ${act.name}`,
      description: `${act.description}\n${act.resultText}`,
      reaction: `"${act.enemyReply}" (${
        canSpareNow
          ? `O nome de ${this.enemyData.name} ficou AMARELO!`
          : `+${act.mercyGain}% Piedade (Total: ${this.enemyData.mercyProgress}%)`
      })`,
      statsChange: {
        mercyChange: act.mercyGain,
        defChange: act.specialAction === 'DEF_DOWN' ? -2 : undefined,
      },
    });

    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText(act.resultText);
    this.soulCursor.setVisible(false);

    const timer = this.time.delayedCall(1800, () => {
      this.startEnemyDialogueSequence(act.enemyReply);
    });
    this.turnManager.registerCleanup(() => timer.remove(false));
  }

  // --- 4. ENEMY DIALOGUE & TRANSITION ---
  private startEnemyDialogueSequence(dialogueText?: string) {
    this.narrativeText.setVisible(false);
    this.soulCursor.setVisible(false);
    this.turnManager.startEnemyDialogue(dialogueText);

    // Auto-advance after 1400ms or when player presses Z
    if (this.dialogueTimerEvent) {
      this.dialogueTimerEvent.remove(false);
    }
    this.dialogueTimerEvent = this.time.delayedCall(1400, () => {
      this.advanceFromDialogueToAttack();
    });
    this.turnManager.registerCleanup(() => {
      if (this.dialogueTimerEvent) this.dialogueTimerEvent.remove(false);
    });
  }

  private handleDialogueInput() {
    const confirm =
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    if (confirm) {
      this.advanceFromDialogueToAttack();
    }
  }

  private advanceFromDialogueToAttack() {
    if (this.dialogueTimerEvent) {
      this.dialogueTimerEvent.remove(false);
      this.dialogueTimerEvent = null;
    }
    this.hideEnemySpeech();

    // If fighting Dummy, Dummy does not shoot bullets!
    // Maintain full-width box so the narration is enclosed neatly
    if (this.enemyData.id === 'dummy') {
      this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);
      this.turnManager.startEnemyAttack();
      return;
    }

    this.tweens.killTweensOf(this.boxBounds);

    // Morph the battle box to bullet hell dodging arena
    this.tweens.add({
      targets: this.boxBounds,
      x: BattleScene.ATTACK_BOX_BOUNDS.x,
      y: BattleScene.ATTACK_BOX_BOUNDS.y,
      w: BattleScene.ATTACK_BOX_BOUNDS.w,
      h: BattleScene.ATTACK_BOX_BOUNDS.h,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.redrawBattleBox(this.boxBounds);
      },
      onComplete: () => {
        this.redrawBattleBox(BattleScene.ATTACK_BOX_BOUNDS);
        this.turnManager.startEnemyAttack();
      },
    });
  }

  private getPatternFriendlyName(pattern: string): string {
    const patternNames: Record<string, string> = {
      froggit_hops: 'Saltos Rápidos de Sapo',
      froggit_flies: 'Moscas Giratórias',
      bone_slider: 'Onda Rasteira de Ossos',
      blue_attack: 'Ataque Azul (Imobilidade Obrigatória)',
      bone_wave: 'Muralha de Ossos Cadenciada',
      chaos_stars: 'Chuva de Estrelas em Espiral',
      spinning_cards: 'Cartas Giratórias Cortantes',
      laser_cross: 'Cruz de Feixes Laser',
      dummy_still: 'Imobilidade Silenciosa',
    };
    return patternNames[pattern] || pattern;
  }

  private showEnemySpeech(text: string) {
    this.enemySpeechText.setText(text);
    this.enemySpeechBubble.setVisible(true);
    soundManager.playVoiceBlip('monster');

    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'enemy',
      actionType: 'dialogue',
      actor: this.enemyData.name,
      title: `Fala de ${this.enemyData.name}`,
      description: `"${text}"`,
      reaction: `${this.enemyData.name} se posiciona para a ofensiva.`,
    });
  }

  private hideEnemySpeech() {
    this.enemySpeechBubble.setVisible(false);
  }

  // --- 5. ENEMY BULLET HELL ATTACK PHASE ---
  private executeAttackWaveSequence(pattern: string, durationMs: number) {
    this.turnManager.transitionTo('ENEMY_ATTACK');
    this.clearBullets();
    this.attackTimer = 0;
    this.attackDuration = durationMs;

    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'enemy',
      actionType: 'attack_pattern',
      actor: this.enemyData.name,
      title: `Ataque Mágico: ${this.getPatternFriendlyName(pattern)}`,
      description: `${this.enemyData.name} conjurou magia no tabuleiro de esquiva!`,
      reaction:
        pattern === 'blue_attack'
          ? `AVISO: Ataque Azul detectado! Fique completamente PARADO para não receber dano!`
          : `Controle a Alma vermelha (♥) para esquivar dos projéteis!`,
    });

    // Spawn Waves based on pattern
    if (pattern === 'dummy_still') {
      this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);
      this.soulPlayable.setVisible(false);
      this.narrativeText.setVisible(true);
      this.narrativeText.setText('* O Manequim permanece imóvel na sua frente.');
      const timer = this.time.delayedCall(1600, () => {
        if (this.turnManager.getPhase() === 'ENEMY_ATTACK') {
          this.turnManager.endEnemyAttack();
        }
      });
      this.turnManager.registerCleanup(() => timer.remove(false));
      return;
    }

    // Reposition and show Playable Red SOUL at center of attack box
    this.soulPlayable.setPosition(
      BattleScene.ATTACK_BOX_BOUNDS.x + BattleScene.ATTACK_BOX_BOUNDS.w / 2,
      BattleScene.ATTACK_BOX_BOUNDS.y + BattleScene.ATTACK_BOX_BOUNDS.h / 2
    );
    this.soulPlayable.setVisible(true);

    if (this.enemyData.id === 'deltajester' || this.enemyData.id === 'sir_ossos') {
      triggerScreenShake(this, 'light');
    }

    if (pattern === 'froggit_hops' || pattern === 'froggit_flies') {
      for (let i = 0; i < 6; i++) {
        const timer = this.time.delayedCall(i * 850, () => {
          if (this.isCleaningUp || !this.turnManager || this.turnManager.getPhase() !== 'ENEMY_ATTACK') return;
          const fromLeft = Math.random() > 0.5;
          const fly = this.add.sprite(
            fromLeft ? this.boxBounds.x + 10 : this.boxBounds.x + this.boxBounds.w - 10,
            this.boxBounds.y + 20 + Math.random() * (this.boxBounds.h - 40),
            'bullet_fly'
          );
          fly.setDepth(15);
          this.bullets.push({
            sprite: fly,
            vx: (fromLeft ? 1 : -1) * (65 + Math.random() * 35),
            vy: (Math.random() - 0.5) * 40,
            type: 'normal',
          });
        });
        this.turnManager.registerCleanup(() => timer.remove(false));
      }
    } else if (pattern === 'bone_slider' || pattern === 'bone_wave') {
      for (let i = 0; i < 5; i++) {
        const timer = this.time.delayedCall(i * 1050, () => {
          if (this.isCleaningUp || !this.turnManager || this.turnManager.getPhase() !== 'ENEMY_ATTACK') return;
          const bone = this.add.sprite(
            this.boxBounds.x + this.boxBounds.w + 10,
            this.boxBounds.y + this.boxBounds.h - 18,
            'bullet_bone'
          );
          bone.setDepth(15);
          this.bullets.push({
            sprite: bone,
            vx: -95,
            vy: 0,
            type: 'normal',
          });
        });
        this.turnManager.registerCleanup(() => timer.remove(false));
      }
    } else if (pattern === 'blue_attack') {
      triggerScreenShake(this, 'medium');
      const timer = this.time.delayedCall(400, () => {
        if (this.isCleaningUp || !this.turnManager || this.turnManager.getPhase() !== 'ENEMY_ATTACK') return;
        const blueBone = this.add.sprite(
          this.boxBounds.x + this.boxBounds.w + 10,
          this.boxBounds.y + this.boxBounds.h / 2,
          'bullet_bone_blue'
        );
        blueBone.setDepth(15);
        this.bullets.push({
          sprite: blueBone,
          vx: -80,
          vy: 0,
          type: 'blue',
        });
      });
      this.turnManager.registerCleanup(() => timer.remove(false));
    } else if (
      pattern === 'toriel_fire_helix' ||
      pattern === 'toriel_fire_spiral' ||
      pattern === 'toriel_fire_rain'
    ) {
      // Toriel's iconic fire magic!
      const currentHp = gameState.getStats().hp;
      const isCriticalHp = currentHp <= 2;

      for (let i = 0; i < 7; i++) {
        const timer = this.time.delayedCall(i * 550, () => {
          if (this.isCleaningUp || !this.turnManager || this.turnManager.getPhase() !== 'ENEMY_ATTACK') return;
          const fromLeft = i % 2 === 0;
          const spawnX = fromLeft
            ? this.boxBounds.x + 12 + Math.random() * 25
            : this.boxBounds.x + this.boxBounds.w - 12 - Math.random() * 25;
          const spawnY = this.boxBounds.y + 6;

          const flame = this.add.sprite(spawnX, spawnY, 'bullet_flame');
          flame.setDepth(15);

          let targetX = this.soulPlayable.x;
          let targetY = this.soulPlayable.y;

          // Undertale canonical detail: If Frisk is at 2 HP or below, Toriel's fire attacks deliberately swerve away
          if (isCriticalHp) {
            targetX += fromLeft ? -50 : 50;
          }

          const angle = Math.atan2(targetY - spawnY, targetX - spawnX);
          const speed = 80 + Math.random() * 25;

          this.bullets.push({
            sprite: flame,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            type: 'normal',
          });
        });
        this.turnManager.registerCleanup(() => timer.remove(false));
      }
    } else {
      // Delta Jester / Star burst
      for (let i = 0; i < 8; i++) {
        const timer = this.time.delayedCall(i * 650, () => {
          if (this.isCleaningUp || !this.turnManager || this.turnManager.getPhase() !== 'ENEMY_ATTACK') return;
          const angle = Math.random() * Math.PI * 2;
          const star = this.add.sprite(
            this.boxBounds.x + this.boxBounds.w / 2 + Math.cos(angle) * 110,
            this.boxBounds.y + this.boxBounds.h / 2 + Math.sin(angle) * 110,
            'bullet_star'
          );
          star.setDepth(15);
          this.bullets.push({
            sprite: star,
            vx: -Math.cos(angle) * 85,
            vy: -Math.sin(angle) * 85,
            type: 'normal',
          });
        });
        this.turnManager.registerCleanup(() => timer.remove(false));
      }
    }
  }

  private handleBulletHell(_: number, delta: number) {
    if (
      this.isCleaningUp ||
      !this.turnManager ||
      !this.turnManager.isBulletHellActive() ||
      !this.soulPlayable ||
      !this.soulPlayable.active
    ) {
      this.clearBullets();
      return;
    }

    this.attackTimer += delta;

    let vx = 0;
    let vy = 0;

    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    const isSoulMoving = vx !== 0 || vy !== 0;

    if (isSoulMoving) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;

      this.soulPlayable.x += vx * this.soulSpeed * (delta / 1000);
      this.soulPlayable.y += vy * this.soulSpeed * (delta / 1000);

      const halfSize = 10;
      this.soulPlayable.x = Phaser.Math.Clamp(
        this.soulPlayable.x,
        this.boxBounds.x + halfSize + 5,
        this.boxBounds.x + this.boxBounds.w - halfSize - 5
      );
      this.soulPlayable.y = Phaser.Math.Clamp(
        this.soulPlayable.y,
        this.boxBounds.y + halfSize + 5,
        this.boxBounds.y + this.boxBounds.h - halfSize - 5
      );
    }

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= delta;
      this.soulPlayable.setAlpha(Math.floor(this.invincibilityTimer / 100) % 2 === 0 ? 0.3 : 1);
    } else {
      this.soulPlayable.setAlpha(1);
    }

    // Bullets movement & collision
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (!this.turnManager || !this.turnManager.isBulletHellActive()) {
        break;
      }

      const b = this.bullets[i];
      if (!b || !b.sprite || !b.sprite.active) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.sprite.x += b.vx * (delta / 1000);
      b.sprite.y += b.vy * (delta / 1000);

      const dist = Phaser.Math.Distance.Between(
        this.soulPlayable.x,
        this.soulPlayable.y,
        b.sprite.x,
        b.sprite.y
      );

      if (dist < 14 && this.invincibilityTimer <= 0) {
        if (b.type === 'blue' && !isSoulMoving) {
          // Standing still successfully dodges blue attacks!
        } else {
          this.handleSoulHit();
          if (
            !this.turnManager ||
            !this.turnManager.isBulletHellActive() ||
            this.bullets.length === 0
          ) {
            break;
          }
        }
      }

      if (!b || !b.sprite || !b.sprite.active) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (
        b.sprite.x < this.boxBounds.x - 40 ||
        b.sprite.x > this.boxBounds.x + this.boxBounds.w + 40 ||
        b.sprite.y < this.boxBounds.y - 40 ||
        b.sprite.y > this.boxBounds.y + this.boxBounds.h + 40
      ) {
        try {
          b.sprite.destroy();
        } catch {
          // ignore
        }
        this.bullets.splice(i, 1);
      }
    }

    // Check attack wave completion
    if (this.attackTimer >= this.attackDuration && this.turnManager && this.turnManager.isBulletHellActive()) {
      this.turnManager.endEnemyAttack();
    }
  }

  private handleSoulHit() {
    soundManager.playHurt();
    this.invincibilityTimer = 1100;

    const isDead = gameState.takeDamage(this.enemyData.atk);
    this.refreshHUD();

    const stats = gameState.getStats();
    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'enemy',
      actionType: 'damage',
      actor: this.enemyData.name,
      title: `Alma Atingida! (-${this.enemyData.atk} HP)`,
      description: `Sua Alma (♥) colidiu com um projétil de ${this.enemyData.name}!`,
      reaction: isDead
        ? `Sua Alma se partiu... DETERMINAÇÃO é necessária!`
        : `Você sofreu ${this.enemyData.atk} de dano. HP atual: ${stats.hp}/${stats.maxHp}.`,
      statsChange: { hpChange: -this.enemyData.atk },
    });

    const isBoss = this.enemyData.id === 'sir_ossos' || this.enemyData.id === 'deltajester';
    if (isBoss) {
      triggerScreenShake(this, 'boss_hit');
    } else {
      const isHeavyHit = this.enemyData.atk >= 7 || stats.hp <= 6;
      triggerScreenShake(this, isHeavyHit ? 'heavy' : 'medium');
    }

    if (isDead) {
      this.turnManager.triggerGameOver();
      this.handleGameOver();
    }
  }

  private clearBullets() {
    if (this.bullets && this.bullets.length > 0) {
      this.bullets.forEach((b) => {
        try {
          if (b && b.sprite && b.sprite.destroy) {
            b.sprite.destroy();
          }
        } catch {
          // ignore
        }
      });
    }
    this.bullets = [];
  }

  private cleanupEnemyAttackWave() {
    this.clearBullets();
    this.soulPlayable.setVisible(false);

    this.tweens.killTweensOf(this.boxBounds);

    // If box is already at default dimensions (e.g. dummy fight)
    if (Math.abs(this.boxBounds.w - BattleScene.DEFAULT_BOX_BOUNDS.w) < 5) {
      this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);
      this.turnManager.advanceToNextPlayerTurn();
      return;
    }

    // Expand box back smoothly to wide default bounds
    this.tweens.add({
      targets: this.boxBounds,
      x: BattleScene.DEFAULT_BOX_BOUNDS.x,
      y: BattleScene.DEFAULT_BOX_BOUNDS.y,
      w: BattleScene.DEFAULT_BOX_BOUNDS.w,
      h: BattleScene.DEFAULT_BOX_BOUNDS.h,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.redrawBattleBox(this.boxBounds);
      },
      onComplete: () => {
        this.redrawBattleBox(BattleScene.DEFAULT_BOX_BOUNDS);
        // Increment turn count and return control to player!
        this.turnManager.advanceToNextPlayerTurn();
      },
    });
  }

  // --- 6. OUTCOMES (DEFEAT / SPARE / FLEE / GAME OVER) ---
  private handleEnemyDefeated() {
    soundManager.stopMusic();
    this.clearBullets();

    // Visceral monster dust disintegration particle explosion!
    spawnMonsterDustExplosion(this, {
      enemySprite: this.enemySprite,
      enemyId: this.enemyData.id,
    });

    gameState.recordVictory(false);
    gameState.recordEnemyOutcome(this.enemyData.id, 'defeated');
    gameState.setFlag(`enemy_defeated_${this.enemyData.id}`, true);
    gameState.setFlag(`enemy_resolved_${this.enemyData.id}`, true);
    if (this.enemyData.id === 'dummy') {
      gameState.setFlag('dummy_practiced', true);
      gameState.setFlag('dummy_defeated', true);
    }
    if (this.enemyData.id === 'toriel') {
      gameState.setFlag('toriel_resolved', true);
      gameState.setFlag('toriel_defeated', true);
      gameState.setFlag('toriel_killed', true);
    }
    const rewards = gameState.addRewards(this.enemyData.expReward, this.enemyData.goldReward);
    this.refreshHUD();

    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'system',
      actionType: 'defeated',
      actor: 'Sistema',
      title: `Vitória: ${this.enemyData.name} Derrotado!`,
      description: `${this.enemyData.name} sucumbiu ao confronto e se dispersou em poeira.`,
      reaction: `Recompensas concedidas: +${this.enemyData.expReward} EXP, +${this.enemyData.goldReward}G!`,
    });

    let msg = `* VOCÊ VENCEU!\n* Ganhou ${this.enemyData.expReward} EXP e ${this.enemyData.goldReward} Ouro.`;
    if (rewards.leveledUp) {
      soundManager.playSave();
      msg += `\n* SEU LOVE AUMENTOU PARA LV ${rewards.newLv}!`;
    }

    this.narrativeText.setVisible(true);
    this.narrativeText.setText(msg);

    this.victoryReturnTimer = this.time.delayedCall(2800, () => {
      this.returnToOverworld();
    });
  }

  private handleEnemySpared() {
    soundManager.playSpare();
    this.clearBullets();

    gameState.recordVictory(true);
    gameState.recordEnemyOutcome(this.enemyData.id, 'spared');
    gameState.setFlag(`enemy_spared_${this.enemyData.id}`, true);
    gameState.setFlag(`enemy_resolved_${this.enemyData.id}`, true);
    if (this.enemyData.id === 'dummy') {
      gameState.setFlag('dummy_practiced', true);
      gameState.setFlag('dummy_spared', true);
    }
    if (this.enemyData.id === 'toriel') {
      gameState.setFlag('toriel_resolved', true);
      gameState.setFlag('toriel_spared', true);
    }
    gameState.addRewards(0, this.enemyData.goldReward);
    this.refreshHUD();

    // Peaceful sparkles on spare
    spawnMercySparkles(this, this.enemySprite);

    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'player',
      actionType: 'spared',
      actor: gameState.getStats().name,
      title: `Vitória Pacífica: Poupou ${this.enemyData.name}!`,
      description: `Você estendeu a mão em pacifismo sincero e compaixão.`,
      reaction: `${this.enemyData.name} aceitou a paz com gratidão e se despediu amigavelmente! Ganhou ${this.enemyData.goldReward}G.`,
    });

    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText(
      `* VOCÊ POUPOU ${this.enemyData.name}!\n* Ganhou ${this.enemyData.goldReward} Ouro e 0 EXP.\n* Sua bondade ressoa nas Ruínas.`
    );

    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0.1,
      duration: 1200,
    });

    this.victoryReturnTimer = this.time.delayedCall(2800, () => {
      this.returnToOverworld();
    });
  }

  private handleFlee() {
    soundManager.playMenuMove();
    this.clearBullets();
    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText('* Você escapou em segurança!');

    gameState.recordEnemyOutcome(this.enemyData.id, 'fled');
    if (this.enemyData.id === 'dummy') {
      gameState.setFlag('dummy_practiced', true);
      gameState.setFlag('dummy_fled', true);
    }

    combatLogManager.addEntry({
      turn: this.turnManager.getTurnNumber(),
      source: 'player',
      actionType: 'fled',
      actor: gameState.getStats().name,
      title: `Fuga do Combate`,
      description: `Você correu velozmente para longe do confronto!`,
      reaction: `${this.enemyData.name} ficou para trás enquanto você escapava pelas Ruínas.`,
    });

    this.victoryReturnTimer = this.time.delayedCall(1400, () => {
      this.returnToOverworld();
    });
  }

  private victoryReturnTimer: Phaser.Time.TimerEvent | null = null;

  private handleVictoryInput(force: boolean = false) {
    const confirm =
      force ||
      Phaser.Input.Keyboard.JustDown(this.wasd.Z) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.ENTER);

    if (confirm) {
      this.returnToOverworld();
    }
  }

  private returnToOverworld() {
    if (this.victoryReturnTimer) {
      this.victoryReturnTimer.remove(false);
      this.victoryReturnTimer = null;
    }

    // Flash "THE COLORS OF RESILIENCE" during transition back to overworld
    const overlay = this.add.rectangle(320, 240, 640, 480, 0x000000, 1);
    overlay.setDepth(500);
    overlay.setAlpha(0);

    const textContainer = this.add.container(320, 240);
    textContainer.setDepth(501);
    textContainer.setAlpha(0);

    const heart = this.add.text(0, -20, '♥', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#e74c3c',
    });
    heart.setOrigin(0.5);
    textContainer.add(heart);

    const showSecretCode = Math.random() < 0.5;
    const transitionMessage = showSecretCode ? '007474' : 'THE COLORS OF RESILIENCE';
    const glowColor = showSecretCode ? '#00e5ff' : '#ffdd59';

    const phrase = this.add.text(0, 4, transitionMessage, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: showSecretCode ? '13px' : '11px',
      color: '#ffffff',
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: glowColor,
        blur: 8,
        stroke: true,
        fill: true,
      },
    });
    phrase.setOrigin(0.5);
    textContainer.add(phrase);

    this.tweens.add({
      targets: [overlay, textContainer],
      alpha: 1,
      duration: 160,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.time.delayedCall(360, () => {
          this.scene.start('OverworldScene');
        });
      },
    });
  }

  private handleGameOver() {
    soundManager.stopMusic();
    this.clearBullets();

    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene');
    });
  }

  // --- 7. VIRTUAL CONTROLLER SUPPORT ---
  private handleVirtualAction(action: string) {
    if (action === 'Z' && this.turnManager.getPhase() === 'VICTORY') {
      this.handleVictoryInput(true);
      return;
    }

    if (!this.turnManager.isInputAllowed()) return;
    const phase = this.turnManager.getPhase();

    if (phase === 'PLAYER_MENU') {
      if (action === 'LEFT') {
        this.selectedButtonIndex = (this.selectedButtonIndex - 1 + 4) % 4;
        this.updateButtonSoulPosition();
      } else if (action === 'RIGHT') {
        this.selectedButtonIndex = (this.selectedButtonIndex + 1) % 4;
        this.updateButtonSoulPosition();
      } else if (action === 'Z') {
        this.confirmMainMenuSelection();
      }
    } else if (phase === 'PLAYER_SUBMENU') {
      if (action === 'UP' || action === 'LEFT') {
        this.selectedSubMenuIndex =
          (this.selectedSubMenuIndex - 1 + this.subMenuItems.length) % this.subMenuItems.length;
        this.updateSubMenuSoulPosition();
      } else if (action === 'DOWN' || action === 'RIGHT') {
        this.selectedSubMenuIndex = (this.selectedSubMenuIndex + 1) % this.subMenuItems.length;
        this.updateSubMenuSoulPosition();
      } else if (action === 'Z') {
        this.confirmSubMenuSelection();
      } else if (action === 'X') {
        this.returnToMainMenu();
      }
    } else if (phase === 'PLAYER_TARGET') {
      if (action === 'Z') {
        this.targetMoving = false;
        this.executePlayerAttack(this.targetBarX);
      }
    } else if (phase === 'ENEMY_DIALOGUE') {
      if (action === 'Z') {
        this.advanceFromDialogueToAttack();
      }
    }
  }

  // --- LIFECYCLE & TEARDOWN MANAGEMENT ---
  public shutdown(): void {
    this.cleanupFullSceneLifecycle();
  }

  public destroy(): void {
    this.cleanupFullSceneLifecycle();
  }

  private cleanupFullSceneLifecycle(): void {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      // 1. Destroy turn manager, halt pending turn transitions and clear callbacks
      if (this.turnManager) {
        this.turnManager.destroy();
      }

      // 2. Kill all active tweens (animations, speech bubble pops, screen shakes)
      if (this.tweens) {
        this.tweens.killAll();
      }

      // 3. Clear all timers and scheduled calls
      if (this.dialogueTimerEvent) {
        this.dialogueTimerEvent.remove(false);
        this.dialogueTimerEvent = null;
      }
      if (this.victoryReturnTimer) {
        this.victoryReturnTimer.remove(false);
        this.victoryReturnTimer = null;
      }
      if (this.time) {
        this.time.removeAllEvents();
      }

      // 4. Clear active projectiles and sub-menus
      this.clearBullets();
      this.clearSubMenuItems();

      // 5. Destroy bottom action buttons and their containers
      if (this.buttons && this.buttons.length > 0) {
        this.buttons.forEach((btn) => {
          try {
            btn.label?.destroy();
            btn.container?.destroy(true);
          } catch {
            // ignore
          }
        });
        this.buttons = [];
      }

      // 6. Destroy enemy speech bubble and text
      try {
        if (this.enemySpeechText) {
          this.enemySpeechText.destroy();
        }
      } catch {
        // ignore
      }
      try {
        if (this.enemySpeechBubble) {
          this.enemySpeechBubble.destroy(true);
        }
      } catch {
        // ignore
      }

      // 7. Destroy target meter
      try {
        if (this.targetBarLine) {
          this.targetBarLine.destroy();
        }
      } catch {
        // ignore
      }
      try {
        if (this.targetMeterContainer) {
          this.targetMeterContainer.destroy(true);
        }
      } catch {
        // ignore
      }

      // 8. Destroy narrative text, turn indicator, arena box, and souls
      try {
        this.narrativeText?.destroy();
      } catch {}
      try {
        this.turnIndicatorText?.destroy();
      } catch {}
      try {
        this.battleBox?.destroy();
      } catch {}
      try {
        this.soulPlayable?.destroy();
      } catch {}
      try {
        this.soulCursor?.destroy();
      } catch {}
      try {
        this.enemySprite?.destroy();
      } catch {}

      // 9. Destroy HUD elements
      try {
        this.nameText?.destroy();
      } catch {}
      try {
        this.lvText?.destroy();
      } catch {}
      try {
        this.hpText?.destroy();
      } catch {}
      try {
        this.hpBarBg?.destroy();
      } catch {}
      try {
        this.hpBarFill?.destroy();
      } catch {}

      // 10. Destroy all remaining display objects in the scene graph to prevent ghost dialogue boxes or visual artifacts
      if (this.children) {
        this.children.removeAll(true);
      }

      // 11. Remove all input listeners and registered keys
      if (this.input) {
        if (this.input.keyboard) {
          this.input.keyboard.removeAllKeys();
        }
        this.input.removeAllListeners();
      }

      // 12. Unregister custom event listeners on the scene
      if (this.events) {
        this.events.off('virtual_action', this.handleVirtualAction, this);
      }

      // 13. Reset internal state variables
      this.targetMoving = false;
      this.targetBarX = 0;
      this.attackTimer = 0;
      this.invincibilityTimer = 0;
      this.selectedButtonIndex = 0;
      this.selectedSubMenuIndex = 0;
      this.bullets = [];
      this.subMenuItems = [];
      this.buttons = [];
      this.boxBounds = { ...BattleScene.DEFAULT_BOX_BOUNDS };
    } finally {
      this.isCleaningUp = false;
    }
  }
}

