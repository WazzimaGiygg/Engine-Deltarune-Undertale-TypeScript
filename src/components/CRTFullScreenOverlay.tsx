import React, { useEffect, useMemo, useState } from 'react';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';

interface CRTFullScreenOverlayProps {
  /** If provided, overrides gameState.crtFilter */
  enabled?: boolean;
}

export const CRTFullScreenOverlay: React.FC<CRTFullScreenOverlayProps> = ({ enabled }) => {
  const [isActive, setIsActive] = useState<boolean>(
    enabled !== undefined ? enabled : gameState.getCrtFilter()
  );
  const [flickerEnabled, setFlickerEnabled] = useState<boolean>(true);
  const [curvatureLevel, setCurvatureLevel] = useState<'none' | 'subtle' | 'vintage'>('subtle');
  const [scanlineIntensity, setScanlineIntensity] = useState<'normal' | 'soft' | 'strong'>('normal');
  const [showQuickHud, setShowQuickHud] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Sync with gameState graphics settings
  useEffect(() => {
    return gameState.subscribeGraphics((settings) => {
      if (enabled === undefined) {
        setIsActive(settings.crtFilter);
      }
    });
  }, [enabled]);

  // Track fullscreen state
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Hotkey listener: F2 or Number 4 to toggle CRT overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing if inside an input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'F2') {
        e.preventDefault();
        soundManager.playMenuSelect();
        setIsActive((prev) => {
          const next = !prev;
          gameState.setCrtFilter(next);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Generate an authentic spherical radial barrel displacement map for glass tube curvature
  const displacementMapUri = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    const center = size / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = (x - center) / center;
        const dy = (y - center) / center;
        const r2 = dx * dx + dy * dy;

        // Spherical barrel distortion formula
        const distortion = 1 + r2 * 0.16;
        const warpedX = dx * distortion;
        const warpedY = dy * distortion;

        // Diff in coordinates mapped to 0..255 (128 = no displacement)
        const dispX = Math.min(255, Math.max(0, 128 + Math.round((warpedX - dx) * 115)));
        const dispY = Math.min(255, Math.max(0, 128 + Math.round((warpedY - dy) * 115)));

        const idx = (y * size + x) * 4;
        data[idx] = dispX; // Red = X offset
        data[idx + 1] = dispY; // Green = Y offset
        data[idx + 2] = 128; // Blue = Unused
        data[idx + 3] = 255; // Alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
  }, []);

  const handleToggleFullscreen = async () => {
    soundManager.playMenuSelect();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen not permitted or cancelled
    }
  };

  const handleToggleActive = () => {
    soundManager.playMenuSelect();
    const next = !isActive;
    setIsActive(next);
    gameState.setCrtFilter(next);
  };

  const displacementScale =
    curvatureLevel === 'vintage' ? 12 : curvatureLevel === 'subtle' ? 6 : 0;

  return (
    <>
      {/* SVG Displacement Filter definition for authentic glass tube curvature */}
      {isActive && curvatureLevel !== 'none' && (
        <svg className="fixed w-0 h-0 pointer-events-none" aria-hidden="true">
          <defs>
            <filter id="crt-fullscreen-curvature" x="-5%" y="-5%" width="110%" height="110%">
              {displacementMapUri && (
                <feImage
                  href={displacementMapUri}
                  result="curvatureMap"
                  preserveAspectRatio="none"
                />
              )}
              <feDisplacementMap
                in="SourceGraphic"
                in2="curvatureMap"
                scale={displacementScale}
                xChannelSelector="R"
                yChannelSelector="G"
                result="warpedScreen"
              />
            </filter>
          </defs>
        </svg>
      )}

      {/* Main Full-Screen CRT Retro Visual Filter Layer */}
      {isActive && (
        <div
          className={`fixed inset-0 pointer-events-none z-40 overflow-hidden select-none gpu-accelerated transition-opacity duration-300 ${
            flickerEnabled ? 'crt-fullscreen-flicker' : ''
          }`}
          style={
            curvatureLevel !== 'none'
              ? { filter: 'url(#crt-fullscreen-curvature)' }
              : undefined
          }
        >
          {/* Layer 1: Phosphor Scanlines with Subpixel RGB triads */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(
                rgba(18, 16, 16, 0) 50%,
                rgba(0, 0, 0, ${
                  scanlineIntensity === 'strong'
                    ? '0.38'
                    : scanlineIntensity === 'soft'
                    ? '0.18'
                    : '0.28'
                }) 50%
              ), linear-gradient(
                90deg,
                rgba(255, 0, 0, 0.035),
                rgba(0, 255, 0, 0.015),
                rgba(0, 0, 255, 0.035)
              )`,
              backgroundSize: '100% 3px, 6px 100%',
            }}
          />

          {/* Layer 2: Moving Electron Beam Scanline Sweep */}
          <div
            className="absolute left-0 right-0 h-32 crt-dynamic-sweep pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)',
            }}
          />

          {/* Layer 3: Glass Tube Radial Vignette & Edge Falloff */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(
                circle at center,
                rgba(0, 0, 0, 0) 52%,
                rgba(0, 0, 0, 0.28) 78%,
                rgba(0, 0, 0, 0.85) 100%
              )`,
            }}
          />

          {/* Layer 4: CRT Monitor 4 Curved Corners Masks (Authentic physical tube bezel) */}
          {curvatureLevel !== 'none' && (
            <>
              {/* Top-Left Corner Curve */}
              <div className="absolute top-0 left-0 w-10 h-10 sm:w-16 sm:h-16 pointer-events-none">
                <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M 0 0 L 64 0 C 32 0, 0 32, 0 64 Z" fill="#050508" />
                  <path
                    d="M 64 0 C 32 0, 0 32, 0 64"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeWidth="2"
                  />
                  <path
                    d="M 62 2 C 32 2, 2 32, 2 62"
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.8)"
                    strokeWidth="3"
                  />
                </svg>
              </div>

              {/* Top-Right Corner Curve */}
              <div className="absolute top-0 right-0 w-10 h-10 sm:w-16 sm:h-16 pointer-events-none">
                <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M 64 0 L 0 0 C 32 0, 64 32, 64 64 Z" fill="#050508" />
                  <path
                    d="M 0 0 C 32 0, 64 32, 64 64"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="2"
                  />
                  <path
                    d="M 2 2 C 32 2, 62 32, 62 62"
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.8)"
                    strokeWidth="3"
                  />
                </svg>
              </div>

              {/* Bottom-Left Corner Curve */}
              <div className="absolute bottom-0 left-0 w-10 h-10 sm:w-16 sm:h-16 pointer-events-none">
                <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M 0 64 L 0 0 C 0 32, 32 64, 64 64 Z" fill="#050508" />
                  <path
                    d="M 0 0 C 0 32, 32 64, 64 64"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 2 2 C 2 32, 32 62, 62 62"
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.9)"
                    strokeWidth="3.5"
                  />
                </svg>
              </div>

              {/* Bottom-Right Corner Curve */}
              <div className="absolute bottom-0 right-0 w-10 h-10 sm:w-16 sm:h-16 pointer-events-none">
                <svg viewBox="0 0 64 64" className="w-full h-full" preserveAspectRatio="none">
                  <path d="M 64 64 L 64 0 C 64 32, 32 64, 0 64 Z" fill="#050508" />
                  <path
                    d="M 64 0 C 64 32, 32 64, 0 64"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.12)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M 62 2 C 62 32, 32 62, 2 62"
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.9)"
                    strokeWidth="3.5"
                  />
                </svg>
              </div>
            </>
          )}

          {/* Layer 5: Heavy Perimeter Shadow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow:
                'inset 0 0 45px 12px rgba(0, 0, 0, 0.92), inset 0 0 15px 3px rgba(0, 0, 0, 0.85)',
            }}
          />

          {/* Layer 6: Vintage Glass Specular Reflection Highlight Arc */}
          <div
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)',
              transform: 'rotate(-25deg)',
            }}
          />
        </div>
      )}

      {/* Floating Retro HUD Widget for Quick CRT & Fullscreen Control (Bottom Left) */}
      <div className="fixed bottom-3 left-3 z-50 flex flex-col items-start font-pixel select-none">
        {showQuickHud ? (
          <div className="bg-black/95 border-2 border-yellow-400 p-3 rounded shadow-2xl text-[9px] text-white space-y-2.5 max-w-[280px] animate-in fade-in slide-in-from-bottom-2 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-yellow-300 font-bold">
                <span>📺</span>
                <span>FILTRO CRT FULL-SCREEN</span>
              </div>
              <button
                onClick={() => setShowQuickHud(false)}
                className="text-neutral-400 hover:text-white px-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* CRT On/Off */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-300">ESTADO DO FILTRO:</span>
              <button
                onClick={handleToggleActive}
                className={`px-2 py-1 rounded text-[8px] font-bold cursor-pointer border transition-colors ${
                  isActive
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                    : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                }`}
              >
                {isActive ? '● LIGADO' : '○ DESLIGADO'}
              </button>
            </div>

            {/* Curvature Mode */}
            <div>
              <span className="text-neutral-400 block mb-1">CURVATURA DO TUBO:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['none', 'subtle', 'vintage'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      soundManager.playMenuSelect();
                      setCurvatureLevel(level);
                    }}
                    className={`py-1 px-1 text-center border text-[7.5px] cursor-pointer transition-colors ${
                      curvatureLevel === level
                        ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
                        : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {level === 'none' ? 'PLANO' : level === 'subtle' ? 'SUAVE' : 'VINTAGE'}
                  </button>
                ))}
              </div>
            </div>

            {/* Phosphor Flicker */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-neutral-300 block">FLICKER 60Hz:</span>
                <span className="text-[7px] text-neutral-500">Tremulação de fósforo</span>
              </div>
              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  setFlickerEnabled(!flickerEnabled);
                }}
                className={`px-2 py-1 rounded text-[8px] font-bold cursor-pointer border transition-colors ${
                  flickerEnabled
                    ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300'
                    : 'border-neutral-800 text-neutral-500'
                }`}
              >
                {flickerEnabled ? 'SIM' : 'NÃO'}
              </button>
            </div>

            {/* Scanlines Intensity */}
            <div>
              <span className="text-neutral-400 block mb-1">LINHAS DE VARREDURA:</span>
              <div className="grid grid-cols-3 gap-1">
                {(['soft', 'normal', 'strong'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      soundManager.playMenuSelect();
                      setScanlineIntensity(mode);
                    }}
                    className={`py-1 px-1 text-center border text-[7.5px] cursor-pointer transition-colors ${
                      scanlineIntensity === mode
                        ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300 font-bold'
                        : 'border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    {mode === 'soft' ? 'SUAVE' : mode === 'normal' ? 'MÉDIO' : 'FORTE'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen Button */}
            <div className="pt-1.5 border-t border-neutral-800 flex items-center justify-between gap-2">
              <button
                onClick={handleToggleFullscreen}
                className="w-full py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-600 text-neutral-200 text-[8px] rounded cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>{isFullscreen ? '⤓' : '⛶'}</span>
                <span>{isFullscreen ? 'SAIR DA TELA CHEIA' : 'TELA CHEIA (FULLSCREEN)'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleActive}
              title="Alternar Filtro CRT Full-Screen (Atalho: F2)"
              className={`px-2 py-1 rounded-sm border font-pixel text-[8px] flex items-center gap-1.5 shadow-lg backdrop-blur-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-black/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-950/60'
                  : 'bg-black/70 border-neutral-700 text-neutral-400 hover:text-white'
              }`}
            >
              <span>📺</span>
              <span>CRT {isActive ? '60Hz' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                soundManager.playMenuSelect();
                setShowQuickHud(true);
              }}
              title="Configurar Scanlines, Curvatura e Flicker"
              className="px-1.5 py-1 rounded-sm border border-neutral-700 bg-black/80 text-neutral-300 hover:text-yellow-300 hover:border-yellow-400 text-[8px] cursor-pointer transition-colors"
            >
              ⚙
            </button>
          </div>
        )}
      </div>
    </>
  );
};
