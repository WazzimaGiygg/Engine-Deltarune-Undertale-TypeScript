import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CombatActionType, CombatLogEntry, combatLogManager } from '../engine/combatLogManager';
import { gameState, PositionState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';

type FilterType = 'all' | 'player' | 'enemy' | 'system';

export const BattleLogOverlay: React.FC = () => {
  const [posState, setPosState] = useState<PositionState>(gameState.getPositionState());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [entries, setEntries] = useState<CombatLogEntry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [latestToast, setLatestToast] = useState<CombatLogEntry | null>(null);
  const [isOpacityLow, setIsOpacityLow] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to scene changes
  useEffect(() => {
    const unsub = gameState.subscribePosition((newPos) => {
      setPosState(newPos);
      // Reset unread count when entering battle
      if (newPos.activeScene === 'BattleScene' || newPos.activeScene === 'FloweyBattleScene') {
        setUnreadCount(0);
      }
    });
    return () => unsub();
  }, []);

  const isInBattle =
    posState.activeScene === 'BattleScene' || posState.activeScene === 'FloweyBattleScene';

  // Subscribe to CombatLogManager
  useEffect(() => {
    const unsub = combatLogManager.subscribe((newEntries) => {
      setEntries(newEntries);
    });

    const unsubNew = combatLogManager.onNewEntry((entry) => {
      // If panel is closed, increase unread badge
      setUnreadCount((prev) => prev + 1);

      // Flash live toast ticker for 4 seconds
      setLatestToast(entry);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => {
        setLatestToast(null);
      }, 4200);
    });

    return () => {
      unsub();
      unsubNew();
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Auto-scroll to bottom when entries update or drawer opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, isOpen]);

  // Global 'H' or 'L' hotkey to toggle combat log in battle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!isInBattle) return;

      const key = e.key.toLowerCase();
      if (key === 'h' || key === 'l') {
        e.preventDefault();
        soundManager.playMenuMove();
        setIsOpen((prev) => {
          if (!prev) setUnreadCount(0);
          return !prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInBattle]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.source === filter);
  }, [entries, filter]);

  if (!isInBattle) {
    return null;
  }

  const getSourceBadge = (source: CombatLogEntry['source']) => {
    switch (source) {
      case 'player':
        return (
          <span className="text-[8px] px-1 py-0.5 border border-cyan-500/80 text-cyan-300 bg-cyan-950/50 font-bold">
            JOGADOR
          </span>
        );
      case 'enemy':
        return (
          <span className="text-[8px] px-1 py-0.5 border border-red-500/80 text-red-300 bg-red-950/50 font-bold">
            INIMIGO
          </span>
        );
      case 'system':
        return (
          <span className="text-[8px] px-1 py-0.5 border border-yellow-500/80 text-yellow-300 bg-yellow-950/50 font-bold">
            SISTEMA
          </span>
        );
    }
  };

  const getActionIcon = (actionType: CombatActionType) => {
    switch (actionType) {
      case 'fight':
        return '⚔️';
      case 'act':
        return '💬';
      case 'item':
        return '🍬';
      case 'mercy':
      case 'spared':
        return '💛';
      case 'dodge':
        return '💨';
      case 'damage':
        return '💔';
      case 'attack_pattern':
        return '✦';
      case 'dialogue':
        return '🗨️';
      case 'fled':
        return '👟';
      case 'defeated':
        return '💀';
      case 'intro':
      case 'turn_start':
        return '★';
      case 'rescue':
        return '🔥';
      default:
        return '•';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-pixel flex flex-col justify-between p-2 select-none overflow-hidden">
      {/* Top Header Row with Toggle Button & Live Action Ticker */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Live Action Ticker (Visible even when panel is closed) */}
        <div className="pointer-events-auto max-w-[70%] transition-all duration-300">
          {latestToast && !isOpen && (
            <div className="bg-black/90 border border-yellow-400 px-2.5 py-1.5 shadow-[0_0_12px_rgba(250,204,21,0.35)] flex items-center gap-2 text-[9px] text-white animate-fadeIn">
              <span className="text-yellow-400 shrink-0">
                {getActionIcon(latestToast.actionType)}
              </span>
              <div className="truncate">
                <span className="text-yellow-300 font-bold mr-1">
                  [{latestToast.actor}]:
                </span>
                <span className="text-neutral-200">{latestToast.title}</span>
                {latestToast.reaction && (
                  <span className="text-yellow-200/90 ml-1.5 italic truncate hidden sm:inline">
                    · {latestToast.reaction}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Log Button */}
        <button
          onClick={() => {
            soundManager.playMenuSelect();
            setIsOpen((prev) => {
              if (!prev) setUnreadCount(0);
              return !prev;
            });
          }}
          className={`pointer-events-auto px-2 py-1 text-[10px] border transition-all cursor-pointer flex items-center gap-1.5 font-bold shadow-md ${
            isOpen
              ? 'border-yellow-400 bg-yellow-950/90 text-yellow-300'
              : unreadCount > 0
              ? 'border-yellow-400 bg-neutral-950/90 text-yellow-300 animate-pulse'
              : 'border-neutral-700 bg-black/85 text-neutral-300 hover:border-yellow-400 hover:text-white'
          }`}
          title="Alternar Painel de Histórico de Combate (Atalho: H)"
        >
          <span>📜</span>
          <span>HISTÓRICO</span>
          <span className="text-[9px] text-neutral-400 hidden sm:inline">[H]</span>
          {unreadCount > 0 && !isOpen && (
            <span className="px-1 py-0.2 bg-red-600 text-white text-[8px] rounded-xs font-bold animate-bounce">
              +{unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Text History Panel (Drawer on Right Side) */}
      {isOpen && (
        <div
          className={`pointer-events-auto self-end w-full sm:w-[360px] max-h-[82%] border-2 border-white flex flex-col transition-all shadow-[0_0_20px_rgba(0,0,0,0.9)] ${
            isOpacityLow ? 'bg-black/75' : 'bg-black/95'
          }`}
          style={{ backdropFilter: 'blur(3px)' }}
        >
          {/* Panel Header */}
          <div className="p-2 border-b-2 border-neutral-700 bg-neutral-950 flex items-center justify-between gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-red-500 text-xs">♥</span>
              <h3 className="text-[10px] font-bold text-yellow-300 tracking-wider">
                HISTÓRICO DE COMBATE
              </h3>
              <span className="text-[8px] text-neutral-500">
                ({filteredEntries.length})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpacityLow((prev) => !prev)}
                className="text-[8px] px-1.5 py-0.5 border border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500 cursor-pointer"
                title="Alternar transparência do painel para facilitar esquiva"
              >
                {isOpacityLow ? 'Opaco' : 'Translúcido'}
              </button>

              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  setIsOpen(false);
                }}
                className="text-[9px] px-1.5 py-0.5 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-500 cursor-pointer"
              >
                [X]
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="px-2 py-1 border-b border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-[8px] shrink-0">
            <span className="text-neutral-500">FILTRAR:</span>
            <div className="flex items-center gap-1">
              {(['all', 'player', 'enemy', 'system'] as const).map((f) => {
                const labels: Record<FilterType, string> = {
                  all: 'TODOS',
                  player: 'JOGADOR',
                  enemy: 'INIMIGO',
                  system: 'SISTEMA',
                };
                return (
                  <button
                    key={f}
                    onClick={() => {
                      soundManager.playMenuMove();
                      setFilter(f);
                    }}
                    className={`px-1.5 py-0.5 border transition-colors cursor-pointer ${
                      filter === f
                        ? 'border-yellow-400 bg-neutral-800 text-yellow-300 font-bold'
                        : 'border-transparent text-neutral-400 hover:text-white'
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Log Entries */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-2 space-y-2 text-[9px] leading-relaxed scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-black"
          >
            {filteredEntries.length === 0 ? (
              <div className="py-8 text-center text-neutral-500 text-[10px]">
                * Nenhuma ação registrada nesta categoria ainda.
              </div>
            ) : (
              filteredEntries.map((entry) => {
                const isPlayer = entry.source === 'player';
                const isDamage = entry.actionType === 'damage';
                const isVictoryOrSpare =
                  entry.actionType === 'spared' || entry.actionType === 'defeated';

                return (
                  <div
                    key={entry.id}
                    className={`p-2 border transition-all ${
                      isDamage
                        ? 'border-red-600/80 bg-red-950/30'
                        : isVictoryOrSpare
                        ? 'border-emerald-500/80 bg-emerald-950/30'
                        : isPlayer
                        ? 'border-cyan-900/60 bg-cyan-950/20'
                        : 'border-neutral-800 bg-neutral-950/80'
                    }`}
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-1 mb-1 gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-yellow-400">
                          {getActionIcon(entry.actionType)}
                        </span>
                        <span className="text-[8px] text-neutral-400 font-mono">
                          T{entry.turn}
                        </span>
                        {getSourceBadge(entry.source)}
                        <span className="font-bold text-white truncate max-w-[120px]">
                          {entry.actor}
                        </span>
                      </div>

                      {/* Stat Delta Tags */}
                      {entry.statsChange && (
                        <div className="flex items-center gap-1 text-[8px] font-mono shrink-0">
                          {entry.statsChange.hpChange !== undefined && (
                            <span
                              className={`px-1 py-0.2 border ${
                                entry.statsChange.hpChange < 0
                                  ? 'border-red-500 text-red-300 bg-red-950/50'
                                  : 'border-emerald-500 text-emerald-300 bg-emerald-950/50'
                              }`}
                            >
                              {entry.statsChange.hpChange > 0 ? '+' : ''}
                              {entry.statsChange.hpChange} HP
                            </span>
                          )}
                          {entry.statsChange.mercyChange !== undefined && (
                            <span className="px-1 py-0.2 border border-yellow-500 text-yellow-300 bg-yellow-950/50">
                              +{entry.statsChange.mercyChange}% Piedade
                            </span>
                          )}
                          {entry.statsChange.defChange !== undefined && (
                            <span className="px-1 py-0.2 border border-blue-500 text-blue-300 bg-blue-950/50">
                              {entry.statsChange.defChange} DEF
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Entry Title & Player Action Description */}
                    <div className="text-neutral-200">
                      <span className="text-yellow-300 font-bold block mb-0.5">
                        {entry.title}
                      </span>
                      <p className="text-neutral-300 whitespace-pre-line text-[9px]">
                        {entry.description}
                      </p>
                    </div>

                    {/* Real-time Enemy Reaction Box */}
                    {entry.reaction && (
                      <div className="mt-1.5 p-1.5 border border-neutral-800 bg-black/70 text-[8.5px] text-neutral-300">
                        <span className="text-red-400 font-bold block mb-0.5 flex items-center gap-1">
                          <span>↳</span>
                          <span>Reação do Inimigo:</span>
                        </span>
                        <p className="italic text-yellow-100/90 whitespace-pre-line leading-relaxed">
                          {entry.reaction}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-1.5 border-t border-neutral-800 bg-neutral-950 text-[8px] text-neutral-500 flex items-center justify-between shrink-0">
            <span>Pressione H para ocultar/exibir</span>
            <button
              onClick={() => {
                soundManager.playMenuMove();
                combatLogManager.clearLog();
              }}
              className="text-neutral-500 hover:text-red-400 cursor-pointer"
            >
              [Limpar Log]
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
