"use client";

import { AlertCircle, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePasswordMutation } from "@/features/auth/authApi";

/** Mirrors the server rules so the failure shows before a round trip. */
function passwordProblem(value: string): string | null {
  if (value.length < 10) return "At least 10 characters.";
  if (value.length > 72) return "At most 72 characters.";
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
    return "Needs a lowercase letter, an uppercase letter and a number.";
  }
  return null;
}

/**
 * `POST /auth/change-password` has existed and worked for some time with
 * nothing calling it, so a signed-in user had no way to change their password
 * either — only the emailed reset path could do it, and that did not exist.
 */
export default function AccountSecurityPage() {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const problem = next ? passwordProblem(next) : null;
  const mismatch = confirm.length > 0 && confirm !== next;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (problem || mismatch) return;

    try {
      await changePassword({
        currentPassword: current,
        newPassword: next,
      }).unwrap();
      toast.success("Password changed. Other devices have been signed out.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      setError(err?.data?.message || "Could not change your password.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display flex items-center gap-2 text-2xl font-bold text-foreground">
          <KeyRound className="h-6 w-6 text-primary" />
          Security
        </h1>
        <p className="text-xs text-muted-foreground">
          Change the password you sign in with.
        </p>
      </div>

      <Card className="max-w-lg rounded-3xl border border-border bg-card p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Current password
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={show ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="h-10 pl-10 text-xs"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              New password
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={show ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="h-10 pr-10 pl-10 text-xs"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide passwords" : "Show passwords"}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3.5 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {problem && (
              <p className="text-[10px] font-semibold text-destructive">{problem}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              Confirm new password
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                type={show ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-10 pl-10 text-xs"
                required
                autoComplete="new-password"
              />
            </div>
            {mismatch && (
              <p className="text-[10px] font-semibold text-destructive">
                These don&apos;t match.
              </p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Changing your password signs you out on every other device.
          </p>

          <div className="flex items-center justify-end border-t border-border pt-4">
            <Button
              type="submit"
              disabled={isLoading || !current || !next || !!problem || mismatch}
              className="h-10 cursor-pointer rounded-xl px-4 text-xs font-semibold"
            >
              {isLoading ? "Changing..." : "Change password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
