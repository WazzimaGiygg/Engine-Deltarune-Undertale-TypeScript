import React, { useEffect, useState } from 'react';
import { ALL_ITEMS } from '../data/defaultData';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';
import { GameItem, PlayerStats } from '../types/game';

interface ShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
}

type ShopMode = 'MENU' | 'BUY' | 'SELL' | 'TALK';

interface ShopCatalogItem {
  item: GameItem;
  price: number;
  category: 'heal' | 'weapon' | 'armor';
  recommended?: boolean;
}

const SHOP_CATALOG: ShopCatalogItem[] = [
  // Healing Items
  {
    item: ALL_ITEMS.find((i) => i.id === 'monster_candy') || {
      id: 'monster_candy',
      name: 'Doce de Monstro',
      type: 'heal',
      value: 10,
      description: 'Tem gosto de alcaçuz preto e magia.',
      flavor: 'Cura 10 HP.',
    },
    price: 10,
    category: 'heal',
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'spider_donut') || {
      id: 'spider_donut',
      name: 'Rosquinha de Aranha',
      type: 'heal',
      value: 12,
      description: 'Feita com cidra de aranha. Rasteja na boca.',
      flavor: 'Cura 12 HP.',
    },
    price: 18,
    category: 'heal',
    recommended: true,
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'sea_tea') || {
      id: 'sea_tea',
      name: 'Chá Marinho',
      type: 'heal',
      value: 15,
      description: 'Feito com água bioluminescente do pântano.',
      flavor: 'Cura 15 HP.',
    },
    price: 25,
    category: 'heal',
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'butterscotch_pie') || {
      id: 'butterscotch_pie',
      name: 'Torta de Caramelo',
      type: 'heal',
      value: 99,
      description: 'Uma fatia quentinha feita com amor de mãe.',
      flavor: 'Restaura todo o HP!',
    },
    price: 80,
    category: 'heal',
  },
  // Weapons
  {
    item: ALL_ITEMS.find((i) => i.id === 'toy_knife') || {
      id: 'toy_knife',
      name: 'Faca de Brinquedo',
      type: 'weapon',
      value: 3,
      description: 'Feita de plástico resistente. Não machuca... muito.',
      flavor: 'ATK +3',
    },
    price: 30,
    category: 'weapon',
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'tough_glove') || {
      id: 'tough_glove',
      name: 'Luva Resistente',
      type: 'weapon',
      value: 5,
      description: 'Uma luva de couro surrada. Dá vontade de dar socos.',
      flavor: 'ATK +5',
    },
    price: 50,
    category: 'weapon',
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'ballet_shoes') || {
      id: 'ballet_shoes',
      name: 'Sapatilhas de Balé',
      type: 'weapon',
      value: 7,
      description: 'Sapatilhas reforçadas. Movimentos elegantes e letais.',
      flavor: 'ATK +7',
    },
    price: 85,
    category: 'weapon',
  },
  // Armors
  {
    item: ALL_ITEMS.find((i) => i.id === 'faded_ribbon') || {
      id: 'faded_ribbon',
      name: 'Fita Desbotada',
      type: 'armor',
      value: 3,
      description: 'Uma fitinha azul clara que você prende na roupa.',
      flavor: 'DEF +3',
    },
    price: 25,
    category: 'armor',
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'manly_bandanna') || {
      id: 'manly_bandanna',
      name: 'Bandana Viril',
      type: 'armor',
      value: 5,
      description: 'Tem desenho de músculos. Aumenta a coragem.',
      flavor: 'DEF +5',
    },
    price: 45,
    category: 'armor',
  },
  {
    item: ALL_ITEMS.find((i) => i.id === 'heart_locket') || {
      id: 'heart_locket',
      name: 'Medalhão de Coração',
      type: 'armor',
      value: 10,
      description: 'Diz "Melhores Amigos Para Sempre". Emite um calor afetuoso.',
      flavor: 'DEF +10',
    },
    price: 110,
    category: 'armor',
  },
];

