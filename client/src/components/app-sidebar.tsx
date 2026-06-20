"use client"

import * as React from "react"
import {
  LayoutDashboard,
  GraduationCap,
  BookOpen,
  UserCheck,
  CalendarDays,
  ClipboardList,
  PenTool,
  School,
  Users,
  Users2,
  CreditCard,
  MessageSquare,
  Settings
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Logo } from "@/components/logo"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent
} from "@/components/ui/sidebar"

// Navigation items configured for Eudora Admin
const data = {
  navGroups: [
    {
      label: "Academics",
      items: [
        {
          title: "Overview",
          url: "/dashboard",
          icon: LayoutDashboard,
        },
        {
          title: "Active Learning",
          url: "/learn",
          icon: BookOpen,
        },
        {
          title: "Lesson Authoring",
          url: "/lessons",
          icon: PenTool,
        },
        {
          title: "Diagnostics",
          url: "/diagnostics",
          icon: ClipboardList,
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          title: "Leads & Enrolments",
          url: "/leads",
          icon: UserCheck,
        },
        {
          title: "Student Roster",
          url: "/students",
          icon: GraduationCap,
        },
        {
          title: "Teachers",
          url: "/teachers",
          icon: Users2,
        },
        {
          title: "Classes & Attendance",
          url: "/classes",
          icon: CalendarDays,
        },
        {
          title: "Campuses & Programs",
          url: "/campuses",
          icon: School,
        },
        {
          title: "Users & Roles",
          url: "/users",
          icon: Users,
        },
      ],
    },
    {
      label: "Operations",
      items: [
        {
          title: "Communication",
          url: "/communication",
          icon: MessageSquare,
        },
        {
          title: "Billing & Plans",
          url: "/plans",
          icon: CreditCard,
        },
      ],
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string
    email: string
  }
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A"

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-sidebar-border/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Logo size={18} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-bold text-neutral-900 dark:text-neutral-50">Eudora Admin</span>
                  <span className="truncate text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Console</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {data.navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url
                  const Icon = item.icon
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`w-full rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-950 font-bold"
                            : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <Icon className="w-4 h-4" />
                          <span className="text-xs font-semibold">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-bold font-display text-xs flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">{user.name}</p>
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 truncate">{user.email}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
