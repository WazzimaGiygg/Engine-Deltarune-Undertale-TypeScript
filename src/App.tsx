import Phaser from 'phaser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import { BattleTipFloatingCard } from './components/BattleTipFloatingCard';
import { BattleTutorialModal } from './components/BattleTutorialModal';
import { DeveloperModePanel } from './components/DeveloperModePanel';
import { FirebaseLoginPromptModal } from './components/FirebaseLoginPromptModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { OverworldMenuModal } from './components/OverworldMenuModal';
import { PhaserGame } from './components/PhaserGame';
import { ShopModal } from './components/ShopModal';
import { CRTFullScreenOverlay } from './components/CRTFullScreenOverlay';
import { SmartTvGuideOverlay } from './components/SmartTvGuideOverlay';
import { SoundSettings } from './components/SoundSettings';
import { VirtualController } from './components/VirtualController';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { gameState } from './engine/gameState';
import { questManager } from './engine/questManager';
import { OverworldScene } from './engine/scenes/OverworldScene';
import { auth, subscribeAuthState, saveSlotToCloud, submitScoreToLeaderboard } from './services/firebase';
import { soundManager } from './services/soundSynthesizer';
import { PlayerStats } from './types/game';
import { QuestNotification } from './types/quest';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(gameState.getStats());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [isDevOpen, setIsDevOpen] = useState(false);
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [showVirtualPad, setShowVirtualPad] = useState(true);
  const [questToast, setQuestToast] = useState<QuestNotification | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth.currentUser);

  const [isTvMode, setIsTvMode] = useState(false);
  const [lastRemoteKey, setLastRemoteKey] = useState<string | null>(null);

  const gameRef = useRef<Phaser.Game | null>(null);
  const secretBufferRef = useRef<string>('');

  // Auto-detect Smart TV and Smartphone / Touch Screen devices
  useEffect(() => {
    const isTv =
      typeof navigator !== 'undefined' &&
      /SmartTV|Tizen|Web0S|webOS|NetCast|BRAVIA|Android TV|GoogleTV|HbbTV|Roku|AppleTV|Xbox|PlayStation|Hisense|Viera|CE-HTML/i.test(
        navigator.userAgent
      );
    if (isTv) {
      setIsTvMode(true);
    }

    const isMobile =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth <= 860);
    // On mobile devices, always show virtual touch pad; on Smart TV, hide by default since remote control is used
    setShowVirtualPad(isMobile || !isTv);
  }, []);

  // Subscribe to Firebase Authentication state
  useEffect(() => {
    const unsubAuth = subscribeAuthState((u) => {
      setFirebaseUser(u);
    });
    return () => unsubAuth();
  }, []);

  // Prompt Google Firebase login upon entering the game (if not logged in)
  useEffect(() => {
    const hasPrompted = sessionStorage.getItem('undertale_firebase_prompt_shown');
    if (!hasPrompted && !auth.currentUser) {
      sessionStorage.setItem('undertale_firebase_prompt_shown', 'true');
      const timer = setTimeout(() => {
        setIsFirebaseModalOpen(true);
      }, 750);
      return () => clearTimeout(timer);
    }
  }, []);

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

  // Global key sequence listener for "lula132026"
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
    if (game) {
      game.events.on('open_battle_tutorial', () => {
        soundManager.playMenuSelect();
        setIsTutorialOpen(true);
      });
    }
  }, []);

  const handleVirtualAction = useCallback(
    (key: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'Z' | 'X' | 'C') => {
      if (key === 'C') {
        setIsMenuOpen((prev) => !prev);
        return;
      }

      if (!gameRef.current) return;
      const activeScenes = gameRef.current.scene.getScenes(true);
      activeScenes.forEach((s) => {
        s.events.emit('virtual_action', key);
      });
    },
    []
  );

  // Smart TV Remote Control Handler (Samsung Tizen, LG webOS, Android TV, Fire TV, Apple TV)
  useEffect(() => {
    const handleTvKeyDown = (e: KeyboardEvent) => {
      // Do not intercept if user is typing in form inputs
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      const code = e.code;
      const key = e.key;
      const keyCode = e.keyCode || e.which;

      // Smart TV Directional Keys
      if (key === 'ArrowUp' || key === 'Up' || keyCode === 38 || code === 'ArrowUp') {
        e.preventDefault();
        setLastRemoteKey('▲ CIMA');
        setIsTvMode(true);
        handleVirtualAction('UP');
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowUp',
            code: 'ArrowUp',
            keyCode: 38,
            which: 38,
            bubbles: true,
            cancelable: true,
          })
        );
        return;
      }
      if (key === 'ArrowDown' || key === 'Down' || keyCode === 40 || code === 'ArrowDown') {
        e.preventDefault();
        setLastRemoteKey('▼ BAIXO');
        setIsTvMode(true);
        handleVirtualAction('DOWN');
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
          })
        );
        return;
      }
      if (key === 'ArrowLeft' || key === 'Left' || keyCode === 37 || code === 'ArrowLeft') {
        e.preventDefault();
        setLastRemoteKey('◀ ESQUERDA');
        setIsTvMode(true);
        handleVirtualAction('LEFT');
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowLeft',
            code: 'ArrowLeft',
            keyCode: 37,
            which: 37,
            bubbles: true,
            cancelable: true,
          })
        );
        return;
      }
      if (key === 'ArrowRight' || key === 'Right' || keyCode === 39 || code === 'ArrowRight') {
        e.preventDefault();
        setLastRemoteKey('▶ DIREITA');
        setIsTvMode(true);
        handleVirtualAction('RIGHT');
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            code: 'ArrowRight',
            keyCode: 39,
            which: 39,
            bubbles: true,
            cancelable: true,
          })
        );
        return;
      }

      // Smart TV Confirm / Select / Action [Z]
      // 13: Enter, 29443: Tizen Enter, 179: PlayPause, 403: Red button, 49: Num 1
      if (
        key === 'Enter' ||
        key === 'Select' ||
        key === 'Ok' ||
        key === 'ColorF0Red' ||
        key === '1' ||
        keyCode === 13 ||
        keyCode === 29443 ||
        keyCode === 179 ||
        keyCode === 403
      ) {
        e.preventDefault();
        setLastRemoteKey('OK / Z');
        setIsTvMode(true);
        handleVirtualAction('Z');
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'z',
            code: 'KeyZ',
            keyCode: 90,
            which: 90,
            bubbles: true,
            cancelable: true,
          })
        );
        setTimeout(() => {
          window.dispatchEvent(
            new KeyboardEvent('keyup', {
              key: 'z',
              code: 'KeyZ',
              keyCode: 90,
              which: 90,
              bubbles: true,
              cancelable: true,
            })
          );
        }, 120);
        return;
      }

      // Smart TV Cancel / Back / Return [X]
      // 27: Escape, 10009: Tizen Return, 461: webOS Back, 8: Android TV Back, 404: Green button, 50: Num 2
      if (
        key === 'Escape' ||
        key === 'Back' ||
        key === 'GoBack' ||
        key === 'BrowserBack' ||
        key === 'ColorF1Green' ||
        key === '2' ||
        keyCode === 27 ||
        keyCode === 10009 ||
        keyCode === 461 ||
        keyCode === 8 ||
        keyCode === 404
      ) {
        e.preventDefault();
        setLastRemoteKey('VOLTAR / X');
        setIsTvMode(true);
        handleVirtualAction('X');
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'x',
            code: 'KeyX',
            keyCode: 88,
            which: 88,
            bubbles: true,
            cancelable: true,
          })
        );
        setTimeout(() => {
          window.dispatchEvent(
            new KeyboardEvent('keyup', {
              key: 'x',
              code: 'KeyX',
              keyCode: 88,
              which: 88,
              bubbles: true,
              cancelable: true,
            })
          );
        }, 120);
        return;
      }

      // Smart TV Menu / Inventory [C]
      // 18: Alt/Menu, 224: Menu, 457: Info, 458: Guide, 405: Yellow button, 51: Num 3
      if (
        key === 'Menu' ||
        key === 'Settings' ||
        key === 'ColorF2Yellow' ||
        key === '3' ||
        keyCode === 18 ||
        keyCode === 224 ||
        keyCode === 457 ||
        keyCode === 458 ||
        keyCode === 405
      ) {
        e.preventDefault();
        setLastRemoteKey('MENU / C');
        setIsTvMode(true);
        handleVirtualAction('C');
        return;
      }

      // Smart TV Blue Color Button / Key 4: Toggle CRT Overlay
      if (key === 'ColorF3Blue' || key === '4' || keyCode === 406) {
        e.preventDefault();
        setLastRemoteKey('CRT TOGGLE');
        soundManager.playMenuSelect();
        gameState.setCrtFilter(!gameState.getCrtFilter());
        return;
      }

      // Smart TV Key 5: Toggle Fullscreen
      if (key === '5') {
        e.preventDefault();
        setLastRemoteKey('TELA CHEIA');
        soundManager.playMenuSelect();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.().catch(() => {});
        }
        return;
      }
    };

    const handleTvKeyUp = (e: KeyboardEvent) => {
      const keyCode = e.keyCode || e.which;
      const key = e.key;

      if (key === 'ArrowUp' || key === 'Up' || keyCode === 38) {
        window.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: 'ArrowUp',
            code: 'ArrowUp',
            keyCode: 38,
            which: 38,
            bubbles: true,
            cancelable: true,
          })
        );
      } else if (key === 'ArrowDown' || key === 'Down' || keyCode === 40) {
        window.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
          })
        );
      } else if (key === 'ArrowLeft' || key === 'Left' || keyCode === 37) {
        window.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: 'ArrowLeft',
            code: 'ArrowLeft',
            keyCode: 37,
            which: 37,
            bubbles: true,
            cancelable: true,
          })
        );
      } else if (key === 'ArrowRight' || key === 'Right' || keyCode === 39) {
        window.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: 'ArrowRight',
            code: 'ArrowRight',
            keyCode: 39,
            which: 39,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    };

    window.addEventListener('keydown', handleTvKeyDown, { capture: true, passive: false });
    window.addEventListener('keyup', handleTvKeyUp, { capture: true, passive: false });
    return () => {
      window.removeEventListener('keydown', handleTvKeyDown, { capture: true });
      window.removeEventListener('keyup', handleTvKeyUp, { capture: true });
    };
  }, [handleVirtualAction]);

  const handleSelectBattle = (enemyId: string) => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    const overworld = sceneManager.getScene('OverworldScene') as OverworldScene;
    if (overworld && sceneManager.isActive('OverworldScene')) {
      overworld.startBattle(enemyId);
    } else {
      soundManager.playBattleStart();
      sceneManager.stop('BattleScene');
      sceneManager.stop('OverworldScene');
      sceneManager.stop('TitleScene');
      sceneManager.stop('IntroScene');
      sceneManager.stop('GameOverScene');
      if (enemyId === 'flowey') {
        sceneManager.start('FloweyBattleScene');
      } else {
        sceneManager.start('BattleScene', { enemyId });
      }
    }
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

  const handleQuickSave = async () => {
    soundManager.playSave();
    const curRoomName = gameState.getCurrentRoomName();
    const curSlot = gameState.getActiveSlot();
    gameState.saveGame(curRoomName, curSlot);

    let cloudNotice = '';
    if (auth.currentUser) {
      try {
        const slotData = gameState.getSaveSlotData(curSlot);
        if (slotData) {
          await saveSlotToCloud(auth.currentUser.uid, curSlot, slotData as any);
          await submitScoreToLeaderboard(
            auth.currentUser,
            stats,
            curRoomName,
            gameState.getPlaytimeSeconds()
          );
          cloudNotice = ' & NUVEM FIREBASE';
        }
      } catch {
        // ignore cloud background error
      }
    }

    setSaveToast(`★ PROGRESSO SALVO NO SLOT ${curSlot} (LOCAL${cloudNotice})!`);
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
      {/* Full-Screen Retro CRT Monitor Shader Overlay (Scanlines, Barrel Curvature & 60Hz Phosphor Flicker) */}
      <CRTFullScreenOverlay />

      {/* Smart TV Remote Control Guide Overlay */}
      <SmartTvGuideOverlay
        isTvMode={isTvMode}
        onToggleTvMode={() => setIsTvMode((prev) => !prev)}
        lastRemoteKey={lastRemoteKey}
      />

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
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <SoundSettings />

          {/* Smart TV Remote Mode Toggle */}
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setIsTvMode((prev) => !prev);
            }}
            className={`px-2 sm:px-2.5 py-1 text-xs border transition-colors cursor-pointer flex items-center gap-1 font-bold whitespace-nowrap ${
              isTvMode
                ? 'border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.4)]'
                : 'border-neutral-700 text-neutral-400 hover:text-cyan-300 hover:border-cyan-500/70'
            }`}
            title="Alternar Modo Smart TV (Suporte a controle remoto com setas, OK, Voltar, Menu e botões coloridos)"
          >
            <span>📺</span>
            <span className="hidden md:inline">TV</span>
          </button>

          {/* Virtual Touchpad Toggle for Mobile */}
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setShowVirtualPad((prev) => !prev);
            }}
            className={`px-2 sm:px-2.5 py-1 text-xs border transition-colors cursor-pointer flex items-center gap-1 font-bold whitespace-nowrap ${
              showVirtualPad
                ? 'border-yellow-500/80 bg-yellow-950/40 text-yellow-300'
                : 'border-neutral-700 text-neutral-400 hover:text-yellow-300'
            }`}
            title="Exibir ou ocultar controle touch virtual na tela"
          >
            <span>📱</span>
            <span className="hidden md:inline">TOUCH</span>
          </button>

          {/* Google Firebase Auth & Cloud Sync button */}
          {firebaseUser ? (
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="px-2 sm:px-2.5 py-1 text-xs border border-emerald-500/80 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900 transition-colors cursor-pointer flex items-center gap-1.5 font-bold whitespace-nowrap"
              title={`Conectado como ${firebaseUser.displayName || firebaseUser.email}. Clique para gerenciar saves na nuvem.`}
            >
              <span>☁️</span>
              <span className="hidden sm:inline">{firebaseUser.displayName?.split(' ')[0] || 'NUVEM'}</span>
              <span className="text-[9px] text-emerald-400 font-mono">[OK]</span>
            </button>
          ) : (
            <button
              onClick={() => setIsFirebaseModalOpen(true)}
              className="px-2 sm:px-2.5 py-1 text-xs border border-yellow-500/80 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5 font-bold whitespace-nowrap"
              title="Conectar com o Google para salvar progresso na nuvem do Firebase"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>NUVEM</span>
            </button>
          )}

          {/* Global Leaderboard Button */}
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setIsLeaderboardOpen(true);
            }}
            className="px-2 sm:px-2.5 py-1 text-xs border border-yellow-500/80 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5 font-bold whitespace-nowrap"
            title="Ver Placar Global de Determinação entre jogadores do Firebase"
          >
            <span>🏆</span>
            <span className="hidden sm:inline">PLACAR</span>
          </button>

          {/* Global Achievements Button */}
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setIsAchievementsOpen(true);
            }}
            className="px-2 sm:px-2.5 py-1 text-xs border border-yellow-500/80 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5 font-bold whitespace-nowrap shadow-[0_0_8px_rgba(250,204,21,0.2)]"
            title="Ver Conquistas e Marcos do Jogador (Sincronizado no Firestore)"
          >
            <span>🎖️</span>
            <span className="hidden sm:inline">CONQUISTAS</span>
          </button>

          {/* Bullet-Hell Tutorial & Daily Tip Button */}
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setIsTutorialOpen(true);
            }}
            className="px-2 sm:px-2.5 py-1 text-xs border border-neutral-700 text-neutral-300 hover:border-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer flex items-center gap-1 font-bold whitespace-nowrap"
            title="Dicas do Dia, Guia de Cores de Balas e Mini-Simulador de Treino"
          >
            <span>💡</span>
            <span className="hidden sm:inline">DICAS</span>
          </button>

          {/* Quick Save button to persist state to localStorage and Cloud */}
          <button
            onClick={handleQuickSave}
            className="px-2.5 py-1 text-xs border border-yellow-500/70 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1 font-bold whitespace-nowrap"
            title="Salvar progresso no slot ativo (LocalStorage + Firebase Cloud)"
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

          {/* Shop Modal Button */}
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              setIsShopOpen(true);
            }}
            className="px-2.5 py-1 text-xs border border-yellow-500/80 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-400 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5 font-bold whitespace-nowrap"
            title="Abrir Bazar / Loja das Ruínas para trocar ouro por itens e equipamentos"
          >
            <span>★</span>
            <span>LOJA</span>
          </button>

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
            <VirtualController
              onAction={handleVirtualAction}
              onQuickSave={handleQuickSave}
              onToggleCrt={() => gameState.setCrtFilter(!gameState.getCrtFilter())}
            />
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
          <span>Setas / WASD: Mover · Z: Confirmar · X: Cancelar · C: Menu · M: Mapa · H: Histórico</span>
        </div>
      </main>

      {/* Overworld Menu Modal */}
      <OverworldMenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        stats={stats}
        onReloadGameState={handleReloadGameState}
        onOpenShop={() => setIsShopOpen(true)}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
      />

      {/* Visual Pop-up Notification for Unlocked Achievements */}
      <AchievementToast />

      {/* Achievements & Milestones Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        onOpenAuthModal={() => setIsFirebaseModalOpen(true)}
      />

      {/* Firebase Google Cloud Login Prompt Modal */}
      <FirebaseLoginPromptModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        onReloadGameState={handleReloadGameState}
        onSyncNotification={(msg) => {
          setSaveToast(msg);
          setTimeout(() => setSaveToast(null), 3600);
        }}
      />

      {/* Global Leaderboard Modal (Placar de Pontos entre Jogadores Firebase) */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        stats={stats}
        onOpenAuthModal={() => setIsFirebaseModalOpen(true)}
      />

      {/* Shop Modal */}
      <ShopModal
        isOpen={isShopOpen}
        onClose={() => setIsShopOpen(false)}
        stats={stats}
      />

      {/* Floating Tip Card for Start Screen */}
      <BattleTipFloatingCard onOpenTutorial={() => setIsTutorialOpen(true)} />

      {/* Battle Tutorial & Bullet-Hell Guide Modal */}
      <BattleTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
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