const TALK_TOPICS = [
  {
    id: 'ruins',
    title: 'Sobre este empório',
    dialogue:
      '* "Bem-vindo ao Bazar Subterrâneo das Ruínas, pivete!\n* Nós, monstros comerciantes, coletamos coisas que caem da superfície e preparamos guloseimas com afeto.\n* Se você tiver ouro de monstro, você veio ao lugar certo!"',
  },
  {
    id: 'toriel',
    title: 'Conselhos sobre Toriel',
    dialogue:
      '* "A Rainha Toriel? Ah, ela passa por aqui às vezes colhendo lesmas e flores douradas.\n* Ela tem um coração imenso, mas carrega muita tristeza com os humanos do passado.\n* Se ela te oferecer torta... aceite sem pestanejar!"',
  },
  {
    id: 'gold',
    title: 'Como funciona o ouro',
    dialogue:
      '* "Sempre que você poupa ou resolve batalhas com monstros no Subsolo, um pouco de ressonância mágica se cristaliza em ouro (G)!\n* Você não precisa machucar ninguém para encher os bolsos. Gentileza compensa!"',
  },
  {
    id: 'barrier',
    title: 'A Grande Barreira',
    dialogue:
      '* "Dizem que além das Ruínas, passando por Snowdin e Cachoeira, fica o Castelo Real e a Barreira.\n* Mantenha-se determinado, pequeno humano. O Subsolo pode ser assustador, mas há muitos amigos pelo caminho."',
  },
];

