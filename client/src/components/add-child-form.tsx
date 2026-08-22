"use client";

import { Loader2, UserPlus } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetClassesQuery } from "@/features/assessments/questionsApi";
import { useCreateChildMutation } from "@/features/parent/parentApi";
import { setActingChildId } from "@/lib/acting-child";

/**
 * Adds a child to the signed-in guardian's account.
 *
 * Deliberately three fields. Every extra question sits between a parent and
 * paying, and none of the rest is needed to deliver a course — gender defaults
 * to OTHER server-side rather than being asked for.
 *
 * The child gets no login of their own; they reach content through the
 * guardian's session.
 */
export function AddChildForm({
  onCreated,
  submitLabel = "Add child",
}: {
  onCreated?: (child: { id: string; fullName: string }) => void;
  submitLabel?: string;
}) {
  const [fullName, setFullName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState("");
  const [classId, setClassId] = React.useState("");

  const { data: classesData } = useGetClassesQuery();
  const classes = classesData?.items ?? [];
  const [createChild, { isLoading }] = useCreateChildMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const child = await createChild({
        fullName: fullName.trim(),
        birthDate,
        classId: classId || undefined,
      }).unwrap();

      // Make the new child the active one, so whatever the guardian was doing
      // — usually a purchase — continues against them without another step.
      setActingChildId(child.id);
      toast.success(`${child.fullName} added`);
      onCreated?.(child);
    } catch (err: any) {
      toast.error(err?.data?.message || "Could not add this child.");
    }
  };

  const labelClass =
    "text-[10px] font-bold tracking-wider text-muted-foreground uppercase";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label className={labelClass}>Child&apos;s name</Label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Sara Rahman"
          className="h-10 border-border text-xs"
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className={labelClass}>Date of birth</Label>
          <Input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="h-10 border-border text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <Label className={labelClass}>Class</Label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring/10 focus:outline-none"
          >
            <option value="">Not sure yet</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading || !fullName.trim() || !birthDate}
        className="flex h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-foreground text-xs font-semibold text-background hover:bg-foreground/90"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserPlus className="h-3.5 w-3.5" />
        )}
        {submitLabel}
      </Button>

      <p className="text-center text-[10px] text-muted-foreground">
        Your child doesn&apos;t need their own email or password. They learn
        through your account.
      </p>
    </form>
  );
}
