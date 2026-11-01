import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  loginWithGoogle,
  logoutFirebase,
  subscribeAuthState,
  loadAllCloudSlots,
  saveSlotToCloud,
} from '../services/firebase';
import { gameState } from '../engine/gameState';
import { GameSaveData } from '../types/game';
import { soundManager } from '../services/soundSynthesizer';

interface FirebaseLoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReloadGameState?: () => void;
  onSyncNotification?: (msg: string) => void;
}

export const FirebaseLoginPromptModal: React.FC<FirebaseLoginPromptModalProps> = ({
  isOpen,
  onClose,
  onReloadGameState,
  onSyncNotification,
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [cloudSlots, setCloudSlots] = useState<{ [slot: number]: GameSaveData } | null>(null);
  const [hasCheckedCloud, setHasCheckedCloud] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeAuthState(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsLoading(true);
        try {
          const slots = await loadAllCloudSlots(currentUser.uid);
          setCloudSlots(slots);
          setHasCheckedCloud(true);
        } catch {
          // ignore
        } finally {
          setIsLoading(false);
        }
      } else {
        setCloudSlots(null);
        setHasCheckedCloud(false);
      }
    });
    return () => unsub();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      soundManager.playMenuSelect();
      const loggedUser = await loginWithGoogle();
      soundManager.playSave();
      setUser(loggedUser);

      // Check cloud saves
      const slots = await loadAllCloudSlots(loggedUser.uid);
      setCloudSlots(slots);
      setHasCheckedCloud(true);

      const activeLocal = gameState.getActiveSlot();
      const localData = gameState.getSaveSlotData(activeLocal);

      // If user has local data but no cloud data, offer or perform auto-upload
      if (localData && (!slots || Object.keys(slots).length === 0)) {
        await saveSlotToCloud(loggedUser.uid, activeLocal, localData as any);
        onSyncNotification?.(
          `* Conta conectada! Seu progresso local do Slot ${activeLocal} foi salvo na nuvem!`
        );
      } else {
        onSyncNotification?.(
          `* Conectado ao Google como ${loggedUser.displayName || loggedUser.email}!`
        );
      }
    } catch (err: any) {
      soundManager.playHurt();
      console.error('Login error:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('* A janela de login do Google foi fechada.');
      } else {
        setErrorMessage('* Não foi possível concluir o login com o Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      soundManager.playMenuSelect();
      await logoutFirebase();
      setUser(null);
      setCloudSlots(null);
      onSyncNotification?.('* Você saiu da sua conta Google.');
    } catch {
      setErrorMessage('* Erro ao desconectar conta.');
    }
  };

  const handleDownloadCloudSlot = (slotNumber: number) => {
    if (!cloudSlots || !cloudSlots[slotNumber]) return;
    soundManager.playSave();
    const cloudSave = cloudSlots[slotNumber];
    const ok = gameState.importSaveFromJson(JSON.stringify(cloudSave), slotNumber);
    if (ok) {
      gameState.setActiveSlot(slotNumber);
      gameState.loadFromSlot(slotNumber);
      onSyncNotification?.(
        `* Slot ${slotNumber} baixado da nuvem com sucesso! Local: [${cloudSave.roomName || cloudSave.currentRoom}].`
      );
      onReloadGameState?.();
      onClose();
    }
  };

  const handleUploadCurrentSlot = async (slotNumber: number) => {
    if (!user) return;
    setIsLoading(true);
    try {
      soundManager.playSave();
      const curRoomName = gameState.getCurrentRoomName();
      gameState.saveGame(curRoomName, slotNumber);
      const localData = gameState.getSaveSlotData(slotNumber);
      if (localData) {
        await saveSlotToCloud(user.uid, slotNumber, localData as any);
        const refreshed = await loadAllCloudSlots(user.uid);
        setCloudSlots(refreshed);
        onSyncNotification?.(`* Slot ${slotNumber} enviado para a nuvem do Firebase com sucesso!`);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('* Erro ao enviar dados para a nuvem.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Login e Salvamento na Nuvem Google Firebase"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 select-none"
    >
      <div className="w-full max-w-lg bg-black border-4 border-white p-5 sm:p-6 text-white font-pixel shadow-[0_0_30px_rgba(255,255,255,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-neutral-700 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-lg animate-pulse">♥</span>
            <h3 className="text-xs sm:text-sm font-bold text-yellow-300 tracking-wider">
              GOOGLE FIREBASE · SALVAMENTO EM NUVEM
            </h3>
          </div>
          <button
            onClick={() => {
              soundManager.playMenuSelect();
              onClose();
            }}
            className="text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-400 px-2 py-0.5 text-xs transition-colors cursor-pointer"
          >
            [X] Fechar
          </button>
        </div>

        {/* Content State */}
        {!user ? (
          <div className="space-y-4">
            <p className="text-xs text-neutral-300 leading-relaxed">
              * Conecte sua conta do Google para gravar seu progresso, itens e arquivos de determinação
              no <span className="text-yellow-300 font-bold">Google Firebase</span>.
            </p>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              * Seus saves ficam protegidos na nuvem e você pode acessá-los de qualquer navegador ou
              dispositivo sem perder sua jornada pelo Subterrâneo!
            </p>

            {errorMessage && (
              <div className="border border-red-500/70 bg-red-950/40 p-2 text-xs text-red-300">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                disabled={isLoading}
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-white hover:bg-neutral-200 text-black font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 border-2 border-yellow-400 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
              >
                {isLoading ? (
                  <span>Conectando com o Google...</span>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                    <span>CONECTAR COM CONTA GOOGLE</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  onClose();
                }}
                className="w-full py-2.5 border border-neutral-700 bg-neutral-950 text-neutral-300 hover:text-white hover:border-neutral-500 text-xs transition-colors cursor-pointer"
              >
                [CONTINUAR COMO CONVIDADO (OFFLINE)]
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* User Profile Card */}
            <div className="flex items-center justify-between border border-neutral-800 bg-neutral-950 p-3">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-8 h-8 rounded-full border border-yellow-400"
                  />
                ) : (
                  <span className="text-red-500 text-base">♥</span>
                )}
                <div>
                  <div className="text-xs font-bold text-white">
                    {user.displayName || 'Jogador Conectado'}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">{user.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 border border-emerald-500 text-emerald-300 bg-emerald-950/40 font-bold">
                  ☁️ NUVEM ATIVA
                </span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-400 px-2 py-1 transition-colors cursor-pointer"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Cloud Saves Overview */}
            <div className="space-y-2">
              <h4 className="text-[11px] text-yellow-300 uppercase font-bold tracking-wide flex items-center justify-between">
                <span>Slots Sincronizados na Nuvem:</span>
                <span className="text-[10px] text-neutral-400 font-mono">
                  Slot Ativo: {gameState.getActiveSlot()}
                </span>
              </h4>

              {[1, 2, 3].map((slotNum) => {
                const cloudSave = cloudSlots ? cloudSlots[slotNum] : null;
                const localSave = gameState.getSaveSlotData(slotNum);

                return (
                  <div
                    key={slotNum}
                    className="border border-neutral-800 bg-black p-2.5 text-xs flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">SLOT {slotNum}</span>
                        {gameState.getActiveSlot() === slotNum && (
                          <span className="text-[9px] text-yellow-300 bg-yellow-950 px-1 py-0.2 border border-yellow-600">
                            ATIVO
                          </span>
                        )}
                        {cloudSave ? (
                          <span className="text-[9px] text-emerald-400 font-mono">[Nuvem OK]</span>
                        ) : (
                          <span className="text-[9px] text-neutral-500 font-mono">[Sem Nuvem]</span>
                        )}
                      </div>

                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {cloudSave ? (
                          <span>
                            {cloudSave.roomName || cloudSave.currentRoom} · LV {cloudSave.stats?.lv || 1} ·{' '}
                            {new Date(cloudSave.timestamp).toLocaleDateString('pt-BR')}
                          </span>
                        ) : (
                          <span className="italic text-neutral-600">Vazio na nuvem</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {cloudSave && (
                        <button
                          onClick={() => handleDownloadCloudSlot(slotNum)}
                          className="px-2 py-1 border border-cyan-500/80 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900 text-[10px] transition-colors cursor-pointer font-bold"
                          title="Restaurar este save da nuvem para o jogo agora"
                        >
                          ⬇ Baixar da Nuvem
                        </button>
                      )}
                      <button
                        disabled={isLoading}
                        onClick={() => handleUploadCurrentSlot(slotNum)}
                        className="px-2 py-1 border border-yellow-500/80 bg-yellow-950/40 text-yellow-300 hover:bg-yellow-900 text-[10px] transition-colors cursor-pointer font-bold"
                        title="Gravar progresso atual deste slot na nuvem"
                      >
                        ⬆ Enviar para Nuvem
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-neutral-800 flex justify-end">
              <button
                onClick={() => {
                  soundManager.playMenuSelect();
                  onClose();
                }}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-xs cursor-pointer transition-colors"
              >
                [CONTINUAR JOGANDO]
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 pt-2 border-t border-neutral-900 text-[9px] text-neutral-600 text-center">
          * Powered by Google Firebase Firestore & Google Authentication
        </div>
      </div>
    </div>
  );
};
