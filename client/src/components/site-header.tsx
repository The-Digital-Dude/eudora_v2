"use client"

import * as React from "react"
import { Globe, LogOut, Sparkles, Bell, Check, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandSearch, SearchTrigger } from "@/components/command-search"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  useGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
} from "@/features/dashboard/dashboardApi"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SiteHeaderProps {
  selectedCampusId: string
  setSelectedCampusId: (id: string) => void
  campuses: any[]
  user: any
  onLogout: () => void
}

export function SiteHeader({
  selectedCampusId,
  setSelectedCampusId,
  campuses = [],
  user,
  onLogout,
}: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = React.useState(false)
  const { data: notifications = [] } = useGetNotificationsQuery()
  const { data: unreadData } = useGetUnreadNotificationsCountQuery()
  const [markAsRead] = useMarkNotificationAsReadMutation()
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation()
  const [deleteNotification] = useDeleteNotificationMutation()

  const unreadCount = unreadData?.count ?? 0

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A"

  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="flex w-full items-center gap-2 px-4 py-3 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          
          {/* Global Campus Scope Selector */}
          <div className="flex items-center gap-1.5 mr-2">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="text-[11px] font-semibold h-8 px-2 border border-neutral-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-neutral-700 dark:text-neutral-300 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-xs hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors"
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
            className="mx-2 data-[orientation=vertical]:h-4 hidden md:block"
          />

          <div className="flex-1 max-w-xs hidden sm:block">
            <SearchTrigger onClick={() => setSearchOpen(true)} />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ModeToggle variant="ghost" />

            {/* Notifications Bell */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="relative p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 rounded-full hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer outline-none">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-950">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 rounded-2xl p-2 shadow-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 z-50">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <DropdownMenuLabel className="font-display text-xs text-neutral-500">
                    Notifications
                  </DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="text-[10px] font-semibold text-neutral-900 dark:text-neutral-100 hover:underline cursor-pointer"
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
                        className={`flex gap-2 p-2 rounded-xl text-left border-b border-neutral-50 dark:border-zinc-900 last:border-0 hover:bg-neutral-50 dark:hover:bg-zinc-900 transition-colors group ${
                          !n.readAt ? "bg-blue-50/30 dark:bg-blue-950/10" : ""
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 justify-between">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${
                              n.type === "WARNING" ? "text-amber-600 dark:text-amber-500" :
                              n.type === "SYSTEM" ? "text-purple-600 dark:text-purple-500" :
                              "text-blue-600 dark:text-blue-500"
                            }`}>
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
                          <p className={`text-xs font-semibold mt-0.5 ${!n.readAt ? "text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"}`}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.readAt && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              title="Mark as read"
                              className="p-1 rounded-md text-neutral-400 hover:text-blue-500 hover:bg-white dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(n.id)}
                            title="Delete"
                            className="p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-white dark:hover:bg-zinc-800 shadow-xs cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator
              orientation="vertical"
              className="mx-1 data-[orientation=vertical]:h-4"
            />

            {/* User Dropdown */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-90 outline-none select-none cursor-pointer">
                    <Avatar className="w-8 h-8 border border-neutral-200 dark:border-zinc-800 shadow-xs">
                      <AvatarFallback className="bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold font-display">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left max-w-[120px]">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user.name}</p>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{user.email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-lg border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <DropdownMenuLabel className="font-display px-2 py-1.5 text-xs text-neutral-500">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-neutral-100 dark:bg-zinc-800" />
                  <DropdownMenuItem className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-zinc-900 rounded-xl p-2 cursor-pointer">
                    {user.name} ({user.role || "Admin"})
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-zinc-900 rounded-xl p-2">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-neutral-100 dark:bg-zinc-800" />
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl p-2 cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
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
  )
}
