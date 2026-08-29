"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateTeacherProfileMutation } from "@/features/dashboard/dashboardApi";

import {
  EMPTY_TEACHER_PROFILE,
  TeacherProfileForm,
  type TeacherProfileFormValues,
} from "../components/teacher-profile-form";

export default function CreateTeacherPage() {
  const router = useRouter();
  const [createTeacherProfile, { isLoading }] = useCreateTeacherProfileMutation();
  const [values, setValues] = React.useState<TeacherProfileFormValues>(EMPTY_TEACHER_PROFILE);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createTeacherProfile({
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        employeeCode: values.employeeCode || undefined,
        phone: values.phone || undefined,
        specialization: values.specialization || undefined,
        status: values.status,
      }).unwrap();
      toast.success("Teacher profile registered");
      router.push("/teachers");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save teacher details.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/teachers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Teachers
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Register Teacher Profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Create a user account and profile demographics for the teacher. Section assignments can
          be set once the profile is saved.
        </p>
      </div>

      <Card className="w-full rounded-3xl border border-border bg-card p-6">
        <TeacherProfileForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/teachers")}
          isSaving={isLoading}
          submitLabel="Save Profile"
          error={error}
          mode="create"
        />
      </Card>
    </div>
  );
}
