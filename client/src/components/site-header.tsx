"use client";

import { Bell, Check, LogOut, Trash } from "lucide-react";
import * as React from "react";

import { CommandSearch, SearchTrigger } from "@/components/command-search";
import { ModeToggle } from "@/components/mode-toggle";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  useDeleteNotificationMutation,
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "@/features/dashboard/dashboardApi";
import { getPrimaryRole } from "@/lib/access-control";

interface SiteHeaderProps {
  user: {
    name?: string;
    email?: string;
    role?: string;
  };
  onLogout: () => void;
}

export function SiteHeader({ user, onLogout }: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isAdminShell = getPrimaryRole(user) === "ADMIN";
  const { data: notifications = [] } = useGetNotificationsQuery();
  const { data: unreadData } = useGetUnreadNotificationsCountQuery();
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const unreadCount = unreadData?.count ?? 0;

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const displayName =
    user?.name ||
    [(user as any)?.firstName, (user as any)?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "";
  const userInitials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <>
      <header
        data-slot="site-header"
        className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background/70 backdrop-blur-md transition-[width,height] ease-linear"
      >
        <div className="flex w-full items-center gap-2 px-4 py-3 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

          <Separator
            orientation="vertical"
            className="mx-2 hidden data-[orientation=vertical]:h-4 md:block"
          />

          <div className="hidden max-w-xs flex-1 sm:block">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ModeToggle variant="ghost" />

            {/* Notifications Bell */}
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
                    <div className="py-6 text-center text-xs text-muted-foreground">
                      No notifications
                    </div>
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
                                n.type === "WARNING"
                                  ? "text-warning"
                                  : n.type === "SYSTEM"
                                    ? "text-primary"
                                    : "text-primary"
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
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                            {n.body}
                          </p>
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

            <Separator orientation="vertical" className="mx-1 data-[orientation=vertical]:h-4" />

            {/* User Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex cursor-pointer items-center gap-2 px-2 select-none"
                    aria-label={`User menu for ${user.name ?? "account"}`}
                  >
                    <Avatar className="h-8 w-8 border border-border shadow-xs">
                      <AvatarFallback className="font-display bg-foreground text-xs font-bold text-background">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden max-w-[120px] text-left md:block">
                      <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                  <DropdownMenuLabel className="font-display px-2 py-1.5 text-xs text-muted-foreground">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer rounded-xl p-2 text-xs font-semibold">
                    {user.name} ({user.role || "Admin"})
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-xl p-2 text-xs font-medium text-muted-foreground">
                    {user.email}
                  </DropdownMenuItem>
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
            )}
          </div>
        </div>
      </header>
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
