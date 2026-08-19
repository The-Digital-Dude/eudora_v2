"use client";

import { UserPlus } from "lucide-react";
import * as React from "react";

import { AddChildForm } from "@/components/add-child-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Adding a child, from anywhere in the family portal.
 *
 * AddChildForm previously rendered only in the portal's empty state, so the
 * moment a guardian had one child there was no route to a second — the only
 * other copy lived inside checkout. A household with two kids is the normal
 * case, not an edge case.
 */
export function AddChildDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  onCreated,
}: {
  /** Defaults to a small outline button. Pass `null` for controlled use. */
  trigger?: React.ReactNode | null;
  /**
   * Controlled mode, for openers that cannot host a DialogTrigger — a dropdown
   * item, for instance, unmounts as the menu closes and would take the dialog
   * with it.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (child: { id: string; fullName: string }) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button
              variant="outline"
              className="h-9 cursor-pointer gap-1.5 rounded-xl px-3 text-xs font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add child
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="rounded-3xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-bold tracking-tight">
            Add a child
          </DialogTitle>
          <DialogDescription className="text-xs">
            They will appear in your portal straight away, and become the child
            you are viewing.
          </DialogDescription>
        </DialogHeader>
        <AddChildForm
          onCreated={(child) => {
            setOpen(false);
            onCreated?.(child);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
