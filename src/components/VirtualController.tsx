import React, { useCallback, useEffect, useRef, useState } from 'react';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';

interface VirtualControllerProps {
  onAction: (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => void;
  onQuickSave?: () => void;
  onToggleCrt?: () => void;
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type ActionKey = 'Z' | 'X' | 'C';
type VirtualKey = Direction | ActionKey;

const KEY_MAPPINGS: Record<
  VirtualKey,
  { key: string; code: string; keyCode: number; which: number }
> = {
  UP: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38, which: 38 },
  DOWN: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40, which: 40 },
  LEFT: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37, which: 37 },
  RIGHT: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 },
  Z: { key: 'z', code: 'KeyZ', keyCode: 90, which: 90 },
  X: { key: 'x', code: 'KeyX', keyCode: 88, which: 88 },
  C: { key: 'c', code: 'KeyC', keyCode: 67, which: 67 },
};

export const VirtualController: React.FC<VirtualControllerProps> = ({
  onAction,
  onQuickSave,
  onToggleCrt,
}) => {
  const [activeKeys, setActiveKeys] = useState<Record<VirtualKey, boolean>>({
    UP: false,
    DOWN: false,
    LEFT: false,
    RIGHT: false,
    Z: false,
    X: false,
    C: false,
  });

  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const activePointersRef = useRef<Map<number, VirtualKey>>(new Map());

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const triggerVibrate = useCallback(() => {
    try {
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
    } catch {
      // Ignore vibration error on unsupported devices
    }
  }, []);

  const pressVirtualKey = useCallback(
    (actionName: VirtualKey) => {
      setActiveKeys((prev) => ({ ...prev, [actionName]: true }));
      triggerVibrate();

      const mapping = KEY_MAPPINGS[actionName];
      if (mapping) {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: mapping.key,
            code: mapping.code,
            keyCode: mapping.keyCode,
            which: mapping.which,
            bubbles: true,
            cancelable: true,
          })
        );
      }

      onAction(actionName);
    },
    [onAction, triggerVibrate]
  );

  const releaseVirtualKey = useCallback((actionName: VirtualKey) => {
    setActiveKeys((prev) => ({ ...prev, [actionName]: false }));

    const mapping = KEY_MAPPINGS[actionName];
    if (mapping) {
      window.dispatchEvent(
        new KeyboardEvent('keyup', {
          key: mapping.key,
          code: mapping.code,
          keyCode: mapping.keyCode,
          which: mapping.which,
          bubbles: true,
          cancelable: true,
        })
      );
    }
  }, []);

  const createPointerHandlers = (actionName: VirtualKey) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      activePointersRef.current.set(e.pointerId, actionName);
      pressVirtualKey(actionName);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
      activePointersRef.current.delete(e.pointerId);
      releaseVirtualKey(actionName);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      activePointersRef.current.delete(e.pointerId);
      releaseVirtualKey(actionName);
    },
  });

  const handleToggleFullscreen = async () => {
    triggerVibrate();
    soundManager.playMenuSelect();
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore
    }
  };

  const handleToggleCrtLocal = () => {
    triggerVibrate();
    soundManager.playMenuSelect();
    if (onToggleCrt) {
      onToggleCrt();
    } else {
      gameState.setCrtFilter(!gameState.getCrtFilter());
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-2 p-2 sm:p-3 bg-neutral-950/95 border-2 border-neutral-800 rounded-xl select-none touch-none shadow-2xl backdrop-blur-md">
      {/* Quick Mobile Utility Bar */}
      <div className="w-full flex items-center justify-between px-2 pb-1 border-b border-neutral-900 text-[9px] font-pixel text-neutral-400">
        <div className="flex items-center gap-1.5">
          <span className="text-red-500">♥</span>
          <span className="text-neutral-300 font-bold hidden sm:inline">CONTROLE VIRTUAL</span>
          <span className="text-[8px] text-yellow-400 font-mono">TOUCH / MOBILE</span>
        </div>

        <div className="flex items-center gap-2">
          {onQuickSave && (
            <button
              onClick={() => {
                triggerVibrate();
                onQuickSave();
              }}
              className="px-2 py-0.5 rounded border border-yellow-500/70 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-400 hover:text-black cursor-pointer transition-colors"
              title="Salvar Rápido"
            >
              ★ SALVAR
            </button>
          )}

          <button
            onClick={handleToggleCrtLocal}
            className="px-2 py-0.5 rounded border border-cyan-500/70 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-400 hover:text-black cursor-pointer transition-colors"
            title="Alternar Filtro CRT"
          >
            📺 CRT
          </button>

          <button
            onClick={handleToggleFullscreen}
            className="px-2 py-0.5 rounded border border-neutral-700 bg-neutral-900 text-neutral-200 hover:text-white cursor-pointer transition-colors"
            title="Tela Cheia"
          >
            {isFullscreen ? '⤓ SAIR' : '⛶ TELA CHEIA'}
          </button>
        </div>
      </div>

      {/* Main Dual-Side Gaming Controller Interface */}
      <div className="w-full flex items-center justify-between px-2 py-1">
        {/* Left Thumb: Undertale 4-Directional D-Pad */}
        <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center">
          {/* UP Button */}
          <button
            aria-label="Cima"
            {...createPointerHandlers('UP')}
            className={`absolute top-0 w-13 h-13 sm:w-14 sm:h-14 rounded-t-lg font-pixel text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-95 cursor-pointer touch-none select-none ${
              activeKeys.UP
                ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)]'
                : 'bg-neutral-800 text-neutral-200 border-neutral-600 hover:bg-neutral-700'
            }`}
          >
            ▲
          </button>

          {/* LEFT Button */}
          <button
            aria-label="Esquerda"
            {...createPointerHandlers('LEFT')}
            className={`absolute left-0 w-13 h-13 sm:w-14 sm:h-14 rounded-l-lg font-pixel text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-95 cursor-pointer touch-none select-none ${
              activeKeys.LEFT
                ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)]'
                : 'bg-neutral-800 text-neutral-200 border-neutral-600 hover:bg-neutral-700'
            }`}
          >
            ◀
          </button>

          {/* D-Pad Center Pivot with Undertale Red Soul */}
          <div className="w-11 h-11 bg-neutral-900 rounded-full border-2 border-neutral-700 flex items-center justify-center pointer-events-none shadow-inner">
            <span className="text-red-500 text-base drop-shadow-[0_0_4px_rgba(239,68,68,0.8)]">
              ♥
            </span>
          </div>

          {/* RIGHT Button */}
          <button
            aria-label="Direita"
            {...createPointerHandlers('RIGHT')}
            className={`absolute right-0 w-13 h-13 sm:w-14 sm:h-14 rounded-r-lg font-pixel text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-95 cursor-pointer touch-none select-none ${
              activeKeys.RIGHT
                ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)]'
                : 'bg-neutral-800 text-neutral-200 border-neutral-600 hover:bg-neutral-700'
            }`}
          >
            ▶
          </button>

          {/* DOWN Button */}
          <button
            aria-label="Baixo"
            {...createPointerHandlers('DOWN')}
            className={`absolute bottom-0 w-13 h-13 sm:w-14 sm:h-14 rounded-b-lg font-pixel text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-95 cursor-pointer touch-none select-none ${
              activeKeys.DOWN
                ? 'bg-yellow-400 text-black border-yellow-200 shadow-[0_0_15px_rgba(250,204,21,0.6)]'
                : 'bg-neutral-800 text-neutral-200 border-neutral-600 hover:bg-neutral-700'
            }`}
          >
            ▼
          </button>
        </div>

        {/* Right Thumb: Ergonomic Arcade Action Cluster [Z, X, C] */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* [C] Menu / Inventory */}
          <div className="flex flex-col items-center">
            <button
              aria-label="Menu C"
              {...createPointerHandlers('C')}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-pixel font-bold text-base flex items-center justify-center border-3 shadow-xl transition-transform active:scale-90 cursor-pointer touch-none select-none ${
                activeKeys.C
                  ? 'bg-neutral-400 text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.7)] scale-95'
                  : 'bg-neutral-800 text-neutral-200 border-neutral-500 hover:bg-neutral-700'
              }`}
            >
              C
            </button>
            <span className="text-[8px] text-neutral-400 font-pixel mt-1.5 font-bold">MENU</span>
          </div>

          {/* [X] Cancel / Run */}
          <div className="flex flex-col items-center">
            <button
              aria-label="Ação X Cancelar"
              {...createPointerHandlers('X')}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full font-pixel font-bold text-base flex items-center justify-center border-3 shadow-xl transition-transform active:scale-90 cursor-pointer touch-none select-none ${
                activeKeys.X
                  ? 'bg-cyan-300 text-black border-white shadow-[0_0_15px_rgba(34,211,238,0.8)] scale-95'
                  : 'bg-cyan-600 text-white border-cyan-400 hover:bg-cyan-500'
              }`}
            >
              X
            </button>
            <span className="text-[8px] text-cyan-300 font-pixel mt-1.5 font-bold">VOLTAR</span>
          </div>

          {/* [Z] Action / Confirm (Largest button for primary thumb action) */}
          <div className="flex flex-col items-center">
            <button
              aria-label="Ação Z Confirmar"
              {...createPointerHandlers('Z')}
              className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full font-pixel font-bold text-lg flex items-center justify-center border-3 shadow-xl transition-transform active:scale-90 cursor-pointer touch-none select-none ${
                activeKeys.Z
                  ? 'bg-yellow-300 text-black border-white shadow-[0_0_20px_rgba(250,204,21,0.9)] scale-95'
                  : 'bg-yellow-400 text-black border-yellow-200 hover:bg-yellow-300'
              }`}
            >
              Z
            </button>
            <span className="text-[8.5px] text-yellow-300 font-pixel mt-1.5 font-bold">
              AGIR / OK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
