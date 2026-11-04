import React, { useEffect, useState } from 'react';
import { achievementManager } from '../engine/achievementManager';
import { auth } from '../services/firebase';
import { soundManager } from '../services/soundSynthesizer';
import { Achievement, AchievementCategory } from '../types/achievement';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuthModal?: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  onOpenAuthModal,
}) => {
  const [achievements, setAchievements] = useState<Achievement[]>(
    achievementManager.getAchievements()
  );
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');
  const [stats, setStats] = useState(achievementManager.getStats());

  useEffect(() => {
    return achievementManager.subscribe((list) => {
      setAchievements(list);
      setStats(achievementManager.getStats());
    });
  }, []);

  if (!isOpen) {
    return null;
  }

  const filtered = achievements.filter((ach) => {
    if (selectedCategory === 'all') return true;
    return ach.category === selectedCategory;
  });

  const categories: { id: AchievementCategory | 'all'; label: string }[] = [
    { id: 'all', label: 'TODAS' },
    { id: 'boss', label: 'CHEFES' },
    { id: 'story', label: 'HISTÓRIA' },
    { id: 'exploration', label: 'EXPLORAÇÃO' },
    { id: 'secret', label: 'SEGREDOS' },
    { id: 'special', label: 'ESPECIAIS' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-4 select-none font-pixel"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          soundManager.playMenuSelect();
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] bg-black border-4 border-yellow-400 p-4 sm:p-5 rounded-xs shadow-[0_0_35px_rgba(250,204,21,0.4)] text-white flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-yellow-500/80 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 text-base">🏆</span>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-yellow-300 tracking-wider">
                CONQUISTAS DO SUBTERRÂNEO
              </h2>
              <p className="text-[8px] text-neutral-400">
                Marcos lendários rastreados e sincronizados com o Firestore
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="text-neutral-400 hover:text-red-400 text-xs sm:text-sm px-2 py-1 cursor-pointer font-bold border border-neutral-800 hover:border-red-500"
          >
            [X]
          </button>
        </div>

        {/* Global Progress & Cloud Status Banner */}
        <div className="bg-neutral-950 border border-neutral-800 p-3 rounded mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[9px]">
          {/* Progress */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-neutral-300">PROGRESSO:</span>
              <span className="text-yellow-300 font-bold">
                {stats.unlocked} / {stats.total} ({stats.rate}%)
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-neutral-900 border border-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all duration-500"
                style={{ width: `${stats.rate}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[8px] text-neutral-400">
              <span>Pontos de Determinação:</span>
              <span className="text-yellow-400 font-bold">
                {stats.points} / {stats.maxPoints} PTS
              </span>
            </div>
          </div>

          {/* Cloud Sync State */}
          <div className="sm:border-l sm:border-neutral-800 sm:pl-3 flex flex-col justify-center">
            {auth.currentUser ? (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="text-xs">☁️</span>
                <div className="text-[8px]">
                  <span className="font-bold block">SINCRONIZADO NA NUVEM</span>
                  <span className="text-neutral-400 text-[7px] truncate max-w-[140px] block">
                    {auth.currentUser.displayName || auth.currentUser.email}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-neutral-400 text-[8px]">💾 Salvo localmente</span>
                {onOpenAuthModal && (
                  <button
                    onClick={() => {
                      soundManager.playMenuSelect();
                      onOpenAuthModal();
                    }}
                    className="px-2 py-0.5 bg-yellow-950/60 border border-yellow-500/80 text-yellow-300 hover:bg-yellow-400 hover:text-black rounded text-[7.5px] cursor-pointer"
                  >
                    ☁️ CONECTAR NUVEM
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 mb-3 border-b border-neutral-900 pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundManager.playMenuSelect();
                setSelectedCategory(cat.id);
              }}
              className={`px-2 py-1 rounded text-[8px] border transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-yellow-400 border-yellow-300 text-black font-bold'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Achievements List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filtered.map((ach) => {
            const isSecretLocked = ach.isSecret && !ach.unlocked;

            return (
              <div
                key={ach.id}
                className={`p-2.5 rounded border flex items-start gap-3 transition-colors ${
                  ach.unlocked
                    ? 'bg-neutral-950/90 border-yellow-400/80 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                    : 'bg-neutral-950/40 border-neutral-800 opacity-65'
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-11 h-11 rounded flex items-center justify-center text-xl shrink-0 border ${
                    ach.unlocked
                      ? 'bg-yellow-950/40 border-yellow-400 text-yellow-300'
                      : 'bg-neutral-900 border-neutral-700 grayscale'
                  }`}
                >
                  {isSecretLocked ? '❓' : ach.icon}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className={`text-[10px] sm:text-[11px] font-bold ${
                        ach.unlocked ? 'text-yellow-300' : 'text-neutral-400'
                      }`}
                    >
                      {isSecretLocked ? '??? (Conquista Secreta)' : ach.title}
                    </h3>

                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${
                        ach.unlocked
                          ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-500/60'
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700'
                      }`}
                    >
                      +{ach.points} PTS
                    </span>
                  </div>

                  <p className="text-[9px] text-neutral-300 leading-tight font-retro">
                    {isSecretLocked
                      ? ach.secretDescription || 'Descubra este segredo para desbloquear.'
                      : ach.description}
                  </p>

                  <div className="mt-1.5 flex items-center gap-2 text-[7.5px]">
                    {ach.unlocked ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <span>★</span>
                        <span>
                          DESBLOQUEADA{' '}
                          {ach.unlockedAt &&
                            `(${new Date(ach.unlockedAt).toLocaleDateString('pt-BR')})`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-neutral-500 font-bold flex items-center gap-1">
                        <span>🔒</span>
                        <span>BLOQUEADA</span>
                      </span>
                    )}

                    <span className="text-neutral-600">•</span>
                    <span className="text-neutral-400 uppercase text-[7px]">
                      {ach.category === 'boss'
                        ? 'Chefe'
                        : ach.category === 'secret'
                        ? 'Segredo'
                        : ach.category === 'story'
                        ? 'História'
                        : ach.category === 'exploration'
                        ? 'Exploração'
                        : 'Especial'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 mt-2 flex items-center justify-between text-[8px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="text-red-500">♥</span>
            <span>Rastreador de Marcos de Determinação</span>
          </div>
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="px-3 py-1 bg-white text-black font-bold hover:bg-neutral-200 cursor-pointer rounded"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
};
