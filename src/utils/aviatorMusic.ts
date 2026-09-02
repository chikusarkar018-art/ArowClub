// High-Fidelity Chill Atmospheric Aviator & Casino Soundscape Engine (Web Audio API)
// Exact 104 BPM Downtempo Electronic Lounge & Sub-Bass Groove matching the official uploaded soundtrack
import { audioMaster } from './audioMaster.js';

class AviatorMusicEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;
  private volume: number = 0.55;
  private tempo: number = 104; // Authentic 104 BPM chill groove
  private timerId: number | null = null;
  private currentStep: number = 0;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private hasUserInteracted: boolean = false;

  // 32-step (2-bar) Chill Atmospheric Chord Progression: Fmaj7 -> Gsus -> Am7 -> Em7
  private chordTones: number[][] = [
    // Step 0 - 7: Fmaj7 (F3, A3, C4, E4)
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],
    [174.61, 220.00, 261.63, 329.63],

    // Step 8 - 15: G (G3, B3, D4, G4)
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],
    [196.00, 246.94, 293.66, 392.00],

    // Step 16 - 23: Am7 (A3, C4, E4, G4)
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],
    [220.00, 261.63, 329.63, 392.00],

    // Step 24 - 31: Em7 (E3, G3, B3, D4)
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
    [164.81, 196.00, 246.94, 293.66],
  ];

  // Deep Warm Sub Bassline (Hz): F1, G1, A1, E1
  private bassNotes: (number | null)[] = [
    87.31, null, 87.31, null,  87.31, null, null, 87.31, // F1
    98.00, null, 98.00, null,  98.00, null, null, 98.00, // G1
    110.00, null, 110.00, null, 110.00, null, null, 110.00, // A1
    82.41, null, 82.41, null,  82.41, null, 98.00, 110.00 // E1 -> G1 -> A1
  ];

  // Ambient Pluck Melodic Accents
  private melodyPlucks: (number | null)[] = [
    523.25, null, null, 659.25, null, null, 523.25, null, // C5, E5, C5
    587.33, null, null, 783.99, null, null, 493.88, null, // D5, G5, B4
    659.25, null, null, 880.00, null, 783.99, null, 659.25, // E5, A5, G5, E5
    493.88, null, null, 587.33, null, null, 440.00, null  // B4, D5, A4
  ];

  constructor() {
    audioMaster.registerEngine('aviatorMusic', {
      stop: () => this.stop(),
      getAudioContext: () => this.ctx,
    });

    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.hasUserInteracted = true;
        if (this.ctx && this.ctx.state === 'suspended' && audioMaster.isAudioAllowed()) {
          this.ctx.resume().catch(() => {});
        }
        if (this.isPlaying && !this.isMuted && audioMaster.isAudioAllowed()) {
          this.play();
        }
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else if (this.isPlaying && !this.isMuted && audioMaster.isAudioAllowed()) {
          this.resume();
        }
      });
      window.addEventListener('blur', () => {
        this.pause();
      });
      window.addEventListener('pagehide', () => {
        this.stop();
      });
      window.addEventListener('beforeunload', () => {
        this.stop();
      });
    }
  }

  public initCtx() {
    if (typeof window === 'undefined') return;
    if (!audioMaster.isAudioAllowed()) return;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          audioMaster.registerContext(this.ctx);

          // Dynamics Compressor for smooth studio polish
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(4, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.2, this.ctx.currentTime);

          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.ctx.currentTime);

          this.compressor.connect(this.masterGain);
          this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // AudioContext autoplay restriction / blocked
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setValueAtTime(muted ? 0 : this.volume, this.ctx.currentTime);
      }
    } catch {}
    if (muted) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      if (this.masterGain && this.ctx && !this.isMuted) {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      }
    } catch {}
  }

  // Soft Warm Chill Kick
  private playKick(time: number) {
    if (!this.ctx || !this.compressor) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.20);

      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(time);
      osc.stop(time + 0.26);
    } catch {}
  }

  // Smooth Crisp Rimshot / Snare
  private playRimshot(time: number) {
    if (!this.ctx || !this.compressor) return;
    try {
      const dur = 0.12;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, time);
      filter.Q.setValueAtTime(2.0, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);

      noise.start(time);
      noise.stop(time + dur);

      // Wood rim tone
      const osc = this.ctx.createOscillator();
      const tonGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, time);
      osc.frequency.exponentialRampToValueAtTime(180, time + 0.06);

      tonGain.gain.setValueAtTime(0.35, time);
      tonGain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(tonGain);
      tonGain.connect(this.compressor);

      osc.start(time);
      osc.stop(time + 0.08);
    } catch {}
  }

  // Shaker / Hi-Hat
  private playHiHat(time: number, isOpen: boolean) {
    if (!this.ctx || !this.compressor) return;
    try {
      const dur = isOpen ? 0.14 : 0.05;
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(isOpen ? 0.14 : 0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);

      noise.start(time);
      noise.stop(time + dur);
    } catch {}
  }

  // Lush Rhodes Polyphonic Chords
  private playChordVoice(time: number, frequencies: number[]) {
    if (!this.ctx || !this.compressor) return;
    try {
      frequencies.forEach((freq) => {
        if (!this.ctx || !this.compressor) return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);
        filter.frequency.exponentialRampToValueAtTime(600, time + 0.7);

        gain.gain.setValueAtTime(0.09, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.85);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.compressor);

        osc.start(time);
        osc.stop(time + 0.9);
      });
    } catch {}
  }

  // Warm Sub-bass
  private playBass(time: number, freq: number) {
    if (!this.ctx || !this.compressor) return;
    try {
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      sub.type = 'triangle';
      sub.frequency.setValueAtTime(freq * 0.5, time);

      gain.gain.setValueAtTime(0.38, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.32);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(this.compressor);

      osc.start(time);
      sub.start(time);
      osc.stop(time + 0.35);
      sub.stop(time + 0.35);
    } catch {}
  }

  // Melodic Pluck
  private playPluck(time: number, freq: number) {
    if (!this.ctx || !this.compressor) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.compressor);

      osc.start(time);
      osc.stop(time + 0.42);
    } catch {}
  }

  private tick = () => {
    try {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;

      const now = this.ctx.currentTime;
      const step = this.currentStep % 32;

      // 1. Kick on beats 0, 8, 16, 24 + syncopated pickup on 6, 22
      if (step === 0 || step === 8 || step === 16 || step === 24 || step === 6 || step === 22) {
        this.playKick(now);
      }

      // 2. Rimshot / Snare on beats 4, 12, 20, 28
      if (step === 4 || step === 12 || step === 20 || step === 28) {
        this.playRimshot(now);
      }

      // 3. Shaker / Hi-Hat on 16th notes
      if (step % 2 === 1) {
        const isOpen = step % 8 === 6;
        this.playHiHat(now, isOpen);
      }

      // 4. Pad Chords on downbeats (every 4 steps)
      if (step % 4 === 0) {
        const chord = this.chordTones[step];
        if (chord) {
          this.playChordVoice(now, chord);
        }
      }

      // 5. Deep Sub Bassline
      const bass = this.bassNotes[step];
      if (bass) {
        this.playBass(now, bass);
      }

      // 6. Ambient Melodic Plucks
      const pluck = this.melodyPlucks[step];
      if (pluck) {
        this.playPluck(now, pluck);
      }

      this.currentStep = (this.currentStep + 1) % 32;

      // 104 BPM: 16th note interval = (60 / 104 / 4) * 1000 ms
      const stepDurationMs = (60 / this.tempo / 4) * 1000;
      this.timerId = window.setTimeout(this.tick, stepDurationMs);
    } catch {
      this.pause();
    }
  };

  public play() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.isPlaying && this.ctx) {
        this.isPlaying = true;
        this.currentStep = 0;
        this.tick();
      }
    } catch {
      this.isPlaying = false;
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.isPlaying && !this.isMuted) {
      this.play();
    }
  }

  public pause() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.isPlaying = false;
  }

  public stop() {
    this.pause();
    this.currentStep = 0;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && !this.isMuted;
  }
}

export const aviatorMusic = new AviatorMusicEngine();
