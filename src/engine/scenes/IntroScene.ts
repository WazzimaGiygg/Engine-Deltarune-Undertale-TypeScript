import Phaser from 'phaser';
import { soundManager } from '../../services/soundSynthesizer';
import { SpriteGenerator } from '../spriteGenerator';

interface Slide {
  title: string;
  text: string;
  illustrationType: 'peace' | 'war' | 'barrier' | 'mountain' | 'fall' | 'flowers';
}

export class IntroScene extends Phaser.Scene {
  private slides: Slide[] = [
    {
      title: 'HÁ MUITO TEMPO...',
      text: 'Era uma vez, duas raças governavam a Terra:\nHUMANOS e MONSTROS.',
      illustrationType: 'peace',
    },
    {
      title: 'A GRANDE GUERRA',
      text: 'Um dia, uma terrível guerra eclodiu\nentre as duas raças.',
      illustrationType: 'war',
    },
    {
      title: 'O SELAMENTO MÁGICO',
      text: 'Após uma longa batalha, os humanos foram vitoriosos.\nSete dos seus maiores magos selaram os monstros\nno Subterrâneo com um feitiço mágico.',
      illustrationType: 'barrier',
    },
    {
      title: 'MUITOS ANOS DEPOIS...',
      text: 'Monte Ebott, 202X.\n\nDizem que aqueles que sobem a montanha\nnunca mais voltam.',
      illustrationType: 'mountain',
    },
    {
      title: 'A QUEDA',
      text: 'Ao explorar os penhascos sombrios,\numa criança tropeçou em cipós antigos e caiu...',
      illustrationType: 'fall',
    },
    {
      title: 'NAS PROFUNDEZAS',
      text: 'Uma cama macia de flores douradas amorteceu o impacto.\nAqui começa a sua história...',
      illustrationType: 'flowers',
    },
  ];

  private currentSlideIndex = 0;
  private illustrationGraphics!: Phaser.GameObjects.Graphics;
  private slideTitle!: Phaser.GameObjects.Text;
  private slideText!: Phaser.GameObjects.Text;
  private skipPrompt!: Phaser.GameObjects.Text;
  private displayCharCount = 0;
  private fullText = '';
  private timer = 0;
  private slideDuration = 0;

  private secretBuffer = '';
  private targetSecret = 'lula132026';

  constructor() {
    super('IntroScene');
  }

  create() {
    SpriteGenerator.generateAllTextures(this);
    soundManager.playMusic('overworld');
    this.currentSlideIndex = 0;
    this.secretBuffer = '';

    // Sepia / Retro Illustration Canvas in upper half
    this.illustrationGraphics = this.add.graphics();
    this.illustrationGraphics.setDepth(5);

    // Slide Title
    this.slideTitle = this.add.text(320, 260, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '13px',
      color: '#ffff00',
      align: 'center',
    });
    this.slideTitle.setOrigin(0.5);
    this.slideTitle.setDepth(10);

