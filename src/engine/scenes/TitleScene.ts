import Phaser from 'phaser';
import { soundManager } from '../../services/soundSynthesizer';
import { gameState } from '../gameState';
import { SpriteGenerator } from '../spriteGenerator';

export class TitleScene extends Phaser.Scene {
  private options: Array<{ label: string; action: () => void }> = [];
  private selectedIndex = 0;
  private soulCursor!: Phaser.GameObjects.Sprite;
  private optionTexts: Phaser.GameObjects.Text[] = [];

  // Secret code tracker: "lula132026"
  private secretBuffer = '';
  private targetSecret = 'lula132026';

  constructor() {
    super('TitleScene');
  }

  create() {
    SpriteGenerator.generateAllTextures(this);
    soundManager.playMusic('overworld');
    this.secretBuffer = '';

    // Big Game Title
    const title = this.add.text(320, 110, 'UNDERTALE T.S', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#333333',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(320, 150, '-- O RPG ONDE NINGUÉM PRECISA MORRER --', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '9px',
      color: '#aaaaaa',
    });
    subtitle.setOrigin(0.5);

    // Save info preview and classic Undertale Save Slot
    const hasSave = gameState.hasSavedGame();
    const lastSave = hasSave ? gameState.getLastSavedData() : null;

    let startY = 240;

    if (hasSave && lastSave) {
      // Classic Undertale Save Preview Card
      const card = this.add.graphics();
      card.fillStyle(0x000000, 1);
      card.lineStyle(3, 0xffffff, 1);
      card.fillRect(130, 175, 380, 68);
      card.strokeRect(130, 175, 380, 68);

      const mins = Math.floor((lastSave.playtimeSeconds || 0) / 60);
      const secs = (lastSave.playtimeSeconds || 0) % 60;
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

      this.add.text(145, 188, lastSave.stats.name.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffffff',
      });
      this.add.text(285, 188, `LV ${lastSave.stats.lv}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffffff',
      });
      this.add.text(420, 188, `${pad(mins)}:${pad(secs)}`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '11px',
        color: '#ffffff',
      });
      this.add.text(145, 216, lastSave.roomName || 'Ruínas - Entrada', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#ffff00',
      });

      this.options = [
        {
          label: 'CONTINUAR',
          action: () => {
            soundManager.playSave();
            gameState.loadFromStorage();
            this.startGame();
          },
        },
        {
          label: 'REINICIAR (NOVO JOGO)',
          action: () => {
            gameState.resetGame();
            this.startGame();
          },
        },
        {
          label: 'HISTÓRIA / PRÓLOGO',
          action: () => {
            this.scene.start('IntroScene');
          },
        },
      ];
      startY = 275;
    } else {
      this.options = [
        {
          label: 'INICIAR NOVO JOGO',
          action: () => {
            gameState.resetGame();
            this.startGame();
          },
        },
        {
          label: 'HISTÓRIA / PRÓLOGO',
          action: () => {
            this.scene.start('IntroScene');
          },
        },
      ];
      startY = 240;
    }

    // Render options
    this.optionTexts = [];
    this.options.forEach((opt, idx) => {
      const txt = this.add.text(320, startY + idx * 42, opt.label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '12px',
        color: idx === 0 ? '#ffff00' : '#ffffff',
      });
      txt.setOrigin(0.5);
      txt.setInteractive({ useHandCursor: true });
      txt.on('pointerdown', () => {
        this.selectedIndex = idx;
        this.updateCursor();
        this.confirmSelection();
      });
      this.optionTexts.push(txt);
    });

    // Soul Cursor
    this.soulCursor = this.add.sprite(200, startY, 'soul_red');
    this.soulCursor.setScale(1.2);
    this.updateCursor();

    // Subtle instructions footer
    const help = this.add.text(
      320,
      430,
      '[ Setas: Mover · Z / Enter: Escolher ]',
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#666666',
      }
    );
    help.setOrigin(0.5);

    // Key listeners
    this.input.keyboard!.on('keydown-UP', this.navUp, this);
    this.input.keyboard!.on('keydown-W', this.navUp, this);
    this.input.keyboard!.on('keydown-DOWN', this.navDown, this);
    this.input.keyboard!.on('keydown-S', this.navDown, this);
    this.input.keyboard!.on('keydown-Z', this.confirmSelection, this);
    this.input.keyboard!.on('keydown-ENTER', this.confirmSelection, this);
    this.input.keyboard!.on('keydown-SPACE', this.confirmSelection, this);

    // Secret Key Listener for "lula132026"
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      this.secretBuffer += key;
      if (this.secretBuffer.length > 20) {
        this.secretBuffer = this.secretBuffer.slice(-20);
      }
      if (this.secretBuffer.includes(this.targetSecret)) {
        this.secretBuffer = '';
        this.unlockDeveloperMode();
      }
    });

    this.events.on('virtual_action', (act: string) => {
      if (act === 'UP') this.navUp();
      else if (act === 'DOWN') this.navDown();
      else if (act === 'Z') this.confirmSelection();
    });
  }

  private unlockDeveloperMode() {
    soundManager.playSave();
    const flash = this.add.rectangle(320, 240, 640, 480, 0xffff00, 0.4);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      onComplete: () => flash.destroy(),
    });

    const unlockText = this.add.text(320, 390, '★ MODO DESENVOLVEDOR DESBLOQUEADO! ★', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#ffff00',
    });
    unlockText.setOrigin(0.5);

    this.time.delayedCall(1500, () => {
      unlockText.destroy();
    });

    this.game.events.emit('developer_mode_unlocked');
  }

  private navUp() {
    this.selectedIndex = (this.selectedIndex - 1 + this.options.length) % this.options.length;
    soundManager.playMenuMove();
    this.updateCursor();
  }

  private navDown() {
    this.selectedIndex = (this.selectedIndex + 1) % this.options.length;
    soundManager.playMenuMove();
    this.updateCursor();
  }

  private updateCursor() {
    const txt = this.optionTexts[this.selectedIndex];
    if (txt) {
      this.soulCursor.setPosition(txt.x - txt.width / 2 - 20, txt.y);
      this.optionTexts.forEach((t, i) => {
        t.setColor(i === this.selectedIndex ? '#ffff00' : '#ffffff');
      });
    }
  }

  private confirmSelection() {
    soundManager.playMenuSelect();
    const opt = this.options[this.selectedIndex];
    if (opt) {
      opt.action();
    }
  }

  private startGame() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('OverworldScene');
    });
  }
}
