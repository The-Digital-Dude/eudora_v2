"use client";

import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Calendar,
  Edit2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash,
  Trash2,
  Users2,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
import {
  useAssignTeacherClassMutation,
  useCreateTeacherProfileMutation,
  useDeleteTeacherProfileMutation,
  useGetClassSectionsQuery,
  useGetTeacherProfilesQuery,
  useRemoveTeacherClassMutation,
  useUpdateTeacherProfileMutation,
} from "@/features/dashboard/dashboardApi";

export default function TeachersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Queries & Mutations
  const { data: teachersData, isLoading: teachersLoading } = useGetTeacherProfilesQuery();
  const { data: sectionsData } = useGetClassSectionsQuery();

  const [createTeacherProfile, { isLoading: creatingProfile }] = useCreateTeacherProfileMutation();
  const [updateTeacherProfile, { isLoading: updatingProfile }] = useUpdateTeacherProfileMutation();
  const [deleteTeacherProfile] = useDeleteTeacherProfileMutation();

  const [assignTeacherClass, { isLoading: assigning }] = useAssignTeacherClassMutation();
  const [removeTeacherClass] = useRemoveTeacherClassMutation();

  // Dialog states - Profile CRUD
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null); // Null for create
  const [formError, setFormError] = useState("");

  // Dialog states - Class Assignment Configuration
  const [isClassDialogOpen, setIsClassDialogOpen] = useState(false);
  const [assignmentTeacher, setAssignmentTeacher] = useState<any>(null);
  const [assignmentError, setAssignmentError] = useState("");

  // Form states - Profile Create/Edit
  const [profileEmail, setProfileEmail] = useState("");
  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileFullName, setProfileFullName] = useState(""); // for updates
  const [profileEmployeeCode, setProfileEmployeeCode] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileSpecialization, setProfileSpecialization] = useState("");
  const [profileStatus, setProfileStatus] = useState<"ACTIVE" | "INACTIVE" | "ON_LEAVE">("ACTIVE");

  // Form states - Class Assignment
  const [assignSectionId, setAssignSectionId] = useState("");
  const [assignRole, setAssignRole] = useState("PRIMARY"); // PRIMARY, ASSISTANT, SUBSTITUTE

  // Open Profile Modal
  const handleOpenProfileDialog = (teacher: any = null) => {
    setFormError("");
    if (teacher) {
      setSelectedTeacher(teacher);
      setProfileEmail(teacher.user?.email || "");
      setProfileFirstName(teacher.user?.firstName || "");
      setProfileLastName(teacher.user?.lastName || "");
      setProfileFullName(teacher.fullName || "");
      setProfileEmployeeCode(teacher.employeeCode || "");
      setProfilePhone(teacher.phone || "");
      setProfileSpecialization(teacher.specialization || "");
      setProfileStatus(teacher.status || "ACTIVE");
    } else {
      setSelectedTeacher(null);
      setProfileEmail("");
      setProfileFirstName("");
      setProfileLastName("");
      setProfileFullName("");
      setProfileEmployeeCode("");
      setProfilePhone("");
      setProfileSpecialization("");
      setProfileStatus("ACTIVE");
    }
    setIsProfileDialogOpen(true);
  };

  // Open Class Assignment Modal
  const handleOpenClassDialog = (teacher: any) => {
    setAssignmentError("");
    setAssignmentTeacher(teacher);
    const firstSection = sectionsData?.items?.[0]?.id || "";
    setAssignSectionId(firstSection);
    setAssignRole("PRIMARY");
    setIsClassDialogOpen(true);
  };

  // Save Teacher Profile (Create / Edit)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      if (selectedTeacher) {
        // Update uses UpdateTeacherDto
        const payload = {
          fullName: profileFullName || `${profileFirstName} ${profileLastName}`,
          employeeCode: profileEmployeeCode || undefined,
          phone: profilePhone || undefined,
          specialization: profileSpecialization || undefined,
          status: profileStatus,
        };
        await updateTeacherProfile({ id: selectedTeacher.id, body: payload }).unwrap();
      } else {
        // Create uses CreateTeacherDto (includes User fields)
        if (!profileEmail || !profileFirstName || !profileLastName) {
          setFormError("Email, First Name, and Last Name are required.");
          return;
        }
        const payload = {
          email: profileEmail,
          firstName: profileFirstName,
          lastName: profileLastName,
          employeeCode: profileEmployeeCode || undefined,
          phone: profilePhone || undefined,
          specialization: profileSpecialization || undefined,
          status: profileStatus,
        };
        await createTeacherProfile(payload).unwrap();
      }
      setIsProfileDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to save teacher details.");
    }
  };

  // Delete Teacher Profile (Soft Delete)
  const handleDeleteProfile = async (id: string) => {
    if (confirm("Are you sure you want to deactivate and remove this teacher?")) {
      try {
        await deleteTeacherProfile(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete teacher.");
      }
    }
  };

  // Add Class Assignment
  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSectionId) {
      setAssignmentError("Class Section is required.");
      return;
    }
    setAssignmentError("");

    try {
      await assignTeacherClass({
        id: assignmentTeacher.id,
        classSectionId: assignSectionId,
        role: assignRole,
      }).unwrap();

      // Update local modal state to reflect changes immediately
      const addedSection = sectionsData?.items?.find((s: any) => s.id === assignSectionId);
      setAssignmentTeacher((prev: any) => ({
        ...prev,
        classAssignments: [
          ...(prev.classAssignments || []),
          {
            teacherProfileId: prev.id,
            classSectionId: assignSectionId,
            role: assignRole,
            classSection: addedSection,
          },
        ],
      }));
    } catch (err: any) {
      setAssignmentError(err?.data?.message || "Failed to assign teacher to class.");
    }
  };

  // Remove Class Assignment
  const handleRemoveAssignment = async (classSectionId: string) => {
    if (confirm("Remove teacher from this class section assignment?")) {
      try {
        await removeTeacherClass({
          id: assignmentTeacher.id,
          classSectionId,
        }).unwrap();

        setAssignmentTeacher((prev: any) => ({
          ...prev,
          classAssignments:
            prev.classAssignments?.filter((c: any) => c.classSectionId !== classSectionId) || [],
        }));
      } catch (err: any) {
        setAssignmentError(err?.data?.message || "Failed to remove class assignment.");
      }
    }
  };

  // Calculations & filtering
  const teacherList = teachersData?.items || [];
  const filteredTeachers = teacherList.filter((t: any) => {
    const name = t.fullName?.toLowerCase() || "";
    const email = t.user?.email?.toLowerCase() || "";
    const spec = t.specialization?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    const matchesQuery = name.includes(query) || email.includes(query) || spec.includes(query);
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalCount = teacherList.length;
  const activeCount = teacherList.filter((t: any) => t.status === "ACTIVE").length;
  const leaveCount = teacherList.filter((t: any) => t.status === "ON_LEAVE").length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-neutral-900">
            Teachers Registry
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Administer teacher profiles, academic specializations, and homeroom section assignments.
          </p>
        </div>
        <Button
          onClick={() => handleOpenProfileDialog()}
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white shadow-sm hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" /> Add Teacher
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Total Teachers
            </span>
            <Users2 className="h-4 w-4 text-neutral-400" />
          </div>
          <p className="font-display text-2xl font-bold text-neutral-900">
            {teachersLoading ? "..." : totalCount}
          </p>
          <p className="text-[10px] text-neutral-400">Registered staff profiles</p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              Active Staff
            </span>
            <Users2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="font-display text-2xl font-bold text-neutral-900">
            {teachersLoading ? "..." : activeCount}
          </p>
          <p className="text-[10px] font-semibold text-emerald-600">
            Currently teaching active classes
          </p>
        </Card>

        <Card className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="font-display text-[10px] font-bold tracking-wider uppercase">
              On Leave
            </span>
            <Users2 className="h-4 w-4 text-amber-500" />
          </div>
          <p className="font-display text-2xl font-bold text-neutral-900">
            {teachersLoading ? "..." : leaveCount}
          </p>
          <p className="text-[10px] text-neutral-400">Temporary administrative leave</p>
        </Card>
      </div>

      {/* Teachers Directory Card */}
      <Card className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-neutral-900">Teachers Directory</h2>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 cursor-pointer rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="ON_LEAVE">ON LEAVE</option>
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Search className="h-3.5 w-3.5" />
              </span>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 text-xs"
                placeholder="Search by name or subject..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-3 text-[10px] font-bold text-neutral-400 uppercase">
                  Teacher Profile
                </th>
                <th className="pb-3 text-[10px] font-bold text-neutral-400 uppercase">
                  Employee Code
                </th>
                <th className="pb-3 text-[10px] font-bold text-neutral-400 uppercase">
                  Specialization
                </th>
                <th className="pb-3 text-[10px] font-bold text-neutral-400 uppercase">Status</th>
                <th className="pb-3 text-[10px] font-bold text-neutral-400 uppercase">
                  Assigned Sections
                </th>
                <th className="pb-3 text-right text-[10px] font-bold text-neutral-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {teachersLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-50">
                    <td className="py-4">
                      <div className="h-4 w-32 animate-pulse rounded bg-neutral-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-12 animate-pulse rounded bg-neutral-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-neutral-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-neutral-100" />
                    </td>
                    <td className="py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
                    </td>
                    <td className="py-4">
                      <div className="ml-auto h-4 w-20 animate-pulse rounded bg-neutral-100" />
                    </td>
                  </tr>
                ))
              ) : filteredTeachers.length > 0 ? (
                filteredTeachers.map((teacher: any) => {
                  const initials = teacher.fullName
                    ? teacher.fullName
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "T";

                  return (
                    <tr
                      key={teacher.id}
                      className="border-b border-neutral-50 transition-colors last:border-0 hover:bg-neutral-50/50"
                    >
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-900">
                              {teacher.fullName}
                            </p>
                            <p className="mt-0.5 flex items-center gap-0.5 text-[10px] text-neutral-400">
                              <Mail className="h-3 w-3 text-neutral-300" /> {teacher.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-mono text-xs text-neutral-500">
                        {teacher.employeeCode || "N/A"}
                      </td>
                      <td className="py-4 text-xs font-medium text-neutral-700">
                        {teacher.specialization ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold text-neutral-800">
                            <Briefcase className="h-3 w-3 text-neutral-400" />{" "}
                            {teacher.specialization}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Not specified</span>
                        )}
                      </td>
                      <td className="py-4 text-xs">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            teacher.status === "ACTIVE"
                              ? "border border-emerald-100 bg-emerald-50 text-emerald-700"
                              : teacher.status === "ON_LEAVE"
                                ? "border border-amber-100 bg-amber-50 text-amber-700"
                                : "border border-neutral-200 bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {teacher.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {teacher.classAssignments && teacher.classAssignments.length > 0 ? (
                            teacher.classAssignments.map((a: any) => (
                              <span
                                key={a.classSectionId}
                                className="inline-flex items-center rounded-md border border-emerald-100/50 bg-emerald-50/50 px-2 py-0.5 text-[9px] font-semibold text-emerald-800"
                              >
                                {a.classSection?.name} ({a.role})
                              </span>
                            ))
                          ) : (
                            <span className="text-[9px] font-medium text-neutral-400">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleOpenClassDialog(teacher)}
                            variant="outline"
                            className="h-8 rounded-lg px-2.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                          >
                            Assign Sections
                          </Button>
                          <Button
                            onClick={() => handleOpenProfileDialog(teacher)}
                            variant="outline"
                            className="h-8 rounded-lg p-2 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteProfile(teacher.id)}
                            variant="outline"
                            className="h-8 rounded-lg border-rose-100 p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs font-medium text-neutral-400">
                    No teacher profiles listed. Add a new teacher profile to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profile Create / Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-neutral-200 bg-white p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-neutral-900">
              {selectedTeacher ? "Edit Teacher Profile" : "Register Teacher Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              {selectedTeacher
                ? "Update profile details for this teacher."
                : "Create user account and profile demographics for the teacher."}
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-500">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {!selectedTeacher ? (
              <>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                    Email Address
                  </Label>
                  <Input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="prof.turing@eudora.app"
                    className="h-10 border-neutral-200 text-xs"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      First Name
                    </Label>
                    <Input
                      value={profileFirstName}
                      onChange={(e) => setProfileFirstName(e.target.value)}
                      placeholder="Alan"
                      className="h-10 border-neutral-200 text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                      Last Name
                    </Label>
                    <Input
                      value={profileLastName}
                      onChange={(e) => setProfileLastName(e.target.value)}
                      placeholder="Turing"
                      className="h-10 border-neutral-200 text-xs"
                      required
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Full Name
                </Label>
                <Input
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  className="h-10 border-neutral-200 text-xs"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Employee Code
                </Label>
                <Input
                  value={profileEmployeeCode}
                  onChange={(e) => setProfileEmployeeCode(e.target.value)}
                  placeholder="EMP-012"
                  className="h-10 border-neutral-200 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Contact Number
                </Label>
                <Input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="(555) 019-3832"
                  className="h-10 border-neutral-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Academic Specialization
              </Label>
              <Input
                value={profileSpecialization}
                onChange={(e) => setProfileSpecialization(e.target.value)}
                placeholder="Computer Science, Calculus, Chemistry"
                className="h-10 border-neutral-200 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Status
              </Label>
              <select
                value={profileStatus}
                onChange={(e: any) => setProfileStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ON_LEAVE">ON LEAVE</option>
              </select>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-neutral-100 pt-4">
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
                className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                {creatingProfile || updatingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Class Section Assignment Dialog */}
      <Dialog open={isClassDialogOpen} onOpenChange={setIsClassDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-neutral-200 bg-white p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-neutral-900">
              Section Allocations: {assignmentTeacher?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Assign or revoke section placements for class homerooms.
            </DialogDescription>
          </DialogHeader>

          {assignmentError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-500">
              <AlertCircle className="h-4 w-4" />
              {assignmentError}
            </div>
          )}

          <div className="space-y-6">
            <form
              onSubmit={handleAddAssignment}
              className="grid grid-cols-3 items-end gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4"
            >
              <div className="col-span-1 space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Class Section
                </Label>
                <select
                  value={assignSectionId}
                  onChange={(e) => setAssignSectionId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:outline-none"
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
                <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                  Teacher Role
                </Label>
                <select
                  value={assignRole}
                  onChange={(e) => setAssignRole(e.target.value)}
                  className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-xs text-neutral-900 focus:outline-none"
                  required
                >
                  <option value="PRIMARY">PRIMARY</option>
                  <option value="ASSISTANT">ASSISTANT</option>
                  <option value="SUBSTITUTE">SUBSTITUTE</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={assigning}
                className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                {assigning ? "Assigning..." : "Assign Section"}
              </Button>
            </form>

            <div className="space-y-2">
              <h3 className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                Currently Assigned Sections
              </h3>
              <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
                {assignmentTeacher?.classAssignments &&
                assignmentTeacher.classAssignments.length > 0 ? (
                  assignmentTeacher.classAssignments.map((a: any) => (
                    <div
                      key={a.classSectionId}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">
                          {a.classSection?.name || "Homeroom Class"}
                        </p>
                        <p className="text-[9px] font-semibold text-emerald-600">Role: {a.role}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveAssignment(a.classSectionId)}
                        variant="outline"
                        className="animate-fade-in h-8 rounded-lg border-rose-100 p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-center text-xs font-medium text-neutral-400">
                    No active class section allocations.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-neutral-100 pt-4">
            <Button
              type="button"
              onClick={() => setIsClassDialogOpen(false)}
              className="h-10 rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              Done Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
