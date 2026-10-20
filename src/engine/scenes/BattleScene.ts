import Phaser from 'phaser';
import { ENEMIES } from '../../data/defaultData';
import { soundManager } from '../../services/soundSynthesizer';
import { EnemyAct, EnemyData } from '../../types/game';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';

type BattlePhase =
  | 'INTRO'
  | 'MENU_MAIN'
  | 'MENU_ACT'
  | 'MENU_ITEM'
  | 'MENU_MERCY'
  | 'TARGET_FIGHT'
  | 'ENEMY_DIALOGUE'
  | 'ENEMY_ATTACK'
  | 'VICTORY'
  | 'GAME_OVER';

interface Bullet {
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Shape | Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  type: 'normal' | 'blue';
  customUpdate?: (time: number, delta: number) => void;
}

export class BattleScene extends Phaser.Scene {
  private enemyData!: EnemyData;
  private currentPhase: BattlePhase = 'INTRO';

  // Visual Components
  private enemySprite!: Phaser.GameObjects.Sprite;
  private enemySpeechBubble!: Phaser.GameObjects.Container;
  private enemySpeechText!: Phaser.GameObjects.Text;

  private battleBox!: Phaser.GameObjects.Graphics;
  private boxBounds = { x: 70, y: 250, w: 500, h: 140 };
  private defaultBoxBounds = { x: 70, y: 250, w: 500, h: 140 };
  private attackBoxBounds = { x: 230, y: 240, w: 180, h: 150 };

  private soulCursor!: Phaser.GameObjects.Sprite;
  private soulPlayable!: Phaser.GameObjects.Sprite;
  private targetMeterContainer!: Phaser.GameObjects.Container;
  private targetBarLine!: Phaser.GameObjects.Rectangle;
  private targetMoving = false;
  private targetBarX = 0;

  // Narration / Menu Text
  private narrativeText!: Phaser.GameObjects.Text;
  private subMenuItems: Phaser.GameObjects.Text[] = [];

  // Bottom Buttons
  private buttons: Array<{
    name: 'FIGHT' | 'ACT' | 'ITEM' | 'MERCY';
    container: Phaser.GameObjects.Container;
    label: Phaser.GameObjects.Text;
    icon: Phaser.GameObjects.Text;
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
  private attackDuration = 7000;
  private invincibilityTimer = 0;
  private soulSpeed = 160;

  // Keyboard
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

  constructor() {
    super('BattleScene');
  }

  init(data: { enemyId?: string }) {
    const enemyFactory = (data?.enemyId && ENEMIES[data.enemyId]) || ENEMIES.froggit;
    this.enemyData = enemyFactory();
    this.currentPhase = 'INTRO';
    this.selectedButtonIndex = 0;
    this.selectedSubMenuIndex = 0;
    this.bullets = [];
    this.invincibilityTimer = 0;
  }

  create() {
    SpriteGenerator.generateAllTextures(this);
    soundManager.playMusic('battle');

    // Input
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

    // 1. Draw Enemy
    this.enemySprite = this.add.sprite(320, 130, this.enemyData.spriteKey);
    this.enemySprite.setDepth(10);
    this.tweens.add({
      targets: this.enemySprite,
      y: 125,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 2. Enemy Speech Bubble
    this.enemySpeechBubble = this.add.container(420, 90);
    this.enemySpeechBubble.setDepth(15);
    this.enemySpeechBubble.setVisible(false);

    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xffffff, 1);
    bubbleBg.fillRoundedRect(0, 0, 170, 60, 8);
    // Bubble pointer
    bubbleBg.fillTriangle(0, 20, -10, 25, 0, 30);
    this.enemySpeechBubble.add(bubbleBg);

    this.enemySpeechText = this.add.text(12, 10, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#000000',
      wordWrap: { width: 145 },
      lineSpacing: 4,
    });
    this.enemySpeechBubble.add(this.enemySpeechText);

    // 3. Battle Box
    this.battleBox = this.add.graphics();
    this.battleBox.setDepth(5);
    this.redrawBattleBox(this.defaultBoxBounds);

    // 4. Narrative / Menu Text inside Box
    this.narrativeText = this.add.text(90, 265, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffffff',
      wordWrap: { width: 460 },
      lineSpacing: 10,
    });
    this.narrativeText.setDepth(8);

    // 5. Soul in Bullet Hell mode
    this.soulPlayable = this.add.sprite(320, 310, 'soul_red');
    this.soulPlayable.setDepth(20);
    this.soulPlayable.setVisible(false);

    // 6. Soul Cursor for Menu navigation
    this.soulCursor = this.add.sprite(80, 442, 'soul_red');
    this.soulCursor.setDepth(25);

    // 7. Target Meter Container (FIGHT mini-game)
    this.createTargetMeter();

    // 8. Bottom HUD Stats (Name, LV, HP bar)
    this.createHUD();

    // 9. Bottom 4 Buttons (FIGHT, ACT, ITEM, MERCY)
    this.createButtons();

    // Start with Intro message
    this.narrativeText.setText(this.enemyData.introText);
    this.currentPhase = 'MENU_MAIN';
    this.updateButtonSoulPosition();

    // Listen to virtual action triggers
    this.events.on('virtual_action', this.handleVirtualAction, this);
  }

