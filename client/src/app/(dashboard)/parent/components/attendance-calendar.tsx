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
      bg: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-500/20 dark:border-emerald-500/10",
      dot: "bg-emerald-500",
    },
    ABSENT: {
      bg: "bg-rose-500/10 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border-rose-500/20 dark:border-rose-500/10",
      dot: "bg-rose-500",
    },
    LATE: {
      bg: "bg-amber-500/10 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border-amber-500/20 dark:border-amber-500/10",
      dot: "bg-amber-500",
    },
    EXCUSED: {
      bg: "bg-sky-500/10 text-sky-600 dark:bg-sky-950/20 dark:text-sky-400 border-sky-500/20 dark:border-sky-500/10",
      dot: "bg-sky-500",
    },
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 p-6 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-2 text-base">
          <CalendarCheck className="h-5 w-5 text-indigo-500" />
          Attendance Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            <ChevronLeft className="h-4. w-4" />
          </button>
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 min-w-[100px] text-center">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 cursor-pointer"
          >
            <ChevronRight className="h-4. w-4" />
          </button>
        </div>
      </div>

      {/* Grid view */}
      <div className="grid grid-cols-7 gap-2">
        {weekdays.map((d) => (
          <div key={d} className="text-center text-[10px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase py-1">
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
                  : "bg-zinc-50 border-zinc-100 text-zinc-500 dark:bg-zinc-900/10 dark:border-zinc-800/10 dark:text-zinc-600"
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-emerald-500/25 border border-emerald-500/30" />
          <span className="text-zinc-500 dark:text-zinc-400">Present:</span>
          <span className="text-zinc-800 dark:text-zinc-200">{stats.PRESENT}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-rose-500/25 border border-rose-500/30" />
          <span className="text-zinc-500 dark:text-zinc-400">Absent:</span>
          <span className="text-zinc-800 dark:text-zinc-200">{stats.ABSENT}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-amber-500/25 border border-amber-500/30" />
          <span className="text-zinc-500 dark:text-zinc-400">Late:</span>
          <span className="text-zinc-800 dark:text-zinc-200">{stats.LATE}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-md bg-sky-500/25 border border-sky-500/30" />
          <span className="text-zinc-500 dark:text-zinc-400">Excused:</span>
          <span className="text-zinc-800 dark:text-zinc-200">{stats.EXCUSED}</span>
        </div>
      </div>
    </div>
  );
}
