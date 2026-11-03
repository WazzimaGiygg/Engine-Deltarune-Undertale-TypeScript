import React, { useEffect, useState } from 'react';
import { gameState, GraphicsSettingsState } from '../engine/gameState';

export const FpsCounterOverlay: React.FC = () => {
  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettingsState>(
    gameState.getGraphicsSettings()
  );
  const [fps, setFps] = useState<number>(60);
  const [frameTimeMs, setFrameTimeMs] = useState<number>(16.6);

  useEffect(() => {
    return gameState.subscribeGraphics((settings) => {
      setGraphicsSettings(settings);
    });
  }, []);

  useEffect(() => {
    if (!graphicsSettings.showFpsCounter) return;

    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    const fpsHistory: number[] = [];

    const updateMetrics = (now: number) => {
      frameCount++;
      const delta = now - lastTime;

      if (delta >= 400) {
        const calculatedFps = Math.round((frameCount * 1000) / delta);
        const avgFrameTime = Math.round((delta / frameCount) * 10) / 10;

        fpsHistory.push(calculatedFps);
        if (fpsHistory.length > 3) fpsHistory.shift();
        const smoothedFps = Math.min(60, Math.round(fpsHistory.reduce((a, b) => a + b, 0) / fpsHistory.length));

        setFps(smoothedFps);
        setFrameTimeMs(avgFrameTime);

        frameCount = 0;
        lastTime = now;
      }

      animId = requestAnimationFrame(updateMetrics);
    };

    animId = requestAnimationFrame(updateMetrics);
    return () => cancelAnimationFrame(animId);
  }, [graphicsSettings.showFpsCounter]);

  if (!graphicsSettings.showFpsCounter) return null;

  const fpsColor =
    fps >= 55 ? 'text-emerald-400 border-emerald-500/40' : fps >= 35 ? 'text-yellow-400 border-yellow-500/40' : 'text-red-400 border-red-500/40';

  return (
    <div
      className={`absolute top-2 left-2 z-40 px-2 py-1 bg-black/85 border ${fpsColor} rounded font-pixel text-[9px] pointer-events-none select-none flex items-center gap-2 shadow-lg backdrop-blur-xs`}
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        <span className="font-bold tracking-wider">{fps} FPS</span>
      </div>
      <span className="text-neutral-500 text-[8px]">|</span>
      <span className="text-neutral-300 text-[8px]">{frameTimeMs}ms</span>
      <span className="text-neutral-500 text-[8px]">|</span>
      <span className="text-cyan-400 text-[8px] uppercase tracking-wider">
        {graphicsSettings.quality === 'ultra' ? 'ULTRA' : graphicsSettings.quality === 'balanced' ? 'BAL' : 'PERF'}
      </span>
    </div>
  );
};
