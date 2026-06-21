"use client";

import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetTimetablesQuery,
  useCreateTimetableMutation,
  usePublishTimetableMutation,
  useGetTeacherMeQuery,
  useGetTeacherScheduleQuery,
  useGetStudentScheduleQuery,
  useGetClassSectionScheduleQuery,
  Timetable,
  TimetableSlot,
} from "@/features/academic/timetableApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";
import { ScheduleFilterBar } from "./components/schedule-filter-bar";
import { WeeklyTimetableGrid } from "./components/weekly-timetable-grid";
import { TimetableSlotDialog } from "./components/timetable-slot-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Plus, UploadCloud, Eye, Award, Users, GraduationCap, RefreshCw } from "lucide-react";

export default function TimetablePage() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Resolve role list
  const userRoles = React.useMemo<string[]>(() => {
    if (!user) return [];
    const rolesList: string[] = [];
    if (user.role) rolesList.push(user.role);
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === "string") rolesList.push(r);
        else if (r?.name) rolesList.push(r.name);
        else if (r?.role?.name) rolesList.push(r.role?.name);
      });
    }
    return rolesList;
  }, [user]);

  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");
  const isTeacher = userRoles.includes("TEACHER");
  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  // Filter States
  const [selectedYearId, setSelectedYearId] = React.useState<string>("all");
  const [selectedTermId, setSelectedTermId] = React.useState<string>("all");
  const [selectedClassId, setSelectedClassId] = React.useState<string>("all");
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string>("all");

  // Guardian linked student selection
  const linkedStudents = user?.guardianProfile?.students || [];
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    linkedStudents[0]?.studentProfileId || ""
  );

  // Dialog states for Slot CRUD
  const [slotDialogOpen, setSlotDialogOpen] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<TimetableSlot | null>(null);
  const [defaultDay, setDefaultDay] = React.useState<string>("MONDAY");
  const [defaultPeriod, setDefaultPeriod] = React.useState<number>(1);

  // Dialog state for Timetable Creation
  const [createTimetableOpen, setCreateTimetableOpen] = React.useState(false);
  const [timetableName, setTimetableName] = React.useState("");
  const [effectiveFrom, setEffectiveFrom] = React.useState("");
  const [effectiveTo, setEffectiveTo] = React.useState("");
  const [newTimetableClassId, setNewTimetableClassId] = React.useState("");

  const [createTimetable, { isLoading: isCreatingTimetable }] = useCreateTimetableMutation();
  const [publishTimetable, { isLoading: isPublishing }] = usePublishTimetableMutation();

  // Load teacher profile if teacher
  const { data: teacherProfile, isLoading: loadingTeacherProfile } = useGetTeacherMeQuery(undefined, {
    skip: !isTeacher,
  });

  // Queries depending on role
  const { data: timetablesData, refetch: refetchTimetables } = useGetTimetablesQuery(
    isAdmin
      ? {
          academicYearId: selectedYearId !== "all" ? selectedYearId : undefined,
          termId: selectedTermId !== "all" ? selectedTermId : undefined,
          classSectionId: selectedClassId !== "all" ? selectedClassId : undefined,
        }
      : {},
    { skip: !isAdmin }
  );

  const { data: teacherSchedule } = useGetTeacherScheduleQuery(
    teacherProfile?.id || "",
    { skip: !isTeacher || !teacherProfile?.id }
  );

  const { data: studentSchedule } = useGetStudentScheduleQuery(
    user?.studentProfile?.id || "",
    { skip: !isStudent }
  );

  const { data: guardianStudentSchedule } = useGetStudentScheduleQuery(
    selectedStudentId,
    { skip: !isGuardian || !selectedStudentId }
  );

  // Class sections for the timetable creation dropdown
  const { data: classSectionsData } = useGetClassSectionsQuery();
  const classSections = classSectionsData?.items || [];

  // Active timetable selected in Admin view
  const activeTimetable = React.useMemo<Timetable | null>(() => {
    if (!timetablesData || timetablesData.length === 0) return null;
    // Find matching timetable for current class selection
    if (selectedClassId !== "all") {
      return timetablesData.find((t) => t.classSectionId === selectedClassId) || null;
    }
    return timetablesData[0];
  }, [timetablesData, selectedClassId]);

  const handleCreateTimetable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timetableName || !effectiveFrom || !newTimetableClassId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      // Find matching academicYearId for selected class section
      const selectedClass = classSections.find((c) => c.id === newTimetableClassId);
      if (!selectedClass) {
        toast.error("Invalid Class Section.");
        return;
      }

      await createTimetable({
        name: timetableName,
        academicYearId: selectedClass.academicYearId,
        classSectionId: newTimetableClassId,
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
      }).unwrap();

      toast.success("Timetable created successfully.");
      setCreateTimetableOpen(false);
      setTimetableName("");
      setEffectiveFrom("");
      setEffectiveTo("");
      setSelectedClassId(newTimetableClassId);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to create timetable.");
    }
  };

  const handlePublish = async () => {
    if (!activeTimetable) return;
    try {
      await publishTimetable(activeTimetable.id).unwrap();
      toast.success("Timetable published successfully.");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to publish timetable. Check for booking conflicts.");
    }
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setSlotDialogOpen(true);
  };

  const handleOpenCreateSlot = (day: string, period: number) => {
    setSelectedSlot(null);
    setDefaultDay(day);
    setDefaultPeriod(period);
    setSlotDialogOpen(true);
  };

  // --- Render Header and Controls ---
  return (
    <div className="space-y-6">
      {/* Upper Title Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display">
            Timetable & Scheduling
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            {isAdmin
              ? "Manage recurring weekly schedules, resolve room/teacher booking conflicts."
              : "View your recurring weekly class schedule and classroom assignments."}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => setCreateTimetableOpen(true)}
              className="rounded-xl bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 text-xs font-semibold h-11 px-4 flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Timetable
            </Button>
          </div>
        )}
      </div>

      {/* Admin Operational Workspace */}
      {isAdmin && (
        <div className="space-y-6">
          <ScheduleFilterBar
            selectedYearId={selectedYearId}
            setSelectedYearId={setSelectedYearId}
            selectedTermId={selectedTermId}
            setSelectedTermId={setSelectedTermId}
            selectedClassId={selectedClassId}
            setSelectedClassId={setSelectedClassId}
            selectedTeacherId={selectedTeacherId}
            setSelectedTeacherId={setSelectedTeacherId}
          />

          {activeTimetable ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-neutral-500" />
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {activeTimetable.name}
                    </h3>
                    <p className="text-[10px] text-neutral-400 font-semibold uppercase">
                      Effective: {new Date(activeTimetable.effectiveFrom).toLocaleDateString()}
                      {activeTimetable.effectiveTo && ` - ${new Date(activeTimetable.effectiveTo).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={activeTimetable.status === "PUBLISHED" ? "default" : "secondary"}
                    className="rounded-lg text-[10px] font-bold py-1 px-2.5 uppercase tracking-wide"
                  >
                    {activeTimetable.status}
                  </Badge>

                  {activeTimetable.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="rounded-xl text-[10px] font-bold bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 text-white dark:text-neutral-900 h-9 cursor-pointer"
                    >
                      Publish Schedule
                    </Button>
                  )}
                </div>
              </div>

              <WeeklyTimetableGrid
                timetable={activeTimetable}
                onEditSlot={handleOpenEditSlot}
                onCreateSlot={handleOpenCreateSlot}
                canEdit={true}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center border border-dashed border-neutral-200 dark:border-zinc-800 rounded-3xl p-12 text-center bg-neutral-50/50 dark:bg-zinc-900/10">
              <Calendar className="w-12 h-12 text-neutral-300 dark:text-zinc-800 mb-4" />
              <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">No Timetable Selected</h3>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 max-w-sm mt-1 mb-6">
                Please select a Class Section or click "Create Timetable" to start defining slot schedules.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Teacher Workspace Schedule View */}
      {isTeacher && (
        <div className="space-y-6">
          <div className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
            <Users className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                Weekly Class Schedule - {teacherProfile?.fullName || user.firstName}
              </h3>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">
                Showing all active published lectures and periods assigned to you.
              </p>
            </div>
          </div>

          <WeeklyTimetableGrid
            timetable={{ slots: teacherSchedule || [], status: "PUBLISHED" } as any}
            onEditSlot={() => {}}
            onCreateSlot={() => {}}
            canEdit={false}
          />
        </div>
      )}

      {/* Student Workspace Schedule View */}
      {isStudent && (
        <div className="space-y-6">
          <div className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-neutral-500" />
            <div>
              <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                My Class Timetable
              </h3>
              <p className="text-[10px] text-neutral-400 font-semibold uppercase">
                Schedule derived from homeroom placement and enrolled course classes.
              </p>
            </div>
          </div>

          <WeeklyTimetableGrid
            timetable={{ slots: studentSchedule || [], status: "PUBLISHED" } as any}
            onEditSlot={() => {}}
            onCreateSlot={() => {}}
            canEdit={false}
          />
        </div>
      )}

      {/* Guardian Workspace Schedule View */}
      {isGuardian && (
        <div className="space-y-6">
          {linkedStudents.length > 1 ? (
            <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-3">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Select Student</Label>
              <div className="flex gap-2">
                {linkedStudents.map((rel: any) => (
                  <Button
                    key={rel.studentProfileId}
                    variant={selectedStudentId === rel.studentProfileId ? "default" : "outline"}
                    onClick={() => setSelectedStudentId(rel.studentProfileId)}
                    className="rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
                  >
                    {rel.studentProfile?.fullName || "Student"}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-neutral-50 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 p-4 rounded-2xl">
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                Weekly Class Schedule - {linkedStudents[0]?.studentProfile?.fullName || "Linked Student"}
              </p>
            </div>
          )}

          <WeeklyTimetableGrid
            timetable={{ slots: guardianStudentSchedule || [], status: "PUBLISHED" } as any}
            onEditSlot={() => {}}
            onCreateSlot={() => {}}
            canEdit={false}
          />
        </div>
      )}

      {/* Slots Creation and Editing Dialog */}
      {activeTimetable && (
        <TimetableSlotDialog
          open={slotDialogOpen}
          onOpenChange={setSlotDialogOpen}
          timetableId={activeTimetable.id}
          slot={selectedSlot}
          defaultDayOfWeek={defaultDay}
          defaultPeriodIndex={defaultPeriod}
          defaultClassSectionId={activeTimetable.classSectionId || undefined}
        />
      )}

      {/* Create Timetable Dialog */}
      <Dialog open={createTimetableOpen} onOpenChange={setCreateTimetableOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 dark:text-neutral-50 font-display">
              Create New Timetable
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400">
              Establish a timetable structure for a selected Grade or Class Section.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTimetable} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Timetable Name</Label>
              <Input
                type="text"
                placeholder="e.g. Grade 10 Section A Timetable"
                value={timetableName}
                onChange={(e) => setTimetableName(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Class Section</Label>
              <select
                value={newTimetableClassId}
                onChange={(e) => setNewTimetableClassId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 text-neutral-800 dark:text-neutral-200 focus:outline-none"
                required
              >
                <option value="">Select Class Section</option>
                {classSections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Effective From</Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Effective Until (Optional)</Label>
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateTimetableOpen(false)}
                className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingTimetable}
                className="rounded-xl bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 h-10 text-xs font-semibold px-4 cursor-pointer"
              >
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
