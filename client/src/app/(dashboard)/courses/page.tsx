"use client";

import { GraduationCap, Search } from "lucide-react";
import React, { useState } from "react";

import { Input } from "@/components/ui/input";
import { useGetCoursesQuery, useGetLearningSubjectsQuery } from "@/features/catalog/catalogApi";

import { CourseTable } from "./components/course-table";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectId, setSubjectId] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: subjects } = useGetLearningSubjectsQuery();
  const { data: courses, isLoading } = useGetCoursesQuery(
    subjectId === "all" ? undefined : { subjectId },
  );

  const filteredCourses = (courses ?? []).filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.learningSubject.name.toLowerCase().includes(query)
    );
  });

  const handleToggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-primary" />
            Courses
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Browse the learning catalog and track chapter progress across each course.
          </p>
        </div>
      </div>

      {/* Search Bar + Subject Filter */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-border bg-muted/50 pl-10 text-xs"
          />
        </div>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="h-10 rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:outline-none"
        >
          <option value="all">All Subjects</option>
          {(subjects ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Course Directory Table */}
      <CourseTable
        courses={filteredCourses}
        isLoading={isLoading}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
}
