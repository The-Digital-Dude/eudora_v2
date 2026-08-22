"use client";

import { Command as CommandPrimitive } from "cmdk";
import { type LucideIcon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { navGroups, navTitle } from "@/config/nav-config";
import { type AuthUser, getPrimaryRole, hasAccess } from "@/lib/access-control";
import { cn } from "@/lib/utils";

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-xl bg-card text-card-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Input
    ref={ref}
    className={cn(
      "mb-4 flex h-12 w-full border-b border-none border-border bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-muted-foreground",
      className,
    )}
    {...props}
  />
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn("max-h-[400px] overflow-x-hidden overflow-y-auto pb-2", className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="flex h-12 items-center justify-center text-sm text-muted-foreground"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      "overflow-hidden px-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&:not(:first-child)]:mt-2",
      className,
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex h-12 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm text-foreground transition-colors outline-none select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&+[cmdk-item]]:mt-1",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

interface SearchItem {
  title: string;
  url: string;
  group: string;
  icon?: LucideIcon;
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AuthUser | null | undefined;
}

export function CommandSearch({ open, onOpenChange, user }: CommandSearchProps) {
  const router = useRouter();
  const commandRef = React.useRef<HTMLDivElement>(null);

  // Derived from nav-config, not hand-listed. The hand-written list this
  // replaced had drifted into offering three routes that no longer exist
  // (/classes, /campuses, /plans) and titles that no screen used any more.
  const groupedItems = React.useMemo(() => {
    const role = getPrimaryRole(user);
    return navGroups.reduce(
      (acc, group) => {
        const items = group.items
          .filter((leaf) => !leaf.hidden && !leaf.disabled && hasAccess(user, leaf.requirement))
          .map<SearchItem>((leaf) => ({
            title: navTitle(leaf, role),
            url: leaf.url,
            group: group.label,
            icon: leaf.icon,
          }));
        if (items.length > 0) acc[group.label] = items;
        return acc;
      },
      {} as Record<string, SearchItem[]>,
    );
  }, [user]);

  const handleSelect = (url: string) => {
    router.push(url);
    onOpenChange(false);
    // Bounce effect like Vercel
    if (commandRef.current) {
      commandRef.current.style.transform = "scale(0.96)";
      setTimeout(() => {
        if (commandRef.current) {
          commandRef.current.style.transform = "";
        }
      }, 100);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] overflow-hidden border border-border p-0 shadow-2xl">
        <DialogTitle className="sr-only">Command Search</DialogTitle>
        <Command ref={commandRef} className="transition-transform duration-100 ease-out">
          <CommandInput
            placeholder="Search pages (e.g. Students, Attendance, Batches)..."
            autoFocus
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {Object.entries(groupedItems).map(([group, items]) => (
              <CommandGroup key={group} heading={group}>
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.url}
                      value={item.title}
                      onSelect={() => handleSelect(item.url)}
                    >
                      {Icon && <Icon className="mr-2 h-4 w-4" />}
                      {item.title}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground text-muted-foreground relative inline-flex h-8 w-full items-center justify-start gap-2 rounded-md border px-3 py-1 text-sm font-medium whitespace-nowrap shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:pr-12 md:w-36 lg:w-56"
    >
      <Search className="mr-2 h-3.5 w-3.5" />
      <span className="hidden lg:inline-flex">Search pages...</span>
      <span className="inline-flex lg:hidden">Search pages...</span>
      <kbd className="bg-muted pointer-events-none absolute top-1.5 right-1.5 hidden h-4 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
