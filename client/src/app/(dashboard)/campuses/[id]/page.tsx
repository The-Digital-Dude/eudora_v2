"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteCampusMutation,
  useGetCampusQuery,
  useUpdateCampusMutation,
} from "@/features/dashboard/dashboardApi";

import { CampusForm, type CampusFormValues,EMPTY_CAMPUS } from "../components/campus-form";

export default function CampusDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const campusId = params?.id ?? "";

  const { data: campus, isLoading } = useGetCampusQuery(campusId, { skip: !campusId });
  const [updateCampus, { isLoading: isSaving }] = useUpdateCampusMutation();
  const [deleteCampus] = useDeleteCampusMutation();

  const [values, setValues] = React.useState<CampusFormValues>(EMPTY_CAMPUS);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!campus) return;
    setValues({
      name: campus.name ?? "",
      code: campus.code ?? "",
      description: campus.description ?? "",
      email: campus.email ?? "",
      phoneNumber: campus.phoneNumber ?? "",
      address: campus.address ?? "",
      website: campus.website ?? "",
      status: campus.status ?? "ACTIVE",
    });
  }, [campus]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateCampus({
        id: campusId,
        body: {
          name: values.name,
          code: values.code.toUpperCase(),
          description: values.description,
          email: values.email,
          phoneNumber: values.phoneNumber,
          address: values.address,
          website: values.website,
          status: values.status,
        },
      }).unwrap();
      toast.success("Campus updated");
      router.push("/campuses");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save campus information.");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this campus? This will delete associated programs and classrooms.",
      )
    )
      return;
    try {
      await deleteCampus(campusId).unwrap();
      toast.success("Campus deleted");
      router.push("/campuses");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete campus.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campus) {
    return (
      <div className="space-y-3">
        <Link
          href="/campuses"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Campuses
        </Link>
        <p className="text-sm font-semibold text-foreground">Campus not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/campuses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Campuses
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {campus.name}
          </h1>
        </div>

        <Button
          variant="outline"
          onClick={handleDelete}
          className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Campus
        </Button>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        <CampusForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/campuses")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
        />
      </Card>
    </div>
  );
}
