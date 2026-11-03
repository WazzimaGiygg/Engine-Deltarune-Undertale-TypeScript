import React, { useEffect, useState } from 'react';
import { gameState, GraphicsQuality, GraphicsSettingsState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';

export const GraphicsSettingsOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<GraphicsSettingsState>(gameState.getGraphicsSettings());

  useEffect(() => {
    return gameState.subscribeGraphics((updated) => {
      setSettings(updated);
    });
  }, []);

  const handleQualityChange = (q: GraphicsQuality) => {
    soundManager.playMenuSelect();
    gameState.setGraphicsQuality(q);
  };

  const handleToggleCrt = () => {
    soundManager.playMenuSelect();
    gameState.setCrtFilter(!settings.crtFilter);
  };

  const handleToggleFps = () => {
    soundManager.playMenuSelect();
    gameState.setFpsCounterEnabled(!settings.showFpsCounter);
  };

  const handleParticleDensityChange = (density: 'high' | 'medium' | 'low') => {
    soundManager.playMenuSelect();
    gameState.setParticleDensity(density);
  };

  const handleScreenShakeChange = (shake: 'normal' | 'reduced' | 'off') => {
    soundManager.playMenuSelect();
    gameState.setScreenShake(shake);
  };

  const handleAutoOptimize = () => {
    soundManager.playSave();
    // Fast 1-click optimization: locked 60 fps, low latency
    gameState.setGraphicsQuality('balanced');
    gameState.setFpsCounterEnabled(true);
  };

  return (
    <>
      {/* Quick Access Floating Button in Top-Right Corner */}
      <button
        onClick={() => {
          soundManager.playMenuSelect();
          setIsOpen(!isOpen);
        }}
        title="Otimizações e Configurações Gráficas"
        className="absolute top-2 right-2 z-40 px-2 py-1 bg-black/80 hover:bg-neutral-900 border border-neutral-700 hover:border-yellow-400/80 rounded font-pixel text-[8px] text-neutral-300 hover:text-yellow-300 shadow-md backdrop-blur-xs flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <span className="text-yellow-400">⚡</span>
        <span className="hidden sm:inline">GRÁFICOS</span>
        <span className="text-[7px] text-cyan-400 px-1 py-0.2 bg-cyan-950/60 rounded border border-cyan-800/60">
          {settings.quality === 'ultra' ? 'ULTRA' : settings.quality === 'balanced' ? 'BAL' : 'PERF'}
        </span>
      </button>

      {/* Graphics Settings Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              soundManager.playMenuSelect();
              setIsOpen(false);
            }
          }}
        >
          <div className="w-full max-w-[520px] bg-black border-4 border-white p-5 rounded-xs shadow-2xl font-pixel text-white relative animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 text-sm">⚡</span>
                <h2 className="text-[12px] text-white tracking-wide">OTIMIZAÇÕES GRÁFICAS</h2>
              </div>
              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  setIsOpen(false);
                }}
                className="text-neutral-400 hover:text-red-400 text-[11px] p-1 cursor-pointer font-bold"
              >
                [X]
              </button>
            </div>

            <div className="space-y-4 text-[10px]">
              {/* Presets */}
              <div>
                <label className="text-neutral-400 block mb-1.5">PERFIL DE DESEMPENHO:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleQualityChange('ultra')}
                    className={`py-2 px-1 text-center border cursor-pointer transition-all ${
                      settings.quality === 'ultra'
                        ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold shadow-xs'
                        : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                    }`}
                  >
                    ★ ULTRA
                    <span className="block text-[7px] text-neutral-400 font-normal mt-0.5">CRT + Efeitos</span>
                  </button>
                  <button
                    onClick={() => handleQualityChange('balanced')}
                    className={`py-2 px-1 text-center border cursor-pointer transition-all ${
                      settings.quality === 'balanced'
                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 font-bold shadow-xs'
                        : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                    }`}
                  >
                    ⚖ EQUILIBRADO
                    <span className="block text-[7px] text-neutral-400 font-normal mt-0.5">60 FPS Suave</span>
                  </button>
                  <button
                    onClick={() => handleQualityChange('performance')}
                    className={`py-2 px-1 text-center border cursor-pointer transition-all ${
                      settings.quality === 'performance'
                        ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold shadow-xs'
                        : 'border-neutral-700 hover:border-neutral-500 text-neutral-300'
                    }`}
                  >
                    ⚡ DESEMPENHO
                    <span className="block text-[7px] text-neutral-400 font-normal mt-0.5">Modo Bateria</span>
                  </button>
                </div>
              </div>

              {/* Toggles Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* CRT Scanline Filter */}
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-neutral-200 block mb-1">MONITOR CRT & CANTOS</span>
                    <span className="text-[7.5px] text-neutral-400 block leading-tight">
                      Curvatura dos cantos do tubo catódico, scanlines e brilho de fósforo.
                    </span>
                  </div>
                  <button
                    onClick={handleToggleCrt}
                    className={`mt-2 py-1 px-2 border text-[8.5px] font-bold cursor-pointer transition-colors ${
                      settings.crtFilter
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {settings.crtFilter ? '● ATIVADO' : '○ DESATIVADO'}
                  </button>
                </div>

                {/* FPS Telemetry Counter */}
                <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded-xs flex flex-col justify-between">
                  <div>
                    <span className="text-neutral-200 block mb-1">CONTADOR DE FPS</span>
                    <span className="text-[7.5px] text-neutral-400 block leading-tight">
                      Monitor de 60 FPS e latência de quadro (ms) em tempo real.
                    </span>
                  </div>
                  <button
                    onClick={handleToggleFps}
                    className={`mt-2 py-1 px-2 border text-[8.5px] font-bold cursor-pointer transition-colors ${
                      settings.showFpsCounter
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400'
                        : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                    }`}
                  >
                    {settings.showFpsCounter ? '● ATIVADO' : '○ DESATIVADO'}
                  </button>
                </div>
              </div>

              {/* Particle Density */}
              <div>
                <label className="text-neutral-400 block mb-1">DENSIDADE DE PARTÍCULAS (NEVE & FOLHAS):</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as const).map((density) => (
                    <button
                      key={density}
                      onClick={() => handleParticleDensityChange(density)}
                      className={`py-1.5 px-1 text-center border text-[8px] cursor-pointer transition-colors ${
                        settings.particleDensity === density
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                      }`}
                    >
                      {density === 'high' ? '100% (ALTA)' : density === 'medium' ? '50% (MÉDIA)' : 'DESATIVADA'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Shake Mode */}
              <div>
                <label className="text-neutral-400 block mb-1">TREMORES DE CÂMERA (SCREEN SHAKE):</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'reduced', 'off'] as const).map((shake) => (
                    <button
                      key={shake}
                      onClick={() => handleScreenShakeChange(shake)}
                      className={`py-1.5 px-1 text-center border text-[8px] cursor-pointer transition-colors ${
                        settings.screenShake === shake
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
                          : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                      }`}
                    >
                      {shake === 'normal' ? 'NORMAL' : shake === 'reduced' ? 'SUAVE' : 'DESATIVADO'}
                    </button>
                  ))}
                </div>
              </div>

              {/* One-click auto optimize button */}
              <div className="pt-2 border-t border-neutral-800 flex justify-between items-center gap-2">
                <button
                  onClick={handleAutoOptimize}
                  className="py-1.5 px-3 bg-neutral-900 hover:bg-neutral-800 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 text-[8px] rounded-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  OTIMIZAR PARA 60 FPS
                </button>

                <button
                  onClick={() => {
                    soundManager.playMenuSelect();
                    setIsOpen(false);
                  }}
                  className="py-1.5 px-4 bg-white text-black hover:bg-neutral-200 font-bold text-[9px] rounded-xs cursor-pointer"
                >
                  CONCLUÍDO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
