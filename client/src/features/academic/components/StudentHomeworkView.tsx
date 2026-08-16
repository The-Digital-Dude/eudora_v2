"use client";

import { Award, BookOpen, Clock,FileText, Paperclip, Send } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent,CardHeader, CardTitle } from "@/components/ui/card";
import { useAppSelector } from "@/store/hooks";

import {
  useGetStudentPendingHomeworkQuery,
  useGetStudentSubmissionsQuery,
} from "../homeworkApi";
import { HomeworkSubmitDialog } from "./HomeworkSubmitDialog";

export function StudentHomeworkView() {
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;

  // Resolve roles
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

  const isStudent = userRoles.includes("USER") && user?.studentProfile;
  const isGuardian = userRoles.includes("GUARDIAN") && user?.guardianProfile;

  // Student Workspace States
  const [studentTab, setStudentTab] = React.useState<"pending" | "submissions">("pending");
  const [submitDialogOpen, setSubmitDialogOpen] = React.useState(false);
  const [submitHomeworkId, setSubmitHomeworkId] = React.useState<string>("");

  // Guardian States
  const linkedStudents = user?.guardianProfile?.students || [];
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>(
    linkedStudents[0]?.studentProfileId || "",
  );

  const studentProfileId = user?.studentProfile?.id || "";

  // Queries
  const { data: studentPendingList, refetch: refetchStudentPending } =
    useGetStudentPendingHomeworkQuery(studentProfileId, { skip: !isStudent });

  const { data: studentSubmissions, refetch: refetchStudentSubmissions } =
    useGetStudentSubmissionsQuery(isStudent ? studentProfileId : selectedStudentId, {
      skip: !isStudent && (!isGuardian || !selectedStudentId),
    });

  const listToRender = isStudent && studentTab === "pending" ? studentPendingList : studentSubmissions;

  const handleSubmissionSuccess = () => {
    refetchStudentPending();
    refetchStudentSubmissions();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
            <BookOpen className="h-6 w-6 text-primary" />
            My Homework & Tasks
          </h1>
          <p className="text-xs font-medium text-muted-foreground">
            {isStudent
              ? "Submit pending class assignments and review scores."
              : "View school assignments completion status and grading feedback."}
          </p>
        </div>
      </div>

      {isGuardian && linkedStudents.length > 1 && (
        <div className="flex gap-2 rounded-2xl border border-border bg-card p-4">
          {linkedStudents.map((rel: any) => (
            <Button
              key={rel.studentProfileId}
              variant={selectedStudentId === rel.studentProfileId ? "default" : "outline"}
              onClick={() => setSelectedStudentId(rel.studentProfileId)}
              className="cursor-pointer rounded-xl px-4 text-xs font-semibold"
            >
              {rel.studentProfile?.fullName || "Student"}
            </Button>
          ))}
        </div>
      )}

      {isStudent && (
        <div className="flex w-fit gap-2 rounded-xl bg-muted p-1">
          <Button
            size="sm"
            variant={studentTab === "pending" ? "default" : "ghost"}
            onClick={() => setStudentTab("pending")}
            className="h-9 cursor-pointer rounded-lg px-4 text-xs font-bold"
          >
            Pending Assignments ({studentPendingList?.length ?? 0})
          </Button>
          <Button
            size="sm"
            variant={studentTab === "submissions" ? "default" : "ghost"}
            onClick={() => setStudentTab("submissions")}
            className="h-9 cursor-pointer rounded-lg px-4 text-xs font-bold"
          >
            Submission History ({studentSubmissions?.length ?? 0})
          </Button>
        </div>
      )}

      {/* List of assignments */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {!listToRender || listToRender.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/50 py-12 text-center text-xs text-muted-foreground/10 md:col-span-2">
            <FileText className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="font-bold">No assignments found</p>
            <p className="mt-1 text-[10px] text-muted-foreground">All caught up or no tasks posted.</p>
          </div>
        ) : (
          listToRender.map((item: any) => {
            const hw = item.homework || item;
            const isSubmission = !!item.status;
            const statusColors = {
              PENDING: "bg-muted/50 text-muted-foreground border-border",
              SUBMITTED:
                "bg-primary/10 text-primary border-primary/20",
              LATE: "bg-warning/10 text-warning border-warning/20",
              GRADED:
                "bg-success/10 text-success border-success/20",
            };

            return (
              <Card
                key={item.id}
                className="flex flex-col justify-between overflow-hidden rounded-3xl border-border bg-card shadow-sm"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge
                        variant="outline"
                        className="mb-1.5 rounded-lg border-border text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
                      >
                        {hw.batch?.name || "Subject"}
                      </Badge>
                      <CardTitle className="text-sm font-black text-foreground">
                        {hw.title}
                      </CardTitle>
                    </div>
                    <Badge
                      className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase ${
                        isSubmission
                          ? statusColors[item.status as keyof typeof statusColors]
                          : "bg-primary/10 text-primary border-primary/20"
                      }`}
                    >
                      {isSubmission ? item.status : "Assigned"}
                    </Badge>
                  </div>
                  {hw.description && (
                    <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
                      {hw.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="space-y-4 p-5 pt-0">
                  {/* Attachments from teacher */}
                  {hw.attachmentUrls && hw.attachmentUrls.length > 0 && (
                    <div className="space-y-1.5 border-t border-border pt-2">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        Teacher Materials
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {hw.attachmentUrls.map((url: string, index: number) => (
                          <a
                            key={index}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
                          >
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                            Material {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grading results details */}
                  {isSubmission && item.status === "GRADED" && (
                    <div className="space-y-2 rounded-2xl border border-success/10 bg-success/5 p-3">
                      <div className="flex items-center justify-between text-[10px] font-bold text-success">
                        <span className="flex items-center gap-1">
                          <Award className="h-3.5 w-3.5" /> Grade Earned
                        </span>
                        <span>
                          {item.pointsEarned} / {hw.maxPoints} pts
                        </span>
                      </div>
                      {item.feedback && (
                        <p className="text-[10px] italic text-success">
                          &ldquo;{item.feedback}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions and due dates */}
                  <div className="flex items-center justify-between border-t border-border pt-2 text-[10px]">
                    <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Due: {new Date(hw.dueDate).toLocaleString()}
                    </span>

                    {isStudent && !isSubmission && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSubmitHomeworkId(hw.id);
                          setSubmitDialogOpen(true);
                        }}
                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[10px] font-bold text-primary-foreground hover:bg-primary"
                      >
                        <Send className="h-3 w-3" />
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

      <HomeworkSubmitDialog
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
        homeworkId={submitHomeworkId}
        onSubmitSuccess={handleSubmissionSuccess}
      />
    </div>
  );
}
