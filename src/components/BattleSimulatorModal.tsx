import React from 'react';
import { soundManager } from '../services/soundSynthesizer';

interface BattleSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBattle: (enemyId: string) => void;
  onWarpRoom: (roomId: string, x: number, y: number) => void;
}

export const BattleSimulatorModal: React.FC<BattleSimulatorModalProps> = ({
  isOpen,
  onClose,
  onSelectBattle,
  onWarpRoom,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Seletor de Batalhas e Salas"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-xl bg-black border-4 border-white p-6 rounded-none text-white font-pixel shadow-[0_0_24px_rgba(255,255,255,0.25)]">
        <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3 mb-5">
          <div className="flex items-center gap-3">
            <span className="text-red-500">♥</span>
            <h3 className="text-sm font-bold text-yellow-300 tracking-wider">
              SELETOR DE BATALHAS & RUÍNAS
            </h3>
          </div>
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 border border-neutral-800"
          >
            [X] Fechar
          </button>
        </div>

        {/* Section 1: Desafiar Monstros Diretamente */}
        <div className="mb-6">
          <h4 className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">
            1. Desafiar Monstro em Combate (Bullet-Hell):
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => {
                soundManager.playBattleStart();
                onSelectBattle('froggit');
                onClose();
              }}
              className="p-3 text-left border border-neutral-700 bg-neutral-950 hover:border-yellow-400 hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-yellow-300 font-bold block mb-1 group-hover:text-yellow-200">
                Froggit
              </span>
              <span className="text-[10px] text-neutral-400 block">HP: 30 · ATK: 4</span>
              <span className="text-[9px] text-neutral-500 block mt-1">
                Saltos de sapo e moscas giratórias.
              </span>
            </button>

            <button
              onClick={() => {
                soundManager.playBattleStart();
                onSelectBattle('sir_ossos');
                onClose();
              }}
              className="p-3 text-left border border-neutral-700 bg-neutral-950 hover:border-yellow-400 hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-red-400 font-bold block mb-1 group-hover:text-red-300">
                Sir Ossos
              </span>
              <span className="text-[10px] text-neutral-400 block">HP: 75 · ATK: 7</span>
              <span className="text-[9px] text-neutral-500 block mt-1">
                Onda de ossos e Ataque Azul (fique parado!).
              </span>
            </button>

            <button
              onClick={() => {
                soundManager.playBattleStart();
                onSelectBattle('deltajester');
                onClose();
              }}
              className="p-3 text-left border border-neutral-700 bg-neutral-950 hover:border-yellow-400 hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-purple-400 font-bold block mb-1 group-hover:text-purple-300">
                Bufão Caótico
              </span>
              <span className="text-[10px] text-neutral-400 block">HP: 90 · ATK: 9</span>
              <span className="text-[9px] text-neutral-500 block mt-1">
                Estrelas velozes e caos rotativo.
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Teletransporte de Salas */}
        <div className="mb-4">
          <h4 className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">
            2. Teleporte no Mapa das Ruínas:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_entrance', 320, 300);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • Entrada & Flores Douradas
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_puzzle', 320, 320);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • Enigma dos Espinhos & Baú
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_crossroads', 320, 300);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • Cruzamento (Toriel & Sans)
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_boss_gate', 320, 320);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • Portão da Corte Real
            </button>
          </div>
        </div>

        <p className="text-[10px] text-neutral-500 leading-normal border-t border-neutral-800 pt-3">
          * Dica Pacifista: Em batalha, use AGIR para cumprir as condições de cada monstro até o nome dele ficar AMARELO, depois selecione POUPAR!
        </p>
      </div>
    </div>
  );
};
