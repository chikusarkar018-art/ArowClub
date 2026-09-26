// Web Audio API Sound Generator for Plinko
import { audioMaster } from './audioMaster.js';

class PlinkoAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    audioMaster.registerEngine('plinkoAudio', {
      stop: () => this.stopAll(),
      getAudioContext: () => this.ctx,
    });
  }

  public stopAll() {
    try {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } catch {}
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (!audioMaster.isAudioAllowed(this.isMuted)) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        audioMaster.registerContext(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && audioMaster.isAudioAllowed(this.isMuted)) {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  // Peg hit sound (gentle pleasant metallic ping)
  playPegHit(pitchMultiplier = 1) {
    if (this.isMuted || !audioMaster.isAudioAllowed()) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = (700 + Math.random() * 300) * pitchMultiplier;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.065);
    } catch {
      // ignore
    }
  }

  // Ball drop launch sound
  playDropLaunch() {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
    } catch {
      // ignore
    }
  }

  // Land in bucket sound
  playBucketLand(multiplier: number) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;

      if (multiplier >= 5) {
        // High win chime
        const notes = multiplier >= 50 ? [587.33, 739.99, 880.00, 1174.66] : [523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

          gain.gain.setValueAtTime(0.2, this.ctx!.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.25);

          osc.connect(gain);
          gain.connect(this.ctx!.destination);

          osc.start(this.ctx!.currentTime + idx * 0.06);
          osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.28);
        });
      } else {
        // Low/Med chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(multiplier < 1 ? 300 : 500, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(multiplier < 1 ? 220 : 600, this.ctx.currentTime + 0.12);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.16);
      }
    } catch {
      // ignore
    }
  }
}

export const plinkoAudio = new PlinkoAudio();
