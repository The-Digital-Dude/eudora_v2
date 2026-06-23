"use client";

import React, { useState } from "react";
import { MessageSquare, Plus, X, Send, Loader2, User } from "lucide-react";
import { useGetThreadsQuery, useGetThreadByIdQuery, useCreateThreadMutation } from "../messagingApi";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { MessageComposer } from "./MessageComposer";
import { useGetChildrenQuery, useGetChildTeachersQuery } from "@/features/parent/parentApi";
import { toast } from "sonner";

interface MessagingCenterProps {
  currentUserId: string;
  isGuardian: boolean;
}

export function MessagingCenter({ currentUserId, isGuardian }: MessagingCenterProps) {
  // Query all threads with polling for real-time messaging updates
  const { data: threads = [], isLoading: isThreadsLoading } = useGetThreadsQuery(undefined, {
    pollingInterval: 5000,
  });

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);

  // New thread form state
  const [subject, setSubject] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  const [createThread, { isLoading: isCreatingThread }] = useCreateThreadMutation();

  // For Guardian New Thread Dialog
  const { data: children = [] } = useGetChildrenQuery(undefined, {
    skip: !isGuardian || !showNewThreadModal,
  });

  // Query teachers for selected child
  const { data: teachers = [], isLoading: isTeachersLoading } = useGetChildTeachersQuery(selectedStudentId, {
    skip: !isGuardian || !showNewThreadModal || !selectedStudentId,
  });

  // Fetch active thread detail
  const { data: activeThread } = useGetThreadByIdQuery(activeThreadId || "", {
    skip: !activeThreadId,
    pollingInterval: 5000,
  });

  const handleStartThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !selectedTeacherId || !firstMessage.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      const result = await createThread({
        subject: subject.trim(),
        teacherUserId: selectedTeacherId,
        firstMessageBody: firstMessage.trim(),
        studentProfileId: selectedStudentId || undefined,
      }).unwrap();

      toast.success("Conversation started!");
      setShowNewThreadModal(false);
      // Reset form
      setSubject("");
      setSelectedStudentId("");
      setSelectedTeacherId("");
      setFirstMessage("");
      // Select the new thread
      setActiveThreadId(result.id);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to start conversation.");
    }
  };

  const handleChildChange = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSelectedTeacherId(""); // Reset teacher selection when child changes
  };

  return (
    <div className="flex h-[600px] w-full rounded-3xl border border-zinc-200/50 bg-white/40 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md overflow-hidden relative">
      {/* Thread list sidebar */}
      <div className="w-full md:w-80 flex-shrink-0">
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onNewThreadClick={() => {
            if (!isGuardian) {
              toast.error("Only parents/guardians can initiate message threads.");
              return;
            }
            setShowNewThreadModal(true);
          }}
          currentUserId={currentUserId}
        />
      </div>

      {/* Thread view / Conversation window */}
      <div className="hidden md:flex flex-1 flex-col h-full min-w-0">
        {activeThread ? (
          <>
            <div className="flex-1 overflow-hidden">
              <ThreadView thread={activeThread} currentUserId={currentUserId} />
            </div>
            <MessageComposer threadId={activeThread.id} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 p-6 text-center text-zinc-400 dark:text-zinc-500">
            <MessageSquare className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
            <h3 className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">No conversation selected</h3>
            <p className="text-xs mt-1">Choose a conversation from the list to view messages.</p>
          </div>
        )}
      </div>

      {/* Fallback for mobile overlays or small layouts when thread is active */}
      {activeThread && (
        <div className="md:hidden fixed inset-0 z-50 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center bg-white dark:bg-zinc-900">
            <button
              onClick={() => setActiveThreadId(null)}
              className="text-xs font-bold text-indigo-600 mr-4"
            >
              ← Back
            </button>
            <span className="text-sm font-semibold truncate">
              {activeThread.subject}
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ThreadView thread={activeThread} currentUserId={currentUserId} />
          </div>
          <MessageComposer threadId={activeThread.id} />
        </div>
      )}

      {/* New Thread Modal (Glassmorphic Card Overlay) */}
      {showNewThreadModal && (
        <div className="absolute inset-0 z-40 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                New Message Thread
              </h3>
              <button
                onClick={() => setShowNewThreadModal(false)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStartThread} className="space-y-4">
              {/* Select Child */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Select Child
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleChildChange(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  required
                >
                  <option value="">-- Choose Child --</option>
                  {children.map((child) => (
                    <option key={child.studentProfileId} value={child.studentProfileId}>
                      {child.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Teacher */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacherId}
                  disabled={!selectedStudentId || isTeachersLoading}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 disabled:opacity-50"
                  required
                >
                  <option value="">
                    {isTeachersLoading
                      ? "Loading teachers..."
                      : !selectedStudentId
                      ? "Select a child first"
                      : teachers.length === 0
                      ? "No teachers assigned to child's class"
                      : "-- Choose Teacher --"}
                  </option>
                  {teachers.map((teacher: any) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName} {teacher.specialization ? `(${teacher.specialization})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question about homework"
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  required
                />
              </div>

              {/* First Message Body */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
                  Message
                </label>
                <textarea
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Type your initial message here..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewThreadModal(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingThread || !selectedTeacherId}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all shadow-lg shadow-indigo-600/10 disabled:opacity-50"
                >
                  {isCreatingThread && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Start Conversation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
