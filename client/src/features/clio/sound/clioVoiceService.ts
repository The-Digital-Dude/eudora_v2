import {
  CLIO_PHRASES,
  CLIO_SPOKEN_LINES,
  CLIO_VOICE_CONFIG,
  CLIO_VOICE_LINES,
  type ClioPhraseKey,
  getRandomClioPhrase,
  normalizeMathForSpeech,
} from "./clioPhrases";

const STORAGE_KEY_MUTED = "eudora_clio_voice_muted";

// Default voice preference used when the user has not made an explicit choice.
// Every phrase in the catalog is English, so the default must be too — a
// kid-friendly US English voice, matching the tone mobile's expo-speech
// lookup targets (see FEMALE_VOICE_HINTS in mobile's voiceFeedback.ts).
const DEFAULT_VOICE_HINTS = ["google us english", "samantha", "zira", "female"];

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
  /** The pre-generated line currently playing, if any. */
  private activeAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const savedMute = localStorage.getItem(STORAGE_KEY_MUTED);
        this.isMuted = savedMute === "true";
      } catch {
        this.isMuted = false;
      }
    }
  }

  private findVoiceByHints(
    voices: SpeechSynthesisVoice[],
    hints: string[]
  ): SpeechSynthesisVoice | null {
    for (const hint of hints) {
      const found = voices.find((v) =>
        `${v.name} ${v.lang}`.toLowerCase().includes(hint)
      );
      if (found) return found;
    }
    return null;
  }

  /**
   * The closest platform voice to Clio, used only for lines that have no
   * pre-generated audio yet.
   *
   * There is deliberately no per-user override any more. Clio is a character
   * with a mascot and a personality spec, and letting every viewer reassign
   * her voice is the opposite of having one — the picker that did this was
   * removed along with the move to pre-generated audio.
   */
  private getBestVoice(): SpeechSynthesisVoice | null {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    return (
      this.findVoiceByHints(voices, DEFAULT_VOICE_HINTS) ??
      this.findVoiceByHints(voices, CLIO_VOICE_CONFIG.preferredVoiceHints) ??
      voices.find((v) => v.lang === "en-US" || v.lang === "en_US") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
      voices[0] ??
      null
    );
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

    // A pre-generated line has to be stopped too, or interrupting mid-phrase
    // silences the synthesiser and leaves Clio's recorded voice still talking.
    if (this.activeAudio) {
      try {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.activeAudio = null;
    }

    activeUtterances.clear();
    this.setState("idle");
  }

  /**
   * Play a standard predefined Clio phrase (e.g. 'CORRECT', 'INCORRECT', 'TAKE_A_HINT')
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
    else if (key === "INCORRECT") playWebAudioChime("incorrect");
    else if (key === "TAKE_A_HINT") playWebAudioChime("hint");
    else if (key === "LESSON_COMPLETE") playWebAudioChime("complete");

    // Prefer Clio's own recorded voice. Pre-generated per variant by
    // voice/generate-voice-lines.mjs, so she sounds like one character on
    // every device instead of whatever voice the browser happens to ship.
    // Falls through to the synthesiser for any line not yet generated —
    // which is every line until that script has been run with a key.
    const variantIndex = this.pickVariantIndex(key);
    const src = CLIO_VOICE_LINES[key]?.[variantIndex];
    if (src && this.playAudioFile(src, opts)) {
      return true;
    }

    const text = CLIO_PHRASES[key][variantIndex] ?? getRandomClioPhrase(key);
    return this.speakText(text, opts);
  }

  /** Chosen once per call so the spoken text and the audio file agree. */
  private pickVariantIndex(key: ClioPhraseKey): number {
    return Math.floor(Math.random() * CLIO_PHRASES[key].length);
  }

  /**
   * Returns false rather than throwing when the file is missing, so the
   * caller can fall back. A 404 surfaces asynchronously through `onerror`,
   * so a missing file mid-rollout degrades to silence for that one line
   * rather than to a broken lesson.
   */
  private playAudioFile(
    src: string,
    opts: { interrupt?: boolean; onStart?: () => void; onEnd?: () => void },
  ): boolean {
    if (typeof window === "undefined" || typeof Audio === "undefined") {
      return false;
    }

    const { interrupt = true, onStart, onEnd } = opts;
    if (interrupt) this.stop();

    try {
      const audio = new Audio(src);
      this.activeAudio = audio;
      this.setState("speaking");
      onStart?.();

      const finish = () => {
        if (this.activeAudio === audio) {
          this.activeAudio = null;
          this.setState("idle");
        }
        onEnd?.();
      };
      audio.onended = finish;
      audio.onerror = finish;

      void audio.play().catch(finish);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Speaks several lines back to back, as one utterance would have.
   *
   * Exists because recordings are keyed on the exact line. Joining two lines
   * into one string — "intro + prompt", say — produces a key no recording can
   * have, so the joined version silently fell through to the device
   * synthesiser while the same words played in Clio's own voice everywhere
   * else. Passing the lines separately keeps each one matchable.
   *
   * Chained on completion rather than scheduled by duration: the audio knows
   * how long it is and a timer does not.
   */
  public speakLines(
    texts: string[],
    opts: {
      interrupt?: boolean;
      onStart?: () => void;
      onEnd?: () => void;
    } = {},
  ): boolean {
    const lines = texts.filter((t) => t && t.trim().length > 0);
    if (lines.length === 0) return false;

    const { interrupt = true, onStart, onEnd } = opts;

    const speakFrom = (index: number, isFirst: boolean): boolean =>
      this.speakText(lines[index], {
        // Only the first line clears what was playing; the rest must not
        // interrupt the line they are continuing from.
        interrupt: isFirst ? interrupt : false,
        onStart: isFirst ? onStart : undefined,
        onEnd: () => {
          if (index + 1 < lines.length) {
            speakFrom(index + 1, false);
          } else {
            onEnd?.();
          }
        },
      });

    return speakFrom(0, true);
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

    // A line with its own recording is played rather than synthesised, so a
    // scripted lesson keeps one voice throughout. Matched on the exact string:
    // editing the copy without regenerating simply misses and falls back,
    // which is right — it can never play audio of the previous wording.
    const recorded = CLIO_SPOKEN_LINES[rawText];
    if (recorded && this.playAudioFile(recorded, opts)) {
      return true;
    }

    // Everything below is the device's own synthesiser, not Clio. It is a
    // different voice, and the difference is audible the moment both play in
    // one sitting.
    //
    // Reachable from exactly one place: the real lesson player, whose
    // questions and hints are authored per lesson in the database and so can
    // never be pre-recorded by a generator run by hand. The scripted marketing
    // demo must never land here, and no longer can — `--check` in
    // voice/generate-voice-lines.mjs fails CI if any demo line lacks a
    // recording.
    //
    // Replacing this with real speech means synthesising lesson text on
    // demand, which is a server round trip per question against a metered
    // quota. Until that is affordable, a child who needs the question read
    // aloud gets the device voice rather than silence.
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
