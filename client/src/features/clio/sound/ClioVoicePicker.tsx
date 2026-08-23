"use client";

import { useState } from "react";

import { useClioVoice } from "./useClioVoice";

export function ClioVoicePicker() {
  const { availableVoices, selectedVoiceURI, selectVoice, speakText, isMuted } =
    useClioVoice();
  const [previewing, setPreviewing] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uri = e.target.value || null;
    selectVoice(uri);
    if (uri) {
      setPreviewing(true);
      void speakText(`Hi, I'm Clio! This is how I sound now.`, {
        onEnd: () => setPreviewing(false),
      });
    }
  };

  const handlePreview = () => {
    setPreviewing(true);
    void speakText(`Hi, I'm Clio! Let's explore some maths together.`, {
      onEnd: () => setPreviewing(false),
    });
  };

  return (
    <div className="flex w-full flex-col gap-1.5 rounded-xl border border-border bg-background/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Clio&apos;s Voice
        </span>
        <button
          type="button"
          onClick={handlePreview}
          disabled={isMuted || previewing}
          className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 cursor-pointer"
          title="Preview Clio's voice"
        >
          {previewing ? "…" : "Preview"}
        </button>
      </div>
      <select
        value={selectedVoiceURI ?? ""}
        onChange={handleChange}
        disabled={isMuted}
        className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        title="Choose the voice Clio speaks with"
      >
        <option value="">Auto (system)</option>
        {availableVoices.map((v) => (
          <option key={v.voiceURI} value={v.voiceURI}>
            {v.name} ({v.lang})
          </option>
        ))}
      </select>
    </div>
  );
}
