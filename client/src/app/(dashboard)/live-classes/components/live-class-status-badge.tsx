import { LiveClassSession } from "@/features/academic/liveClassesApi";

const STATUS_STYLES: Record<LiveClassSession["status"], string> = {
  SCHEDULED: "border-border bg-muted/50 text-muted-foreground",
  LIVE: "border-success/20 bg-success/10 text-success",
  ENDED: "border-border bg-muted/30 text-muted-foreground",
  CANCELLED: "border-destructive/20 bg-destructive/10 text-destructive",
};

const STATUS_LABELS: Record<LiveClassSession["status"], string> = {
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  ENDED: "Ended",
  CANCELLED: "Cancelled",
};

export function LiveClassStatusBadge({ status }: { status: LiveClassSession["status"] }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${STATUS_STYLES[status]}`}
    >
      {status === "LIVE" && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
