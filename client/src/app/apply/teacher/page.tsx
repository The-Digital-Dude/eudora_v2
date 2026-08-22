"use client";

import { CheckCircle2, Clock, FileText, Loader2, Upload, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetMyTeacherApplicationQuery,
  useSubmitTeacherApplicationMutation,
} from "@/features/teacher/teacherApplicationsApi";
import { getRoleHome } from "@/lib/access-control";
import { useAppSelector } from "@/store/hooks";

/** Mirrors MAX_RESUME_BYTES on the API, so an oversized file fails here with a real message. */
const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const labelClass = "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

export default function TeacherApplicationPage() {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isAuthenticated = auth.isAuthenticated;

  const { data: application, isLoading: isStatusLoading } = useGetMyTeacherApplicationQuery(
    undefined,
    { skip: !isAuthenticated },
  );
  const [submitApplication, { isLoading: isSubmitting }] = useSubmitTeacherApplicationMutation();

  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [specialization, setSpecialization] = React.useState("");
  const [yearsExperience, setYearsExperience] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [resume, setResume] = React.useState<File | null>(null);

  // Applying requires an account, because every stored CV has to be
  // attributable to someone. `as=teacher` puts the register page in the right
  // branch so they come back here afterwards.
  React.useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/register?as=teacher");
    }
  }, [isAuthenticated, router]);

  React.useEffect(() => {
    const defaultName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();
    if (defaultName) setFullName((current) => current || defaultName);
  }, [user]);

  const handleResumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setResume(null);
      return;
    }
    // The API re-checks all of this, including the file's magic bytes — this
    // is only so the person is told before a 5MB round trip.
    if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
      toast.error("Please attach your CV as a PDF.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      toast.error("That file is larger than 5MB. Try exporting it as a PDF rather than a scan.");
      event.target.value = "";
      return;
    }
    setResume(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resume) {
      toast.error("Please attach your CV.");
      return;
    }
    try {
      await submitApplication({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        specialization: specialization.trim() || undefined,
        yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
        bio: bio.trim() || undefined,
        resume,
      }).unwrap();
      toast.success("Application received.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not submit your application. Please try again.");
    }
  };

  if (!isAuthenticated || isStatusLoading) {
    return (
      <Shell>
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (application) {
    return (
      <Shell>
        <ApplicationStatus status={application.status} />
        <Button
          asChild
          variant="outline"
          className="mt-6 h-10 w-full cursor-pointer rounded-xl text-xs font-semibold"
        >
          <Link href={getRoleHome(user)}>Go to my account</Link>
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 space-y-2">
        <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
          Apply to teach
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Tell us what you teach and attach your CV. We read every application
          ourselves, so this takes a few days rather than a few minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label className={labelClass}>Full name</Label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border-border h-11 rounded-xl text-xs"
            required
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className={labelClass}>Phone</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 1XXX XXXXXX"
              className="border-border h-11 rounded-xl text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className={labelClass}>Years teaching</Label>
            <Input
              type="number"
              min={0}
              max={70}
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="5"
              className="border-border h-11 rounded-xl text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Subject or specialism</Label>
          <Input
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            placeholder="e.g. Primary mathematics"
            className="border-border h-11 rounded-xl text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>Anything we should know</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="How you teach, who you have taught, what you would want to run here."
            className="border-border rounded-xl text-xs"
          />
        </div>

        <div className="space-y-1">
          <Label className={labelClass}>CV (PDF, up to 5MB)</Label>
          <label
            htmlFor="resume"
            className="border-border hover:border-ring bg-muted/30 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 transition-colors"
          >
            {resume ? (
              <FileText className="text-success h-5 w-5 shrink-0" />
            ) : (
              <Upload className="text-muted-foreground h-5 w-5 shrink-0" />
            )}
            <span className="min-w-0 flex-1">
              <span className="text-foreground block truncate text-xs font-semibold">
                {resume ? resume.name : "Choose a PDF"}
              </span>
              <span className="text-muted-foreground block text-[10px]">
                {resume
                  ? `${(resume.size / 1024 / 1024).toFixed(1)}MB, click to replace`
                  : "Only you and our reviewers will ever see this file."}
              </span>
            </span>
          </label>
          <input
            id="resume"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleResumeChange}
            className="sr-only"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !fullName.trim() || !resume}
          className="bg-foreground text-background hover:bg-foreground/90 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-semibold active:scale-98"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Submit application
        </Button>

        <p className="text-muted-foreground text-center text-[10px] leading-relaxed">
          Submitting does not grant teaching access. Your account stays as it is
          until we have read your application.
        </p>
      </form>
    </Shell>
  );
}

function ApplicationStatus({ status }: { status: string }) {
  const view = {
    PENDING: {
      icon: <Clock className="text-muted-foreground mx-auto h-10 w-10" />,
      title: "Application received",
      body: "We have it, and we read them in the order they arrive. You will hear from us by email.",
    },
    UNDER_REVIEW: {
      icon: <Clock className="text-primary mx-auto h-10 w-10" />,
      title: "Under review",
      body: "Someone is reading your application now. We will be in touch shortly.",
    },
    APPROVED: {
      icon: <CheckCircle2 className="text-success mx-auto h-10 w-10" />,
      title: "You are approved",
      body: "Your teaching access is switched on. Sign out and back in if you do not see the teacher portal yet.",
    },
    REJECTED: {
      icon: <XCircle className="text-muted-foreground mx-auto h-10 w-10" />,
      title: "Not this time",
      body: "We are not able to take your application forward. Thank you for the time you put into it.",
    },
  }[status] ?? {
    icon: <Clock className="text-muted-foreground mx-auto h-10 w-10" />,
    title: "Application received",
    body: "We will be in touch by email.",
  };

  return (
    <div className="space-y-3 text-center">
      {view.icon}
      <h1 className="font-display text-foreground text-xl font-bold tracking-tight">
        {view.title}
      </h1>
      <p className="text-muted-foreground mx-auto max-w-sm text-xs leading-relaxed">{view.body}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-grid bg-muted/50 text-foreground relative flex min-h-screen flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="animate-fade-in-up w-full max-w-[480px] space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image
              src="/landing/eudora_logo.png"
              alt="Eudora"
              width={218}
              height={72}
              className="h-11 w-auto"
            />
          </Link>
        </div>
        <div className="border-border/60 bg-card rounded-3xl border p-8 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)] md:p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
