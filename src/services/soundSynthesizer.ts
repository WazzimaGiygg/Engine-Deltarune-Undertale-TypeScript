class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterVolume: number = 0.3;
  private musicVolume: number = 0.2;
  private currentMusic: {
    stop: () => void;
    id: string;
  } | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.currentMusic) {
      this.stopMusic();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
  }

  // Blip when characters talk (Undertale dialogue typing sound)
  public playVoiceBlip(character: 'frisk' | 'sans' | 'papyrus' | 'toriel' | 'monster' | 'flowey' = 'monster') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let freq = 220;
    let type: OscillatorType = 'triangle';

    switch (character) {
      case 'flowey':
        freq = 520;
        type = 'triangle';
        break;
      case 'papyrus':
        freq = 310;
        type = 'sawtooth';
        break;
      case 'sans':
        freq = 110;
        type = 'square';
        break;
      case 'toriel':
        freq = 380;
        type = 'sine';
        break;
      case 'frisk':
        freq = 440;
        type = 'triangle';
        break;
      case 'monster':
      default:
        freq = 180 + Math.random() * 80;
        type = 'square';
        break;
    }

    const t = this.ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(this.masterVolume * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  // Menu navigation blip
  public playMenuMove() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(440, t);
    gain.gain.setValueAtTime(this.masterVolume * 0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // Menu select / confirm
  public playMenuSelect() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(523.25, t); // C5
    osc.frequency.setValueAtTime(659.25, t + 0.04); // E5

    gain.gain.setValueAtTime(this.masterVolume * 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  // Player soul damaged
  public playHurt() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Noise burst + low square drop
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(800, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(this.masterVolume * 0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    whiteNoise.start(t);
  }

  // Attack slash hit
  public playSlash() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);

    gain.gain.setValueAtTime(this.masterVolume * 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // Encounter battle flash sound
  public playBattleStart() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.25);

    gain.gain.setValueAtTime(this.masterVolume * 0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  // Save point sparkle
  public playSave() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = this.ctx!.currentTime + idx * 0.06;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(this.masterVolume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // Spare / Pacifist victory chime
  public playSpare() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = this.ctx!.currentTime + idx * 0.08;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(this.masterVolume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // Chiptune Music Generator & Looper
  public playMusic(theme: 'story_intro' | 'overworld' | 'fallen_down' | 'battle' | 'boss') {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    if (this.currentMusic?.id === theme) return;
    this.stopMusic();

    let isPlaying = true;
    let step = 0;
    let timerId: number | null = null;

    // Melody definitions
    let tempo = 150;
    let leadNotes: number[] = [];
    let bassNotes: number[] = [];

    if (theme === 'story_intro') {
      // Toby Fox - Undertale OST 001 "Once Upon a Time" (Prologue / Story Intro Theme)
      // Key: C Major, gentle acoustic music box / chime piano
      tempo = 210;
      leadNotes = [
        // Measure 1: C - E - G - C5
        261.63, 329.63, 392.00, 523.25, 523.25, 0, 0, 0,
        // Measure 2: B - G
        493.88, 493.88, 0, 392.00, 392.00, 0, 0, 0,
        // Measure 3: A - G - E - G - D
        440.00, 392.00, 329.63, 392.00, 293.66, 293.66, 293.66, 0,
        // Measure 4: C - E - G - C5
        261.63, 329.63, 392.00, 523.25, 523.25, 0, 0, 0,
        // Measure 5: B - G
        493.88, 493.88, 0, 392.00, 392.00, 0, 0, 0,
        // Measure 6: A - B - C5 - D5 - C5
        440.00, 493.88, 523.25, 587.33, 523.25, 523.25, 523.25, 0,

        // Measure 7: E5 - D5 - C5 - G
        659.25, 659.25, 587.33, 523.25, 392.00, 392.00, 392.00, 0,
        // Measure 8: A - C5 - B - G
        440.00, 523.25, 493.88, 493.88, 392.00, 392.00, 392.00, 0,
        // Measure 9: E5 - D5 - C5 - G
        659.25, 659.25, 587.33, 523.25, 392.00, 392.00, 392.00, 0,
        // Measure 10: A - B - C5 - D5 - E5 - D5 - C5
        440.00, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 523.25,
      ];
      bassNotes = [
        // Measure 1: C Major
        130.81, 0, 196.00, 0, 164.81, 0, 196.00, 0,
        // Measure 2: Em / G
        164.81, 0, 246.94, 0, 196.00, 0, 246.94, 0,
        // Measure 3: F -> G
        174.61, 0, 261.63, 0, 196.00, 0, 293.66, 0,
        // Measure 4: C Major
        130.81, 0, 196.00, 0, 164.81, 0, 196.00, 0,
        // Measure 5: Em / G
        164.81, 0, 246.94, 0, 196.00, 0, 246.94, 0,
        // Measure 6: F -> G -> C
        174.61, 0, 196.00, 0, 130.81, 0, 196.00, 0,

        // Measure 7: Am
        110.00, 0, 164.81, 0, 130.81, 0, 164.81, 0,
        // Measure 8: F -> G
        174.61, 0, 261.63, 0, 196.00, 0, 293.66, 0,
        // Measure 9: Am
        110.00, 0, 164.81, 0, 130.81, 0, 164.81, 0,
        // Measure 10: F -> G -> C
        174.61, 0, 196.00, 0, 130.81, 0, 261.63, 0,
      ];
    } else if (theme === 'fallen_down') {
      // Toby Fox - Undertale OST 004 "Fallen Down" (Ruins Entrance Theme)
      // Key: C Major, gentle acoustic music box / celeste
      tempo = 195;
      leadNotes = [
        // Phrase 1 (Measures 1-4)
        659.25, 587.33, 523.25, 392.00, 392.00, 0, // E5 D5 C5 G4
        440.00, 523.25, 493.88, 392.00, 392.00, 0, // A4 C5 B4 G4
        // Phrase 2 (Measures 5-8)
        659.25, 587.33, 523.25, 392.00, 392.00, 0, // E5 D5 C5 G4
        440.00, 493.88, 523.25, 587.33, 659.25, 587.33, // A4 B4 C5 D5 E5 D5
        523.25, 523.25, 0, 0, 0, 0, // C5
        // Phrase 3 (Measures 9-12)
        659.25, 783.99, 698.46, 587.33, 587.33, 0, // E5 G5 F5 D5
        587.33, 698.46, 659.25, 523.25, 523.25, 0, // D5 F5 E5 C5
        // Phrase 4 (Measures 13-16)
        523.25, 659.25, 587.33, 493.88, 493.88, 0, // C5 E5 D5 B4
        440.00, 493.88, 523.25, 587.33, 523.25, 523.25, // A4 B4 C5 D5 C5
        523.25, 0, 0, 0, 0, 0,
      ];
      bassNotes = [
        // C
        130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
        // Em/B
        123.47, 196.00, 246.94, 196.00, 246.94, 196.00,
        // C
        130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
        // F -> G
        174.61, 261.63, 349.23, 196.00, 293.66, 392.00,
        // C
        130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
        // G/B -> Dm
        146.83, 220.00, 293.66, 146.83, 220.00, 293.66,
        // C
        130.81, 196.00, 261.63, 130.81, 196.00, 261.63,
        // Am
        110.00, 164.81, 220.00, 110.00, 164.81, 220.00,
        // F -> G -> C
        174.61, 261.63, 196.00, 293.66, 130.81, 261.63,
        130.81, 0, 196.00, 0, 261.63, 0,
      ];
    } else if (theme === 'overworld') {
      // Fallen Down / Ruins peaceful motif
      tempo = 200;
      leadNotes = [
        261.63, 329.63, 392.00, 493.88, 440.00, 392.00, 329.63, 293.66,
        261.63, 329.63, 392.00, 523.25, 493.88, 440.00, 392.00, 329.63,
      ];
      bassNotes = [
        130.81, 0, 130.81, 0, 164.81, 0, 164.81, 0,
        174.61, 0, 174.61, 0, 196.00, 0, 196.00, 0,
      ];
    } else {
      // Energetic Undertale Battle / Megalo motif
      tempo = 125;
      leadNotes = [
        293.66, 293.66, 587.33, 0, 440.00, 0, 415.30, 0,
        392.00, 0, 349.23, 0, 293.66, 349.23, 392.00, 0,
        261.63, 261.63, 587.33, 0, 440.00, 0, 415.30, 0,
        392.00, 0, 349.23, 0, 293.66, 349.23, 392.00, 0,
      ];
      bassNotes = [
        146.83, 146.83, 0, 146.83, 138.59, 138.59, 0, 138.59,
        130.81, 130.81, 0, 130.81, 123.47, 123.47, 0, 123.47,
        146.83, 146.83, 0, 146.83, 138.59, 138.59, 0, 138.59,
        130.81, 130.81, 0, 130.81, 123.47, 123.47, 0, 123.47,
      ];
    }

    const scheduleTick = () => {
      if (!isPlaying || !this.ctx || this.isMuted) return;

      const t = this.ctx.currentTime + 0.05;
      const leadNote = leadNotes[step % leadNotes.length];
      const bassNote = bassNotes[step % bassNotes.length];

      // Lead note
      if (leadNote > 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = (theme === 'story_intro' || theme === 'fallen_down') ? 'triangle' : theme === 'overworld' ? 'sine' : 'square';
        osc.frequency.setValueAtTime(leadNote, t);

        const leadVol = (theme === 'story_intro' || theme === 'fallen_down') ? this.musicVolume * 0.22 : this.musicVolume * 0.15;
        const decayLen = (theme === 'story_intro' || theme === 'fallen_down') ? (tempo / 1000) * 1.3 : (tempo / 1000) * 0.9;
        gain.gain.setValueAtTime(leadVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + decayLen);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + decayLen);

        // For story intro and fallen down: Add delicate acoustic chime harmonic overtone
        if (theme === 'story_intro' || theme === 'fallen_down') {
          const oscH = this.ctx.createOscillator();
          const gainH = this.ctx.createGain();
          oscH.type = 'sine';
          oscH.frequency.setValueAtTime(leadNote * 2, t);
          gainH.gain.setValueAtTime(this.musicVolume * 0.08, t);
          gainH.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
          oscH.connect(gainH);
          gainH.connect(this.ctx.destination);
          oscH.start(t);
          oscH.stop(t + 0.16);
        }
      }

      // Bass note
      if (bassNote > 0) {
        const oscB = this.ctx.createOscillator();
        const gainB = this.ctx.createGain();
        oscB.type = (theme === 'story_intro' || theme === 'fallen_down') ? 'sine' : 'triangle';
        oscB.frequency.setValueAtTime(bassNote, t);

        const bassVol = (theme === 'story_intro' || theme === 'fallen_down') ? this.musicVolume * 0.24 : this.musicVolume * 0.22;
        const bassDecay = (theme === 'story_intro' || theme === 'fallen_down') ? (tempo / 1000) * 1.2 : (tempo / 1000) * 0.85;
        gainB.gain.setValueAtTime(bassVol, t);
        gainB.gain.exponentialRampToValueAtTime(0.001, t + bassDecay);

        oscB.connect(gainB);
        gainB.connect(this.ctx.destination);
        oscB.start(t);
        oscB.stop(t + bassDecay);
      }

      step++;
      timerId = window.setTimeout(scheduleTick, tempo);
    };

    scheduleTick();

    this.currentMusic = {
      id: theme,
      stop: () => {
        isPlaying = false;
        if (timerId !== null) {
          clearTimeout(timerId);
        }
      },
    };
  }

  public stopMusic() {
    if (this.currentMusic) {
      this.currentMusic.stop();
      this.currentMusic = null;
    }
  }
}

export const soundManager = new SoundSynthesizer();
