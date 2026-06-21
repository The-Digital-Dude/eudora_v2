"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateTimetableSlotMutation,
  useUpdateTimetableSlotMutation,
  useDeleteTimetableSlotMutation,
  TimetableSlot,
} from "@/features/academic/timetableApi";
import {
  useGetClassSectionsQuery,
  useGetCourseClassesQuery,
  useGetTeacherProfilesQuery,
} from "@/features/dashboard/dashboardApi";
import { toast } from "sonner";
import { AlertCircle, Trash } from "lucide-react";

interface TimetableSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timetableId: string;
  slot: TimetableSlot | null; // null means create, otherwise edit
  defaultDayOfWeek?: string;
  defaultPeriodIndex?: number;
  defaultClassSectionId?: string;
}

export function TimetableSlotDialog({
  open,
  onOpenChange,
  timetableId,
  slot,
  defaultDayOfWeek = "MONDAY",
  defaultPeriodIndex = 1,
  defaultClassSectionId,
}: TimetableSlotDialogProps) {
  const [createSlot, { isLoading: isCreating }] = useCreateTimetableSlotMutation();
  const [updateSlot, { isLoading: isUpdating }] = useUpdateTimetableSlotMutation();
  const [deleteSlot, { isLoading: isDeleting }] = useDeleteTimetableSlotMutation();

  const { data: classSectionsData } = useGetClassSectionsQuery();
  const { data: courseClassesData } = useGetCourseClassesQuery();
  const { data: teachersData } = useGetTeacherProfilesQuery();

  const classSections = classSectionsData?.items || [];
  const courseClasses = courseClassesData?.items || [];
  const teachers = teachersData?.items || [];

  // Form states
  const [dayOfWeek, setDayOfWeek] = React.useState<string>(defaultDayOfWeek);
  const [periodIndex, setPeriodIndex] = React.useState<number>(defaultPeriodIndex);
  const [startTime, setStartTime] = React.useState<string>("09:00");
  const [endTime, setEndTime] = React.useState<string>("10:00");
  const [classSectionId, setClassSectionId] = React.useState<string>("");
  const [courseClassId, setCourseClassId] = React.useState<string>("none");
  const [teacherProfileId, setTeacherProfileId] = React.useState<string>("none");
  const [room, setRoom] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Time conversion helpers
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  // Reset form when slot or open changes
  React.useEffect(() => {
    if (slot) {
      setDayOfWeek(slot.dayOfWeek);
      setPeriodIndex(slot.periodIndex);
      setStartTime(minutesToTime(slot.startTimeMinutes));
      setEndTime(minutesToTime(slot.endTimeMinutes));
      setClassSectionId(slot.classSectionId);
      setCourseClassId(slot.courseClassId || "none");
      setTeacherProfileId(slot.teacherProfileId || "none");
      setRoom(slot.room || "");
      setNotes(slot.notes || "");
    } else {
      setDayOfWeek(defaultDayOfWeek);
      setPeriodIndex(defaultPeriodIndex);
      setStartTime("09:00");
      setEndTime("10:00");
      setClassSectionId(defaultClassSectionId || "");
      setCourseClassId("none");
      setTeacherProfileId("none");
      setRoom("");
      setNotes("");
    }
    setErrorMessage(null);
  }, [slot, open, defaultDayOfWeek, defaultPeriodIndex, defaultClassSectionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (startMinutes >= endMinutes) {
      setErrorMessage("End time must be after start time.");
      return;
    }

    if (!classSectionId) {
      setErrorMessage("Please select a Class Section.");
      return;
    }

    const payload = {
      dayOfWeek: dayOfWeek as any,
      periodIndex: Number(periodIndex),
      startTimeMinutes: startMinutes,
      endTimeMinutes: endMinutes,
      classSectionId,
      courseClassId: courseClassId === "none" ? undefined : courseClassId,
      teacherProfileId: teacherProfileId === "none" ? undefined : teacherProfileId,
      room: room || undefined,
      notes: notes || undefined,
    };

    try {
      if (slot) {
        await updateSlot({
          timetableId,
          slotId: slot.id,
          body: payload,
        }).unwrap();
        toast.success("Timetable slot updated successfully.");
      } else {
        await createSlot({
          timetableId,
          body: payload,
        }).unwrap();
        toast.success("Timetable slot created successfully.");
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Slot save error:", err);
      const confMsg = err?.data?.conflicts?.[0]?.message || err?.data?.message || "Failed to save timetable slot.";
      setErrorMessage(confMsg);
    }
  };

  const handleDelete = async () => {
    if (!slot) return;
    if (!window.confirm("Are you sure you want to delete this timetable slot?")) {
      return;
    }

    try {
      await deleteSlot({ timetableId, slotId: slot.id }).unwrap();
      toast.success("Timetable slot deleted successfully.");
      onOpenChange(false);
    } catch (err: any) {
      console.error("Slot delete error:", err);
      toast.error(err?.data?.message || "Failed to delete slot.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50 font-display">
            {slot ? "Edit Timetable Slot" : "Add Timetable Slot"}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
            Define the weekly scheduling slot details. Conflicts are validated dynamically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl p-3 flex gap-3 text-xs text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Day of Week */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Day of Week</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50">
                  <SelectValue placeholder="Select Day" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="MONDAY">Monday</SelectItem>
                  <SelectItem value="TUESDAY">Tuesday</SelectItem>
                  <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                  <SelectItem value="THURSDAY">Thursday</SelectItem>
                  <SelectItem value="FRIDAY">Friday</SelectItem>
                  <SelectItem value="SATURDAY">Saturday</SelectItem>
                  <SelectItem value="SUNDAY">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Index */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Period Index</Label>
              <Input
                type="number"
                min={0}
                value={periodIndex}
                onChange={(e) => setPeriodIndex(Number(e.target.value))}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Time */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
              />
            </div>

            {/* End Time */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
              />
            </div>
          </div>

          {/* Class Section */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Class Section</Label>
            <Select value={classSectionId} onValueChange={setClassSectionId}>
              <SelectTrigger className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Select Class Section" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {classSections.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Course Class */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Course Subject (Course Class)</Label>
            <Select value={courseClassId} onValueChange={setCourseClassId}>
              <SelectTrigger className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">None (Homeroom / Break / Study Hall)</SelectItem>
                {courseClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Teacher Profile */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Assigned Teacher</Label>
            <Select value={teacherProfileId} onValueChange={setTeacherProfileId}>
              <SelectTrigger className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Select Teacher" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none">None / Unassigned</SelectItem>
                {teachers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Room */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Classroom / Room</Label>
            <Input
              type="text"
              placeholder="e.g. Room 204, Science Lab A"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Notes</Label>
            <Textarea
              placeholder="Add optional notes or descriptions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
            />
          </div>

          <DialogFooter className="pt-4 flex justify-between items-center">
            {slot ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 text-rose-600 h-10 text-xs font-semibold gap-2 shrink-0 cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || isUpdating}
                className="rounded-xl bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 h-10 text-xs font-semibold px-4 cursor-pointer"
              >
                {slot ? "Save Changes" : "Create Slot"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
