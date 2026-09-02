// Centralized Audio Master Manager for ArowClub
// Automatically mutes and stops all audio when:
// 1. User changes browser tab (document.hidden)
// 2. Window is minimized or loses focus (blur)
// 3. Page is unloading or hidden (pagehide, beforeunload)
// 4. User navigates away from any game view or closes game modal

type AudioEngineRegistration = {
  id: string;
  stop: () => void;
  getAudioContext?: () => AudioContext | null;
};

class AudioMasterManager {
  private registeredEngines: Map<string, AudioEngineRegistration> = new Map();
  private registeredContexts: Set<AudioContext> = new Set();
  private isTabVisible: boolean = typeof document !== 'undefined' ? !document.hidden : true;
  private isWindowFocused: boolean = typeof document !== 'undefined' ? document.hasFocus() : true;
  private isGloballyMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // 1. Tab visibility changes (switching tabs or minimizing browser)
      document.addEventListener('visibilitychange', () => {
        this.isTabVisible = !document.hidden;
        if (document.hidden) {
          this.stopAllGameSounds();
        }
      });

      // 2. Window focus/blur
      window.addEventListener('blur', () => {
        this.isWindowFocused = false;
        this.stopAllGameSounds();
      });

      window.addEventListener('focus', () => {
        this.isWindowFocused = true;
      });

      // 3. Page unload & hide
      window.addEventListener('pagehide', () => {
        this.stopAllGameSounds();
      });

      window.addEventListener('beforeunload', () => {
        this.stopAllGameSounds();
      });
    }
  }

  public registerEngine(id: string, engine: { stop: () => void; getAudioContext?: () => AudioContext | null }) {
    this.registeredEngines.set(id, { id, ...engine });
  }

  public registerContext(ctx: AudioContext) {
    this.registeredContexts.add(ctx);
  }

  public unregisterEngine(id: string) {
    this.registeredEngines.delete(id);
  }

  public isAudioAllowed(isComponentMuted: boolean = false): boolean {
    if (this.isGloballyMuted || isComponentMuted) return false;
    if (typeof document !== 'undefined' && document.hidden) return false;
    if (!this.isTabVisible) return false;
    return true;
  }

  public setGlobalMute(muted: boolean) {
    this.isGloballyMuted = muted;
    if (muted) {
      this.stopAllGameSounds();
    }
  }

  public isMuted(): boolean {
    return this.isGloballyMuted;
  }

  // Instantly terminates and suspends all audio across all games and sound engines
  public stopAllGameSounds() {
    try {
      // Stop each registered engine
      this.registeredEngines.forEach((engine) => {
        try {
          engine.stop();
        } catch {
          // Ignore
        }
      });

      // Suspend all known AudioContexts
      this.registeredContexts.forEach((ctx) => {
        try {
          if (ctx.state === 'running') {
            ctx.suspend().catch(() => {});
          }
        } catch {
          // Ignore
        }
      });
    } catch (e) {
      console.warn('AudioMaster stopAll failed:', e);
    }
  }
}

export const audioMaster = new AudioMasterManager();
export const stopAllGameSounds = () => audioMaster.stopAllGameSounds();
