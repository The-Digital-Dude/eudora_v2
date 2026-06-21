"use client";

import * as React from "react";
import { useAppSelector } from "@/store/hooks";
import {
  useGetHomeworkForClassQuery,
  useGetHomeworkSubmissionsQuery,
  useGetStudentSubmissionsQuery,
  useGetStudentPendingHomeworkQuery,
  useGetMyPendingHomeworkQuery,
  useCreateHomeworkMutation,
  useUpdateHomeworkMutation,
  useSubmitHomeworkMutation,
  useGradeHomeworkSubmissionMutation,
  useGetCourseClassByIdQuery,
} from "@/features/academic/homeworkApi";
import { useGetCourseClassesQuery } from "@/features/dashboard/dashboardApi";
import { FileUploader } from "@/components/file-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Calendar,
  FileText,
  Plus,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ClipboardList,
  ChevronRight,
  Download,
  AlertCircle,
  User,
  Paperclip,
  Award,
  MessageSquare
} from "lucide-react";

export default function HomeworkPage() {
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

  // 1. TEACHER / ADMIN WORKSPACE STATES
  const [selectedClassId, setSelectedClassId] = React.useState<string>("");
  const [activeHomeworkId, setActiveHomeworkId] = React.useState<string>("");
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  // Homework create fields
  const [newTitle, setNewTitle] = React.useState("");
  const [newDescription, setNewDescription] = React.useState("");
  const [newDueDate, setNewDueDate] = React.useState("");
  const [newMaxPoints, setNewMaxPoints] = React.useState(100);
  const [newAttachments, setNewAttachments] = React.useState<string[]>([]);

  // Grading fields
  const [editingSubmissionId, setEditingSubmissionId] = React.useState<string>("");
  const [gradePoints, setGradePoints] = React.useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = React.useState<string>("");

  // 2. STUDENT WORKSPACE STATES
  const [studentTab, setStudentTab] = React.useState<"pending" | "submissions">("pending");
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false);
  const [submitHomeworkId, setSubmitHomeworkId] = React.useState<string>("");
  const [submissionContent, setSubmissionContent] = React.useState("");
  const [submissionAttachments, setSubmissionAttachments] = React.useState<string[]>([]);

  // 3. GUARDIAN STATES
  const linkedStudents = user?.guardianProfile?.students || [];
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    linkedStudents[0]?.studentProfileId || ""
  );

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
    { skip: !selectedClassId || !isAdmin && !isTeacher }
  );

  // Load Course Class details for roster
  const { data: courseClassDetails } = useGetCourseClassByIdQuery(
    selectedClassId,
    { skip: !selectedClassId || !isAdmin && !isTeacher }
  );
  const enrolledStudents = courseClassDetails?.enrollments || [];

  // Load Submissions List for selected homework
  const { data: submissions, refetch: refetchSubmissions } = useGetHomeworkSubmissionsQuery(
    activeHomeworkId,
    { skip: !activeHomeworkId || !isAdmin && !isTeacher }
  );

  // Load Student Pending Homework
  const studentProfileId = user?.studentProfile?.id || "";
  const { data: studentPendingList, refetch: refetchStudentPending } = useGetStudentPendingHomeworkQuery(
    studentProfileId,
    { skip: !isStudent }
  );

  // Load Student Submissions History
  const { data: studentSubmissions, refetch: refetchStudentSubmissions } = useGetStudentSubmissionsQuery(
    isStudent ? studentProfileId : selectedStudentId,
    { skip: !isStudent && (!isGuardian || !selectedStudentId) }
  );

  // Mutations
  const [createHomework, { isLoading: isCreating }] = useCreateHomeworkMutation();
  const [submitHomework, { isLoading: isSubmitting }] = useSubmitHomeworkMutation();
  const [gradeSubmission, { isLoading: isGrading }] = useGradeHomeworkSubmissionMutation();

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

  // Handle Submission Grading
  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubmissionId) return;

    try {
      await gradeSubmission({
        submissionId: editingSubmissionId,
        pointsEarned: Number(gradePoints),
        feedback: gradeFeedback || undefined,
      }).unwrap();

      toast.success("Submission graded successfully!");
      setEditingSubmissionId("");
      setGradePoints(0);
      setGradeFeedback("");
      refetchSubmissions();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to grade submission.");
    }
  };

  // Handle Student Submit Homework
  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionContent && submissionAttachments.length === 0) {
      toast.error("Please type a response or upload at least one submission file.");
      return;
    }

    try {
      await submitHomework({
        homeworkId: submitHomeworkId,
        content: submissionContent || undefined,
        attachmentUrls: submissionAttachments,
      }).unwrap();

      toast.success("Homework submitted successfully!");
      setSubmitDialogOpen(false);
      setSubmissionContent("");
      setSubmissionAttachments([]);
      setSubmitHomeworkId("");
      refetchStudentPending();
      refetchStudentSubmissions();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit homework.");
    }
  };

  // Helper to resolve submission mapping for enrolled students
  const studentSubmissionMap = React.useMemo(() => {
    if (!submissions) return new Map<string, any>();
    return new Map<string, any>(submissions.map((s) => [s.studentProfileId, s]));
  }, [submissions]);

  // --- RENDER VIEWS BY ROLE ---

  // 1. STUDENT OR GUARDIAN VIEW
  if (isStudent || isGuardian) {
    const listToRender = isStudent && studentTab === "pending" ? studentPendingList : studentSubmissions;

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-violet-500" />
              My Homework & Tasks
            </h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              {isStudent
                ? "Submit pending class assignments and review scores."
                : "View school assignments completion status and grading feedback."}
            </p>
          </div>
        </div>

        {isGuardian && linkedStudents.length > 1 && (
          <div className="bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 flex gap-2">
            {linkedStudents.map((rel: any) => (
              <Button
                key={rel.studentProfileId}
                variant={selectedStudentId === rel.studentProfileId ? "default" : "outline"}
                onClick={() => setSelectedStudentId(rel.studentProfileId)}
                className="rounded-xl text-xs font-semibold px-4 cursor-pointer"
              >
                {rel.studentProfile?.fullName || "Student"}
              </Button>
            ))}
          </div>
        )}

        {isStudent && (
          <div className="flex gap-2 bg-neutral-100 dark:bg-zinc-900 p-1 rounded-xl w-fit">
            <Button
              size="sm"
              variant={studentTab === "pending" ? "default" : "ghost"}
              onClick={() => setStudentTab("pending")}
              className="rounded-lg text-xs font-bold px-4 h-9 cursor-pointer"
            >
              Pending Assignments ({studentPendingList?.length ?? 0})
            </Button>
            <Button
              size="sm"
              variant={studentTab === "submissions" ? "default" : "ghost"}
              onClick={() => setStudentTab("submissions")}
              className="rounded-lg text-xs font-bold px-4 h-9 cursor-pointer"
            >
              Submission History ({studentSubmissions?.length ?? 0})
            </Button>
          </div>
        )}

        {/* List of assignments */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!listToRender || listToRender.length === 0 ? (
            <div className="md:col-span-2 text-center py-12 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-3xl bg-neutral-50/50 dark:bg-zinc-900/10">
              <FileText className="w-12 h-12 text-neutral-300 dark:text-zinc-800 mx-auto mb-3" />
              <p className="font-bold">No assignments found</p>
              <p className="text-[10px] mt-1 text-neutral-400">All caught up or no tasks posted.</p>
            </div>
          ) : (
            listToRender.map((item: any) => {
              // Item might be Homework (pending) or HomeworkSubmission (history)
              const hw = item.homework || item;
              const isSubmission = !!item.status;
              const statusColors = {
                PENDING: "bg-neutral-50 text-neutral-500 border-neutral-200",
                SUBMITTED: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400",
                LATE: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400",
                GRADED: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400",
              };

              return (
                <Card
                  key={item.id}
                  className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col justify-between"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold mb-1.5 rounded-lg border-neutral-200 text-neutral-400">
                          {hw.courseClass?.name || "Subject"}
                        </Badge>
                        <CardTitle className="text-sm font-black text-neutral-800 dark:text-neutral-200">
                          {hw.title}
                        </CardTitle>
                      </div>
                      <Badge className={`text-[9px] font-bold py-0.5 px-2 rounded-lg border uppercase ${isSubmission ? statusColors[item.status as keyof typeof statusColors] : "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400"}`}>
                        {isSubmission ? item.status : "Assigned"}
                      </Badge>
                    </div>
                    {hw.description && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-3 leading-relaxed">
                        {hw.description}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-4">
                    {/* Attachments from teacher */}
                    {hw.attachmentUrls && hw.attachmentUrls.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-neutral-100 dark:border-zinc-900">
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Teacher Materials</span>
                        <div className="flex flex-wrap gap-1.5">
                          {hw.attachmentUrls.map((url: string, index: number) => (
                            <a
                              key={index}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-lg text-[10px] text-neutral-600 dark:text-neutral-400 transition-colors"
                            >
                              <Paperclip className="w-3 h-3 text-neutral-400" />
                              Material {index + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Grading results details */}
                    {isSubmission && item.status === "GRADED" && (
                      <div className="bg-emerald-50/30 dark:bg-emerald-500/5 p-3 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> Grade Earned</span>
                          <span>{item.pointsEarned} / {hw.maxPoints} pts</span>
                        </div>
                        {item.feedback && (
                          <p className="text-[10px] text-emerald-800 dark:text-emerald-400 italic">
                            &ldquo;{item.feedback}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Actions and due dates */}
                    <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-zinc-900 text-[10px]">
                      <span className="text-neutral-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-300" />
                        Due: {new Date(hw.dueDate).toLocaleString()}
                      </span>

                      {isStudent && !isSubmission && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSubmitHomeworkId(hw.id);
                            setSubmitDialogOpen(true);
                          }}
                          className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold h-8 text-[10px] px-3.5 cursor-pointer flex items-center gap-1.5"
                        >
                          <Send className="w-3 h-3" />
                          Submit Task
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Student Submit Dialog */}
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
                <Send className="w-5 h-5 text-violet-500" />
                Submit Homework Assignment
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500">
                Submit text responses, links, or file attachments for grading.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitHomework} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Solution Text / Link</Label>
                <textarea
                  placeholder="Type your notes or response details here..."
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  className="w-full h-24 p-3 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 focus:outline-none resize-none text-neutral-800 dark:text-neutral-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">File Attachments</Label>
                <FileUploader
                  onUploadSuccess={(url) => {
                    setSubmissionAttachments((prev) => [...prev, url]);
                    toast.success("File uploaded successfully.");
                  }}
                  label="Upload submission file"
                />

                {submissionAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {submissionAttachments.map((url, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="rounded-lg text-[9px] py-1 px-2 flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 border-none text-neutral-700"
                      >
                        <Paperclip className="w-3 h-3" />
                        Attachment {i + 1}
                        <button
                          type="button"
                          onClick={() => setSubmissionAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                          className="hover:text-rose-500 font-bold ml-1 text-xs"
                        >
                          &times;
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSubmitDialogOpen(false)}
                  className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white h-10 text-xs font-semibold px-4 cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? "Submitting..." : "Submit Homework"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // 2. TEACHER OR ADMIN WORKSPACE VIEW
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight font-display flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-rose-500" />
            Homework Assignments Workspace
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Distribute coursework tasks, upload resource materials, track submissions, and grade student portfolios.
          </p>
        </div>

        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="rounded-xl bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 text-xs font-semibold h-11 px-4 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Distribute Homework
        </Button>
      </div>

      {/* Control panel selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm">
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Subject Course Class</Label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setActiveHomeworkId("");
            }}
            className="w-full h-11 px-3 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 text-neutral-800 dark:text-neutral-200 focus:outline-none"
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
          <Badge className="h-11 rounded-xl text-[10px] py-1 border border-neutral-200 bg-neutral-50/50 dark:bg-zinc-900/50 text-neutral-500 flex justify-center items-center font-bold">
            Total Enrolled: {enrolledStudents.length} Students
          </Badge>
        </div>
      </div>

      {/* Main split work layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Homework list */}
        <div className="space-y-4">
          <div className="bg-neutral-50 dark:bg-zinc-900 p-3 rounded-2xl">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">Course Homework List</span>
          </div>

          {isLoadingHomework ? (
            <div className="text-center py-8 text-xs text-neutral-400">
              Loading assignments list...
            </div>
          ) : !homeworkList || homeworkList.length === 0 ? (
            <div className="text-center py-12 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-3xl">
              No tasks posted for this course class.
            </div>
          ) : (
            homeworkList.map((hw) => {
              const isActive = hw.id === activeHomeworkId;
              return (
                <div
                  key={hw.id}
                  onClick={() => setActiveHomeworkId(hw.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                    isActive
                      ? "bg-neutral-900 border-neutral-900 text-white dark:bg-zinc-100 dark:border-zinc-100 dark:text-neutral-900"
                      : "bg-white border-neutral-200 hover:border-neutral-300 dark:bg-zinc-950 dark:border-zinc-800 dark:hover:border-zinc-700 text-neutral-800 dark:text-neutral-200"
                  }`}
                >
                  <div>
                    <h3 className="text-xs font-bold line-clamp-1">{hw.title}</h3>
                    <p className={`text-[10px] mt-1.5 line-clamp-2 ${isActive ? "text-neutral-300 dark:text-neutral-600" : "text-neutral-400 dark:text-neutral-500"}`}>
                      {hw.description || "No description provided."}
                    </p>
                  </div>

                  <div className="flex justify-between items-center text-[9px] pt-2 border-t border-dashed border-neutral-200/20">
                    <span className="font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
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
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-neutral-50 dark:bg-zinc-900 p-3 rounded-2xl flex justify-between items-center">
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-wider">
              {activeHomework ? `Grading Panel: ${activeHomework.title}` : "Submissions Workspace"}
            </span>
          </div>

          {!activeHomeworkId ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-zinc-800 rounded-3xl bg-neutral-50/50 dark:bg-zinc-900/10 h-72">
              <FileText className="w-12 h-12 text-neutral-300 dark:text-zinc-800 mb-3" />
              <p className="font-bold">No Homework Selected</p>
              <p className="text-[10px] mt-1">Please select an assignment from the left panel to review files and input scores.</p>
            </div>
          ) : (
            <Card className="rounded-3xl border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neutral-50/60 dark:bg-zinc-900/40 border-b border-neutral-100 dark:border-zinc-800 text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                      <th className="py-3 px-6">Student Profile</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Submitted Date</th>
                      <th className="py-3 px-6 text-center">Score Grade</th>
                      <th className="py-3 px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-zinc-800 text-xs text-neutral-800 dark:text-neutral-200">
                    {enrolledStudents.map((rel: any) => {
                      const student = rel.studentProfile;
                      const sub = studentSubmissionMap.get(student.id);
                      const isSubmitted = !!sub;

                      const statusColors = {
                        PENDING: "bg-neutral-100 text-neutral-500",
                        SUBMITTED: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
                        LATE: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                        GRADED: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                      };

                      const displayStatus = (isSubmitted ? sub.status : "PENDING") as "PENDING" | "SUBMITTED" | "LATE" | "GRADED";

                      return (
                        <React.Fragment key={student.id}>
                          <tr className="hover:bg-neutral-50/40 dark:hover:bg-zinc-900/10 transition-colors">
                            <td className="py-4 px-6 font-bold">{student.fullName}</td>
                            <td className="py-4 px-6">
                              <Badge variant="outline" className={`text-[9px] font-bold py-0.5 px-2 rounded-lg border uppercase ${statusColors[displayStatus]}`}>
                                {displayStatus}
                              </Badge>
                            </td>
                            <td className="py-4 px-6 text-neutral-400 font-semibold text-[10px]">
                              {isSubmitted ? new Date(sub.submissionDate).toLocaleString() : "Unsubmitted"}
                            </td>
                            <td className="py-4 px-6 text-center font-bold">
                              {isSubmitted && sub.status === "GRADED" ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  {sub.pointsEarned} / {activeHomework?.maxPoints} pts
                                </span>
                              ) : (
                                <span className="text-neutral-400">--</span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {isSubmitted ? (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setEditingSubmissionId(sub.id);
                                    setGradePoints(sub.pointsEarned || 0);
                                    setGradeFeedback(sub.feedback || "");
                                  }}
                                  className="rounded-xl h-8 text-[10px] px-3 font-semibold bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 cursor-pointer text-white dark:text-neutral-900 flex items-center gap-1"
                                >
                                  <Award className="w-3.5 h-3.5" />
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
                              <td colSpan={5} className="py-2.5 px-6 border-b border-neutral-100/50 dark:border-zinc-900">
                                <div className="space-y-1.5 text-[10px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                                  {sub.content && (
                                    <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-neutral-200 dark:border-zinc-800">
                                      <span className="font-bold block text-neutral-400 uppercase text-[8px] mb-1">Student text submission</span>
                                      {sub.content}
                                    </div>
                                  )}

                                  {sub.attachmentUrls && sub.attachmentUrls.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      <span className="font-bold text-neutral-400 uppercase text-[8px]">Student files:</span>
                                      {sub.attachmentUrls.map((url: string, i: number) => (
                                        <a
                                          key={i}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-neutral-200 dark:bg-zinc-900 dark:border-zinc-800 rounded-md text-[9px] text-neutral-600 dark:text-neutral-400"
                                        >
                                          <Download className="w-3 h-3 text-neutral-400" />
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
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <Plus className="w-5 h-5 text-rose-500" />
              Distribute New Homework Task
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Fill in the parameters below to assign homework to the selected class.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHomework} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Homework Title</Label>
              <Input
                type="text"
                placeholder="e.g. Algebra Worksheet Week 3"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Description / Instructions</Label>
              <textarea
                placeholder="Write worksheet details or book chapter exercises here..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full h-20 p-3 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 focus:outline-none resize-none text-neutral-800 dark:text-neutral-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Max Score Points</Label>
                <Input
                  type="number"
                  min={1}
                  value={newMaxPoints}
                  onChange={(e) => setNewMaxPoints(Number(e.target.value))}
                  className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Due Date & Time</Label>
                <Input
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Reference Attachments</Label>
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
                      className="rounded-lg text-[9px] py-1 px-2 flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 border-none text-neutral-700"
                    >
                      <Paperclip className="w-3 h-3" />
                      Attachment {i + 1}
                      <button
                        type="button"
                        onClick={() => setNewAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-rose-500 font-bold ml-1 text-xs"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateDialogOpen(false)}
                className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="rounded-xl bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 h-10 text-xs font-semibold px-4 cursor-pointer"
              >
                {isCreating ? "Distributing..." : "Assign Tasks"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Teacher Grading Dialog */}
      <Dialog open={!!editingSubmissionId} onOpenChange={() => setEditingSubmissionId("")}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-neutral-50 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-500" />
              Grade Student Submission
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Input score points and feedback comments.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGradeSubmission} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Points Earned (Max: {activeHomework?.maxPoints} pts)
              </Label>
              <Input
                type="number"
                min={0}
                max={activeHomework?.maxPoints}
                value={gradePoints}
                onChange={(e) => setGradePoints(Number(e.target.value))}
                className="h-10 rounded-xl border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Teacher Feedback</Label>
              <textarea
                placeholder="Write feedback comments or grading notes..."
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                className="w-full h-24 p-3 rounded-xl border border-neutral-200 dark:border-zinc-800 text-xs bg-neutral-50/50 dark:bg-zinc-900/50 focus:outline-none resize-none text-neutral-800 dark:text-neutral-200"
              />
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingSubmissionId("")}
                className="rounded-xl h-10 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isGrading}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white h-10 text-xs font-semibold px-4 cursor-pointer"
              >
                {isGrading ? "Submitting..." : "Save Grade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
