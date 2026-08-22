"use client";

import { Clock, GraduationCap, Plus } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetProgramsQuery } from "@/features/dashboard/dashboardApi";

export default function ProgramsPage() {
  const [search, setSearch] = React.useState("");
  const { data: programsData, isLoading } = useGetProgramsQuery({
    page: 1,
    limit: 100,
    search: search || undefined,
  });

  const programs = programsData?.items || [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Programs
          </h1>
          <p className="text-xs text-muted-foreground">
            Configure the educational programs students are placed into.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/programs/create">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Program
          </Link>
        </Button>
      </div>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search programs by name or code..."
        className="h-10 max-w-sm rounded-xl text-xs"
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <div
              key={idx}
              className="h-40 animate-pulse rounded-3xl border border-border bg-muted"
            />
          ))}
        </div>
      ) : programs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <Link
              key={program.id}
              href={`/programs/${program.id}`}
              className="group flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                      {program.code}
                    </span>
                    <h3 className="font-display text-sm font-bold text-foreground">
                      {program.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      program.status === "PUBLISHED"
                        ? "border border-success/20 bg-success/10 text-success"
                        : "border border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {program.status}
                  </span>
                </div>

                {(program.shortDescription || program.description) && (
                  <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {program.shortDescription || program.description}
                  </p>
                )}

                <div className="space-y-1.5 border-t border-border/30 pt-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span className="font-semibold text-foreground">
                        {program.class?.name ?? "Standalone bundle"}
                      </span>
                    </span>
                    {program.durationMonths ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-semibold text-foreground">
                          {program.durationMonths} mo
                        </span>
                      </span>
                    ) : null}
                    <span className="font-semibold text-foreground">
                      {program.priceOneTimeCents
                        ? `$${(program.priceOneTimeCents / 100).toFixed(2)}`
                        : "Not sold"}
                    </span>
                    {program.programCourses?.length ? (
                      <span>
                        {program.programCourses.length}{" "}
                        {program.programCourses.length === 1 ? "course" : "courses"}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2 rounded-3xl border border-dashed border-border bg-card py-12 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="text-xs font-semibold text-muted-foreground">
            No programs found
          </p>
          <p className="text-[10px] text-muted-foreground">
            Try refining your search or add a new academic program.
          </p>
        </div>
      )}
    </div>
  );
}
