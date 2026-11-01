import Phaser from 'phaser';
import { soundManager } from '../../services/soundSynthesizer';
import { combatLogManager } from '../combatLogManager';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';
import { triggerScreenShake } from '../utils/screenShake';

type FloweyPhase =
  | 'INTRO_SPEECH'
  | 'PELLETS_SPAWN'
  | 'DODGE_DIALOGUE'
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
  private isSoulLocked = true;
  private pellets: Phaser.GameObjects.Sprite[] = [];
  private circlePellets: Phaser.GameObjects.Sprite[] = [];

  private dodgeCount = 0;
  private dodgeTimerEvent: Phaser.Time.TimerEvent | null = null;
  private waveTimeoutEvent: Phaser.Time.TimerEvent | null = null;

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
    gameState.setActiveScene('FloweyBattleScene');
    gameState.recordEncounter('flowey');
    SpriteGenerator.generateAllTextures(this);
    soundManager.playMusic('battle');

    combatLogManager.clearLog();
    combatLogManager.addEntry({
      turn: 1,
      source: 'system',
      actionType: 'intro',
      actor: 'Flowey',
      title: 'Encontro com Flowey!',
      description: '* Olá! Eu sou FLOWEY. FLOWEY a FLOR!',
      reaction: '* Uma flor dourada com um sorriso amigável se aproxima da sua Alma.',
    });

    this.currentPhase = 'INTRO_SPEECH';
    this.isSoulLocked = true;
    this.pellets = [];
    this.circlePellets = [];
    this.dodgeCount = 0;
    this.dodgeTimerEvent = null;
    this.waveTimeoutEvent = null;

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

    // 3. Playable Soul (Red Heart) - Starts completely immobile in the center
    this.soulPlayable = this.add.sprite(320, 310, 'soul_red');
    this.soulPlayable.setDepth(20);

    // Subtle heart intro pulse to emphasize its presence upon entering battle
    this.tweens.add({
      targets: this.soulPlayable,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 350,
      yoyo: true,
      repeat: 1,
    });

    // 4. Speech Bubble
    this.speechContainer = this.add.container(400, 50);
    this.speechContainer.setDepth(30);

    const bubbleBg = this.add.graphics();
    bubbleBg.fillStyle(0xffffff, 1);
    bubbleBg.fillRoundedRect(0, 0, 220, 80, 8);
    bubbleBg.fillTriangle(0, 28, -12, 34, 0, 40);
    this.speechContainer.add(bubbleBg);

    this.speechText = this.add.text(12, 10, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#000000',
      wordWrap: { width: 195 },
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

    // Allow clicking or pressing Z/ENTER/SPACE to advance speeches faster
    const onKeyAdvance = () => {
      if (this.currentPhase === 'INTRO_SPEECH') {
        this.advanceSpeechFast();
      } else if (this.currentPhase === 'TORIEL_RESCUE') {
        this.advanceTorielSpeech();
      } else if (this.currentPhase === 'DODGE_DIALOGUE') {
        this.advanceDodgeDialogue();
      }
    };
    this.input.keyboard?.on('keydown-Z', onKeyAdvance);
    this.input.keyboard?.on('keydown-ENTER', onKeyAdvance);
    this.input.keyboard?.on('keydown-SPACE', onKeyAdvance);

    // Mouse / Touch drag inside battle box
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.currentPhase === 'INTRO_SPEECH') {
        this.advanceSpeechFast();
      } else if (this.currentPhase === 'TORIEL_RESCUE') {
        this.advanceTorielSpeech();
      } else if (this.currentPhase === 'DODGE_DIALOGUE') {
        this.advanceDodgeDialogue();
      } else {
        this.handlePointerSoulMove(p);
      }
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) {
        this.handlePointerSoulMove(p);
      }
    });

    // Virtual action support
    this.events.on('virtual_action', this.handleVirtualAction, this);
    this.events.once('shutdown', () => {
      this.input.keyboard?.off('keydown-Z', onKeyAdvance);
      this.input.keyboard?.off('keydown-ENTER', onKeyAdvance);
      this.input.keyboard?.off('keydown-SPACE', onKeyAdvance);
      this.events.off('virtual_action', this.handleVirtualAction, this);
      if (this.introTimerEvent) this.introTimerEvent.remove();
      if (this.dodgeTimerEvent) this.dodgeTimerEvent.remove();
      if (this.waveTimeoutEvent) this.waveTimeoutEvent.remove();
      if (this.torielTimerEvent) this.torielTimerEvent.remove();
    });
  }

  private handlePointerSoulMove(pointer: Phaser.Input.Pointer) {
    if (this.isSoulLocked) return;
    if (this.currentPhase === 'PELLETS_SPAWN') {
      this.soulPlayable.x = Phaser.Math.Clamp(
        pointer.x,
        this.boxBounds.x + 15,
        this.boxBounds.x + this.boxBounds.w - 15
      );
      this.soulPlayable.y = Phaser.Math.Clamp(
        pointer.y,
        this.boxBounds.y + 15,
        this.boxBounds.y + this.boxBounds.h - 15
      );
    }
  }

  private introCurrentIndex = 0;
  private introTimerEvent: Phaser.Time.TimerEvent | null = null;
  private introLines = [
    'Vê aquele coração?\nEssa é a sua ALMA, a própria culminação do seu ser!',
    'Sua ALMA começa fraca, mas pode ficar forte se você conseguir muito LV.',
    'O que LV significa? Ora, LOVE, é claro!',
    'Você quer um pouco de LOVE, não quer?',
    'Não se preocupe, eu vou compartilhar um pouco com você!',
    'Aqui embaixo, LOVE é compartilhado através de... pequenas... "balinhas da amizade"!',
    'Você está pronto?\nMova-se! Pegue o máximo que puder!',
  ];

  private advanceSpeechFast() {
    if (this.currentPhase !== 'INTRO_SPEECH') return;
    if (this.introTimerEvent) {
      this.introTimerEvent.remove();
      this.introTimerEvent = null;
    }
    this.showNextSpeechLine();
  }

  private showNextSpeechLine() {
    if (this.introCurrentIndex < this.introLines.length) {
      soundManager.playVoiceBlip('flowey');
      const text = this.introLines[this.introCurrentIndex];
      this.speechText.setText(text);
      this.introCurrentIndex++;

      combatLogManager.addEntry({
        turn: 1,
        source: 'enemy',
        actionType: 'dialogue',
        actor: 'Flowey',
        title: 'Diálogo de Flowey',
        description: `"${text}"`,
        reaction: 'Flowey sorri cordialmente enquanto observa a Alma.',
      });

      // When reaching the last line ("Mova-se! Pegue o máximo que puder!"), spawn pellets & unlock soul!
      if (this.introCurrentIndex === this.introLines.length) {
        this.introTimerEvent = this.time.delayedCall(1600, () => {
          this.speechContainer.setVisible(false);
          this.spawnFriendlinessPellets();
        });
      } else {
        this.introTimerEvent = this.time.delayedCall(2400, () => this.showNextSpeechLine());
      }
    } else {
      this.speechContainer.setVisible(false);
      this.spawnFriendlinessPellets();
    }
  }

  private runIntroSequence() {
    this.introCurrentIndex = 0;
    this.isSoulLocked = true;
    this.soulPlayable.setPosition(320, 310);
    this.introTimerEvent = this.time.delayedCall(400, () => this.showNextSpeechLine());
  }

  private spawnFriendlinessPellets() {
    this.currentPhase = 'PELLETS_SPAWN';
    // Soul movement is unlocked NOW that Flowey commanded to move around
    this.isSoulLocked = false;
    this.speechContainer.setVisible(false);

    // Clear any previous pellets
    this.pellets.forEach((p) => p.destroy());
    this.pellets = [];

    const isWave1 = this.dodgeCount === 0;
    const isWave2 = this.dodgeCount === 1;
    const isWave3 = this.dodgeCount >= 2;

    if (isWave3) {
      this.floweySprite.setTexture('flowey_annoyed');
    } else {
      this.floweySprite.setTexture('flowey_friendly');
    }

    combatLogManager.addEntry({
      turn: 1,
      source: 'enemy',
      actionType: 'attack_pattern',
      actor: 'Flowey',
      title: isWave1
        ? 'Pétalas da Amizade'
        : isWave2
        ? 'Pétalas da Amizade (2ª Onda)'
        : 'Pétalas da Amizade (3ª Onda)',
      description: isWave1
        ? 'Flowey lança 5 sementes mágicas giratórias em direção à sua Alma!'
        : isWave2
        ? 'Flowey arremessa as balinhas novamente com um sorriso forçado!'
        : 'Flowey joga as balinhas visivelmente irritado com você!',
      reaction: isWave1
        ? 'Flowey instrui: "Mova-se! Pegue o máximo que puder!"'
        : isWave2
        ? 'Flowey finge calma: "Vamos tentar de novo, tá bom?"'
        : 'Flowey ordena com raiva: "CORRA. NAS. BALAS."',
    });

    // 5 white rotating friendliness pellets falling down towards soul
    for (let i = 0; i < 5; i++) {
      const pellet = this.add.sprite(
        this.boxBounds.x + 24 + i * 33,
        this.boxBounds.y + 15,
        'bullet_pellet'
      );
      pellet.setDepth(15);
      this.pellets.push(pellet);
    }

    // Safety timeout: if player dodges throughout the wave duration, cleanly trigger dodge
    if (this.waveTimeoutEvent) {
      this.waveTimeoutEvent.remove();
    }
    const waveDuration = isWave3 ? 3400 : isWave2 ? 3600 : 3800;
    this.waveTimeoutEvent = this.time.delayedCall(waveDuration, () => {
      if (this.currentPhase === 'PELLETS_SPAWN') {
        this.handlePelletDodge();
      }
    });
  }

  update(_: number, delta: number) {
    // If the soul is locked (intro tutorial or circle of death), keep it strictly immobile in center
    if (this.isSoulLocked) {
      this.soulPlayable.x = 320;
      this.soulPlayable.y = 310;
    }

    if (this.currentPhase === 'PELLETS_SPAWN' && !this.isSoulLocked) {
      this.handleSoulMovement(delta);

      // Speed & gentle homing factor tuned so dodging is completely possible and satisfying
      const speed = this.dodgeCount >= 2 ? 55 : this.dodgeCount === 1 ? 48 : 42;
      const homingFactor = this.dodgeCount >= 2 ? 0.012 : this.dodgeCount === 1 ? 0.008 : 0.005;

      let allOffscreen = true;
      this.pellets.forEach((p) => {
        if (!p.active) return;
        p.y += speed * (delta / 1000);
        // Subtle drift towards soul to allow skill-based dodging
        p.x += (this.soulPlayable.x - p.x) * homingFactor;
        p.rotation += 0.06;

        if (p.y < this.boxBounds.y + this.boxBounds.h - 4) {
          allOffscreen = false;
        }

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

      // When all pellets fall completely off the bottom without touching the soul, dodge successful!
      if (allOffscreen && this.pellets.length > 0 && this.currentPhase === 'PELLETS_SPAWN') {
        this.handlePelletDodge();
      }
    }
  }

  private handleSoulMovement(delta: number) {
    if (this.isSoulLocked || this.currentPhase !== 'PELLETS_SPAWN') return;

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

  private handlePelletDodge() {
    if (this.currentPhase !== 'PELLETS_SPAWN') return;
    if (this.waveTimeoutEvent) {
      this.waveTimeoutEvent.remove();
      this.waveTimeoutEvent = null;
    }

    // Destroy falling pellets
    this.pellets.forEach((p) => p.destroy());
    this.pellets = [];

    this.dodgeCount++;
    this.currentPhase = 'DODGE_DIALOGUE';
    this.isSoulLocked = true;
    this.speechContainer.setVisible(true);

    if (this.dodgeCount === 1) {
      // 1st Dodge: Flowey is surprised / gently confused
      this.floweySprite.setTexture('flowey_friendly');
      soundManager.playVoiceBlip('flowey');
      const text = 'Ei, amigo, você perdeu todas elas.\n\nVamos tentar de novo, tá bom?';
      this.speechText.setText(text);

      combatLogManager.addEntry({
        turn: 1,
        source: 'player',
        actionType: 'dodge',
        actor: 'Frisk',
        title: 'Desvio com Sucesso! (1ª Tentativa)',
        description: 'Você se esquivou com calma de todas as "balinhas da amizade"!',
        reaction: 'Flowey pisca confuso, forçando um sorriso: "Ei, amigo, você perdeu todas elas. Vamos tentar de novo, tá bom?"',
      });

      this.dodgeTimerEvent = this.time.delayedCall(2800, () => this.advanceDodgeDialogue());
    } else if (this.dodgeCount === 2) {
      // 2nd Dodge: Flowey is visibly irritated / teeth-gritting
      this.floweySprite.setTexture('flowey_annoyed');
      soundManager.playVoiceBlip('flowey');
      const text = 'Isso é uma piada?\nVocê tem morte cerebral?!\n\nCORRA. NAS. BALAS.';
      this.speechText.setText(text);

      combatLogManager.addEntry({
        turn: 1,
        source: 'player',
        actionType: 'dodge',
        actor: 'Frisk',
        title: 'Desvio Impecável! (2ª Tentativa)',
        description: 'Você desviou novamente de todas as sementes sem ser atingido!',
        reaction: 'A expressão de Flowey treme de raiva: "Isso é uma piada? Você tem morte cerebral?! CORRA. NAS. BALAS."',
      });

      this.dodgeTimerEvent = this.time.delayedCall(3000, () => this.advanceDodgeDialogue());
    } else {
      // 3rd Dodge: Flowey drops the mask completely!
      soundManager.stopMusic();
      soundManager.playVoiceBlip('monster');
      this.floweySprite.setTexture('flowey_evil');
      const text = 'Você sabe o que está acontecendo aqui, não sabe?\n\nVocê só queria me ver sofrer.';
      this.speechText.setText(text);

      combatLogManager.addEntry({
        turn: 1,
        source: 'player',
        actionType: 'dodge',
        actor: 'Frisk',
        title: 'MÁSCARA CAÍDA! (3º Desvio)',
        description: 'Você se esquivou 3 vezes seguidas! Flowey percebe que você já conhece seu plano!',
        reaction: 'O rosto de Flowey se deforma em fúria demoníaca: "Você sabe o que está acontecendo aqui, não sabe? Você só queria me ver sofrer."',
      });

      this.dodgeTimerEvent = this.time.delayedCall(2900, () => this.advanceDodgeDialogue());
    }
  }

  private advanceDodgeDialogue() {
    if (this.currentPhase !== 'DODGE_DIALOGUE') return;
    if (this.dodgeTimerEvent) {
      this.dodgeTimerEvent.remove();
      this.dodgeTimerEvent = null;
    }

    if (this.dodgeCount < 3) {
      this.speechContainer.setVisible(false);
      this.spawnFriendlinessPellets();
    } else {
      // Flowey drops right into circle of death!
      this.triggerCircleOfDeath(true);
    }
  }

  private triggerPelletHit() {
    if (this.currentPhase === 'HIT_REVEAL' || this.currentPhase === 'CIRCLE_OF_DEATH') return;
    this.currentPhase = 'HIT_REVEAL';
    this.isSoulLocked = true;

    if (this.waveTimeoutEvent) {
      this.waveTimeoutEvent.remove();
      this.waveTimeoutEvent = null;
    }
    if (this.dodgeTimerEvent) {
      this.dodgeTimerEvent.remove();
      this.dodgeTimerEvent = null;
    }

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

    triggerScreenShake(this, 'boss_hit');

    // Flowey's face twists into the EVIL face!
    this.floweySprite.setTexture('flowey_evil');
    this.speechContainer.setVisible(true);
    soundManager.playVoiceBlip('monster');
    this.speechText.setText('SEU IDIOTA.\n\nNeste mundo, é MATAR ou SER MORTO!');

    combatLogManager.addEntry({
      turn: 1,
      source: 'enemy',
      actionType: 'damage',
      actor: 'Flowey',
      title: 'Emboscada Fatal! (-19 HP)',
      description: 'As pétalas da amizade dilaceraram sua Alma! Seu HP caiu para 01/20!',
      reaction: 'O rosto de Flowey se deforma em uma face demoníaca: "SEU IDIOTA. Neste mundo, é MATAR ou MORRER!"',
      statsChange: { hpChange: -19 },
    });

    this.time.delayedCall(2200, () => {
      this.triggerCircleOfDeath(false);
    });
  }

  private triggerCircleOfDeath(fromDodge = false) {
    this.currentPhase = 'CIRCLE_OF_DEATH';
    this.isSoulLocked = true;
    soundManager.playVoiceBlip('monster');
    this.floweySprite.setTexture('flowey_evil');
    this.speechContainer.setVisible(true);

    if (fromDodge) {
      this.speechText.setText('MORRA!');
      combatLogManager.addEntry({
        turn: 1,
        source: 'enemy',
        actionType: 'attack_pattern',
        actor: 'Flowey',
        title: 'Círculo da Morte',
        description: '14 pétalas cortantes cercam a Alma paralisada, fechando-se em espiral!',
        reaction: 'Flowey gargalha com loucura: "MORRA!"',
      });
    } else {
      this.speechText.setText('Por que alguém deixaria passar uma chance como esta?!\n\nMORRA!');
      combatLogManager.addEntry({
        turn: 1,
        source: 'enemy',
        actionType: 'attack_pattern',
        actor: 'Flowey',
        title: 'Círculo da Morte',
        description: '14 pétalas cortantes cercam a Alma paralisada, fechando-se em espiral inexorável!',
        reaction: 'Flowey gargalha com loucura: "Por que alguém deixaria passar uma chance como esta?! MORRA!"',
      });
    }

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

    combatLogManager.addEntry({
      turn: 1,
      source: 'system',
      actionType: 'rescue',
      actor: 'Toriel',
      title: 'Intervenção de Toriel! 🔥',
      description: 'Uma rajada de fogo mágico irrompe da escuridão, atingindo Flowey em cheio e incinerando a armadilha!',
      reaction: 'Flowey é lançado rodopiando no ar! Toriel surge como guardiã protetora das Ruínas.',
    });

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
        triggerScreenShake(this, 'boss_super');
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

  private torielSpeechLines = [
    'Que criatura terrível, torturando uma alma jovem e tão inocente...',
    'Ah, não tenha medo, minha criança. Eu sou TORIEL, guardiã das RUÍNAS.',
    'Eu passo por este lugar todos os dias para ver se alguém caiu aqui.',
    'Você é o primeiro humano a cair no Subterrâneo em muito tempo!',
    'Venha! Eu irei protegê-lo e guiá-lo através das catacumbas.',
    'Por aqui!',
  ];
  private torielSpeechIndex = 0;
  private torielTimerEvent: Phaser.Time.TimerEvent | null = null;
  private torielSpriteRef: Phaser.GameObjects.Sprite | null = null;

  private advanceTorielSpeech() {
    if (this.currentPhase !== 'TORIEL_RESCUE') return;
    if (this.torielTimerEvent) {
      this.torielTimerEvent.remove();
      this.torielTimerEvent = null;
    }
    this.showNextTorielLine();
  }

  private showNextTorielLine() {
    if (this.torielSpeechIndex < this.torielSpeechLines.length) {
      soundManager.playVoiceBlip('toriel');
      this.speechText.setText(this.torielSpeechLines[this.torielSpeechIndex]);
      this.torielSpeechIndex++;
      this.torielTimerEvent = this.time.delayedCall(2800, () => this.showNextTorielLine());
    } else {
      // Speech finished: Toriel guides Frisk north
      this.speechContainer.setVisible(false);
      if (this.torielSpriteRef) {
        this.tweens.add({
          targets: this.torielSpriteRef,
          y: -60,
          duration: 900,
          ease: 'Sine.easeIn',
          onComplete: () => {
            // Mark flowey met and transition to Toriel's entrance room
            gameState.setFlag('flowey_met', true);
            gameState.recordEnemyOutcome('flowey', 'fled');
            gameState.setCurrentRoom('room_toriel_entrance', 320, 410);
            this.cameras.main.fadeOut(500, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => {
              this.scene.start('OverworldScene');
            });
          },
        });
      } else {
        gameState.setFlag('flowey_met', true);
        gameState.setCurrentRoom('room_toriel_entrance', 320, 410);
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start('OverworldScene');
        });
      }
    }
  }

  private torielEnters() {
    const toriel = this.add.sprite(520, 130, 'npc_toriel');
    toriel.setScale(1.6);
    toriel.setDepth(20);
    this.torielSpriteRef = toriel;

    this.tweens.add({
      targets: toriel,
      x: 320,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Restore HP with save chime
        gameState.restoreFullHp();
        soundManager.playSave();
        this.hpText.setText('20 / 20');
        this.hpBarFill.width = 80;

        this.speechContainer.setVisible(true);
        this.speechContainer.setPosition(390, 50);

        this.torielSpeechIndex = 0;
        this.showNextTorielLine();
      },
    });
  }

  private handleVirtualAction(act: string) {
    if (act === 'Z') {
      if (this.currentPhase === 'INTRO_SPEECH') {
        this.advanceSpeechFast();
      } else if (this.currentPhase === 'TORIEL_RESCUE') {
        this.advanceTorielSpeech();
      } else if (this.currentPhase === 'DODGE_DIALOGUE') {
        this.advanceDodgeDialogue();
      }
      return;
    }

    if (!this.isSoulLocked && this.currentPhase === 'PELLETS_SPAWN') {
      if (act === 'UP') this.soulPlayable.y -= 10;
      else if (act === 'DOWN') this.soulPlayable.y += 10;
      else if (act === 'LEFT') this.soulPlayable.x -= 10;
      else if (act === 'RIGHT') this.soulPlayable.x += 10;
    }
  }
}
