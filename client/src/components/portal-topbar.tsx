"use client";

import { Bell, Check, LogOut, Menu, Trash } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { browseCoursesLink, navGroups, navTitle } from "@/config/nav-config";
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/features/dashboard/dashboardApi";
import { getPrimaryRole, getRoleHome, hasAccess } from "@/lib/access-control";

import { ChildSwitcher } from "./child-switcher";

interface PortalTopbarProps {
  user: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    roles?: string[];
    role?: string;
    permissions?: { action: string; subject: string }[];
  };
  onLogout: () => void;
}

// The handful of extra pages Guardian/Student can reach beyond their own
// portal home — Attendance/Homework/Report Card (+ Lesson Library for
// students). Filtered live from nav-config.ts so this never drifts out of
// sync with what AppSidebar shows admins/teachers for the same permissions.
// Reads `navGroups` rather than `flattenNavLeaves()`, which also carries the
// role landing pages that exist only for the route guard.
function usePortalNavLinks(user: PortalTopbarProps["user"]) {
  const homeUrl = getRoleHome(user);
  return React.useMemo(
    () =>
      navGroups
        .flatMap((group) => group.items)
        .filter((leaf) => !leaf.hidden && leaf.url !== homeUrl && hasAccess(user, leaf.requirement)),
    [user, homeUrl],
  );
}

export function PortalTopbar({ user, onLogout }: PortalTopbarProps) {
  const pathname = usePathname();
  const navLinks = usePortalNavLinks(user);
  const primaryRole = getPrimaryRole(user);
  // Students reach content through their own profile and have no children to
  // switch between, so the picker (and its /parent/children fetch) is
  // guardian-only.
  const isGuardian = primaryRole === "GUARDIAN";
  const canBrowse = hasAccess(user, browseCoursesLink.requirement);
  const BrowseIcon = browseCoursesLink.icon;

  const { data: notifications = [] } = useGetNotificationsQuery();
  const { data: unreadData } = useGetUnreadNotificationsCountQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();
  const unreadCount = unreadData?.count ?? 0;

  const displayName =
    user?.name ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "";
  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 select-none">
        {/* Logo — same treatment as the marketing navbar */}
        <Link href={getRoleHome(user)} className="group flex items-center">
          <Image
            src="/landing/eudora_logo.png"
            alt="Eudora"
            width={218}
            height={72}
            priority
            className="h-9 w-auto transition-transform group-hover:scale-105"
          />
        </Link>

        <div className="flex items-center gap-2">
          {/* The buy path. A guardian who has already paid once is the cheapest
              customer to sell to again, and until now /explore was only
              reachable from a panel part-way down the parent portal — so this
              is a persistent header link, not a hamburger item. */}
          {canBrowse && (
            <Button
              asChild
              variant="outline"
              className="h-9 cursor-pointer rounded-xl px-3 text-xs font-semibold"
            >
              <Link
                href={browseCoursesLink.url}
                aria-current={pathname === browseCoursesLink.url ? "page" : undefined}
              >
                <BrowseIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{browseCoursesLink.title}</span>
              </Link>
            </Button>
          )}

          {/* Which child the session is scoped to. Self-hiding for guardians
              with one child, and absent entirely for students. */}
          {isGuardian && <ChildSwitcher />}

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative cursor-pointer"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 w-80 rounded-2xl p-2">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="font-display text-xs text-muted-foreground">
                  Notifications
                </DropdownMenuLabel>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="cursor-pointer text-[10px] font-semibold text-foreground hover:underline"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No notifications</div>
                ) : (
                  (notifications as any[]).map((n) => (
                    <div
                      key={n.id}
                      className={`group flex gap-2 rounded-xl border-b border-border/50 p-2 text-left transition-colors last:border-0 hover:bg-accent ${
                        !n.readAt ? "bg-primary/5" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`text-[9px] font-bold tracking-wider uppercase ${
                              n.type === "WARNING" ? "text-warning" : "text-primary"
                            }`}
                          >
                            {n.type}
                          </span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(n.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 text-xs font-semibold ${!n.readAt ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {n.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
                      </div>
                      <div className="flex flex-col items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {!n.readAt && (
                          <button
                            onClick={() => markAsRead(n.id)}
                            aria-label="Mark as read"
                            className="cursor-pointer rounded-md p-1 text-muted-foreground shadow-xs hover:bg-background hover:text-primary"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(n.id)}
                          aria-label="Delete notification"
                          className="cursor-pointer rounded-md p-1 text-muted-foreground shadow-xs hover:bg-background hover:text-destructive"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hamburger — nav links + account + sign out, all in one place */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="cursor-pointer" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2">
              <div className="flex items-center gap-2 px-2 py-1.5">
                <Avatar className="h-8 w-8 border border-border shadow-xs">
                  <AvatarFallback className="font-display bg-foreground text-xs font-bold text-background">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {navLinks.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  {navLinks.map((leaf) => {
                    const Icon = leaf.icon;
                    const isActive = pathname === leaf.url;
                    return (
                      <DropdownMenuItem key={leaf.url} asChild className="rounded-xl p-2 text-xs font-semibold">
                        <Link
                          href={leaf.url}
                          aria-current={isActive ? "page" : undefined}
                          className={isActive ? "flex items-center gap-2 text-foreground" : "flex items-center gap-2"}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {navTitle(leaf, primaryRole)}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-xs font-semibold text-destructive focus:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
