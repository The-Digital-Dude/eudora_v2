"use client";

import React, { useState } from "react";
import { PenTool, ClipboardList, CheckCircle2, AlertCircle, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

interface HomeworkGradesPanelProps {
  homework: any[];
  grades: any[];
  isHomeworkLoading: boolean;
  isGradesLoading: boolean;
}

export function HomeworkGradesPanel({
  homework,
  grades,
  isHomeworkLoading,
  isGradesLoading,
}: HomeworkGradesPanelProps) {
  const [activeTab, setActiveTab] = useState<"homework" | "grades">("homework");

  return (
    <div className="rounded-3xl border border-zinc-200/50 bg-white/40 shadow-xl shadow-zinc-200/5 dark:border-zinc-800/50 dark:bg-zinc-950/20 backdrop-blur-md overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/10">
        <button
          onClick={() => setActiveTab("homework")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold tracking-tight transition-all cursor-pointer border-b-2 ${
            activeTab === "homework"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          <PenTool className="h-4. w-4" />
          Homework & Submissions
        </button>
        <button
          onClick={() => setActiveTab("grades")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold tracking-tight transition-all cursor-pointer border-b-2 ${
            activeTab === "grades"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
              : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
          }`}
        >
          <ClipboardList className="h-4. w-4" />
          Published Grades
        </button>
      </div>

      {/* Tabs Content */}
      <div className="p-6">
        {activeTab === "homework" ? (
          <div>
            {isHomeworkLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Loading homework...</div>
            ) : homework.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PenTool className="h-10 w-10 text-zinc-400/50 mb-3" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No homework assignments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {homework.map((hw) => {
                  const sub = hw.submission;
                  const statusColors: Record<string, string> = {
                    PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    SUBMITTED: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    LATE: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                    GRADED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  };
                  const status = sub ? sub.status : "PENDING";

                  return (
                    <div
                      key={hw.id}
                      className="p-4 rounded-2xl border border-zinc-200/50 bg-white/20 dark:border-zinc-800/40 dark:bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 uppercase">
                            {hw.courseName}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Due: {format(new Date(hw.dueDate), "MMM dd, yyyy")}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mt-1.5 truncate">
                          {hw.title}
                        </h4>
                        {hw.description && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                            {hw.description}
                          </p>
                        )}
                        {sub?.feedback && (
                          <div className="mt-3 p-2.5 rounded-xl bg-zinc-50/50 border border-zinc-200/30 dark:bg-zinc-900/40 dark:border-zinc-800/30 text-xs text-zinc-600 dark:text-zinc-300 font-medium">
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">Teacher Feedback:</span> {sub.feedback}
                          </div>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/50 pt-2 sm:pt-0">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${statusColors[status]}`}>
                          {status}
                        </span>
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {status === "GRADED" ? (
                            <span className="font-extrabold text-sm text-emerald-500">{sub.score} / {hw.pointsPossible} pts</span>
                          ) : (
                            `${hw.pointsPossible} pts possibles`
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {isGradesLoading ? (
              <div className="flex items-center justify-center py-12 text-zinc-400 text-sm">Loading grades...</div>
            ) : grades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClipboardList className="h-10 w-10 text-zinc-400/50 mb-3" />
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No published grades</p>
              </div>
            ) : (
              <div className="space-y-4">
                {grades.map((grade) => (
                  <div
                    key={grade.id}
                    className="p-4 rounded-2xl border border-zinc-200/50 bg-white/20 dark:border-zinc-800/40 dark:bg-zinc-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 uppercase">
                          {grade.courseClass?.name || "General"}
                        </span>
                        {grade.term && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 uppercase">
                            {grade.term.name}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {grade.assessedAt ? format(new Date(grade.assessedAt), "MMM dd, yyyy") : ""}
                        </span>
                      </div>
                      <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-50 mt-1.5 truncate">
                        {grade.title}
                      </h4>
                      {grade.notes && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1">
                          Note: {grade.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 shrink-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800/50 pt-2 sm:pt-0">
                      <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                        {grade.percentage}%
                      </span>
                      {grade.pointsEarned !== null && grade.pointsPossible !== null && (
                        <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                          {grade.pointsEarned} / {grade.pointsPossible} pts
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