export const ShopModal: React.FC<ShopModalProps> = ({ isOpen, onClose, stats }) => {
  const [mode, setMode] = useState<ShopMode>('MENU');
  const [menuIndex, setMenuIndex] = useState<number>(0);
  const [catalogIndex, setCatalogIndex] = useState<number>(0);
  const [inventoryIndex, setInventoryIndex] = useState<number>(0);
  const [talkIndex, setTalkIndex] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [merchantMood, setMerchantMood] = useState<'neutral' | 'happy' | 'thinking' | 'wink'>('neutral');
  const [talkText, setTalkText] = useState<string>(
    '* "Olá, jovem viajante! Precisa de mantimentos ou quer trocar tralhas por ouro?"'
  );

  // Reset states when opening
  useEffect(() => {
    if (isOpen) {
      setMode('MENU');
      setMenuIndex(0);
      setCatalogIndex(0);
      setInventoryIndex(0);
      setTalkIndex(0);
      setStatusMessage('');
      setMerchantMood('neutral');
      setTalkText('* "Olá, jovem viajante! Precisa de mantimentos ou quer trocar tralhas por ouro?"');
    }
  }, [isOpen]);

  // Calculate sell price for an item
  const getSellPrice = (item: GameItem): number => {
    if (item.type === 'key') return 0;
    const catalogMatch = SHOP_CATALOG.find((c) => c.item.id === item.id);
    if (catalogMatch) {
      return Math.max(5, Math.floor(catalogMatch.price * 0.6));
    }
    if (item.type === 'heal') return Math.max(6, item.value * 2);
    if (item.type === 'weapon' || item.type === 'armor') return Math.max(12, item.value * 8);
    return 8;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();

      if (key === 'ESCAPE' || key === 'C') {
        e.preventDefault();
        soundManager.playMenuMove();
        if (mode !== 'MENU') {
          setMode('MENU');
          setStatusMessage('');
        } else {
          onClose();
        }
        return;
      }

      if (key === 'X' || key === 'BACKSPACE') {
        e.preventDefault();
        soundManager.playMenuMove();
        if (mode !== 'MENU') {
          setMode('MENU');
          setStatusMessage('');
        } else {
          onClose();
        }
        return;
      }

      // Mode MENU Navigation
      if (mode === 'MENU') {
        if (key === 'ARROWUP' || key === 'W') {
          e.preventDefault();
          soundManager.playMenuMove();
          setMenuIndex((prev) => (prev - 1 + 4) % 4);
        } else if (key === 'ARROWDOWN' || key === 'S') {
          e.preventDefault();
          soundManager.playMenuMove();
          setMenuIndex((prev) => (prev + 1) % 4);
        } else if (key === 'Z' || key === 'ENTER') {
          e.preventDefault();
          soundManager.playMenuSelect();
          executeMenuSelection(menuIndex);
        }
      }

      // Mode BUY Navigation
      else if (mode === 'BUY') {
        if (key === 'ARROWUP' || key === 'W') {
          e.preventDefault();
          soundManager.playMenuMove();
          setCatalogIndex((prev) => Math.max(0, prev - 1));
        } else if (key === 'ARROWDOWN' || key === 'S') {
          e.preventDefault();
          soundManager.playMenuMove();
          setCatalogIndex((prev) => Math.min(SHOP_CATALOG.length - 1, prev + 1));
        } else if (key === 'Z' || key === 'ENTER') {
          e.preventDefault();
          const target = SHOP_CATALOG[catalogIndex];
          if (target) {
            handleBuy(target);
          }
        }
      }

      // Mode SELL Navigation
      else if (mode === 'SELL') {
        if (stats.inventory.length > 0) {
          if (key === 'ARROWUP' || key === 'W') {
            e.preventDefault();
            soundManager.playMenuMove();
            setInventoryIndex((prev) => Math.max(0, prev - 1));
          } else if (key === 'ARROWDOWN' || key === 'S') {
            e.preventDefault();
            soundManager.playMenuMove();
            setInventoryIndex((prev) => Math.min(stats.inventory.length - 1, prev + 1));
          } else if (key === 'Z' || key === 'ENTER') {
            e.preventDefault();
            handleSell(inventoryIndex);
          }
        }
      }

      // Mode TALK Navigation
      else if (mode === 'TALK') {
        if (key === 'ARROWUP' || key === 'W') {
          e.preventDefault();
          soundManager.playMenuMove();
          setTalkIndex((prev) => Math.max(0, prev - 1));
        } else if (key === 'ARROWDOWN' || key === 'S') {
          e.preventDefault();
          soundManager.playMenuMove();
          setTalkIndex((prev) => Math.min(TALK_TOPICS.length - 1, prev + 1));
        } else if (key === 'Z' || key === 'ENTER') {
          e.preventDefault();
          const topic = TALK_TOPICS[talkIndex];
          if (topic) {
            soundManager.playMenuSelect();
            soundManager.playVoiceBlip('monster');
            setTalkText(topic.dialogue);
            setMerchantMood('wink');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, menuIndex, catalogIndex, inventoryIndex, talkIndex, stats.inventory, onClose]);

  if (!isOpen) return null;

  const executeMenuSelection = (idx: number) => {
    switch (idx) {
      case 0: // COMPRAR
        setMode('BUY');
        setCatalogIndex(0);
        setMerchantMood('happy');
        setTalkText('* "Dê uma olhada nas nossas maravilhas! Tudo com procedência subterrânea legítima."');
        break;
      case 1: // VENDER
        setMode('SELL');
        setInventoryIndex(0);
        setMerchantMood('thinking');
        setTalkText('* "O que você tem aí na sua mochila? Pagamos bom ouro por itens de qualidade!"');
        break;
      case 2: // CONVERSAR
        setMode('TALK');
        setTalkIndex(0);
        setMerchantMood('wink');
        setTalkText('* "Gosta de uma boa prosa? Tenho histórias das Ruínas que poucos conhecem..."');
        break;
      case 3: // SAIR
        soundManager.playMenuSelect();
        onClose();
        break;
    }
  };

  const handleBuy = (catalogItem: ShopCatalogItem) => {
    const { item, price } = catalogItem;
    const canAfford = stats.gold >= price;
    const hasSpace = stats.inventory.length < 8;

    if (!hasSpace) {
      soundManager.playMenuMove();
      setStatusMessage('* Seu inventário já está cheio (máx. 8 itens)! Venda ou descarte algo primeiro.');
      setMerchantMood('thinking');
      return;
    }

    if (!canAfford) {
      soundManager.playMenuMove();
      setStatusMessage(`* Você não tem ouro suficiente! Precisa de ${price} G, mas só tem ${stats.gold} G.`);
      setMerchantMood('thinking');
      return;
    }

    soundManager.playSave();
    soundManager.playVoiceBlip('monster');
    const result = gameState.buyItem(item, price);
    setStatusMessage(result.message);
    setMerchantMood('happy');
    setTalkText(`* "Obrigado pela compra! [${item.name}] é uma excelente escolha, jovem."`);
  };

  const handleSell = (idx: number) => {
    const item = stats.inventory[idx];
    if (!item) return;

    if (item.type === 'key') {
      soundManager.playMenuMove();
      setStatusMessage('* "Ei! Isso parece importante demais para ser vendido. Fique com ele!"');
      setMerchantMood('thinking');
      return;
    }

    const price = getSellPrice(item);
    soundManager.playSave();
    soundManager.playVoiceBlip('monster');
    const res = gameState.sellItem(idx, price);
    setStatusMessage(res.message);
    setMerchantMood('happy');
    setTalkText(`* "Negócio fechado! Guardarei o [${item.name}] com carinho na prateleira."`);
    if (inventoryIndex >= stats.inventory.length - 1) {
      setInventoryIndex(Math.max(0, stats.inventory.length - 2));
    }
  };

  const selectedCatalog = SHOP_CATALOG[catalogIndex];
  const selectedInventoryItem = stats.inventory[inventoryIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Loja das Ruínas"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none font-pixel"
    >
      <div className="w-full max-w-2xl bg-black border-4 border-white text-white p-4 sm:p-5 shadow-[0_0_35px_rgba(255,255,255,0.25)] flex flex-col justify-between min-h-[520px]">
        {/* Top Header: Shop Title & Player Balances */}
        <div className="flex flex-wrap items-center justify-between border-b-2 border-neutral-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-sm">★</span>
            <h2 className="text-xs sm:text-sm font-bold tracking-widest text-white">
              LOJA DAS RUÍNAS · BAZAR DE MONSTROS
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 border border-yellow-500/60 bg-yellow-950/40 px-2.5 py-1">
              <span className="text-yellow-400">♥</span>
              <span className="text-neutral-400 text-[10px]">OURO:</span>
              <span className="text-yellow-300 font-bold font-mono">{stats.gold} G</span>
            </div>

            <div className="flex items-center gap-1.5 border border-neutral-700 bg-neutral-900 px-2.5 py-1">
              <span className="text-neutral-400 text-[10px]">MOCHILA:</span>
              <span
                className={`font-mono font-bold ${
                  stats.inventory.length >= 8 ? 'text-red-400' : 'text-emerald-300'
                }`}
              >
                {stats.inventory.length}/8
              </span>
            </div>
          </div>
        </div>

        {/* Middle Section: Merchant Animated Portrait & Dialogue Speech Box */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 my-3">
          {/* Merchant Portrait Frame */}
          <div className="md:col-span-4 border-2 border-neutral-700 bg-neutral-950 p-3 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Retro Pixel Mascot Frame */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-900 border-2 border-yellow-400/70 flex flex-col items-center justify-center relative mb-2 shadow-inner">
              <span className="text-3xl sm:text-4xl select-none animate-pulse">
                {merchantMood === 'happy' && 'ฅ^•ﻌ•^ฅ'}
                {merchantMood === 'wink' && '(=^･ω･^=)'}
                {merchantMood === 'thinking' && '(=^-ω-^=)'}
                {merchantMood === 'neutral' && '(=^･ｪ･^=)'}
              </span>
              <span className="absolute bottom-1 text-[8px] text-yellow-300 font-bold uppercase tracking-wider">
                DONA TEIA
              </span>
            </div>

            <span className="text-[10px] text-yellow-400 font-bold block">
              MERCADORA DAS RUÍNAS
            </span>
            <span className="text-[8px] text-neutral-400 block mt-0.5">
              "Honestidade & Delícias da Teia"
            </span>
          </div>

          {/* Dialogue Speech Box */}
          <div className="md:col-span-8 border-2 border-white bg-black p-3.5 flex flex-col justify-between min-h-[110px]">
            <p className="text-xs sm:text-sm text-white leading-relaxed whitespace-pre-line">
              {talkText}
            </p>
            {statusMessage && (
              <div className="mt-2 text-[10px] sm:text-xs text-yellow-300 border-t border-neutral-800 pt-1.5 flex items-center gap-1.5 animate-fadeIn">
                <span className="text-yellow-400 font-bold">★</span>
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Interactive Area depending on mode */}
        <div className="flex-1 border-2 border-neutral-800 bg-neutral-950 p-3 sm:p-4 min-h-[200px] flex flex-col justify-between">
          {/* MODE: MENU PRINCIPAL */}
          {mode === 'MENU' && (
            <div className="space-y-3">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-1">
                Escolha uma ação com as Setas ou clique:
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'COMPRAR', desc: 'Troque seu ouro por curas e equipamentos' },
                  { title: 'VENDER', desc: 'Venda itens da mochila para obter ouro' },
                  { title: 'CONVERSAR', desc: 'Ouça histórias e conselhos sobre as Ruínas' },
                  { title: 'SAIR', desc: 'Agradecer e voltar à exploração' },
                ].map((item, idx) => {
                  const isSelected = menuIndex === idx;
                  return (
                    <button
                      key={item.title}
                      onClick={() => {
                        soundManager.playMenuSelect();
                        setMenuIndex(idx);
                        executeMenuSelection(idx);
                      }}
                      onMouseEnter={() => {
                        soundManager.playMenuMove();
                        setMenuIndex(idx);
                      }}
                      className={`p-3 text-left border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-yellow-400 bg-neutral-900 text-yellow-300 shadow-[0_0_15px_rgba(255,255,0,0.2)]'
                          : 'border-neutral-800 bg-black/60 text-neutral-300 hover:border-neutral-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs ${isSelected ? 'text-red-500' : 'opacity-0'}`}>
                          ♥
                        </span>
                        <span className="text-xs sm:text-sm font-bold tracking-wider">{item.title}</span>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-neutral-400 mt-1 pl-4 leading-tight">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE: BUY */}
          {mode === 'BUY' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Items List */}
              <div className="md:col-span-7 space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {SHOP_CATALOG.map((catItem, idx) => {
                  const isSelected = catalogIndex === idx;
                  const canAfford = stats.gold >= catItem.price;
                  const hasSpace = stats.inventory.length < 8;

                  return (
                    <div
                      key={catItem.item.id}
                      onClick={() => {
                        soundManager.playMenuMove();
                        setCatalogIndex(idx);
                        handleBuy(catItem);
                      }}
                      onMouseEnter={() => {
                        soundManager.playMenuMove();
                        setCatalogIndex(idx);
                      }}
                      className={`p-2 border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'border-yellow-400 bg-neutral-900 text-yellow-300'
                          : 'border-neutral-850 bg-black/60 text-neutral-300 hover:border-neutral-700'
                      } ${!canAfford || !hasSpace ? 'opacity-70' : ''}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`text-xs ${isSelected ? 'text-red-500' : 'opacity-0'}`}>
                          ♥
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-[11px] block truncate">
                            {catItem.item.name}
                          </span>
                          <span className="text-[9px] text-neutral-400 block">
                            {catItem.item.flavor}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`font-mono font-bold text-[11px] ${
                            canAfford ? 'text-yellow-400' : 'text-red-400 line-through'
                          }`}
                        >
                          {catItem.price} G
                        </span>
                        <span className="text-[8px] px-1 py-0.5 border border-neutral-700 text-neutral-400">
                          {catItem.category === 'heal'
                            ? 'CURA'
                            : catItem.category === 'weapon'
                            ? 'ARMA'
                            : 'ARMADURA'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Item Details Preview Panel */}
              <div className="md:col-span-5 border border-neutral-800 bg-black p-3 flex flex-col justify-between min-h-[180px]">
                {selectedCatalog ? (
                  <div className="space-y-2">
                    <div className="border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-yellow-300">
                        {selectedCatalog.item.name}
                      </span>
                      <span className="text-xs font-mono text-yellow-400 font-bold">
                        {selectedCatalog.price} G
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-300 leading-relaxed italic">
                      "{selectedCatalog.item.description}"
                    </div>

                    <div className="text-[10px] text-emerald-400 font-bold border border-emerald-900/50 bg-emerald-950/20 p-1.5">
                      ★ EFEITO: {selectedCatalog.item.flavor}
                    </div>

                    <div className="text-[9px] text-neutral-400">
                      Tipo: {selectedCatalog.item.type.toUpperCase()} · Inventário:{' '}
                      <span className={stats.inventory.length >= 8 ? 'text-red-400' : 'text-white'}>
                        {stats.inventory.length}/8
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 text-center py-8">
                    Selecione um item do mostruário
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-neutral-900">
                  <button
                    onClick={() => selectedCatalog && handleBuy(selectedCatalog)}
                    className="flex-1 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs transition-colors cursor-pointer"
                  >
                    [Z] COMPRAR
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playMenuMove();
                      setMode('MENU');
                    }}
                    className="px-3 py-1.5 border border-neutral-700 text-neutral-300 hover:text-white text-xs cursor-pointer"
                  >
                    [X] VOLTAR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE: SELL */}
          {mode === 'SELL' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Inventory Items List */}
              <div className="md:col-span-7 space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                {stats.inventory.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-500 border border-neutral-800">
                    * Sua sacola está vazia! Não há nenhum item para vender no momento.
                  </div>
                ) : (
                  stats.inventory.map((item, idx) => {
                    const isSelected = inventoryIndex === idx;
                    const price = getSellPrice(item);
                    const isKey = item.type === 'key';

                    return (
                      <div
                        key={`${item.id}-${idx}`}
                        onClick={() => {
                          soundManager.playMenuMove();
                          setInventoryIndex(idx);
                          handleSell(idx);
                        }}
                        onMouseEnter={() => {
                          soundManager.playMenuMove();
                          setInventoryIndex(idx);
                        }}
                        className={`p-2 border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'border-yellow-400 bg-neutral-900 text-yellow-300'
                            : 'border-neutral-850 bg-black/60 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`text-xs ${isSelected ? 'text-red-500' : 'opacity-0'}`}>
                            ♥
                          </span>
                          <span className="font-bold text-[11px] truncate">{item.name}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isKey ? (
                            <span className="text-[9px] text-purple-400 border border-purple-900/60 bg-purple-950/30 px-1.5 py-0.5">
                              [ITEM CHAVE]
                            </span>
                          ) : (
                            <span className="font-mono font-bold text-yellow-400 text-[11px]">
                              +{price} G
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Item Details Preview Panel */}
              <div className="md:col-span-5 border border-neutral-800 bg-black p-3 flex flex-col justify-between min-h-[180px]">
                {selectedInventoryItem ? (
                  <div className="space-y-2">
                    <div className="border-b border-neutral-800 pb-1.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-yellow-300">
                        {selectedInventoryItem.name}
                      </span>
                      <span className="text-xs font-mono text-yellow-400 font-bold">
                        {selectedInventoryItem.type === 'key'
                          ? 'NÃO VENDE'
                          : `+${getSellPrice(selectedInventoryItem)} G`}
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-300 leading-relaxed italic">
                      "{selectedInventoryItem.description}"
                    </div>

                    <div className="text-[10px] text-neutral-400">
                      Propriedade: {selectedInventoryItem.flavor}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 text-center py-8">
                    Selecione um item da mochila para avaliar
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-neutral-900">
                  <button
                    disabled={!selectedInventoryItem || selectedInventoryItem.type === 'key'}
                    onClick={() => handleSell(inventoryIndex)}
                    className={`flex-1 py-1.5 font-bold text-xs transition-colors cursor-pointer ${
                      selectedInventoryItem && selectedInventoryItem.type !== 'key'
                        ? 'bg-yellow-400 hover:bg-yellow-300 text-black'
                        : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    }`}
                  >
                    [Z] VENDER
                  </button>
                  <button
                    onClick={() => {
                      soundManager.playMenuMove();
                      setMode('MENU');
                    }}
                    className="px-3 py-1.5 border border-neutral-700 text-neutral-300 hover:text-white text-xs cursor-pointer"
                  >
                    [X] VOLTAR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE: TALK */}
          {mode === 'TALK' && (
            <div className="space-y-2">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider border-b border-neutral-800 pb-1">
                Pergunte sobre um assunto:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {TALK_TOPICS.map((topic, idx) => {
                  const isSelected = talkIndex === idx;
                  return (
                    <button
                      key={topic.id}
                      onClick={() => {
                        soundManager.playMenuSelect();
                        soundManager.playVoiceBlip('monster');
                        setTalkIndex(idx);
                        setTalkText(topic.dialogue);
                        setMerchantMood('wink');
                      }}
                      onMouseEnter={() => {
                        soundManager.playMenuMove();
                        setTalkIndex(idx);
                      }}
                      className={`p-2 text-left border text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-yellow-400 bg-neutral-900 text-yellow-300'
                          : 'border-neutral-800 bg-black/60 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs ${isSelected ? 'text-red-500' : 'opacity-0'}`}>
                          ♥
                        </span>
                        <span className="font-bold text-[11px]">{topic.title}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-neutral-900 flex justify-end">
                <button
                  onClick={() => {
                    soundManager.playMenuMove();
                    setMode('MENU');
                  }}
                  className="px-3 py-1.5 border border-neutral-700 text-neutral-300 hover:text-white text-xs cursor-pointer"
                >
                  [X] VOLTAR AO MENU
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="mt-3 flex flex-wrap items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-900 pt-2 gap-2">
          <span>[Setas / WASD] Navegar</span>
          <span>[Z / Enter] Confirmar / Comprar / Vender</span>
          <span>[X / Esc] Voltar / Sair</span>
          <span className="text-yellow-400/80 italic">* A determinação corre nas veias do comércio!</span>
        </div>
      </div>
    </div>
  );
};
