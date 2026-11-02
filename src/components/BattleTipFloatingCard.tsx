import React, { useEffect, useState } from 'react';
import { gameState } from '../engine/gameState';
import { soundManager } from '../services/soundSynthesizer';

interface BattleTipFloatingCardProps {
  onOpenTutorial: () => void;
}

const QUICK_TIPS = [
  'A hitbox da sua Alma fica no centro do coração vermelho (♥)! Raspe as bordas com calma.',
  'Projéteis Azuis: Fique imóvel! Solte as teclas de movimento para passar direto sem dano.',
  'Projéteis Laranjas: Mova-se! Atravesse o rastro laranja sem parar de andar.',
  'Projéteis Verdes: Cure-se! Tocar em balas verdes restaura seus pontos de vida (HP).',
  'Piedade: Você nunca precisa matar ninguém. Use AGIR e poupe quando o nome estiver amarelo!',
  'Toques Curtos: Dê toques rápidos nas setas para realizar manobras milimétricas.',
];

export function BattleTipFloatingCard({ onOpenTutorial }: BattleTipFloatingCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    // Pick tip of the day
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setTipIndex(dayOfYear % QUICK_TIPS.length);
  }, []);

  useEffect(() => {
    const unsub = gameState.subscribePosition((pos) => {
      if (pos.activeScene === 'TitleScene' && !isDismissed) {
        // Show after a brief 1.2s delay on start screen
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 1200);
        return () => clearTimeout(timer);
      } else {
        setIsVisible(false);
      }
    });

    return () => unsub();
  }, [isDismissed]);

  if (!isVisible || isDismissed) return null;

  return (
    <aside
      aria-label="Dica do dia de combate"
      className="fixed bottom-12 right-4 z-40 max-w-sm bg-black border-2 border-yellow-400 p-3 shadow-[0_0_20px_rgba(255,255,0,0.3)] font-pixel text-white animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-yellow-300">
          <span className="text-red-500">♥</span>
          <span>DICA DO DIA: BULLET-HELL</span>
        </div>
        <button
          onClick={() => {
            soundManager.playMenuMove();
            setIsDismissed(true);
          }}
          className="text-neutral-500 hover:text-white text-[10px] px-1 cursor-pointer transition-colors"
          title="Dispensar dica"
        >
          [✕]
        </button>
      </div>

      <p className="text-[10px] text-neutral-300 leading-relaxed mb-2.5">
        {QUICK_TIPS[tipIndex]}
      </p>

      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => {
            soundManager.playMenuSelect();
            onOpenTutorial();
          }}
          className="text-[10px] px-2.5 py-1 bg-yellow-400 text-black font-bold hover:bg-yellow-300 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span>VER TUTORIAL COMPLETO</span>
          <span>→</span>
        </button>
        <button
          onClick={() => {
            soundManager.playMenuMove();
            setTipIndex((prev) => (prev + 1) % QUICK_TIPS.length);
          }}
          className="text-[9px] text-neutral-400 hover:text-white underline cursor-pointer"
        >
          Outra Dica
        </button>
      </div>
    </aside>
  );
}
