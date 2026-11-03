import Phaser from 'phaser';
import React, { useEffect, useRef, useState } from 'react';
import { BattleScene } from '../engine/scenes/BattleScene';
import { FloweyBattleScene } from '../engine/scenes/FloweyBattleScene';
import { GameOverScene } from '../engine/scenes/GameOverScene';
import { IntroScene } from '../engine/scenes/IntroScene';
import { OverworldScene } from '../engine/scenes/OverworldScene';
import { TitleScene } from '../engine/scenes/TitleScene';
import { gameState } from '../engine/gameState';
import { MiniMapOverlay } from './MiniMapOverlay';
import { BattleLogOverlay } from './BattleLogOverlay';
import { LocationBannerOverlay } from './LocationBannerOverlay';
import { FpsCounterOverlay } from './FpsCounterOverlay';
import { GraphicsSettingsOverlay } from './GraphicsSettingsOverlay';
import { CRTShaderOverlay } from './CRTShaderOverlay';

interface PhaserGameProps {
  onOpenMenu: () => void;
  onDeveloperUnlocked: () => void;
  gameRefCallback?: (game: Phaser.Game | null) => void;
}

export const PhaserGame: React.FC<PhaserGameProps> = ({
  onOpenMenu,
  onDeveloperUnlocked,
  gameRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const [crtFilter, setCrtFilter] = useState<boolean>(gameState.getCrtFilter());

  useEffect(() => {
    return gameState.subscribeGraphics((settings) => {
      setCrtFilter(settings.crtFilter);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // High-performance retro pixel-art WebGL pipeline configuration
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 640,
      height: 480,
      backgroundColor: '#000000',
      pixelArt: true,
      render: {
        antialias: false,
        pixelArt: true,
        roundPixels: true,
        powerPreference: 'high-performance',
        batchSize: 4096,
        clearBeforeRender: true,
      },
      fps: {
        target: 60,
        min: 30,
        forceSetTimeOut: false,
        deltaHistory: 10,
      },
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
      scene: [IntroScene, TitleScene, OverworldScene, BattleScene, FloweyBattleScene, GameOverScene],
    };

    const game = new Phaser.Game(config);
    gameInstanceRef.current = game;
    if (gameRefCallback) gameRefCallback(game);

    game.events.on('open_overworld_menu', () => {
      onOpenMenu();
    });

    game.events.on('developer_mode_unlocked', () => {
      onDeveloperUnlocked();
    });

    return () => {
      game.destroy(true);
      gameInstanceRef.current = null;
      if (gameRefCallback) gameRefCallback(null);
    };
  }, [onOpenMenu, onDeveloperUnlocked, gameRefCallback]);

  return (
    <div className="relative w-full flex items-center justify-center bg-black gpu-accelerated p-1 sm:p-2">
      {/* Outer Chassis: transitions between vintage curved CRT monitor housing and clean flat screen */}
      <div
        className={`w-full max-w-[820px] transition-all duration-300 relative gpu-accelerated ${
          crtFilter
            ? 'p-2 sm:p-3.5 bg-[#141418] rounded-[32px] sm:rounded-[42px] border-[6px] sm:border-[10px] border-[#222228] shadow-[0_0_60px_rgba(0,0,0,0.95),inset_0_2px_4px_rgba(255,255,255,0.08),inset_0_-3px_5px_rgba(0,0,0,0.85)]'
            : 'border-4 border-neutral-700 rounded-sm shadow-2xl bg-black'
        }`}
      >
        {/* Screen Viewport with Authentic 4:3 Aspect Ratio and Curved CRT Corners */}
        <div
          className={`relative w-full aspect-[4/3] bg-black overflow-hidden gpu-accelerated transition-all duration-300 ${
            crtFilter
              ? 'rounded-[22px] sm:rounded-[30px] shadow-[inset_0_0_24px_rgba(0,0,0,0.95)] border-2 border-neutral-950'
              : 'rounded-none'
          }`}
        >
          {/* Game Canvas Container with genuine CRT barrel curvature displacement and curved corners */}
          <div
            ref={containerRef}
            className={`w-full h-full transition-all duration-300 ${
              crtFilter ? 'rounded-[20px] sm:rounded-[28px] overflow-hidden' : ''
            }`}
            style={crtFilter ? { filter: 'url(#crt-barrel-curvature)' } : undefined}
          />
          {/* Authentic retro CRT Shader Overlay with dynamic scanlines, tube corner curves & glass glare */}
          <CRTShaderOverlay enabled={crtFilter} />
          {/* Real-time FPS & Performance Telemetry Badge */}
          <FpsCounterOverlay />
          {/* Graphics Optimization Controls & Quality Presets */}
          <GraphicsSettingsOverlay />
          <MiniMapOverlay />
          <BattleLogOverlay />
          <LocationBannerOverlay />
        </div>

        {/* Retro CRT Monitor Lower Bezel Details (Visible when CRT filter is active) */}
        {crtFilter && (
          <div className="pt-2 px-3 flex items-center justify-between text-neutral-500 font-pixel text-[7px] sm:text-[8px] select-none">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 tracking-wider">CATHODE RAY TUBE</span>
              <span className="hidden sm:inline text-neutral-600">•</span>
              <span className="hidden sm:inline text-neutral-600">640×480 @ 60Hz</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="tracking-widest text-[6.5px] text-neutral-400">POWER</span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
