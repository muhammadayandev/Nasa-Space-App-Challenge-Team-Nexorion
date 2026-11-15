interface ChordStep {
  padRoots: [number, number];
  arpNotes: [number, number, number, number];
}

// Emotional minor-to-major progression (Am7 -> Fmaj7 -> C -> G6)
// inspired by Undertale's 'Fallen Down' & Interstellar's main organ motif
const AMBIENT_CHORDS: ChordStep[] = [
  { padRoots: [110.0, 164.81], arpNotes: [440.0, 523.25, 659.25, 783.99] }, // Am7 (minor)
  { padRoots: [87.31, 130.81], arpNotes: [349.23, 440.0, 523.25, 659.25] }, // Fmaj7 (emotional lift)
  { padRoots: [130.81, 196.0], arpNotes: [523.25, 659.25, 783.99, 1046.5] }, // C major bloom
  { padRoots: [98.0, 146.83], arpNotes: [392.0, 493.88, 587.33, 783.99] }, // G6 resolve
];

const ARP_PATTERN = [0, 1, 2, 3, 2, 1, 3, 2];

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public voiceEnabled = true;
  private rumbleSource: AudioBufferSourceNode | null = null;
  private rumbleGain: GainNode | null = null;
  private clipBufferCache = new Map<string, AudioBuffer>();
  private missingClips = new Set<string>();
  private activeVoiceNode: AudioBufferSourceNode | null = null;
  private stormLoopSrc: AudioBufferSourceNode | null = null;
  private stormLoopGain: GainNode | null = null;
  private stormLoopWanted = false;
  private lastAlertSfxTime = 0;

  // Ambient Retro Space Synthesizer State
  private bgmRunning = false;
  private bgmAlertActive = false;
  private bgmMasterGain: GainNode | null = null;
  private bgmPadFilter: BiquadFilterNode | null = null;
  private bgmPadOscs: OscillatorNode[] = [];
  private bgmSchedulerTimer: number | null = null;
  private nextArpTime = 0;
  private nextClockTime = 0;
  private nextChordTime = 0;
  private arpStepIdx = 0;
  private chordStepIdx = 0;
  private clockAccent = false;

  public isSuspended(): boolean {
    if (this.muted) return false;
    return !this.ctx || this.ctx.state === 'suspended';
  }

  public unlock() {
    const ctx = this.ensureContext();
    if (ctx && this.bgmRunning && !this.muted && this.bgmMasterGain) {
      this.bgmMasterGain.gain.setTargetAtTime(0.95, ctx.currentTime, 0.25);
    }
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

  public startAmbientSpaceLoop(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (this.bgmRunning) {
      if (this.bgmMasterGain) {
        this.bgmMasterGain.gain.setTargetAtTime(0.95, ctx.currentTime, 0.3);
      }
      return;
    }

    try {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.95, ctx.currentTime + 1.4);
      master.connect(ctx.destination);

      // Slow, warm low-pass sawtooth organ pad (interstellar / pipe-organ warmth)
      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 340;
      padFilter.Q.value = 0.65;

      const padGain = ctx.createGain();
      padGain.gain.value = 0.042;
      padFilter.connect(padGain);
      padGain.connect(master);

      const chord0 = AMBIENT_CHORDS[0];
      const padConfigs: Array<{ freq: number; detune: number; mix: number }> = [
        { freq: chord0.padRoots[0], detune: -5, mix: 0.48 },
        { freq: chord0.padRoots[0], detune: 5, mix: 0.48 },
        { freq: chord0.padRoots[1], detune: 0, mix: 0.36 },
      ];

      const oscs: OscillatorNode[] = [];
      for (const cfg of padConfigs) {
        const osc = ctx.createOscillator();
        const trim = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime);
        osc.detune.setValueAtTime(cfg.detune, ctx.currentTime);
        trim.gain.value = cfg.mix;
        osc.connect(trim);
        trim.connect(padFilter);
        osc.start();
        oscs.push(osc);
      }

      const now = ctx.currentTime;
      this.bgmMasterGain = master;
      this.bgmPadFilter = padFilter;
      this.bgmPadOscs = oscs;
      this.bgmRunning = true;
      this.chordStepIdx = 0;
      this.arpStepIdx = 0;
      this.clockAccent = false;
      this.nextChordTime = now;
      this.nextArpTime = now + 0.15;
      this.nextClockTime = now + 0.05;

      this.bgmSchedulerTimer = window.setInterval(() => {
        this.scheduleAmbientTick();
      }, 90);
    } catch {
      // Ignore Web Audio errors in headless environments
    }
  }

  public setAmbientAlert(isAlert: boolean): void {
    this.bgmAlertActive = isAlert;
    if (this.ctx && this.bgmPadFilter) {
      this.bgmPadFilter.frequency.setTargetAtTime(isAlert ? 460 : 340, this.ctx.currentTime, 0.4);
    }
  }

  public stopAmbientSpaceLoop(): void {
    this.bgmRunning = false;
    if (this.bgmSchedulerTimer !== null) {
      window.clearInterval(this.bgmSchedulerTimer);
      this.bgmSchedulerTimer = null;
    }
    for (const osc of this.bgmPadOscs) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    }
    this.bgmPadOscs = [];
    if (this.bgmMasterGain) {
      try {
        this.bgmMasterGain.disconnect();
      } catch {
        // ignore
      }
      this.bgmMasterGain = null;
    }
    this.bgmPadFilter = null;
  }

  private scheduleAmbientTick(): void {
    if (!this.bgmRunning || this.muted || !this.ctx || !this.bgmMasterGain) return;
    if (this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    if (this.nextArpTime < now - 0.5) {
      this.nextChordTime = now;
      this.nextArpTime = now + 0.08;
      this.nextClockTime = now + 0.05;
    }
    const lookahead = now + 0.28;

    // 1. Slow emotional chord changes (every 4.0 seconds)
    while (this.nextChordTime < lookahead) {
      const chord = AMBIENT_CHORDS[this.chordStepIdx % AMBIENT_CHORDS.length];
      if (this.bgmPadOscs.length >= 3) {
        this.bgmPadOscs[0].frequency.setTargetAtTime(chord.padRoots[0], this.nextChordTime, 0.65);
        this.bgmPadOscs[1].frequency.setTargetAtTime(chord.padRoots[0], this.nextChordTime, 0.65);
        this.bgmPadOscs[2].frequency.setTargetAtTime(chord.padRoots[1], this.nextChordTime, 0.65);
      }
      this.chordStepIdx = (this.chordStepIdx + 1) % AMBIENT_CHORDS.length;
      this.nextChordTime += 4.0;
    }

    // 2. Gentle 16-bit triangle-wave music-box arpeggio (faster when storm/flare active)
    const arpInterval = this.bgmAlertActive ? 0.27 : 0.42;
    while (this.nextArpTime < lookahead) {
      const chordIdx = (this.chordStepIdx - 1 + AMBIENT_CHORDS.length) % AMBIENT_CHORDS.length;
      const chord = AMBIENT_CHORDS[chordIdx];
      const noteIdx = ARP_PATTERN[this.arpStepIdx % ARP_PATTERN.length];
      const freq = chord.arpNotes[noteIdx];
      this.triggerMusicBoxNote(this.nextArpTime, freq, this.bgmAlertActive ? 0.34 : 0.48);
      this.arpStepIdx = (this.arpStepIdx + 1) % ARP_PATTERN.length;
      this.nextArpTime += arpInterval;
    }

    // 3. Soft, faint Interstellar clock-tick pulse every 1.0 second
    while (this.nextClockTime < lookahead) {
      this.triggerClockPulse(this.nextClockTime, this.clockAccent);
      this.clockAccent = !this.clockAccent;
      this.nextClockTime += 1.0;
    }
  }

  private triggerMusicBoxNote(atTime: number, freq: number, durSec: number): void {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, atTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.bgmAlertActive ? 2200 : 1650, atTime);

    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.linearRampToValueAtTime(this.bgmAlertActive ? 0.036 : 0.03, atTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + durSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);
    osc.start(atTime);
    osc.stop(atTime + durSec + 0.04);
  }

  private triggerClockPulse(atTime: number, accent: boolean): void {
    if (!this.ctx || !this.bgmMasterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(accent ? 1520 : 1180, atTime);
    osc.frequency.exponentialRampToValueAtTime(accent ? 540 : 420, atTime + 0.025);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(accent ? 1600 : 1250, atTime);
    filter.Q.value = 1.8;

    gain.gain.setValueAtTime(0.0001, atTime);
    gain.gain.linearRampToValueAtTime(accent ? 0.016 : 0.011, atTime + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, atTime + 0.032);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmMasterGain);
    osc.start(atTime);
    osc.stop(atTime + 0.045);
  }

  public setMuted(nextMuted: boolean) {
    this.muted = nextMuted;
    if (nextMuted) {
      this.stopRocketRumble();
      this.stopDustStormLoop();
      if (this.bgmMasterGain && this.ctx) {
        this.bgmMasterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.06);
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else if (this.bgmRunning) {
      const ctx = this.ensureContext();
      if (ctx && this.bgmMasterGain) {
        this.bgmMasterGain.gain.setTargetAtTime(0.95, ctx.currentTime, 0.25);
        this.nextArpTime = ctx.currentTime + 0.12;
        this.nextClockTime = ctx.currentTime + 0.1;
        this.nextChordTime = ctx.currentTime + 0.2;
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
      const clean = text.replace(/[^\w\s.,!?%-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      const utter = new SpeechSynthesisUtterance(clean);
      const voices = window.speechSynthesis.getVoices();
      const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
      const preferred =
        english.find((v) => /online|natural|neural/i.test(v.name) && /andrew|guy|ryan|aria|jenny|brian/i.test(v.name)) ||
        english.find((v) => /online|natural|neural|google/i.test(v.name)) ||
        english.find((v) => /david|mark|george|daniel|samantha/i.test(v.name)) ||
        english[0];
      if (preferred) utter.voice = preferred;
      utter.rate = 0.98;
      utter.pitch = 0.96;
      utter.volume = 0.88;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis errors on restricted browsers
    }
  }

  private async fetchDecodedClip(url: string): Promise<AudioBuffer | null> {
    const ctx = this.ensureContext();
    if (!ctx || this.missingClips.has(url)) return null;
    const cached = this.clipBufferCache.get(url);
    if (cached) return cached;
    try {
      const res = await fetch(url);
      const ctype = res.headers.get('content-type') || '';
      if (!res.ok || ctype.includes('text/html')) {
        this.missingClips.add(url);
        return null;
      }
      const arr = await res.arrayBuffer();
      if (arr.byteLength < 128) {
        this.missingClips.add(url);
        return null;
      }
      const buffer = await ctx.decodeAudioData(arr);
      this.clipBufferCache.set(url, buffer);
      return buffer;
    } catch {
      this.missingClips.add(url);
      return null;
    }
  }

  public async playRedAlertSfx(): Promise<void> {
    if (this.muted) return;
    const nowMs = Date.now();
    if (nowMs - this.lastAlertSfxTime < 1800) return;
    this.lastAlertSfxTime = nowMs;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const buf = await this.fetchDecodedClip('/audio/sfx/sfx_red_alert.mp3');
    if (!buf || this.muted) return;
    try {
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, ctx.currentTime);
      gain.connect(ctx.destination);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      src.onended = () => {
        try {
          gain.disconnect();
        } catch {
          // ignore
        }
      };
      src.start();
    } catch {
      // Ignore Web Audio errors
    }
  }

  public async startDustStormLoop(sheltered: boolean): Promise<void> {
    this.stormLoopWanted = true;
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (this.stormLoopSrc) {
      this.setDustStormSheltered(sheltered);
      return;
    }
    const buf = await this.fetchDecodedClip('/audio/sfx/sfx_dust_storm.mp3');
    if (!buf || !this.stormLoopWanted || this.muted || this.stormLoopSrc) return;
    try {
      const gain = ctx.createGain();
      const target = sheltered ? 0.1 : 0.32;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(target, ctx.currentTime + 0.8);
      gain.connect(ctx.destination);

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(gain);
      src.start();
      this.stormLoopSrc = src;
      this.stormLoopGain = gain;
    } catch {
      // Ignore Web Audio errors
    }
  }

  public setDustStormSheltered(sheltered: boolean): void {
    if (!this.ctx || !this.stormLoopGain) return;
    const target = sheltered ? 0.1 : 0.32;
    this.stormLoopGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
  }

  public stopDustStormLoop(): void {
    this.stormLoopWanted = false;
    if (this.stormLoopSrc) {
      try {
        this.stormLoopSrc.stop();
        this.stormLoopSrc.disconnect();
      } catch {
        // already stopped
      }
      this.stormLoopSrc = null;
    }
    if (this.stormLoopGain) {
      try {
        this.stormLoopGain.disconnect();
      } catch {
        // ignore
      }
      this.stormLoopGain = null;
    }
  }

  public async playVoiceClip(clipId: string, fallbackText: string): Promise<void> {
    if (this.muted || !this.voiceEnabled) return;
    const url = `/audio/voiceovers/${clipId}.mp3`;
    const ctx = this.ensureContext();

    if (ctx && !this.missingClips.has(url)) {
      try {
        let buffer = this.clipBufferCache.get(url);
        if (!buffer) {
          const res = await fetch(url);
          const ctype = res.headers.get('content-type') || '';
          if (!res.ok || ctype.includes('text/html')) {
            this.missingClips.add(url);
            this.speak(fallbackText);
            return;
          }
          const arr = await res.arrayBuffer();
          if (arr.byteLength < 128) {
            this.missingClips.add(url);
            this.speak(fallbackText);
            return;
          }
          buffer = await ctx.decodeAudioData(arr);
          this.clipBufferCache.set(url, buffer);
        }

        if (this.activeVoiceNode) {
          try {
            this.activeVoiceNode.stop();
          } catch {
            // ignore
          }
        }
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(ctx.destination);
        src.start();
        this.activeVoiceNode = src;
        return;
      } catch {
        this.missingClips.add(url);
      }
    }

    this.speak(fallbackText);
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
