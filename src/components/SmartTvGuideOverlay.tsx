import React, { useState } from 'react';
import { soundManager } from '../services/soundSynthesizer';

interface SmartTvGuideOverlayProps {
  isTvMode: boolean;
  onToggleTvMode: () => void;
  lastRemoteKey?: string | null;
}

export const SmartTvGuideOverlay: React.FC<SmartTvGuideOverlayProps> = ({
  isTvMode,
  onToggleTvMode,
  lastRemoteKey,
}) => {
  const [minimized, setMinimized] = useState<boolean>(false);

  if (!isTvMode) {
    return null;
  }

  return (
    <aside
      aria-label="Guia do Controle Remoto Smart TV"
      className="fixed top-14 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[94%] bg-black/95 border-2 border-cyan-400 p-2.5 rounded shadow-[0_0_25px_rgba(34,211,238,0.35)] font-pixel text-white select-none transition-all duration-200"
    >
      <div className="flex items-center justify-between border-b border-cyan-800/80 pb-1.5 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xs animate-pulse">🎮</span>
          <span className="text-[10px] text-cyan-300 font-bold tracking-wide">
            MODO SMART TV ATIVO
          </span>
          {lastRemoteKey && (
            <span className="text-[8px] bg-cyan-950 text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-600/60 font-mono">
              TECLA: {lastRemoteKey}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setMinimized(!minimized);
            }}
            className="text-[9px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded border border-neutral-700 cursor-pointer"
            title={minimized ? 'Expandir Guia' : 'Minimizar Guia'}
          >
            {minimized ? '▲ MOSTRAR' : '▼ OCULTAR'}
          </button>
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onToggleTvMode();
            }}
            className="text-[9px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded border border-red-900/80 cursor-pointer"
            title="Desativar Modo Smart TV"
          >
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[8px] pt-1">
          {/* D-Pad */}
          <div className="bg-neutral-950 p-1.5 rounded border border-neutral-800">
            <span className="text-yellow-400 font-bold block mb-0.5">▲▼◀▶ SETAS</span>
            <span className="text-neutral-300 block">Mover Frisk / Navegar</span>
          </div>

          {/* OK / Z */}
          <div className="bg-neutral-950 p-1.5 rounded border border-neutral-800">
            <span className="text-red-400 font-bold block mb-0.5">🔴 OK / VERMELHO / 1</span>
            <span className="text-neutral-300 block">Z · Agir / Confirmar</span>
          </div>

          {/* Back / X */}
          <div className="bg-neutral-950 p-1.5 rounded border border-neutral-800">
            <span className="text-emerald-400 font-bold block mb-0.5">🟢 VOLTAR / VERDE / 2</span>
            <span className="text-neutral-300 block">X · Cancelar / Correr</span>
          </div>

          {/* Menu / C */}
          <div className="bg-neutral-950 p-1.5 rounded border border-neutral-800">
            <span className="text-yellow-300 font-bold block mb-0.5">🟡 MENU / AMARELO / 3</span>
            <span className="text-neutral-300 block">C · Abrir Menu / Itens</span>
          </div>
        </div>
      )}
    </aside>
  );
};
