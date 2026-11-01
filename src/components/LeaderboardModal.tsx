import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  fetchLeaderboard,
  submitScoreToLeaderboard,
  calculatePlayerScore,
  LeaderboardEntry,
  loginWithGoogle,
} from '../services/firebase';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';
import { PlayerStats } from '../types/game';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onOpenAuthModal?: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  stats,
  onOpenAuthModal,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [user, setUser] = useState<User | null>(auth.currentUser);

  const loadScores = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLeaderboard(30);
      setEntries(data);
    } catch {
      setMessage('* Erro ao carregar pontuações do Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUser(auth.currentUser);
      setMessage('');
      loadScores();
    }
  }, [isOpen]);

  const currentScore = calculatePlayerScore(stats, gameState.getPlaytimeSeconds());
  const myEntry = user ? entries.find((e) => e.userId === user.uid) : null;
  const myRank = user && myEntry ? entries.findIndex((e) => e.userId === user.uid) + 1 : null;

  const handleSubmitScore = async () => {
    if (!user) {
      onOpenAuthModal?.();
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      soundManager.playSave();
      const playtime = gameState.getPlaytimeSeconds();
      const roomName = gameState.getCurrentRoomName();
      const updated = await submitScoreToLeaderboard(user, stats, roomName, playtime);
      setMessage(`* Seu recorde de ${updated.score} Pontos foi registrado no Firebase!`);
      await loadScores();
    } catch {
      soundManager.playHurt();
      setMessage('* Erro ao publicar pontuação no Firebase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      soundManager.playMenuSelect();
      const loggedUser = await loginWithGoogle();
      soundManager.playSave();
      setUser(loggedUser);
      setMessage(`* Conectado como ${loggedUser.displayName || loggedUser.email}!`);
      await loadScores();
    } catch {
      soundManager.playHurt();
      setMessage('* Erro ao conectar conta do Google.');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Placar de Pontos entre Jogadores Firebase"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 select-none"
    >
      <div className="w-full max-w-2xl bg-black border-4 border-yellow-400 p-5 sm:p-6 text-white font-pixel shadow-[0_0_35px_rgba(255,255,0,0.25)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg animate-pulse">♥</span>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-yellow-300 tracking-wider">
                PLACAR DE DETERMINAÇÃO · SUBTERRÂNEO
              </h2>
              <span className="text-[9px] text-neutral-400 font-mono">
                Ranking Global de Jogadores via Google Firebase
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadScores}
              disabled={isLoading}
              className="px-2.5 py-1 text-[10px] border border-neutral-700 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer flex items-center gap-1 font-bold"
              title="Atualizar lista de pontuações"
            >
              <span>↻</span>
              <span className="hidden sm:inline">ATUALIZAR</span>
            </button>
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

        {/* Current Player Card & Actions */}
        <div className="border-2 border-neutral-800 bg-neutral-950 p-3 mb-4 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">SUA DETERMINAÇÃO ATUAL:</span>
                <span className="text-sm font-bold text-yellow-400 font-mono">
                  {currentScore} PTS
                </span>
                {myRank && (
                  <span className="text-[10px] bg-yellow-950 border border-yellow-500 text-yellow-300 px-1.5 py-0.5 font-bold">
                    POSIÇÃO #{myRank}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1 flex flex-wrap items-center gap-2">
                <span>LV {stats.lv}</span>
                <span>·</span>
                <span>{stats.exp} EXP</span>
                <span>·</span>
                <span>{stats.gold} G</span>
                <span>·</span>
                <span className={stats.kills === 0 ? 'text-emerald-400 font-bold' : 'text-blue-300'}>
                  {stats.kills === 0 ? 'PACIFISTA' : `${stats.kills} ABATES`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <button
                  disabled={isSubmitting}
                  onClick={handleSubmitScore}
                  className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 border border-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.3)]"
                  title="Enviar sua pontuação atual para o ranking global"
                >
                  <span>★</span>
                  <span>{isSubmitting ? 'ENVIANDO...' : 'PUBLICAR MEU RECORDE'}</span>
                </button>
              ) : (
                <button
                  onClick={handleConnectGoogle}
                  className="px-3 py-1.5 bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-yellow-400"
                  title="Conectar com o Google para cadastrar seu score"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>CONECTAR GOOGLE</span>
                </button>
              )}
            </div>
          </div>

          {message && (
            <p className="text-[10px] text-yellow-300 border-t border-neutral-900 pt-1.5 mt-2 italic font-mono">
              {message}
            </p>
          )}
        </div>

        {/* Leaderboard Table */}
        <div className="flex-1 overflow-y-auto border border-neutral-800 bg-neutral-950 p-2 pr-1 space-y-1.5">
          {isLoading && entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400 animate-pulse">
              Carregando placar do Google Firebase...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 space-y-2">
              <p>* Nenhum jogador cadastrado no placar ainda.</p>
              <p className="text-[10px] text-neutral-600">
                Seja o primeiro determinado a publicar sua pontuação!
              </p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = user?.uid === entry.userId;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;

              return (
                <div
                  key={entry.userId || idx}
                  className={`p-2.5 border text-xs flex flex-wrap items-center justify-between gap-2 transition-all ${
                    isMe
                      ? 'border-yellow-400 bg-yellow-950/30 text-yellow-200 ring-1 ring-yellow-400/80 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                      : isTop1
                      ? 'border-yellow-500/80 bg-black/80 text-white'
                      : 'border-neutral-800 bg-black/60 text-neutral-300'
                  }`}
                >
                  {/* Left: Rank & Player info */}
                  <div className="flex items-center gap-2.5 min-w-[200px] flex-1">
                    {/* Rank Badge */}
                    <div className="w-8 text-center shrink-0">
                      {isTop1 ? (
                        <span className="text-yellow-400 font-bold text-sm">👑 1</span>
                      ) : isTop2 ? (
                        <span className="text-neutral-300 font-bold text-xs">🥈 2</span>
                      ) : isTop3 ? (
                        <span className="text-amber-500 font-bold text-xs">🥉 3</span>
                      ) : (
                        <span className="text-neutral-500 font-mono text-[11px]">#{rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    {entry.photoURL ? (
                      <img
                        src={entry.photoURL}
                        alt={entry.displayName}
                        className="w-6 h-6 rounded-full border border-neutral-700 shrink-0"
                      />
                    ) : (
                      <span className={`text-xs ${isMe ? 'text-red-500 animate-pulse' : 'text-neutral-600'}`}>
                        ♥
                      </span>
                    )}

                    {/* Name & Route */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold text-xs truncate max-w-[140px] sm:max-w-[180px] ${
                            isMe ? 'text-yellow-300' : 'text-white'
                          }`}
                        >
                          {entry.displayName}
                        </span>
                        {isMe && (
                          <span className="text-[8px] bg-yellow-400 text-black px-1 py-0.2 font-bold shrink-0">
                            VOCÊ
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-neutral-400 mt-0.5 truncate">
                        <span>{entry.roomName || 'Ruínas'}</span>
                        <span className="mx-1">·</span>
                        <span
                          className={
                            entry.route?.includes('PACIFISTA')
                              ? 'text-emerald-400 font-bold'
                              : 'text-neutral-400'
                          }
                        >
                          {entry.route}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Scores & Stats */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
                    <div className="text-[10px] text-neutral-400 font-mono hidden sm:block">
                      <div>LV {entry.lv}</div>
                      <div className="text-[9px] text-yellow-500">{entry.gold} G</div>
                    </div>

                    <div className="min-w-[90px] text-right">
                      <span className="text-xs font-bold font-mono text-yellow-300 block">
                        {entry.score.toLocaleString()} PTS
                      </span>
                      <span className="text-[8px] text-neutral-500 font-mono block">
                        {new Date(entry.updatedAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-neutral-900 flex flex-wrap items-center justify-between text-[9px] text-neutral-500 shrink-0">
          <span>* Pontuação calculada a partir de EXP, LV, Ouro, Criaturas Poupadas e Rota.</span>
          <span>Google Firestore Database</span>
        </div>
      </div>
    </div>
  );
};
