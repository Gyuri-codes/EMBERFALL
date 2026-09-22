/**
 * EMBERFALL: GUARDIANS OF THE LAST REALM
 * Procedural Chinese Pentatonic Cultivation Web Audio Engine
 * Supports Area-Specific Intense Battle Soundtracks & Bulletproof Mute System
 */

export type MusicState = 'menu' | 'battle' | 'boss' | 'victory' | 'defeat' | 'silent';

export interface AreaMusicProfile {
  mood: string;
  name: string;
  bpm: number;
  scale: number[];
  bassNotes: number[];
  fluteNotes: number[];
  percussionStyle: 'fire' | 'bamboo' | 'frost' | 'thunder' | 'serpent' | 'abyss' | 'sands' | 'crystal' | 'chaos';
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  // Active track gain for smooth transitions and zero simultaneous music overlap
  private activeTrackGain: GainNode | null = null;
  private transitionTimer: number | null = null;

  // Volume & Mute State
  private isMuted = false;
  private masterVolume = 0.8;
  private musicVolume = 0.7;
  private sfxVolume = 0.8;
  private musicEnabled = true;
  private sfxEnabled = true;

  // SFX Throttle/Debounce to prevent audio crowding and distortion
  private lastSfxTimes: Record<string, number> = {};

  // Current Music State
  private currentMusicState: MusicState = 'silent';
  private currentMood: string = 'menu';
  private currentRealmId: string = '';

  // Precise Lookahead Scheduler State
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private readonly LOOKAHEAD_MS = 50; // Schedule lookahead check interval
  private readonly SCHEDULE_AHEAD_TIME = 0.16; // Lookahead window in seconds

