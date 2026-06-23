"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  PenTool,
  School,
  Settings,
  UserCheck,
  Users,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "USER", "GUARDIAN"],
        },
        {
          title: "Timetable",
          url: "/timetable",
          icon: CalendarDays,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "USER", "GUARDIAN"],
        },
        {
          title: "Attendance",
          url: "/attendance",
          icon: UserCheck,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "GUARDIAN"],
        },
        {
          title: "Homework",
          url: "/homework",
          icon: PenTool,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "USER", "GUARDIAN"],
        },
        {
          title: "Gradebook",
          url: "/gradebook",
          icon: ClipboardList,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "USER", "GUARDIAN"],
        },
        {
          title: "Active Learning",
          url: "/learn",
          icon: BookOpen,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER", "USER"],
        },
        {
          title: "Lesson Authoring",
          url: "/lessons",
          icon: PenTool,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER"],
        },
        {
          title: "Diagnostics",
          url: "/diagnostics",
          icon: ClipboardList,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER"],
        },
        {
          title: "Question Bank",
          url: "/questions",
          icon: BookOpen,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER"],
        },
        {
          title: "Assessments",
          url: "/assessments",
          icon: ClipboardList,
          roles: ["ADMIN", "SUPER_ADMIN", "TEACHER"],
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
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
        {
          title: "Student Roster",
          url: "/students",
          icon: GraduationCap,
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
        {
          title: "Teachers",
          url: "/teachers",
          icon: Users2,
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
        {
          title: "Classes & Attendance",
          url: "/classes",
          icon: CalendarDays,
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
        {
          title: "Campuses & Programs",
          url: "/campuses",
          icon: School,
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
        {
          title: "Users & Roles",
          url: "/users",
          icon: Users,
          roles: ["ADMIN", "SUPER_ADMIN"],
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
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
        {
          title: "Billing & Plans",
          url: "/plans",
          icon: CreditCard,
          roles: ["ADMIN", "SUPER_ADMIN"],
        },
      ],
    },
  ],
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name: string;
    email: string;
    roles?: string[];
    role?: string;
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  // Extract roles
  const userRoles = React.useMemo<string[]>(() => {
    if (!user) return [];
    const rolesList: string[] = [];
    if (user.role) {
      rolesList.push(user.role);
    }
    if (Array.isArray(user.roles)) {
      user.roles.forEach((r: any) => {
        if (typeof r === "string") {
          rolesList.push(r);
        } else if (r && typeof r === "object") {
          if (r.name) rolesList.push(r.name);
          else if (r.role?.name) rolesList.push(r.role?.name);
        }
      });
    }
    return rolesList;
  }, [user]);

  const hasRole = (allowedRoles: string[]) => {
    return userRoles.some((role) => allowedRoles.includes(role));
  };

  const filteredNavGroups = React.useMemo(() => {
    return data.navGroups
      .map((group) => {
        const items = group.items.filter((item) => {
          if (!item.roles) return true;
          return hasRole(item.roles);
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [userRoles]);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border/50 border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Logo size={18} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-bold text-neutral-900 dark:text-neutral-50">
                    Eudora Admin
                  </span>
                  <span className="truncate text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Console
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {filteredNavGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="dark:text-neutral-505 mb-1 px-3 text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.url;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        className={`w-full rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-neutral-900 font-bold text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-950"
                            : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                        }`}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-semibold">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-sidebar-border/50 border-t p-4">
        <div className="flex items-center gap-3">
          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-xs font-bold text-white dark:bg-neutral-100 dark:text-neutral-900">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-semibold text-neutral-900 dark:text-neutral-100">
              {user.name}
            </p>
            <p className="truncate text-[10px] text-neutral-400 dark:text-neutral-500">
              {user.email}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
