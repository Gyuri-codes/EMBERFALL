/**
 * EMBERFALL: GUARDIANS OF THE LAST REALM
 * Procedural Chinese Pentatonic Cultivation Web Audio Engine
 */

export type MusicState = 'menu' | 'battle' | 'boss' | 'victory' | 'defeat' | 'silent';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Music state
  private currentMusicState: MusicState = 'silent';
  private musicTimer: number | null = null;
  private musicStep = 0;
  private isMuted = false;

  // Pentatonic scales in Hz (Chinese traditional Gong, Shang, Jiao, Zhi, Yu)
  // Base D Pentatonic: D (293.66), E (329.63), F# (369.99), A (440.00), B (493.88)
  private readonly PENTATONIC_BASE = [
    146.83, 164.81, 184.99, 220.0, 246.94, // Lower Octave (D3 - B3)
    293.66, 329.63, 369.99, 440.0, 493.88, // Middle Octave (D4 - B4)
    587.33, 659.25, 739.99, 880.0, 987.77  // High Octave (D5 - B5)
  ];

  // Minor/Dramatic Pentatonic for Boss & Abyssal fights: D, F, G, A, C
  private readonly DRAMATIC_PENTATONIC = [
    146.83, 174.61, 196.0, 220.0, 261.63,
    293.66, 349.23, 392.0, 440.0, 523.25,
    587.33, 698.46, 783.99, 880.0, 1046.5
  ];

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.ctx = new AudioCtxClass();
      
      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.masterGain.gain.value = 0.8;
      this.musicGain.gain.value = 0.5;
      this.sfxGain.gain.value = 0.7;

      this.isInitialized = true;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // Audio might fail in unsupported environments
    }
  }

  public resume() {
    if (!this.isInitialized || !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public ensureContext(): boolean {
    if (!this.isInitialized || !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return Boolean(this.ctx && this.sfxGain);
  }

  public setVolumes(master: number, music: number, sfx: number, musicEnabled: boolean, sfxEnabled: boolean) {
    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(master, now, 0.05);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(musicEnabled ? music * 0.5 : 0, now, 0.05);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(sfxEnabled ? sfx * 0.7 : 0, now, 0.05);
    }
  }

  public setVolume(music: number, sfx: number) {
    this.setVolumes(1.0, music, sfx, true, true);
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public playVictorySnippet() {
    this.setMusicState('victory');
  }

  // --- PROCEDURAL MUSIC SYSTEM ---

  public setMusicState(state: MusicState) {
    if (this.currentMusicState === state) return;
    this.currentMusicState = state;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (state === 'silent') return;

    this.init();
    this.musicStep = 0;

    const interval = state === 'boss' ? 240 : state === 'battle' ? 300 : state === 'victory' ? 360 : 450;
    this.musicTimer = window.setInterval(() => {
      this.tickMusic();
    }, interval);
  }

  private tickMusic() {
    if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
    const state = this.currentMusicState;
    const now = this.ctx.currentTime;
    const scale = (state === 'boss' || state === 'defeat') ? this.DRAMATIC_PENTATONIC : this.PENTATONIC_BASE;

    this.musicStep++;

    // 1. Bass drone / Drum heartbeat
    if (this.musicStep % 4 === 0) {
      if (state === 'battle' || state === 'boss') {
        this.playTaikoDrum(now, state === 'boss' ? 0.35 : 0.25);
      } else if (state === 'menu') {
        // Soft gong / ambient bell
        if (this.musicStep % 16 === 0) {
          this.playTempleBell(scale[1], 0.2);
        }
      }
    }

    // 2. Guzheng / Guqin Harp plucks (Donghua style)
    if (state === 'menu' || state === 'battle' || state === 'boss') {
      const shouldPluck = state === 'boss' ? Math.random() > 0.2 : Math.random() > 0.35;
      if (shouldPluck) {
        const noteIdx = Math.floor(Math.random() * 8) + 5; // mid to high octaves
        const freq = scale[noteIdx] || 440;
        this.playGuzhengPluck(freq, now, 0.18);
      }
    }

    // 3. High Bamboo Flute melody snippets
    if (this.musicStep % 8 === 0 && (state === 'menu' || state === 'battle' || state === 'victory')) {
      const fluteIdx = [7, 9, 10, 12, 14][Math.floor(Math.random() * 5)];
      const freq = scale[fluteIdx] || 587;
      this.playFluteNote(freq, now, 0.22);
    }

    // 4. Boss War Horn / Dark chord pulse
    if (state === 'boss' && this.musicStep % 8 === 0) {
      this.playDarkSpiritualChord(now);
    }

    // 5. Victory celebration arpeggio
    if (state === 'victory' && this.musicStep % 4 === 0) {
      const idx = (this.musicStep / 4) % 5;
      this.playTempleBell(this.PENTATONIC_BASE[7 + idx], 0.25);
    }
  }

  // --- INSTRUMENT SYNTHESIS ---

  /** Plucked Guzheng (String with quick decay and bright harmonics) */
  private playGuzhengPluck(freq: number, startTime: number, volume = 0.2) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, startTime);
    filter.Q.setValueAtTime(3.0, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + 0.6);
  }

  /** Ancient Bamboo Flute (Soft breathy sine with gentle vibrato) */
  private playFluteNote(freq: number, startTime: number, volume = 0.2) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Vibrato
    vibrato.frequency.value = 5.5; // 5.5 Hz vibrato
    vibratoGain.gain.value = freq * 0.015;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.15);
    gain.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.9);

    osc.connect(gain);
    gain.connect(this.musicGain);

    vibrato.start(startTime);
    osc.start(startTime);
    vibrato.stop(startTime + 0.95);
    osc.stop(startTime + 0.95);
  }

  /** Ancient Temple Bell (Rich inharmonic partials, long decay) */
  public playTempleBell(baseFreq = 220, volume = 0.3) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const partials = [1, 2.02, 3.01, 4.25, 5.43];
    const decay = 2.5;

    partials.forEach((p, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * p;

      const pVol = (volume / (idx + 1)) * 0.6;
      gain.gain.setValueAtTime(pVol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + decay / (idx * 0.5 + 1));

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + decay);
    });
  }

  /** Cultivation War Taiko Drum (deep low sub punch) */
  private playTaikoDrum(startTime: number, volume = 0.3) {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, startTime);
    osc.frequency.exponentialRampToValueAtTime(38, startTime + 0.15);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

    osc.connect(gain);
    gain.connect(this.musicGain);

    osc.start(startTime);
    osc.stop(startTime + 0.35);
  }

  /** Dark boss tension chord */
  private playDarkSpiritualChord(startTime: number) {
    if (!this.ctx || !this.musicGain) return;
    const chord = [73.42, 110.0, 130.81]; // D2, A2, C3
    chord.forEach((freq) => {
      if (!this.ctx || !this.musicGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.12, startTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(startTime);
      osc.stop(startTime + 1.3);
    });
  }

  // --- SOUND EFFECTS ---

  /** Sword Qi Slash (high energy whoosh + blade slice) */
  public playSwordQi() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Thunder spear strike */
  public playLightning() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Zap + crackle
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.2);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  /** Ice fan / Frost shatter */
  public playIce() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  /** Wind blade tempest whoosh */
  public playWind() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(650, now + 0.1);
    osc.frequency.linearRampToValueAtTime(200, now + 0.25);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Dragon awakening roar / massive explosion */
  public playDragonRoar() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.7);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.85);
  }

  /** Enemy Defeated / Mist dissipation */
  public playEnemyDefeat() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.14);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** Realm Core warning impact gong */
  public playCoreHit() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.4);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  /** Guardian placement chime */
  public playPlacement() {
    this.playTempleBell(440, 0.25);
  }

  /** Cultivator upgrade awakening chime */
  public playUpgrade() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [330, 440, 550, 660].forEach((f, i) => {
      setTimeout(() => {
        this.playTempleBell(f, 0.2);
      }, i * 60);
    });
  }

  /** Ability cast resonance */
  public playAbilityCast() {
    this.playTempleBell(523.25, 0.35);
  }

  /** Metal Spirit Blade clash */
  public playMetalClash() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  /** Molten Lava blast */
  public playLavaExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.25);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /** Crystal Prism laser resonance */
  public playCrystalResonance() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.linearRampToValueAtTime(2200, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /** Spatial Vortex singularity pull */
  public playVortexSingularity() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(540, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.28);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playVortexPull() {
    this.playVortexSingularity();
  }

  public playFireball() {
    this.playSwordQi();
  }

  /** Sand swirl dust tempest */
  public playSandSwirl() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.2);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}

export const soundEngine = new SoundEngine();
