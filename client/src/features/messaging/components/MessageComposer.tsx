"use client";

import { Loader2,Send } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

import { usePostMessageMutation } from "../messagingApi";

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
      className="border-t border-border/50 p-4 bg-card/45 backdrop-blur-md flex items-end gap-3"
    >
      <div className="flex-1 relative">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send)"
          rows={1}
          disabled={isLoading}
          className="w-full resize-none rounded-2xl border border-border/80 bg-muted/50 px-4 py-3 text-sm focus:border-primary focus:outline-none min-h-[44px] max-h-[120px] transition-all duration-200"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !body.trim()}
        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground hover:bg-primary active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all duration-200 shadow-lg shadow-primary/10 cursor-pointer"
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
