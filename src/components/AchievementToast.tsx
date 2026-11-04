import React, { useEffect, useState } from 'react';
import { achievementManager } from '../engine/achievementManager';
import { soundManager } from '../services/soundSynthesizer';
import { AchievementUnlockNotification } from '../types/achievement';

export const AchievementToast: React.FC = () => {
  const [currentNotif, setCurrentNotif] = useState<AchievementUnlockNotification | null>(null);
  const [queue, setQueue] = useState<AchievementUnlockNotification[]>([]);

  useEffect(() => {
    return achievementManager.onNotification((notif) => {
      setQueue((prev) => [...prev, notif]);
    });
  }, []);

  useEffect(() => {
    if (!currentNotif && queue.length > 0) {
      const next = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentNotif(next);

      // Sound is played
      soundManager.playSave();

      const timer = setTimeout(() => {
        setCurrentNotif(null);
      }, 5500);

      return () => clearTimeout(timer);
    }
  }, [currentNotif, queue]);

  if (!currentNotif) {
    return null;
  }

  return (
    <aside
      aria-label="Notificação de Conquista"
      className="fixed top-14 right-3 sm:right-6 z-50 max-w-sm w-[90%] sm:w-80 bg-black/95 border-2 border-yellow-400 p-3 rounded-xs shadow-[0_0_28px_rgba(250,204,21,0.5)] font-pixel text-white select-none transition-all duration-300 animate-in fade-in slide-in-from-top-3 cursor-pointer"
      onClick={() => setCurrentNotif(null)}
      title="Clique para fechar"
    >
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-yellow-500/60 pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-xs animate-bounce">★</span>
          <span className="text-[10px] text-yellow-300 font-bold tracking-wider">
            CONQUISTA DESBLOQUEADA!
          </span>
        </div>
        <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-400/50 font-bold">
          +{currentNotif.points} PTS
        </span>
      </div>

      {/* Body */}
      <div className="flex items-start gap-2.5">
        <div className="w-10 h-10 rounded bg-neutral-900 border border-yellow-500/50 flex items-center justify-center text-xl shrink-0 shadow-inner">
          {currentNotif.icon}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-bold text-white truncate mb-1">
            {currentNotif.title}
          </h4>
          <p className="text-[9px] text-neutral-300 leading-tight font-retro text-xs">
            {currentNotif.description}
          </p>
        </div>
      </div>

      {/* Footer indicator */}
      <div className="mt-2 pt-1 border-t border-neutral-800 flex items-center justify-between text-[7.5px] text-neutral-500">
        <div className="flex items-center gap-1">
          <span className="text-red-500">♥</span>
          <span>Salvo no Firestore</span>
        </div>
        <span>Toque para fechar</span>
      </div>
    </aside>
  );
};
