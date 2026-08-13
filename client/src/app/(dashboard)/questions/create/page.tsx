"use client";

import { HelpCircle } from "lucide-react";
import Link from "next/link";

import { QuestionEditorForm } from "../components/question-editor-form";

export default function CreateQuestionPage() {
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
          Create New Question
        </h1>
      </div>

      <QuestionEditorForm />
    </div>
  );
}