  // Music Scales in Hz (Cultivation Gong, Shang, Jiao, Zhi, Yu modal systems)
  private readonly SCALES: Record<string, AreaMusicProfile> = {
    // 1. Fire / Volcanic (Emberfall Valley, Crimson Lotus Peak, Molten Iron Foundry)
    fire: {
      mood: 'fire',
      name: 'Blazing Caldera',
      bpm: 132,
      scale: [196.0, 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99], // G pentatonic
      bassNotes: [98.0, 146.83, 196.0, 146.83], // G2 - D3
      fluteNotes: [392.0, 440.0, 523.25, 587.33, 659.25, 783.99],
      percussionStyle: 'fire'
    },
    // 2. Bamboo / Misty Forest (Moonlit Bamboo Sanctuary, Whispering Pine Pass)
    bamboo: {
      mood: 'bamboo',
      name: 'Emerald Whispers',
      bpm: 118,
      scale: [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 880.0], // A minor pentatonic
      bassNotes: [110.0, 164.81, 110.0, 146.83], // A2 - E3
      fluteNotes: [440.0, 523.25, 587.33, 659.25, 880.0, 1046.5],
      percussionStyle: 'bamboo'
    },
    // 3. Frost / Glacial (Frozen Heaven, Frozen Time Glacier)
    frost: {
      mood: 'frost',
      name: 'Glacial Spires',
      bpm: 112,
      scale: [146.83, 220.0, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 739.99, 880.0], // D Shang pentatonic
      bassNotes: [73.42, 110.0, 146.83, 110.0], // D2 - A2
      fluteNotes: [587.33, 659.25, 739.99, 880.0, 1174.66],
      percussionStyle: 'frost'
    },
    // 4. Thunder / Storm (Thundercloud Peaks, Nine Heavens Tribulation)
    thunder: {
      mood: 'thunder',
      name: 'Tribulation Lightning',
      bpm: 144,
      scale: [130.81, 196.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99], // C Gong pentatonic
      bassNotes: [65.41, 98.0, 130.81, 98.0], // C2 - G2
      fluteNotes: [523.25, 587.33, 659.25, 783.99, 1046.5],
      percussionStyle: 'thunder'
    },
    // 5. Serpent / Dragon (Jade Serpent River, Nether Dragon Lair)
    serpent: {
      mood: 'serpent',
      name: 'Ancient Wyrm',
      bpm: 124,
      scale: [146.83, 155.56, 196.0, 220.0, 233.08, 293.66, 392.0, 440.0, 466.16, 587.33], // D Draconian Phrygian
      bassNotes: [73.42, 110.0, 77.78, 110.0], // D2 - A2 - Eb2
      fluteNotes: [293.66, 392.0, 440.0, 466.16, 587.33],
      percussionStyle: 'serpent'
    },
    // 6. Abyss / Necro (Abyssal Realm, Blighted Bone Marsh)
    abyss: {
      mood: 'abyss',
      name: 'Nether Ruin',
      bpm: 110,
      scale: [130.81, 138.59, 174.61, 196.0, 207.65, 261.63, 277.18, 349.23, 392.0, 415.3], // C Dark Locrian
      bassNotes: [65.41, 98.0, 69.3, 98.0], // C2 - G2 - C#2
      fluteNotes: [261.63, 277.18, 349.23, 392.0, 523.25],
      percussionStyle: 'abyss'
    },
    // 7. Sands / Desert (Golden Sands Desert)
    sands: {
      mood: 'sands',
      name: 'Golden Mirage',
      bpm: 128,
      scale: [146.83, 220.0, 293.66, 311.13, 369.99, 392.0, 440.0, 466.16, 587.33, 622.25, 739.99], // D Hijaz
      bassNotes: [73.42, 110.0, 146.83, 110.0], // D2 - A2
      fluteNotes: [369.99, 440.0, 466.16, 587.33, 739.99],
      percussionStyle: 'sands'
    },
    // 8. Crystal / Celestial (Astral Observatory, Spirit Crystal Caverns, Celestial Sovereign Throne)
    crystal: {
      mood: 'crystal',
      name: 'Celestial Sovereign',
      bpm: 126,
      scale: [174.61, 220.0, 261.63, 329.63, 392.0, 440.0, 523.25, 659.25, 783.99, 880.0, 1046.5], // F Celestial Lydian
      bassNotes: [87.31, 130.81, 174.61, 130.81], // F2 - C3
      fluteNotes: [523.25, 659.25, 783.99, 880.0, 1046.5, 1318.5],
      percussionStyle: 'crystal'
    },
    // 9. Chaos / Reality Core (Vortex Abyss Chasm, Primordial Chaos Rift, Last Realm Core)
    chaos: {
      mood: 'chaos',
      name: 'Primordial Cataclysm',
      bpm: 148,
      scale: [146.83, 174.61, 196.0, 207.65, 220.0, 261.63, 293.66, 349.23, 392.0, 415.3, 440.0, 523.25], // D Blues/Chromatic
      bassNotes: [73.42, 110.0, 103.83, 110.0], // D2 - A2 - G#2
      fluteNotes: [392.0, 415.3, 440.0, 523.25, 587.33, 698.46],
      percussionStyle: 'chaos'
    },
    // 10. Menu / Serene Pavilion Theme
    menu: {
      mood: 'menu',
      name: 'Cloud Pavilion',
      bpm: 96,
      scale: [146.83, 164.81, 184.99, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0, 493.88, 587.33, 659.25],
      bassNotes: [73.42, 110.0, 146.83, 110.0],
      fluteNotes: [440.0, 493.88, 587.33, 659.25, 880.0],
      percussionStyle: 'bamboo'
    }
  };

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended' && !this.isMuted) {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      this.ctx = new AudioCtxClass();

