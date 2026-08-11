"use client";

import { HelpCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useGetQuestionQuery } from "@/features/assessments/questionsApi";

import { QuestionEditorForm } from "../components/question-editor-form";

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const questionId = params?.id ?? "";

  const { data: question, isLoading } = useGetQuestionQuery(questionId, { skip: !questionId });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/questions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Back to Question Bank
        </Link>
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
          <HelpCircle className="h-6 w-6 text-primary" />
          Edit Question
        </h1>
      </div>

      {isLoading ? (
        <div className="flex h-60 w-full items-center justify-center rounded-3xl border border-border bg-card">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : !question ? (
        <p className="text-sm font-semibold text-foreground">Question not found.</p>
      ) : (
        <QuestionEditorForm questionId={questionId} initialQuestion={question} />
      )}
    </div>
  );
}
