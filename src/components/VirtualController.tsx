import React from 'react';
import { soundManager } from '../services/soundSynthesizer';

interface VirtualControllerProps {
  onAction: (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => void;
}

export const VirtualController: React.FC<VirtualControllerProps> = ({ onAction }) => {
  const triggerKey = (code: string, keyName: string) => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, code }));
  };

  const releaseKey = (code: string, keyName: string) => {
    window.dispatchEvent(new KeyboardEvent('keyup', { key: keyName, code }));
  };

  return (
    <div className="w-full max-w-xl mx-auto flex items-center justify-between px-4 py-3 bg-neutral-950/80 border border-neutral-800 rounded-lg select-none">
      {/* Directional Pad */}
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* UP */}
        <button
          aria-label="Cima"
          onPointerDown={() => {
            triggerKey('ArrowUp', 'ArrowUp');
            onAction('UP');
          }}
          onPointerUp={() => releaseKey('ArrowUp', 'ArrowUp')}
          className="absolute top-0 w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white rounded font-pixel text-xs flex items-center justify-center border border-neutral-600 shadow"
        >
          ▲
        </button>

        {/* LEFT */}
        <button
          aria-label="Esquerda"
          onPointerDown={() => {
            triggerKey('ArrowLeft', 'ArrowLeft');
            onAction('LEFT');
          }}
          onPointerUp={() => releaseKey('ArrowLeft', 'ArrowLeft')}
          className="absolute left-0 w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white rounded font-pixel text-xs flex items-center justify-center border border-neutral-600 shadow"
        >
          ◀
        </button>

        {/* CENTER PIVOT */}
        <div className="w-8 h-8 bg-neutral-900 rounded-full border border-neutral-700 flex items-center justify-center">
          <div className="w-3 h-3 bg-red-600 rounded-full" />
        </div>

        {/* RIGHT */}
        <button
          aria-label="Direita"
          onPointerDown={() => {
            triggerKey('ArrowRight', 'ArrowRight');
            onAction('RIGHT');
          }}
          onPointerUp={() => releaseKey('ArrowRight', 'ArrowRight')}
          className="absolute right-0 w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white rounded font-pixel text-xs flex items-center justify-center border border-neutral-600 shadow"
        >
          ▶
        </button>

        {/* DOWN */}
        <button
          aria-label="Baixo"
          onPointerDown={() => {
            triggerKey('ArrowDown', 'ArrowDown');
            onAction('DOWN');
          }}
          onPointerUp={() => releaseKey('ArrowDown', 'ArrowDown')}
          className="absolute bottom-0 w-10 h-10 bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-white rounded font-pixel text-xs flex items-center justify-center border border-neutral-600 shadow"
        >
          ▼
        </button>
      </div>

      {/* Action Buttons: [Z] Confirm/Act, [X] Cancel/Run, [C] Menu */}
      <div className="flex items-center gap-3">
        {/* [Z] Button */}
        <div className="flex flex-col items-center">
          <button
            onPointerDown={() => {
              triggerKey('KeyZ', 'z');
              onAction('Z');
            }}
            onPointerUp={() => releaseKey('KeyZ', 'z')}
            className="w-12 h-12 rounded-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-pixel font-bold text-sm flex items-center justify-center border-2 border-yellow-300 shadow-lg cursor-pointer"
          >
            Z
          </button>
          <span className="text-[9px] text-neutral-400 font-pixel mt-1">CONFIRMAR</span>
        </div>

        {/* [X] Button */}
        <div className="flex flex-col items-center">
          <button
            onPointerDown={() => {
              triggerKey('KeyX', 'x');
              onAction('X');
            }}
            onPointerUp={() => releaseKey('KeyX', 'x')}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-pixel font-bold text-sm flex items-center justify-center border-2 border-blue-400 shadow-lg cursor-pointer"
          >
            X
          </button>
          <span className="text-[9px] text-neutral-400 font-pixel mt-1">CANCELAR</span>
        </div>

        {/* [C] Button */}
        <div className="flex flex-col items-center">
          <button
            onPointerDown={() => {
              triggerKey('KeyC', 'c');
              onAction('C');
              soundManager.playMenuSelect();
            }}
            onPointerUp={() => releaseKey('KeyC', 'c')}
            className="w-12 h-12 rounded-full bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 text-neutral-200 font-pixel font-bold text-sm flex items-center justify-center border-2 border-neutral-500 shadow-lg cursor-pointer"
          >
            C
          </button>
          <span className="text-[9px] text-neutral-400 font-pixel mt-1">MENU</span>
        </div>
      </div>
    </div>
  );
};
