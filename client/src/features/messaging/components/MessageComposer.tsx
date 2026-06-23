"use client";

import React, { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { usePostMessageMutation } from "../messagingApi";
import { toast } from "sonner";

interface MessageComposerProps {
  threadId: string;
}

export function MessageComposer({ threadId }: MessageComposerProps) {
  const [body, setBody] = useState("");
  const [postMessage, { isLoading }] = usePostMessageMutation();

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    try {
      await postMessage({ threadId, body: body.trim() }).unwrap();
      setBody("");
    } catch (err: any) {
      console.error("Failed to send message", err);
      toast.error(err?.data?.message || "Failed to send message.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <form
      onSubmit={handleSend}
      className="border-t border-zinc-200/50 p-4 bg-white/45 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md flex items-end gap-3"
    >
      <div className="flex-1 relative">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send)"
          rows={1}
          disabled={isLoading}
          className="w-full resize-none rounded-2xl border border-zinc-200/80 bg-zinc-50/50 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:text-zinc-100 dark:focus:border-indigo-500/50 min-h-[44px] max-h-[120px] transition-all duration-200"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !body.trim()}
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all duration-200 shadow-lg shadow-indigo-600/10 cursor-pointer"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </button>
    </form>
  );
}
