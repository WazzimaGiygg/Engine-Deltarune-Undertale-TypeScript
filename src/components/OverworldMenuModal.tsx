import React, { useState } from 'react';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';
import { GameItem, PlayerStats } from '../types/game';

interface OverworldMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

type MenuTab = 'ITEM' | 'STAT' | 'PHONE' | 'EQUIP';

export const OverworldMenuModal: React.FC<OverworldMenuModalProps> = ({
  isOpen,
  onClose,
  stats,
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('ITEM');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [phoneDialog, setPhoneDialog] = useState<string>('');

  if (!isOpen) return null;

  const handleUseItem = (idx: number) => {
    const item = stats.inventory[idx];
    if (!item) return;

    soundManager.playMenuSelect();
    const res = gameState.useItem(idx);
    setStatusMessage(res.message);
    if (selectedItemIdx >= stats.inventory.length - 1) {
      setSelectedItemIdx(Math.max(0, stats.inventory.length - 2));
    }
  };

  const handleDropItem = (idx: number) => {
    const item = stats.inventory[idx];
    if (!item) return;

    soundManager.playMenuMove();
    gameState.dropItem(idx);
    setStatusMessage(`* Você jogou o item [${item.name}] no chão das ruínas.`);
    if (selectedItemIdx >= stats.inventory.length - 1) {
      setSelectedItemIdx(Math.max(0, stats.inventory.length - 2));
    }
  };

  const handleCallPhone = (contact: 'toriel' | 'sans') => {
    soundManager.playMenuSelect();
    if (contact === 'toriel') {
      soundManager.playVoiceBlip('toriel');
      const torielQuotes = [
        '* (Toca, toca...)\n* "Alô? Aqui é a Toriel, minha criança!\n* Você está comendo bem? Lembre-se que você sempre pode descansar no leito de flores se estiver com sono."',
        '* (Toca, toca...)\n* "Olá de novo! Estou preparando uma nova receita de torta de caramelo.\n* Você prefere canela ou caramelo? Mal posso esperar para ouvir sua resposta!"',
        '* (Toca, toca...)\n* "Querida criança, se você encontrar algum monstro travesso, tente conversar com eles. A gentileza é a maior virtude do coração humano."',
      ];
      setPhoneDialog(torielQuotes[Math.floor(Math.random() * torielQuotes.length)]);
    } else {
      soundManager.playVoiceBlip('sans');
      const sansQuotes = [
        '* (Toca, toca...)\n* "e aí, pivete.\n* se você vir meu irmão papyrus por aí, elogie o cachecol dele. ele passou três horas arrumando na frente do espelho."',
        '* (Toca, toca...)\n* "sabia que esqueletos não sentem frio? nós não temos pele pra arrepiar.\n* ...tá bom, essa foi meio sem osso."',
        '* (Toca, toca...)\n* "tô aqui descansando no meu posto de vigia. trabalhar duro cansa, então eu prefiro mal trabalhar."',
      ];
      setPhoneDialog(sansQuotes[Math.floor(Math.random() * sansQuotes.length)]);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu do Jogo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-2xl bg-black border-4 border-white p-6 rounded-none text-white font-pixel shadow-[0_0_20px_rgba(255,255,255,0.2)]">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-red-500 text-lg">♥</span>
            <span className="text-lg tracking-wider text-yellow-300">MENU</span>
          </div>

          <div className="flex items-center gap-2">
            {(['ITEM', 'STAT', 'PHONE', 'EQUIP'] as MenuTab[]).map((tab) => {
              const labels: Record<MenuTab, string> = {
                ITEM: 'ITEM',
                STAT: 'DADOS',
                PHONE: 'CELULAR',
                EQUIP: 'EQUIPAR',
              };
              const isCurrent = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    soundManager.playMenuMove();
                    setActiveTab(tab);
                    setStatusMessage('');
                    setPhoneDialog('');
                  }}
                  className={`px-3 py-1.5 text-xs transition-colors cursor-pointer border ${
                    isCurrent
                      ? 'border-yellow-400 bg-neutral-900 text-yellow-300'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="px-2 py-1 text-xs text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-400 transition-colors"
          >
            [X] Fechar
          </button>
        </div>

        {/* Tab 1: ITEM */}
        {activeTab === 'ITEM' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[220px]">
            <div className="border border-neutral-800 p-3 bg-neutral-950">
              <h4 className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">
                Inventário ({stats.inventory.length}/8)
              </h4>
              {stats.inventory.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">Nenhum item carregado.</p>
              ) : (
                <div className="space-y-2">
                  {stats.inventory.map((item, idx) => {
                    const isSelected = selectedItemIdx === idx;
                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => {
                          soundManager.playMenuMove();
                          setSelectedItemIdx(idx);
                        }}
                        className={`flex items-center justify-between p-2 text-xs cursor-pointer border ${
                          isSelected
                            ? 'border-yellow-400 bg-neutral-900 text-yellow-200'
                            : 'border-transparent text-white hover:bg-neutral-900/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={isSelected ? 'text-red-500' : 'opacity-0'}>♥</span>
                          <span>{item.name}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">{item.flavor}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Item Details and Actions */}
            <div className="border border-neutral-800 p-4 bg-neutral-950 flex flex-col justify-between">
              {stats.inventory[selectedItemIdx] ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-yellow-300 font-bold">
                      {stats.inventory[selectedItemIdx].name}
                    </span>
                    <span className="text-[10px] uppercase text-neutral-400">
                      {stats.inventory[selectedItemIdx].type === 'heal' ? 'Consumível' : 'Equipamento'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                    {stats.inventory[selectedItemIdx].description}
                  </p>
                  <p className="text-[11px] text-emerald-400">
                    Efeito: {stats.inventory[selectedItemIdx].flavor}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">Selecione um item ao lado para ver detalhes.</p>
              )}

              {stats.inventory[selectedItemIdx] && (
                <div className="flex items-center gap-3 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => handleUseItem(selectedItemIdx)}
                    className="flex-1 py-2 text-xs bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-colors"
                  >
                    USAR / EQUIPAR
                  </button>
                  <button
                    onClick={() => handleDropItem(selectedItemIdx)}
                    className="px-4 py-2 text-xs border border-red-500/50 text-red-400 hover:bg-red-950 transition-colors"
                  >
                    LARGAR
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: STAT */}
        {activeTab === 'STAT' && (
          <div className="border border-neutral-800 p-6 bg-neutral-950 min-h-[220px]">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">NOME / ALMA</span>
                <span className="text-sm text-white font-bold">{stats.name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">LOVE (NÍVEL)</span>
                <span className="text-sm text-yellow-400 font-bold">LV {stats.lv}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">PONTOS DE VIDA</span>
                <span className="text-sm text-red-400 font-bold">
                  {stats.hp} / {stats.maxHp}
                </span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">ATAQUE (ATK)</span>
                <span className="text-sm text-white">
                  {stats.atk} ({stats.weapon.value >= 0 ? `+${stats.weapon.value}` : stats.weapon.value})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">DEFESA (DEF)</span>
                <span className="text-sm text-white">
                  {stats.def} ({stats.armor.value >= 0 ? `+${stats.armor.value}` : stats.armor.value})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">OURO ACUMULADO</span>
                <span className="text-sm text-yellow-300 font-bold">{stats.gold} G</span>
              </div>

              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">EXPERIÊNCIA (EXP)</span>
                <span className="text-xs text-neutral-300">{stats.exp}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">PRÓXIMO NÍVEL</span>
                <span className="text-xs text-neutral-300">{stats.expNext - stats.exp} EXP</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">ROTA MORAL</span>
                <span className="text-xs text-blue-400">
                  {stats.kills === 0 ? 'PACIFISTA PURO' : `NEUTRO (${stats.kills} abatidos)`}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-neutral-500 text-[10px] block">ARMA EQUIPADA:</span>
                <span className="text-emerald-400 font-bold">{stats.weapon.name}</span>{' '}
                <span className="text-neutral-400">({stats.weapon.flavor})</span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">ARMADURA EQUIPADA:</span>
                <span className="text-blue-400 font-bold">{stats.armor.name}</span>{' '}
                <span className="text-neutral-400">({stats.armor.flavor})</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: PHONE */}
        {activeTab === 'PHONE' && (
          <div className="border border-neutral-800 p-6 bg-neutral-950 min-h-[220px]">
            <div className="flex gap-4 mb-4">
              <button
                onClick={() => handleCallPhone('toriel')}
                className="flex-1 py-3 border border-purple-500/60 bg-purple-950/30 text-purple-200 text-xs hover:bg-purple-900/40 transition-colors"
              >
                Ligar para Mamãe Toriel
              </button>
              <button
                onClick={() => handleCallPhone('sans')}
                className="flex-1 py-3 border border-blue-500/60 bg-blue-950/30 text-blue-200 text-xs hover:bg-blue-900/40 transition-colors"
              >
                Ligar para Sans & Papyrus
              </button>
            </div>

            <div className="border border-neutral-800 bg-black p-4 rounded min-h-[110px]">
              {phoneDialog ? (
                <p className="text-xs text-white leading-relaxed whitespace-pre-line">{phoneDialog}</p>
              ) : (
                <p className="text-xs text-neutral-500 text-center py-6">
                  Selecione um contato para discar usando seu celular subterrâneo...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: EQUIP */}
        {activeTab === 'EQUIP' && (
          <div className="border border-neutral-800 p-6 bg-neutral-950 min-h-[220px]">
            <h4 className="text-xs text-neutral-400 mb-4 uppercase tracking-wide">
              Gerenciar Equipamentos de Combate
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border border-neutral-700 p-3 bg-neutral-900">
                <span className="text-[10px] text-neutral-400 block mb-1">ARMA ATUAL</span>
                <span className="text-sm text-emerald-400 font-bold block">{stats.weapon.name}</span>
                <span className="text-xs text-neutral-300 block mt-1">{stats.weapon.description}</span>
                <span className="text-xs text-neutral-400 block mt-1">{stats.weapon.flavor}</span>
              </div>

              <div className="border border-neutral-700 p-3 bg-neutral-900">
                <span className="text-[10px] text-neutral-400 block mb-1">ARMADURA ATUAL</span>
                <span className="text-sm text-blue-400 font-bold block">{stats.armor.name}</span>
                <span className="text-xs text-neutral-300 block mt-1">{stats.armor.description}</span>
                <span className="text-xs text-neutral-400 block mt-1">{stats.armor.flavor}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              * Dica: Abra a aba <strong className="text-yellow-300">[ITEM]</strong> para equipar armas ou armaduras encontradas em baús nas Ruínas.
            </p>
          </div>
        )}

        {/* Status Message Footer */}
        {statusMessage && (
          <div className="mt-4 p-3 border border-yellow-500/50 bg-neutral-900 text-xs text-yellow-200">
            {statusMessage}
          </div>
        )}

        {/* Navigation Key Hint */}
        <div className="mt-6 flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-800 pt-3">
          <span>[Z] Confirmar / Usar</span>
          <span>[X] Voltar</span>
          <span>[C] Fechar Menu</span>
        </div>
      </div>
    </div>
  );
};
