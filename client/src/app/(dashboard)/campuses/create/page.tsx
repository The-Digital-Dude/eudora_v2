"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateCampusMutation } from "@/features/dashboard/dashboardApi";

import { CampusForm, type CampusFormValues,EMPTY_CAMPUS } from "../components/campus-form";

export default function CreateCampusPage() {
  const router = useRouter();
  const [createCampus, { isLoading }] = useCreateCampusMutation();
  const [values, setValues] = React.useState<CampusFormValues>(EMPTY_CAMPUS);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createCampus({
        name: values.name,
        code: values.code.toUpperCase(),
        description: values.description,
        email: values.email,
        phoneNumber: values.phoneNumber,
        address: values.address,
        website: values.website,
        status: values.status,
      }).unwrap();
      toast.success("Campus created");
      router.push("/campuses");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save campus information.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/campuses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Campuses
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Add Campus Branch
        </h1>
        <p className="text-xs text-muted-foreground">
          Configure parameters and contact info for this campus.
        </p>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        <CampusForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/campuses")}
          isSaving={isLoading}
          submitLabel="Save Campus"
          error={error}
        />
      </Card>
    </div>
  );
}
