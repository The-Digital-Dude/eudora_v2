"use client";

import { GraduationCap, Search } from "lucide-react";
import React, { useState } from "react";

import { Input } from "@/components/ui/input";

import { CourseTable } from "./components/course-table";
import { dummyCourses } from "./components/dummy-courses";

export default function CoursesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredCourses = dummyCourses.filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      course.category.toLowerCase().includes(query) ||
      course.instructor.toLowerCase().includes(query)
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
            Browse authored courses and track milestone completion across each learning path.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses by title, category, or instructor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl border-border bg-muted/50 pl-10 text-xs"
          />
        </div>
      </div>

      {/* Course Directory Table */}
      <CourseTable
        courses={filteredCourses}
        expandedId={expandedId}
        onToggleExpand={handleToggleExpand}
      />
    </div>
  );
}
