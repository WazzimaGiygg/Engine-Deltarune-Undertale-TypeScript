import Phaser from 'phaser';
import { soundManager } from '../../services/soundSynthesizer';
import { gameState } from '../gameState';

export class GameOverScene extends Phaser.Scene {
  private soulPieces: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super('GameOverScene');
  }

  create() {
    soundManager.stopMusic();
    soundManager.playHurt();

    const stats = gameState.getStats();

    // 1. Initial cracked heart at center
    const heart = this.add.sprite(320, 240, 'soul_red');
    heart.setScale(1.5);

    // Heart cracks after 0.5s
    this.time.delayedCall(500, () => {
      soundManager.playSlash();
      heart.destroy();

      // Spawn 4 heart shards flying in different directions
      for (let i = 0; i < 4; i++) {
        const shard = this.add.rectangle(
          320 + (i % 2 === 0 ? -6 : 6),
          240 + (i < 2 ? -6 : 6),
          8,
          8,
          0xff0000
        );
        this.tweens.add({
          targets: shard,
          x: shard.x + (i % 2 === 0 ? -120 : 120) * (0.8 + Math.random() * 0.4),
          y: shard.y + (i < 2 ? -90 : 140) * (0.8 + Math.random() * 0.4),
          alpha: 0,
          rotation: Math.PI * (Math.random() > 0.5 ? 2 : -2),
          duration: 1200,
          ease: 'Cubic.easeOut',
          onComplete: () => shard.destroy(),
        });
      }

      // Show Asgore quote and game over prompt
      this.time.delayedCall(1600, () => {
        this.showGameOverText(stats.name);
      });
    });
  }

  private showGameOverText(playerName: string) {
    const title = this.add.text(320, 150, 'GAME OVER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '28px',
      color: '#ffffff',
    });
    title.setOrigin(0.5);
    title.setAlpha(0);

    const quote = this.add.text(
      320,
      250,
      `Você não pode desistir agora...\n\n${playerName}! Mantenha sua\n\nDETERMINAÇÃO!`,
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10,
      }
    );
    quote.setOrigin(0.5);
    quote.setAlpha(0);

    const retryBtn = this.add.text(320, 360, '[ Z: Continuar do Ponto de Salve ]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '11px',
      color: '#ffff00',
    });
    retryBtn.setOrigin(0.5);
    retryBtn.setAlpha(0);
    retryBtn.setInteractive({ useHandCursor: true });

    const titleBtn = this.add.text(320, 400, '[ X: Voltar para Tela Inicial ]', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#aaaaaa',
    });
    titleBtn.setOrigin(0.5);
    titleBtn.setAlpha(0);
    titleBtn.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: [title, quote, retryBtn, titleBtn],
      alpha: 1,
      duration: 1000,
      ease: 'Sine.easeIn',
    });

    const handleRetry = () => {
      soundManager.playSave();
      gameState.restoreFullHp();
      gameState.loadFromStorage();
      this.scene.start('OverworldScene');
    };

    const handleTitle = () => {
      soundManager.playMenuSelect();
      this.scene.start('TitleScene');
    };

    retryBtn.on('pointerdown', handleRetry);
    titleBtn.on('pointerdown', handleTitle);

    this.input.keyboard!.once('keydown-Z', handleRetry);
    this.input.keyboard!.once('keydown-ENTER', handleRetry);
    this.input.keyboard!.once('keydown-SPACE', handleRetry);
    this.input.keyboard!.once('keydown-X', handleTitle);
    this.input.keyboard!.once('keydown-ESC', handleTitle);
  }
}
