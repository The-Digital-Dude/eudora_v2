"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { useCreateStudentProfileMutation } from "@/features/dashboard/dashboardApi";

import {
  EMPTY_STUDENT_PROFILE,
  StudentProfileForm,
  type StudentProfileFormValues,
} from "../components/student-profile-form";

export default function CreateStudentPage() {
  const router = useRouter();
  const [createStudentProfile, { isLoading }] = useCreateStudentProfileMutation();
  const [values, setValues] = React.useState<StudentProfileFormValues>(EMPTY_STUDENT_PROFILE);
  const [error, setError] = React.useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await createStudentProfile({
        fullName: values.fullName,
        userId: values.userId,
        birthDate: new Date(values.birthDate).toISOString(),
        gender: values.gender,
        status: values.status,
      }).unwrap();
      toast.success("Student profile registered");
      router.push("/students");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save student profile details.");
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-1">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Students
        </Link>
        <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
          Register Student Profile
        </h1>
        <p className="text-xs text-muted-foreground">
          Link the student profile to an active system user and fill demographics. Class
          placements and course enrollments can be set once the profile is saved.
        </p>
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        <StudentProfileForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/students")}
          isSaving={isLoading}
          submitLabel="Save Profile"
          error={error}
        />
      </Card>
    </div>
  );
}
