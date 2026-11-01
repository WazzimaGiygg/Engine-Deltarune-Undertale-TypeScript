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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <button
              onClick={() => {
                soundManager.playBattleStart();
                onSelectBattle('dummy');
                onClose();
              }}
              className="p-3 text-left border border-neutral-700 bg-neutral-950 hover:border-yellow-400 hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-orange-300 font-bold block mb-1 group-hover:text-orange-200">
                Boneco de Treino
              </span>
              <span className="text-[10px] text-neutral-400 block">HP: 15 · ATK: 0</span>
              <span className="text-[9px] text-neutral-500 block mt-1">
                Treinamento pacífico ou violento de Toriel.
              </span>
            </button>

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

            <button
              onClick={() => {
                soundManager.playBattleStart();
                onSelectBattle('flowey');
                onClose();
              }}
              className="p-3 text-left border border-neutral-700 bg-neutral-950 hover:border-yellow-400 hover:bg-neutral-900 transition-colors group cursor-pointer"
            >
              <span className="text-xs text-yellow-400 font-bold block mb-1 group-hover:text-yellow-300">
                Flowey
              </span>
              <span className="text-[10px] text-neutral-400 block">HP: 20 · Tutorial</span>
              <span className="text-[9px] text-neutral-500 block mt-1">
                Balinhas da amizade e anel mortal.
              </span>
            </button>
          </div>
        </div>

        {/* Section 2: Teletransporte de Salas */}
        <div className="mb-4">
          <h4 className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">
            2. Teleporte no Mapa das Ruínas:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs max-h-56 overflow-y-auto pr-1">
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_awakening', 320, 240);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-yellow-300 hover:text-yellow-200"
            >
              • 0. O Despertar (Flores)
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_flowey', 240, 240);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-yellow-300 hover:text-yellow-200"
            >
              • 1. Clareira de Flowey
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_toriel_entrance', 320, 320);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-yellow-300 hover:text-yellow-200"
            >
              • 2. Entrada das Ruínas
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_switch_chamber', 320, 340);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 3. Sala Interruptores
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_dummy_room', 320, 320);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 4. Sala do Manequim
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_puzzle', 320, 320);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 5. Enigma de Espinhos
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('ruins_long_hall', 320, 340);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 6. O Longo Corredor
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_toriel_house_exterior', 240, 310);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-yellow-300 hover:text-yellow-200"
            >
              • 7. Fachada da Casa
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_toriel_house_interior', 320, 360);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-yellow-300 hover:text-yellow-200"
            >
              • 8. Casa de Toriel (Sala)
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_toriel_hallway', 320, 260);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-yellow-300 hover:text-yellow-200"
            >
              • 9. Casa de Toriel (Corredor)
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_player_bedroom', 320, 340);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 10. Quarto da Criança
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_toriel_bedroom', 320, 340);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 11. Quarto de Toriel
            </button>
            <button
              onClick={() => {
                soundManager.playMenuSelect();
                onWarpRoom('room_toriel_basement', 200, 230);
                onClose();
              }}
              className="p-2 border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 text-left text-[11px] text-neutral-300 hover:text-white"
            >
              • 12. Saída Subterrânea
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
