"use client";

import React, { useState } from "react";
import {
  Search,
  Phone,
  Mail,
  ArrowRight,
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  UserCheck
} from "lucide-react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
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
  const diagnosticsBooked = leadsList.filter((l: any) => l.status === "Diagnostic Scheduled").length;
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Leads & Enrolments
          </h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Track interest, onboard prospective students, and coordinate enroled classes.
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1.5 cursor-pointer active:scale-98 shadow-sm w-fit"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border border-neutral-200 bg-white p-4 rounded-2xl">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Total Leads
          </CardDescription>
          <CardTitle className="text-2xl font-bold text-neutral-900 font-display mt-1">
            {isLoading ? "..." : totalLeads}
          </CardTitle>
          <p className="text-[10px] text-neutral-400 mt-1 flex items-center gap-0.5">
            Registered interest list
          </p>
        </Card>
        <Card className="border border-neutral-200 bg-white p-4 rounded-2xl">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Diagnostics Booked
          </CardDescription>
          <CardTitle className="text-2xl font-bold text-neutral-900 font-display mt-1">
            {isLoading ? "..." : diagnosticsBooked}
          </CardTitle>
          <p className="text-[10px] text-neutral-400 mt-1">Awaiting academic assessment</p>
        </Card>
        <Card className="border border-neutral-200 bg-white p-4 rounded-2xl">
          <CardDescription className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            Conversion Rate
          </CardDescription>
          <CardTitle className="text-2xl font-bold text-neutral-900 font-display mt-1">
            {isLoading ? "..." : `${conversionRate}%`}
          </CardTitle>
          <p className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
            <TrendingUp className="w-3.5 h-3.5" /> {enrolledCount} enrolled students
          </p>
        </Card>
      </div>

      {/* Leads Table Card */}
      <Card className="border border-neutral-200 rounded-3xl p-6 bg-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-neutral-900 font-display">Active Interest Pipelines</h2>
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-neutral-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
              placeholder="Search leads..."
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Name</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Source</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400">Status</th>
                <th className="pb-3 text-[10px] font-bold uppercase text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-neutral-50">
                    <td className="py-3"><div className="h-4 w-32 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-16 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-12 bg-neutral-100 animate-pulse rounded" /></td>
                    <td className="py-3"><div className="h-4 w-10 bg-neutral-100 animate-pulse rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead: any) => (
                  <tr key={lead.id} className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3">
                      <div>
                        <p className="text-xs font-semibold text-neutral-900">{lead.name}</p>
                        <p className="text-[10px] text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                          <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" /> {lead.email}</span>
                          {lead.phone && (
                            <span className="flex items-center gap-0.5">| <Phone className="w-3 h-3" /> {lead.phone}</span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 text-xs text-neutral-500">{lead.source}</td>
                    <td className="py-3 text-xs">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        lead.status === "Enrolled"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : lead.status === "New"
                          ? "bg-blue-50 text-blue-700 border border-blue-100"
                          : lead.status === "Diagnostic Scheduled"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          onClick={() => handleOpenDialog(lead)}
                          variant="outline"
                          className="p-2 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteLead(lead.id)}
                          variant="outline"
                          className="p-2 h-8 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-neutral-400 font-medium">
                    No leads listed. Click "Add Lead" to register prospective interests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-neutral-200">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 font-display">
              {selectedLead ? "Edit Lead Information" : "Add Prospective Lead"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500">
              Enter the student details and prospective entry route.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Full Name</Label>
                <Input
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Charlotte Harris"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email</Label>
                <Input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="charlotte@example.com"
                  className="h-10 text-xs border-neutral-200"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Phone</Label>
                <Input
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="(555) 019-8832"
                  className="h-10 text-xs border-neutral-200"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Status</Label>
                <select
                  value={leadStatus}
                  onChange={(e: any) => setLeadStatus(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
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
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Source</Label>
                <select
                  value={leadSource}
                  onChange={(e: any) => setLeadSource(e.target.value)}
                  className="w-full h-10 border border-neutral-200 rounded-xl px-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10"
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
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Internal Notes</Label>
              <textarea
                value={leadNotes}
                onChange={(e) => setLeadNotes(e.target.value)}
                placeholder="Awaiting parent confirmation for diagnostic slot."
                className="w-full min-h-[70px] border border-neutral-200 rounded-xl p-3 text-xs bg-white text-neutral-900 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900/10 placeholder:text-neutral-300"
              />
            </div>

            <DialogFooter className="pt-4 flex items-center justify-end gap-2 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className="h-10 text-xs font-semibold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || updating}
                className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-10 px-4 flex items-center gap-1 cursor-pointer"
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
