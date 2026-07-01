"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  Globe,
  GraduationCap,
  Layers,
  Mail,
  MapPin,
  Phone,
  Plus,
  School,
  Search,
  Trash2,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateCampusMutation,
  useCreateProgramMutation,
  useDeleteCampusMutation,
  useDeleteProgramMutation,
  useGetCampusesQuery,
  useGetProgramsQuery,
  useUpdateCampusMutation,
  useUpdateProgramMutation,
} from "@/features/dashboard/dashboardApi";

export default function CampusesPage() {
  const [activeTab, setActiveTab] = useState("campuses");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries & Mutations
  const { data: campusesData, isLoading: campusesLoading } = useGetCampusesQuery();
  const { data: programsData, isLoading: programsLoading } = useGetProgramsQuery();

  const [createCampus, { isLoading: creatingCampus }] = useCreateCampusMutation();
  const [updateCampus, { isLoading: updatingCampus }] = useUpdateCampusMutation();
  const [deleteCampus] = useDeleteCampusMutation();

  const [createProgram, { isLoading: creatingProgram }] = useCreateProgramMutation();
  const [updateProgram, { isLoading: updatingProgram }] = useUpdateProgramMutation();
  const [deleteProgram] = useDeleteProgramMutation();

  // Dialog States
  const [isCampusDialogOpen, setIsCampusDialogOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<any>(null); // Null for create mode

  const [isProgramDialogOpen, setIsProgramDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<any>(null); // Null for create mode

  // Form States - Campus
  const [campusName, setCampusName] = useState("");
  const [campusCode, setCampusCode] = useState("");
  const [campusDesc, setCampusDesc] = useState("");
  const [campusEmail, setCampusEmail] = useState("");
  const [campusPhone, setCampusPhone] = useState("");
  const [campusAddress, setCampusAddress] = useState("");
  const [campusWebsite, setCampusWebsite] = useState("");
  const [campusStatus, setCampusStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Form States - Program
  const [programName, setProgramName] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [programDesc, setProgramDesc] = useState("");
  const [programDuration, setProgramDuration] = useState("4");
  const [programCampusId, setProgramCampusId] = useState("");
  const [programStatus, setProgramStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  const [formError, setFormError] = useState("");

  const handleOpenCampusDialog = (campus: any = null) => {
    setFormError("");
    if (campus) {
      setSelectedCampus(campus);
      setCampusName(campus.name || "");
      setCampusCode(campus.code || "");
      setCampusDesc(campus.description || "");
      setCampusEmail(campus.email || "");
      setCampusPhone(campus.phoneNumber || "");
      setCampusAddress(campus.address || "");
      setCampusWebsite(campus.website || "");
      setCampusStatus(campus.status || "ACTIVE");
    } else {
      setSelectedCampus(null);
      setCampusName("");
      setCampusCode("");
      setCampusDesc("");
      setCampusEmail("");
      setCampusPhone("");
      setCampusAddress("");
      setCampusWebsite("");
      setCampusStatus("ACTIVE");
    }
    setIsCampusDialogOpen(true);
  };

  const handleOpenProgramDialog = (program: any = null) => {
    setFormError("");
    // Pre-populate campus selection to first active campus if none selected
    const activeCampuses = campusesData?.items?.filter((c) => c.status === "ACTIVE") || [];
    if (program) {
      setSelectedProgram(program);
      setProgramName(program.name || "");
      setProgramCode(program.code || "");
      setProgramDesc(program.description || "");
      setProgramDuration(String(program.durationYears || 4));
      setProgramCampusId(program.campusId || "");
      setProgramStatus(program.status || "ACTIVE");
    } else {
      setSelectedProgram(null);
      setProgramName("");
      setProgramCode("");
      setProgramDesc("");
      setProgramDuration("4");
      setProgramCampusId(activeCampuses[0]?.id || "");
      setProgramStatus("ACTIVE");
    }
    setIsProgramDialogOpen(true);
  };

  const handleSaveCampus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campusName || !campusCode) {
      setFormError("Name and Code are required.");
      return;
    }
    setFormError("");

    const payload = {
      name: campusName,
      code: campusCode.toUpperCase(),
      description: campusDesc,
      email: campusEmail,
      phoneNumber: campusPhone,
      address: campusAddress,
      website: campusWebsite,
      status: campusStatus,
    };

    try {
      if (selectedCampus) {
        await updateCampus({ id: selectedCampus.id, body: payload }).unwrap();
      } else {
        await createCampus(payload).unwrap();
      }
      setIsCampusDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to save campus information.");
    }
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!programName || !programCode || !programCampusId) {
      setFormError("Name, Code, and Campus are required.");
      return;
    }
    setFormError("");

    const payload = {
      name: programName,
      code: programCode.toUpperCase(),
      description: programDesc,
      durationYears: parseInt(programDuration, 10),
      campusId: programCampusId,
      status: programStatus,
    };

    try {
      if (selectedProgram) {
        await updateProgram({ id: selectedProgram.id, body: payload }).unwrap();
      } else {
        await createProgram(payload).unwrap();
      }
      setIsProgramDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to save academic program.");
    }
  };

  const handleDeleteCampus = async (id: string) => {
    if (
      confirm(
        "Are you sure you want to delete this campus? This will delete associated programs and classrooms.",
      )
    ) {
      try {
        await deleteCampus(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete campus.");
      }
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (confirm("Are you sure you want to delete this academic program?")) {
      try {
        await deleteProgram(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete program.");
      }
    }
  };

  // Filters
  const filteredCampuses =
    campusesData?.items?.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const filteredPrograms =
    programsData?.items?.filter(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

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
            onClick={() =>
              activeTab === "campuses" ? handleOpenCampusDialog() : handleOpenProgramDialog()
            }
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-white shadow-sm hover:bg-foreground/90 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "campuses" ? "Add Campus" : "Add Program"}
          </Button>
        </div>
      </div>

      {/* Tabs list with Search Input */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                <div
                  key={campus.id}
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

                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                    <Button
                      onClick={() => handleOpenCampusDialog(campus)}
                      variant="outline"
                      className="h-8 rounded-lg border-border p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCampus(campus.id)}
                      variant="outline"
                      className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
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
                <div
                  key={program.id}
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

                  <div className="mt-5 flex items-center justify-end gap-2 border-t border-border/30 pt-3">
                    <Button
                      onClick={() => handleOpenProgramDialog(program)}
                      variant="outline"
                      className="h-8 rounded-lg border-border p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground dark:hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteProgram(program.id)}
                      variant="outline"
                      className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
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

      {/* Campus Form Dialog */}
      <Dialog open={isCampusDialogOpen} onOpenChange={setIsCampusDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              {selectedCampus ? "Edit Campus" : "Add Campus Branch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure parameters and contact info for this campus.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveCampus} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Campus Name
                </Label>
                <Input
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  placeholder="e.g. Main Campus"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Code (Unique ID)
                </Label>
                <Input
                  value={campusCode}
                  onChange={(e) => setCampusCode(e.target.value)}
                  placeholder="e.g. MC-01"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Description
              </Label>
              <textarea
                value={campusDesc}
                onChange={(e) => setCampusDesc(e.target.value)}
                placeholder="Brief information about this campus"
                className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Contact Email
                </Label>
                <Input
                  type="email"
                  value={campusEmail}
                  onChange={(e) => setCampusEmail(e.target.value)}
                  placeholder="contact@example.edu"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Phone Number
                </Label>
                <Input
                  value={campusPhone}
                  onChange={(e) => setCampusPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Address
              </Label>
              <Input
                value={campusAddress}
                onChange={(e) => setCampusAddress(e.target.value)}
                placeholder="Street address, City, Country"
                className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Website URL
                </Label>
                <Input
                  value={campusWebsite}
                  onChange={(e) => setCampusWebsite(e.target.value)}
                  placeholder="https://example.edu"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Status
                </Label>
                <select
                  value={campusStatus}
                  onChange={(e: any) => setCampusStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCampusDialogOpen(false)}
                className="h-10 rounded-xl border-border text-xs font-semibold text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingCampus || updatingCampus}
                className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-white hover:bg-foreground/90"
              >
                {creatingCampus || updatingCampus ? "Saving..." : "Save Campus"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Form Dialog */}
      <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 text-foreground">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              {selectedProgram ? "Edit Program" : "Add Academic Program"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create and associate a curriculum/degree course.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveProgram} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Program Name
                </Label>
                <Input
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Program Code
                </Label>
                <Input
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value)}
                  placeholder="e.g. CS-BS"
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Description
              </Label>
              <textarea
                value={programDesc}
                onChange={(e) => setProgramDesc(e.target.value)}
                placeholder="Degree program objectives and details"
                className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Campus Branch
                </Label>
                <select
                  value={programCampusId}
                  onChange={(e) => setProgramCampusId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
                  required
                >
                  <option value="" disabled>
                    Select Campus
                  </option>
                  {campusesData?.items
                    ?.filter((c) => c.status === "ACTIVE")
                    .map((campus) => (
                      <option key={campus.id} value={campus.id}>
                        {campus.name} ({campus.code})
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                  Duration (Years)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={programDuration}
                  onChange={(e) => setProgramDuration(e.target.value)}
                  className="h-10 border-border bg-muted/50 text-xs text-foreground/50"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase0">
                Status
              </Label>
              <select
                value={programStatus}
                onChange={(e: any) => setProgramStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProgramDialogOpen(false)}
                className="h-10 rounded-xl border-border text-xs font-semibold text-foreground"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingProgram || updatingProgram}
                className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-white hover:bg-foreground/90"
              >
                {creatingProgram || updatingProgram ? "Saving..." : "Save Program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
