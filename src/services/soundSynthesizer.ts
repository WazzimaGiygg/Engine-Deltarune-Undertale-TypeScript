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

  // Branch snap / wood crack sound in Snowdin Forest
  public playBranchCrack() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(280, t + 0.09);
    filter.Q.setValueAtTime(3.5, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.masterVolume * 0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // Classic Undertale whoopee cushion fart sound in the hand
  public playWhoopeeCushion() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.55;

    // Carrier oscillator: buzzy sawtooth
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + dur);

    // LFO to flutter / modulate pitch for the iconic raspberry texture
    const lfo = this.ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(36, t);
    lfo.frequency.linearRampToValueAtTime(24, t + dur);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(35, t);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(250, t + dur);

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.masterVolume * 0.4, t);
    masterGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    lfo.start(t);
    osc.start(t);
    lfo.stop(t + dur);
    osc.stop(t + dur);
  }

  // Flowey's iconic eerie cackle / evil laugh
  public playFloweyLaugh() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const baseNotes = [680, 620, 560, 480, 420, 360, 320];
    baseNotes.forEach((freq, idx) => {
      const t = this.ctx!.currentTime + idx * 0.085;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.07);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.5, t);
      filter.Q.setValueAtTime(4, t);

      gain.gain.setValueAtTime(this.masterVolume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  // Chiptune Music Generator & Looper
  public playMusic(
    theme:
      | 'story_intro'
      | 'title_menu'
      | 'fallen_down'
      | 'ruins_exploration'
      | 'home_toriel'
      | 'basement_drone'
      | 'flowey_theme'
      | 'battle_standard'
      | 'battle_dummy'
      | 'battle_boss_jester'
      | 'battle_toriel'
      | 'determination'
      | 'snowy_forest'
      | 'sans_theme'
      | 'overworld'
      | 'battle'
      | 'boss'
  ) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    // Map backwards compatible aliases
    let activeTheme = theme;
    if (activeTheme === 'battle') activeTheme = 'battle_standard';
    if (activeTheme === 'boss') activeTheme = 'battle_boss_jester';
    if (activeTheme === 'overworld') activeTheme = 'ruins_exploration';

    if (this.currentMusic?.id === activeTheme) return;
    this.stopMusic();

    let isPlaying = true;
    let step = 0;
    let timerId: number | null = null;

    // Melody definitions
    let tempo = 150;
    let leadNotes: number[] = [];
    let bassNotes: number[] = [];
    let leadWave: OscillatorType = 'square';
    let bassWave: OscillatorType = 'triangle';
    let addHarmonic = false;

    if (activeTheme === 'story_intro') {
      // Toby Fox - Undertale OST 001 "Once Upon a Time" (Prologue / Story Intro Theme)
      tempo = 210;
      leadWave = 'triangle';
      bassWave = 'sine';
      addHarmonic = true;
      leadNotes = [
        261.63, 329.63, 392.00, 523.25, 523.25, 0, 0, 0,
        493.88, 493.88, 0, 392.00, 392.00, 0, 0, 0,
        440.00, 392.00, 329.63, 392.00, 293.66, 293.66, 293.66, 0,
        261.63, 329.63, 392.00, 523.25, 523.25, 0, 0, 0,
        493.88, 493.88, 0, 392.00, 392.00, 0, 0, 0,
        440.00, 493.88, 523.25, 587.33, 523.25, 523.25, 523.25, 0,
        659.25, 659.25, 587.33, 523.25, 392.00, 392.00, 392.00, 0,
        440.00, 523.25, 493.88, 493.88, 392.00, 392.00, 392.00, 0,
        659.25, 659.25, 587.33, 523.25, 392.00, 392.00, 392.00, 0,
        440.00, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 523.25,
      ];
      bassNotes = [
        130.81, 0, 196.00, 0, 164.81, 0, 196.00, 0,
        164.81, 0, 246.94, 0, 196.00, 0, 246.94, 0,
        174.61, 0, 261.63, 0, 196.00, 0, 293.66, 0,
        130.81, 0, 196.00, 0, 164.81, 0, 196.00, 0,
        164.81, 0, 246.94, 0, 196.00, 0, 246.94, 0,
        174.61, 0, 196.00, 0, 130.81, 0, 196.00, 0,
        110.00, 0, 164.81, 0, 130.81, 0, 164.81, 0,
        174.61, 0, 261.63, 0, 196.00, 0, 293.66, 0,
        110.00, 0, 164.81, 0, 130.81, 0, 164.81, 0,
        174.61, 0, 196.00, 0, 130.81, 0, 261.63, 0,
      ];
    } else if (activeTheme === 'title_menu') {
      // Undertale OST 002 "Start Menu" - Iconic 8-bit fast arpeggio sequence
      tempo = 120;
      leadWave = 'square';
      bassWave = 'triangle';
      leadNotes = [
        // C major arpeggio
        261.63, 329.63, 392.00, 523.25, 392.00, 329.63,
        // G/B arpeggio
        246.94, 293.66, 392.00, 493.88, 392.00, 293.66,
        // Am arpeggio
        220.00, 261.63, 329.63, 440.00, 329.63, 261.63,
        // F arpeggio
        174.61, 220.00, 261.63, 349.23, 261.63, 220.00,
        // C major build
        261.63, 329.63, 392.00, 523.25, 659.25, 523.25,
        // G major build
        196.00, 246.94, 293.66, 392.00, 493.88, 587.33,
        // F -> G resolve
        349.23, 440.00, 523.25, 392.00, 493.88, 587.33,
        523.25, 0, 523.25, 0, 523.25, 0,
      ];
      bassNotes = [
        130.81, 0, 130.81, 0, 130.81, 0,
        123.47, 0, 123.47, 0, 123.47, 0,
        110.00, 0, 110.00, 0, 110.00, 0,
        87.31, 0, 87.31, 0, 87.31, 0,
        130.81, 0, 130.81, 0, 130.81, 0,
        98.00, 0, 98.00, 0, 98.00, 0,
        87.31, 0, 87.31, 0, 98.00, 0,
        130.81, 0, 196.00, 0, 261.63, 0,
      ];
    } else if (activeTheme === 'fallen_down') {
      // Undertale OST 004 "Fallen Down" - Ruins Entrance & Awakening
      tempo = 195;
      leadWave = 'triangle';
      bassWave = 'sine';
      addHarmonic = true;
      leadNotes = [
        659.25, 587.33, 523.25, 392.00, 392.00, 0,
        440.00, 523.25, 493.88, 392.00, 392.00, 0,
        659.25, 587.33, 523.25, 392.00, 392.00, 0,
        440.00, 493.88, 523.25, 587.33, 659.25, 587.33,
        523.25, 523.25, 0, 0, 0, 0,
        659.25, 783.99, 698.46, 587.33, 587.33, 0,
        587.33, 698.46, 659.25, 523.25, 523.25, 0,
        523.25, 659.25, 587.33, 493.88, 493.88, 0,
        440.00, 493.88, 523.25, 587.33, 523.25, 523.25,
        523.25, 0, 0, 0, 0, 0,
      ];
      bassNotes = [
        130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
        123.47, 196.00, 246.94, 196.00, 246.94, 196.00,
        130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
        174.61, 261.63, 349.23, 196.00, 293.66, 392.00,
        130.81, 196.00, 261.63, 196.00, 261.63, 196.00,
        146.83, 220.00, 293.66, 146.83, 220.00, 293.66,
        130.81, 196.00, 261.63, 130.81, 196.00, 261.63,
        110.00, 164.81, 220.00, 110.00, 164.81, 220.00,
        174.61, 261.63, 196.00, 293.66, 130.81, 261.63,
        130.81, 0, 196.00, 0, 261.63, 0,
      ];
    } else if (activeTheme === 'ruins_exploration') {
      // Undertale OST 005 "Ruins" - Catacombs, puzzles, ancient stone halls
      tempo = 175;
      leadWave = 'triangle';
      bassWave = 'sine';
      leadNotes = [
        // F minor mystery melody
        349.23, 392.00, 415.30, 466.16, 523.25, 466.16, 415.30, 392.00,
        349.23, 311.13, 349.23, 415.30, 392.00, 349.23, 311.13, 261.63,
        349.23, 415.30, 523.25, 622.25, 587.33, 523.25, 466.16, 415.30,
        466.16, 523.25, 587.33, 466.16, 523.25, 0, 0, 0,
      ];
      bassNotes = [
        174.61, 0, 261.63, 0, 207.65, 0, 261.63, 0,
        138.59, 0, 207.65, 0, 155.56, 0, 233.08, 0,
        174.61, 0, 261.63, 0, 207.65, 0, 261.63, 0,
        116.54, 0, 174.61, 0, 130.81, 0, 196.00, 0,
      ];
    } else if (activeTheme === 'home_toriel') {
      // Undertale OST 012 "Home" - Cozy, heartwarming acoustic warmth
      tempo = 210;
      leadWave = 'triangle';
      bassWave = 'sine';
      addHarmonic = true;
      leadNotes = [
        293.66, 369.99, 440.00, 587.33, 554.37, 493.88, 440.00, 369.99,
        392.00, 493.88, 587.33, 493.88, 440.00, 369.99, 329.63, 293.66,
        293.66, 369.99, 440.00, 587.33, 739.99, 659.25, 587.33, 440.00,
        493.88, 554.37, 587.33, 493.88, 440.00, 0, 0, 0,
      ];
      bassNotes = [
        146.83, 0, 220.00, 0, 185.00, 0, 220.00, 0,
        98.00, 0, 146.83, 0, 196.00, 0, 146.83, 0,
        110.00, 0, 164.81, 0, 220.00, 0, 164.81, 0,
        146.83, 0, 220.00, 0, 146.83, 0, 0, 0,
      ];
    } else if (activeTheme === 'basement_drone') {
      // Basement Suspense / Premonition - Dark, eerie, subterranean
      tempo = 280;
      leadWave = 'sawtooth';
      bassWave = 'triangle';
      leadNotes = [
        220.00, 0, 207.65, 0, 196.00, 0, 185.00, 0,
        174.61, 0, 164.81, 0, 155.56, 0, 164.81, 0,
      ];
      bassNotes = [
        55.00, 0, 55.00, 0, 51.91, 0, 51.91, 0,
        49.00, 0, 49.00, 0, 46.25, 0, 49.00, 0,
      ];
    } else if (activeTheme === 'flowey_theme') {
      // Undertale OST 003 "Your Best Friend" - Deceptively cheerful bouncy carnival
      tempo = 145;
      leadWave = 'triangle';
      bassWave = 'square';
      leadNotes = [
        // Playful bounce: F - A - C - D - C - A - F - G
        349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23, 392.00,
        440.00, 349.23, 293.66, 261.63, 349.23, 392.00, 440.00, 0,
        349.23, 440.00, 523.25, 587.33, 698.46, 659.25, 587.33, 523.25,
        440.00, 392.00, 349.23, 392.00, 349.23, 0, 0, 0,
      ];
      bassNotes = [
        174.61, 0, 130.81, 0, 174.61, 0, 196.00, 0,
        174.61, 0, 146.83, 0, 174.61, 0, 196.00, 0,
        174.61, 0, 130.81, 0, 116.54, 0, 130.81, 0,
        174.61, 0, 196.00, 0, 174.61, 0, 0, 0,
      ];
    } else if (activeTheme === 'battle_standard') {
      // Undertale OST 009 "Enemy Approaching" - Classic battle theme!
      tempo = 130;
      leadWave = 'square';
      bassWave = 'triangle';
      leadNotes = [
        293.66, 0, 349.23, 0, 392.00, 0, 415.30, 415.30,
        392.00, 0, 349.23, 0, 293.66, 349.23, 392.00, 0,
        261.63, 0, 329.63, 0, 392.00, 0, 440.00, 440.00,
        392.00, 0, 329.63, 0, 261.63, 329.63, 392.00, 0,
        246.94, 0, 293.66, 0, 349.23, 0, 392.00, 392.00,
        349.23, 0, 293.66, 0, 246.94, 293.66, 349.23, 0,
        261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25,
      ];
      bassNotes = [
        146.83, 146.83, 0, 146.83, 138.59, 138.59, 0, 138.59,
        130.81, 130.81, 0, 130.81, 123.47, 123.47, 0, 123.47,
        116.54, 116.54, 0, 116.54, 110.00, 110.00, 0, 110.00,
        130.81, 0, 146.83, 0, 164.81, 0, 196.00, 0,
      ];
    } else if (activeTheme === 'battle_dummy') {
      // Undertale OST 010 "Ghost Battle / Pathetic House" - Swing jazzy shuffle
      tempo = 135;
      leadWave = 'sawtooth';
      bassWave = 'triangle';
      leadNotes = [
        293.66, 0, 349.23, 0, 440.00, 415.30, 392.00, 0,
        349.23, 0, 293.66, 0, 349.23, 0, 293.66, 0,
        261.63, 0, 311.13, 0, 392.00, 369.99, 349.23, 0,
        311.13, 0, 261.63, 0, 311.13, 0, 261.63, 0,
        293.66, 349.23, 440.00, 523.25, 587.33, 523.25, 440.00, 349.23,
        293.66, 0, 0, 0, 293.66, 0, 0, 0,
      ];
      bassNotes = [
        146.83, 0, 174.61, 0, 220.00, 0, 207.65, 0,
        196.00, 0, 174.61, 0, 146.83, 0, 174.61, 0,
        130.81, 0, 155.56, 0, 196.00, 0, 185.00, 0,
        174.61, 0, 155.56, 0, 130.81, 0, 155.56, 0,
        146.83, 0, 146.83, 0, 146.83, 0, 146.83, 0,
        146.83, 0, 0, 0, 146.83, 0, 0, 0,
      ];
    } else if (activeTheme === 'battle_boss_jester') {
      // "THE WORLD REVOLVING" - Fast frantic polyrhythmic circus arpeggios
      tempo = 110;
      leadWave = 'square';
      bassWave = 'sawtooth';
      leadNotes = [
        493.88, 415.30, 329.63, 493.88, 554.37, 440.00, 369.99, 554.37,
        622.25, 493.88, 415.30, 622.25, 659.25, 493.88, 415.30, 659.25,
        739.99, 622.25, 493.88, 739.99, 830.61, 659.25, 554.37, 830.61,
        987.77, 830.61, 659.25, 493.88, 415.30, 329.63, 415.30, 493.88,
      ];
      bassNotes = [
        164.81, 246.94, 329.63, 246.94, 220.00, 277.18, 369.99, 277.18,
        246.94, 311.13, 415.30, 311.13, 164.81, 246.94, 329.63, 246.94,
        146.83, 220.00, 293.66, 220.00, 138.59, 207.65, 277.18, 207.65,
        164.81, 246.94, 329.63, 246.94, 164.81, 0, 164.81, 0,
      ];
    } else if (activeTheme === 'battle_toriel') {
      // Undertale OST 014 "Heartache" - Dramatic, driving, emotional boss anthem
      tempo = 125;
      leadWave = 'sawtooth';
      bassWave = 'square';
      leadNotes = [
        493.88, 587.33, 739.99, 659.25, 587.33, 554.37, 493.88, 440.00,
        493.88, 587.33, 739.99, 880.00, 783.99, 739.99, 659.25, 739.99,
        587.33, 659.25, 739.99, 587.33, 659.25, 554.37, 493.88, 440.00,
        493.88, 554.37, 587.33, 659.25, 739.99, 659.25, 587.33, 554.37,
      ];
      bassNotes = [
        123.47, 123.47, 185.00, 123.47, 98.00, 98.00, 146.83, 98.00,
        110.00, 110.00, 164.81, 110.00, 92.50, 92.50, 138.59, 92.50,
        123.47, 123.47, 185.00, 123.47, 98.00, 98.00, 146.83, 98.00,
        110.00, 110.00, 164.81, 110.00, 92.50, 92.50, 123.47, 185.00,
      ];
    } else if (activeTheme === 'determination') {
      // Undertale OST 011 "Determination" - Game Over piano / emotional chime
      tempo = 230;
      leadWave = 'triangle';
      bassWave = 'sine';
      addHarmonic = true;
      leadNotes = [
        // Bb major / F major motif
        466.16, 587.33, 698.46, 932.33, 880.00, 698.46, 587.33, 698.46,
        783.99, 932.33, 1174.66, 1046.50, 932.33, 783.99, 698.46, 587.33,
        466.16, 587.33, 698.46, 932.33, 880.00, 698.46, 587.33, 698.46,
        783.99, 880.00, 932.33, 783.99, 698.46, 0, 0, 0,
      ];
      bassNotes = [
        116.54, 0, 174.61, 0, 233.08, 0, 174.61, 0,
        155.56, 0, 233.08, 0, 311.13, 0, 233.08, 0,
        174.61, 0, 261.63, 0, 349.23, 0, 261.63, 0,
        116.54, 0, 174.61, 0, 116.54, 0, 0, 0,
      ];
    } else if (activeTheme === 'snowy_forest') {
      // Undertale OST 017 "Snowy" - Soft, contemplative winter piano & bells in Snowdin Forest
      tempo = 230;
      leadWave = 'triangle';
      bassWave = 'sine';
      addHarmonic = true;
      leadNotes = [
        // C minor / Eb Major winter phrase
        392.00, 466.16, 523.25, 587.33, 622.25, 587.33, 523.25, 466.16,
        392.00, 349.23, 392.00, 466.16, 523.25, 392.00, 349.23, 261.63,
        392.00, 466.16, 523.25, 622.25, 698.46, 622.25, 523.25, 466.16,
        523.25, 587.33, 622.25, 523.25, 392.00, 0, 0, 0,
      ];
      bassNotes = [
        130.81, 0, 196.00, 0, 155.56, 0, 196.00, 0,
        103.83, 0, 155.56, 0, 130.81, 0, 155.56, 0,
        116.54, 0, 174.61, 0, 146.83, 0, 174.61, 0,
        130.81, 0, 196.00, 0, 130.81, 0, 0, 0,
      ];
    } else if (activeTheme === 'sans_theme') {
      // Undertale OST 015 "Sans." - Jaunty, laid-back jazzy bounce
      tempo = 135;
      leadWave = 'sawtooth';
      bassWave = 'triangle';
      leadNotes = [
        293.66, 0, 293.66, 0, 349.23, 0, 293.66, 0,
        392.00, 0, 349.23, 0, 293.66, 0, 261.63, 0,
        293.66, 0, 349.23, 0, 392.00, 0, 415.30, 415.30,
        440.00, 0, 523.25, 0, 440.00, 0, 349.23, 0,
      ];
      bassNotes = [
        146.83, 0, 110.00, 0, 146.83, 0, 174.61, 0,
        196.00, 0, 174.61, 0, 146.83, 0, 130.81, 0,
        146.83, 0, 174.61, 0, 196.00, 0, 207.65, 0,
        220.00, 0, 261.63, 0, 220.00, 0, 174.61, 0,
      ];
    } else {
      // Fallback Megalo motif
      tempo = 125;
      leadWave = 'square';
      bassWave = 'triangle';
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
        osc.type = leadWave;
        osc.frequency.setValueAtTime(leadNote, t);

        const leadVol = addHarmonic ? this.musicVolume * 0.22 : this.musicVolume * 0.16;
        const decayLen = addHarmonic ? (tempo / 1000) * 1.3 : (tempo / 1000) * 0.9;
        gain.gain.setValueAtTime(leadVol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + decayLen);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + decayLen);

        // Add delicate chime harmonic overtone when requested
        if (addHarmonic) {
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
        oscB.type = bassWave;
        oscB.frequency.setValueAtTime(bassNote, t);

        const bassVol = addHarmonic ? this.musicVolume * 0.24 : this.musicVolume * 0.22;
        const bassDecay = addHarmonic ? (tempo / 1000) * 1.2 : (tempo / 1000) * 0.85;
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
      id: activeTheme,
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
