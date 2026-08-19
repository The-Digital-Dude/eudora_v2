"use client";

import { Check, ChevronDown, UserPlus, UserRound } from "lucide-react";
import * as React from "react";

import { AddChildDialog } from "@/components/add-child-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActingChild } from "@/features/parent/useActingChild";

/**
 * Lets a guardian change which child they are acting as, from anywhere.
 *
 * This lives in the topbar rather than only on the portal page because the
 * choice affects every authenticated request — course content, entitlements,
 * checkout — not just what the portal renders. Previously the only way the
 * acting child ever changed was as a side effect of adding a new one, which
 * left multi-child guardians stuck.
 *
 * It also carries "Add a child", which makes that action reachable from every
 * page rather than only from the family portal. That is why a single-child
 * guardian still sees it — the menu is no longer only a picker, so the old
 * "one option is just noise" reasoning no longer holds.
 */
export function ChildSwitcher() {
  const { children, activeChild, select } = useActingChild();
  const [addOpen, setAddOpen] = React.useState(false);

  if (!activeChild) return null;

  return (
    <>
      <AddChildDialog trigger={null} open={addOpen} onOpenChange={setAddOpen} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-9 cursor-pointer gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
            aria-label={`Viewing ${activeChild.fullName}. Change child`}
          >
            <UserRound className="text-muted-foreground h-3.5 w-3.5" />
            <span className="max-w-[10ch] truncate">{activeChild.fullName}</span>
            <ChevronDown className="text-muted-foreground h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
          <DropdownMenuLabel className="text-muted-foreground px-2 text-[10px] font-bold tracking-wider uppercase">
            Viewing
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {children.map((child) => {
            const isActive = child.studentProfileId === activeChild.studentProfileId;
            return (
              <DropdownMenuItem
                key={child.studentProfileId}
                onClick={() => select(child.studentProfileId)}
                className="cursor-pointer rounded-xl p-2 text-xs font-semibold"
              >
                <span className="flex-1 truncate">{child.fullName}</span>
                {isActive && <Check className="text-success h-3.5 w-3.5" />}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          {/*
          Opens the dialog through state rather than wrapping this item in a
          DialogTrigger: the menu unmounts its items as it closes, which would
          tear the dialog down in the same tick it opened.
        */}
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setAddOpen(true);
            }}
            className="cursor-pointer rounded-xl p-2 text-xs font-semibold"
          >
            <UserPlus className="text-muted-foreground h-3.5 w-3.5" />
            <span className="flex-1">Add a child</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
