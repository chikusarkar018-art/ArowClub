// Sound and Vibration Engine for Ludo King
// Web Audio API Synthesis: Dice rattle, token step clack, snake hiss goti-cut, landing thud, and ambient BGM

class LudoAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isBgmMuted: boolean = false;
  private bgmGainNode: GainNode | null = null;
  private bgmInterval: any = null;
  private isBgmPlaying: boolean = false;

  constructor() {
    // Lazy init
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBGM();
    }
  }

  public setBgmMuted(muted: boolean) {
    this.isBgmMuted = muted;
    if (muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
  }

  public getBgmMuted(): boolean {
    return this.isBgmMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // 1. DICE ROTATION / ROLLING SOUND (डाइस घूमने का साउंड)
  public playDiceRotationSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Multi-burst rattle clicks simulating wooden dice tumbling in a cup
      const rattleCount = 7;
      for (let i = 0; i < rattleCount; i++) {
        const time = now + i * 0.08 + (Math.random() * 0.02);
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400 + Math.random() * 600, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + 0.06);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200 + Math.random() * 800, time);
        filter.Q.setValueAtTime(3, time);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.06);
      }
    } catch {
      // ignore
    }
  }

  // 2. TOKEN STEP / HOPPING SOUND (गोटी के चाल चलने की साउंड)
  public playTokenStepSound(stepIndex = 1) {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch slightly rises as step progresses
      const baseFreq = 480 + ((stepIndex % 12) * 25);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * 1.5, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // ignore
    }
  }

  // 3. SNAKE HISS CAPTURE SOUND (गोटी कटने का साउंड - जैसे कि सांप फुफकारता हो)
  public playSnakeHissSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = 0.85;

      // Generate White Noise Buffer
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // Dual Swept Bandpass Filter for authentic snake hiss / strike frequency
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(4.5, now);
      bandpass.frequency.setValueAtTime(3800, now);
      bandpass.frequency.linearRampToValueAtTime(7200, now + 0.25);
      bandpass.frequency.exponentialRampToValueAtTime(4500, now + duration);

      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.setValueAtTime(3200, now);

      // Amplitude Envelope (Sudden hiss burst + sustained fluttering tail)
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.04);
      gain.gain.setValueAtTime(0.25, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Low rumble bite undertone
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sawtooth';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      subGain.gain.setValueAtTime(0.15, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.3);

      noiseSource.connect(bandpass);
      bandpass.connect(highpass);
      highpass.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + duration);
    } catch {
      // ignore
    }
  }

  // 4. TOKEN STOPPED SOUND (गोटी स्टॉप होने पर साउंड)
  public playTokenStopSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }

  // 5. SIX ROLLED CELEBRATION
  public playSixRollSound() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const time = now + idx * 0.07;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.22);
      });
    } catch {
      // ignore
    }
  }

  // 6. HAPTIC VIBRATION CONTROLLER (स्टॉप होने पर और गोटी काटने पर वाइब्रेशन)
  public triggerVibrate(type: 'stop' | 'cut' | 'step' | 'six' | 'win') {
    if (typeof window === 'undefined' || !navigator || !navigator.vibrate) return;
    try {
      switch (type) {
        case 'stop':
          // स्टॉप होने पर मोबाइल वाइब्रेट करे
          navigator.vibrate(45);
          break;
        case 'cut':
          // गोटी काटने पर डबल वाइब्रेट करे फोन
          navigator.vibrate([90, 50, 160]);
          break;
        case 'six':
          navigator.vibrate([40, 40, 70]);
          break;
        case 'win':
          navigator.vibrate([80, 50, 80, 50, 150]);
          break;
        default:
          break;
      }
    } catch {
      // Ignore vibration unsupported errors
    }
  }

  // 7. AMBIENT BACKGROUND MUSIC (बैकग्राउंड में अलग म्यूजिक)
  public startBGM() {
    if (this.isBgmPlaying || this.isBgmMuted || this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isBgmPlaying = true;

    // Chord progressions in Pentatonic Chill Mode
    const chordNotes = [
      [261.63, 329.63, 392.00], // C Maj
      [220.00, 261.63, 329.63], // A Min
      [174.61, 220.00, 261.63], // F Maj
      [196.00, 246.94, 293.66], // G Maj
    ];

    let chordIndex = 0;

    const playChordBar = () => {
      if (!this.isBgmPlaying || this.isBgmMuted || this.isMuted) return;
      const currentCtx = this.getAudioContext();
      if (!currentCtx) return;

      const now = currentCtx.currentTime;
      const chord = chordNotes[chordIndex % chordNotes.length];
      chordIndex++;

      // Soft ambient chord pad
      chord.forEach((freq, i) => {
        const osc = currentCtx.createOscillator();
        const gain = currentCtx.createGain();
        const filter = currentCtx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 0.5, now); // Warm bass octave

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(500, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(currentCtx.destination);

        osc.start(now);
        osc.stop(now + 1.9);
      });

      // Melodic gentle bell note
      const melodyFreq = chord[Math.floor(Math.random() * chord.length)] * 2;
      const bellOsc = currentCtx.createOscillator();
      const bellGain = currentCtx.createGain();
      bellOsc.type = 'triangle';
      bellOsc.frequency.setValueAtTime(melodyFreq, now + 0.4);
      bellGain.gain.setValueAtTime(0.001, now + 0.4);
      bellGain.gain.linearRampToValueAtTime(0.03, now + 0.45);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      bellOsc.connect(bellGain);
      bellGain.connect(currentCtx.destination);

      bellOsc.start(now + 0.4);
      bellOsc.stop(now + 1.3);
    };

    playChordBar();
    this.bgmInterval = setInterval(playChordBar, 1900);
  }

  public stopBGM() {
    this.isBgmPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }

  public toggleBGM(): boolean {
    if (this.isBgmPlaying) {
      this.stopBGM();
      this.isBgmMuted = true;
      return false;
    } else {
      this.isBgmMuted = false;
      this.startBGM();
      return true;
    }
  }
}

export const ludoAudio = new LudoAudioEngine();
