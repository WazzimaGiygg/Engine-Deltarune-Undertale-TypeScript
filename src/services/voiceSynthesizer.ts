import { CharacterVoice } from '../types/dialogue';

export interface VoiceSettings {
  enabled: boolean;
  volume: number;
  rateMultiplier: number;
}

class VoiceSynthesizer {
  private synth: SpeechSynthesis | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.9;
  private rateMultiplier: number = 1.0;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadSettings();
      this.initVoices();
    }
  }

  private loadSettings() {
    try {
      const savedEnabled = localStorage.getItem('undertale_voice_speech_enabled');
      if (savedEnabled !== null) {
        this.isEnabled = savedEnabled === 'true';
      }
      const savedVol = localStorage.getItem('undertale_voice_speech_volume');
      if (savedVol !== null) {
        this.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));
      }
    } catch {
      // ignore
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('undertale_voice_speech_enabled', String(this.isEnabled));
      localStorage.setItem('undertale_voice_speech_volume', String(this.volume));
    } catch {
      // ignore
    }
  }

  private initVoices() {
    if (!this.synth) return;

    const populate = () => {
      this.voices = this.synth?.getVoices() || [];
      this.isInitialized = true;
    };

    populate();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = populate;
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
    this.saveSettings();
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  public stop(): void {
    if (!this.synth) return;
    try {
      this.synth.cancel();
      this.currentUtterance = null;
    } catch {
      // ignore
    }
  }

  /**
   * Pre-processes Undertale dialogue text into natural spoken Portuguese
   */
  public cleanDialogueText(text: string): string {
    return text
      .replace(/^\s*\*+\s*/gm, '') // Remove starting asterisks
      .replace(/[\(\)]/g, '') // Remove parenthetical delimiters for smoother speech
      .replace(/\s+/g, ' ') // Collapse multiple whitespace
      .replace(/♥/g, 'coração')
      .replace(/LV/g, 'L-V')
      .replace(/EXP/g, 'E-X-P')
      .replace(/HP/g, 'H-P')
      .trim();
  }

  /**
   * Finds the best matching voice for character and Portuguese language
   */
  private findBestVoice(isFemale: boolean): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      this.voices = this.synth?.getVoices() || [];
    }

    // 1. Try Portuguese (pt-BR or pt-PT)
    const ptVoices = this.voices.filter(
      (v) => v.lang.startsWith('pt') || v.lang.startsWith('pt-BR') || v.lang.startsWith('pt-PT')
    );

    if (ptVoices.length > 0) {
      if (isFemale) {
        const femaleVoice = ptVoices.find(
          (v) =>
            v.name.toLowerCase().includes('maria') ||
            v.name.toLowerCase().includes('female') ||
            v.name.toLowerCase().includes('luciana') ||
            v.name.toLowerCase().includes('fernanda') ||
            v.name.toLowerCase().includes('heloisa') ||
            v.name.toLowerCase().includes('yara') ||
            v.name.toLowerCase().includes('raquel')
        );
        if (femaleVoice) return femaleVoice;
      } else {
        const maleVoice = ptVoices.find(
          (v) =>
            v.name.toLowerCase().includes('felipe') ||
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('daniel') ||
            v.name.toLowerCase().includes('ricardo') ||
            v.name.toLowerCase().includes('jorge')
        );
        if (maleVoice) return maleVoice;
      }
      return ptVoices[0];
    }

    // Fallback to default system voice
    return this.voices.find((v) => v.default) || this.voices[0] || null;
  }

  /**
   * Speaks dialogue text with character-tailored pitch, speed and inflection
   */
  public speak(
    rawText: string,
    character: CharacterVoice | 'narrator' | 'sign' | string = 'monster'
  ): void {
    if (!this.isEnabled || !this.synth) return;

    const cleanedText = this.cleanDialogueText(rawText);
    if (!cleanedText) return;

    // Cancel any previous spoken utterance to avoid queued voice pile-up
    this.stop();

    try {
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.lang = 'pt-BR';
      utterance.volume = this.volume;

      // Character-specific speech acting parameters
      let pitch = 1.0;
      let rate = 1.0;
      let isFemale = false;

      switch (character) {
        case 'toriel':
          // Toriel: Warm, gentle, maternal voice
          pitch = 1.18;
          rate = 0.94;
          isFemale = true;
          break;

        case 'sans':
          // Sans: Deep, relaxed, laid-back, humorous
          pitch = 0.65;
          rate = 0.88;
          isFemale = false;
          break;

        case 'flowey':
        case 'flowey_evil':
        case 'flowey_creepy':
          // Flowey: High-pitched, mocking, fast
          pitch = 1.55;
          rate = 1.15;
          isFemale = false;
          break;

        case 'papyrus':
          // Papyrus: Loud, theatrical, brisk
          pitch = 1.25;
          rate = 1.12;
          isFemale = false;
          break;

        case 'napstablook':
        case 'blooky':
          // Napstablook: Quiet, slow, melancholic
          pitch = 0.85;
          rate = 0.78;
          utterance.volume = this.volume * 0.75;
          isFemale = false;
          break;

        case 'frisk':
          pitch = 1.08;
          rate = 1.0;
          break;

        case 'narrator':
        case 'sign':
          // Narrator and signs: Clear, balanced, storybook pace
          pitch = 1.0;
          rate = 1.02;
          break;

        case 'monster':
        default:
          pitch = 0.92;
          rate = 1.0;
          break;
      }

      utterance.pitch = Math.max(0.1, Math.min(2, pitch));
      utterance.rate = Math.max(0.1, Math.min(2, rate * this.rateMultiplier));

      const chosenVoice = this.findBestVoice(isFemale);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      this.currentUtterance = utterance;

      utterance.onend = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
      };

      utterance.onerror = () => {
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
      };

      this.synth.speak(utterance);
    } catch {
      // SpeechSynthesis error fallback
    }
  }
}

export const voiceSynthesizer = new VoiceSynthesizer();