  private redrawBattleBox(bounds: { x: number; y: number; w: number; h: number }) {
    this.boxBounds = bounds;
    this.battleBox.clear();
    // Black background
    this.battleBox.fillStyle(0x000000, 1);
    this.battleBox.fillRect(bounds.x, bounds.y, bounds.w, bounds.h);
    // 5px White crisp border
    this.battleBox.lineStyle(5, 0xffffff, 1);
    this.battleBox.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
  }

  private createTargetMeter() {
    this.targetMeterContainer = this.add.container(320, 320);
    this.targetMeterContainer.setDepth(12);
    this.targetMeterContainer.setVisible(false);

    const meterBg = this.add.image(0, 0, 'target_meter');
    this.targetMeterContainer.add(meterBg);

    // Moving strike bar
    this.targetBarLine = this.add.rectangle(-220, 0, 12, 100, 0xffffff, 1);
    this.targetMeterContainer.add(this.targetBarLine);
  }

  private createHUD() {
    const stats = gameState.getStats();

    this.nameText = this.add.text(70, 400, stats.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    });
    this.nameText.setDepth(15);

    this.lvText = this.add.text(190, 400, `LV ${stats.lv}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '14px',
      color: '#ffffff',
    });
    this.lvText.setDepth(15);

    const hpLabel = this.add.text(280, 402, 'HP', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffffff',
    });
    hpLabel.setDepth(15);

    // HP Bar
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

      // Button background border (Undertale orange border)
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

      // Mouse click support on buttons
      container.setSize(104, 36);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => {
        if (this.currentPhase === 'MENU_MAIN') {
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
        icon: label,
      });
    });
  }

  private updateButtonSoulPosition() {
    if (this.currentPhase === 'MENU_MAIN') {
      const btn = this.buttons[this.selectedButtonIndex];
      this.soulCursor.setVisible(true);
      this.soulCursor.setPosition(btn.container.x - 42, btn.container.y);

      this.buttons.forEach((b, i) => {
        const isSelected = i === this.selectedButtonIndex;
        b.label.setColor(isSelected ? '#ffff00' : '#e67e22');
      });
    }
  }

  update(time: number, delta: number) {
    if (this.currentPhase === 'MENU_MAIN') {
      this.handleMainMenuInput();
    } else if (
      this.currentPhase === 'MENU_ACT' ||
      this.currentPhase === 'MENU_ITEM' ||
      this.currentPhase === 'MENU_MERCY'
    ) {
      this.handleSubMenuInput();
    } else if (this.currentPhase === 'TARGET_FIGHT') {
      this.handleTargetMeter(delta);
    } else if (this.currentPhase === 'ENEMY_ATTACK') {
      this.handleBulletHell(time, delta);
    }
  }

  private handleMainMenuInput() {
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

  // --- 1. FIGHT TARGET MINIGAME ---
  private startFightTarget() {
    this.currentPhase = 'TARGET_FIGHT';
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
    const distFromCenter = Math.abs(finalX);
    const stats = gameState.getStats();
    const weaponBonus = stats.weapon.value;
    const baseAtk = stats.atk + weaponBonus;

    let damage = 0;
    let isCritical = false;

    if (distFromCenter < 20) {
      // CRITICAL HIT!
      damage = Math.floor(baseAtk * 2.2);
      isCritical = true;
    } else if (distFromCenter < 80) {
      damage = Math.floor(baseAtk * 1.5);
    } else if (distFromCenter < 160) {
      damage = Math.floor(baseAtk * 1.0);
    } else {
      damage = Math.max(1, Math.floor(baseAtk * 0.4));
    }

    // Play Slash FX
    soundManager.playSlash();
    const slash = this.add.sprite(this.enemySprite.x, this.enemySprite.y, 'fx_slash');
    slash.setDepth(30);

    // Enemy Shake
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
      onComplete: () => {
        slash.destroy();
      },
    });

    // Damage Number Popup
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
      onComplete: () => {
        dmgText.destroy();
      },
    });

    this.enemyData.hp = Math.max(0, this.enemyData.hp - damage);

    this.time.delayedCall(1200, () => {
      this.targetMeterContainer.setVisible(false);
      this.narrativeText.setVisible(true);

      if (this.enemyData.hp <= 0) {
        this.handleEnemyDefeated();
      } else {
        this.startEnemyTurn();
      }
    });
  }

  // --- 2. ACT SUB-MENU ---
  private openActSubMenu() {
    this.currentPhase = 'MENU_ACT';
    this.narrativeText.setVisible(false);
    this.clearSubMenuItems();

    // Render acts in 2 columns
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
        this.selectedSubMenuIndex = idx;
        this.confirmSubMenuSelection();
      });
      this.subMenuItems.push(text);
    });

    this.updateSubMenuSoulPosition();
  }

  // --- 3. ITEM SUB-MENU ---
  private openItemSubMenu() {
    this.currentPhase = 'MENU_ITEM';
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
        this.selectedSubMenuIndex = idx;
        this.confirmSubMenuSelection();
      });
      this.subMenuItems.push(text);
    });

    this.updateSubMenuSoulPosition();
  }

  // --- 4. MERCY SUB-MENU ---
  private openMercySubMenu() {
    this.currentPhase = 'MENU_MERCY';
    this.narrativeText.setVisible(false);
    this.clearSubMenuItems();

    this.selectedSubMenuIndex = 0;
    const canSpare = this.enemyData.mercyProgress >= 100;

    // Option 1: Poupar (Yellow if ready!)
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
      this.selectedSubMenuIndex = 0;
      this.confirmSubMenuSelection();
    });
    this.subMenuItems.push(spareText);

    // Option 2: Fugir
    const fleeText = this.add.text(120, 325, '* Fugir do combate', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#ffffff',
    });
    fleeText.setDepth(10);
    fleeText.setInteractive({ useHandCursor: true });
    fleeText.on('pointerdown', () => {
      this.selectedSubMenuIndex = 1;
      this.confirmSubMenuSelection();
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
      // Go back to main menu
      soundManager.playMenuSelect();
      this.returnToMainMenu();
    }
  }

  private returnToMainMenu() {
    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText(this.enemyData.introText);
    this.currentPhase = 'MENU_MAIN';
    this.updateButtonSoulPosition();
  }

  private confirmSubMenuSelection() {
    if (this.currentPhase === 'MENU_ACT') {
      const act = this.enemyData.acts[this.selectedSubMenuIndex];
      if (act) {
        this.executeAct(act);
      }
    } else if (this.currentPhase === 'MENU_ITEM') {
      const stats = gameState.getStats();
      const item = stats.inventory[this.selectedSubMenuIndex];
      if (item) {
        const res = gameState.useItem(this.selectedSubMenuIndex);
        this.refreshHUD();
        this.clearSubMenuItems();
        this.narrativeText.setVisible(true);
        this.narrativeText.setText(res.message);
        this.soulCursor.setVisible(false);

        this.time.delayedCall(1600, () => {
          this.startEnemyTurn();
        });
      } else {
        this.returnToMainMenu();
      }
    } else if (this.currentPhase === 'MENU_MERCY') {
      if (this.selectedSubMenuIndex === 0) {
        // Spare attempt
        if (this.enemyData.mercyProgress >= 100) {
          this.handleEnemySpared();
        } else {
          this.clearSubMenuItems();
          this.narrativeText.setVisible(true);
          this.narrativeText.setText(`* O nome de ${this.enemyData.name} ainda não é amarelo. Ele ainda quer lutar!`);
          this.soulCursor.setVisible(false);
          this.time.delayedCall(1600, () => {
            this.startEnemyTurn();
          });
        }
      } else {
        // Flee attempt
        this.handleFlee();
      }
    }
  }

  private executeAct(act: EnemyAct) {
    this.enemyData.mercyProgress = Math.min(100, this.enemyData.mercyProgress + act.mercyGain);
    if (this.enemyData.mercyProgress >= 100) {
      this.enemyData.canSpare = true;
    }

    if (act.specialAction === 'DEF_DOWN') {
      this.enemyData.def = Math.max(0, this.enemyData.def - 2);
    }

    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText(act.resultText);
    this.soulCursor.setVisible(false);

    // Show enemy speech reply
    this.showEnemySpeech(act.enemyReply);

    this.time.delayedCall(2000, () => {
      this.hideEnemySpeech();
      this.startEnemyTurn();
    });
  }

  private showEnemySpeech(text: string) {
    this.enemySpeechText.setText(text);
    this.enemySpeechBubble.setVisible(true);
    soundManager.playVoiceBlip('monster');
  }

  private hideEnemySpeech() {
    this.enemySpeechBubble.setVisible(false);
  }

  // --- 5. ENEMY ATTACK & BULLET HELL PHASE ---
  private startEnemyTurn() {
    this.currentPhase = 'ENEMY_ATTACK';
    this.narrativeText.setVisible(false);
    this.soulCursor.setVisible(false);
    this.bullets = [];
    this.attackTimer = 0;

    // Pick random banter dialogue
    const randomLine =
      this.enemyData.dialogueLines[
        Math.floor(Math.random() * this.enemyData.dialogueLines.length)
      ];
    this.showEnemySpeech(randomLine);

    this.time.delayedCall(1200, () => {
      this.hideEnemySpeech();

      // Smoothly resize box to bullet-hell arena
      this.tweens.add({
        targets: this.boxBounds,
        x: this.attackBoxBounds.x,
        y: this.attackBoxBounds.y,
        w: this.attackBoxBounds.w,
        h: this.attackBoxBounds.h,
        duration: 300,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          this.redrawBattleBox(this.boxBounds);
        },
        onComplete: () => {
          this.soulPlayable.setPosition(
            this.attackBoxBounds.x + this.attackBoxBounds.w / 2,
            this.attackBoxBounds.y + this.attackBoxBounds.h / 2
          );
          this.soulPlayable.setVisible(true);
          this.spawnAttackWave();
        },
      });
    });
  }

  private spawnAttackWave() {
    const pattern =
      this.enemyData.bulletPatterns[
        Math.floor(Math.random() * this.enemyData.bulletPatterns.length)
      ];

    if (pattern === 'froggit_hops' || pattern === 'froggit_flies') {
      // Froggit Flies and jumping frogs
      for (let i = 0; i < 6; i++) {
        this.time.delayedCall(i * 900, () => {
          if (this.currentPhase !== 'ENEMY_ATTACK') return;
          const fromLeft = Math.random() > 0.5;
          const fly = this.add.sprite(
            fromLeft ? this.boxBounds.x + 10 : this.boxBounds.x + this.boxBounds.w - 10,
            this.boxBounds.y + 20 + Math.random() * (this.boxBounds.h - 40),
            'bullet_fly'
          );
          fly.setDepth(15);
          this.bullets.push({
            sprite: fly,
            vx: (fromLeft ? 1 : -1) * (60 + Math.random() * 40),
            vy: (Math.random() - 0.5) * 40,
            type: 'normal',
          });
        });
      }
    } else if (pattern === 'bone_slider' || pattern === 'bone_wave') {
      // Bone sliders across the box floor
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 1100, () => {
          if (this.currentPhase !== 'ENEMY_ATTACK') return;
          const bone = this.add.sprite(
            this.boxBounds.x + this.boxBounds.w + 10,
            this.boxBounds.y + this.boxBounds.h - 18,
            'bullet_bone'
          );
          bone.setDepth(15);
          this.bullets.push({
            sprite: bone,
            vx: -90,
            vy: 0,
            type: 'normal',
          });
        });
      }
    } else if (pattern === 'blue_attack') {
      // Blue bones: Stay still to dodge!
      this.time.delayedCall(500, () => {
        if (this.currentPhase !== 'ENEMY_ATTACK') return;
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
    } else {
      // Chaos stars pattern (Deltajester style)
      for (let i = 0; i < 8; i++) {
        this.time.delayedCall(i * 700, () => {
          if (this.currentPhase !== 'ENEMY_ATTACK') return;
          const angle = Math.random() * Math.PI * 2;
          const star = this.add.sprite(
            this.boxBounds.x + this.boxBounds.w / 2 + Math.cos(angle) * 110,
            this.boxBounds.y + this.boxBounds.h / 2 + Math.sin(angle) * 110,
            'bullet_star'
          );
          star.setDepth(15);
          this.bullets.push({
            sprite: star,
            vx: -Math.cos(angle) * 80,
            vy: -Math.sin(angle) * 80,
            type: 'normal',
          });
        });
      }
    }
  }

  private handleBulletHell(_: number, delta: number) {
    this.attackTimer += delta;

    // 1. Move Playable Soul
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

      // Clamp inside arena box
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

    // 2. Invincibility flash decay
    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= delta;
      this.soulPlayable.setAlpha(Math.floor(this.invincibilityTimer / 100) % 2 === 0 ? 0.3 : 1);
    } else {
      this.soulPlayable.setAlpha(1);
    }

    // 3. Update Bullets and Collision
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.sprite.x += b.vx * (delta / 1000);
      b.sprite.y += b.vy * (delta / 1000);

      if (b.customUpdate) {
        b.customUpdate(0, delta);
      }

      // Check collision with player soul
      const dist = Phaser.Math.Distance.Between(
        this.soulPlayable.x,
        this.soulPlayable.y,
        b.sprite.x,
        b.sprite.y
      );

      if (dist < 14 && this.invincibilityTimer <= 0) {
        // If it's a BLUE attack and player is NOT moving, player takes NO damage!
        if (b.type === 'blue' && !isSoulMoving) {
          // Dodged blue attack successfully!
        } else {
          this.handleSoulHit();
        }
      }

      // Remove off-screen bullets
      if (
        b.sprite.x < this.boxBounds.x - 40 ||
        b.sprite.x > this.boxBounds.x + this.boxBounds.w + 40 ||
        b.sprite.y < this.boxBounds.y - 40 ||
        b.sprite.y > this.boxBounds.y + this.boxBounds.h + 40
      ) {
        b.sprite.destroy();
        this.bullets.splice(i, 1);
      }
    }

    // 4. Check Turn End
    if (this.attackTimer >= this.attackDuration) {
      this.endEnemyTurn();
    }
  }

  private handleSoulHit() {
    soundManager.playHurt();
    this.invincibilityTimer = 1100;

    const isDead = gameState.takeDamage(this.enemyData.atk);
    this.refreshHUD();

    this.cameras.main.shake(150, 0.015);

    if (isDead) {
      this.handleGameOver();
    }
  }

  private endEnemyTurn() {
    // Clear remaining bullets
    this.bullets.forEach((b) => b.sprite.destroy());
    this.bullets = [];
    this.soulPlayable.setVisible(false);

    // Expand box back to default wide menu size
    this.tweens.add({
      targets: this.boxBounds,
      x: this.defaultBoxBounds.x,
      y: this.defaultBoxBounds.y,
      w: this.defaultBoxBounds.w,
      h: this.defaultBoxBounds.h,
      duration: 300,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.redrawBattleBox(this.boxBounds);
      },
      onComplete: () => {
        this.currentPhase = 'MENU_MAIN';
        this.narrativeText.setVisible(true);
        this.narrativeText.setText(
          this.enemyData.canSpare
            ? `* ${this.enemyData.name} parece pronto para ser poupado!`
            : `* ${this.enemyData.name} ainda está cheio de energia.`
        );
        this.updateButtonSoulPosition();
      },
    });
  }

  // --- 6. OUTCOMES (DEFEAT / SPARE / FLEE / GAME OVER) ---
  private handleEnemyDefeated() {
    this.currentPhase = 'VICTORY';
    soundManager.stopMusic();

    // Turn enemy into dust
    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0,
      y: this.enemySprite.y + 20,
      duration: 1000,
      onComplete: () => {
        this.enemySprite.destroy();
      },
    });

    gameState.recordVictory(false);
    const rewards = gameState.addRewards(this.enemyData.expReward, this.enemyData.goldReward);
    this.refreshHUD();

    let msg = `* VOCÊ VENCEU!\n* Ganhou ${this.enemyData.expReward} EXP e ${this.enemyData.goldReward} Ouro.`;
    if (rewards.leveledUp) {
      soundManager.playSave();
      msg += `\n* SEU LOVE AUMENTOU PARA LV ${rewards.newLv}!`;
    }

    this.narrativeText.setText(msg);

    this.time.delayedCall(3000, () => {
      this.scene.start('OverworldScene');
    });
  }

  private handleEnemySpared() {
    this.currentPhase = 'VICTORY';
    soundManager.playSpare();
    gameState.recordVictory(true);
    gameState.addRewards(0, this.enemyData.goldReward);
    this.refreshHUD();

    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText(
      `* VOCÊ POUPOU ${this.enemyData.name}!\n* Ganhou ${this.enemyData.goldReward} Ouro e 0 EXP.\n* Sua bondade ressoa nas Ruínas.`
    );

    // Enemy fades out peacefully
    this.tweens.add({
      targets: this.enemySprite,
      alpha: 0.1,
      duration: 1200,
    });

    this.time.delayedCall(3000, () => {
      this.scene.start('OverworldScene');
    });
  }

  private handleFlee() {
    soundManager.playMenuMove();
    this.clearSubMenuItems();
    this.narrativeText.setVisible(true);
    this.narrativeText.setText('* Você escapou em segurança!');

    this.time.delayedCall(1500, () => {
      this.scene.start('OverworldScene');
    });
  }

  private handleGameOver() {
    this.currentPhase = 'GAME_OVER';
    soundManager.stopMusic();

    // Soul cracks animation
    this.soulPlayable.setTexture('soul_white');
    this.time.delayedCall(300, () => {
      this.soulPlayable.setVisible(false);
      this.cameras.main.fade(1500, 0, 0, 0);
      this.time.delayedCall(1600, () => {
        // Show Game Over prompt
        const overTitle = this.add.text(320, 200, 'GAME OVER', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '28px',
          color: '#ffffff',
        });
        overTitle.setOrigin(0.5);

        const quote = this.add.text(
          320,
          270,
          'Você não pode desistir agora...\n\nMantenha sua DETERMINAÇÃO!',
          {
            fontFamily: '"Press Start 2P", monospace',
            fontSize: '12px',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 10,
          }
        );
        quote.setOrigin(0.5);

        const retry = this.add.text(320, 370, '[ Pressione Z para Tentar Novamente ]', {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: '11px',
          color: '#ffff00',
        });
        retry.setOrigin(0.5);

        this.input.keyboard!.once('keydown-Z', () => {
          gameState.restoreFullHp();
          this.scene.start('OverworldScene');
        });
        this.input.keyboard!.once('keydown-ENTER', () => {
          gameState.restoreFullHp();
          this.scene.start('OverworldScene');
        });
      });
    });
  }

  private handleVirtualAction(action: string) {
    if (this.currentPhase === 'MENU_MAIN') {
      if (action === 'LEFT') {
        this.selectedButtonIndex = (this.selectedButtonIndex - 1 + 4) % 4;
        this.updateButtonSoulPosition();
      } else if (action === 'RIGHT') {
        this.selectedButtonIndex = (this.selectedButtonIndex + 1) % 4;
        this.updateButtonSoulPosition();
      } else if (action === 'Z') {
        this.confirmMainMenuSelection();
      }
    } else if (
      this.currentPhase === 'MENU_ACT' ||
      this.currentPhase === 'MENU_ITEM' ||
      this.currentPhase === 'MENU_MERCY'
    ) {
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
    } else if (this.currentPhase === 'TARGET_FIGHT') {
      if (action === 'Z') {
        this.targetMoving = false;
        this.executePlayerAttack(this.targetBarX);
      }
    }
  }
}
