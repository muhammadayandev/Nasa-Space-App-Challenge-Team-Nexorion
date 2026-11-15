import { CUTSCENE_CHAPTERS, type ChapterId } from '../timeline';
import { VOICE_CLIP_BY_CUTSCENE_KEY } from '../../data/voiceManifest';

type AllowedVoice = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

function makeRadioDriveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 512;
  const buf = new ArrayBuffer(n * 4);
  const curve = new Float32Array(buf);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

function getVoiceProfile(
  speaker: string,
  tone: 'normal' | 'alert' | 'critical'
): { voiceName: AllowedVoice; style: string } {
  const urgency =
    tone === 'critical'
      ? 'Urgent tense astronaut voice over crackling suit radio'
      : tone === 'alert'
        ? 'Focused alert flight officer over cockpit radio'
        : 'Crisp aircraft pilot radio voiceover, calm professional NASA mission control tone';

  if (speaker === 'CDR. VANCE') {
    return { voiceName: 'Charon', style: urgency };
  }
  if (speaker === 'CAPCOM' || speaker === 'FLIGHT CONTROL' || speaker === 'NAV COMPUTER') {
    return { voiceName: 'Fenrir', style: urgency };
  }
  if (speaker === 'DR. LIN' || speaker === 'SHIP LOG' || speaker === 'FIELD LOG') {
    return { voiceName: 'Kore', style: urgency };
  }
  return { voiceName: 'Puck', style: urgency };
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private rumbleGain: GainNode | null = null;
  private rumbleFilter: BiquadFilterNode | null = null;
  private stormGain: GainNode | null = null;
  private stormFilter: BiquadFilterNode | null = null;

  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padOsc1: OscillatorNode | null = null;
  private padOsc2: OscillatorNode | null = null;
  private padOsc3: OscillatorNode | null = null;

  // Aviation / spacecraft cockpit VHF radio DSP bus
  private radioInput: GainNode | null = null;
  private radioHissGain: GainNode | null = null;
  private activeVoiceSrc: AudioBufferSourceNode | null = null;
  private activeVoiceToken = 0;

  private rawWavCache = new Map<string, ArrayBuffer>();
  private voiceBufferCache = new Map<string, AudioBuffer>();
  private voiceInFlight = new Map<string, Promise<ArrayBuffer | null>>();
  private missingStaticClips = new Set<string>();
  private prefetchStarted = false;
  private ttsUnavailable = true;

  private muted = false;
  private initialized = false;
  private cachedMaleVoice: SpeechSynthesisVoice | null = null;
  private lastCountdownBeep = -1;
  private lastCountdownSpoken = -1;
  private lastChapter: ChapterId | null = null;
  private lastSubtitleKey = '';
  private lastWalkTick = -1;
  private lastTransitTick = -1;
  private lastConsoleTick = -1;
  private lastAlarmTick = -1;
  private lastBeaconTick = -1;
  private lastSolTick = -1;
  private triggeredEvents = new Set<string>();

  public unlock(fromUserGesture = false): void {
    const activation = (navigator as unknown as { userActivation?: { hasBeenActive: boolean } })
      .userActivation;
    if (!fromUserGesture && activation && !activation.hasBeenActive) {
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        this.selectMaleRadioVoice();
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        // Ignore restricted speech synthesis
      }
    }

    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume().then(() => {
          this.lastChapter = null;
          this.triggeredEvents.clear();
        });
      }
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      const ctx = new AudioCtx();
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.18;
      compressor.connect(ctx.destination);

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : 0.85;
      master.connect(compressor);

      // 2-second pink/brown filtered noise buffer for engines, footsteps, static & storm wind
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.05 * white) / 1.05;
        lastOut = data[i];
        data[i] *= 3.4;
      }

      // 1. Rocket / thruster low-mid roar channel
      const rumbleSrc = ctx.createBufferSource();
      rumbleSrc.buffer = noiseBuffer;
      rumbleSrc.loop = true;
      const rumbleFilter = ctx.createBiquadFilter();
      rumbleFilter.type = 'lowpass';
      rumbleFilter.frequency.value = 240;
      const rumbleGain = ctx.createGain();
      rumbleGain.gain.value = 0;
      rumbleSrc.connect(rumbleFilter);
      rumbleFilter.connect(rumbleGain);
      rumbleGain.connect(master);
      rumbleSrc.start();

      // 2. Martian wind / airlock hiss channel
      const stormSrc = ctx.createBufferSource();
      stormSrc.buffer = noiseBuffer;
      stormSrc.loop = true;
      const stormFilter = ctx.createBiquadFilter();
      stormFilter.type = 'bandpass';
      stormFilter.frequency.value = 460;
      stormFilter.Q.value = 1.6;
      const stormGain = ctx.createGain();
      stormGain.gain.value = 0;
      stormSrc.connect(stormFilter);
      stormFilter.connect(stormGain);
      stormGain.connect(master);
      stormSrc.start();

      // 3. Audible Warm Harmonic Synth Pad (audible 165-440Hz range across all speakers)
      const padFilter = ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 680;
      padFilter.Q.value = 0.8;

      const padGain = ctx.createGain();
      padGain.gain.value = 0;
      padFilter.connect(padGain);
      padGain.connect(master);

      const padOsc1 = ctx.createOscillator();
      padOsc1.type = 'triangle';
      padOsc1.frequency.value = 146.83; // D3

      const padOsc2 = ctx.createOscillator();
      padOsc2.type = 'sine';
      padOsc2.frequency.value = 220.0; // A3

      const padOsc3 = ctx.createOscillator();
      padOsc3.type = 'sawtooth';
      padOsc3.frequency.value = 293.66; // D4
      const sawTrim = ctx.createGain();
      sawTrim.gain.value = 0.25;

      padOsc1.connect(padFilter);
      padOsc2.connect(padFilter);
      padOsc3.connect(sawTrim);
      sawTrim.connect(padFilter);

      padOsc1.start();
      padOsc2.start();
      padOsc3.start();

      // 4. Warm NASA Aviation Radio DSP Chain (210Hz HP -> 1.6kHz clarity -> 4.2kHz LP -> gentle compression)
      const radioInput = ctx.createGain();
      radioInput.gain.value = 1.0;

      const radioHP = ctx.createBiquadFilter();
      radioHP.type = 'highpass';
      radioHP.frequency.value = 210;
      radioHP.Q.value = 0.7;

      const radioMid = ctx.createBiquadFilter();
      radioMid.type = 'peaking';
      radioMid.frequency.value = 1650;
      radioMid.Q.value = 0.9;
      radioMid.gain.value = 3.2;

      const radioLP = ctx.createBiquadFilter();
      radioLP.type = 'lowpass';
      radioLP.frequency.value = 4200;
      radioLP.Q.value = 0.85;

      const radioShaper = ctx.createWaveShaper();
      radioShaper.curve = makeRadioDriveCurve(0.45);
      radioShaper.oversample = '2x';

      const radioComp = ctx.createDynamicsCompressor();
      radioComp.threshold.value = -18;
      radioComp.knee.value = 12;
      radioComp.ratio.value = 5;
      radioComp.attack.value = 0.005;
      radioComp.release.value = 0.14;

      const radioOutGain = ctx.createGain();
      radioOutGain.gain.value = 1.18;

      radioInput.connect(radioHP);
      radioHP.connect(radioMid);
      radioMid.connect(radioLP);
      radioLP.connect(radioShaper);
      radioShaper.connect(radioComp);
      radioComp.connect(radioOutGain);
      radioOutGain.connect(master);

      // Subtle continuous VHF carrier static bed while pilot radio is keyed open
      const radioHissSrc = ctx.createBufferSource();
      radioHissSrc.buffer = noiseBuffer;
      radioHissSrc.loop = true;
      const radioHissGain = ctx.createGain();
      radioHissGain.gain.value = 0;
      radioHissSrc.connect(radioHissGain);
      radioHissGain.connect(radioHP);
      radioHissSrc.start();

      this.ctx = ctx;
      this.masterGain = master;
      this.noiseBuffer = noiseBuffer;
      this.rumbleGain = rumbleGain;
      this.rumbleFilter = rumbleFilter;
      this.stormGain = stormGain;
      this.stormFilter = stormFilter;
      this.padGain = padGain;
      this.padFilter = padFilter;
      this.padOsc1 = padOsc1;
      this.padOsc2 = padOsc2;
      this.padOsc3 = padOsc3;
      this.radioInput = radioInput;
      this.radioHissGain = radioHissGain;
      this.initialized = true;

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.selectMaleRadioVoice();
        window.speechSynthesis.onvoiceschanged = () => {
          this.selectMaleRadioVoice();
        };
      }

      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
    } catch {
      // Ignore Web Audio failures in restricted environments
    }
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public silenceLoops(): void {
    this.stopActiveVoice();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.rumbleGain?.gain.setTargetAtTime(0, now, 0.08);
    this.stormGain?.gain.setTargetAtTime(0, now, 0.08);
    this.padGain?.gain.setTargetAtTime(0, now, 0.12);
    this.radioHissGain?.gain.setTargetAtTime(0, now, 0.04);
  }

  private stopActiveVoice(): void {
    this.activeVoiceToken++;
    if (this.activeVoiceSrc) {
      try {
        this.activeVoiceSrc.onended = null;
        this.activeVoiceSrc.stop();
      } catch {
        // Already stopped
      }
      this.activeVoiceSrc = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore synthesis cancel errors
      }
    }
    if (this.ctx && this.radioHissGain) {
      this.radioHissGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    }
  }

  private async fetchVoiceWav(
    cueKey: string,
    speaker: string,
    text: string,
    tone: 'normal' | 'alert' | 'critical'
  ): Promise<ArrayBuffer | null> {
    if (this.ttsUnavailable) return null;
    const existingRaw = this.rawWavCache.get(cueKey);
    if (existingRaw) return existingRaw;

    const inflight = this.voiceInFlight.get(cueKey);
    if (inflight) return inflight;

    const { voiceName, style } = getVoiceProfile(speaker, tone);
    const job = (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voiceName, style }),
        });
        if (!res.ok) {
          if (res.status === 403 || res.status === 503) {
            this.ttsUnavailable = true;
          }
          return null;
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('audio/wav')) {
          this.ttsUnavailable = true;
          return null;
        }
        const arr = await res.arrayBuffer();
        if (arr.byteLength < 64) return null;
        this.rawWavCache.set(cueKey, arr);
        return arr;
      } catch {
        return null;
      } finally {
        this.voiceInFlight.delete(cueKey);
      }
    })();

    this.voiceInFlight.set(cueKey, job);
    return job;
  }

  private async tryFetchStaticClip(filePath: string): Promise<AudioBuffer | null> {
    if (this.missingStaticClips.has(filePath) || !this.ctx) return null;
    const cached = this.voiceBufferCache.get(filePath);
    if (cached) return cached;

    try {
      const res = await fetch(filePath);
      const ctype = res.headers.get('content-type') || '';
      if (!res.ok || ctype.includes('text/html')) {
        this.missingStaticClips.add(filePath);
        return null;
      }
      const arr = await res.arrayBuffer();
      if (arr.byteLength < 128) {
        this.missingStaticClips.add(filePath);
        return null;
      }
      const decoded = await this.ctx.decodeAudioData(arr);
      this.voiceBufferCache.set(filePath, decoded);
      return decoded;
    } catch {
      this.missingStaticClips.add(filePath);
      return null;
    }
  }

  private async getDecodedVoiceBuffer(
    cueKey: string,
    speaker: string,
    text: string,
    tone: 'normal' | 'alert' | 'critical'
  ): Promise<AudioBuffer | null> {
    const staticSpec = VOICE_CLIP_BY_CUTSCENE_KEY.get(cueKey);
    if (staticSpec) {
      const customBuf = await this.tryFetchStaticClip(staticSpec.file);
      if (customBuf) return customBuf;
    }

    const cachedBuf = this.voiceBufferCache.get(cueKey);
    if (cachedBuf) return cachedBuf;
    if (!this.ctx) return null;

    const raw = await this.fetchVoiceWav(cueKey, speaker, text, tone);
    if (!raw || !this.ctx) return null;
    try {
      const decoded = await this.ctx.decodeAudioData(raw.slice(0));
      this.voiceBufferCache.set(cueKey, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  public prefetchCutsceneVoiceovers(priorityChapterIds: ChapterId[] = ['earth_farewell', 'boarding', 'launch']): void {
    if (this.prefetchStarted) return;
    this.prefetchStarted = true;

    const prioritySet = new Set(priorityChapterIds);
    const orderedChapters = [
      ...CUTSCENE_CHAPTERS.filter((c) => prioritySet.has(c.id)),
      ...CUTSCENE_CHAPTERS.filter((c) => !prioritySet.has(c.id)),
    ];

    const queue: Array<{
      key: string;
      speaker: string;
      text: string;
      tone: 'normal' | 'alert' | 'critical';
    }> = [];

    for (const ch of orderedChapters) {
      for (const sub of ch.subtitles) {
        queue.push({
          key: `${ch.id}:${sub.at}:${sub.speaker}`,
          speaker: sub.speaker,
          text: sub.text,
          tone: sub.tone ?? 'normal',
        });
      }
    }

    const worker = async () => {
      while (queue.length > 0 && !this.ttsUnavailable) {
        const item = queue.shift();
        if (!item) break;
        await this.fetchVoiceWav(item.key, item.speaker, item.text, item.tone);
      }
    };

    void worker();
  }

  private selectMaleRadioVoice(): SpeechSynthesisVoice | null {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return this.cachedMaleVoice;

    const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    const pool = english.length > 0 ? english : voices;

    const femalePattern =
      /\b(zira|hazel|susan|eva|aria|jenny|michelle|samantha|victoria|karen|moira|tessa|fiona|kate|female|woman)\b/i;
    const malePattern =
      /\b(david|mark|george|ryan|guy|andrew|brian|christopher|eric|roger|daniel|alex|arthur|james|matthew|richard|ravi|thomas|male)\b/i;

    const nonFemale = pool.filter((v) => !femalePattern.test(v.name));
    const chosen =
      nonFemale.find((v) => malePattern.test(v.name) && /online|natural/i.test(v.name)) ||
      nonFemale.find((v) => malePattern.test(v.name)) ||
      nonFemale[0] ||
      pool[0] ||
      null;

    if (chosen) this.cachedMaleVoice = chosen;
    return chosen;
  }

  private speakBrowserFallback(
    token: number,
    speaker: string,
    text: string,
    tone: 'normal' | 'alert' | 'critical',
    rateOverride?: number,
    pitchOverride?: number
  ): void {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      this.muted ||
      !this.ctx
    ) {
      return;
    }

    try {
      const cleanText = text.replace(/—/g, ', ').replace(/\.\.\./g, ', ');
      const utter = new SpeechSynthesisUtterance(cleanText);
      const maleVoice = this.selectMaleRadioVoice();
      if (maleVoice) utter.voice = maleVoice;

      const isNaturalVoice = maleVoice ? /online|natural|neural|google/i.test(maleVoice.name) : false;
      utter.rate =
        rateOverride ?? (speaker === 'CAPCOM' ? 0.99 : tone === 'critical' ? 1.06 : 0.97);
      // Keep natural formants clean without robotic pitch-shift distortion
      const baseMalePitch = isNaturalVoice ? 0.93 : 0.87;
      utter.pitch =
        pitchOverride ??
        (speaker === 'DR. LIN' || speaker === 'WEATHER ALERT'
          ? 1.04
          : baseMalePitch);
      utter.volume = 0.94;

      const now = this.ctx.currentTime;
      this.radioHissGain?.gain.setTargetAtTime(0.014, now, 0.02);

      utter.onstart = () => {
        if (token !== this.activeVoiceToken) return;
        // Crisp NASA Quindar intro pip
        this.playTone(2524, 0.036, 'sine', 0.06, 0);
      };

      utter.onend = () => {
        if (this.ctx && this.radioHissGain) {
          this.radioHissGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
        }
        if (token === this.activeVoiceToken) {
          this.playTone(2475, 0.032, 'sine', 0.05, 0);
        }
      };
      utter.onerror = () => {
        if (this.ctx && this.radioHissGain) {
          this.radioHissGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
        }
      };

      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore synthesis unavailability
    }
  }

  private async playCountdownRadioWord(count: number): Promise<void> {
    if (!this.ensurePlayable() || !this.ctx || !this.radioInput) return;
    const words: Record<number, string> = {
      5: 'T-minus five.',
      4: 'Four.',
      3: 'Three.',
      2: 'Two.',
      1: 'One.',
    };
    const word = words[count];
    if (!word) return;
    this.stopActiveVoice();
    const token = this.activeVoiceToken;
    const customClip = await this.tryFetchStaticClip(`/audio/voiceovers/countdown_${count}.mp3`);
    if (token !== this.activeVoiceToken || !this.ensurePlayable() || !this.ctx || !this.radioInput) {
      return;
    }
    if (customClip) {
      this.playBufferThroughRadio(customClip, token);
      return;
    }
    this.speakBrowserFallback(token, 'CAPCOM', word, 'normal', 1.04, 0.88);
  }

  private playBufferThroughRadio(buffer: AudioBuffer, token: number): void {
    if (!this.ctx || !this.radioInput) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.radioInput);
    this.activeVoiceSrc = src;

    this.radioHissGain?.gain.setTargetAtTime(0.012, now, 0.02);

    src.onended = () => {
      if (this.activeVoiceSrc === src) {
        this.activeVoiceSrc = null;
      }
      if (this.ctx && this.radioHissGain) {
        this.radioHissGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
      }
      if (token === this.activeVoiceToken) {
        this.playTone(2475, 0.03, 'sine', 0.045, 0);
      }
    };

    src.start(now + 0.05);
  }

  private async playRadioVoiceover(
    cueKey: string,
    speaker: string,
    text: string,
    tone: 'normal' | 'alert' | 'critical'
  ): Promise<void> {
    if (!this.ensurePlayable() || !this.ctx || !this.radioInput) return;

    this.stopActiveVoice();
    const token = this.activeVoiceToken;
    const staticSpec = VOICE_CLIP_BY_CUTSCENE_KEY.get(cueKey);
    if (staticSpec) {
      const customBuf = await this.tryFetchStaticClip(staticSpec.file);
      if (token !== this.activeVoiceToken || !this.ensurePlayable()) return;
      if (customBuf) {
        this.playBufferThroughRadio(customBuf, token);
        return;
      }
    }

    if (this.ttsUnavailable) {
      this.speakBrowserFallback(token, speaker, text, tone);
      return;
    }
    const buffer = await this.getDecodedVoiceBuffer(cueKey, speaker, text, tone);
    if (token !== this.activeVoiceToken || !this.ensurePlayable() || !this.ctx || !this.radioInput) {
      return;
    }

    if (!buffer) {
      this.speakBrowserFallback(token, speaker, text, tone);
      return;
    }

    this.playBufferThroughRadio(buffer, token);
  }

  private ensurePlayable(): boolean {
    if (!this.ctx || !this.masterGain || this.muted) return false;
    if (this.ctx.state === 'suspended') return false;
    return true;
  }

  public playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.24,
    delaySec = 0,
    endFreq?: number
  ): void {
    if (!this.ensurePlayable() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  public playNoiseBurst(
    duration: number,
    filterType: BiquadFilterType,
    filterFreq: number,
    volume = 0.25,
    delaySec = 0
  ): void {
    if (!this.ensurePlayable() || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const now = this.ctx.currentTime + delaySec;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 0.8, duration + 0.03);
  }

  public playCommsChirp(tone: 'normal' | 'alert' | 'critical' = 'normal'): void {
    if (!this.ensurePlayable()) return;
    if (tone === 'critical') {
      this.playNoiseBurst(0.05, 'bandpass', 1900, 0.16, 0);
      this.playTone(1040, 0.09, 'square', 0.15, 0.02);
      this.playTone(740, 0.11, 'square', 0.14, 0.11);
    } else if (tone === 'alert') {
      this.playNoiseBurst(0.04, 'bandpass', 1600, 0.12, 0);
      this.playTone(880, 0.08, 'triangle', 0.16, 0.02);
      this.playTone(1174, 0.1, 'triangle', 0.15, 0.1);
    } else {
      // NASA-style crisp Quindar pre-tone + squelch tail
      this.playTone(1480, 0.05, 'sine', 0.14, 0);
      this.playTone(1120, 0.06, 'sine', 0.12, 0.055);
      this.playNoiseBurst(0.035, 'highpass', 2200, 0.08, 0.11);
    }
  }

  public playFootstep(isMars = false): void {
    if (!this.ensurePlayable()) return;
    const pitch = (isMars ? 112 : 155) * (0.9 + Math.random() * 0.2);
    this.playTone(pitch, 0.12, 'triangle', 0.22, 0, pitch * 0.55);
    this.playNoiseBurst(0.09, 'bandpass', isMars ? 950 : 1400, isMars ? 0.18 : 0.12, 0);
  }

  public playObjectiveChime(): void {
    this.playTone(523.25, 0.22, 'sine', 0.24, 0);
    this.playTone(659.25, 0.24, 'sine', 0.24, 0.12);
    this.playTone(783.99, 0.36, 'triangle', 0.22, 0.24);
  }

  public playSpaceChord(variant: 'depart' | 'arrive' = 'depart'): void {
    if (variant === 'depart') {
      this.playTone(146.83, 3.0, 'triangle', 0.18, 0); // D3
      this.playTone(220.0, 3.2, 'sine', 0.16, 0.12); // A3
      this.playTone(329.63, 3.0, 'sine', 0.13, 0.25); // E4
    } else {
      this.playTone(174.61, 2.8, 'triangle', 0.18, 0); // F3
      this.playTone(261.63, 2.8, 'sine', 0.16, 0.12); // C4
      this.playTone(392.0, 3.0, 'sine', 0.14, 0.24); // G4
    }
  }

  private fireOnce(key: string, fn: () => void): void {
    if (this.triggeredEvents.has(key)) return;
    this.triggeredEvents.add(key);
    fn();
  }

  public updateSurvivalAudio(survivalElapsedSec: number, distanceToHabM: number): void {
    if (!this.ensurePlayable() || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Gentle lonely Mars wind + subtle atmospheric pad
    this.padOsc1?.frequency.setTargetAtTime(130.81, now, 0.3);
    this.padOsc2?.frequency.setTargetAtTime(196.0, now, 0.3);
    this.padOsc3?.frequency.setTargetAtTime(261.63, now, 0.3);
    this.padGain?.gain.setTargetAtTime(0.08, now, 0.2);
    this.padFilter?.frequency.setTargetAtTime(420, now, 0.2);

    this.rumbleGain?.gain.setTargetAtTime(0, now, 0.15);
    this.stormGain?.gain.setTargetAtTime(0.11, now, 0.2);
    this.stormFilter?.frequency.setTargetAtTime(340 + Math.sin(survivalElapsedSec * 0.7) * 90, now, 0.2);

    // Periodic Ares II Hab emergency homing beacon ping (faster as you get closer)
    const interval = Math.max(1.1, Math.min(3.0, distanceToHabM / 25));
    const tick = Math.floor(survivalElapsedSec / interval);
    if (tick !== this.lastBeaconTick) {
      this.lastBeaconTick = tick;
      const vol = Math.max(0.07, 0.2 - distanceToHabM * 0.0014);
      this.playTone(880, 0.14, 'sine', vol, 0);
    }
  }

  public updateCutsceneAudio(
    chapterId: ChapterId,
    localTime: number,
    countdownNumber: number,
    ignited: boolean,
    subtitleKey = '',
    subtitleTone: 'normal' | 'alert' | 'critical' = 'normal',
    subtitleSpeaker = '',
    subtitleText = ''
  ): void {
    if (!this.ensurePlayable() || !this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (chapterId !== this.lastChapter) {
      this.lastChapter = chapterId;
      this.lastCountdownBeep = -1;
      this.lastCountdownSpoken = -1;
      this.lastWalkTick = -1;
      this.lastTransitTick = -1;
      this.lastConsoleTick = -1;
      this.lastAlarmTick = -1;
      this.lastSolTick = -1;
      this.lastSubtitleKey = '';
      this.triggeredEvents.clear();
      this.stopActiveVoice();

      if (chapterId === 'earth_farewell') {
        this.playTone(392.0, 0.22, 'triangle', 0.18, 0);
        this.playTone(523.25, 0.36, 'sine', 0.18, 0.15);
      } else if (chapterId === 'boarding') {
        this.playNoiseBurst(0.45, 'bandpass', 720, 0.2, 0.05);
      } else if (chapterId === 'transit_8_months') {
        this.playSpaceChord('depart');
      } else if (chapterId === 'mars_landing') {
        this.playTone(311.13, 0.25, 'triangle', 0.16, 0);
      } else if (chapterId === 'awakening') {
        // Heartbeat lub-dub + suit boot chime
        this.playTone(68, 0.18, 'sine', 0.32, 0.25, 44);
        this.playTone(62, 0.18, 'sine', 0.28, 0.48, 42);
        this.playTone(68, 0.18, 'sine', 0.32, 1.25, 44);
        this.playTone(392, 0.25, 'triangle', 0.2, 2.2);
        this.playTone(523.25, 0.45, 'sine', 0.22, 2.5);
        this.playNoiseBurst(0.4, 'highpass', 1400, 0.14, 2.6);
      }
    }

    if (subtitleKey && subtitleKey !== this.lastSubtitleKey) {
      this.lastSubtitleKey = subtitleKey;
      this.playCommsChirp(subtitleTone);
      const isCountdownSubtitle =
        chapterId === 'launch' && subtitleText.startsWith('T-minus');
      if (subtitleText && !isCountdownSubtitle) {
        void this.playRadioVoiceover(subtitleKey, subtitleSpeaker, subtitleText, subtitleTone);
      }
    } else if (!subtitleKey) {
      this.lastSubtitleKey = '';
    }

    // Chapter 1 & Chapter 6 walking footsteps
    if (chapterId === 'earth_farewell') {
      const stepIdx = Math.floor(localTime * 1.9);
      if (stepIdx !== this.lastWalkTick) {
        this.lastWalkTick = stepIdx;
        this.playFootstep(false);
      }
    } else if (chapterId === 'mars_arrival_timelapse') {
      if (localTime < 5.3) {
        const stepIdx = Math.floor(localTime * 1.75);
        if (stepIdx !== this.lastWalkTick) {
          this.lastWalkTick = stepIdx;
          this.playFootstep(true);
        }
      } else {
        // Shimmering Sol timelapse arpeggio chimes
        const solIdx = Math.floor((localTime - 5.3) * 2.2);
        if (solIdx !== this.lastSolTick) {
          this.lastSolTick = solIdx;
          const notes = [392.0, 493.88, 587.33, 739.99, 783.99];
          this.playTone(notes[solIdx % notes.length], 0.28, 'sine', 0.13);
        }
      }
    }

    // Chapter 2 boarding: hatch seal clunk & cockpit avionics chimes
    if (chapterId === 'boarding') {
      if (localTime > 3.5) {
        this.fireOnce('boarding_hatch', () => {
          this.playTone(110, 0.28, 'sawtooth', 0.24, 0, 52);
          this.playNoiseBurst(0.32, 'bandpass', 1200, 0.22, 0.1);
          this.playTone(1320, 0.11, 'sine', 0.15, 0.45);
          this.playTone(1560, 0.11, 'sine', 0.14, 0.95);
          this.playTone(1760, 0.14, 'sine', 0.14, 1.55);
        });
      }
    }

    // Chapter 3 launch: synced manly radio countdown ("T-minus five.. four.. three.. two.. one") + klaxons + ignition
    if (chapterId === 'launch') {
      if (!ignited && localTime >= 1.5 && countdownNumber >= 1 && countdownNumber <= 5) {
        if (countdownNumber !== this.lastCountdownBeep) {
          this.lastCountdownBeep = countdownNumber;
          const freq = countdownNumber === 1 ? 1046.5 : 698.46;
          this.playTone(freq, 0.22, 'triangle', 0.28);
          this.playTone(freq * 0.5, 0.22, 'sine', 0.2);
        }
        if (countdownNumber !== this.lastCountdownSpoken) {
          this.lastCountdownSpoken = countdownNumber;
          this.playCountdownRadioWord(countdownNumber);
        }
      }
      if (ignited) {
        this.fireOnce('launch_ignite', () => {
          this.playNoiseBurst(1.1, 'lowpass', 950, 0.42, 0);
          this.playTone(92, 0.85, 'sawtooth', 0.28, 0, 48);
        });
        if (localTime > 11.5) {
          this.fireOnce('booster_sep', () => {
            this.playTone(145, 0.32, 'triangle', 0.28, 0, 65);
            this.playNoiseBurst(0.28, 'bandpass', 1800, 0.24, 0.04);
            this.playTone(587.33, 0.18, 'sine', 0.16, 0.22);
          });
        }
      }
    }

    // Chapter 4: Cockpit console keystrokes (0..3.8s), Zoom-out space swell (3.8s), Chronograph & Mars arrival
    if (chapterId === 'transit_8_months') {
      if (localTime < 3.8) {
        const keyIdx = Math.floor(localTime * 3.1);
        if (keyIdx !== this.lastConsoleTick) {
          this.lastConsoleTick = keyIdx;
          this.playTone(960 + (keyIdx % 4) * 140, 0.045, 'sine', 0.1);
        }
      }
      if (localTime >= 3.8) {
        this.fireOnce('transit_zoom_swell', () => {
          this.playSpaceChord('depart');
          this.playNoiseBurst(0.9, 'bandpass', 420, 0.16, 0);
        });
      }
      if (localTime > 5.0 && localTime < 11.4) {
        const tickIdx = Math.floor((localTime - 5.0) * 2.4);
        if (tickIdx !== this.lastTransitTick) {
          this.lastTransitTick = tickIdx;
          const pitch = 440 + tickIdx * 24;
          this.playTone(Math.min(1040, pitch), 0.09, 'sine', 0.12);
        }
      }
      if (localTime >= 10.6) {
        this.fireOnce('transit_mars_arrive', () => {
          this.playSpaceChord('arrive');
        });
      }
    }

    // Chapter 5: Retro-thruster altimeter chimes & touchdown crunch
    if (chapterId === 'mars_landing') {
      if (localTime < 7.6) {
        const pingIdx = Math.floor(localTime * 1.1);
        if (pingIdx !== this.lastAlarmTick) {
          this.lastAlarmTick = pingIdx;
          this.playTone(740 - pingIdx * 30, 0.08, 'sine', 0.12);
        }
      } else {
        this.fireOnce('mars_touchdown', () => {
          this.playTone(76, 0.42, 'triangle', 0.34, 0, 38);
          this.playNoiseBurst(0.38, 'lowpass', 700, 0.3, 0);
          this.playTone(523.25, 0.22, 'sine', 0.18, 0.26);
        });
      }
    }

    // Chapter 7: Sol 19 peaceful survey (0..5.8s) -> Sudden Red Alert (5.8s) -> Gradual cyclone & comms cut (11.8s) -> Visor impact (15.2s)
    if (chapterId === 'storm_evacuation') {
      if (localTime >= 2.2 && localTime < 5.7) {
        const scanIdx = Math.floor((localTime - 2.2) / 1.4);
        if (scanIdx !== this.lastSolTick) {
          this.lastSolTick = scanIdx;
          this.playTone(1180, 0.08, 'sine', 0.09);
        }
      }
      if (localTime >= 5.8 && localTime < 11.8) {
        this.fireOnce('sol19_red_alert', () => {
          this.playTone(95, 0.35, 'sawtooth', 0.28, 0, 48);
          this.playTone(980, 0.14, 'square', 0.18, 0.02);
        });
        const alarmIdx = Math.floor((localTime - 5.8) / 1.15);
        if (alarmIdx !== this.lastAlarmTick) {
          this.lastAlarmTick = alarmIdx;
          this.playTone(840, 0.22, 'sawtooth', 0.21, 0, 580);
          this.playTone(620, 0.2, 'sawtooth', 0.18, 0.24, 480);
        }
      }
      if (localTime >= 11.8) {
        this.fireOnce('comms_severed', () => {
          this.playNoiseBurst(0.38, 'highpass', 1500, 0.34, 0);
          this.playTone(1450, 0.34, 'sine', 0.16, 0.18);
        });
      }
      if (localTime >= 15.2) {
        this.fireOnce('visor_impact', () => {
          this.playTone(68, 0.48, 'sawtooth', 0.38, 0, 30);
          this.playNoiseBurst(0.34, 'highpass', 2200, 0.36, 0);
          this.playTone(2150, 0.85, 'sine', 0.15, 0.06);
        });
      }
    }

    // Continuous Pad Mood / Frequency Envelope
    let padTarget = 0.12;
    let padCutoff = 540;
    let f1 = 146.83;
    let f2 = 220.0;
    let f3 = 293.66;

    if (chapterId === 'earth_farewell') {
      f1 = 130.81; // C3
      f2 = 196.0; // G3
      f3 = 329.63; // E4
      padTarget = 0.13;
      padCutoff = 620;
    } else if (chapterId === 'boarding') {
      f1 = 146.83;
      f2 = 220.0;
      f3 = 293.66;
      padTarget = 0.14;
      padCutoff = 480;
    } else if (chapterId === 'launch') {
      padTarget = ignited ? 0.08 : 0.16;
      f1 = 146.83;
      f2 = 220.0;
      f3 = 349.23;
      padCutoff = 760;
    } else if (chapterId === 'transit_8_months') {
      const shift = localTime > 6.5 ? 1.122 : 1.0; // D -> E uplifting cosmic modulation
      f1 = 146.83 * shift;
      f2 = 220.0 * shift;
      f3 = 369.99 * shift;
      padTarget = 0.18;
      padCutoff = 560 + Math.sin(localTime * 0.7) * 200;
    } else if (chapterId === 'mars_landing' || chapterId === 'mars_arrival_timelapse') {
      f1 = 130.81;
      f2 = 196.0;
      f3 = 311.13; // Cm atmospheric
      padTarget = 0.12;
      padCutoff = 460;
    } else if (chapterId === 'storm_evacuation') {
      if (localTime < 5.8) {
        padTarget = localTime < 1.6 ? 0.09 : 0.13;
        f1 = 130.81;
        f2 = 196.0;
        f3 = 311.13;
        padCutoff = 460;
      } else {
        padTarget = localTime > 15.8 ? 0 : 0.12;
        f1 = 110.0;
        f2 = 155.56;
        f3 = 233.08;
        padCutoff = 380;
      }
    } else if (chapterId === 'awakening') {
      padTarget = localTime > 2.2 ? 0.12 : 0.02;
      f1 = 130.81;
      f2 = 196.0;
      f3 = 261.63;
      padCutoff = 440;
    }

    this.padGain?.gain.setTargetAtTime(padTarget, now, 0.18);
    this.padFilter?.frequency.setTargetAtTime(padCutoff, now, 0.2);
    this.padOsc1?.frequency.setTargetAtTime(f1, now, 0.25);
    this.padOsc2?.frequency.setTargetAtTime(f2, now, 0.25);
    this.padOsc3?.frequency.setTargetAtTime(f3, now, 0.25);

    // Continuous Rocket / Thruster Roar
    let rumbleTarget = 0;
    let rumbleFreq = 220;
    if (chapterId === 'launch' && ignited) {
      rumbleTarget = localTime < 11.5 ? 0.72 : 0.35;
      rumbleFreq = localTime < 9.5 ? 380 : 180;
    } else if (chapterId === 'mars_landing' && localTime < 7.8) {
      rumbleTarget = 0.38;
      rumbleFreq = 280;
    } else if (chapterId === 'storm_evacuation' && localTime >= 12.2 && localTime < 16.0) {
      rumbleTarget = 0.56;
      rumbleFreq = 320;
    }
    this.rumbleGain?.gain.setTargetAtTime(rumbleTarget, now, 0.12);
    this.rumbleFilter?.frequency.setTargetAtTime(rumbleFreq, now, 0.12);

    // Continuous Wind & Airlock Hiss
    let stormTarget = 0;
    let stormFreq = 380;
    if (chapterId === 'boarding' && localTime > 3.2 && localTime < 4.5) {
      stormTarget = 0.22;
      stormFreq = 1050;
    } else if (chapterId === 'storm_evacuation') {
      if (localTime < 5.8) {
        stormTarget = 0.08 + Math.max(0, (localTime - 3.8) * 0.03);
        stormFreq = 320;
      } else {
        const ramp = Math.min(1, (localTime - 5.8) / 6.8);
        stormTarget = localTime > 16.2 ? 0.12 : 0.14 + ramp * 0.64;
        stormFreq = 360 + ramp * 120 + Math.sin(localTime * 2.6) * 160;
      }
    } else if (chapterId === 'mars_arrival_timelapse') {
      stormTarget = 0.13;
      stormFreq = 340;
    } else if (chapterId === 'awakening') {
      stormTarget = 0.11;
      stormFreq = 310;
    }
    this.stormGain?.gain.setTargetAtTime(stormTarget, now, 0.15);
    this.stormFilter?.frequency.setTargetAtTime(stormFreq, now, 0.15);
  }
}
