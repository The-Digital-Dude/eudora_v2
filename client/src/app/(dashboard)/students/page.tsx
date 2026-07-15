"use client";

import {
  AlertCircle,
  BookOpen,
  Edit2,
  GraduationCap,
  Mail,
  Plus,
  Search,
  Trash,
  Trash2,
  Users,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataState } from "@/components/ui/data-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateStudentEnrollmentMutation,
  useCreateStudentPlacementMutation,
  useCreateStudentProfileMutation,
  useDeleteStudentEnrollmentMutation,
  useDeleteStudentPlacementMutation,
  useDeleteStudentProfileMutation,
  useGetAcademicYearsQuery,
  useGetClassSectionsQuery,
  useGetCourseClassesQuery,
  useGetStudentProfilesQuery,
  useGetUsersQuery,
  useRestoreStudentProfileMutation,
  useUpdateStudentProfileMutation,
} from "@/features/dashboard/dashboardApi";

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);

  // Queries & Mutations
  const { data: studentsData, isLoading: studentsLoading } =
    useGetStudentProfilesQuery({ includeArchived: showArchived });
  const { data: usersData } = useGetUsersQuery();
  const { data: yearsData } = useGetAcademicYearsQuery();
  const { data: sectionsData } = useGetClassSectionsQuery();
  const { data: courseClassesData } = useGetCourseClassesQuery();

  const [createStudentProfile, { isLoading: creatingProfile }] = useCreateStudentProfileMutation();
  const [updateStudentProfile, { isLoading: updatingProfile }] = useUpdateStudentProfileMutation();
  const [deleteStudentProfile] = useDeleteStudentProfileMutation();
  const [restoreStudentProfile] = useRestoreStudentProfileMutation();

  const [createPlacement, { isLoading: placing }] = useCreateStudentPlacementMutation();
  const [deletePlacement] = useDeleteStudentPlacementMutation();
  const [createEnrollment, { isLoading: enrolling }] = useCreateStudentEnrollmentMutation();
  const [deleteEnrollment] = useDeleteStudentEnrollmentMutation();

  // Dialog states - Profile CRUD
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null); // Null for create
  const [formError, setFormError] = useState("");

  // Dialog states - Academic Configuration (Placements & Enrollments)
  const [isAcademicDialogOpen, setIsAcademicDialogOpen] = useState(false);
  const [academicStudent, setAcademicStudent] = useState<any>(null);
  const [academicError, setAcademicError] = useState("");

  // Form states - Profile
  const [profileName, setProfileName] = useState("");
  const [profileUserId, setProfileUserId] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [profileGender, setProfileGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const [profileStatus, setProfileStatus] = useState<
    "ACTIVE" | "INACTIVE" | "SUSPENDED" | "GRADUATED"
  >("ACTIVE");

  // Form states - Placement/Enrollment
  const [placementSectionId, setPlacementSectionId] = useState("");
  const [placementYearId, setPlacementYearId] = useState("");
  const [enrollmentClassId, setEnrollmentClassId] = useState("");

  // Open Profile Modal
  const handleOpenProfileDialog = (student: any = null) => {
    setFormError("");
    const activeUsers = usersData?.items || [];
    if (student) {
      setSelectedStudent(student);
      setProfileName(student.fullName || "");
      setProfileUserId(student.userId || "");
      setProfileBirthDate(student.birthDate ? student.birthDate.split("T")[0] : "");
      setProfileGender(student.gender || "MALE");
      setProfileStatus(student.status || "ACTIVE");
    } else {
      setSelectedStudent(null);
      setProfileName("");
      setProfileUserId(activeUsers[0]?.id || "");
      setProfileBirthDate("");
      setProfileGender("MALE");
      setProfileStatus("ACTIVE");
    }
    setIsProfileDialogOpen(true);
  };

  // Open Academic Modal
  const handleOpenAcademicDialog = (student: any) => {
    setAcademicError("");
    setAcademicStudent(student);
    const firstSection = sectionsData?.items?.[0]?.id || "";
    const firstYear = yearsData?.items?.[0]?.id || "";
    const firstClass = courseClassesData?.items?.[0]?.id || "";

    setPlacementSectionId(firstSection);
    setPlacementYearId(firstYear);
    setEnrollmentClassId(firstClass);

    setIsAcademicDialogOpen(true);
  };

  // Save Student Profile (Create / Edit)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName || !profileUserId || !profileBirthDate) {
      setFormError("Full Name, User Account, and Birth Date are required.");
      return;
    }

    const payload = {
      fullName: profileName,
      userId: profileUserId,
      birthDate: new Date(profileBirthDate).toISOString(),
      gender: profileGender,
      status: profileStatus,
    };

    try {
      if (selectedStudent) {
        await updateStudentProfile({ id: selectedStudent.id, body: payload }).unwrap();
      } else {
        await createStudentProfile(payload).unwrap();
      }
      setIsProfileDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to save student profile details.");
    }
  };

  // Archive Student Profile (soft delete — restorable from "Show archived")
  const handleDeleteProfile = async (id: string) => {
    if (
      confirm(
        "Archive this student profile? Their learning history is kept and the profile can be restored later.",
      )
    ) {
      try {
        await deleteStudentProfile(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to archive student profile.");
      }
    }
  };

  const handleRestoreProfile = async (id: string) => {
    try {
      await restoreStudentProfile(id).unwrap();
    } catch (err: any) {
      alert(err?.data?.message || "Failed to restore student profile.");
    }
  };

  // Add Class Placement
  const handleAddPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!placementSectionId || !placementYearId) {
      setAcademicError("Placement Section and Academic Year are required.");
      return;
    }
    setAcademicError("");

    try {
      await createPlacement({
        studentProfileId: academicStudent.id,
        classSectionId: placementSectionId,
        academicYearId: placementYearId,
      }).unwrap();

      // Update local context for the modal
      setAcademicStudent((prev: any) => ({
        ...prev,
        placements: [
          ...(prev.placements || []),
          {
            classSectionId: placementSectionId,
            academicYearId: placementYearId,
            classSection: sectionsData?.items?.find((s: any) => s.id === placementSectionId),
          },
        ],
      }));
    } catch (err: any) {
      setAcademicError(err?.data?.message || "Failed to record class placement.");
    }
  };

  // Remove Class Placement
  const handleRemovePlacement = async (classSectionId: string) => {
    if (confirm("Remove student from this class section placement?")) {
      try {
        await deletePlacement({
          studentProfileId: academicStudent.id,
          classSectionId,
        }).unwrap();

        setAcademicStudent((prev: any) => ({
          ...prev,
          placements:
            prev.placements?.filter((p: any) => p.classSectionId !== classSectionId) || [],
        }));
      } catch (err: any) {
        setAcademicError(err?.data?.message || "Failed to remove class placement.");
      }
    }
  };

  // Add Course Enrollment
  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentClassId) {
      setAcademicError("Course Class is required.");
      return;
    }
    setAcademicError("");

    try {
      const enrollment = await createEnrollment({
        studentProfileId: academicStudent.id,
        courseClassId: enrollmentClassId,
      }).unwrap();

      setAcademicStudent((prev: any) => ({
        ...prev,
        enrollments: [
          ...(prev.enrollments || []),
          {
            id: enrollment.id,
            courseClassId: enrollmentClassId,
            courseClass: courseClassesData?.items?.find((c: any) => c.id === enrollmentClassId),
          },
        ],
      }));
    } catch (err: any) {
      setAcademicError(err?.data?.message || "Failed to record course enrollment.");
    }
  };

  // Remove Course Enrollment
  const handleRemoveEnrollment = async (id: string) => {
    if (confirm("Remove student from this course class enrollment?")) {
      try {
        await deleteEnrollment(id).unwrap();

        setAcademicStudent((prev: any) => ({
          ...prev,
          enrollments: prev.enrollments?.filter((e: any) => e.id !== id) || [],
        }));
      } catch (err: any) {
        setAcademicError(err?.data?.message || "Failed to revoke course enrollment.");
      }
    }
  };

  // Calculations & filtering
  const studentList = studentsData?.items || [];
  const filteredStudents = studentList.filter((s: any) => {
    const name = s.fullName?.toLowerCase() || "";
    const email = s.user?.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    const matchesQuery = name.includes(query) || email.includes(query);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalCount = studentList.length;
  const activePlacements = studentList.filter(
    (s: any) => s.placements && s.placements.length > 0,
  ).length;
  const activeEnrollments = studentList.reduce(
    (acc: number, s: any) => acc + (s.enrollments?.length || 0),
    0,
  );

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Student Roster
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Administer student profiles, class section placements, and course enrollment registers.
          </p>
        </div>
        <Button
          onClick={() => handleOpenProfileDialog()}
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-foreground/90"
        >
          <Plus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Total Roster
            </span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {studentsLoading ? "..." : totalCount}
          </p>
          <p className="text-[10px] text-muted-foreground">Registered student profiles</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Placed Sections
            </span>
            <GraduationCap className="h-4 w-4 text-success" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {studentsLoading ? "..." : activePlacements}
          </p>
          <p className="text-[10px] font-semibold text-success">Assigned homeroom sections</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Subject Enrollments
            </span>
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            {studentsLoading ? "..." : activeEnrollments}
          </p>
          <p className="text-[10px] text-muted-foreground">Active class registries</p>
        </Card>
      </div>

      {/* Roster Directory list */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Student Directory</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-primary"
              />
              Show archived
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search by student name..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Student Profile
                </th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Gender</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">
                  Academic Route
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => {
                  const initials = student.fullName
                    ? student.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "S";

                  return (
                    <tr
                      key={student.id}
                      className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/30"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">
                              {student.fullName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Mail className="h-3 w-3 text-muted-foreground/50" /> {student.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-xs font-medium text-muted-foreground capitalize">
                        {student.gender?.toLowerCase()}
                      </td>
                      <td className="py-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            student.status === "ACTIVE"
                              ? "border border-success/20 bg-success/10 text-success"
                              : student.status === "GRADUATED"
                                ? "border border-border bg-muted text-muted-foreground"
                                : "border border-warning/20 bg-warning/10 text-warning"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="max-w-[200px] space-y-1">
                          {student.placements && student.placements.length > 0
                            ? student.placements.map((p: any) => (
                                <div
                                  key={p.classSectionId}
                                  className="mr-1 inline-flex items-center gap-1 rounded-md border border-success/20 bg-success/10 px-2 py-0.5 text-[9px] font-semibold text-success"
                                >
                                  Section: {p.classSection?.name || "N/A"}
                                </div>
                              ))
                            : null}
                          {student.enrollments && student.enrollments.length > 0
                            ? student.enrollments.map((e: any) => (
                                <div
                                  key={e.id}
                                  className="mr-1 inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold text-primary"
                                >
                                  Course: {e.courseClass?.name || "N/A"}
                                </div>
                              ))
                            : null}
                          {!student.placements?.length && !student.enrollments?.length && (
                            <span className="text-[9px] font-medium text-muted-foreground">
                              Unscheduled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {student.deletedAt ? (
                            <>
                              <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                                Archived
                              </span>
                              <Button
                                onClick={() => handleRestoreProfile(student.id)}
                                variant="outline"
                                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                Restore
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                onClick={() => handleOpenAcademicDialog(student)}
                                variant="outline"
                                className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                Route Setup
                              </Button>
                              <Button
                                onClick={() => handleOpenProfileDialog(student)}
                                variant="outline"
                                className="h-8 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteProfile(student.id)}
                                variant="outline"
                                className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-4">
                    <DataState
                      isLoading={false}
                      isEmpty={filteredStudents.length === 0}
                      emptyTitle="No students found"
                      emptyDescription="Register a new student to begin schedule setups."
                      emptyAction={
                        <Button size="sm" onClick={() => setIsProfileDialogOpen(true)}>
                          Add Student
                        </Button>
                      }
                    >
                      {null}
                    </DataState>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profile Create / Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              {selectedStudent ? "Edit Student Profile" : "Register Student Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Link the student profile to an active system user and fill demographics.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Full Name
              </Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Charlotte Harris"
                className="h-10 border-border text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Link System User Account
              </Label>
              <select
                value={profileUserId}
                onChange={(e) => setProfileUserId(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
                required
                disabled={!!selectedStudent}
              >
                <option value="" disabled>
                  Select System User
                </option>
                {usersData?.items?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Birth Date
                </Label>
                <Input
                  type="date"
                  value={profileBirthDate}
                  onChange={(e) => setProfileBirthDate(e.target.value)}
                  className="h-10 border-border text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Gender
                </Label>
                <select
                  value={profileGender}
                  onChange={(e: any) => setProfileGender(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Status
              </Label>
              <select
                value={profileStatus}
                onChange={(e: any) => setProfileStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="GRADUATED">GRADUATED</option>
              </select>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingProfile || updatingProfile}
                className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
              >
                {creatingProfile || updatingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Academic Route Setup Dialog (Placements & Enrollments) */}
      <Dialog open={isAcademicDialogOpen} onOpenChange={setIsAcademicDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              Route Config: {academicStudent?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Design placements into homerooms and enrollment registries.
            </DialogDescription>
          </DialogHeader>

          {academicError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {academicError}
            </div>
          )}

          <Tabs defaultValue="placements" className="w-full">
            <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl bg-muted p-1">
              <TabsTrigger
                value="placements"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card"
              >
                Class Section Placements
              </TabsTrigger>
              <TabsTrigger
                value="enrollments"
                className="rounded-lg text-xs font-semibold data-[state=active]:bg-card"
              >
                Course Class Enrollments
              </TabsTrigger>
            </TabsList>

            {/* Placements Tab */}
            <TabsContent value="placements" className="space-y-6 pt-4">
              <form
                onSubmit={handleAddPlacement}
                className="grid grid-cols-3 items-end gap-3 rounded-2xl border border-border bg-muted/30 p-4"
              >
                <div className="col-span-1 space-y-1">
                  <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Class Section
                  </Label>
                  <select
                    value={placementSectionId}
                    onChange={(e) => setPlacementSectionId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      Select Section
                    </option>
                    {sectionsData?.items
                      ?.filter((s: any) => s.status === "ACTIVE")
                      .map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="col-span-1 space-y-1">
                  <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Academic Year
                  </Label>
                  <select
                    value={placementYearId}
                    onChange={(e) => setPlacementYearId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      Select Year
                    </option>
                    {yearsData?.items
                      ?.filter((y: any) => y.status === "ACTIVE")
                      .map((y: any) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={placing}
                  className="h-10 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
                >
                  {placing ? "Adding..." : "Place Student"}
                </Button>
              </form>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Active Placements
                </h3>
                <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                  {academicStudent?.placements && academicStudent.placements.length > 0 ? (
                    academicStudent.placements.map((p: any) => (
                      <div
                        key={p.classSectionId}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
                      >
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {p.classSection?.name || "Homeroom Class"}
                          </p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            Section Code: {p.classSection?.code || "N/A"}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemovePlacement(p.classSectionId)}
                          variant="outline"
                          className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs font-medium text-muted-foreground">
                      No active class section placements.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Enrollments Tab */}
            <TabsContent value="enrollments" className="space-y-6 pt-4">
              <form
                onSubmit={handleAddEnrollment}
                className="flex items-end gap-3 rounded-2xl border border-border bg-muted/30 p-4"
              >
                <div className="flex-1 space-y-1">
                  <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    Course Class
                  </Label>
                  <select
                    value={enrollmentClassId}
                    onChange={(e) => setEnrollmentClassId(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
                    required
                  >
                    <option value="" disabled>
                      Select Course Class
                    </option>
                    {courseClassesData?.items
                      ?.filter((c: any) => c.status === "ACTIVE")
                      .map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={enrolling}
                  className="h-10 shrink-0 cursor-pointer rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
                >
                  {enrolling ? "Enrolling..." : "Enroll Student"}
                </Button>
              </form>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Active Course Enrollments
                </h3>
                <div className="max-h-[180px] space-y-2 overflow-y-auto pr-1">
                  {academicStudent?.enrollments && academicStudent.enrollments.length > 0 ? (
                    academicStudent.enrollments.map((e: any) => (
                      <div
                        key={e.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-sm"
                      >
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {e.courseClass?.name || "Course Lecture"}
                          </p>
                          <p className="font-mono text-[9px] text-muted-foreground">
                            Class Code: {e.courseClass?.code || "N/A"}
                          </p>
                        </div>
                        <Button
                          onClick={() => handleRemoveEnrollment(e.id)}
                          variant="outline"
                          className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs font-medium text-muted-foreground">
                      No active course class enrollments.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              type="button"
              onClick={() => setIsAcademicDialogOpen(false)}
              className="h-10 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-foreground/90"
            >
              Done Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

