"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  AlertCircle,
  User,
  Users,
  BookOpen,
  Trash
} from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  useGetStudentProfilesQuery,
  useCreateStudentProfileMutation,
  useUpdateStudentProfileMutation,
  useDeleteStudentProfileMutation,
  useGetUsersQuery,
  useGetAcademicYearsQuery,
  useGetClassSectionsQuery,
  useGetCourseClassesQuery,
  useCreateStudentPlacementMutation,
  useDeleteStudentPlacementMutation,
  useCreateStudentEnrollmentMutation,
  useDeleteStudentEnrollmentMutation,
} from "@/features/dashboard/dashboardApi";

export default function StudentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Queries & Mutations
  const { data: studentsData, isLoading: studentsLoading } = useGetStudentProfilesQuery();
  const { data: usersData } = useGetUsersQuery();
  const { data: yearsData } = useGetAcademicYearsQuery();
  const { data: sectionsData } = useGetClassSectionsQuery();
  const { data: courseClassesData } = useGetCourseClassesQuery();

  const [createStudentProfile, { isLoading: creatingProfile }] = useCreateStudentProfileMutation();
  const [updateStudentProfile, { isLoading: updatingProfile }] = useUpdateStudentProfileMutation();
  const [deleteStudentProfile] = useDeleteStudentProfileMutation();

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
  const [profileStatus, setProfileStatus] = useState<"ACTIVE" | "INACTIVE" | "SUSPENDED" | "GRADUATED">("ACTIVE");

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

  // Delete Student Profile
  const handleDeleteProfile = async (id: string) => {
    if (confirm("Are you sure you want to delete this student profile?")) {
      try {
        await deleteStudentProfile(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete student profile.");
      }
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
            classSection: sectionsData?.items?.find((s: any) => s.id === placementSectionId)
          }
        ]
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
          placements: prev.placements?.filter((p: any) => p.classSectionId !== classSectionId) || []
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
            courseClass: courseClassesData?.items?.find((c: any) => c.id === enrollmentClassId)
          }
        ]
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
          enrollments: prev.enrollments?.filter((e: any) => e.id !== id) || []
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
  const activePlacements = studentList.filter((s: any) => s.placements && s.placements.length > 0).length;
  const activeEnrollments = studentList.reduce((acc: number, s: any) => acc + (s.enrollments?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Student Roster
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Administer student profiles, class section placements, and course enrollment registers.
          </p>
        </div>
        <Button
          onClick={() => handleOpenProfileDialog()}
          className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> Add Student
        </Button>
      </div>

      {/* Metrics Bar */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Total Roster</span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {studentsLoading ? "..." : totalCount}
          </p>
          <p className="text-[10px] text-neutral-400">Registered student profiles</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Placed Sections</span>
            <GraduationCap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {studentsLoading ? "..." : activePlacements}
          </p>
          <p className="text-[10px] text-emerald-600 font-semibold">Assigned homeroom sections</p>
        </Card>

        <Card className="border border-neutral-200 bg-white p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider font-display">Subject Enrollments</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-neutral-900 font-display">
            {studentsLoading ? "..." : activeEnrollments}
          </p>
          <p className="text-[10px] text-neutral-400">Active class registries</p>
        </Card>
      </div>

      {/* Roster Directory list */}
      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Student Directory</h2>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 border border-neutral-200 rounded-xl bg-white text-xs text-neutral-700 focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SUSPENDED">SUSPENDED</option>
              <option value="GRADUATED">GRADUATED</option>
            </select>

            <div className="relative w-full sm:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="Search by student name..."
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Student Profile</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Gender</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Academic Route</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentsLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-50">
                    <td className="py-4"><div className="h-4 w-32 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-12 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-16 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-28 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-4"><div className="h-4 w-20 bg-neutral-100 animate-pulse rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredStudents.length > 0 ? (
                filteredStudents.map((student: any) => {
                  const initials = student.fullName
                    ? student.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                    : "S";

                  return (
                    <tr key={student.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white text-xs font-bold font-display flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-neutral-900">{student.fullName}</p>
                            <p className="text-[10px] text-neutral-400 flex items-center gap-0.5 mt-0.5">
                              <Mail className="w-3 h-3 text-neutral-300" /> {student.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-xs text-neutral-500 font-medium capitalize">
                        {student.gender?.toLowerCase()}
                      </td>
                      <td className="py-4 text-xs">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          student.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : student.status === "GRADUATED"
                            ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            : "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="space-y-1 max-w-[200px]">
                          {student.placements && student.placements.length > 0 ? (
                            student.placements.map((p: any) => (
                              <div key={p.classSectionId} className="inline-flex items-center gap-1 bg-emerald-50/50 border border-emerald-100/50 text-emerald-800 text-[9px] font-semibold px-2 py-0.5 rounded-md mr-1">
                                Section: {p.classSection?.name || "N/A"}
                              </div>
                            ))
                          ) : null}
                          {student.enrollments && student.enrollments.length > 0 ? (
                            student.enrollments.map((e: any) => (
                              <div key={e.id} className="inline-flex items-center gap-1 bg-blue-50/50 border border-blue-100/50 text-blue-800 text-[9px] font-semibold px-2 py-0.5 rounded-md mr-1">
                                Course: {e.courseClass?.name || "N/A"}
                              </div>
                            ))
                          ) : null}
                          {!student.placements?.length && !student.enrollments?.length && (
                            <span className="text-[9px] text-neutral-400 font-medium">Unscheduled</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            onClick={() => handleOpenAcademicDialog(student)}
                            variant="outline"
                            className="h-8 px-2.5 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 text-xs font-semibold flex items-center gap-1.5"
                          >
                            Route Setup
                          </Button>
                          <Button
                            onClick={() => handleOpenProfileDialog(student)}
                            variant="outline"
                            className="p-2 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteProfile(student.id)}
                            variant="outline"
                            className="p-2 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-neutral-400 font-medium">
                    No student profiles listed. Register a new student to begin schedule setups.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Profile Create / Edit Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display">
              {selectedStudent ? "Edit Student Profile" : "Register Student Profile"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Link the student profile to an active system user and fill demographics.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Full Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Charlotte Harris"
                className="h-10 text-xs border-neutral-200"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Link System User Account</Label>
              <select
                value={profileUserId}
                onChange={(e) => setProfileUserId(e.target.value)}
                className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                required
                disabled={!!selectedStudent}
              >
                <option value="" disabled>Select System User</option>
                {usersData?.items?.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name || `${u.firstName || ""} ${u.lastName || ""}`.trim()} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Birth Date</Label>
                <Input
                  type="date"
                  value={profileBirthDate}
                  onChange={(e) => setProfileBirthDate(e.target.value)}
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Gender</Label>
                <select
                  value={profileGender}
                  onChange={(e: any) => setProfileGender(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                >
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status</Label>
              <select
                value={profileStatus}
                onChange={(e: any) => setProfileStatus(e.target.value)}
                className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="GRADUATED">GRADUATED</option>
              </select>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingProfile || updatingProfile}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
              >
                {creatingProfile || updatingProfile ? "Saving..." : "Save Profile"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Academic Route Setup Dialog (Placements & Enrollments) */}
      <Dialog open={isAcademicDialogOpen} onOpenChange={setIsAcademicDialogOpen}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display">
              Route Config: {academicStudent?.fullName}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Design placements into homerooms and enrollment registries.
            </DialogDescription>
          </DialogHeader>

          {academicError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {academicError}
            </div>
          )}

          <Tabs defaultValue="placements" className="w-full">
            <TabsList className="bg-neutral-100 rounded-xl p-1 h-11 w-full grid grid-cols-2">
              <TabsTrigger value="placements" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white">
                Class Section Placements
              </TabsTrigger>
              <TabsTrigger value="enrollments" className="text-xs font-semibold rounded-lg data-[state=active]:bg-white">
                Course Class Enrollments
              </TabsTrigger>
            </TabsList>

            {/* Placements Tab */}
            <TabsContent value="placements" className="pt-4 space-y-6">
              <form onSubmit={handleAddPlacement} className="grid grid-cols-3 gap-3 items-end p-4 border border-neutral-100 bg-neutral-50/50 rounded-2xl">
                <div className="space-y-1 col-span-1">
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Class Section</Label>
                  <select
                    value={placementSectionId}
                    onChange={(e) => setPlacementSectionId(e.target.value)}
                    className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none"
                    required
                  >
                    <option value="" disabled>Select Section</option>
                    {sectionsData?.items?.filter((s: any) => s.status === "ACTIVE").map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-1 col-span-1">
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Academic Year</Label>
                  <select
                    value={placementYearId}
                    onChange={(e) => setPlacementYearId(e.target.value)}
                    className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none"
                    required
                  >
                    <option value="" disabled>Select Year</option>
                    {yearsData?.items?.filter((y: any) => y.status === "ACTIVE").map((y: any) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={placing}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer"
                >
                  {placing ? "Adding..." : "Place Student"}
                </Button>
              </form>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Placements</h3>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {academicStudent?.placements && academicStudent.placements.length > 0 ? (
                    academicStudent.placements.map((p: any) => (
                      <div key={p.classSectionId} className="flex justify-between items-center p-3 bg-white rounded-xl border border-neutral-200 shadow-sm">
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">{p.classSection?.name || "Homeroom Class"}</p>
                          <p className="text-[9px] font-mono text-neutral-400">Section Code: {p.classSection?.code || "N/A"}</p>
                        </div>
                        <Button
                          onClick={() => handleRemovePlacement(p.classSectionId)}
                          variant="outline"
                          className="p-2 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400 font-medium py-3 text-center">No active class section placements.</p>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Enrollments Tab */}
            <TabsContent value="enrollments" className="pt-4 space-y-6">
              <form onSubmit={handleAddEnrollment} className="flex gap-3 items-end p-4 border border-neutral-100 bg-neutral-50/50 rounded-2xl">
                <div className="space-y-1 flex-1">
                  <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Course Class</Label>
                  <select
                    value={enrollmentClassId}
                    onChange={(e) => setEnrollmentClassId(e.target.value)}
                    className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none"
                    required
                  >
                    <option value="" disabled>Select Course Class</option>
                    {courseClassesData?.items?.filter((c: any) => c.status === "ACTIVE").map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                <Button
                  type="submit"
                  disabled={enrolling}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 cursor-pointer shrink-0"
                >
                  {enrolling ? "Enrolling..." : "Enroll Student"}
                </Button>
              </form>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Course Enrollments</h3>
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {academicStudent?.enrollments && academicStudent.enrollments.length > 0 ? (
                    academicStudent.enrollments.map((e: any) => (
                      <div key={e.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-neutral-200 shadow-sm">
                        <div>
                          <p className="text-xs font-semibold text-neutral-900">{e.courseClass?.name || "Course Lecture"}</p>
                          <p className="text-[9px] font-mono text-neutral-400">Class Code: {e.courseClass?.code || "N/A"}</p>
                        </div>
                        <Button
                          onClick={() => handleRemoveEnrollment(e.id)}
                          variant="outline"
                          className="p-2 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-neutral-400 font-medium py-3 text-center">No active course class enrollments.</p>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4 border-t border-neutral-100">
            <Button
              type="button"
              onClick={() => setIsAcademicDialogOpen(false)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4"
            >
              Done Setup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
