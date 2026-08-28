"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteLeadMutation,
  useGetLeadQuery,
  useUpdateLeadMutation,
} from "@/features/dashboard/dashboardApi";

import { EMPTY_LEAD, LeadForm, type LeadFormValues } from "../components/lead-form";

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const leadId = params?.id ?? "";

  const { data: lead, isLoading } = useGetLeadQuery(leadId, { skip: !leadId });
  const [updateLead, { isLoading: isSaving }] = useUpdateLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();

  const [values, setValues] = React.useState<LeadFormValues>(EMPTY_LEAD);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!lead) return;
    setValues({
      name: lead.name ?? "",
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      status: lead.status ?? "New",
      source: lead.source ?? "Website Form",
      notes: lead.notes ?? "",
    });
  }, [lead]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateLead({
        id: leadId,
        body: {
          name: values.name,
          email: values.email,
          phone: values.phone || undefined,
          status: values.status,
          source: values.source,
          notes: values.notes || undefined,
        },
      }).unwrap();
      toast.success("Lead updated");
      router.push("/leads");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save lead info.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to remove this lead?")) return;
    try {
      await deleteLead(leadId).unwrap();
      toast.success("Lead removed");
      router.push("/leads");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete lead.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-3">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leads
        </Link>
        <p className="text-sm font-semibold text-foreground">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Leads
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {lead.name}
          </h1>
        </div>

        <Button
          variant="outline"
          onClick={handleDelete}
          className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove Lead
        </Button>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-6">
        <LeadForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/leads")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
        />
      </Card>
    </div>
  );
}
