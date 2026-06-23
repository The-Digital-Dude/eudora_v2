"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  GraduationCap,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  Save,
  MessageSquare,
  Search,
  Filter,
  Check,
  X,
  User,
  ShieldAlert,
  Loader2
} from "lucide-react";
import {
  useGetAssessmentQuery,
  useGetAssignmentsQuery,
  useListAssignmentAttemptsQuery,
  useGetAttemptQuery,
  useMarkAttemptMutation,
  useMarkStudentResponseMutation,
  Assignment,
  Attempt,
  StudentResponse
} from "@/features/assessments/assessmentsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MathRenderer } from "@/components/MathRenderer";
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
  const assignments = assignmentsData?.items || [];

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
          <div className="h-10 w-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-neutral-400 font-medium">Loading marking panel...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">Assessment Not Found</h3>
          <Button onClick={() => router.push("/assessments")} className="mt-4 bg-violet-600">
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
    const isSubmitted = asg.status === "submitted";
    const statusMatch =
      filterStatus === "all" ||
      (filterStatus === "pending" && (asg.status === "submitted" || asg.status === "started")) ||
      (filterStatus === "graded" && asg.status === "submitted"); // wait, let's look at attempts
    
    return nameMatch && statusMatch;
  });

  const selectedAssignment = assignments.find((a) => a.id === selectedAssignmentId);

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
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-neutral-50/50 dark:bg-zinc-950/20">
      {/* Top Header Workspace */}
      <div className="h-16 border-b border-neutral-150 bg-white px-6 flex items-center justify-between dark:border-zinc-800 dark:bg-zinc-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/assessments">
            <button className="h-9 w-9 rounded-xl border border-neutral-200 hover:bg-neutral-50 flex items-center justify-center dark:border-zinc-800 dark:hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          </Link>
          <div>
            <h1 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              Marking Workspace: {assessment.title}
            </h1>
            <p className="text-[10px] text-neutral-400 font-medium">
              Subject: {assessment.subject?.name} • Grade: {assessment.level?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Main Workspace Area Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Student Submissions Queue */}
        <div className="w-80 border-r border-neutral-150 bg-white p-5 flex flex-col dark:border-zinc-800 dark:bg-zinc-900/50 overflow-y-auto shrink-0">
          <div className="mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">Student Queue</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search student..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* Filter options */}
          <div className="flex gap-1.5 rounded-lg bg-neutral-100 p-0.5 dark:bg-zinc-850 mb-4 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus("all")}
              className={`flex-1 py-1 text-center rounded-md ${
                filterStatus === "all" ? "bg-white shadow text-neutral-900 dark:bg-zinc-900 dark:text-neutral-50" : "text-neutral-500"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`flex-1 py-1 text-center rounded-md ${
                filterStatus === "pending" ? "bg-white shadow text-neutral-900 dark:bg-zinc-900 dark:text-neutral-50" : "text-neutral-500"
              }`}
            >
              Awaiting
            </button>
            <button
              onClick={() => setFilterStatus("graded")}
              className={`flex-1 py-1 text-center rounded-md ${
                filterStatus === "graded" ? "bg-white shadow text-neutral-900 dark:bg-zinc-900 dark:text-neutral-50" : "text-neutral-500"
              }`}
            >
              Completed
            </button>
          </div>

          {filteredAssignments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-neutral-200 rounded-2xl dark:border-zinc-800">
              <User className="h-8 w-8 text-neutral-300 mb-2" />
              <p className="text-[10px] text-neutral-400 font-medium">No students matched.</p>
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
                        ? "bg-violet-600/10 border-violet-500 text-violet-400 shadow-md shadow-violet-500/5"
                        : "bg-neutral-50/50 border-neutral-150 hover:bg-white text-neutral-700 dark:border-zinc-850 dark:bg-zinc-900/30 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate pr-2">
                        {asg.studentProfile?.fullName}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        asg.status === "submitted"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : asg.status === "started"
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "bg-neutral-200 text-neutral-500 dark:bg-zinc-800"
                      }`}>
                        {asg.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-semibold">
                      Class: {asg.classSection?.code || "Individual Assignment"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Center Pane: Evaluation Form & Questions Display */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-900/10">
          {!selectedAssignmentId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <GraduationCap className="h-16 w-16 text-neutral-300 mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">No Student Selected</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm">
                Pick a student submission from the queue on the left to review their inputs and override grading marks.
              </p>
            </div>
          ) : isLoadingAttempts || (attemptId && isLoadingAttemptDetails) ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-900/50">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-2" />
              <span className="text-xs font-medium text-neutral-400">Loading student attempts...</span>
            </div>
          ) : !activeAttemptInfo ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <ShieldAlert className="h-12 w-12 text-amber-500 mb-3" />
              <h3 className="text-base font-bold text-neutral-800 dark:text-neutral-200">No Attempt Record Found</h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-xs leading-relaxed">
                This student has not started this assessment yet. Check back once their status updates to 'Started' or 'Submitted'.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Attempt header */}
              <div className="px-6 py-4 border-b border-neutral-150 dark:border-zinc-800/80 bg-neutral-50/50 dark:bg-zinc-900/30 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                    Grading Attempt #{attemptDetails?.attemptNumber || activeAttemptInfo.attemptNumber}
                  </h3>
                  <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">
                    Started: {new Date(attemptDetails?.startedAt || activeAttemptInfo.startedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  {/* Score details */}
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Attempt Score</span>
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      {attemptDetails?.rawScore ?? 0} / {attemptDetails?.maxScore ?? assessment.totalMarks} Marks
                      <span className="text-[11px] font-medium text-neutral-500 ml-1">
                        ({attemptDetails?.percentageScore ?? 0}%)
                      </span>
                    </p>
                  </div>
                  {/* Status Badge */}
                  <span className={`text-[10px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full ${
                    attemptDetails?.resultStatus === "marked"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
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
                      <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b pb-1 dark:border-zinc-800">
                        {section.title}
                      </h3>

                      <div className="space-y-6">
                        {secQuestions.map((sq) => {
                          const studentResponse = attemptDetails?.responses?.find((r) => r.questionId === sq.questionId);
                          const userMarks = questionMarks[sq.questionId] ?? 0;
                          const userFeedback = questionFeedback[sq.questionId] || "";
                          const userCorrect = questionCorrectness[sq.questionId] ?? false;

                          return (
                            <Card key={sq.id} className="rounded-2xl border border-neutral-150 dark:border-zinc-850 shadow-sm overflow-hidden bg-white dark:bg-zinc-900/20">
                              <CardHeader className="px-5 py-3 border-b border-neutral-100 dark:border-zinc-805/85 bg-neutral-50/20 flex flex-row justify-between items-center">
                                <span className="text-[11px] font-bold text-neutral-500">
                                  Question {sq.questionNumber} • {sq.marksAvailable} Marks Max
                                </span>
                                {studentResponse && (
                                  <div className="flex items-center gap-1">
                                    {studentResponse.isCorrect ? (
                                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                        <CheckCircle className="h-3.5 w-3.5" /> Correct
                                      </span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5">
                                        <XCircle className="h-3.5 w-3.5" /> Incorrect
                                      </span>
                                    )}
                                  </div>
                                )}
                              </CardHeader>
                              <CardContent className="p-5 space-y-4">
                                {/* Question Stem */}
                                <div className="text-xs text-neutral-800 dark:text-neutral-200">
                                  <MathRenderer text={sq.question.prompt} />
                                </div>

                                {/* Answers Comparison */}
                                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-zinc-950/40 border border-neutral-100 dark:border-zinc-855 space-y-3">
                                  <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Student Submission</p>
                                  
                                  {studentResponse ? (
                                    sq.question.widgetType ? (
                                      /* Render Widget locked */
                                      <div className="border border-neutral-200 dark:border-zinc-800 p-4 rounded-xl bg-white dark:bg-zinc-900/50">
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
                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                                        : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                                                      : isCorrectChoice
                                                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-600"
                                                      : "bg-zinc-900/30 border-zinc-800/80 text-zinc-300"
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
                                          <div className="text-xs bg-white border border-neutral-200 dark:border-zinc-850 dark:bg-zinc-900/60 p-3 rounded-xl">
                                            <p className="font-semibold text-neutral-800 dark:text-neutral-200">
                                              {studentResponse.responseText || "(Empty Input)"}
                                            </p>
                                          </div>
                                        )}

                                        {sq.question.correctAnswer && (
                                          <div className="pt-2 border-t border-neutral-200/50 flex gap-2 text-[10px] text-neutral-400 font-semibold">
                                            <span>Correct Key:</span>
                                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                              {sq.question.correctAnswer}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  ) : (
                                    <p className="text-xs text-neutral-400 italic">Student did not answer this question.</p>
                                  )}
                                </div>

                                {/* Evaluation Inputs */}
                                {studentResponse && (
                                  <div className="pt-3 border-t border-neutral-100 dark:border-zinc-850/80 flex flex-wrap items-center gap-3">
                                    {/* Marks Override */}
                                    <div className="w-24">
                                      <Label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
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
                                      <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Status
                                      </span>
                                      <div className="flex rounded-lg bg-neutral-150 p-0.5 dark:bg-zinc-800 h-8.5 items-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setQuestionCorrectness((prev) => ({ ...prev, [sq.questionId]: true }))
                                          }
                                          className={`px-2.5 h-full rounded text-[10px] font-bold flex items-center gap-0.5 transition-all ${
                                            userCorrect
                                              ? "bg-emerald-500 text-white"
                                              : "text-neutral-500 hover:text-neutral-800"
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
                                              ? "bg-rose-500 text-white"
                                              : "text-neutral-500 hover:text-rose-500"
                                          }`}
                                        >
                                          <X className="h-3 w-3" /> Incorrect
                                        </button>
                                      </div>
                                    </div>

                                    {/* Feedback comment input */}
                                    <div className="flex-1 min-w-[200px]">
                                      <Label className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">
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
                                      className="h-8.5 rounded-lg text-[10px] font-bold bg-zinc-900 hover:bg-zinc-800 text-white mt-5.5 self-end"
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
              <div className="p-5 border-t border-neutral-150 bg-white dark:border-zinc-800 dark:bg-zinc-900/90 backdrop-blur shrink-0 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-violet-500" /> Overall Teacher Remarks
                  </Label>
                  <textarea
                    placeholder="Enter final comments or summary feedback for the Gradebook report card..."
                    value={overallComment}
                    onChange={(e) => setOverallComment(e.target.value)}
                    className="h-16 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/50 p-2.5 text-xs text-neutral-800 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-neutral-200"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-neutral-400 font-semibold">
                    Submitting this form recalculates scores and syncs data to the class Gradebook.
                  </p>

                  <Button
                    onClick={handleFinalizeAttemptGrading}
                    disabled={isMarkingAttempt}
                    className="h-10 rounded-xl bg-violet-600 text-xs font-bold text-white hover:bg-violet-500"
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
