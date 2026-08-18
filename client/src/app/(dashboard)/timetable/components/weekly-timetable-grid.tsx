"use client";

import { Clock,Edit3, MapPin, Plus, User } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Timetable, TimetableSlot } from "@/features/academic/timetableApi";

interface WeeklyTimetableGridProps {
  timetable: Timetable | null;
  onEditSlot: (slot: TimetableSlot) => void;
  onCreateSlot: (dayOfWeek: string, periodIndex: number) => void;
  canEdit?: boolean;
}

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"];
const DAY_LABELS: Record<string, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};

export function WeeklyTimetableGrid({
  timetable,
  onEditSlot,
  onCreateSlot,
  canEdit = true,
}: WeeklyTimetableGridProps) {
  const slots = React.useMemo(() => timetable?.slots ?? [], [timetable]);

  // Determine period indices (unique and sorted)
  const periodIndices = React.useMemo(() => {
    const indices = Array.from(new Set(slots.map((s) => s.periodIndex)));
    if (indices.length === 0) {
      return [1, 2, 3, 4, 5, 6];
    }
    return indices.sort((a, b) => a - b);
  }, [slots]);

  // Format time since midnight (e.g. 540 -> 09:00 AM)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(displayHours).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${ampm}`;
  };

  // Helper to get pastel background based on string hash
  const getColors = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return {
      bg: `hsl(${h}, 80%, 96%)`,
      border: `hsl(${h}, 70%, 85%)`,
      text: `hsl(${h}, 60%, 25%)`,
      darkBg: `hsl(${h}, 40%, 12%)`,
      darkBorder: `hsl(${h}, 40%, 20%)`,
      darkText: `hsl(${h}, 80%, 80%)`,
    };
  };

  return (
    <div className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-36 p-4 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Period
              </th>
              {DAYS_OF_WEEK.map((day) => (
                <th
                  key={day}
                  className="min-w-[180px] p-4 text-left text-xs font-bold tracking-wider text-foreground uppercase"
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periodIndices.map((periodIdx) => {
              // Find start and end times for this period if defined in any slots
              const periodSlots = slots.filter((s) => s.periodIndex === periodIdx);
              const timeRangeStr =
                periodSlots.length > 0
                  ? `${formatTime(periodSlots[0].startTimeMinutes)} - ${formatTime(periodSlots[0].endTimeMinutes)}`
                  : null;

              return (
                <tr
                  key={periodIdx}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-muted/20"
                >
                  {/* Period Identity Column */}
                  <td className="p-4 align-top">
                    <div className="space-y-1">
                      <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Period {periodIdx}
                      </span>
                      {timeRangeStr && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{timeRangeStr}</span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Days Columns */}
                  {DAYS_OF_WEEK.map((day) => {
                    const cellSlots = slots.filter(
                      (s) => s.dayOfWeek === day && s.periodIndex === periodIdx,
                    );

                    return (
                      <td
                        key={day}
                        className="border-l border-border/30 p-3 align-top first:border-0"
                      >
                        <div className="flex min-h-[90px] flex-col justify-between space-y-2">
                          {cellSlots.length > 0 ? (
                            <div className="space-y-2">
                              {cellSlots.map((slot) => {
                                const title =
                                  slot.batch?.name || slot.notes || "Homeroom/Unscheduled";
                                const colors = getColors(title);

                                return (
                                  <div
                                    key={slot.id}
                                    style={
                                      {
                                        "--slot-bg": colors.bg,
                                        "--slot-border": colors.border,
                                        "--slot-text": colors.text,
                                        "--slot-dark-bg": colors.darkBg,
                                        "--slot-dark-border": colors.darkBorder,
                                        "--slot-dark-text": colors.darkText,
                                      } as React.CSSProperties
                                    }
                                    className="group relative cursor-pointer space-y-2 rounded-2xl border border-[var(--slot-border)] bg-[var(--slot-bg)] p-3.5 text-[var(--slot-text)] shadow-sm transition-all duration-200 hover:shadow-md dark:border-[var(--slot-dark-border)] dark:bg-[var(--slot-dark-bg)] dark:text-[var(--slot-dark-text)]"
                                    onClick={() => onEditSlot(slot)}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <h4 className="truncate pr-4 text-xs leading-tight font-bold">
                                        {title}
                                      </h4>
                                      {canEdit && (
                                        <Edit3 className="absolute top-3.5 right-3.5 h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                      )}
                                    </div>

                                    {/* Class name / Subject code */}
                                    {slot.batch && (
                                      <p className="text-[10px] font-bold opacity-85">
                                        {slot.batch.code}
                                      </p>
                                    )}

                                    {/* Instructor / Teacher */}
                                    {slot.teacherProfile && (
                                      <div className="flex items-center gap-1.5 text-[9px] font-semibold opacity-75">
                                        <User className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">
                                          {slot.teacherProfile.fullName}
                                        </span>
                                      </div>
                                    )}

                                    {/* Room */}
                                    {slot.room && (
                                      <div className="flex items-center gap-1.5 text-[9px] font-semibold opacity-75">
                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                        <span>{slot.room}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-1 items-center justify-center">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onCreateSlot(day, periodIdx)}
                                  className="group flex h-full min-h-[60px] w-full cursor-pointer flex-col gap-1 rounded-2xl border border-dashed border-border/30 text-[10px] font-bold text-muted-foreground/30 transition-all duration-200 hover:border-border/60 hover:text-muted-foreground/60"
                                >
                                  <Plus className="h-4 w-4 scale-90 transition-transform group-hover:scale-100" />
                                  <span>Schedule Slot</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

