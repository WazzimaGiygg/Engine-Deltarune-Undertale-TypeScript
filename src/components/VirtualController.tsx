import React, { useState } from 'react';
import { soundManager } from '../services/soundSynthesizer';

interface VirtualControllerProps {
  onAction: (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => void;
}

export const VirtualController: React.FC<VirtualControllerProps> = ({ onAction }) => {
  const [activeKeys, setActiveKeys] = useState<Record<string, boolean>>({});

  const pressKey = (code: string, keyName: string, actionName: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => {
    setActiveKeys((prev) => ({ ...prev, [actionName]: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, code }));
    onAction(actionName);
  };

  const releaseKey = (code: string, keyName: string, actionName: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => {
    setActiveKeys((prev) => ({ ...prev, [actionName]: false }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: keyName, code }));
  };

  const createTouchHandlers = (code: string, keyName: string, actionName: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      pressKey(code, keyName, actionName);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      releaseKey(code, keyName, actionName);
    },
    onPointerLeave: (e: React.PointerEvent) => {
      e.preventDefault();
      releaseKey(code, keyName, actionName);
    },
    onPointerCancel: (e: React.PointerEvent) => {
      e.preventDefault();
      releaseKey(code, keyName, actionName);
    },
  });

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between px-3 py-2 bg-neutral-950/90 border border-neutral-800 rounded-lg select-none touch-none">
      {/* Directional Pad */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* UP */}
        <button
          aria-label="Cima"
          {...createTouchHandlers('ArrowUp', 'ArrowUp', 'UP')}
          className={`absolute top-0 w-11 h-11 rounded font-pixel text-xs flex items-center justify-center border shadow transition-colors active:scale-95 ${
            activeKeys.UP
              ? 'bg-yellow-400 text-black border-yellow-200'
              : 'bg-neutral-800 text-white border-neutral-600 hover:bg-neutral-700'
          }`}
        >
          ▲
        </button>

        {/* LEFT */}
        <button
          aria-label="Esquerda"
          {...createTouchHandlers('ArrowLeft', 'ArrowLeft', 'LEFT')}
          className={`absolute left-0 w-11 h-11 rounded font-pixel text-xs flex items-center justify-center border shadow transition-colors active:scale-95 ${
            activeKeys.LEFT
              ? 'bg-yellow-400 text-black border-yellow-200'
              : 'bg-neutral-800 text-white border-neutral-600 hover:bg-neutral-700'
          }`}
        >
          ◀
        </button>

        {/* CENTER PIVOT */}
        <div className="w-9 h-9 bg-neutral-900 rounded-full border border-neutral-700 flex items-center justify-center pointer-events-none">
          <div className="w-3.5 h-3.5 bg-red-600 rounded-full" />
        </div>

        {/* RIGHT */}
        <button
          aria-label="Direita"
          {...createTouchHandlers('ArrowRight', 'ArrowRight', 'RIGHT')}
          className={`absolute right-0 w-11 h-11 rounded font-pixel text-xs flex items-center justify-center border shadow transition-colors active:scale-95 ${
            activeKeys.RIGHT
              ? 'bg-yellow-400 text-black border-yellow-200'
              : 'bg-neutral-800 text-white border-neutral-600 hover:bg-neutral-700'
          }`}
        >
          ▶
        </button>

        {/* DOWN */}
        <button
          aria-label="Baixo"
          {...createTouchHandlers('ArrowDown', 'ArrowDown', 'DOWN')}
          className={`absolute bottom-0 w-11 h-11 rounded font-pixel text-xs flex items-center justify-center border shadow transition-colors active:scale-95 ${
            activeKeys.DOWN
              ? 'bg-yellow-400 text-black border-yellow-200'
              : 'bg-neutral-800 text-white border-neutral-600 hover:bg-neutral-700'
          }`}
        >
          ▼
        </button>
      </div>

      {/* Action Buttons: [Z] Confirm/Act, [X] Cancel/Run, [C] Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* [Z] Button */}
        <div className="flex flex-col items-center">
          <button
            aria-label="Ação Z Confirmar"
            {...createTouchHandlers('KeyZ', 'z', 'Z')}
            className={`w-13 h-13 rounded-full font-pixel font-bold text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-90 cursor-pointer ${
              activeKeys.Z
                ? 'bg-yellow-300 text-black border-white scale-95'
                : 'bg-yellow-500 text-black border-yellow-300 hover:bg-yellow-400'
            }`}
          >
            Z
          </button>
          <span className="text-[8px] text-neutral-400 font-pixel mt-1">AGIR / OK</span>
        </div>

        {/* [X] Button */}
        <div className="flex flex-col items-center">
          <button
            aria-label="Ação X Cancelar"
            {...createTouchHandlers('KeyX', 'x', 'X')}
            className={`w-13 h-13 rounded-full font-pixel font-bold text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-90 cursor-pointer ${
              activeKeys.X
                ? 'bg-blue-400 text-white border-white scale-95'
                : 'bg-blue-600 text-white border-blue-400 hover:bg-blue-500'
            }`}
          >
            X
          </button>
          <span className="text-[8px] text-neutral-400 font-pixel mt-1">VOLTAR</span>
        </div>

        {/* [C] Button */}
        <div className="flex flex-col items-center">
          <button
            aria-label="Menu C"
            {...createTouchHandlers('KeyC', 'c', 'C')}
            className={`w-13 h-13 rounded-full font-pixel font-bold text-sm flex items-center justify-center border-2 shadow-lg transition-transform active:scale-90 cursor-pointer ${
              activeKeys.C
                ? 'bg-neutral-500 text-white border-white scale-95'
                : 'bg-neutral-700 text-neutral-200 border-neutral-500 hover:bg-neutral-600'
            }`}
          >
            C
          </button>
          <span className="text-[8px] text-neutral-400 font-pixel mt-1">MENU</span>
        </div>
      </div>
    </div>
  );
};
