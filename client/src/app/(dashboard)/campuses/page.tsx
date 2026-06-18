"use client";

import React, { useState } from "react";
import {
  School,
  GraduationCap,
  Plus,
  Edit2,
  Trash2,
  Search,
  Globe,
  Mail,
  Phone,
  Calendar,
  Layers,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetCampusesQuery,
  useCreateCampusMutation,
  useUpdateCampusMutation,
  useDeleteCampusMutation,
  useGetProgramsQuery,
  useCreateProgramMutation,
  useUpdateProgramMutation,
  useDeleteProgramMutation,
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
    const activeCampuses = campusesData?.items?.filter(c => c.status === "ACTIVE") || [];
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
    if (confirm("Are you sure you want to delete this campus? This will delete associated programs and classrooms.")) {
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
  const filteredCampuses = campusesData?.items?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const filteredPrograms = programsData?.items?.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Campuses & Programs
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure regional campuses and educational programs.
          </p>
        </div>
        <div>
          <Button
            onClick={() => activeTab === "campuses" ? handleOpenCampusDialog() : handleOpenProgramDialog()}
            className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "campuses" ? "Add Campus" : "Add Program"}
          </Button>
        </div>
      </div>

      {/* Tabs list with Search Input */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200">
          <TabsList className="bg-neutral-100 rounded-xl p-1 h-11 w-fit">
            <TabsTrigger
              value="campuses"
              className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <School className="w-3.5 h-3.5 mr-2 inline" />
              Campuses
            </TabsTrigger>
            <TabsTrigger
              value="programs"
              className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
            >
              <GraduationCap className="w-3.5 h-3.5 mr-2 inline" />
              Academic Programs
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full md:w-72">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="w-4 h-4" />
            </span>
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-neutral-200 bg-white text-neutral-900 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Campuses Panel */}
        <TabsContent value="campuses" className="pt-6">
          {campusesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-44 border border-neutral-200 rounded-3xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : filteredCampuses.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampuses.map((campus) => (
                <div
                  key={campus.id}
                  className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 font-mono">
                          {campus.code}
                        </span>
                        <h3 className="text-sm font-bold text-neutral-900 font-display">{campus.name}</h3>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        campus.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                      }`}>
                        {campus.status}
                      </span>
                    </div>

                    {campus.description && (
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {campus.description}
                      </p>
                    )}

                    <div className="pt-2 space-y-1.5 border-t border-neutral-50">
                      {campus.email && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          {campus.email}
                        </div>
                      )}
                      {campus.phoneNumber && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <Phone className="w-3.5 h-3.5 text-neutral-400" />
                          {campus.phoneNumber}
                        </div>
                      )}
                      {campus.address && (
                        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          {campus.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-neutral-50">
                    <Button
                      onClick={() => handleOpenCampusDialog(campus)}
                      variant="outline"
                      className="p-2 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteCampus(campus.id)}
                      variant="outline"
                      className="p-2 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-neutral-200 rounded-3xl bg-white space-y-2">
              <School className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 font-semibold">No campuses found</p>
              <p className="text-[10px] text-neutral-400">Try refining your search or add a new campus branch.</p>
            </div>
          )}
        </TabsContent>

        {/* Programs Panel */}
        <TabsContent value="programs" className="pt-6">
          {programsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-40 border border-neutral-200 rounded-3xl bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : filteredPrograms.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPrograms.map((program) => (
                <div
                  key={program.id}
                  className="bg-white border border-neutral-200/80 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.015)] hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-neutral-100 text-neutral-500 font-mono">
                          {program.code}
                        </span>
                        <h3 className="text-sm font-bold text-neutral-900 font-display">{program.name}</h3>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        program.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                      }`}>
                        {program.status}
                      </span>
                    </div>

                    {program.description && (
                      <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                        {program.description}
                      </p>
                    )}

                    <div className="pt-2 space-y-1.5 border-t border-neutral-50">
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <School className="w-3.5 h-3.5 text-neutral-400" />
                        Campus: <span className="font-semibold text-neutral-700">{program.campus?.name || "Shared"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-neutral-500">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        Duration: <span className="font-semibold text-neutral-700">{program.durationYears} Years</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-neutral-50">
                    <Button
                      onClick={() => handleOpenProgramDialog(program)}
                      variant="outline"
                      className="p-2 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteProgram(program.id)}
                      variant="outline"
                      className="p-2 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-neutral-200 rounded-3xl bg-white space-y-2">
              <GraduationCap className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 font-semibold">No programs found</p>
              <p className="text-[10px] text-neutral-400">Try refining your search or add a new academic program.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Campus Form Dialog */}
      <Dialog open={isCampusDialogOpen} onOpenChange={setIsCampusDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display">
              {selectedCampus ? "Edit Campus" : "Add Campus Branch"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Configure parameters and contact info for this campus.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveCampus} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Campus Name</Label>
                <Input
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  placeholder="e.g. Main Campus"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Code (Unique ID)</Label>
                <Input
                  value={campusCode}
                  onChange={(e) => setCampusCode(e.target.value)}
                  placeholder="e.g. MC-01"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</Label>
              <textarea
                value={campusDesc}
                onChange={(e) => setCampusDesc(e.target.value)}
                placeholder="Brief information about this campus"
                className="w-full min-h-[70px] border border-neutral-200 rounded-xl p-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 placeholder:text-neutral-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Contact Email</Label>
                <Input
                  type="email"
                  value={campusEmail}
                  onChange={(e) => setCampusEmail(e.target.value)}
                  placeholder="contact@example.edu"
                  className="h-10 text-xs border-neutral-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone Number</Label>
                <Input
                  value={campusPhone}
                  onChange={(e) => setCampusPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="h-10 text-xs border-neutral-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Address</Label>
              <Input
                value={campusAddress}
                onChange={(e) => setCampusAddress(e.target.value)}
                placeholder="Street address, City, Country"
                className="h-10 text-xs border-neutral-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Website URL</Label>
                <Input
                  value={campusWebsite}
                  onChange={(e) => setCampusWebsite(e.target.value)}
                  placeholder="https://example.edu"
                  className="h-10 text-xs border-neutral-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status</Label>
                <select
                  value={campusStatus}
                  onChange={(e: any) => setCampusStatus(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCampusDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingCampus || updatingCampus}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1 cursor-pointer"
              >
                {creatingCampus || updatingCampus ? "Saving..." : "Save Campus"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Program Form Dialog */}
      <Dialog open={isProgramDialogOpen} onOpenChange={setIsProgramDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display">
              {selectedProgram ? "Edit Program" : "Add Academic Program"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Create and associate a curriculum/degree course.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveProgram} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Program Name</Label>
                <Input
                  value={programName}
                  onChange={(e) => setProgramName(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Program Code</Label>
                <Input
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value)}
                  placeholder="e.g. CS-BS"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Description</Label>
              <textarea
                value={programDesc}
                onChange={(e) => setProgramDesc(e.target.value)}
                placeholder="Degree program objectives and details"
                className="w-full min-h-[70px] border border-neutral-200 rounded-xl p-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 placeholder:text-neutral-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Campus Branch</Label>
                <select
                  value={programCampusId}
                  onChange={(e) => setProgramCampusId(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
                  required
                >
                  <option value="" disabled>Select Campus</option>
                  {campusesData?.items?.filter(c => c.status === "ACTIVE").map((campus) => (
                    <option key={campus.id} value={campus.id}>
                      {campus.name} ({campus.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Duration (Years)</Label>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  value={programDuration}
                  onChange={(e) => setProgramDuration(e.target.value)}
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status</Label>
              <select
                value={programStatus}
                onChange={(e: any) => setProgramStatus(e.target.value)}
                className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProgramDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingProgram || updatingProgram}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1 cursor-pointer"
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
