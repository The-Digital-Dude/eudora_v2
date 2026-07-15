"use client";

import { format, formatDistanceToNow } from "date-fns";
import { Calendar, CheckCircle,ClipboardCheck, Clock, PenTool } from "lucide-react";
import React from "react";

interface UpcomingItem {
  id: string;
  title: string;
  dueDate: string;
  type: "HOMEWORK" | "ASSESSMENT";
  courseName?: string;
}

interface UpcomingListProps {
  homework: any[];
  assessments: any[];
  isLoading: boolean;
}

export function UpcomingList({ homework, assessments, isLoading }: UpcomingListProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl/50/20 backdrop-blur-md">
        <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
          Loading upcoming tasks...
        </div>
      </div>
    );
  }

  // Merge and normalize
  const normalizedHomework: UpcomingItem[] = homework.map((hw) => ({
    id: hw.id,
    title: hw.title,
    dueDate: hw.dueDate,
    type: "HOMEWORK",
    courseName: hw.courseName,
  }));

  const normalizedAssessments: UpcomingItem[] = assessments.map((ass) => ({
    id: ass.id,
    title: ass.title,
    dueDate: ass.dueAt,
    type: "ASSESSMENT",
    courseName: "Assessment",
  }));

  const merged = [...normalizedHomework, ...normalizedAssessments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const getRelativeDueTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return "";
    }
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl shadow-black/5/50/20 backdrop-blur-md flex flex-col h-[350px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="h-4. w-4 text-primary" />
            What&apos;s Due Next
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Keep track of homework and upcoming assessments.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {merged.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-6 text-center text-muted-foreground">
            <CheckCircle className="h-10 w-10 text-success/30 mb-2" />
            <p className="text-xs font-semibold text-foreground0">All caught up!</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">No pending assessments or homework.</p>
          </div>
        ) : (
          merged.map((item) => {
            const isHw = item.type === "HOMEWORK";
            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-border/40 bg-card/30/30/10 flex items-start justify-between gap-3"
              >
                <div className="flex gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isHw ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"}`}>
                    {isHw ? <PenTool className="h-4 w-4" /> : <ClipboardCheck className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${isHw ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary"}`}>
                        {item.type}
                      </span>
                      {item.courseName && (
                        <span className="text-[9px] font-bold text-muted-foreground truncate max-w-[100px]">
                          {item.courseName}
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-xs text-foreground mt-1 truncate">
                      {item.title}
                    </h4>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black text-destructive block">
                    {getRelativeDueTime(item.dueDate)}
                  </span>
                  <span className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5 justify-end">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(item.dueDate), "MMM dd")}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
