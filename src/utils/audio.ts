// Web Audio API Sound Utility for Game SFX (Countdown, Win, Loss, Click)
import { audioMaster } from './audioMaster.js';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private activeNodes: Set<{ stop?: () => void; disconnect?: () => void }> = new Set();
  private isTabVisible: boolean = typeof document !== 'undefined' ? !document.hidden : true;

  constructor() {
    audioMaster.registerEngine('soundEngine', {
      stop: () => this.stopAll(),
      getAudioContext: () => this.ctx,
    });

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        if (document.hidden) {
          this.stopAll();
        }
      });
      window.addEventListener('blur', () => {
        this.stopAll();
      });
      window.addEventListener('pagehide', () => {
        this.stopAll();
      });
      window.addEventListener('beforeunload', () => {
        this.stopAll();
      });
    }
  }

  public isSoundAllowed(isMuted: boolean = false): boolean {
    if (!audioMaster.isAudioAllowed(isMuted)) return false;
    if (isMuted) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    if (!this.isTabVisible) return false;
    return true;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.isSoundAllowed()) return null;
    try {
      if (!this.ctx || this.ctx.state === 'closed') {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
          audioMaster.registerContext(this.ctx);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended' && this.isSoundAllowed()) {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public stopAll() {
    try {
      this.activeNodes.forEach((node) => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch {
          // ignore
        }
      });
      this.activeNodes.clear();

      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    } catch {
      // quiet
    }
  }

  // Countdown Beep during final 5, 4, 3, 2, 1 seconds
  public playCountdownBeep(second: number, isMuted: boolean = false) {
    if (!this.isSoundAllowed(isMuted)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Pitch goes higher as countdown approaches 1
      const freq = second === 1 ? 880 : 587.33 + (5 - second) * 60;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      this.activeNodes.add(osc);
      osc.onended = () => {
        this.activeNodes.delete(osc);
      };

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      // Audio autoplay policy catch
    }
  }

  // Winning Fanfare Sound
  public playWinSound(isMuted: boolean = false) {
    if (!this.isSoundAllowed(isMuted)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        this.activeNodes.add(osc);
        osc.onended = () => {
          this.activeNodes.delete(osc);
        };

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    } catch {
      // quiet
    }
  }

  // Loss Sound
  public playLossSound(isMuted: boolean = false) {
    if (!this.isSoundAllowed(isMuted)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const notes = [440, 370, 311.13]; // Descending
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

        gain.gain.setValueAtTime(0.18, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.15 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        this.activeNodes.add(osc);
        osc.onended = () => {
          this.activeNodes.delete(osc);
        };

        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.25);
      });
    } catch {
      // quiet
    }
  }

  // Button Click / Chip Sound
  public playClick(isMuted: boolean = false) {
    if (!this.isSoundAllowed(isMuted)) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      this.activeNodes.add(osc);
      osc.onended = () => {
        this.activeNodes.delete(osc);
      };

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // quiet
    }
  }
}

export const soundEngine = new SoundEngine();
