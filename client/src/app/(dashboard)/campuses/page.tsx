"use client";

import { Clock, GraduationCap, Mail, MapPin, Phone, Plus, School, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetCampusesQuery, useGetProgramsQuery } from "@/features/dashboard/dashboardApi";
import { useDebouncedQueryInput, useListQueryState } from "@/hooks/use-list-query-state";

export default function CampusesPage() {
  // Tab and search both live in the URL, so a filtered Programs view can be linked directly
  // instead of always reopening on the Campuses tab with an empty search.
  const { values, setValue } = useListQueryState({ tab: "campuses", search: "" });
  const activeTab = values.tab;
  const [searchDraft, setSearchDraft] = useDebouncedQueryInput(values.search, (next) =>
    setValue("search", next),
  );

  // Both lists search server-side. The campus search in particular used to run client-side against
  // `c.code`, a field the API never returns — so typing here threw on the first keystroke.
  const { data: campusesData, isLoading: campusesLoading } = useGetCampusesQuery({
    search: values.search || undefined,
  });
  const { data: programsData, isLoading: programsLoading } = useGetProgramsQuery({
    search: values.search || undefined,
  });

  const filteredCampuses = campusesData?.items || [];
  const filteredPrograms = programsData?.items || [];

  return (
    <div className="animate-fade-in space-y-6 text-foreground">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Campuses & Programs
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Configure regional campuses and educational programs.
          </p>
        </div>
        <div>
          <Button
            asChild
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 active:scale-98"
          >
            <Link href={activeTab === "campuses" ? "/campuses/create" : "/campuses/programs/create"}>
              <Plus className="h-4 w-4" />
              {activeTab === "campuses" ? "Add Campus" : "Add Program"}
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs list with Search Input */}
      <Tabs value={activeTab} onValueChange={(next) => setValue("tab", next)} className="w-full">
        <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-center md:justify-between">
          <TabsList className="h-11 w-fit rounded-xl bg-muted p-1">
            <TabsTrigger
              value="campuses"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:dark:bg-muted"
            >
              <School className="mr-2 inline h-3.5 w-3.5" />
              Campuses
            </TabsTrigger>
            <TabsTrigger
              value="programs"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm data-[state=active]:dark:bg-muted"
            >
              <GraduationCap className="mr-2 inline h-3.5 w-3.5" />
              Academic Programs
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <Input
              type="text"
              placeholder="Search..."
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="h-10 rounded-xl border-border bg-card pl-9 text-xs text-foreground"
            />
          </div>
        </div>

        {/* Campuses Panel */}
        <TabsContent value="campuses" className="pt-6">
          {campusesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-44 animate-pulse rounded-3xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : filteredCampuses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampuses.map((campus) => (
                <Link
                  key={campus.id}
                  href={`/campuses/${campus.id}`}
                  className="group flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all hover:shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-mono text-[9px] font-bold text-muted-foreground">
                          {campus.code}
                        </span>
                        <h3 className="font-display text-sm font-bold text-foreground">
                          {campus.name}
                        </h3>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          campus.status === "ACTIVE"
                            ? "border border-success/20 bg-success/10 text-success"
                            : "border border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {campus.status}
                      </span>
                    </div>

                    {campus.description && (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {campus.description}
                      </p>
                    )}

                    <div className="space-y-1.5 border-t border-border/30 pt-2">
                      {campus.email && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          {campus.email}
                        </div>
                      )}
                      {campus.phoneNumber && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {campus.phoneNumber}
                        </div>
                      )}
                      {campus.address && (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {campus.address}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-2 rounded-3xl border border-dashed border-border bg-card py-12 text-center">
              <School className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">
                No campuses found
              </p>
              <p className="text-[10px] text-muted-foreground">
                Try refining your search or add a new campus branch.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Programs Panel */}
        <TabsContent value="programs" className="pt-6">
          {programsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, idx) => (
                <div
                  key={idx}
                  className="h-40 animate-pulse rounded-3xl border border-border bg-muted"
                />
              ))}
            </div>
          ) : filteredPrograms.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((program) => (
                <Link
                  key={program.id}
                  href={`/campuses/programs/${program.id}`}
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
                          program.status === "ACTIVE"
                            ? "border border-success/20 bg-success/10 text-success"
                            : "border border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {program.status}
                      </span>
                    </div>

                    {program.description && (
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {program.description}
                      </p>
                    )}

                    <div className="space-y-1.5 border-t border-border/30 pt-2">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <School className="h-3.5 w-3.5 text-muted-foreground" />
                        Campus:{" "}
                        <span className="font-semibold text-foreground">
                          {program.campus?.name || "Shared"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        Duration:{" "}
                        <span className="font-semibold text-foreground">
                          {program.durationYears} Years
                        </span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
