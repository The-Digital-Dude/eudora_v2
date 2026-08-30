"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClioPhraseKey } from "./clioPhrases";
import { clioVoice, type ClioVoiceState } from "./clioVoiceService";

export function useClioVoice() {
  const [isMuted, setIsMuted] = useState<boolean>(() => clioVoice.getMuted());
  const [voiceState, setVoiceState] = useState<ClioVoiceState>(() => clioVoice.getState());

  useEffect(() => {
    const unsubState = clioVoice.subscribeState((state) => {
      setVoiceState(state);
    });
    const unsubMute = clioVoice.subscribeMute((muted) => {
      setIsMuted(muted);
    });

    return () => {
      unsubState();
      unsubMute();
    };
  }, []);

  const toggleMute = useCallback(() => {
    return clioVoice.toggleMute();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    clioVoice.setMuted(muted);
  }, []);

  const playPhrase = useCallback(
    (
      key: ClioPhraseKey,
      opts?: {
        interrupt?: boolean;
        onStart?: () => void;
        onEnd?: () => void;
      }
    ) => {
      return clioVoice.playPhrase(key, opts);
    },
    []
  );

  const speakText = useCallback(
    (
      text: string,
      opts?: {
        interrupt?: boolean;
        onStart?: () => void;
        onEnd?: () => void;
        rate?: number;
        pitch?: number;
      }
    ) => {
      return clioVoice.speakText(text, opts);
    },
    []
  );

  const speakLines = useCallback(
    (
      texts: string[],
      opts?: {
        interrupt?: boolean;
        onStart?: () => void;
        onEnd?: () => void;
      }
    ) => {
      return clioVoice.speakLines(texts, opts);
    },
    []
  );

  const stop = useCallback(() => {
    clioVoice.stop();
  }, []);

  return {
    isMuted,
    isSpeaking: voiceState === "speaking",
    voiceState,
    toggleMute,
    setMuted,
    playPhrase,
    speakText,
    speakLines,
    stop,
  };
}
