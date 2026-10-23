import React, { useEffect, useState } from 'react';
import { gameState } from '../engine/gameState';
import { questManager } from '../engine/questManager';
import { soundManager } from '../services/soundSynthesizer';
import { GameSaveData, PlayerStats } from '../types/game';
import { Quest, QuestCategory } from '../types/quest';

interface OverworldMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onReloadGameState?: () => void;
}

export type MenuTab = 'ITEM' | 'STAT' | 'QUEST' | 'PHONE' | 'EQUIP' | 'SAVE';
type QuestFilter = 'all' | 'active' | 'completed';

export const OverworldMenuModal: React.FC<OverworldMenuModalProps> = ({
  isOpen,
  onClose,
  stats,
  onReloadGameState,
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('ITEM');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [selectedQuestIdx, setSelectedQuestIdx] = useState<number>(0);
  const [questFilter, setQuestFilter] = useState<QuestFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<QuestCategory | 'all'>('all');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [phoneDialog, setPhoneDialog] = useState<string>('');
  const [quests, setQuests] = useState<Quest[]>(() => questManager.getQuests());
  const [saveData, setSaveData] = useState<GameSaveData | null>(() => gameState.getLastSavedData());
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);

  // Sync save data and reset local dialog states when opening
  useEffect(() => {
    if (isOpen) {
      setSaveData(gameState.getLastSavedData());
      setConfirmDelete(false);
      setShowImportBox(false);
      setImportJsonText(gameState.exportSaveAsJson() || '');
    }
  }, [isOpen]);

  // Subscribe to quest updates whenever menu is open or quests change
  useEffect(() => {
    if (!isOpen) return;
    const unsub = questManager.subscribe((newList) => {
      setQuests(newList);
    });
    return () => unsub();
  }, [isOpen]);

  // Filtered quest list
  const filteredQuests = quests.filter((q) => {
    if (questFilter === 'active' && q.status !== 'active') return false;
    if (questFilter === 'completed' && q.status !== 'completed') return false;
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
    return true;
  });

  const selectedQuest = filteredQuests[selectedQuestIdx] || filteredQuests[0];

  // Global Keyboard listener for pause menu
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      if (key === 'ESCAPE' || key === 'C') {
        e.preventDefault();
        soundManager.playMenuSelect();
        onClose();
        return;
      }

      if (key === 'ARROWUP' || key === 'W') {
        e.preventDefault();
        soundManager.playMenuMove();
        if (activeTab === 'ITEM') {
          setSelectedItemIdx((prev) => Math.max(0, prev - 1));
        } else if (activeTab === 'QUEST') {
          setSelectedQuestIdx((prev) => Math.max(0, prev - 1));
        }
      } else if (key === 'ARROWDOWN' || key === 'S') {
        e.preventDefault();
        soundManager.playMenuMove();
        if (activeTab === 'ITEM') {
          setSelectedItemIdx((prev) => Math.min(Math.max(0, stats.inventory.length - 1), prev + 1));
        } else if (activeTab === 'QUEST') {
          setSelectedQuestIdx((prev) =>
            Math.min(Math.max(0, filteredQuests.length - 1), prev + 1)
          );
        }
      } else if (key === 'ARROWLEFT' || key === 'A') {
        e.preventDefault();
        soundManager.playMenuMove();
        const tabs: MenuTab[] = ['ITEM', 'STAT', 'QUEST', 'PHONE', 'EQUIP', 'SAVE'];
        const currentIdx = tabs.indexOf(activeTab);
        const nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIdx]);
        setStatusMessage('');
        setPhoneDialog('');
      } else if (key === 'ARROWRIGHT' || key === 'D') {
        e.preventDefault();
        soundManager.playMenuMove();
        const tabs: MenuTab[] = ['ITEM', 'STAT', 'QUEST', 'PHONE', 'EQUIP', 'SAVE'];
        const currentIdx = tabs.indexOf(activeTab);
        const nextIdx = (currentIdx + 1) % tabs.length;
        setActiveTab(tabs[nextIdx]);
        setStatusMessage('');
        setPhoneDialog('');
      } else if (key === 'Z' || key === 'ENTER') {
        if (activeTab === 'ITEM' && stats.inventory[selectedItemIdx]) {
          e.preventDefault();
          handleUseItem(selectedItemIdx);
        }
      } else if (key === 'X' || key === 'BACKSPACE') {
        e.preventDefault();
        soundManager.playMenuMove();
        setStatusMessage('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, selectedItemIdx, selectedQuestIdx, stats.inventory, filteredQuests.length, onClose]);

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
      gameState.setFlag('called_toriel', true);
      soundManager.playVoiceBlip('toriel');
      const torielQuotes = [
        '* (Toca, toca...)\n* "Alô? Aqui é a Toriel, minha criança!\n* Você está comendo bem? Lembre-se que você sempre pode descansar no leito de flores se estiver com sono."',
        '* (Toca, toca...)\n* "Olá de novo! Estou preparando uma nova receita de torta de caramelo.\n* Você prefere canela ou caramelo? Mal posso esperar para ouvir sua resposta!"',
        '* (Toca, toca...)\n* "Querida criança, se você encontrar algum monstro travesso, tente conversar com eles. A gentileza é a maior virtude do coração humano."',
      ];
      setPhoneDialog(torielQuotes[Math.floor(Math.random() * torielQuotes.length)]);
    } else {
      gameState.setFlag('called_sans', true);
      soundManager.playVoiceBlip('sans');
      const sansQuotes = [
        '* (Toca, toca...)\n* "e aí, pivete.\n* se você vir meu irmão papyrus por aí, elogie o cachecol dele. ele passou três horas arrumando na frente do espelho."',
        '* (Toca, toca...)\n* "sabia que esqueletos não sentem frio? nós não temos pele pra arrepiar.\n* ...tá bom, essa foi meio sem osso."',
        '* (Toca, toca...)\n* "tô aqui descansando no meu posto de vigia. trabalhar duro cansa, então eu prefiro mal trabalhar."',
      ];
      setPhoneDialog(sansQuotes[Math.floor(Math.random() * sansQuotes.length)]);
    }
  };

  const questSummary = questManager.getSummaryStats();

  const getCategoryBadge = (cat: QuestCategory) => {
    switch (cat) {
      case 'main':
        return <span className="text-[10px] px-1.5 py-0.5 border border-yellow-500/70 text-yellow-300 bg-yellow-950/40">PRINCIPAL</span>;
      case 'side':
        return <span className="text-[10px] px-1.5 py-0.5 border border-emerald-500/70 text-emerald-300 bg-emerald-950/40">SECUNDÁRIA</span>;
      case 'exploration':
        return <span className="text-[10px] px-1.5 py-0.5 border border-cyan-500/70 text-cyan-300 bg-cyan-950/40">EXPLORAÇÃO</span>;
      case 'secret':
        return <span className="text-[10px] px-1.5 py-0.5 border border-purple-500/70 text-purple-300 bg-purple-950/40">SEGREDO</span>;
    }
  };

  const handleSaveCurrent = () => {
    soundManager.playSave();
    const curRoomName = gameState.getCurrentRoomName();
    const success = gameState.saveGame(curRoomName);
    if (success) {
      setSaveData(gameState.getLastSavedData());
      setImportJsonText(gameState.exportSaveAsJson() || '');
      setStatusMessage(`* Progresso salvo no localStorage com sucesso! Sala: [${curRoomName}]. HP restaurado!`);
    } else {
      setStatusMessage('* Erro ao gravar dados no localStorage.');
    }
  };

  const handleLoadSaved = () => {
    soundManager.playSave();
    const ok = gameState.loadFromStorage();
    if (ok) {
      const data = gameState.getLastSavedData();
      setSaveData(data);
      setImportJsonText(gameState.exportSaveAsJson() || '');
      setStatusMessage(`* Arquivo carregado com sucesso! Sala restaurada: [${data?.roomName || data?.currentRoom}].`);
      onReloadGameState?.();
    } else {
      setStatusMessage('* Nenhum arquivo salvo válido encontrado no localStorage.');
    }
  };

  const handleConfirmDelete = () => {
    soundManager.playMenuSelect();
    gameState.deleteSave();
    setSaveData(null);
    setConfirmDelete(false);
    setImportJsonText('');
    setStatusMessage('* Registro de salvamento apagado do localStorage.');
  };

  const handleCopyJson = () => {
    const raw = gameState.exportSaveAsJson();
    if (!raw) {
      setStatusMessage('* Nenhum save salvo para copiar.');
      return;
    }
    soundManager.playMenuSelect();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(raw).catch(() => {});
    }
    setImportJsonText(raw);
    setStatusMessage('* Código JSON do save copiado para a área de transferência!');
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) {
      setStatusMessage('* Cole o código JSON do save no campo de texto.');
      return;
    }
    const ok = gameState.importSaveFromJson(importJsonText);
    if (ok) {
      soundManager.playSave();
      setSaveData(gameState.getLastSavedData());
      setStatusMessage('* Save importado e restaurado no localStorage com sucesso!');
      onReloadGameState?.();
    } else {
      soundManager.playHurt();
      setStatusMessage('* Erro: Formato JSON do save inválido ou corrompido.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu do Jogo"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4"
    >
      <div className="w-full max-w-3xl bg-black border-4 border-white p-5 sm:p-6 rounded-none text-white font-pixel shadow-[0_0_24px_rgba(255,255,255,0.25)]">
        {/* Header Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-neutral-700 pb-3 mb-5 gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-red-500 text-lg animate-pulse">♥</span>
            <span className="text-base sm:text-lg tracking-wider text-yellow-300">MENU</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {(['ITEM', 'STAT', 'QUEST', 'PHONE', 'EQUIP', 'SAVE'] as MenuTab[]).map((tab) => {
              const labels: Record<MenuTab, string> = {
                ITEM: 'ITEM',
                STAT: 'DADOS',
                QUEST: `MISSÕES (${questSummary.active})`,
                PHONE: 'CELULAR',
                EQUIP: 'EQUIPAR',
                SAVE: '★ ARQUIVO',
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
                  className={`px-2.5 sm:px-3 py-1.5 text-xs transition-colors cursor-pointer border ${
                    isCurrent
                      ? 'border-yellow-400 bg-neutral-900 text-yellow-300 font-bold'
                      : 'border-transparent text-neutral-400 hover:text-white hover:border-neutral-700'
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
            className="px-2 py-1 text-xs text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-400 transition-colors cursor-pointer"
          >
            [X] Fechar
          </button>
        </div>

        {/* Tab 1: ITEM */}
        {activeTab === 'ITEM' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[260px]">
            <div className="border border-neutral-800 p-3 bg-neutral-950">
              <h4 className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">
                Inventário ({stats.inventory.length}/8)
              </h4>
              {stats.inventory.length === 0 ? (
                <p className="text-xs text-neutral-500 py-8 text-center">Nenhum item carregado.</p>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {stats.inventory.map((item, idx) => {
                    const isSelected = selectedItemIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          soundManager.playMenuMove();
                          setSelectedItemIdx(idx);
                        }}
                        className={`flex items-center justify-between p-2 border cursor-pointer text-xs transition-colors ${
                          isSelected
                            ? 'border-yellow-400 bg-neutral-900 text-yellow-300'
                            : 'border-neutral-800 hover:border-neutral-700 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={isSelected ? 'text-red-500' : 'opacity-0'}>♥</span>
                          <span>{item.name}</span>
                        </div>
                        <span className="text-[10px] text-neutral-400 uppercase">
                          {item.type === 'heal'
                            ? `+${item.value} HP`
                            : item.type === 'weapon'
                            ? `ATK +${item.value}`
                            : `DEF +${item.value}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="border border-neutral-800 p-4 bg-neutral-950 flex flex-col justify-between min-h-[260px]">
              {stats.inventory[selectedItemIdx] ? (
                <div>
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-3">
                    <h3 className="text-sm font-bold text-yellow-300">
                      {stats.inventory[selectedItemIdx].name}
                    </h3>
                    <span className="text-[10px] text-neutral-400">
                      TIPO: {stats.inventory[selectedItemIdx].type.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
                    {stats.inventory[selectedItemIdx].description}
                  </p>
                  <p className="text-xs text-neutral-500 italic">
                    "{stats.inventory[selectedItemIdx].flavor}"
                  </p>
                </div>
              ) : (
                <div className="text-xs text-neutral-500 text-center py-12">
                  Selecione um item no inventário para inspecionar.
                </div>
              )}

              {stats.inventory[selectedItemIdx] && (
                <div className="flex gap-2 pt-4 border-t border-neutral-800">
                  <button
                    onClick={() => handleUseItem(selectedItemIdx)}
                    className="flex-1 py-2 text-xs border border-yellow-400 bg-yellow-400/10 text-yellow-300 hover:bg-yellow-400/20 transition-colors font-bold cursor-pointer"
                  >
                    [Z] Usar / Equipar
                  </button>
                  <button
                    onClick={() => handleDropItem(selectedItemIdx)}
                    className="px-3 py-2 text-xs border border-neutral-700 text-neutral-400 hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
                  >
                    Largar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: STAT */}
        {activeTab === 'STAT' && (
          <div className="border border-neutral-800 p-5 bg-neutral-950 min-h-[260px]">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div>
                <h3 className="text-base text-yellow-300 font-bold">{stats.name}</h3>
                <span className="text-xs text-neutral-400">Humano Determinado</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-neutral-400 block">LOCALIZAÇÃO</span>
                <span className="text-xs text-white">
                  {gameState.getCurrentRoom().replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">LOVE (LV)</span>
                <span className="text-sm font-bold text-white">{stats.lv}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">VIDA (HP)</span>
                <span className="text-sm font-bold text-red-400">
                  {stats.hp} / {stats.maxHp}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">ATAQUE (ATK)</span>
                <span className="text-sm font-bold text-white">
                  {stats.atk} (+{stats.weapon.value})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">DEFESA (DEF)</span>
                <span className="text-sm font-bold text-white">
                  {stats.def} (+{stats.armor.value})
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">OURO (G)</span>
                <span className="text-sm font-bold text-yellow-400">{stats.gold} G</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">EXP ATUAL</span>
                <span className="text-sm font-bold text-white">{stats.exp}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">PRÓXIMO LV</span>
                <span className="text-sm font-bold text-neutral-300">
                  {stats.expNext - stats.exp} EXP
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] mb-1">CONDUTA MORAL</span>
                <span className="text-sm font-bold text-blue-400">
                  {stats.kills === 0 ? 'PACIFISTA PURO' : `NEUTRO (${stats.kills} abatidos)`}
                </span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-800 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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

            <div className="mt-3 pt-3 border-t border-neutral-900 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-neutral-500 text-[10px] block">TEMPO DE JOGO:</span>
                <span className="text-yellow-300 font-mono">{gameState.getFormattedPlaytime()}</span>
              </div>
              <div>
                <span className="text-neutral-500 text-[10px] block">ÚLTIMO PONTO DE SALVAMENTO:</span>
                <span className="text-neutral-300">
                  {gameState.getLastSavedData()?.roomName ||
                    (gameState.getFlag('game_saved_at_least_once')
                      ? 'Salvo recentemente'
                      : 'Nenhum registro ainda')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: QUEST (GERENCIADOR DE MISSÕES) */}
        {activeTab === 'QUEST' && (
          <div className="space-y-3">
            {/* Filter and stats sub-bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border border-neutral-800 p-2.5 bg-neutral-950 text-xs">
              <div className="flex items-center gap-1.5">
                {(['all', 'active', 'completed'] as QuestFilter[]).map((f) => {
                  const labels: Record<QuestFilter, string> = {
                    all: `TODAS (${questSummary.total})`,
                    active: `ATIVAS (${questSummary.active})`,
                    completed: `CONCLUÍDAS (${questSummary.completed})`,
                  };
                  const isCurrent = questFilter === f;
                  return (
                    <button
                      key={f}
                      onClick={() => {
                        soundManager.playMenuMove();
                        setQuestFilter(f);
                        setSelectedQuestIdx(0);
                      }}
                      className={`px-2 py-1 text-[10px] border cursor-pointer transition-colors ${
                        isCurrent
                          ? 'border-yellow-400 text-yellow-300 bg-yellow-950/40 font-bold'
                          : 'border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              {/* Progress Rate indicator */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-neutral-400">PROGRESSO:</span>
                <span className="text-yellow-300 font-bold font-mono">
                  {questSummary.completionRate}%
                </span>
                <div className="w-20 bg-neutral-900 border border-neutral-700 h-2.5 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-300"
                    style={{ width: `${questSummary.completionRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2-Column Quest Log View */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[300px]">
              {/* Left Column: Quest List */}
              <div className="md:col-span-5 border border-neutral-800 p-2.5 bg-neutral-950 flex flex-col justify-between">
                <div>
                  <h4 className="text-[11px] text-neutral-400 mb-2 uppercase tracking-wide flex items-center justify-between">
                    <span>Missões Disponíveis</span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {filteredQuests.length} listadas
                    </span>
                  </h4>

                  {filteredQuests.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-10 text-center">
                      Nenhuma missão encontrada neste filtro.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[270px] overflow-y-auto pr-1">
                      {filteredQuests.map((quest, idx) => {
                        const isSelected = (selectedQuest?.id === quest.id);
                        const isCompleted = quest.status === 'completed';

                        return (
                          <div
                            key={quest.id}
                            onClick={() => {
                              soundManager.playMenuMove();
                              setSelectedQuestIdx(idx);
                            }}
                            className={`p-2 border text-xs cursor-pointer transition-all ${
                              isSelected
                                ? 'border-yellow-400 bg-neutral-900 text-yellow-300'
                                : 'border-neutral-900 bg-black/60 hover:border-neutral-700 text-neutral-300'
                            }`}
                          >
                            <div className="flex items-start gap-1.5">
                              <span className={`text-xs ${isSelected ? 'text-red-500' : 'opacity-0'}`}>
                                ♥
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className={`font-bold truncate text-[11px] ${
                                      isCompleted ? 'text-emerald-400' : 'text-white'
                                    }`}
                                  >
                                    {quest.title}
                                  </span>
                                  {isCompleted ? (
                                    <span className="text-emerald-400 font-bold text-[10px]">
                                      [✓]
                                    </span>
                                  ) : (
                                    <span className="text-yellow-400 font-mono text-[9px]">
                                      {quest.progressPercent}%
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-neutral-500 truncate mt-0.5">
                                  {quest.chapter}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-neutral-600 border-t border-neutral-900 pt-2 mt-2">
                  * Use as Setas para navegar pelas tarefas
                </div>
              </div>

              {/* Right Column: Quest Details */}
              <div className="md:col-span-7 border border-neutral-800 p-4 bg-neutral-950 flex flex-col justify-between min-h-[300px]">
                {selectedQuest ? (
                  <div className="space-y-3">
                    {/* Header: Title, Category, Status */}
                    <div className="border-b border-neutral-800 pb-2.5">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        {getCategoryBadge(selectedQuest.category)}
                        {selectedQuest.status === 'completed' ? (
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/50 bg-emerald-950/30 px-2 py-0.5">
                            ★ CONCLUÍDA
                          </span>
                        ) : (
                          <span className="text-[10px] text-yellow-300 font-bold border border-yellow-500/50 bg-yellow-950/30 px-2 py-0.5">
                            EM ANDAMENTO
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-yellow-300 mt-1">
                        {selectedQuest.title}
                      </h3>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {selectedQuest.chapter}
                      </p>
                    </div>

                    {/* Flavor Text Block */}
                    <div className="bg-black border border-neutral-800 p-2.5 text-xs text-neutral-300 leading-relaxed italic">
                      {selectedQuest.flavorText}
                    </div>

                    {/* Progress Bar */}
                    <div className="border border-neutral-800 p-2 bg-neutral-900">
                      <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                        <span>Progresso dos Objetivos:</span>
                        <span className="text-yellow-300 font-mono font-bold">
                          {selectedQuest.progressPercent}%
                        </span>
                      </div>
                      <div className="w-full bg-black border border-neutral-700 h-2">
                        <div
                          className={`h-full transition-all duration-300 ${
                            selectedQuest.status === 'completed'
                              ? 'bg-emerald-400'
                              : 'bg-yellow-400'
                          }`}
                          style={{ width: `${selectedQuest.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Objectives Checklist */}
                    <div>
                      <h4 className="text-[10px] text-neutral-400 uppercase tracking-wide mb-1.5">
                        Objetivos a Cumprir:
                      </h4>
                      <div className="space-y-1.5">
                        {selectedQuest.objectives.map((obj) => (
                          <div
                            key={obj.id}
                            className={`flex items-start gap-2 text-xs p-1.5 border ${
                              obj.isCompleted
                                ? 'border-emerald-800/60 bg-emerald-950/20 text-emerald-200'
                                : 'border-neutral-900 bg-black text-neutral-300'
                            }`}
                          >
                            <span
                              className={`font-bold ${
                                obj.isCompleted ? 'text-emerald-400' : 'text-neutral-500'
                              }`}
                            >
                              {obj.isCompleted ? '[✓]' : '[ ]'}
                            </span>
                            <span className="flex-1 text-[11px] leading-snug">
                              {obj.description}
                            </span>
                            {obj.targetCount && obj.targetCount > 1 && (
                              <span className="text-[9px] text-neutral-400 font-mono">
                                ({obj.currentCount || 0}/{obj.targetCount})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Reward description */}
                    <div className="border-t border-neutral-800 pt-2 text-[10px]">
                      <span className="text-neutral-500 block mb-0.5">RECOMPENSA PREVISTA:</span>
                      <span className="text-yellow-200">{selectedQuest.rewardText}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 text-center py-16">
                    Selecione uma missão para visualizar o diário.
                  </div>
                )}

                {/* Undertale Atmosphere footer quote */}
                <div className="text-[9px] text-yellow-400/80 border-t border-neutral-900 pt-2 mt-3 italic">
                  * Ver suas tarefas registradas nas Ruínas enche você de DETERMINAÇÃO.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: PHONE */}
        {activeTab === 'PHONE' && (
          <div className="border border-neutral-800 p-5 bg-neutral-950 min-h-[260px]">
            <h4 className="text-xs text-neutral-400 mb-3 uppercase tracking-wide">
              Contatos Gravados no Celular Subterrâneo
            </h4>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <button
                onClick={() => handleCallPhone('toriel')}
                className="flex-1 py-3 border border-purple-500/60 bg-purple-950/30 text-purple-200 text-xs hover:bg-purple-900/40 transition-colors cursor-pointer"
              >
                ☎ Ligar para Mamãe Toriel
              </button>
              <button
                onClick={() => handleCallPhone('sans')}
                className="flex-1 py-3 border border-blue-500/60 bg-blue-950/30 text-blue-200 text-xs hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                ☎ Ligar para Sans & Papyrus
              </button>
            </div>

            <div className="border border-neutral-800 bg-black p-4 rounded min-h-[120px]">
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

        {/* Tab 5: EQUIP */}
        {activeTab === 'EQUIP' && (
          <div className="border border-neutral-800 p-5 bg-neutral-950 min-h-[260px]">
            <h4 className="text-xs text-neutral-400 mb-4 uppercase tracking-wide">
              Gerenciar Equipamentos de Combate
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border border-neutral-700 p-3 bg-neutral-900">
                <span className="text-[10px] text-neutral-400 block mb-1">ARMA ATUAL</span>
                <span className="text-sm text-emerald-400 font-bold block">{stats.weapon.name}</span>
                <span className="text-xs text-neutral-300 block mt-1">{stats.weapon.description}</span>
                <span className="text-xs text-neutral-400 block mt-1 italic">"{stats.weapon.flavor}"</span>
              </div>

              <div className="border border-neutral-700 p-3 bg-neutral-900">
                <span className="text-[10px] text-neutral-400 block mb-1">ARMADURA ATUAL</span>
                <span className="text-sm text-blue-400 font-bold block">{stats.armor.name}</span>
                <span className="text-xs text-neutral-300 block mt-1">{stats.armor.description}</span>
                <span className="text-xs text-neutral-400 block mt-1 italic">"{stats.armor.flavor}"</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed border-t border-neutral-800 pt-3">
              * Dica: Abra a aba <strong className="text-yellow-300">[ITEM]</strong> para equipar armas ou armaduras encontradas em baús nas Ruínas.
            </p>
          </div>
        )}

        {/* Tab 6: SAVE (ARQUIVO / PERSISTÊNCIA LOCALSTORAGE) */}
        {activeTab === 'SAVE' && (
          <div className="border border-neutral-800 p-4 sm:p-5 bg-neutral-950 min-h-[260px] space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
              <h4 className="text-xs text-yellow-300 font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="text-yellow-400">★</span>
                <span>GERENCIADOR DE ARQUIVO (LOCALSTORAGE)</span>
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">
                {saveData ? 'STATUS: GRAVADO' : 'STATUS: VAZIO'}
              </span>
            </div>

            {/* Classic Undertale Save Card */}
            <div className="border-2 border-white bg-black p-4 text-xs font-pixel space-y-3 shadow-inner">
              {saveData ? (
                <>
                  <div className="flex items-center justify-between text-yellow-300 border-b border-neutral-800 pb-2">
                    <span className="font-bold text-sm text-white">{saveData.stats.name.toUpperCase()}</span>
                    <span className="text-yellow-300">LV {saveData.stats.lv}</span>
                    <span className="text-neutral-400 font-mono">
                      {Math.floor((saveData.playtimeSeconds || 0) / 60)
                        .toString()
                        .padStart(2, '0')}
                      :
                      {((saveData.playtimeSeconds || 0) % 60)
                        .toString()
                        .padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-white text-xs">
                    <div>
                      <span className="text-neutral-500 block text-[9px]">SALA REGISTRADA:</span>
                      <span className="text-yellow-200 font-bold">{saveData.roomName || saveData.currentRoom}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-neutral-500 block text-[9px]">DATA DA GRAVAÇÃO:</span>
                      <span className="text-neutral-400 text-[10px] font-mono">
                        {new Date(saveData.timestamp).toLocaleDateString('pt-BR')}{' '}
                        {new Date(saveData.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-neutral-300 pt-1 border-t border-neutral-900">
                    <div>
                      <span className="text-neutral-500 block text-[9px]">HP SALVO:</span>
                      <span className="text-red-400 font-bold">{saveData.stats.hp} / {saveData.stats.maxHp}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[9px]">OURO:</span>
                      <span className="text-yellow-400 font-bold">{saveData.stats.gold} G</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[9px]">EQUIPAMENTO:</span>
                      <span className="text-neutral-300 truncate block">{saveData.stats.weapon.name}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 block text-[9px]">CONDUTA:</span>
                      <span className="text-blue-300 block">{saveData.stats.kills === 0 ? 'Pacifista' : `${saveData.stats.kills} K / ${saveData.stats.spares} S`}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center space-y-1">
                  <p className="text-xs text-neutral-300">* Nenhum arquivo gravado no localStorage ainda.</p>
                  <p className="text-[10px] text-neutral-500">
                    Clique em [SALVAR PROGRESSO] abaixo para gravar sua posição e estatísticas!
                  </p>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={handleSaveCurrent}
                className="p-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-yellow-200"
              >
                <span>★</span>
                <span>SALVAR PROGRESSO</span>
              </button>

              <button
                onClick={handleLoadSaved}
                disabled={!saveData}
                className={`p-2.5 border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  saveData
                    ? 'border-neutral-500 bg-neutral-900 hover:border-yellow-400 text-white cursor-pointer'
                    : 'border-neutral-800 bg-neutral-950 text-neutral-600 cursor-not-allowed'
                }`}
              >
                <span>♥</span>
                <span>CARREGAR SAVE</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playMenuMove();
                  setShowImportBox((prev) => !prev);
                }}
                className="p-2.5 border border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-300 text-xs transition-colors cursor-pointer"
              >
                {showImportBox ? 'FECHAR BACKUP' : 'BACKUP / JSON'}
              </button>
            </div>

            {/* Danger Zone: Delete / Reset */}
            <div className="pt-2 flex flex-wrap items-center justify-between border-t border-neutral-900 text-[10px] gap-2">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">Apagar o save definitivamente?</span>
                  <button
                    onClick={handleConfirmDelete}
                    className="px-2 py-1 bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
                  >
                    Sim, Apagar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 border border-neutral-700 text-neutral-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={!saveData}
                  className={`transition-colors ${
                    saveData ? 'text-neutral-500 hover:text-red-400 cursor-pointer' : 'text-neutral-800 cursor-not-allowed'
                  }`}
                >
                  [!] Apagar Registro de Salvamento
                </button>
              )}

              <span className="text-neutral-600 text-[9px]">Chave: undertale_save_data (HTML5 Storage)</span>
            </div>

            {/* Expandable JSON Backup Panel */}
            {showImportBox && (
              <div className="border border-neutral-800 p-3 bg-black space-y-2 text-xs">
                <span className="text-yellow-300 font-bold block text-[10px]">
                  TRANSFERÊNCIA DE ARQUIVO (EXPORTAR / IMPORTAR JSON):
                </span>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder="Cole aqui o JSON de um save para restaurar..."
                  rows={3}
                  className="w-full bg-neutral-950 border border-neutral-800 p-2 text-[10px] text-neutral-300 font-mono focus:border-yellow-400 focus:outline-none"
                />
                <div className="flex gap-2 text-[10px]">
                  <button
                    onClick={handleCopyJson}
                    className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white"
                  >
                    Copiar JSON do Save
                  </button>
                  <button
                    onClick={handleImportJson}
                    className="px-3 py-1.5 border border-yellow-500 bg-yellow-950 text-yellow-300 hover:bg-yellow-900"
                  >
                    Importar e Restaurar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Message Footer */}
        {statusMessage && (
          <div className="mt-3 p-2.5 border border-yellow-500/50 bg-neutral-900 text-xs text-yellow-200">
            {statusMessage}
          </div>
        )}

        {/* Navigation Key Hint */}
        <div className="mt-4 flex flex-wrap items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-800 pt-3 gap-2">
          <span>[Setas / WASD] Navegar</span>
          <span>[Z / Enter] Confirmar / Usar</span>
          <span>[X] Voltar</span>
          <span>[C / ESC] Fechar Menu</span>
        </div>
      </div>
    </div>
  );
};
