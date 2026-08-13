"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateLeadMutation } from "@/features/dashboard/dashboardApi";

import { EMPTY_LEAD, LeadForm, type LeadFormValues } from "../components/lead-form";

export default function CreateLeadPage() {
  const router = useRouter();
  const [createLead, { isLoading }] = useCreateLeadMutation();
  const [values, setValues] = React.useState<LeadFormValues>(EMPTY_LEAD);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createLead({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        status: values.status,
        source: values.source,
        notes: values.notes || undefined,
      }).unwrap();
      toast.success("Lead added");
      router.push("/leads");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save lead info.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Leads
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Add Prospective Lead
        </h1>
        <p className="text-xs text-muted-foreground">
          Enter the student details and prospective entry route.
        </p>
      </div>

      <Card className="max-w-2xl rounded-3xl border border-border bg-card p-6">
        <LeadForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/leads")}
          isSaving={isLoading}
          submitLabel="Save Lead"
          error={error}
        />
      </Card>
    </div>
  );
}