      this.masterGain = this.ctx.createGain();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Configure musical dynamics compressor to prevent clipping and ear fatigue
      this.compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(25, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(4.0, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.musicGain.connect(this.compressor);
      this.sfxGain.connect(this.compressor);
      this.compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      // CRITICAL: Respect current mute state at initialization & balance music vs SFX
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
      this.musicGain.gain.value = this.musicEnabled ? this.musicVolume * 0.35 : 0;
      this.sfxGain.gain.value = this.sfxEnabled ? this.sfxVolume * 0.75 : 0;

      this.isInitialized = true;
      if (this.ctx.state === 'suspended' && !this.isMuted) {
        this.ctx.resume().catch(() => {});
      }

      // Handle visibility changes smoothly to conserve mobile battery
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            if (this.ctx && this.ctx.state === 'running') {
              this.ctx.suspend().catch(() => {});
            }
          } else {
            if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
              this.ctx.resume().catch(() => {});
            }
          }
        });
      }
    } catch {
      // Audio might fail in restricted sandbox environments
    }
  }

  public resume() {
    if (!this.isInitialized || !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
  }

  public ensureContext(): boolean {
    if (!this.isInitialized || !this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended' && !this.isMuted) {
      this.ctx.resume().catch(() => {});
    }
    return Boolean(this.ctx && this.sfxGain && !this.isMuted);
  }

  // --- VOLUME & MUTE CONTROL ---

  public isAudioMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;

    if (!this.isInitialized || !this.ctx) {
      this.init();
    }

    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);

    if (muted) {
      // Immediate silence - zero bleed, prevents lingering sounds
      this.masterGain.gain.setValueAtTime(0, now);
      // Stop scheduling new music notes
      this.stopMusicScheduler();
    } else {
      // Unmute: Resume context and smoothly restore volume
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.masterGain.gain.setValueAtTime(0, now);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, now + 0.05);

      // Automatically restore active music if a state was active
      if (this.currentMusicState !== 'silent') {
        this.startMusicScheduler();
      }
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolumes(master: number, music: number, sfx: number, musicEnabled: boolean, sfxEnabled: boolean) {
    this.masterVolume = master;
    this.musicVolume = music;
    this.sfxVolume = sfx;
    this.musicEnabled = musicEnabled;
    this.sfxEnabled = sfxEnabled;

    if (!this.isInitialized || !this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : master, now, 0.03);
    }
    if (this.musicGain) {
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(musicEnabled ? music * 0.35 : 0, now, 0.03);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.setTargetAtTime(sfxEnabled ? sfx * 0.75 : 0, now, 0.03);
    }
  }

  public setVolume(music: number, sfx: number) {
    this.setVolumes(this.masterVolume, music, sfx, this.musicEnabled, this.sfxEnabled);
  }

  // --- AREA BACKGROUND MUSIC ENGINE ---

  /**
   * Smoothly fade out all background music over a given duration.
   * Stops the scheduler and ensures complete silence without dual playback.
   */
  public fadeOutMusic(duration = 0.15) {
    this.stopMusicScheduler();

    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    this.currentMusicState = 'silent';

    if (this.activeTrackGain && this.ctx) {
      const oldGain = this.activeTrackGain;
      this.activeTrackGain = null;
      const now = this.ctx.currentTime;
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
        oldGain.gain.linearRampToValueAtTime(0.00001, now + duration);
      } catch {
        // Node might already be inactive
      }
      setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch {
          // Stale node disconnect safety
        }
      }, Math.round((duration + 0.05) * 1000));
    }
  }

  /**
   * Play or transition to area-specific background music.
   * Smoothly crossfades and ensures only ONE soundtrack plays at a time.
   */
  public playAreaMusic(mood = 'fire', realmId = '', state: MusicState = 'battle') {
    this.setMusicState(state, mood, realmId);
  }

  public setMusicState(state: MusicState, mood = 'menu', realmId = '') {
    // If exact same track is already active, do not interrupt or duplicate
    if (
      this.currentMusicState === state &&
      this.currentMood === mood &&
      this.currentRealmId === realmId &&
      this.activeTrackGain !== null &&
      this.schedulerTimer !== null &&
      this.transitionTimer === null
    ) {
      return;
    }

    if (this.transitionTimer !== null) {
      window.clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    if (state === 'silent') {
      this.fadeOutMusic(0.15);
      return;
    }

    this.init();
    if (!this.ctx || !this.musicGain) return;

    // Stop current scheduler immediately so no further notes of the previous track are scheduled
    this.stopMusicScheduler();

    this.currentMusicState = state;
    this.currentMood = mood;
    this.currentRealmId = realmId;

    const fadeDuration = 0.12;

    if (this.activeTrackGain) {
      // Smoothly fade out previous track, then start the new track AFTER it reaches zero
      const oldGain = this.activeTrackGain;
      this.activeTrackGain = null;
      const now = this.ctx.currentTime;
      try {
        oldGain.gain.cancelScheduledValues(now);
        oldGain.gain.setValueAtTime(Math.max(0.0001, oldGain.gain.value), now);
        oldGain.gain.linearRampToValueAtTime(0.00001, now + fadeDuration);
      } catch {
        // Stale node
      }

      setTimeout(() => {
        try {
          oldGain.disconnect();
        } catch {
          // Safely disconnected
        }
      }, Math.round((fadeDuration + 0.03) * 1000));

      // Schedule the new track to fade in right after the old track has concluded
      this.transitionTimer = window.setTimeout(() => {
        this.transitionTimer = null;
        if (this.currentMusicState === 'silent' || this.isMuted) return;
        this.startTrackNow();
      }, Math.round((fadeDuration + 0.02) * 1000));
    } else {
      // No active track playing, start immediately
      this.startTrackNow();
    }
  }

  private startTrackNow() {
    if (!this.ctx || !this.musicGain || this.currentMusicState === 'silent') return;

    if (this.activeTrackGain) {
      try {
        this.activeTrackGain.disconnect();
      } catch {
        // Disconnect safety
      }
      this.activeTrackGain = null;
    }

    const newTrackGain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    newTrackGain.gain.setValueAtTime(0.0001, now);
    newTrackGain.gain.linearRampToValueAtTime(1.0, now + 0.18);
    newTrackGain.connect(this.musicGain);

    this.activeTrackGain = newTrackGain;
    this.currentStep = 0;
    this.nextStepTime = this.ctx.currentTime + 0.04;

    if (!this.isMuted) {
      this.startMusicScheduler();
    }
  }

  private startMusicScheduler() {
    this.stopMusicScheduler();

    // Start lookahead timer (50ms interval)
    this.schedulerTimer = window.setInterval(() => {
      this.scheduleNextNotes();
    }, this.LOOKAHEAD_MS);
  }

  private stopMusicScheduler() {
    if (this.schedulerTimer !== null) {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  private getProfileForCurrentArea(): AreaMusicProfile {
    if (this.currentMusicState === 'menu') {
      return this.SCALES.menu;
    }
    const profile = this.SCALES[this.currentMood] || this.SCALES.fire;
    return profile;
  }

  private scheduleNextNotes() {
    if (!this.ctx || !this.activeTrackGain || this.isMuted || this.ctx.state !== 'running') {
      return;
    }

    const profile = this.getProfileForCurrentArea();
    // In boss state, speed up tempo by 18% for intense battle urgency
    const effectiveBpm = this.currentMusicState === 'boss' ? profile.bpm * 1.18 : profile.bpm;
    const stepDuration = 60 / (effectiveBpm * 4); // 16th note steps

    // Lookahead loop: Schedule all note events up to (currentTime + SCHEDULE_AHEAD_TIME)
    while (this.nextStepTime < this.ctx.currentTime + this.SCHEDULE_AHEAD_TIME) {
      this.scheduleStep(this.currentStep, this.nextStepTime, profile, stepDuration);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % 32; // 32-step musical cycle (2 bars)
    }
  }

  /**
   * Schedule layered musical events for a single 16th-note step.
   * Completely procedural, zero network lag, lightweight on mobile.
   */
  private scheduleStep(step: number, time: number, profile: AreaMusicProfile, stepDuration: number) {
    if (!this.ctx || !this.activeTrackGain) return;
    const dest = this.activeTrackGain;
    const state = this.currentMusicState;
    const isBoss = state === 'boss';

    // 1. DRIVING PERCUSSION / WAR DRUMS (Battle Heartbeat)
    if (state === 'battle' || isBoss) {
      switch (profile.percussionStyle) {
        case 'fire':
          // Galloping martial war rhythm
          if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
            this.synthTaikoDrum(time, dest, step % 8 === 0 ? 0.32 : 0.22, 115);
          }
          if (step % 4 === 2) {
            this.synthClapper(time, dest, 0.14);
          }
          // Foundry anvil strike
          if (this.currentRealmId === 'molten_iron_foundry' && (step === 0 || step === 16)) {
            this.synthMetalAnvil(time, dest, 0.2);
          }
          break;

        case 'thunder':
          // High-speed double-time tribulation beat
          if (step % 4 === 0 || step % 8 === 6) {
            this.synthTaikoDrum(time, dest, step % 8 === 0 ? 0.35 : 0.24, 130);
          }
          if (step % 4 === 2) {
            this.synthClapper(time, dest, 0.16);
          }
          if (step === 0 || step === 16) {
            this.synthThunderBoom(time, dest, 0.28);
          }
          break;

        case 'bamboo':
          // Stealthy syncopated wooden percussion
          if (step % 8 === 0 || step % 8 === 5) {
            this.synthTaikoDrum(time, dest, 0.2, 95);
          }
          if (step % 8 === 2 || step % 8 === 6) {
            this.synthClapper(time, dest, 0.12);
          }
          if (step === 0 && Math.random() > 0.4) {
            this.synthGong(time, dest, 180, 0.18);
          }
          break;

        case 'frost':
          // Crisp spaced footsteps with icy crystal chimes
          if (step % 8 === 0 || step % 16 === 10) {
            this.synthTaikoDrum(time, dest, 0.22, 85);
          }
          if (step % 4 === 2) {
            this.synthIcyRim(time, dest, 0.12);
          }
          break;

        case 'serpent':
          // Hypnotic undulating dragon rhythm
          if (step % 8 === 0 || step % 8 === 3 || step % 8 === 5) {
            this.synthTaikoDrum(time, dest, 0.25, 90);
          }
          if (step === 0 || step === 16) {
            this.synthGong(time, dest, 110, 0.26);
          }
          break;

        case 'abyss':
          // Doom march cadence
          if (step % 8 === 0 || step % 8 === 4) {
            this.synthTaikoDrum(time, dest, 0.3, 75);
          }
          if (step % 8 === 2 || step % 8 === 6) {
            this.synthBoneClack(time, dest, 0.14);
          }
          break;

        case 'sands':
          // Caravan gallop with desert doumbek roll
          if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
            this.synthTaikoDrum(time, dest, 0.24, 110);
          }
          if (step % 4 === 1 || step % 4 === 3) {
            this.synthSandShaker(time, dest, 0.08);
          }
          break;

        case 'crystal':
          // Imperial royal ceremonial march
          if (step % 8 === 0 || step % 8 === 4) {
            this.synthTaikoDrum(time, dest, 0.26, 100);
          }
          if (step === 0 || step === 16) {
            this.synthImperialChime(time, dest, 0.22);
          }
          break;

        case 'chaos':
          // Apocalyptic high-tempo war storm
          if (step % 4 === 0 || step % 8 === 2 || step % 8 === 7) {
            this.synthTaikoDrum(time, dest, 0.33, 125);
          }
          if (step % 4 === 2) {
            this.synthClapper(time, dest, 0.18);
          }
          if (step % 16 === 0) {
            this.synthSingularitySweep(time, dest, 0.25);
          }
          break;
      }

      // Boss extra war drum urgency
      if (isBoss && step % 4 === 2) {
        this.synthTaikoDrum(time, dest, 0.22, 140);
      }
    } else if (state === 'menu') {
      // Calm ambient temple bell on phrase boundaries
      if (step === 0) {
        this.synthGong(time, dest, 220, 0.15);
      }
    }

    // 2. BASS OSTINATO / ROOT DRONE
    if (step % 4 === 0) {
      const bassIdx = Math.floor(step / 8) % profile.bassNotes.length;
      const bassFreq = profile.bassNotes[bassIdx] || 110;
      this.synthSubBass(time, dest, bassFreq, stepDuration * 3.5, state === 'menu' ? 0.12 : isBoss ? 0.28 : 0.2);
    }

    // 3. GUZHENG / HARP MARTIAL ARPEGGIOS
    if (state === 'battle' || isBoss || state === 'menu') {
      const shouldPlayPluck = isBoss
        ? step % 2 === 0
        : state === 'battle'
        ? step % 2 === 0 || (step % 4 === 3 && Math.random() > 0.5)
        : step % 4 === 0 && Math.random() > 0.4;

      if (shouldPlayPluck) {
        const noteIdx = (step * 3 + Math.floor(step / 8)) % profile.scale.length;
        const freq = profile.scale[noteIdx] || 440;
        this.synthGuzhengPluck(time, dest, freq, state === 'menu' ? 0.14 : isBoss ? 0.22 : 0.18);
      }
    }

    // 4. BAMBOO DIZI FLUTE / SOARING WAR THEME
    if ((step === 0 || step === 8 || step === 16 || step === 24) && (state === 'battle' || state === 'menu' || state === 'victory')) {
      const fluteIdx = Math.floor(Math.random() * profile.fluteNotes.length);
      const freq = profile.fluteNotes[fluteIdx] || 587.33;
      this.synthDiziFlute(time, dest, freq, stepDuration * 7, state === 'menu' ? 0.14 : 0.2);
    }

    // 5. BOSS WAR HORN & DISCORDANT BRASS STABS
    if (isBoss && (step === 0 || step === 16)) {
      this.synthBossWarHorn(time, dest, profile.bassNotes[0] || 73.42, 0.24);
    }

    // 6. VICTORY TRIUMPHANT ARPEGGIO
    if (state === 'victory' && step % 4 === 0) {
      const idx = (step / 4) % profile.scale.length;
      this.synthCrystalBell(time, dest, profile.scale[idx] * 1.5, 0.22);
    }
  }

  // --- SYNTHESIZED INSTRUMENTS (LIGHTWEIGHT WEB AUDIO) ---

  /** Deep Sub Bass */
  private synthSubBass(time: number, dest: GainNode, freq: number, duration: number, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, time);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  /** Ancient War Taiko Drum */
  private synthTaikoDrum(time: number, dest: GainNode, volume = 0.28, pitch = 110) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, time);
    osc.frequency.exponentialRampToValueAtTime(36, time + 0.18);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  /** Bamboo Clapper (Paiban) */
  private synthClapper(time: number, dest: GainNode, volume = 0.14) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(220, time + 0.05);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, time);
    filter.Q.setValueAtTime(4.0, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.07);
  }

  /** Guzheng / Pipa Plucked Strings */
  private synthGuzhengPluck(time: number, dest: GainNode, freq: number, volume = 0.18) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 3.2, time);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.8, time + 0.35);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  /** Ancient Bamboo Dizi Flute with Breath Vibrato */
  private synthDiziFlute(time: number, dest: GainNode, freq: number, duration: number, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    vibrato.frequency.setValueAtTime(5.5, time);
    vibratoGain.gain.setValueAtTime(freq * 0.018, time);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.08);
    gain.gain.linearRampToValueAtTime(volume * 0.75, time + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(dest);

    vibrato.start(time);
    osc.start(time);
    vibrato.stop(time + duration + 0.05);
    osc.stop(time + duration + 0.05);
  }

  /** Ancient Temple Gong */
  private synthGong(time: number, dest: GainNode, baseFreq = 160, volume = 0.25) {
    if (!this.ctx) return;
    const partials = [1, 1.41, 1.82, 2.37];
    partials.forEach((p, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * p, time);

      const pVol = (volume / (idx + 1)) * 0.7;
      gain.gain.setValueAtTime(pVol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.8);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(time);
      osc.stop(time + 1.85);
    });
  }

  /** Boss War Horn */
  private synthBossWarHorn(time: number, dest: GainNode, freq: number, volume = 0.22) {
    if (!this.ctx) return;
    [freq, freq * 1.5, freq * 2].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380 + i * 150, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume / (i + 1), time + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.9);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(time);
      osc.stop(time + 0.95);
    });
  }

  /** Crystal Bell */
  private synthCrystalBell(time: number, dest: GainNode, freq: number, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.65);
  }

  /** Area Special: Metal Anvil */
  private synthMetalAnvil(time: number, dest: GainNode, volume = 0.2) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, time);
    osc.frequency.exponentialRampToValueAtTime(400, time + 0.15);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.22);
  }

  /** Area Special: Thunder Boom */
  private synthThunderBoom(time: number, dest: GainNode, volume = 0.25) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(90, time);
    osc.frequency.exponentialRampToValueAtTime(25, time + 0.45);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.55);
  }

  /** Area Special: Icy Rim */
  private synthIcyRim(time: number, dest: GainNode, volume = 0.12) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, time);
    osc.frequency.exponentialRampToValueAtTime(900, time + 0.08);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  /** Area Special: Bone Clack */
  private synthBoneClack(time: number, dest: GainNode, volume = 0.14) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(540, time);
    osc.frequency.exponentialRampToValueAtTime(120, time + 0.06);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.08);
  }

  /** Area Special: Sand Shaker */
  private synthSandShaker(time: number, dest: GainNode, volume = 0.08) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2400, time);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  /** Area Special: Imperial Chime */
  private synthImperialChime(time: number, dest: GainNode, volume = 0.22) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, time); // C6

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.85);
  }

  /** Area Special: Singularity Sweep */
  private synthSingularitySweep(time: number, dest: GainNode, volume = 0.25) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.linearRampToValueAtTime(320, time + 0.15);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.4);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.5);
  }

  // --- SOUND EFFECTS (GUARDED BY MUTE) ---

  public playTempleBell(baseFreq = 220, volume = 0.3) {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
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

  public playVictorySnippet() {
    if (this.isMuted) return;
    this.setMusicState('victory', this.currentMood, this.currentRealmId);
  }

  private canPlaySfx(type: string, minIntervalMs = 28): boolean {
    const now = performance.now();
    if (this.lastSfxTimes[type] && now - this.lastSfxTimes[type] < minIntervalMs) {
      return false;
    }
    this.lastSfxTimes[type] = now;
    return true;
  }

  public playSwordQi() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('sword_qi', 25)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.11);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playLightning() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('lightning', 28)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.18);

    gain.gain.setValueAtTime(0.19, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playIce() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('ice', 25)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1700, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.16);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Powerful crystalline frost shatter sound for Frozen Empress maximum upgrade spread attack.
   */
  public playIceShatter() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('ice_shatter', 35)) return;
    const now = this.ctx.currentTime;

    // Layer 1: High-resonance diamond chime
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2200, now);
    osc1.frequency.exponentialRampToValueAtTime(1100, now + 0.14);
    gain1.gain.setValueAtTime(0.14, now);
    gain1.gain.linearRampToValueAtTime(0.0001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Layer 2: Glacial fracture crunch
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1400, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.18);
    gain2.gain.setValueAtTime(0.12, now);
    gain2.gain.linearRampToValueAtTime(0.0001, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(now);
    osc2.stop(now + 0.22);
  }

  public playWind() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('wind', 25)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.09);
    osc.frequency.linearRampToValueAtTime(200, now + 0.22);

    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playDragonRoar() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('dragon_roar', 300)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(220, now + 0.2);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.7);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  public playEnemyDefeat() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('defeat', 30)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playCoreHit() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('core_hit', 120)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.35);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playPlacement() {
    this.playTempleBell(440, 0.22);
  }

  public playUpgrade() {
    if (this.isMuted || !this.ctx || !this.sfxGain) return;
    [330, 440, 550, 660].forEach((f, i) => {
      setTimeout(() => {
        if (!this.isMuted) {
          this.playTempleBell(f, 0.18);
        }
      }, i * 60);
    });
  }

  public playAbilityCast() {
    this.playTempleBell(523.25, 0.28);
  }

  public playMetalClash() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('metal', 25)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1150, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.11);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playLavaExplosion() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('lava', 30)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  public playCrystalResonance() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('crystal', 25)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, now);
    osc.frequency.linearRampToValueAtTime(2200, now + 0.14);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playVortexSingularity() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('vortex', 30)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(540, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.24);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playVortexPull() {
    this.playVortexSingularity();
  }

  public playFireball() {
    this.playSwordQi();
  }

  public playSandSwirl() {
    if (this.isMuted || !this.ctx || !this.sfxGain || !this.canPlaySfx('sand', 25)) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.linearRampToValueAtTime(260, now + 0.18);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

export const soundEngine = new SoundEngine();
