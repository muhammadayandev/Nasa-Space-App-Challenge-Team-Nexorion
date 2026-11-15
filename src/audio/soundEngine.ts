class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public voiceEnabled = true;
  private rumbleSource: AudioBufferSourceNode | null = null;
  private rumbleGain: GainNode | null = null;

  public isSuspended(): boolean {
    if (this.muted) return false;
    return !this.ctx || this.ctx.state === 'suspended';
  }

  public unlock() {
    this.ensureContext();
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(nextMuted: boolean) {
    this.muted = nextMuted;
    if (nextMuted) {
      this.stopRocketRumble();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  }

  public setVoiceEnabled(enabled: boolean) {
    this.voiceEnabled = enabled;
    if (!enabled && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  public speak(text: string) {
    if (this.muted || !this.voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[^\w\s.,!?%-]/g, ' ');
      const utter = new SpeechSynthesisUtterance(clean);
      utter.rate = 1.03;
      utter.pitch = 1.08;
      utter.volume = 0.85;
      const voices = window.speechSynthesis.getVoices();
      const friendly =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Zira'))
        ) || voices.find((v) => v.lang.startsWith('en'));
      if (friendly) utter.voice = friendly;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors on restricted browsers
    }
  }

  public playClick(pitch = 580) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.25, now + 0.06);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playPopupChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.055);
      gain.gain.setValueAtTime(0.001, now + i * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.1, now + i * 0.055 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.055 + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.055);
      osc.stop(now + i * 0.055 + 0.26);
    });
  }

  public playSpaceWhoosh() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.18);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.45);
    gain.gain.setValueAtTime(0.005, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playCountdownBeep(isLiftoff = false) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isLiftoff ? 880 : 440, now);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isLiftoff ? 0.38 : 0.16));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isLiftoff ? 0.42 : 0.18));
  }

  public startRocketRumble() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.stopRocketRumble();
    try {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(135, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.005, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.8);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.rumbleSource = source;
      this.rumbleGain = gain;
    } catch {
      // Ignore WebAudio node creation errors
    }
  }

  public stopRocketRumble() {
    if (!this.rumbleSource || !this.ctx) return;
    try {
      if (this.rumbleGain) {
        this.rumbleGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
      }
      const ref = this.rumbleSource;
      this.rumbleSource = null;
      setTimeout(() => {
        try {
          ref.stop();
          ref.disconnect();
        } catch {
          // already stopped
        }
      }, 280);
    } catch {
      this.rumbleSource = null;
    }
  }

  public playSampleCollect() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [587.33, 783.99, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.09, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.27);
    });
  }

  public playFootstep() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.06);
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playSelectModule() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.045);
      gain.gain.setValueAtTime(0.06, now + i * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.045);
      osc.stop(now + i * 0.045 + 0.12);
    });
  }

  public playAdvanceSol(isStorm: boolean) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = isStorm ? [330, 293.66, 246.94] : [392, 493.88, 587.33];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isStorm ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.09);
      gain.gain.setValueAtTime(isStorm ? 0.045 : 0.06, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.24);
    });
  }

  public playSuccess() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      gain.gain.setValueAtTime(0.075, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.36);
    });
  }
}

export const soundEngine = new SoundEngine();
