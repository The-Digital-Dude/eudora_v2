"use client";

import { formatDistanceToNow } from "date-fns";
import {MessageSquare, Plus } from "lucide-react";
import React from "react";

import type { MessageThread } from "../messagingApi";

interface ThreadListProps {
  threads: MessageThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThreadClick: () => void;
  currentUserId: string;
}

export function ThreadList({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThreadClick,
  currentUserId,
}: ThreadListProps) {
  return (
    <div className="flex h-full flex-col border-r border-border/50 bg-card/40 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Conversations
        </h2>
        <button
          onClick={onNewThreadClick}
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary active:scale-95 transition-all duration-200 shadow-lg shadow-primary/10"
          title="New Message"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a thread to contact teachers.</p>
          </div>
        ) : (
          threads.map((thread) => {
            const isActive = thread.id === activeThreadId;
            const lastMsg = thread.messages?.[0];
            
            // Determine display name
            const isGuardian = thread.guardianUserId === currentUserId;
            const partner = isGuardian ? thread.teacher : thread.guardian;
            const partnerName = partner ? `${partner.firstName} ${partner.lastName}` : "Participant";

            return (
              <button
                key={thread.id}
                onClick={() => onSelectThread(thread.id)}
                className={`w-full flex flex-col items-start gap-1 p-3 rounded-2xl transition-all duration-200 text-left border ${
                  isActive
                    ? "bg-primary/10 border-primary/30"
                    : "bg-transparent border-transparent hover:bg-muted/50"
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-foreground truncate">
                    {partnerName}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {thread.lastMessageAt
                      ? formatDistanceToNow(new Date(thread.lastMessageAt), { addSuffix: true })
                      : ""}
                  </span>
                </div>

                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {thread.subject}
                  </span>
                  {thread.unreadCount && thread.unreadCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                      {thread.unreadCount}
                    </span>
                  ) : null}
                </div>

                {thread.studentProfile && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/80 text-muted-foreground font-medium">
                    Child: {thread.studentProfile.fullName}
                  </span>
                )}

                {lastMsg && (
                  <p className="text-xs text-muted-foreground truncate w-full mt-1">
                    {lastMsg.senderUserId === currentUserId ? "You: " : ""}
                    {lastMsg.body}
                  </p>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
