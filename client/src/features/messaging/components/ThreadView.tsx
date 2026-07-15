"use client";

import { format } from "date-fns";
import { FileText } from "lucide-react";
import React, { useEffect, useRef } from "react";

import type { MessageThread } from "../messagingApi";
import { useMarkThreadReadMutation } from "../messagingApi";

interface ThreadViewProps {
  thread: MessageThread;
  currentUserId: string;
}

export function ThreadView({ thread, currentUserId }: ThreadViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [markRead] = useMarkThreadReadMutation();

  // Scroll to bottom on load or new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages]);

  // Mark thread as read
  useEffect(() => {
    if (thread.unreadCount && thread.unreadCount > 0) {
      markRead(thread.id);
    }
  }, [thread.id, thread.messages, thread.unreadCount, markRead]);

  const isGuardian = thread.guardianUserId === currentUserId;
  const partner = isGuardian ? thread.teacher : thread.guardian;
  const partnerName = partner ? `${partner.firstName} ${partner.lastName}` : "Participant";

  return (
    <div className="flex h-full flex-col bg-muted/50/10">
      {/* Header */}
      <div className="flex flex-col border-b border-border/50 p-4 bg-card/40/50/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-sm">
            {partner ? `${partner.firstName[0]}${partner.lastName[0]}` : "P"}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {partnerName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isGuardian ? "Teacher" : "Parent/Guardian"}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
          <span className="text-xs font-semibold text-foreground">
            Subject: {thread.subject}
          </span>
          {thread.studentProfile && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 dark:bg-primary/10 text-primary font-medium">
              Regarding: {thread.studentProfile.fullName}
            </span>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {thread.messages && thread.messages.length > 0 ? (
          thread.messages.map((message) => {
            const isMe = message.senderUserId === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex flex-col max-w-[70%] gap-1 ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10"
                        : "bg-card border border-border/50 text-foreground/50 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.body}</p>
                    
                    {message.attachmentUrls && message.attachmentUrls.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {message.attachmentUrls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-1.5 text-xs p-1.5 rounded-lg border ${
                              isMe
                                ? "bg-primary/70 hover:bg-primary/90 border-primary/30 text-white"
                                : "bg-muted/50 hover:bg-muted border-border text-foreground"
                            }`}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span className="truncate max-w-[150px]">Attachment {i + 1}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground px-1">
                    {format(new Date(message.createdAt), "hh:mm a")}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No messages in this thread yet.
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
