"use client";

import { Bell, Check, Globe, LogOut, Sparkles, Trash } from "lucide-react";
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

interface SiteHeaderProps {
  selectedCampusId: string;
  setSelectedCampusId: (id: string) => void;
  campuses: any[];
  user: any;
  onLogout: () => void;
}

export function SiteHeader({
  selectedCampusId,
  setSelectedCampusId,
  campuses = [],
  user,
  onLogout,
}: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
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

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <>
      <header className="sticky top-0 z-40 flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-white/70 backdrop-blur-md transition-[width,height] ease-linear dark:bg-zinc-950/70">
        <div className="flex w-full items-center gap-2 px-4 py-3 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />

          {/* Global Campus Scope Selector */}
          <div className="mr-2 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-neutral-400" />
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="h-8 cursor-pointer rounded-xl border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700 shadow-xs transition-colors hover:bg-neutral-50 focus:border-neutral-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-neutral-300 dark:hover:bg-zinc-800"
            >
              <option value="all">Global Scope (All Centres)</option>
              {campuses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  Centre: {c.name}
                </option>
              ))}
            </select>
          </div>

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
                <button className="relative cursor-pointer rounded-full p-2 text-neutral-500 transition-colors outline-none hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-zinc-800 dark:hover:text-neutral-100">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-50 w-80 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuLabel className="font-display text-xs text-neutral-500">
                    Notifications
                  </DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="cursor-pointer text-[10px] font-semibold text-neutral-900 hover:underline dark:text-neutral-100"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator className="bg-neutral-100 dark:bg-zinc-800" />
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((n: any) => (
                      <div
                        key={n.id}
                        className={`group flex gap-2 rounded-xl border-b border-neutral-50 p-2 text-left transition-colors last:border-0 hover:bg-neutral-50 dark:border-zinc-900 dark:hover:bg-zinc-900 ${
                          !n.readAt ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`text-[9px] font-bold tracking-wider uppercase ${
                                n.type === "WARNING"
                                  ? "text-amber-600 dark:text-amber-500"
                                  : n.type === "SYSTEM"
                                    ? "text-purple-600 dark:text-purple-500"
                                    : "text-blue-600 dark:text-blue-500"
                              }`}
                            >
                              {n.type}
                            </span>
                            <span className="text-[9px] text-neutral-400">
                              {new Date(n.createdAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p
                            className={`mt-0.5 text-xs font-semibold ${!n.readAt ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500 dark:text-neutral-400">
                            {n.body}
                          </p>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!n.readAt && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              title="Mark as read"
                              className="cursor-pointer rounded-md p-1 text-neutral-400 shadow-xs hover:bg-white hover:text-blue-500 dark:hover:bg-zinc-800"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            title="Delete"
                            className="cursor-pointer rounded-md p-1 text-neutral-400 shadow-xs hover:bg-white hover:text-rose-500 dark:hover:bg-zinc-800"
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
                  <button className="flex cursor-pointer items-center gap-2 outline-none select-none hover:opacity-90">
                    <Avatar className="h-8 w-8 border border-neutral-200 shadow-xs dark:border-zinc-800">
                      <AvatarFallback className="font-display bg-neutral-900 text-xs font-bold text-white dark:bg-white dark:text-neutral-900">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden max-w-[120px] text-left md:block">
                      <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {user.name}
                      </p>
                      <p className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
                        {user.email}
                      </p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <DropdownMenuLabel className="font-display px-2 py-1.5 text-xs text-neutral-500">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-100 dark:bg-zinc-800" />
                  <DropdownMenuItem className="cursor-pointer rounded-xl p-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-zinc-900">
                    {user.name} ({user.role || "Admin"})
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-xl p-2 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-zinc-900">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-neutral-100 dark:bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="flex cursor-pointer items-center gap-2 rounded-xl p-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
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
