"use client";

import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useDeleteStudentProfileMutation,
  useGetStudentProfileQuery,
  useUpdateStudentProfileMutation,
} from "@/features/dashboard/dashboardApi";

import { StudentAcademicRoutes } from "../components/student-academic-routes";
import {
  EMPTY_STUDENT_PROFILE,
  StudentProfileForm,
  type StudentProfileFormValues,
} from "../components/student-profile-form";

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params?.id ?? "";

  const { data: student, isLoading } = useGetStudentProfileQuery(studentId, {
    skip: !studentId,
  });
  const [updateStudentProfile, { isLoading: isSaving }] = useUpdateStudentProfileMutation();
  const [deleteStudentProfile] = useDeleteStudentProfileMutation();

  const [values, setValues] = React.useState<StudentProfileFormValues>(EMPTY_STUDENT_PROFILE);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!student) return;
    setValues({
      fullName: student.fullName ?? "",
      userId: student.userId ?? "",
      birthDate: student.birthDate ? student.birthDate.split("T")[0] : "",
      gender: student.gender ?? "MALE",
      status: student.status ?? "ACTIVE",
    });
  }, [student]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await updateStudentProfile({
        id: studentId,
        body: {
          fullName: values.fullName,
          birthDate: new Date(values.birthDate).toISOString(),
          gender: values.gender,
          status: values.status,
        },
      }).unwrap();
      toast.success("Student profile updated");
    } catch (err: any) {
      setError(err?.data?.message || "Failed to save student profile details.");
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Archive this student profile? Their learning history is kept and the profile can be restored later.",
      )
    )
      return;
    try {
      await deleteStudentProfile(studentId).unwrap();
      toast.success("Student profile archived");
      router.push("/students");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to archive student profile.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-3">
        <Link
          href="/students"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Students
        </Link>
        <p className="text-sm font-semibold text-foreground">Student profile not found.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Students
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">
            {student.fullName}
          </h1>
          <p className="text-xs text-muted-foreground">{student.user?.email}</p>
        </div>

        {!student.deletedAt && (
          <Button
            variant="outline"
            onClick={handleDelete}
            className="h-10 w-fit cursor-pointer gap-1.5 rounded-xl border-destructive/20 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Archive Profile
          </Button>
        )}
      </div>

      <Card className="max-w-xl rounded-3xl border border-border bg-card p-6">
        <StudentProfileForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/students")}
          isSaving={isSaving}
          submitLabel="Save Changes"
          error={error}
          lockUserAccount
        />
      </Card>

      <Card className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-display mb-4 text-sm font-bold text-foreground">
          Academic Route Setup
        </h2>
        <StudentAcademicRoutes student={student} />
      </Card>
    </div>
  );
}
