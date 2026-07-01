"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
  remarks: string | null;
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[];
}

export function AttendanceCalendar({ records }: AttendanceCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const firstDayOfMonth = startOfMonth(currentMonth);
  const lastDayOfMonth = endOfMonth(currentMonth);
  
  const days = eachDayOfInterval({
    start: firstDayOfMonth,
    end: lastDayOfMonth,
  });

  const startDayOfWeek = getDay(firstDayOfMonth); // 0 (Sunday) to 6 (Saturday)

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Calendar stats
  const totalInMonth = days.filter((d) => d <= new Date()).length;
  const monthRecords = records.filter((r) => isSameMonth(new Date(r.date), currentMonth));

  const stats = React.useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    monthRecords.forEach((r) => {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    });
    return counts;
  }, [monthRecords]);

  // Color mapping
  const statusConfig = {
    PRESENT: {
      bg: "bg-success/10 text-success border-success/20",
      dot: "bg-success",
    },
    ABSENT: {
      bg: "bg-destructive/10 text-destructive border-destructive/20",
      dot: "bg-destructive",
    },
    LATE: {
      bg: "bg-warning/10 text-warning border-warning/20 dark:border-warning/10",
      dot: "bg-warning",
    },
    EXCUSED: {
      bg: "bg-primary/10 text-primary border-primary/20",
      dot: "bg-primary",
    },
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-3xl border border-border/50 bg-card/40 p-6 shadow-xl shadow-black/5/50/20 backdrop-blur-md flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border/50/40 pb-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2 text-base">
          <CalendarCheck className="h-5 w-5 text-primary" />
          Attendance Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4. w-4" />
          </button>
          <span className="text-xs font-bold text-foreground min-w-[100px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
          >
            <ChevronRight className="h-4. w-4" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold tracking-wider text-muted-foreground uppercase py-1">
            {d}
          </div>
        ))}

        {/* Padding cells */}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Month Day cells */}
        {days.map((day) => {
          const record = records.find((r) => isSameDay(new Date(r.date), day));
          const config = record ? statusConfig[record.status] : null;

          return (
            <div
              key={day.toString()}
              className={`aspect-square flex flex-col items-center justify-between p-2 rounded-2xl border text-xs font-bold transition-all relative ${
                config
                  ? config.bg
                  : "bg-muted/50 border-border text-foreground0/10/10"
              }`}
              title={record && record.remarks ? `${record.status}: ${record.remarks}` : record?.status || "Unrecorded"}
            >
              <span>{format(day, "d")}</span>
              {config && (
                <div className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border/50/40 pt-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-success/25 border border-success/30" />
          <span className="text-muted-foreground">Present:</span>
          <span className="text-foreground">{stats.PRESENT}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-destructive/25 border border-destructive/30" />
          <span className="text-muted-foreground">Absent:</span>
          <span className="text-foreground">{stats.ABSENT}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-warning/25 border border-warning/30" />
          <span className="text-muted-foreground">Late:</span>
          <span className="text-foreground">{stats.LATE}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-primary/25 border border-primary/30" />
          <span className="text-muted-foreground">Excused:</span>
          <span className="text-foreground">{stats.EXCUSED}</span>
        </div>
      </div>
    </div>
  );
}
