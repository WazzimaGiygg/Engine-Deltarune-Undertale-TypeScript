import Phaser from 'phaser';
import React, { useEffect, useRef } from 'react';
import { BattleScene } from '../engine/scenes/BattleScene';
import { OverworldScene } from '../engine/scenes/OverworldScene';

interface PhaserGameProps {
  onOpenMenu: () => void;
  gameRefCallback?: (game: Phaser.Game | null) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({ onOpenMenu, gameRefCallback }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 640,
      height: 480,
      backgroundColor: '#000000',
      pixelArt: true,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: [OverworldScene, BattleScene],
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;
    if (gameRefCallback) gameRefCallback(game);

    game.events.on('open_overworld_menu', () => {
      onOpenMenu();
    });

    return () => {
      game.destroy(true);
      gameInstanceRef.current = null;
      if (gameRefCallback) gameRefCallback(null);
    };
  }, [onOpenMenu, gameRefCallback]);

  return (
    <div className="relative w-full flex items-center justify-center bg-black">
      <div
        ref={containerRef}
        className="w-full max-w-[800px] aspect-[4/3] border-4 border-neutral-700 rounded-sm shadow-2xl overflow-hidden bg-black"
      />
    </div>
  );
};
