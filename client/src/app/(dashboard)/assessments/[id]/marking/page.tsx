"use client";

import {
  ArrowLeft,
  Check,
  CheckCircle,
  GraduationCap,
  HelpCircle,
  Loader2,
  MessageSquare,
  Save,
  Search,
  ShieldAlert,
  User,
  X,
  XCircle} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useEffect,useState } from "react";
import { toast } from "sonner";

import { MathRenderer } from "@/components/MathRenderer";
import { Button } from "@/components/ui/button";
import { Card, CardContent,CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetAssessmentQuery,
  useGetAssignmentsQuery,
  useGetAttemptQuery,
  useListAssignmentAttemptsQuery,
  useMarkAttemptMutation,
  useMarkStudentResponseMutation} from "@/features/assessments/assessmentsApi";
import { WidgetSelector } from "@/features/clio/widgets/WidgetSelector";

export default function AssessmentMarkingPage() {
  const router = useRouter();
  const params = useParams();
  const assessmentId = params.id as string;

  // 1. Fetch Assessment Details
  const { data: assessment, isLoading: isLoadingAssessment } = useGetAssessmentQuery(assessmentId);

  // 2. Fetch Assignments for this Assessment (lists all student targets)
  const { data: assignmentsData, isLoading: isLoadingAssignments } = useGetAssignmentsQuery(
    { assessmentId },
    { skip: !assessmentId }
  );
  const assignments = React.useMemo(() => assignmentsData?.items ?? [], [assignmentsData]);

  // Filter and queue states
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "graded">("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  // 3. Fetch Attempts for the Selected Assignment
  const { data: attemptsData, isLoading: isLoadingAttempts } = useListAssignmentAttemptsQuery(
    selectedAssignmentId,
    { skip: !selectedAssignmentId }
  );
  const attempts = attemptsData?.items || [];
  
  // Find latest attempt of selected student
  const activeAttemptInfo = attempts[0]; // Attempts are sorted by startedAt desc on backend
  const attemptId = activeAttemptInfo?.id;

  // 4. Fetch Active Attempt Details (contains responses list)
  const { data: attemptDetails, isLoading: isLoadingAttemptDetails, refetch: refetchAttempt } =
    useGetAttemptQuery(attemptId || "", { skip: !attemptId });

  // Mutations
  const [markStudentResponse, { isLoading: isMarkingResponse }] = useMarkStudentResponseMutation();
  const [markAttempt, { isLoading: isMarkingAttempt }] = useMarkAttemptMutation();

  // Local state for grading individual questions
  const [questionMarks, setQuestionMarks] = useState<Record<string, number>>({});
  const [questionFeedback, setQuestionFeedback] = useState<Record<string, string>>({});
  const [questionCorrectness, setQuestionCorrectness] = useState<Record<string, boolean>>({});

  // Local state for overall attempt grade
  const [overallComment, setOverallComment] = useState("");

  // Pre-select first student in queue when list finishes loading
  useEffect(() => {
    if (assignments.length > 0 && !selectedAssignmentId) {
      // Find one that matches the status filter if possible
      const target = assignments.find((a) => {
        if (filterStatus === "pending") return a.status === "submitted" || a.status === "started";
        if (filterStatus === "graded") return a.status === "submitted"; // or has attempts
        return true;
      }) || assignments[0];
      setSelectedAssignmentId(target.id);
    }
  }, [assignments, selectedAssignmentId, filterStatus]);

  // Sync loaded response data to input fields
  useEffect(() => {
    if (attemptDetails?.responses) {
      const marksMap: typeof questionMarks = {};
      const feedbackMap: typeof questionFeedback = {};
      const correctnessMap: typeof questionCorrectness = {};

      attemptDetails.responses.forEach((res) => {
        marksMap[res.questionId] = res.marksAwarded ?? 0;
        feedbackMap[res.questionId] = res.feedback ?? "";
        correctnessMap[res.questionId] = res.isCorrect ?? false;
      });

      setQuestionMarks(marksMap);
      setQuestionFeedback(feedbackMap);
      setQuestionCorrectness(correctnessMap);
      setOverallComment(attemptDetails.teacherComment || "");
    }
  }, [attemptDetails]);

  if (isLoadingAssessment || isLoadingAssignments) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-muted-foreground font-medium">Loading marking panel...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Assessment Not Found</h3>
          <Button onClick={() => router.push("/assessments")} className="mt-4 bg-primary">
            Back to Assessments
          </Button>
        </div>
      </div>
    );
  }

  // Filtered student list
  const filteredAssignments = assignments.filter((asg) => {
    // Student Name match
    const nameMatch = asg.studentProfile?.fullName.toLowerCase().includes(studentSearch.toLowerCase());
    
    // Status match
    const statusMatch =
      filterStatus === "all" ||
      (filterStatus === "pending" && (asg.status === "submitted" || asg.status === "started")) ||
      (filterStatus === "graded" && asg.status === "submitted"); // wait, let's look at attempts
    
    return nameMatch && statusMatch;
  });


  // Action: Save marks for a single response
  const handleSaveResponseMark = async (responseId: string, questionId: string) => {
    const marks = questionMarks[questionId] ?? 0;
    const isCorrect = questionCorrectness[questionId] ?? false;
    const feedback = questionFeedback[questionId] || "";

    try {
      await markStudentResponse({
        id: responseId,
        body: {
          isCorrect,
          marksAwarded: marks,
          feedback,
        },
      }).unwrap();
      toast.success("Marks saved for this question.");
      refetchAttempt();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to save response mark.");
    }
  };

  // Action: Finalize whole attempt grading
  const handleFinalizeAttemptGrading = async () => {
    if (!attemptDetails) return;

    try {
      await markAttempt({
        id: attemptDetails.id,
        body: {
          teacherComment: overallComment,
          mode: "manual",
        },
      }).unwrap();

      toast.success("Grade submitted! Syncing to Gradebook...");
      refetchAttempt();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to submit grading.");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-muted/20">
      {/* Top Header Workspace */}
      <div className="h-16 border-b border-border/50 bg-card px-6 flex items-center justify-between backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/assessments">
            <button className="h-9 w-9 rounded-xl border border-border hover:bg-muted/50 flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-foreground dark:text-white flex items-center gap-2">
              Marking Workspace: {assessment.title}
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium">
              Subject: {assessment.subject?.name} • Grade: {assessment.level?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace Area Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Student Submissions Queue */}
        <div className="w-80 border-r border-border/50 bg-card p-5 flex flex-col overflow-y-auto shrink-0">
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Student Queue</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Filter options */}
          <div className="flex gap-1.5 rounded-lg bg-muted p-0.5 dark:bg-muted mb-4 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus("all")}
              className={`flex-1 py-1 text-center rounded-md ${
                filterStatus === "all" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`flex-1 py-1 text-center rounded-md ${
                filterStatus === "pending" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Awaiting
            </button>
            <button
              onClick={() => setFilterStatus("graded")}
              className={`flex-1 py-1 text-center rounded-md ${
                filterStatus === "graded" ? "bg-card shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              Completed
            </button>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-border rounded-2xl">
              <User className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-[10px] text-muted-foreground font-medium">No students matched.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssignments.map((asg) => {
                const isSelected = asg.id === selectedAssignmentId;
                return (
                  <button
                    key={asg.id}
                    onClick={() => setSelectedAssignmentId(asg.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-primary/10 border-primary text-primary shadow-md shadow-primary/5"
                        : "bg-muted/50 border-border/50 hover:bg-card text-foreground/30"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xs font-bold text-foreground truncate pr-2">
                        {asg.studentProfile?.fullName}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        asg.status === "submitted"
                          ? "bg-success/10 text-success"
                          : asg.status === "started"
                          ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {asg.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold">
                      Class: {asg.classSection?.code || "Individual Assignment"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Center Pane: Evaluation Form & Questions Display */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card/10">
          {!selectedAssignmentId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <GraduationCap className="h-16 w-16 text-muted-foreground mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-foreground">No Student Selected</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Pick a student submission from the queue on the left to review their inputs and override grading marks.
              </p>
            </div>
          ) : isLoadingAttempts || (attemptId && isLoadingAttemptDetails) ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-card/50">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <span className="text-xs font-medium text-muted-foreground">Loading student attempts...</span>
            </div>
          ) : !activeAttemptInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <ShieldAlert className="h-12 w-12 text-warning mb-3" />
              <h3 className="text-base font-bold text-foreground">No Attempt Record Found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
                This student has not started this assessment yet. Check back once their status updates to &apos;Started&apos; or &apos;Submitted&apos;.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Attempt header */}
              <div className="px-6 py-4 border-b border-border/50/80 bg-muted/50/30 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Grading Attempt #{attemptDetails?.attemptNumber || activeAttemptInfo.attemptNumber}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                    Started: {new Date(attemptDetails?.startedAt || activeAttemptInfo.startedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score details */}
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Attempt Score</span>
                    <p className="text-sm font-bold text-foreground">
                      {attemptDetails?.rawScore ?? 0} / {attemptDetails?.maxScore ?? assessment.totalMarks} Marks
                      <span className="text-[11px] font-medium text-muted-foreground ml-1">
                        ({attemptDetails?.percentageScore ?? 0}%)
                      </span>
                    </p>
                  </div>
                  {/* Status Badge */}
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full ${
                    attemptDetails?.resultStatus === "marked"
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}>
                    {attemptDetails?.resultStatus}
                  </span>
                </div>
              </div>

              {/* Questions Worksheet Scrollable area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 select-text">
                {assessment.sections?.map((section) => {
                  const secQuestions = assessment.questions
                    ?.filter((q) => q.sectionId === section.id)
                    .sort((a, b) => a.questionNumber - b.questionNumber) || [];
                  if (secQuestions.length === 0) return null;

                  return (
                    <div key={section.id} className="space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b pb-1">
                        {section.title}
                      </h3>

                      <div className="space-y-6">
                        {secQuestions.map((sq) => {
                          const studentResponse = attemptDetails?.responses?.find((r) => r.questionId === sq.questionId);
                          const userMarks = questionMarks[sq.questionId] ?? 0;
                          const userFeedback = questionFeedback[sq.questionId] || "";
                          const userCorrect = questionCorrectness[sq.questionId] ?? false;

                          return (
                            <Card key={sq.id} className="rounded-2xl border border-border/50 shadow-sm overflow-hidden bg-card/20">
                              <CardHeader className="px-5 py-3 border-b border-border bg-muted/20 flex flex-row justify-between items-center">
                                <span className="text-[11px] font-bold text-muted-foreground">
                                  Question {sq.questionNumber} • {sq.marksAvailable} Marks Max
                                </span>
                                {studentResponse && (
                                  <div className="flex items-center gap-1">
                                    {studentResponse.isCorrect ? (
                                      <span className="text-[10px] font-semibold text-success flex items-center gap-0.5">
                                        <CheckCircle className="h-3.5 w-3.5" /> Correct
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-destructive flex items-center gap-0.5">
                                        <XCircle className="h-3.5 w-3.5" /> Incorrect
                                      </span>
                                    )}
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent className="p-5 space-y-4">
                                {/* Question Stem */}
                                <div className="text-xs text-foreground">
                                  <MathRenderer text={sq.question.prompt} />
                                </div>

                                {/* Answers Comparison */}
                                <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Student Submission</p>
                                  
                                  {studentResponse ? (
                                    sq.question.widgetType ? (
                                      /* Render Widget locked */
                                      <div className="border border-border p-4 rounded-xl bg-card/50">
                                        <WidgetSelector
                                          question={sq.question as any}
                                          currentState={studentResponse.interactionState || null}
                                          onStateChange={() => {}}
                                          locked={true}
                                          isCorrect={studentResponse.isCorrect}
                                        />
                                      </div>
                                    ) : (
                                      /* Render standard values */
                                      <div className="space-y-2">
                                        {sq.question.questionType === "mcq" && (
                                          <div className="space-y-1.5">
                                            {sq.question.options?.map((opt) => {
                                              const isStudentChoice = opt.id === studentResponse.selectedOptionId;
                                              const isCorrectChoice = opt.isCorrect;
                                              return (
                                                <div
                                                  key={opt.id}
                                                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                                                    isStudentChoice
                                                      ? isCorrectChoice
                                                        ? "bg-success/10 border-success/30 text-success"
                                                        : "bg-destructive/10 border-destructive/30 text-destructive"
                                                      : isCorrectChoice
                                                      ? "bg-success/5 border-success/10 text-success"
                                                      : "bg-muted/30 border-border/80 text-muted-foreground"
                                                  }`}
                                                >
                                                  <span className="font-bold">{opt.optionLabel}.</span>
                                                  <MathRenderer text={opt.optionText} />
                                                  {isStudentChoice && <span className="text-[9px] font-bold uppercase ml-auto">(Student Selection)</span>}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}

                                        {sq.question.questionType !== "mcq" && (
                                          <div className="text-xs bg-card border border-border/60 p-3 rounded-xl">
                                            <p className="font-semibold text-foreground">
                                              {studentResponse.responseText || "(Empty Input)"}
                                            </p>
                                          </div>
                                        )}

                                        {sq.question.correctAnswer && (
                                          <div className="pt-2 border-t border-border/50 flex gap-2 text-[10px] text-muted-foreground font-semibold">
                                            <span>Correct Key:</span>
                                            <span className="text-success font-bold">
                                              {sq.question.correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  ) : (
                                    <p className="text-xs text-muted-foreground italic">Student did not answer this question.</p>
                                  )}
                                </div>

                                {/* Evaluation Inputs */}
                                {studentResponse && (
                                  <div className="pt-3 border-t border-border/80 flex flex-wrap items-center gap-3">
                                    {/* Marks Override */}
                                    <div className="w-24">
                                      <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Marks
                                      </Label>
                                      <Input
                                        type="number"
                                        max={sq.marksAvailable}
                                        value={userMarks}
                                        onChange={(e) =>
                                          setQuestionMarks((prev) => ({
                                            ...prev,
                                            [sq.questionId]: parseFloat(e.target.value) || 0,
                                          }))
                                        }
                                        className="h-8.5 rounded-lg text-xs text-center font-bold"
                                      />
                                    </div>

                                    {/* Correctness Toggle */}
                                    <div className="flex flex-col gap-1 select-none">
                                      <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Status
                                      </span>
                                      <div className="flex rounded-lg bg-muted/50 p-0.5 h-8.5 items-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setQuestionCorrectness((prev) => ({ ...prev, [sq.questionId]: true }))
                                          }
                                          className={`px-2.5 h-full rounded text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                                            userCorrect
                                              ? "bg-success text-success-foreground"
                                              : "text-muted-foreground hover:text-foreground"
                                          }`}
                                        >
                                          <Check className="h-3 w-3" /> Correct
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setQuestionCorrectness((prev) => ({ ...prev, [sq.questionId]: false }))
                                          }
                                          className={`px-2.5 h-full rounded text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                                            !userCorrect
                                              ? "bg-destructive text-destructive-foreground"
                                              : "text-muted-foreground hover:text-destructive"
                                          }`}
                                        >
                                          <X className="h-3 w-3" /> Incorrect
                                        </button>
                                      </div>
                                    </div>

                                    {/* Feedback comment input */}
                                    <div className="flex-1 min-w-[200px]">
                                      <Label className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Feedback Comments
                                      </Label>
                                      <Input
                                        placeholder="Add teacher review feedback..."
                                        value={userFeedback}
                                        onChange={(e) =>
                                          setQuestionFeedback((prev) => ({ ...prev, [sq.questionId]: e.target.value }))
                                        }
                                        className="h-8.5 rounded-lg text-xs"
                                      />
                                    </div>

                                    <Button
                                      onClick={() => handleSaveResponseMark(studentResponse.id, sq.questionId)}
                                      disabled={isMarkingResponse}
                                      className="h-8.5 rounded-lg text-[10px] font-bold bg-muted hover:bg-muted text-white mt-5.5 self-end"
                                    >
                                      <Save className="mr-1 h-3.5 w-3.5" /> Save
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overall attempt grading Comments & finalize footer */}
              <div className="p-5 border-t border-border/50 bg-card/90 backdrop-blur shrink-0 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-primary" /> Overall Teacher Remarks
                  </Label>
                  <textarea
                    placeholder="Enter final comments or summary feedback for the Gradebook report card..."
                    value={overallComment}
                    onChange={(e) => setOverallComment(e.target.value)}
                    className="h-16 w-full resize-none rounded-xl border border-border bg-muted/50 p-2.5 text-xs text-foreground focus:outline-none/50"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground font-semibold">
                    Submitting this form recalculates scores and syncs data to the class Gradebook.
                  </p>

                  <Button
                    onClick={handleFinalizeAttemptGrading}
                    disabled={isMarkingAttempt}
                    className="h-10 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary/90"
                  >
                    Submit Final Marks
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