    // Slide Body Text (Typewriter)
    this.slideText = this.add.text(320, 340, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: 520 },
    });
    this.slideText.setOrigin(0.5);
    this.slideText.setDepth(10);

    // Skip prompt indicator (works for keyboard and touch on smartphones)
    this.skipPrompt = this.add.text(320, 445, '[ Pressione Z / Toque na Tela para Pular ]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#888888',
    });
    this.skipPrompt.setOrigin(0.5);
    this.skipPrompt.setDepth(20);
    this.skipPrompt.setInteractive({ useHandCursor: true });
    this.skipPrompt.on('pointerdown', () => this.goToTitle());

    this.tweens.add({
      targets: this.skipPrompt,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.loadSlide(0);

    // Keyboard handlers
    this.input.keyboard!.on('keydown-Z', this.handleAdvance, this);
    this.input.keyboard!.on('keydown-ENTER', this.handleAdvance, this);
    this.input.keyboard!.on('keydown-SPACE', this.handleAdvance, this);
    this.input.keyboard!.on('keydown-X', this.goToTitle, this);
    this.input.keyboard!.on('keydown-ESC', this.goToTitle, this);

    // Click/Touch anywhere on canvas to advance
    this.input.on('pointerdown', this.handleAdvance, this);

    // Listen for secret code during intro
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      this.secretBuffer += key;
      if (this.secretBuffer.length > 20) {
        this.secretBuffer = this.secretBuffer.slice(-20);
      }
      if (this.secretBuffer.includes(this.targetSecret)) {
        this.secretBuffer = '';
        soundManager.playSave();
        this.game.events.emit('developer_mode_unlocked');
      }
    });

    this.events.on('virtual_action', (act: string) => {
      if (act === 'Z') this.handleAdvance();
      else if (act === 'X' || act === 'C') this.goToTitle();
    });
  }

  private loadSlide(index: number) {
    if (index >= this.slides.length) {
      this.goToTitle();
      return;
    }

    const slide = this.slides[index];
    this.drawIllustration(slide.illustrationType);
    this.slideTitle.setText(slide.title);
    this.fullText = slide.text;
    this.displayCharCount = 0;
    this.slideText.setText('');
    this.slideDuration = 0;
  }

  // Draw Undertale-style nostalgic sepia/monochrome pixel panels
  private drawIllustration(type: Slide['illustrationType']) {
    const g = this.illustrationGraphics;
    g.clear();

    const boxX = 140;
    const boxY = 30;
    const boxW = 360;
    const boxH = 190;

    // Panel border and dark sepia backdrop
    g.fillStyle(0x181008, 1);
    g.fillRect(boxX, boxY, boxW, boxH);
    g.lineStyle(3, 0xc9a063, 1);
    g.strokeRect(boxX, boxY, boxW, boxH);

    const cGold = 0xe5c158;
    const cAmber = 0xc9a063;
    const cDark = 0x3d2716;

    if (type === 'peace') {
      // Sun in background
      g.fillStyle(cGold, 0.4);
      g.fillCircle(boxX + boxW / 2, boxY + 70, 35);

      // Rolling hill
      g.fillStyle(cDark, 1);
      g.fillRect(boxX, boxY + 120, boxW, 70);

      // Human figure (left)
      g.fillStyle(cGold, 1);
      g.fillRect(boxX + 130, boxY + 80, 14, 40); // Body
      g.fillRect(boxX + 132, boxY + 68, 10, 10); // Head
      g.fillRect(boxX + 146, boxY + 84, 4, 30); // Sword

      // Monster / Boss figure with horns (right)
      g.fillStyle(cAmber, 1);
      g.fillRect(boxX + 210, boxY + 72, 22, 48); // Robe body
      g.fillRect(boxX + 213, boxY + 58, 16, 12); // Head
      g.fillRect(boxX + 209, boxY + 52, 4, 8); // Horn 1
      g.fillRect(boxX + 229, boxY + 52, 4, 8); // Horn 2
    } else if (type === 'war') {
      // Storm clouds
      g.fillStyle(cDark, 1);
      g.fillRect(boxX, boxY, boxW, 50);

      // Crossed swords & battle clash
      g.fillStyle(cGold, 1);
      g.fillRect(boxX + 160, boxY + 60, 8, 80);
      g.fillRect(boxX + 144, boxY + 76, 40, 8);

      g.fillStyle(cAmber, 1);
      g.fillRect(boxX + 195, boxY + 60, 8, 80);
      g.fillRect(boxX + 179, boxY + 76, 40, 8);

      // Clash spark
      g.fillStyle(0xffffff, 1);
      g.fillCircle(boxX + 182, boxY + 100, 14);
    } else if (type === 'barrier') {
      // Underground Cavern Mouth
      g.fillStyle(cDark, 1);
      g.fillRect(boxX + 40, boxY + 40, 280, 130);

      // Magical sealing barrier lines
      g.fillStyle(cGold, 0.8);
      for (let i = 0; i < 7; i++) {
        const lx = boxX + 60 + i * 38;
        g.fillRect(lx, boxY + 45, 6, 120);
      }
      // Glowing magical crest
      g.fillStyle(0xffffff, 1);
      g.fillTriangle(boxX + 180, boxY + 60, boxX + 155, boxY + 110, boxX + 205, boxY + 110);
    } else if (type === 'mountain') {
      // Sky & Moon
      g.fillStyle(0x0e0814, 1);
      g.fillRect(boxX, boxY, boxW, boxH);
      g.fillStyle(cGold, 0.9);
      g.fillCircle(boxX + 280, boxY + 50, 20);

      // Mount Ebott Silhouette
      g.fillStyle(cDark, 1);
      g.fillTriangle(boxX + 180, boxY + 30, boxX + 30, boxY + boxH, boxX + 330, boxY + boxH);

      // Crater at the peak
      g.fillStyle(0x000000, 1);
      g.fillRect(boxX + 168, boxY + 32, 24, 16);
    } else if (type === 'fall') {
      // Dark cavern void
      g.fillStyle(0x0a0505, 1);
      g.fillRect(boxX, boxY, boxW, boxH);

      // Distant light shaft from the top
      g.fillStyle(cGold, 0.15);
      g.fillTriangle(boxX + 180, boxY, boxX + 100, boxY + boxH, boxX + 260, boxY + boxH);

      // Falling silhouette child
      g.fillStyle(cGold, 1);
      g.fillRect(boxX + 174, boxY + 80, 12, 24);
      g.fillRect(boxX + 172, boxY + 70, 16, 10);
      // Speed lines
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(boxX + 165, boxY + 60, 2, 25);
      g.fillRect(boxX + 195, boxY + 75, 2, 30);
    } else if (type === 'flowers') {
      // Underground floor
      g.fillStyle(0x110818, 1);
      g.fillRect(boxX, boxY, boxW, boxH);

      // Shaft of warm light
      g.fillStyle(cGold, 0.25);
      g.fillCircle(boxX + 180, boxY + 110, 60);

      // Golden Flower Bed
      g.fillStyle(cGold, 1);
      const flowerSpots = [
        [150, 110], [170, 105], [190, 112], [210, 108],
        [160, 125], [180, 122], [200, 128], [175, 140]
      ];
      flowerSpots.forEach(([fx, fy]) => {
        g.fillRect(boxX + fx - 4, boxY + fy - 4, 8, 8);
        g.fillStyle(0xffffff, 1);
        g.fillRect(boxX + fx - 1, boxY + fy - 1, 2, 2);
        g.fillStyle(cGold, 1);
      });

      // Child resting peacefully
      g.fillStyle(0xfcd0a1, 1);
      g.fillRect(boxX + 170, boxY + 115, 20, 8);
      g.fillStyle(0x2980b9, 1);
      g.fillRect(boxX + 166, boxY + 118, 28, 8);
    }
  }

  update(_: number, delta: number) {
    if (this.displayCharCount < this.fullText.length) {
      this.timer += delta;
      if (this.timer > 35) {
        this.timer = 0;
        this.displayCharCount++;
        this.slideText.setText(this.fullText.substring(0, this.displayCharCount));
        const char = this.fullText[this.displayCharCount - 1];
        if (char && char.trim() !== '') {
          soundManager.playVoiceBlip('monster');
        }
      }
    } else {
      this.slideDuration += delta;
      if (this.slideDuration > 4200) {
        this.currentSlideIndex++;
        this.loadSlide(this.currentSlideIndex);
      }
    }
  }

  private handleAdvance() {
    if (this.displayCharCount < this.fullText.length) {
      // Reveal entire current line immediately
      this.displayCharCount = this.fullText.length;
      this.slideText.setText(this.fullText);
    } else {
      // Advance to next slide
      soundManager.playMenuSelect();
      this.currentSlideIndex++;
      this.loadSlide(this.currentSlideIndex);
    }
  }

  public goToTitle() {
    soundManager.playMenuSelect();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('TitleScene');
    });
  }
}
