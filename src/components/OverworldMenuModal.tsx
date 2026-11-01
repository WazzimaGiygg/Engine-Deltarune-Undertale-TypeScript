import React, { useEffect, useState } from 'react';
import { Bestiary } from './Bestiary';
import { gameState } from '../engine/gameState';
import { questManager } from '../engine/questManager';
import { soundManager } from '../services/soundSynthesizer';
import { GameSaveData, PlayerStats } from '../types/game';
import { Quest, QuestCategory } from '../types/quest';
import { auth, saveSlotToCloud, loadSlotFromCloud } from '../services/firebase';

interface OverworldMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onReloadGameState?: () => void;
  onOpenShop?: () => void;
  onOpenFirebaseModal?: () => void;
  onOpenLeaderboard?: () => void;
}

export type MenuTab = 'ITEM' | 'STAT' | 'BESTIARY' | 'QUEST' | 'PHONE' | 'EQUIP' | 'SAVE';
type QuestFilter = 'all' | 'active' | 'completed';

export const OverworldMenuModal: React.FC<OverworldMenuModalProps> = ({
  isOpen,
  onClose,
  stats,
  onReloadGameState,
  onOpenShop,
  onOpenFirebaseModal,
  onOpenLeaderboard,
}) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('ITEM');
  const [selectedItemIdx, setSelectedItemIdx] = useState<number>(0);
  const [selectedQuestIdx, setSelectedQuestIdx] = useState<number>(0);
  const [questFilter, setQuestFilter] = useState<QuestFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<QuestCategory | 'all'>('all');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [phoneDialog, setPhoneDialog] = useState<string>('');
  const [quests, setQuests] = useState<Quest[]>(() => questManager.getQuests());
  const [allSlots, setAllSlots] = useState(() => gameState.getAllSaveSlots());
  const [activeSlot, setActiveSlot] = useState<number>(() => gameState.getActiveSlot());
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<number | null>(null);
  const [selectedBackupSlot, setSelectedBackupSlot] = useState<number>(1);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [showImportBox, setShowImportBox] = useState<boolean>(false);
  const [selectedEquipIdx, setSelectedEquipIdx] = useState<number>(0);
  const [equipFilter, setEquipFilter] = useState<'all' | 'weapon' | 'armor'>('all');
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(0);

  const refreshSlots = () => {
    setAllSlots(gameState.getAllSaveSlots());
    const curActive = gameState.getActiveSlot();
    setActiveSlot(curActive);
    setImportJsonText(gameState.exportSaveAsJson(curActive) || '');
  };

  // Sync save data and reset local dialog states when opening
  useEffect(() => {
    if (isOpen) {
      refreshSlots();
      setConfirmDeleteSlot(null);
      setShowImportBox(false);
      setSelectedEquipIdx(0);
      setSelectedSlotIdx(Math.max(0, gameState.getActiveSlot() - 1));
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

  const inventoryGear = stats.inventory
    .map((item, originalIndex) => ({ item, originalIndex }))
    .filter(({ item }) => {
      if (equipFilter === 'weapon') return item.type === 'weapon';
      if (equipFilter === 'armor') return item.type === 'armor';
      return item.type === 'weapon' || item.type === 'armor';
    });

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
        } else if (activeTab === 'EQUIP') {
          setSelectedEquipIdx((prev) => Math.max(0, prev - 1));
        } else if (activeTab === 'SAVE') {
          setSelectedSlotIdx((prev) => Math.max(0, prev - 1));
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
        } else if (activeTab === 'EQUIP') {
          setSelectedEquipIdx((prev) =>
            Math.min(Math.max(0, inventoryGear.length - 1), prev + 1)
          );
        } else if (activeTab === 'SAVE') {
          setSelectedSlotIdx((prev) => Math.min(2, prev + 1));
        }
      } else if (key === 'ARROWLEFT' || key === 'A') {
        e.preventDefault();
        soundManager.playMenuMove();
        const tabs: MenuTab[] = ['ITEM', 'STAT', 'BESTIARY', 'QUEST', 'PHONE', 'EQUIP', 'SAVE'];
        const currentIdx = tabs.indexOf(activeTab);
        const nextIdx = (currentIdx - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIdx]);
        setStatusMessage('');
        setPhoneDialog('');
      } else if (key === 'ARROWRIGHT' || key === 'D') {
        e.preventDefault();
        soundManager.playMenuMove();
        const tabs: MenuTab[] = ['ITEM', 'STAT', 'BESTIARY', 'QUEST', 'PHONE', 'EQUIP', 'SAVE'];
        const currentIdx = tabs.indexOf(activeTab);
        const nextIdx = (currentIdx + 1) % tabs.length;
        setActiveTab(tabs[nextIdx]);
        setStatusMessage('');
        setPhoneDialog('');
      } else if (activeTab === 'SAVE' && (key === '1' || key === '2' || key === '3')) {
        e.preventDefault();
        soundManager.playMenuMove();
        setSelectedSlotIdx(parseInt(key, 10) - 1);
      } else if (key === 'Z' || key === 'ENTER') {
        if (activeTab === 'ITEM' && stats.inventory[selectedItemIdx]) {
          e.preventDefault();
          handleUseItem(selectedItemIdx);
        } else if (activeTab === 'EQUIP' && inventoryGear[selectedEquipIdx]) {
          e.preventDefault();
          const target = inventoryGear[selectedEquipIdx];
          handleToggleEquip(target.originalIndex, target.item.type as 'weapon' | 'armor');
        } else if (activeTab === 'SAVE') {
          e.preventDefault();
          handleSaveToSlot(selectedSlotIdx + 1);
        }
      } else if (key === 'X' || key === 'BACKSPACE') {
        e.preventDefault();
        soundManager.playMenuMove();
        setStatusMessage('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    activeTab,
    selectedItemIdx,
    selectedQuestIdx,
    selectedEquipIdx,
    stats.inventory,
    filteredQuests.length,
    inventoryGear.length,
    onClose,
  ]);

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
  const encounteredCount = gameState.getEncounteredMonsterIds().length;

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

  const handleToggleEquip = (originalIndex: number, type: 'weapon' | 'armor') => {
    soundManager.playSave();
    const result =
      type === 'weapon'
        ? gameState.equipWeaponFromInventory(originalIndex)
        : gameState.equipArmorFromInventory(originalIndex);
    setStatusMessage(result.message);
  };

  const handleUnequip = (type: 'weapon' | 'armor') => {
    soundManager.playMenuSelect();
    const result = type === 'weapon' ? gameState.unequipWeapon() : gameState.unequipArmor();
    setStatusMessage(result.message);
  };

  const handleSaveToSlot = async (slot: number) => {
    soundManager.playSave();
    const curRoomName = gameState.getCurrentRoomName();
    const success = gameState.saveGame(curRoomName, slot);
    if (success) {
      refreshSlots();
      let cloudMsg = '';
      if (auth.currentUser) {
        try {
          const slotData = gameState.getSaveSlotData(slot);
          if (slotData) {
            await saveSlotToCloud(auth.currentUser.uid, slot, slotData as any);
            cloudMsg = ' + Nuvem Firebase Sincronizada!';
          }
        } catch {
          // continue
        }
      }
      setStatusMessage(`* Progresso gravado no Slot ${slot} com sucesso! Local: [${curRoomName}]. HP restaurado!${cloudMsg}`);
    } else {
      setStatusMessage(`* Erro ao gravar dados no Slot ${slot}.`);
    }
  };

  const handleUploadToCloud = async (slot: number) => {
    if (!auth.currentUser) {
      onOpenFirebaseModal?.();
      return;
    }
    const slotData = gameState.getSaveSlotData(slot);
    if (!slotData) {
      setStatusMessage(`* Slot ${slot} está vazio no localStorage para enviar.`);
      return;
    }
    soundManager.playSave();
    try {
      await saveSlotToCloud(auth.currentUser.uid, slot, slotData as any);
      setStatusMessage(`* Slot ${slot} enviado e salvo na nuvem do Google Firebase com sucesso!`);
    } catch {
      setStatusMessage(`* Erro ao sincronizar Slot ${slot} com o Firebase.`);
    }
  };

  const handleDownloadFromCloud = async (slot: number) => {
    if (!auth.currentUser) {
      onOpenFirebaseModal?.();
      return;
    }
    soundManager.playMenuSelect();
    try {
      const cloudData = await loadSlotFromCloud(auth.currentUser.uid, slot);
      if (!cloudData) {
        setStatusMessage(`* Nenhum save encontrado na nuvem para o Slot ${slot}.`);
        return;
      }
      const ok = gameState.importSaveFromJson(JSON.stringify(cloudData), slot);
      if (ok) {
        soundManager.playSave();
        refreshSlots();
        setStatusMessage(`* Slot ${slot} baixado da nuvem do Firebase com sucesso! Local: [${cloudData.roomName || cloudData.currentRoom}].`);
        onReloadGameState?.();
      }
    } catch {
      setStatusMessage(`* Erro ao baixar dados da nuvem.`);
    }
  };

  const handleLoadFromSlot = (slot: number) => {
    soundManager.playSave();
    const ok = gameState.loadFromSlot(slot);
    if (ok) {
      refreshSlots();
      const slotData = gameState.getSaveSlotData(slot);
      setStatusMessage(
        `* Slot ${slot} carregado com sucesso! Local: [${slotData?.roomName || slotData?.currentRoom}].`
      );
      onReloadGameState?.();
    } else {
      setStatusMessage(`* O Slot ${slot} está vazio ou não possui dados válidos.`);
    }
  };

  const handleDeleteSlot = (slot: number) => {
    soundManager.playMenuSelect();
    gameState.deleteSlot(slot);
    setConfirmDeleteSlot(null);
    refreshSlots();
    setStatusMessage(`* Dados do Slot ${slot} foram apagados do localStorage.`);
  };

  const handleSetActiveSlot = (slot: number) => {
    soundManager.playMenuSelect();
    gameState.setActiveSlot(slot);
    refreshSlots();
    setStatusMessage(
      `* Slot ${slot} agora é o SLOT ATIVO! Salvamento rápido e automático gravarão neste slot.`
    );
  };

  const handleCopyJson = () => {
    const raw = gameState.exportSaveAsJson(selectedBackupSlot);
    if (!raw) {
      setStatusMessage(`* O Slot ${selectedBackupSlot} está vazio para exportar.`);
      return;
    }
    soundManager.playMenuSelect();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(raw).catch(() => {});
    }
    setImportJsonText(raw);
    setStatusMessage(`* JSON do Slot ${selectedBackupSlot} copiado para a área de transferência!`);
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) {
      setStatusMessage('* Cole o código JSON do save no campo de texto.');
      return;
    }
    const ok = gameState.importSaveFromJson(importJsonText, selectedBackupSlot);
    if (ok) {
      soundManager.playSave();
      refreshSlots();
      setStatusMessage(`* Save importado e restaurado no Slot ${selectedBackupSlot} com sucesso!`);
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
            {(['ITEM', 'STAT', 'BESTIARY', 'QUEST', 'PHONE', 'EQUIP', 'SAVE'] as MenuTab[]).map((tab) => {
              const labels: Record<MenuTab, string> = {
                ITEM: 'ITEM',
                STAT: 'DADOS',
                BESTIARY: `BESTIÁRIO (${encounteredCount})`,
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

          <div className="flex items-center gap-2">
            {onOpenShop && (
              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  onClose();
                  onOpenShop();
                }}
                className="px-2.5 py-1 text-xs border border-yellow-500/70 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1 font-bold"
                title="Abrir Bazar / Loja de Monstros"
              >
                <span>★</span>
                <span>LOJA</span>
              </button>
            )}

            {onOpenLeaderboard && (
              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  onClose();
                  onOpenLeaderboard();
                }}
                className="px-2.5 py-1 text-xs border border-yellow-500/80 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1 font-bold"
                title="Abrir Placar Global de Pontos Firebase"
              >
                <span>🏆</span>
                <span>PLACAR</span>
              </button>
            )}

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

            {/* Link to Bestiary */}
            <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 p-3 border border-neutral-800">
              <div>
                <span className="text-[10px] text-neutral-400 block font-bold tracking-wide">
                  REGISTRO DE CRIATURAS DO SUBTERRÂNEO
                </span>
                <span className="text-xs text-yellow-300 font-bold">
                  {encounteredCount} de 5 Monstros Catalogados
                </span>
              </div>
              <div className="flex items-center gap-2">
                {onOpenLeaderboard && (
                  <button
                    onClick={() => {
                      soundManager.playMenuSelect();
                      onClose();
                      onOpenLeaderboard();
                    }}
                    className="px-3 py-1.5 text-xs border border-yellow-500/80 bg-yellow-950/50 text-yellow-300 hover:bg-yellow-900 hover:border-yellow-300 transition-colors cursor-pointer flex items-center gap-1.5 font-bold shadow-[0_0_8px_rgba(250,204,21,0.2)]"
                  >
                    <span>🏆 PLACAR GLOBAL</span>
                    <span>→</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    soundManager.playMenuSelect();
                    setActiveTab('BESTIARY');
                    setStatusMessage('');
                  }}
                  className="px-3 py-1.5 text-xs border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
                >
                  <span>📖 BESTIÁRIO</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab: BESTIARY (Bestiário das Ruínas) */}
        {activeTab === 'BESTIARY' && (
          <div className="border border-neutral-800 p-4 bg-neutral-950">
            <Bestiary />
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

        {/* Tab 5: EQUIP (VISUALIZAR E ALTERNAR EQUIPAMENTOS) */}
        {activeTab === 'EQUIP' && (
          <div className="border border-neutral-800 p-4 sm:p-5 bg-neutral-950 min-h-[300px] space-y-4">
            {/* Header: Title and Live Combat Power Stats */}
            <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-2.5 gap-2">
              <h4 className="text-xs text-yellow-300 font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="text-yellow-400">★</span>
                <span>GESTÃO DE EQUIPAMENTOS DE COMBATE</span>
              </h4>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="text-neutral-400">PODER TOTAL:</span>
                <span className="text-emerald-400 font-bold border border-emerald-500/40 bg-emerald-950/30 px-2 py-0.5">
                  ATK {stats.atk + stats.weapon.value} ({stats.atk}+{stats.weapon.value})
                </span>
                <span className="text-blue-400 font-bold border border-blue-500/40 bg-blue-950/30 px-2 py-0.5">
                  DEF {stats.def + stats.armor.value} ({stats.def}+{stats.armor.value})
                </span>
              </div>
            </div>

            {/* Currently Equipped Loadout (Visualização de Equipamentos Atuais) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Equipped Weapon Card */}
              <div className="border-2 border-emerald-500/70 bg-black p-3 space-y-2 relative shadow-inner">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 text-xs font-bold">🗡️ ARMA EQUIPADA</span>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/50 px-1 py-0.2">
                      ATIVO
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    +{stats.weapon.value} ATK
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-white tracking-wide">
                    {stats.weapon.name}
                  </h5>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                    {stats.weapon.description}
                  </p>
                  <p className="text-[10px] text-emerald-300/90 mt-1 italic font-mono">
                    "{stats.weapon.flavor}"
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                  <span className="text-[9px] text-neutral-500">
                    ATK Base: {stats.atk} + Bônus: {stats.weapon.value}
                  </span>
                  {stats.weapon.id !== 'stick' ? (
                    <button
                      onClick={() => handleUnequip('weapon')}
                      className="px-2.5 py-1 border border-neutral-600 bg-neutral-900 hover:border-red-400 hover:text-red-300 text-neutral-300 text-[10px] transition-colors cursor-pointer"
                      title="Voltar ao Graveto inicial e guardar esta arma na mochila"
                    >
                      Desequipar
                    </button>
                  ) : (
                    <span className="text-[9px] text-neutral-600 font-mono">[Arma Inicial]</span>
                  )}
                </div>
              </div>

              {/* Equipped Armor Card */}
              <div className="border-2 border-blue-500/70 bg-black p-3 space-y-2 relative shadow-inner">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-400 text-xs font-bold">🛡️ ARMADURA EQUIPADA</span>
                    <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-500/50 px-1 py-0.2">
                      ATIVO
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    +{stats.armor.value} DEF
                  </span>
                </div>

                <div>
                  <h5 className="text-sm font-bold text-white tracking-wide">
                    {stats.armor.name}
                  </h5>
                  <p className="text-[11px] text-neutral-300 mt-0.5 leading-snug">
                    {stats.armor.description}
                  </p>
                  <p className="text-[10px] text-blue-300/90 mt-1 italic font-mono">
                    "{stats.armor.flavor}"
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
                  <span className="text-[9px] text-neutral-500">
                    DEF Base: {stats.def} + Bônus: {stats.armor.value}
                  </span>
                  {stats.armor.id !== 'bandage' ? (
                    <button
                      onClick={() => handleUnequip('armor')}
                      className="px-2.5 py-1 border border-neutral-600 bg-neutral-900 hover:border-red-400 hover:text-red-300 text-neutral-300 text-[10px] transition-colors cursor-pointer"
                      title="Voltar ao Curativo inicial e guardar esta armadura na mochila"
                    >
                      Desequipar
                    </button>
                  ) : (
                    <span className="text-[9px] text-neutral-600 font-mono">[Armadura Inicial]</span>
                  )}
                </div>
              </div>
            </div>

            {/* Available Gear to Toggle from Inventory (Alternar Equipamentos da Mochila) */}
            <div className="border border-neutral-800 bg-black/60 p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-2 gap-2">
                <span className="text-xs text-yellow-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="text-red-500">♥</span>
                  <span>EQUIPAMENTOS DISPONÍVEIS NA MOCHILA ({inventoryGear.length})</span>
                </span>

                {/* Sub-filters for Inventory Gear */}
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={() => {
                      soundManager.playMenuMove();
                      setEquipFilter('all');
                      setSelectedEquipIdx(0);
                    }}
                    className={`px-2 py-0.5 border cursor-pointer ${
                      equipFilter === 'all'
                        ? 'border-yellow-400 bg-yellow-950 text-yellow-300 font-bold'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Todos ({stats.inventory.filter((i) => i.type === 'weapon' || i.type === 'armor').length})
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playMenuMove();
                      setEquipFilter('weapon');
                      setSelectedEquipIdx(0);
                    }}
                    className={`px-2 py-0.5 border cursor-pointer ${
                      equipFilter === 'weapon'
                        ? 'border-emerald-400 bg-emerald-950 text-emerald-300 font-bold'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Armas ({stats.inventory.filter((i) => i.type === 'weapon').length})
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playMenuMove();
                      setEquipFilter('armor');
                      setSelectedEquipIdx(0);
                    }}
                    className={`px-2 py-0.5 border cursor-pointer ${
                      equipFilter === 'armor'
                        ? 'border-blue-400 bg-blue-950 text-blue-300 font-bold'
                        : 'border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    Armaduras ({stats.inventory.filter((i) => i.type === 'armor').length})
                  </button>
                </div>
              </div>

              {/* Items List or Empty State */}
              {inventoryGear.length > 0 ? (
                <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                  {inventoryGear.map(({ item, originalIndex }, idx) => {
                    const isSelected = selectedEquipIdx === idx;
                    const isWeapon = item.type === 'weapon';
                    const diff = isWeapon
                      ? item.value - stats.weapon.value
                      : item.value - stats.armor.value;

                    return (
                      <div
                        key={`${item.id}-${originalIndex}`}
                        onClick={() => {
                          soundManager.playMenuMove();
                          setSelectedEquipIdx(idx);
                        }}
                        className={`p-2.5 border text-xs flex flex-wrap items-center justify-between gap-2 transition-all ${
                          isSelected
                            ? 'border-yellow-400 bg-neutral-900 text-yellow-300 shadow-[0_0_12px_rgba(255,255,0,0.15)]'
                            : 'border-neutral-800 bg-black/80 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-[200px] flex-1">
                          <span className={`text-xs ${isSelected ? 'text-red-500' : 'opacity-0'}`}>
                            ♥
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{item.name}</span>
                              <span
                                className={`text-[9px] px-1 py-0.2 border ${
                                  isWeapon
                                    ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
                                    : 'border-blue-600 bg-blue-950 text-blue-300'
                                }`}
                              >
                                {isWeapon ? 'ARMA' : 'ARMADURA'}
                              </span>
                            </div>
                            <p className="text-[10px] text-neutral-400 mt-0.5">{item.description}</p>
                          </div>
                        </div>

                        {/* Stat Comparison against currently equipped */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[9px] text-neutral-500 block">COMPARATIVO:</span>
                            <span
                              className={`text-[11px] font-mono font-bold ${
                                diff > 0
                                  ? 'text-emerald-400'
                                  : diff < 0
                                  ? 'text-red-400'
                                  : 'text-neutral-400'
                              }`}
                            >
                              {diff > 0 ? `▲ +${diff}` : diff < 0 ? `▼ ${diff}` : '= Mesmo'}{' '}
                              {isWeapon ? 'ATK' : 'DEF'}
                            </span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleEquip(originalIndex, isWeapon ? 'weapon' : 'armor');
                            }}
                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 border border-yellow-200"
                            title={`Alternar para ${item.name} e guardar o equipamento atual na mochila`}
                          >
                            <span>♥</span>
                            <span>ALTERNAR</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 px-4 text-center border border-neutral-900 bg-black/40 space-y-2">
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    * Nenhuma {equipFilter === 'weapon' ? 'outra arma' : equipFilter === 'armor' ? 'outra armadura' : 'outra peça de equipamento'} encontrada na sua mochila.
                  </p>
                  <p className="text-[10px] text-neutral-500">
                    Abra baús secretos pelas Ruínas ou visite o Bazar de Monstros para comprar novos itens de combate!
                  </p>
                  {onOpenShop && (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          soundManager.playMenuSelect();
                          onClose();
                          onOpenShop();
                        }}
                        className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>★</span>
                        <span>IR AO BAZAR DE MONSTROS (LOJA)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[10px] text-neutral-500 italic border-t border-neutral-900 pt-2">
              * Dica: Você também pode usar as [Setas / WASD] e apertar [Z / Enter] para alternar rapidamente seus equipamentos.
            </p>
          </div>
        )}

        {/* Tab 6: SAVE (3 SLOTS DE ARQUIVO / PERSISTÊNCIA LOCALSTORAGE) */}
        {activeTab === 'SAVE' && (
          <div className="border border-neutral-800 p-4 sm:p-5 bg-neutral-950 min-h-[300px] space-y-4">
            <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-2.5 gap-2">
              <h4 className="text-xs text-yellow-300 font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="text-yellow-400">★</span>
                <span>GERENCIADOR DE ARQUIVO · 3 SLOTS DE DETERMINAÇÃO</span>
              </h4>
              <div className="flex items-center gap-2.5">
                {onOpenFirebaseModal && (
                  <button
                    onClick={() => {
                      soundManager.playMenuSelect();
                      onOpenFirebaseModal();
                    }}
                    className="px-2.5 py-1 text-[11px] border border-emerald-500/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
                    title="Conectar ou gerenciar Salvamento na Nuvem Google Firebase"
                  >
                    <span>☁️</span>
                    <span>NUVEM FIREBASE</span>
                    {auth.currentUser ? (
                      <span className="text-[9px] text-emerald-400 font-mono">[CONECTADO]</span>
                    ) : (
                      <span className="text-[9px] text-yellow-400 font-mono">[ENTRAR]</span>
                    )}
                  </button>
                )}
                <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                  <span>SLOT ATIVO:</span>
                  <span className="text-yellow-300 font-bold border border-yellow-500/50 bg-yellow-950/40 px-1.5 py-0.5">
                    SLOT {activeSlot}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Distinct Save Slots List */}
            <div className="space-y-3">
              {allSlots.map(({ slot, data, isActive }) => {
                const isConfirmingDelete = confirmDeleteSlot === slot;
                const isSelected = selectedSlotIdx === slot - 1;

                return (
                  <div
                    key={slot}
                    onClick={() => setSelectedSlotIdx(slot - 1)}
                    className={`border-2 p-3 text-xs font-pixel transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-yellow-400'
                        : ''
                    } ${
                      isActive
                        ? 'border-yellow-400 bg-black shadow-[0_0_15px_rgba(255,255,0,0.15)]'
                        : data
                        ? 'border-neutral-700 bg-neutral-950 hover:border-neutral-500'
                        : 'border-neutral-900 bg-neutral-950/60 opacity-80'
                    }`}
                  >
                    {/* Slot Header Bar */}
                    <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 pb-2 mb-2 gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isSelected ? 'text-red-500 animate-pulse' : 'opacity-0'}`}>
                          ♥
                        </span>
                        <span className="text-sm font-bold text-white tracking-wider">
                          SLOT {slot}
                        </span>
                        {isActive && (
                          <span className="text-[10px] text-yellow-300 font-bold bg-yellow-950/60 border border-yellow-500/80 px-2 py-0.5 flex items-center gap-1">
                            <span className="text-red-500 text-xs">♥</span>
                            <span>SLOT ATIVO (AUTO-SAVE)</span>
                          </span>
                        )}
                        {!data && (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            [VAZIO]
                          </span>
                        )}
                      </div>

                      {data && (
                        <div className="flex items-center gap-3 text-[10px] text-neutral-300 font-mono">
                          <span className="text-yellow-300 font-bold">{data.stats.name.toUpperCase()}</span>
                          <span>LV {data.stats.lv}</span>
                          <span className="text-neutral-400">
                            TEMPO:{' '}
                            {Math.floor((data.playtimeSeconds || 0) / 60)
                              .toString()
                              .padStart(2, '0')}
                            :
                            {((data.playtimeSeconds || 0) % 60)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Slot Body Details */}
                    {data ? (
                      <div className="space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-neutral-500 block text-[9px]">LOCAL REGISTRADO:</span>
                            <span className="text-yellow-200 font-bold text-xs">
                              {data.roomName || data.currentRoom}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-500 block text-[9px]">DATA & HORA:</span>
                            <span className="text-neutral-300 text-[10px] font-mono">
                              {new Date(data.timestamp).toLocaleDateString('pt-BR')}{' '}
                              {new Date(data.timestamp).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-neutral-300 pt-1.5 border-t border-neutral-900 bg-neutral-900/40 p-1.5">
                          <div>
                            <span className="text-neutral-500 block text-[8px]">HP:</span>
                            <span className="text-red-400 font-bold">
                              {data.stats.hp} / {data.stats.maxHp}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[8px]">OURO:</span>
                            <span className="text-yellow-400 font-bold">{data.stats.gold} G</span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[8px]">EQUIPAMENTO:</span>
                            <span className="text-neutral-200 truncate block">
                              {data.stats.weapon.name}
                            </span>
                          </div>
                          <div>
                            <span className="text-neutral-500 block text-[8px]">CONDUTA:</span>
                            <span className="text-blue-300 block">
                              {data.stats.kills === 0 ? 'Pacifista' : `${data.stats.kills} Kills`}
                            </span>
                          </div>
                        </div>

                        {/* Slot Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between pt-2 gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLoadFromSlot(slot);
                              }}
                              className="px-3 py-1.5 border border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400 hover:text-black text-yellow-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span>♥</span>
                              <span>CARREGAR</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveToSlot(slot);
                              }}
                              className="px-3 py-1.5 border border-neutral-600 bg-neutral-900 hover:border-yellow-400 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                              title={`Gravar o estado atual no Slot ${slot}`}
                            >
                              <span>★</span>
                              <span>SOBRESCREVER</span>
                            </button>

                            {!isActive && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetActiveSlot(slot);
                                }}
                                className="px-2.5 py-1.5 border border-purple-500/80 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                title={`Tornar o Slot ${slot} o slot ativo para salvamento automático ao entrar em novas salas`}
                              >
                                <span>★</span>
                                <span>TORNAR ATIVO</span>
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUploadToCloud(slot);
                              }}
                              className="px-2 py-1.5 border border-emerald-600 bg-emerald-950/40 hover:bg-emerald-900 text-emerald-300 font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                              title={`Enviar Slot ${slot} para a Nuvem Google Firebase`}
                            >
                              <span>☁️</span>
                              <span>NUVEM ↑</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFromCloud(slot);
                              }}
                              className="px-2 py-1.5 border border-cyan-600 bg-cyan-950/40 hover:bg-cyan-900 text-cyan-300 font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                              title={`Restaurar Slot ${slot} da Nuvem Google Firebase`}
                            >
                              <span>⬇</span>
                              <span>NUVEM ↓</span>
                            </button>
                          </div>

                          {/* Delete Slot Confirmation */}
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1.5 text-[10px]" onClick={(e) => e.stopPropagation()}>
                              <span className="text-red-400 font-bold">Apagar Slot {slot}?</span>
                              <button
                                onClick={() => handleDeleteSlot(slot)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white font-bold transition-colors cursor-pointer"
                              >
                                Sim
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSlot(null)}
                                className="px-2 py-1 border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteSlot(slot);
                              }}
                              className="text-[10px] text-neutral-500 hover:text-red-400 transition-colors cursor-pointer underline"
                            >
                              Apagar Slot
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Empty Slot View */
                      <div className="flex flex-wrap items-center justify-between py-2 gap-2 text-xs">
                        <span className="text-neutral-500 text-[11px]">
                          * [Nenhum registro de jogo gravado neste slot]
                        </span>
                        <div className="flex items-center gap-2">
                          {!isActive && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetActiveSlot(slot);
                              }}
                              className="px-2.5 py-1.5 border border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-300 text-[11px] transition-colors cursor-pointer"
                              title={`Definir Slot ${slot} como ativo`}
                            >
                              Definir como Ativo
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveToSlot(slot);
                            }}
                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-yellow-200"
                          >
                            <span>★</span>
                            <span>GRAVAR NESTE SLOT</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Auto-save explanation badge */}
            <div className="border border-neutral-800 bg-black/70 p-2.5 text-[10px] text-neutral-400 flex items-center gap-2">
              <span className="text-yellow-400 font-bold text-xs">★</span>
              <span>
                <strong>Salvamento Automático Ativo:</strong> Ao trocar de sala, seu progresso é gravado automaticamente no <span className="text-yellow-300 font-bold">Slot {activeSlot}</span>.
              </span>
            </div>

            {/* JSON Backup Panel Toggle */}
            <div className="pt-2 flex flex-wrap items-center justify-between border-t border-neutral-900 text-[10px] gap-2">
              <button
                onClick={() => {
                  soundManager.playMenuMove();
                  setShowImportBox((prev) => !prev);
                }}
                className="px-2.5 py-1 border border-neutral-700 bg-neutral-900 hover:border-neutral-500 text-neutral-300 transition-colors cursor-pointer"
              >
                {showImportBox ? 'Fechar Backup JSON' : 'Exportar / Importar Backup JSON'}
              </button>

              <span className="text-neutral-600 text-[9px]">
                HTML5 Storage · Slots 1, 2 e 3
              </span>
            </div>

            {/* Expandable JSON Backup Panel */}
            {showImportBox && (
              <div className="border border-neutral-800 p-3 bg-black space-y-2 text-xs animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-yellow-300 font-bold text-[10px]">
                    TRANSFERÊNCIA DE ARQUIVO (EXPORTAR / IMPORTAR JSON):
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-neutral-400">Escolha o Slot:</span>
                    {[1, 2, 3].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSelectedBackupSlot(s);
                          setImportJsonText(gameState.exportSaveAsJson(s) || '');
                        }}
                        className={`px-1.5 py-0.5 border text-[9px] cursor-pointer ${
                          selectedBackupSlot === s
                            ? 'border-yellow-400 bg-yellow-950 text-yellow-300 font-bold'
                            : 'border-neutral-800 text-neutral-400'
                        }`}
                      >
                        Slot {s}
                      </button>
                    ))}
                  </div>
                </div>

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
                    className="px-3 py-1.5 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer"
                  >
                    Copiar JSON do Slot {selectedBackupSlot}
                  </button>
                  <button
                    onClick={handleImportJson}
                    className="px-3 py-1.5 border border-yellow-500 bg-yellow-950 text-yellow-300 hover:bg-yellow-900 cursor-pointer"
                  >
                    Importar no Slot {selectedBackupSlot}
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
