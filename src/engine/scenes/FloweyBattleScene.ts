import Phaser from 'phaser';
import { soundManager } from '../../services/soundSynthesizer';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';

type FloweyPhase =
  | 'INTRO_SPEECH'
  | 'PELLETS_SPAWN'
  | 'HIT_REVEAL'
  | 'CIRCLE_OF_DEATH'
  | 'TORIEL_RESCUE'
  | 'COMPLETE';

export class FloweyBattleScene extends Phaser.Scene {
  private floweySprite!: Phaser.GameObjects.Sprite;
  private soulPlayable!: Phaser.GameObjects.Sprite;
  private battleBox!: Phaser.GameObjects.Graphics;
  private speechContainer!: Phaser.GameObjects.Container;
  private speechText!: Phaser.GameObjects.Text;

  private hpText!: Phaser.GameObjects.Text;
  private hpBarFill!: Phaser.GameObjects.Rectangle;

  private currentPhase: FloweyPhase = 'INTRO_SPEECH';
  private pellets: Phaser.GameObjects.Sprite[] = [];
  private circlePellets: Phaser.GameObjects.Sprite[] = [];

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    Z: Phaser.Input.Keyboard.Key;
    ENTER: Phaser.Input.Keyboard.Key;
  };

  private boxBounds = { x: 230, y: 240, w: 180, h: 140 };

  constructor() {
    super('FloweyBattleScene');
  }

  create() {
    SpriteGenerator.generateAllTextures(this);
    soundManager.playMusic('battle');

    this.currentPhase = 'INTRO_SPEECH';
    this.pellets = [];
    this.circlePellets = [];

    // Controls
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      Z: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z),
      ENTER: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER),
    };

    // 1. Flowey Sprite at top center
    this.floweySprite = this.add.sprite(320, 130, 'flowey_friendly');
    this.floweySprite.setScale(1.4);
    this.floweySprite.setDepth(10);

    // 2. Battle Box
    this.battleBox = this.add.graphics();
    this.battleBox.setDepth(5);
    this.battleBox.fillStyle(0x000000, 1);
    this.battleBox.fillRect(this.boxBounds.x, this.boxBounds.y, this.boxBounds.w, this.boxBounds.h);
    this.battleBox.lineStyle(5, 0xffffff, 1);
    this.battleBox.strokeRect(this.boxBounds.x, this.boxBounds.y, this.boxBounds.w, this.boxBounds.h);

    // 3. Playable Soul (Red Heart)
    this.soulPlayable = this.add.sprite(320, 310, 'soul_red');
    this.soulPlayable.setDepth(20);

    // 4. Speech Bubble
    this.speechContainer = this.add.container(400, 60);
    this.speechContainer.setDepth(30);

    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xffffff, 1);
    bubbleBg.fillRoundedRect(0, 0, 200, 70, 8);
    bubbleBg.fillTriangle(0, 24, -12, 30, 0, 36);
    this.speechContainer.add(bubbleBg);

    this.speechText = this.add.text(12, 10, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#000000',
      wordWrap: { width: 175 },
      lineSpacing: 4,
    });
    this.speechContainer.add(this.speechText);

    // 5. Bottom HUD
    const stats = gameState.getStats();
    this.add.text(200, 410, `${stats.name}  LV 1  HP`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffffff',
    });

    const hpBg = this.add.rectangle(350, 416, 80, 12, 0xc0392b);
    hpBg.setOrigin(0, 0.5);

    this.hpBarFill = this.add.rectangle(350, 416, 80, 12, 0xf1c40f);
    this.hpBarFill.setOrigin(0, 0.5);

    this.hpText = this.add.text(440, 410, '20 / 20', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffffff',
    });

    // Start Flowey's Speech Sequence
    this.runIntroSequence();

    // Virtual action support
    this.events.on('virtual_action', this.handleVirtualAction, this);
    this.events.once('shutdown', () => {
      this.events.off('virtual_action', this.handleVirtualAction, this);
    });
  }

  private runIntroSequence() {
    const lines = [
      'Vê aquele coração?\nEssa é a sua ALMA!',
      'Sua alma começa fraca, mas cresce com LOVE!',
      'Você quer um pouco de LOVE, não quer?',
      'Aqui, LOVE é dividido por "pétalas da amizade"!',
      'Mova-se! Pegue as pétalas para curar!',
    ];

    let current = 0;
    const showNext = () => {
      if (current < lines.length) {
        soundManager.playVoiceBlip('flowey');
        this.speechText.setText(lines[current]);
        current++;
        this.time.delayedCall(2200, showNext);
      } else {
        this.speechContainer.setVisible(false);
        this.spawnFriendlinessPellets();
      }
    };

    this.time.delayedCall(400, showNext);
  }

  private spawnFriendlinessPellets() {
    this.currentPhase = 'PELLETS_SPAWN';

    // 5 white rotating friendliness pellets falling down towards soul
    for (let i = 0; i < 5; i++) {
      const pellet = this.add.sprite(
        this.boxBounds.x + 30 + i * 30,
        this.boxBounds.y + 15,
        'bullet_pellet'
      );
      pellet.setDepth(15);
      this.pellets.push(pellet);
    }
  }

  update(_: number, delta: number) {
    if (this.currentPhase === 'PELLETS_SPAWN') {
      this.handleSoulMovement(delta);

      // Move pellets downward
      this.pellets.forEach((p) => {
        p.y += 45 * (delta / 1000);
        p.rotation += 0.05;

        // Check touch
        const dist = Phaser.Math.Distance.Between(
          this.soulPlayable.x,
          this.soulPlayable.y,
          p.x,
          p.y
        );

        if (dist < 16) {
          this.triggerPelletHit();
        }
      });
    } else if (this.currentPhase === 'CIRCLE_OF_DEATH') {
      this.handleSoulMovement(delta);
    }
  }

  private handleSoulMovement(delta: number) {
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

    if (vx !== 0 || vy !== 0) {
      const len = Math.sqrt(vx * vx + vy * vy);
      vx /= len;
      vy /= len;

      this.soulPlayable.x += vx * 140 * (delta / 1000);
      this.soulPlayable.y += vy * 140 * (delta / 1000);

      this.soulPlayable.x = Phaser.Math.Clamp(
        this.soulPlayable.x,
        this.boxBounds.x + 15,
        this.boxBounds.x + this.boxBounds.w - 15
      );
      this.soulPlayable.y = Phaser.Math.Clamp(
        this.soulPlayable.y,
        this.boxBounds.y + 15,
        this.boxBounds.y + this.boxBounds.h - 15
      );
    }
  }

  private triggerPelletHit() {
    this.currentPhase = 'HIT_REVEAL';
    soundManager.stopMusic();
    soundManager.playHurt();

    // Clear falling pellets
    this.pellets.forEach((p) => p.destroy());
    this.pellets = [];

    // Player HP drops to 1!
    const stats = gameState.getStats();
    stats.hp = 1;
    this.hpText.setText('01 / 20');
    this.hpBarFill.width = 4;

    this.cameras.main.shake(200, 0.02);

    // Flowey's face twists into the EVIL face!
    this.floweySprite.setTexture('flowey_evil');
    this.speechContainer.setVisible(true);
    soundManager.playVoiceBlip('monster');
    this.speechText.setText('SEU IDIOTA.\n\nNeste mundo, é MATAR ou SER MORTO!');

    this.time.delayedCall(2200, () => {
      this.triggerCircleOfDeath();
    });
  }

  private triggerCircleOfDeath() {
    this.currentPhase = 'CIRCLE_OF_DEATH';
    soundManager.playVoiceBlip('monster');
    this.speechText.setText('Por que alguém perderia uma chance como esta?!\n\nMORRA!');

    // Spawn inescapable ring of pellets surrounding the heart
    const pelletCount = 14;
    const radius = 60;
    this.circlePellets = [];

    for (let i = 0; i < pelletCount; i++) {
      const angle = (i / pelletCount) * Math.PI * 2;
      const px = this.soulPlayable.x + Math.cos(angle) * radius;
      const py = this.soulPlayable.y + Math.sin(angle) * radius;
      const p = this.add.sprite(px, py, 'bullet_pellet');
      p.setDepth(15);
      this.circlePellets.push(p);
    }

    // Shrink ring inward slowly
    this.tweens.add({
      targets: this.circlePellets,
      x: this.soulPlayable.x,
      y: this.soulPlayable.y,
      duration: 2500,
      ease: 'Sine.easeIn',
    });

    // Right before impact: Toriel's fireball rescue!
    this.time.delayedCall(1900, () => {
      this.triggerTorielRescue();
    });
  }

  private triggerTorielRescue() {
    this.currentPhase = 'TORIEL_RESCUE';

    // Clear circle pellets
    this.circlePellets.forEach((p) => p.destroy());
    this.circlePellets = [];

    // Toriel's fireball launches from the right side!
    soundManager.playSlash();
    const fireball = this.add.sprite(640, 130, 'fx_fireball');
    fireball.setScale(1.5);
    fireball.setDepth(50);

    this.tweens.add({
      targets: fireball,
      x: this.floweySprite.x,
      duration: 300,
      onComplete: () => {
        soundManager.playHurt();
        this.cameras.main.shake(150, 0.02);
        fireball.destroy();

        // Flowey gets scorched and knocked away spinning!
        this.floweySprite.setTexture('flowey_hurt');
        this.tweens.add({
          targets: this.floweySprite,
          x: -100,
          y: -50,
          rotation: -Math.PI * 3,
          duration: 900,
          onComplete: () => {
            this.floweySprite.destroy();
          },
        });

        // Toriel enters from the right
        this.time.delayedCall(800, () => {
          this.torielEnters();
        });
      },
    });
  }

  private torielEnters() {
    const toriel = this.add.sprite(520, 130, 'npc_toriel');
    toriel.setScale(1.6);
    toriel.setDepth(20);

    this.tweens.add({
      targets: toriel,
      x: 320,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        soundManager.playVoiceBlip('toriel');
        this.speechContainer.setVisible(true);
        this.speechContainer.setPosition(390, 60);
        this.speechText.setText(
          'Que criatura terrível, torturando uma alma inocente...\n\nNão tenha medo, minha criança.'
        );

        // Restore HP
        gameState.restoreFullHp();
        soundManager.playSave();
        this.hpText.setText('20 / 20');
        this.hpBarFill.width = 80;

        this.time.delayedCall(3000, () => {
          this.speechText.setText(
            'Eu sou TORIEL, guardiã das Ruínas.\n\nVenha, vou guiar você pelo Subterrâneo!'
          );

          this.time.delayedCall(3000, () => {
            // Mark flowey met and transition to Toriel's entrance room
            gameState.setFlag('flowey_met', true);
            gameState.setCurrentRoom('room_toriel_entrance', 320, 340);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('OverworldScene');
            });
          });
        });
      },
    });
  }

  private handleVirtualAction(act: string) {
    if (this.currentPhase === 'PELLETS_SPAWN') {
      if (act === 'UP') this.soulPlayable.y -= 10;
      else if (act === 'DOWN') this.soulPlayable.y += 10;
      else if (act === 'LEFT') this.soulPlayable.x -= 10;
      else if (act === 'RIGHT') this.soulPlayable.x += 10;
    }
  }
}
