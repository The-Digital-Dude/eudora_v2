import {
  CLIO_VOICE_CONFIG,
  type ClioPhraseKey,
  getRandomClioPhrase,
  normalizeMathForSpeech,
} from "./clioPhrases";

const STORAGE_KEY_MUTED = "eudora_clio_voice_muted";

export type ClioVoiceState = "idle" | "speaking" | "paused";

type VoiceStateListener = (state: ClioVoiceState) => void;
type MuteStateListener = (muted: boolean) => void;

// Active utterance pool to prevent Chromium garbage collection from cancelling audio
const activeUtterances = new Set<SpeechSynthesisUtterance>();

/**
 * Procedural Web Audio chime generator (runs entirely in browser with zero dependencies)
 */
function playWebAudioChime(type: "correct" | "incorrect" | "hint" | "complete") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    if (type === "correct") {
      // Cheerful ascending major triad (C5 -> E5 -> G5)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.15, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.35);
      });
    } else if (type === "incorrect") {
      // Gentle soft two-tone nudge (no harsh buzzer)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.setValueAtTime(293.66, now + 0.12); // D4
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === "hint") {
      // Sparkle light chime (A5 -> D6)
      [880, 1174.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.1, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } else if (type === "complete") {
      // Flourish arpeggio (C5 -> E5 -> G5 -> C6)
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.18, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.6);
      });
    }
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

class ClioVoiceService {
  private isMuted: boolean = false;
  private currentState: ClioVoiceState = "idle";
  private voiceListeners = new Set<VoiceStateListener>();
  private muteListeners = new Set<MuteStateListener>();
  private resumeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = localStorage.getItem(STORAGE_KEY_MUTED);
        this.isMuted = savedMute === "true";
      } catch {
        this.isMuted = false;
      }
      this.initVoiceLookup();
    }
  }

  private initVoiceLookup() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
      window.speechSynthesis.onvoiceschanged = () => {
        // Trigger voice list refresh
        window.speechSynthesis.getVoices();
      };
    }
  }

  private getBestVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Try finding tuned kid-friendly / female voice candidates
    for (const hint of CLIO_VOICE_CONFIG.preferredVoiceHints) {
      const found = voices.find((v) => {
        const combined = `${v.name} ${v.lang}`.toLowerCase();
        return combined.includes(hint);
      });
      if (found) return found;
    }

    // 2. Try any English voice
    const enUs = voices.find((v) => v.lang === "en-US" || v.lang === "en_US");
    if (enUs) return enUs;

    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (anyEn) return anyEn;

    return voices[0] || null;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY_MUTED, String(muted));
      } catch {
        // ignore
      }
    }
    if (muted) {
      this.stop();
    }
    this.muteListeners.forEach((listener) => listener(muted));
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    return next;
  }

  public getState(): ClioVoiceState {
    return this.currentState;
  }

  public subscribeState(listener: VoiceStateListener): () => void {
    this.voiceListeners.add(listener);
    listener(this.currentState);
    return () => this.voiceListeners.delete(listener);
  }

  public subscribeMute(listener: MuteStateListener): () => void {
    this.muteListeners.add(listener);
    listener(this.isMuted);
    return () => this.muteListeners.delete(listener);
  }

  private setState(state: ClioVoiceState) {
    this.currentState = state;
    this.voiceListeners.forEach((l) => l(state));
  }

  public stop() {
    if (this.resumeTimer) {
      clearInterval(this.resumeTimer);
      this.resumeTimer = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    activeUtterances.clear();
    this.setState("idle");
  }

  /**
   * Play a standard predefined Clio phrase (e.g. 'CORRECT', 'TRY_AGAIN', 'TAKE_A_HINT')
   */
  public playPhrase(
    key: ClioPhraseKey,
    opts: {
      interrupt?: boolean;
      onStart?: () => void;
      onEnd?: () => void;
    } = {}
  ): boolean {
    if (this.isMuted) return false;

    // Trigger chime sound effect in parallel
    if (key === "CORRECT") playWebAudioChime("correct");
    else if (key === "TRY_AGAIN") playWebAudioChime("incorrect");
    else if (key === "TAKE_A_HINT") playWebAudioChime("hint");
    else if (key === "LESSON_COMPLETE") playWebAudioChime("complete");

    const text = getRandomClioPhrase(key);
    return this.speakText(text, opts);
  }

  /**
   * Speak arbitrary text (questions, hints, math explanations)
   */
  public speakText(
    rawText: string,
    opts: {
      interrupt?: boolean;
      onStart?: () => void;
      onEnd?: () => void;
      rate?: number;
      pitch?: number;
    } = {}
  ): boolean {
    if (this.isMuted) return false;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

    const {
      interrupt = true,
      onStart,
      onEnd,
      rate = CLIO_VOICE_CONFIG.rate,
      pitch = CLIO_VOICE_CONFIG.pitch,
    } = opts;

    const speechText = normalizeMathForSpeech(rawText);
    if (!speechText) return false;

    // Unstick any frozen speech in Chromium
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    if (interrupt) {
      this.stop();
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    const voice = this.getBestVoice();
    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;
    utterance.lang = "en-US";

    activeUtterances.add(utterance);

    // Keep speech active in Chromium by periodically resuming
    if (!this.resumeTimer) {
      this.resumeTimer = setInterval(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }
      }, 5000);
    }

    utterance.onstart = () => {
      this.setState("speaking");
      onStart?.();
    };

    const cleanup = () => {
      activeUtterances.delete(utterance);
      if (activeUtterances.size === 0) {
        if (this.resumeTimer) {
          clearInterval(this.resumeTimer);
          this.resumeTimer = null;
        }
        this.setState("idle");
      }
      onEnd?.();
    };

    utterance.onend = cleanup;

    utterance.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") {
        console.warn("Clio voice notice:", e.error);
      }
      cleanup();
    };

    try {
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn("Speech synthesis error:", err);
      cleanup();
      return false;
    }
  }
}

export const clioVoice = new ClioVoiceService();
