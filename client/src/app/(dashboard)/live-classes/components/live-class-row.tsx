"use client";

import { Calendar, Clock, Pencil, Play, Square, User, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  LiveClassSession,
  useCancelLiveClassMutation,
  useEndLiveClassMutation,
  useStartLiveClassMutation,
} from "@/features/academic/liveClassesApi";

import { LiveClassStatusBadge } from "./live-class-status-badge";

interface LiveClassRowProps {
  session: LiveClassSession;
  onReschedule: (session: LiveClassSession) => void;
}

export function LiveClassRow({ session, onReschedule }: LiveClassRowProps) {
  const [startLiveClass, { isLoading: isStarting }] = useStartLiveClassMutation();
  const [endLiveClass, { isLoading: isEnding }] = useEndLiveClassMutation();
  const [cancelLiveClass, { isLoading: isCancelling }] = useCancelLiveClassMutation();

  const handleStart = async () => {
    try {
      await startLiveClass(session.id).unwrap();
      toast.success("Live class started.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to start live class.");
    }
  };

  const handleEnd = async () => {
    try {
      await endLiveClass(session.id).unwrap();
      toast.success("Live class ended.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to end live class.");
    }
  };

  const handleCancel = async () => {
    try {
      await cancelLiveClass(session.id).unwrap();
      toast.success("Live class cancelled.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to cancel live class.");
    }
  };

  const isBusy = isStarting || isEnding || isCancelling;

  return (
    <tr className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50">
      <td className="py-3">
        <p className="text-xs font-semibold text-foreground">
          {session.topic ?? session.moduleItem?.title ?? "Untitled session"}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {session.batch?.name} ({session.batch?.code})
        </p>
      </td>
      <td className="py-3">
        <span className="flex items-center gap-1.5 text-xs text-foreground">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          {session.teacher ? `${session.teacher.firstName} ${session.teacher.lastName}` : "—"}
        </span>
      </td>
      <td className="py-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(session.date).toLocaleDateString()}
        </span>
        <span className="mt-0.5 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {session.startTime
            ? new Date(session.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
          {" – "}
          {session.endTime
            ? new Date(session.endTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      </td>
      <td className="py-3">
        <LiveClassStatusBadge status={session.status} />
      </td>
      <td className="py-3 text-right">
        <div className="flex justify-end gap-1.5">
          {session.status === "SCHEDULED" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={handleStart}
                aria-label="Start live class"
              >
                <Play className="h-3.5 w-3.5" />
                Start
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isBusy}
                onClick={() => onReschedule(session)}
                aria-label="Reschedule live class"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isBusy}
                onClick={handleCancel}
                aria-label="Cancel live class"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          {session.status === "LIVE" && (
            <Button
              size="sm"
              variant="outline"
              disabled={isBusy}
              onClick={handleEnd}
              aria-label="End live class"
            >
              <Square className="h-3.5 w-3.5" />
              End
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
