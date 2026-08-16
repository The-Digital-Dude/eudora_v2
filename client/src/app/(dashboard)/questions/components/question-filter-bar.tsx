"use client";

import { Search } from "lucide-react";
import React from "react";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetClassesQuery,useGetSubjectsQuery } from "@/features/assessments/questionsApi";

interface FilterState {
  search: string;
  subjectId: string;
  classId: string;
  questionType: string;
  difficulty: string;
  status: string;
}

interface QuestionFilterBarProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onReset: () => void;
}

export function QuestionFilterBar({ filters, onFilterChange, onReset }: QuestionFilterBarProps) {
  const { data: subjectsData } = useGetSubjectsQuery();
  const { data: classesData } = useGetClassesQuery();

  const subjects = subjectsData?.items || [];
  const classes = classesData?.items || [];

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search questions by prompt..."
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="h-10 rounded-xl border-border bg-muted/50 pl-10 text-xs"
        />
      </div>

      {/* Subject Filter */}
      <div className="w-[140px]">
        <Select
          value={filters.subjectId || "all"}
          onValueChange={(val) => onFilterChange("subjectId", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-10 rounded-xl border-border bg-muted/50 text-xs">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((sub) => (
              <SelectItem key={sub.id} value={sub.id}>
                {sub.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Level Filter */}
      <div className="w-[140px]">
        <Select
          value={filters.classId || "all"}
          onValueChange={(val) => onFilterChange("classId", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-10 rounded-xl border-border bg-muted/50 text-xs">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Levels</SelectItem>
            {classes.map((lvl) => (
              <SelectItem key={lvl.id} value={lvl.id}>
                {lvl.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Type Filter */}
      <div className="w-[140px]">
        <Select
          value={filters.questionType || "all"}
          onValueChange={(val) => onFilterChange("questionType", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-10 rounded-xl border-border bg-muted/50 text-xs">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mcq">Multiple Choice</SelectItem>
            <SelectItem value="numeric">Numeric</SelectItem>
            <SelectItem value="short_answer">Short Answer</SelectItem>
            <SelectItem value="written">Written</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Difficulty Filter */}
      <div className="w-[130px]">
        <Select
          value={filters.difficulty || "all"}
          onValueChange={(val) => onFilterChange("difficulty", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-10 rounded-xl border-border bg-muted/50 text-xs">
            <SelectValue placeholder="All Difficulty" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Difficulty</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
            <SelectItem value="extension">Extension</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="w-[110px]">
        <Select
          value={filters.status || "all"}
          onValueChange={(val) => onFilterChange("status", val === "all" ? "" : val)}
        >
          <SelectTrigger className="h-10 rounded-xl border-border bg-muted/50 text-xs">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Clear/Reset Button */}
      <button
        onClick={onReset}
        className="h-10 cursor-pointer rounded-xl border border-border bg-card px-4 text-xs font-semibold hover:bg-muted/50"
      >
        Clear Filters
      </button>
    </div>
  );
}
