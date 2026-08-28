"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForgotPasswordMutation } from "@/features/auth/authApi";

export default function ForgotPasswordPage() {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await forgotPassword({ email }).unwrap();
    } catch {
      // Deliberately swallowed. The API answers identically for a registered
      // and an unregistered address so the form cannot be used to discover who
      // has an account; surfacing a failure here would give that away again.
    }
    setSent(true);
  };

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
          {sent ? (
            <div className="space-y-4 text-center">
              <h1 className="font-display text-card-foreground text-2xl font-bold tracking-tight">
                Check your email
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed">
                If <span className="text-foreground font-semibold">{email}</span> has an
                account, a reset link is on its way. It works once and expires in an
                hour.
              </p>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Nothing arriving? Check spam, or try again — the address may not be
                registered.
              </p>
              <Link
                href="/login"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 pt-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 space-y-2 text-center">
                <h1 className="font-display text-card-foreground text-2xl font-bold tracking-tight">
                  Reset your password
                </h1>
                <p className="text-muted-foreground mx-auto max-w-[300px] text-xs leading-normal">
                  Enter the email address you sign in with and we&apos;ll send you a
                  link to choose a new password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                    Email address
                  </Label>
                  <div className="relative">
                    <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <Mail className="h-4 w-4" />
                    </span>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="h-11 pl-10 text-xs"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !email}
                  className="h-11 w-full cursor-pointer rounded-xl text-xs font-bold"
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>

                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 text-xs font-semibold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
