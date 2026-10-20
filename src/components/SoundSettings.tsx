import { Volume2, VolumeX } from 'lucide-react';
import React, { useState } from 'react';
import { soundManager } from '../services/soundSynthesizer';

export const SoundSettings: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
    if (!next) {
      soundManager.playMenuSelect();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleMute}
        aria-label={isMuted ? 'Ativar Áudio Chiptune' : 'Silenciar Áudio Chiptune'}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-pixel rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer"
      >
        {isMuted ? (
          <>
            <VolumeX className="w-3.5 h-3.5 text-red-400" />
            <span>MUDO</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>ÁUDIO CHIPTUNE</span>
          </>
        )}
      </button>
    </div>
  );
};
