import Phaser from 'phaser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DeveloperModePanel } from './components/DeveloperModePanel';
import { OverworldMenuModal } from './components/OverworldMenuModal';
import { PhaserGame } from './components/PhaserGame';
import { SoundSettings } from './components/SoundSettings';
import { VirtualController } from './components/VirtualController';
import { gameState } from './engine/gameState';
import { questManager } from './engine/questManager';
import { OverworldScene } from './engine/scenes/OverworldScene';
import { soundManager } from './services/soundSynthesizer';
import { PlayerStats } from './types/game';
import { QuestNotification } from './types/quest';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(gameState.getStats());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [showVirtualPad, setShowVirtualPad] = useState(true);
  const [questToast, setQuestToast] = useState<QuestNotification | null>(null);

  const gameRef = useRef<Phaser.Game | null>(null);
  const secretBufferRef = useRef<string>('');

  useEffect(() => {
    const unsub = gameState.subscribe((newStats) => {
      setStats(newStats);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsubQuest = questManager.onNotification((notif) => {
      setQuestToast(notif);
      const timer = setTimeout(() => {
        setQuestToast((curr) => (curr?.timestamp === notif.timestamp ? null : curr));
      }, 4500);
      return () => clearTimeout(timer);
    });
    return () => unsubQuest();
  }, []);

  // V.0.0.2-M5.1: Global key sequence listener for "lula132026"
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const char = e.key.toLowerCase();
      secretBufferRef.current += char;
      if (secretBufferRef.current.length > 20) {
        secretBufferRef.current = secretBufferRef.current.slice(-20);
      }

      if (secretBufferRef.current.includes('lula132026')) {
        secretBufferRef.current = '';
        soundManager.playSave();
        setIsDevUnlocked(true);
        setIsDevOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleOpenMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleDeveloperUnlocked = useCallback(() => {
    setIsDevUnlocked(true);
    setIsDevOpen(true);
  }, []);

  const handleGameRef = useCallback((game: Phaser.Game | null) => {
    gameRef.current = game;
  }, []);

  const handleVirtualAction = (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => {
    if (key === 'C') {
      setIsMenuOpen((prev) => !prev);
      return;
    }

    if (!gameRef.current) return;
    const activeScenes = gameRef.current.scene.getScenes(true);
    activeScenes.forEach((s) => {
      s.events.emit('virtual_action', key);
    });
  };

  const handleSelectBattle = (enemyId: string) => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    soundManager.playBattleStart();
    sceneManager.stop('OverworldScene');
    sceneManager.stop('TitleScene');
    sceneManager.stop('IntroScene');
    sceneManager.start('BattleScene', { enemyId });
  };

  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleReloadGameState = useCallback(() => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    const overworld = sceneManager.getScene('OverworldScene') as OverworldScene;
    if (overworld && sceneManager.isActive('OverworldScene')) {
      overworld.handleReloadGameState();
    } else {
      sceneManager.stop('BattleScene');
      sceneManager.stop('TitleScene');
      sceneManager.stop('IntroScene');
      sceneManager.stop('GameOverScene');
      sceneManager.start('OverworldScene');
      setTimeout(() => {
        const ow = sceneManager.getScene('OverworldScene') as OverworldScene;
        if (ow) ow.handleReloadGameState();
      }, 150);
    }
  }, []);

  const handleQuickSave = () => {
    soundManager.playSave();
    const curRoomName = gameState.getCurrentRoomName();
    gameState.saveGame(curRoomName);
    setSaveToast(`★ PROGRESSO SALVO NO LOCALSTORAGE! (${curRoomName})`);
    setTimeout(() => {
      setSaveToast(null);
    }, 3200);
  };

  const handleWarpRoom = (roomId: string, x: number, y: number) => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    const overworld = sceneManager.getScene('OverworldScene') as OverworldScene;
    if (overworld && sceneManager.isActive('OverworldScene')) {
      overworld.switchRoom(roomId, x, y);
    } else {
      sceneManager.stop('BattleScene');
      sceneManager.stop('TitleScene');
      sceneManager.stop('IntroScene');
      sceneManager.start('OverworldScene');
      setTimeout(() => {
        const ow = sceneManager.getScene('OverworldScene') as OverworldScene;
        if (ow) ow.switchRoom(roomId, x, y);
      }, 150);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-pixel selection:bg-yellow-400 selection:text-black">
      {/* V.0.0.2-JQ.1: Clean top bar with essential information only */}
      <header className="flex items-center justify-between gap-6 px-4 py-3 border-b border-neutral-900 bg-black shrink-0">
        {/* Zone 1: Brand */}
        <div className="flex items-center gap-2">
          <span className="text-red-500 text-sm">♥</span>
          <span className="text-xs font-bold tracking-widest text-white whitespace-nowrap">
            UNDERTALE T.S
          </span>
        </div>

        {/* Zone 2: Essential status preview */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          <span className="text-white font-bold">{stats.name}</span>
          <span aria-hidden="true" className="text-neutral-700">·</span>
          <span className="text-yellow-300">LV {stats.lv}</span>
          <span aria-hidden="true" className="text-neutral-700">·</span>
          <span className="text-red-400">HP {stats.hp}/{stats.maxHp}</span>
          <span aria-hidden="true" className="text-neutral-700">·</span>
          <span className="text-yellow-400 font-mono">{stats.gold} G</span>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          <SoundSettings />

          {/* Quick Save button to persist state to localStorage */}
          <button
            onClick={handleQuickSave}
            className="px-2.5 py-1 text-xs border border-yellow-500/70 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1 font-bold whitespace-nowrap"
            title="Salvar progresso no localStorage agora"
          >
            <span>★</span>
            <span className="hidden sm:inline">SALVAR</span>
          </button>

          {/* V.0.0.2-E9.1 / M5.1: Developer Mode button (visible if unlocked, or click hint) */}
          {isDevUnlocked ? (
            <button
              onClick={() => setIsDevOpen(true)}
              className="px-2.5 py-1 text-[10px] font-bold text-black bg-yellow-400 hover:bg-yellow-300 transition-colors whitespace-nowrap cursor-pointer border border-yellow-200"
            >
              ★ DEV ENGINE
            </button>
          ) : (
            <button
              onClick={() => {
                soundManager.playSave();
                setIsDevUnlocked(true);
                setIsDevOpen(true);
              }}
              className="px-2 py-1 text-[9px] text-neutral-600 hover:text-neutral-400 border border-neutral-800 hover:border-neutral-600 transition-colors whitespace-nowrap"
              title="Clique ou digite 'lula132026' para abrir o painel de desenvolvedor"
            >
              DEV
            </button>
          )}

          <button
            onClick={handleOpenMenu}
            className="px-2.5 py-1 text-xs border border-neutral-700 text-neutral-200 hover:border-white hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>[C] MENU</span>
            <span className="text-[10px] text-yellow-300 font-mono">
              ({questManager.getActiveQuests().length})
            </span>
          </button>
        </div>
      </header>

      {/* Save Notification Toast */}
      {saveToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 left-4 z-50 bg-black border-2 border-yellow-400 p-3 max-w-xs font-pixel text-yellow-300 shadow-[0_0_20px_rgba(255,255,0,0.35)] text-xs flex items-center gap-2"
        >
          <span className="text-yellow-400 text-sm">★</span>
          <span>{saveToast}</span>
        </div>
      )}

      {/* Retro Undertale Quest Notification Toast */}
      {questToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 right-4 z-50 bg-black border-2 border-yellow-400 p-3 max-w-xs font-pixel text-white shadow-[0_0_20px_rgba(255,255,0,0.35)]"
        >
          <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-yellow-300">
            <span>★</span>
            <span>{questToast.isCompletion ? 'MISSÃO CONCLUÍDA!' : 'MISSÃO ATUALIZADA'}</span>
          </div>
          <div className="text-xs font-bold text-white mb-1">{questToast.questTitle}</div>
          {questToast.objectiveText && (
            <div className="text-[10px] text-neutral-300 flex items-start gap-1">
              <span className="text-red-500">♥</span>
              <span>{questToast.objectiveText}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Viewport: Dedicated retro gaming screen */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 py-2 flex flex-col items-center justify-center gap-2">
        <PhaserGame
          onOpenMenu={handleOpenMenu}
          onDeveloperUnlocked={handleDeveloperUnlocked}
          gameRefCallback={handleGameRef}
        />

        {/* Virtual touch controls for mobile / tablet */}
        {showVirtualPad && (
          <div className="w-full mt-1">
            <VirtualController onAction={handleVirtualAction} />
          </div>
        )}

        {/* Subtle toggle for virtual pad on desktop */}
        <div className="w-full max-w-[800px] flex items-center justify-between text-[9px] text-neutral-600 px-2 py-1">
          <button
            onClick={() => setShowVirtualPad((prev) => !prev)}
            className="hover:text-neutral-400 transition-colors"
          >
            {showVirtualPad ? 'Ocultar Controles na Tela' : 'Exibir Controles na Tela'}
          </button>
          <span>Setas / WASD: Mover · Z: Confirmar · X: Cancelar · C: Menu</span>
        </div>
      </main>

      {/* Overworld Menu Modal */}
      <OverworldMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        stats={stats}
        onReloadGameState={handleReloadGameState}
      />

      {/* V.0.0.2-ZT.1: Dedicated Developer Screen (Motor Completo) */}
      <DeveloperModePanel
        isOpen={isDevOpen}
        onClose={() => setIsDevOpen(false)}
        stats={stats}
        onSelectBattle={handleSelectBattle}
        onWarpRoom={handleWarpRoom}
        onReloadGameState={handleReloadGameState}
      />

      {/* Clean quiet footer */}
      <footer className="border-t border-neutral-900 py-2 px-4 text-center text-[9px] text-neutral-600 flex items-center justify-between">
        <span>Undertale T.S · Motor em TypeScript + Phaser 3</span>
        <span>v0.0.2</span>
      </footer>
    </div>
  );
}
