"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteTeacherProfileMutation,
  useGetTeacherProfileQuery,
  useUpdateTeacherProfileMutation,
} from "@/features/dashboard/dashboardApi";

import { TeacherClassAssignments } from "../components/teacher-class-assignments";
import {
  EMPTY_TEACHER_PROFILE,
  TeacherProfileForm,
  type TeacherProfileFormValues,
} from "../components/teacher-profile-form";
import { TeacherWorkloadPanels } from "../components/teacher-workload-panels";

export default function TeacherDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const teacherId = params?.id ?? "";

  const { data: teacher, isLoading } = useGetTeacherProfileQuery(teacherId, {
    skip: !teacherId,
  });
  const [updateTeacherProfile, { isLoading: isSaving }] = useUpdateTeacherProfileMutation();
  const [deleteTeacherProfile] = useDeleteTeacherProfileMutation();

  const [values, setValues] = React.useState<TeacherProfileFormValues>(EMPTY_TEACHER_PROFILE);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!teacher) return;
    setValues({
      email: teacher.user?.email ?? "",
      firstName: teacher.user?.firstName ?? "",
      lastName: teacher.user?.lastName ?? "",
      fullName: teacher.fullName ?? "",
      employeeCode: teacher.employeeCode ?? "",
      phone: teacher.phone ?? "",
      specialization: teacher.specialization ?? "",
      status: teacher.status ?? "ACTIVE",
    });
  }, [teacher]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateTeacherProfile({
        id: teacherId,
        body: {
          fullName: values.fullName,
          employeeCode: values.employeeCode || undefined,
          phone: values.phone || undefined,
          specialization: values.specialization || undefined,
          status: values.status,
        },
      }).unwrap();
      toast.success("Teacher profile updated");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save teacher details.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to deactivate and remove this teacher?")) return;
    try {
      await deleteTeacherProfile(teacherId).unwrap();
      toast.success("Teacher removed");
      router.push("/teachers");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete teacher.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="space-y-3">
        <Link
          href="/teachers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Teachers
        </Link>
        <p className="text-sm font-semibold text-foreground">Teacher profile not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/teachers"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Teachers
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {teacher.fullName}
          </h1>
          <p className="text-xs text-muted-foreground">{teacher.user?.email}</p>
        </div>

        <Button
          variant="outline"
          onClick={handleDelete}
          className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove Teacher
        </Button>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-6">
        <TeacherProfileForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/teachers")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
          mode="edit"
        />
      </Card>

      <TeacherWorkloadPanels teacher={teacher} />

      <Card className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display mb-4 text-sm font-bold text-foreground">Section Allocations</h2>
        <TeacherClassAssignments teacher={teacher} />
      </Card>
    </div>
  );
}
