"use client";

import {
  AlertCircle,
  Edit2,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
import {
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useGetLeadsQuery,
  useUpdateLeadMutation,
} from "@/features/dashboard/dashboardApi";

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // RTK Queries & Mutations
  const { data: leadsData, isLoading } = useGetLeadsQuery();
  const [createLead, { isLoading: creating }] = useCreateLeadMutation();
  const [updateLead, { isLoading: updating }] = useUpdateLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();

  // Modal Dialog States
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null); // Null for Add mode
  const [formError, setFormError] = useState("");

  // Form States
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadStatus, setLeadStatus] = useState("New");
  const [leadSource, setLeadSource] = useState("Website Form");
  const [leadNotes, setLeadNotes] = useState("");

  const handleOpenDialog = (lead: any = null) => {
    setFormError("");
    if (lead) {
      setSelectedLead(lead);
      setLeadName(lead.name || "");
      setLeadEmail(lead.email || "");
      setLeadPhone(lead.phone || "");
      setLeadStatus(lead.status || "New");
      setLeadSource(lead.source || "Website Form");
      setLeadNotes(lead.notes || "");
    } else {
      setSelectedLead(null);
      setLeadName("");
      setLeadEmail("");
      setLeadPhone("");
      setLeadStatus("New");
      setLeadSource("Website Form");
      setLeadNotes("");
    }
    setIsDialogOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail) {
      setFormError("Name and Email are required fields.");
      return;
    }

    const payload = {
      name: leadName,
      email: leadEmail,
      phone: leadPhone || undefined,
      status: leadStatus,
      source: leadSource,
      notes: leadNotes || undefined,
    };

    try {
      if (selectedLead) {
        await updateLead({ id: selectedLead.id, body: payload }).unwrap();
      } else {
        await createLead(payload).unwrap();
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to save lead info.");
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (confirm("Are you sure you want to remove this lead?")) {
      try {
        await deleteLead(id).unwrap();
      } catch (err: any) {
        alert(err?.data?.message || "Failed to delete lead.");
      }
    }
  };

  // Metrics calculation
  const leadsList = leadsData?.items || [];
  const totalLeads = leadsList.length;
  const diagnosticsBooked = leadsList.filter(
    (l: any) => l.status === "Diagnostic Scheduled",
  ).length;
  const enrolledCount = leadsList.filter((l: any) => l.status === "Enrolled").length;
  const conversionRate = totalLeads > 0 ? Math.round((enrolledCount / totalLeads) * 100) : 0;

  // Filtered Leads list
  const filteredLeads = leadsList.filter((l: any) => {
    const name = l.name?.toLowerCase() || "";
    const email = l.email?.toLowerCase() || "";
    const source = l.source?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query) || source.includes(query);
  });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            Leads & Enrolments
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Track interest, onboard prospective students, and coordinate enroled classes.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm hover:bg-foreground/90 active:scale-98"
        >
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border border-border bg-card p-4">
          <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Total Leads
          </CardDescription>
          <CardTitle className="font-display mt-1 text-2xl font-bold text-foreground">
            {isLoading ? "..." : totalLeads}
          </CardTitle>
          <p className="mt-1 flex items-center gap-0.5 text-[10px] text-muted-foreground">
            Registered interest list
          </p>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-4">
          <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Diagnostics Booked
          </CardDescription>
          <CardTitle className="font-display mt-1 text-2xl font-bold text-foreground">
            {isLoading ? "..." : diagnosticsBooked}
          </CardTitle>
          <p className="mt-1 text-[10px] text-muted-foreground">Awaiting academic assessment</p>
        </Card>
        <Card className="rounded-2xl border border-border bg-card p-4">
          <CardDescription className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Conversion Rate
          </CardDescription>
          <CardTitle className="font-display mt-1 text-2xl font-bold text-foreground">
            {isLoading ? "..." : `${conversionRate}%`}
          </CardTitle>
          <p className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold text-success">
            <TrendingUp className="h-3.5 w-3.5" /> {enrolledCount} enrolled students
          </p>
        </Card>
      </div>

      {/* Leads Table Card */}
      <Card className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">
            Active Interest Pipelines
          </h2>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
            </span>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-xs"
              placeholder="Search leads..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Name</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Source</th>
                <th className="pb-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                <th className="pb-3 text-right text-[10px] font-bold text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-3">
                      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                    </td>
                    <td className="py-3">
                      <div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead: any) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/30 transition-colors last:border-0 hover:bg-muted/50"
                  >
                    <td className="py-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{lead.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </span>
                          {lead.phone && (
                            <span className="flex items-center gap-0.5">
                              | <Phone className="h-3 w-3" /> {lead.phone}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{lead.source}</td>
                    <td className="py-3 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          lead.status === "Enrolled"
                            ? "border border-success/20 bg-success/10 text-success"
                            : lead.status === "New"
                              ? "border border-primary/20 bg-primary/10 text-primary"
                              : lead.status === "Diagnostic Scheduled"
                                ? "border border-warning/20 bg-warning/10 text-warning"
                                : "border border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleOpenDialog(lead)}
                          variant="outline"
                          className="h-8 rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteLead(lead.id)}
                          variant="outline"
                          className="h-8 rounded-lg border-destructive/20 p-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs font-medium text-muted-foreground">
                    No leads listed. Click &quot;Add Lead&quot; to register prospective interests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-foreground">
              {selectedLead ? "Edit Lead Information" : "Add Prospective Lead"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter the student details and prospective entry route.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Full Name
                </Label>
                <Input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Charlotte Harris"
                  className="h-10 border-border text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Email
                </Label>
                <Input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="charlotte@example.com"
                  className="h-10 border-border text-xs"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Phone
                </Label>
                <Input
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="(555) 019-8832"
                  className="h-10 border-border text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Status
                </Label>
                <select
                  value={leadStatus}
                  onChange={(e: any) => setLeadStatus(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
                >
                  <option value="New">New</option>
                  <option value="Diagnostic Scheduled">Diagnostic Scheduled</option>
                  <option value="Pending Enrolment">Pending Enrolment</option>
                  <option value="Enrolled">Enrolled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  Source
                </Label>
                <select
                  value={leadSource}
                  onChange={(e: any) => setLeadSource(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
                >
                  <option value="Website Form">Website Form</option>
                  <option value="Referral">Referral</option>
                  <option value="Facebook Ad">Facebook Ad</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                Internal Notes
              </Label>
              <textarea
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                placeholder="Awaiting parent confirmation for diagnostic slot."
                className="min-h-[70px] w-full rounded-xl border border-border bg-card p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || updating}
                className="flex h-10 cursor-pointer items-center gap-1 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-foreground/90"
              >
                {creating || updating ? "Saving..." : "Save Lead"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
