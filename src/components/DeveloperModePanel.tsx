import { Shield, Sparkles, Terminal, Wand2, X } from 'lucide-react';
import React, { useState } from 'react';
import { ALL_ITEMS } from '../data/defaultData';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';
import { PlayerStats } from '../types/game';

interface DeveloperModePanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onSelectBattle: (enemyId: string) => void;
  onWarpRoom: (roomId: string, x: number, y: number) => void;
  onReloadGameState?: () => void;
}

export const DeveloperModePanel: React.FC<DeveloperModePanelProps> = ({
  isOpen,
  onClose,
  stats,
  onSelectBattle,
  onWarpRoom,
  onReloadGameState,
}) => {
  const [customHp, setCustomHp] = useState(stats.hp);
  const [customAtk, setCustomAtk] = useState(stats.atk);
  const [customDef, setCustomDef] = useState(stats.def);
  const [customGold, setCustomGold] = useState(stats.gold);
  const [customLv, setCustomLv] = useState(stats.lv);
  const [godMode, setGodMode] = useState(false);
  const [devMessage, setDevMessage] = useState('');

  if (!isOpen) return null;

  const handleApplyStats = () => {
    stats.hp = Math.min(stats.maxHp, Number(customHp));
    stats.atk = Number(customAtk);
    stats.def = Number(customDef);
    stats.gold = Number(customGold);
    stats.lv = Number(customLv);
    soundManager.playSave();
    setDevMessage('* Estatísticas do jogador atualizadas com sucesso no motor!');
  };

  const handleGiveItem = (itemId: string) => {
    const item = ALL_ITEMS.find((i) => i.id === itemId);
    if (!item) return;

    const added = gameState.addItem(item);
    if (added) {
      soundManager.playSave();
      setDevMessage(`* Item [${item.name}] adicionado ao inventário!`);
    } else {
      setDevMessage('* Inventário já possui o limite de 8 itens.');
    }
  };

  const toggleGodMode = () => {
    const next = !godMode;
    setGodMode(next);
    if (next) {
      stats.hp = 99;
      stats.maxHp = 99;
      stats.atk = 99;
      stats.def = 99;
      soundManager.playSave();
      setDevMessage('* MODO DEUS ATIVADO: HP 99/99, ATK 99, DEF 99!');
    } else {
      stats.hp = 20;
      stats.maxHp = 20;
      stats.atk = 10;
      stats.def = 10;
      setDevMessage('* Modo Deus Desativado. Estatísticas normalizadas.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Painel de Desenvolvedor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl bg-black border-4 border-yellow-400 p-6 text-white font-pixel shadow-[0_0_40px_rgba(250,204,21,0.3)] my-auto max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-yellow-400/40 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-sm font-bold text-yellow-300 tracking-wider">
                PAINEL DO DESENVOLVEDOR (MOTOR DE JOGO)
              </h2>
              <span className="text-[9px] text-neutral-400 block mt-0.5">
                Desbloqueado com a sequência secreta: &quot;lula132026&quot;
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white border border-neutral-700 hover:border-yellow-400 bg-neutral-900 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Voltar ao Jogo</span>
          </button>
        </div>

        {/* Status notification */}
        {devMessage && (
          <div className="mb-5 p-2.5 bg-yellow-950/60 border border-yellow-500/70 text-xs text-yellow-200">
            {devMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1: Invocador de Batalhas e Monstros */}
          <div className="border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-yellow-400 font-bold border-b border-neutral-800 pb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>TESTADOR DE COMBATE (BULLET-HELL)</span>
            </div>

            <p className="text-[10px] text-neutral-400 mb-3 leading-normal">
              Inicie combates imediatamente para testar inteligência dos mobs, padrões de esquiva e mercy:
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  onSelectBattle('froggit');
                  onClose();
                }}
                className="w-full text-left p-2.5 border border-neutral-700 bg-neutral-900 hover:border-yellow-400 hover:bg-neutral-850 transition-colors text-xs flex items-center justify-between"
              >
                <div>
                  <span className="text-yellow-300 font-bold block">Froggit das Ruínas</span>
                  <span className="text-[9px] text-neutral-400">Padrão: Saltos e moscas giratórias</span>
                </div>
                <span className="text-[10px] text-neutral-500">HP 30 · ATK 4</span>
              </button>

              <button
                onClick={() => {
                  onSelectBattle('sir_ossos');
                  onClose();
                }}
                className="w-full text-left p-2.5 border border-neutral-700 bg-neutral-900 hover:border-red-400 hover:bg-neutral-850 transition-colors text-xs flex items-center justify-between"
              >
                <div>
                  <span className="text-red-400 font-bold block">Sir Ossos (Papyrus)</span>
                  <span className="text-[9px] text-neutral-400">Padrão: Ataque azul e ondas de ossos</span>
                </div>
                <span className="text-[10px] text-neutral-500">HP 75 · ATK 7</span>
              </button>

              <button
                onClick={() => {
                  onSelectBattle('deltajester');
                  onClose();
                }}
                className="w-full text-left p-2.5 border border-neutral-700 bg-neutral-900 hover:border-purple-400 hover:bg-neutral-850 transition-colors text-xs flex items-center justify-between"
              >
                <div>
                  <span className="text-purple-400 font-bold block">Bufão Caótico (Deltarune)</span>
                  <span className="text-[9px] text-neutral-400">Padrão: Estrelas caóticas orbitais</span>
                </div>
                <span className="text-[10px] text-neutral-500">HP 90 · ATK 9</span>
              </button>
            </div>
          </div>

          {/* Section 2: Editor de Estatísticas em Tempo Real */}
          <div className="border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex items-center justify-between mb-3 border-b border-neutral-800 pb-2">
              <div className="flex items-center gap-2 text-xs text-yellow-400 font-bold">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span>ESTATÍSTICAS DO JOGADOR</span>
              </div>
              <button
                onClick={toggleGodMode}
                className={`text-[9px] px-2 py-1 border transition-colors ${
                  godMode
                    ? 'border-yellow-400 bg-yellow-400 text-black font-bold'
                    : 'border-neutral-700 text-neutral-400 hover:text-white'
                }`}
              >
                {godMode ? '★ MODO DEUS ATIVO' : 'MODO DEUS (OFF)'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">HP Atual:</label>
                <input
                  type="number"
                  value={customHp}
                  onChange={(e) => setCustomHp(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Love (LV):</label>
                <input
                  type="number"
                  value={customLv}
                  onChange={(e) => setCustomLv(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Ataque (ATK):</label>
                <input
                  type="number"
                  value={customAtk}
                  onChange={(e) => setCustomAtk(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">Defesa (DEF):</label>
                <input
                  type="number"
                  value={customDef}
                  onChange={(e) => setCustomDef(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[10px] text-neutral-400 block mb-1">Ouro (G):</label>
                <input
                  type="number"
                  value={customGold}
                  onChange={(e) => setCustomGold(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-700 px-2 py-1 text-white text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleApplyStats}
              className="w-full py-2 bg-yellow-400 text-black font-bold text-xs hover:bg-yellow-300 transition-colors"
            >
              Aplicar ao Motor
            </button>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => {
                  gameState.saveGame();
                  soundManager.playSave();
                  setDevMessage('* Progresso salvo no localStorage via motor de Save!');
                }}
                className="flex-1 py-1.5 border border-yellow-500 bg-neutral-900 text-yellow-300 font-bold text-[10px] hover:bg-neutral-800 transition-colors"
              >
                ★ Salvar Jogo
              </button>
              <button
                onClick={() => {
                  const ok = gameState.loadFromStorage();
                  if (ok) {
                    soundManager.playSave();
                    onReloadGameState?.();
                    setDevMessage('* Save carregado com sucesso do localStorage!');
                  } else {
                    setDevMessage('* Nenhum arquivo salvo encontrado no armazenamento.');
                  }
                }}
                className="flex-1 py-1.5 border border-neutral-700 bg-neutral-900 text-neutral-300 font-bold text-[10px] hover:bg-neutral-800 transition-colors"
              >
                Carregar Save
              </button>
            </div>
          </div>

          {/* Section 3: Teleporte de Cenários */}
          <div className="border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex items-center gap-2 mb-3 text-xs text-yellow-400 font-bold border-b border-neutral-800 pb-2">
              <Wand2 className="w-4 h-4 text-yellow-400" />
              <span>TELEPORTE NO CENÁRIO</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  onWarpRoom('room_awakening', 180, 260);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px] text-yellow-300"
              >
                0. Despertar (Flores)
              </button>
              <button
                onClick={() => {
                  onWarpRoom('room_flowey', 110, 240);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px] text-yellow-300"
              >
                1. Clareira do Flowey
              </button>
              <button
                onClick={() => {
                  onWarpRoom('room_toriel_entrance', 320, 320);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px] text-yellow-300"
              >
                2. Entrada das Ruínas
              </button>
              <button
                onClick={() => {
                  onWarpRoom('ruins_switch_chamber', 320, 320);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px] text-yellow-300"
              >
                3. Sala Interruptores
              </button>
              <button
                onClick={() => {
                  onWarpRoom('ruins_dummy_room', 320, 320);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px] text-yellow-300"
              >
                4. Sala do Manequim
              </button>
              <button
                onClick={() => {
                  onWarpRoom('ruins_puzzle', 320, 320);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px]"
              >
                5. Enigma de Espinhos
              </button>
              <button
                onClick={() => {
                  onWarpRoom('ruins_crossroads', 320, 300);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px]"
              >
                6. Cruzamento Monstros
              </button>
              <button
                onClick={() => {
                  onWarpRoom('ruins_boss_gate', 320, 320);
                  onClose();
                }}
                className="p-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-left text-[10px]"
              >
                7. Portão dos Guardiões
              </button>
            </div>

            <div className="mt-2.5 pt-2 border-t border-neutral-850">
              <button
                onClick={() => {
                  gameState.setFlag('flowey_met', false);
                  gameState.setFlag('frisk_awoken', true);
                  soundManager.playSave();
                  onWarpRoom('room_flowey', 110, 240);
                  setDevMessage('* Flag "flowey_met" resetada! Cutscene de Flowey reativada.');
                  onClose();
                }}
                className="w-full py-1.5 border border-yellow-600/60 bg-yellow-950/40 hover:bg-yellow-900/60 text-yellow-300 font-bold text-[9px] transition-colors"
              >
                ↺ Resetar e Rejogar Encontro com Flowey
              </button>
            </div>
          </div>

          {/* Section 4: Gerador de Itens */}
          <div className="border border-neutral-800 bg-neutral-950 p-4">
            <h4 className="text-xs text-yellow-400 font-bold mb-3 border-b border-neutral-800 pb-2">
              DISPENSADOR DE ITENS
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs max-h-40 overflow-y-auto pr-1">
              {ALL_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleGiveItem(item.id)}
                  className="p-1.5 border border-neutral-800 bg-neutral-900 hover:border-yellow-400 text-left text-[9px] truncate"
                  title={item.name}
                >
                  + {item.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 pt-3 border-t border-neutral-800 flex items-center justify-between text-[9px] text-neutral-500">
          <span>Undertale T.S Developer Engine · Versão 0.0.2</span>
          <span>Sequência secreta de ativação: lula132026</span>
        </div>
      </div>
    </div>
  );
};
