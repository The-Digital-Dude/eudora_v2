"use client";

import {
  Calendar,
  GraduationCap,
  Plus,
  Users,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Timetable,
  TimetableSlot,
  useCreateTimetableMutation,
  useGetStudentScheduleQuery,
  useGetTeacherMeQuery,
  useGetTeacherScheduleQuery,
  useGetTimetablesQuery,
  usePublishTimetableMutation,
} from "@/features/academic/timetableApi";
import { useGetClassSectionsQuery } from "@/features/dashboard/dashboardApi";
import { useAppSelector } from "@/store/hooks";

import { ScheduleFilterBar } from "./components/schedule-filter-bar";
import { TimetableSlotDialog } from "./components/timetable-slot-dialog";
import { WeeklyTimetableGrid } from "./components/weekly-timetable-grid";

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
    linkedStudents[0]?.studentProfileId || "",
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
  const { data: teacherProfile } = useGetTeacherMeQuery(
    undefined,
    {
      skip: !isTeacher,
    },
  );

  // Queries depending on role
  const { data: timetablesData } = useGetTimetablesQuery(
    isAdmin
      ? {
          academicYearId: selectedYearId !== "all" ? selectedYearId : undefined,
          termId: selectedTermId !== "all" ? selectedTermId : undefined,
          classSectionId: selectedClassId !== "all" ? selectedClassId : undefined,
        }
      : {},
    { skip: !isAdmin },
  );

  const { data: teacherSchedule } = useGetTeacherScheduleQuery(teacherProfile?.id || "", {
    skip: !isTeacher || !teacherProfile?.id,
  });

  const { data: studentSchedule } = useGetStudentScheduleQuery(user?.studentProfile?.id || "", {
    skip: !isStudent,
  });

  const { data: guardianStudentSchedule } = useGetStudentScheduleQuery(selectedStudentId, {
    skip: !isGuardian || !selectedStudentId,
  });

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
      toast.error(
        err?.data?.message || "Failed to publish timetable. Check for booking conflicts.",
      );
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
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-display text-2xl font-black tracking-tight text-foreground">
            Timetable & Scheduling
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            {isAdmin
              ? "Manage recurring weekly schedules, resolve room/teacher booking conflicts."
              : "View your recurring weekly class schedule and classroom assignments."}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <Button
              onClick={() => setCreateTimetableOpen(true)}
              className="flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
            >
              <Plus className="h-4 w-4" />
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
              <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <h3 className="text-xs font-bold text-foreground">
                      {activeTimetable.name}
                    </h3>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                      Effective: {new Date(activeTimetable.effectiveFrom).toLocaleDateString()}
                      {activeTimetable.effectiveTo &&
                        ` - ${new Date(activeTimetable.effectiveTo).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={activeTimetable.status === "PUBLISHED" ? "default" : "secondary"}
                    className="rounded-lg px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase"
                  >
                    {activeTimetable.status}
                  </Badge>

                  {activeTimetable.status === "DRAFT" && (
                    <Button
                      size="sm"
                      onClick={handlePublish}
                      disabled={isPublishing}
                      className="h-9 cursor-pointer rounded-xl bg-foreground text-[10px] font-bold text-background hover:bg-foreground/90"
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
            <EmptyState
              icon={<Calendar className="h-12 w-12" />}
              title="No Timetable Selected"
              description='Please select a Class Section or click "Create Timetable" to start defining slot schedules.'
              className="rounded-3xl p-12"
            />
          )}
        </div>
      )}

      {/* Teacher Workspace Schedule View */}
      {isTeacher && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-4">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-xs font-bold text-foreground">
                Weekly Class Schedule - {teacherProfile?.fullName || user.firstName}
              </h3>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">
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
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/50 p-4">
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
            <div>
              <h3 className="text-xs font-bold text-foreground">
                My Class Timetable
              </h3>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">
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
            <div className="space-y-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
              <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Select Student
              </Label>
              <div className="flex gap-2">
                {linkedStudents.map((rel: any) => (
                  <Button
                    key={rel.studentProfileId}
                    variant={selectedStudentId === rel.studentProfileId ? "default" : "outline"}
                    onClick={() => setSelectedStudentId(rel.studentProfileId)}
                    className="h-10 cursor-pointer rounded-xl px-4 text-xs font-semibold"
                  >
                    {rel.studentProfile?.fullName || "Student"}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-muted/50 p-4">
              <p className="text-xs font-bold text-foreground">
                Weekly Class Schedule -{" "}
                {linkedStudents[0]?.studentProfile?.fullName || "Linked Student"}
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
        <DialogContent className="max-w-sm overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              Create New Timetable
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Establish a timetable structure for a selected Grade or Class Section.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTimetable} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Timetable Name
              </Label>
              <Input
                type="text"
                placeholder="e.g. Grade 10 Section A Timetable"
                value={timetableName}
                onChange={(e) => setTimetableName(e.target.value)}
                className="h-10 rounded-xl border-border bg-muted/30 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Class Section
              </Label>
              <select
                value={newTimetableClassId}
                onChange={(e) => setNewTimetableClassId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-muted/30 px-3 text-xs text-foreground focus:outline-none"
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
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Effective From
              </Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="h-10 rounded-xl border-border bg-muted/30 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Effective Until (Optional)
              </Label>
              <Input
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
                className="h-10 rounded-xl border-border bg-muted/30 text-xs"
              />
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateTimetableOpen(false)}
                className="h-10 cursor-pointer rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreatingTimetable}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
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
