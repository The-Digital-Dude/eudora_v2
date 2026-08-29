"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useResetPasswordMutation } from "@/features/auth/authApi";

/** Mirrors the server rules so the failure is shown before a round trip. */
function passwordProblem(value: string): string | null {
  if (value.length < 10) return "At least 10 characters.";
  if (value.length > 72) return "At most 72 characters.";
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
    return "Needs a lowercase letter, an uppercase letter and a number.";
  }
  return null;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const problem = password ? passwordProblem(password) : null;
  const mismatch = confirm.length > 0 && confirm !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (problem || mismatch) return;

    try {
      await resetPassword({ token, newPassword: password }).unwrap();
      setDone(true);
    } catch (err: any) {
      setError(
        err?.data?.message ||
          "This reset link is invalid or has expired. Request a new one.",
      );
    }
  };

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <AlertCircle className="text-destructive mx-auto h-8 w-8" />
        <h1 className="font-display text-card-foreground text-2xl font-bold tracking-tight">
          Link incomplete
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          This page needs the link from your reset email. Open that link
          directly, or request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="text-foreground inline-block pt-2 text-xs font-semibold hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="text-success mx-auto h-8 w-8" />
        <h1 className="font-display text-card-foreground text-2xl font-bold tracking-tight">
          Password updated
        </h1>
        <p className="text-muted-foreground text-xs leading-relaxed">
          You&apos;ve been signed out everywhere else, so any other device will
          need the new password.
        </p>
        <Button
          onClick={() => router.push("/login")}
          className="h-11 w-full cursor-pointer rounded-xl text-xs font-bold"
        >
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 space-y-2 text-center">
        <h1 className="font-display text-card-foreground text-2xl font-bold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[300px] text-xs leading-normal">
          Pick something you don&apos;t use anywhere else.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="border-destructive/20 bg-destructive/10 text-destructive flex items-start gap-1.5 rounded-xl border p-3 text-xs font-semibold">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {error}{" "}
              <Link href="/forgot-password" className="underline">
                Request a new link
              </Link>
              .
            </span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            New password
          </Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="h-11 pr-10 pl-10 text-xs"
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
              className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {problem && (
            <p className="text-destructive text-[10px] font-semibold">{problem}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
            Confirm new password
          </Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4" />
            </span>
            <Input
              type={show ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••••"
              className="h-11 pl-10 text-xs"
              required
            />
          </div>
          {mismatch && (
            <p className="text-destructive text-[10px] font-semibold">
              These don&apos;t match.
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isLoading || !password || !!problem || mismatch}
          className="h-11 w-full cursor-pointer rounded-xl text-xs font-bold"
        >
          {isLoading ? "Updating..." : "Set new password"}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="dot-grid bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center px-4 py-12 font-sans">
      <div className="animate-fade-in-up w-full max-w-[440px] space-y-8">
        <div className="flex flex-col items-center">
          <Link href="/">
            <Image
              src="/landing/eudora_logo.png"
              alt="Eudora"
              width={218}
              height={72}
              className="h-11 w-auto"
            />
          </Link>
        </div>

        <div className="border-border bg-card rounded-3xl border p-8 shadow-[0_24px_60px_color-mix(in_oklch,var(--foreground)_4%,transparent),0_4px_12px_color-mix(in_oklch,var(--foreground)_2%,transparent)] md:p-10">
          {/* useSearchParams needs a Suspense boundary to prerender. */}
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
