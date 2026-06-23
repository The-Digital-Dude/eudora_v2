"use client";

import { Award, BookOpen, Clock, Download, FileText, Paperclip,Plus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { FileUploader } from "@/components/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useGetCourseClassesQuery } from "@/features/dashboard/dashboardApi";
import { useAppSelector } from "@/store/hooks";

import {
  useCreateHomeworkMutation,
  useGetCourseClassByIdQuery,
  useGetHomeworkForClassQuery,
  useGetHomeworkSubmissionsQuery,
} from "../homeworkApi";
import { HomeworkGradeDialog } from "./HomeworkGradeDialog";

export function TeacherHomeworkView() {
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

  // Teacher Workspace States
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [activeHomeworkId, setActiveHomeworkId] = React.useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // Homework create fields
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newDueDate, setNewDueDate] = React.useState("");
  const [newMaxPoints, setNewMaxPoints] = React.useState(100);
  const [newAttachments, setNewAttachments] = React.useState<string[]>([]);

  // Grading modal trigger states
  const [gradingModalOpen, setGradingModalOpen] = React.useState(false);
  const [editingSubmissionId, setEditingSubmissionId] = React.useState<string>("");
  const [gradePoints, setGradePoints] = React.useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = React.useState<string>("");

  // Queries
  const { data: courseClassesData, isLoading: isLoadingClasses } = useGetCourseClassesQuery();
  const courseClasses = courseClassesData?.items || [];

  // Set default class if empty
  React.useEffect(() => {
    if (courseClasses.length > 0 && !selectedClassId) {
      setSelectedClassId(courseClasses[0].id);
    }
  }, [courseClasses, selectedClassId]);

  // Load Homework List
  const { data: homeworkList, isLoading: isLoadingHomework } = useGetHomeworkForClassQuery(
    selectedClassId,
    { skip: !selectedClassId || (!isAdmin && !isTeacher) },
  );

  // Load Course Class details for roster
  const { data: courseClassDetails } = useGetCourseClassByIdQuery(selectedClassId, {
    skip: !selectedClassId || (!isAdmin && !isTeacher),
  });
  const enrolledStudents = courseClassDetails?.enrollments || [];

  // Load Submissions List for selected homework
  const { data: submissions, refetch: refetchSubmissions } = useGetHomeworkSubmissionsQuery(
    activeHomeworkId,
    { skip: !activeHomeworkId || (!isAdmin && !isTeacher) },
  );

  // Mutations
  const [createHomework, { isLoading: isCreating }] = useCreateHomeworkMutation();

  // Active homework object
  const activeHomework = React.useMemo(() => {
    return homeworkList?.find((h) => h.id === activeHomeworkId) || null;
  }, [homeworkList, activeHomeworkId]);

  // Handle Homework Creation
  const handleCreateHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDueDate || !selectedClassId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      await createHomework({
        courseClassId: selectedClassId,
        title: newTitle,
        description: newDescription || undefined,
        dueDate: new Date(newDueDate).toISOString(),
        maxPoints: Number(newMaxPoints),
        attachmentUrls: newAttachments,
      }).unwrap();

      toast.success("Homework assignment distributed successfully!");
      setCreateDialogOpen(false);
      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewMaxPoints(100);
      setNewAttachments([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to create homework.");
    }
  };

  // Helper to resolve submission mapping for enrolled students
  const studentSubmissionMap = React.useMemo(() => {
    if (!submissions) return new Map<string, any>();
    return new Map<string, any>(submissions.map((s) => [s.studentProfileId, s]));
  }, [submissions]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-neutral-50">
            <BookOpen className="h-6 w-6 text-rose-500" />
            Homework Assignments Workspace
          </h1>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Distribute coursework tasks, upload resource materials, track submissions, and grade student portfolios.
          </p>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="h-11 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
        >
          <Plus className="mr-2 h-4 w-4" />
          Distribute Homework
        </Button>
      </div>

      {/* Control panel selector */}
      <div className="grid grid-cols-1 gap-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:grid-cols-3">
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Subject Course Class
          </Label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setActiveHomeworkId("");
            }}
            className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50/55 px-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
          >
            {isLoadingClasses ? (
              <option>Loading course classes...</option>
            ) : (
              courseClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="flex flex-col justify-end">
          <Badge className="flex h-11 justify-center border border-neutral-200 bg-neutral-50/50 text-[10px] font-bold text-neutral-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            Total Enrolled: {enrolledStudents.length} Students
          </Badge>
        </div>
      </div>

      {/* Main split work layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Homework list */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-zinc-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Course Homework List
            </span>
          </div>

          {isLoadingHomework ? (
            <div className="py-8 text-center text-xs text-neutral-400">Loading assignments list...</div>
          ) : !homeworkList || homeworkList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-neutral-200 py-12 text-center text-xs text-neutral-400 dark:border-zinc-800">
              No tasks posted for this course class.
            </div>
          ) : (
            homeworkList.map((hw) => {
              const isActive = hw.id === activeHomeworkId;
              return (
                <div
                  key={hw.id}
                  onClick={() => setActiveHomeworkId(hw.id)}
                  className={`flex h-32 cursor-pointer flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isActive
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-neutral-900"
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-neutral-200 dark:hover:border-zinc-700"
                  }`}
                >
                  <div>
                    <h3 className="line-clamp-1 text-xs font-bold">{hw.title}</h3>
                    <p
                      className={`mt-1.5 line-clamp-2 text-[10px] ${
                        isActive ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      {hw.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-dashed border-neutral-200/20 pt-2 text-[9px]">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(hw.dueDate).toLocaleDateString()}
                    </span>
                    <span className="font-bold">{hw.maxPoints} Pts</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Submissions Grading Workspace */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between rounded-2xl bg-neutral-50 p-3 dark:bg-zinc-900">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {activeHomework ? `Grading Panel: ${activeHomework.title}` : "Submissions Workspace"}
            </span>
          </div>

          {!activeHomeworkId ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50/50 p-12 text-center text-xs text-neutral-400 dark:border-zinc-800 dark:bg-zinc-900/10">
              <FileText className="mb-3 h-12 w-12 text-neutral-300 dark:text-zinc-800" />
              <p className="font-bold">No Homework Selected</p>
              <p className="mt-1 text-[10px]">
                Please select an assignment from the left panel to review files and input scores.
              </p>
            </div>
          ) : (
            <Card className="overflow-hidden rounded-3xl border-neutral-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/60 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-neutral-500">
                      <th className="px-6 py-3">Student Profile</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Submitted Date</th>
                      <th className="px-6 py-3 text-center">Score Grade</th>
                      <th className="px-6 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 text-xs text-neutral-800 dark:divide-zinc-800 dark:text-neutral-200">
                    {enrolledStudents.map((rel: any) => {
                      const student = rel.studentProfile;
                      const sub = studentSubmissionMap.get(student.id);
                      const isSubmitted = !!sub;

                      const statusColors = {
                        PENDING: "bg-neutral-100 text-neutral-500",
                        SUBMITTED:
                          "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                        LATE: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                        GRADED:
                          "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                      };

                      const displayStatus = (
                        isSubmitted ? sub.status : "PENDING"
                      ) as "PENDING" | "SUBMITTED" | "LATE" | "GRADED";

                      return (
                        <React.Fragment key={student.id}>
                          <tr className="transition-colors hover:bg-neutral-50/40 dark:hover:bg-zinc-900/10">
                            <td className="px-6 py-4 font-bold">{student.fullName}</td>
                            <td className="px-6 py-4">
                              <Badge
                                variant="outline"
                                className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase ${statusColors[displayStatus]}`}
                              >
                                {displayStatus}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-[10px] font-semibold text-neutral-400">
                              {isSubmitted ? new Date(sub.submissionDate).toLocaleString() : "Unsubmitted"}
                            </td>
                            <td className="px-6 py-4 text-center font-bold">
                              {isSubmitted && sub.status === "GRADED" ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {sub.pointsEarned} / {activeHomework?.maxPoints} pts
                                </span>
                              ) : (
                                <span className="text-neutral-400">--</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {isSubmitted ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingSubmissionId(sub.id);
                                    setGradePoints(sub.pointsEarned || 0);
                                    setGradeFeedback(sub.feedback || "");
                                    setGradingModalOpen(true);
                                  }}
                                  className="flex h-8 cursor-pointer items-center gap-1 rounded-xl bg-neutral-900 px-3 text-[10px] font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900"
                                >
                                  <Award className="h-3.5 w-3.5" />
                                  Grade
                                </Button>
                              ) : (
                                <span className="text-neutral-300 dark:text-zinc-800">--</span>
                              )}
                            </td>
                          </tr>

                          {/* Extra info drawer if student submitted */}
                          {isSubmitted && (
                            <tr className="bg-neutral-50/20 dark:bg-zinc-900/5">
                              <td
                                colSpan={5}
                                className="border-b border-neutral-100/50 px-6 py-2.5 dark:border-zinc-900"
                              >
                                <div className="space-y-1.5 text-[10px] leading-relaxed text-neutral-500 dark:text-neutral-400">
                                  {sub.content && (
                                    <div className="rounded-xl border border-neutral-200 bg-white p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
                                      <span className="mb-1 block text-[8px] font-bold uppercase text-neutral-400">
                                        Student text submission
                                      </span>
                                      {sub.content}
                                    </div>
                                  )}

                                  {sub.attachmentUrls && sub.attachmentUrls.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[8px] font-bold uppercase text-neutral-400">
                                        Student files:
                                      </span>
                                      {sub.attachmentUrls.map((url: string, i: number) => (
                                        <a
                                          key={i}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[9px] text-neutral-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-neutral-400"
                                        >
                                          <Download className="h-3 w-3 text-neutral-400" />
                                          Attachment {i + 1}
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Teacher Distribute Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md overflow-hidden rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-neutral-900 dark:text-neutral-50">
              <Plus className="h-5 w-5 text-rose-500" />
              Distribute New Homework Task
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Fill in the parameters below to assign homework to the selected class.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHomework} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Homework Title
              </Label>
              <Input
                type="text"
                placeholder="e.g. Algebra Worksheet Week 3"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Description / Instructions
              </Label>
              <textarea
                placeholder="Write worksheet details or book chapter exercises here..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="h-20 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Max Score Points
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={newMaxPoints}
                  onChange={(e) => setNewMaxPoints(Number(e.target.value))}
                  className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Due Date & Time
                </Label>
                <Input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="h-10 rounded-xl border-neutral-200 bg-neutral-50/50 text-xs dark:border-zinc-800 dark:bg-zinc-900/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Reference Attachments
              </Label>
              <FileUploader
                onUploadSuccess={(url) => {
                  setNewAttachments((prev) => [...prev, url]);
                  toast.success("Teacher attachment file uploaded.");
                }}
                label="Upload homework resource file"
              />

              {newAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {newAttachments.map((url, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="flex items-center gap-1.5 rounded-lg border-none bg-neutral-100 px-2 py-1 text-[9px] text-neutral-700 hover:bg-neutral-200"
                    >
                      <Paperclip className="h-3 w-3" />
                      Attachment {i + 1}
                      <button
                        type="button"
                        onClick={() =>
                          setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="ml-1 text-xs font-bold hover:text-rose-500"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
                className="h-10 cursor-pointer rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="h-10 cursor-pointer rounded-xl bg-neutral-900 px-4 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
              >
                {isCreating ? "Distributing..." : "Assign Tasks"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {activeHomework && (
        <HomeworkGradeDialog
          submissionId={editingSubmissionId}
          maxPoints={activeHomework.maxPoints}
          open={gradingModalOpen}
          onOpenChange={setGradingModalOpen}
          onGradeSuccess={refetchSubmissions}
          initialPoints={gradePoints}
          initialFeedback={gradeFeedback}
        />
      )}
    </div>
  );
}
