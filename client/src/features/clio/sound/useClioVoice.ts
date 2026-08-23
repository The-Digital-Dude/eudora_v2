"use client";

import { useCallback, useEffect, useState } from "react";

import type { ClioPhraseKey } from "./clioPhrases";
import { clioVoice, type ClioVoiceState } from "./clioVoiceService";

export function useClioVoice() {
  const [isMuted, setIsMuted] = useState<boolean>(() => clioVoice.getMuted());
  const [voiceState, setVoiceState] = useState<ClioVoiceState>(() => clioVoice.getState());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>(() =>
    clioVoice.getAvailableVoices()
  );
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(() =>
    clioVoice.getSelectedVoiceURI()
  );

  useEffect(() => {
    const unsubState = clioVoice.subscribeState((state) => {
      setVoiceState(state);
    });
    const unsubMute = clioVoice.subscribeMute((muted) => {
      setIsMuted(muted);
    });
    const unsubVoices = clioVoice.subscribeVoices((voices) => {
      setAvailableVoices(voices);
    });
    const unsubSelected = clioVoice.subscribeSelectedVoice((uri) => {
      setSelectedVoiceURI(uri);
    });

    return () => {
      unsubState();
      unsubMute();
      unsubVoices();
      unsubSelected();
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

  const stop = useCallback(() => {
    clioVoice.stop();
  }, []);

  const selectVoice = useCallback((uri: string | null) => {
    clioVoice.setSelectedVoiceURI(uri);
  }, []);

  return {
    isMuted,
    isSpeaking: voiceState === "speaking",
    voiceState,
    availableVoices,
    selectedVoiceURI,
    selectVoice,
    toggleMute,
    setMuted,
    playPhrase,
    speakText,
    stop,
  };
}
