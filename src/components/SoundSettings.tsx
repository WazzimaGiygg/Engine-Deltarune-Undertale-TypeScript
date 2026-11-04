import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import React, { useState } from 'react';
import { soundManager } from '../services/soundSynthesizer';
import { voiceSynthesizer } from '../services/voiceSynthesizer';

export const SoundSettings: React.FC = () => {
  const [isMuted, setIsMuted] = useState(soundManager.getIsMuted());
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(voiceSynthesizer.getIsEnabled());

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundManager.setMuted(next);
    if (!next) {
      soundManager.playMenuSelect();
    }
  };

  const toggleVoice = () => {
    const next = !isVoiceEnabled;
    setIsVoiceEnabled(next);
    voiceSynthesizer.setEnabled(next);
    if (next) {
      soundManager.playMenuSelect();
      voiceSynthesizer.speak('Voz dos diálogos ativada.', 'narrator');
    }
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Chiptune Music / SFX Mute button */}
      <button
        onClick={toggleMute}
        aria-label={isMuted ? 'Ativar Áudio Chiptune' : 'Silenciar Áudio Chiptune'}
        title={isMuted ? 'Áudio Chiptune mudo. Clique para ativar.' : 'Áudio Chiptune ligado. Clique para silenciar.'}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-pixel rounded border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors cursor-pointer whitespace-nowrap"
      >
        {isMuted ? (
          <>
            <VolumeX className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden md:inline">MUDO</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">8-BIT</span>
          </>
        )}
      </button>

      {/* Spoken Dialogue Voice Synthesis button */}
      <button
        onClick={toggleVoice}
        aria-label={isVoiceEnabled ? 'Desativar Dublagem' : 'Ativar Dublagem'}
        title={isVoiceEnabled ? 'Dublagem em áudio dos diálogos ativada (Vozes de Toriel, Sans, Flowey). Clique para desativar.' : 'Dublagem em áudio desativada. Clique para ativar.'}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-pixel rounded border transition-colors cursor-pointer whitespace-nowrap ${
          isVoiceEnabled
            ? 'border-purple-500/80 bg-purple-950/40 text-purple-300 hover:border-purple-400 hover:text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.25)]'
            : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300 hover:border-neutral-700'
        }`}
      >
        {isVoiceEnabled ? (
          <>
            <Mic className="w-3.5 h-3.5 text-purple-400" />
            <span>VOZ</span>
          </>
        ) : (
          <>
            <MicOff className="w-3.5 h-3.5 text-neutral-500" />
            <span className="line-through text-neutral-600">VOZ</span>
          </>
        )}
      </button>
    </div>
  );
};

