"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  School,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Loader2,
  UserCheck,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  Globe
} from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";
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
import { useGetCampusesQuery } from "@/features/dashboard/dashboardApi";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
}

function SidebarItem({ href, icon, label, active, collapsed }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative select-none ${
        active
          ? "bg-neutral-900 text-white shadow-sm"
          : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100"
      }`}
    >
      <div className="flex-shrink-0">{icon}</div>
      {!collapsed && (
        <span className="text-[11px] font-bold tracking-wide transition-opacity duration-300">
          {label}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-14 hidden group-hover:block bg-neutral-900 text-white text-[10px] font-semibold px-2 py-1.5 rounded-md shadow-md z-50 whitespace-nowrap">
          {label}
        </div>
      )}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  
  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isAuthenticated = auth.isAuthenticated;
  const [logoutMutation] = useLogoutMutation();

  const { data: campusesData } = useGetCampusesQuery();
  const [selectedCampusId, setSelectedCampusId] = useState<string>("all");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check auth and roles
  const hasAdminRole = React.useMemo(() => {
    if (!user) return false;
    // The user model may have user.roles which is an array, or user.role
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") return true;
    if (Array.isArray(user.roles)) {
      return user.roles.some(
        (r: any) =>
          r === "ADMIN" ||
          r === "SUPER_ADMIN" ||
          r.name === "ADMIN" ||
          r.name === "SUPER_ADMIN" ||
          r.role?.name === "ADMIN" ||
          r.role?.name === "SUPER_ADMIN"
      );
    }
    return false;
  }, [user]);

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
      dispatch(logout());
      router.push("/login");
    } catch (err) {
      // fallback logout
      dispatch(logout());
      router.push("/login");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
          <p className="text-sm font-medium text-neutral-500">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 p-6">
        <div className="bg-white border border-neutral-200 rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-neutral-900 font-display">Access Denied</h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              This dashboard is only accessible to system administrators. Please contact your administrator if you believe this is an error.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full rounded-xl text-xs font-semibold h-11"
            >
              Go to Home Page
            </Button>
            <Button
              onClick={handleLogout}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold h-11"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      href: "/dashboard",
      icon: <LayoutDashboard className="w-3.5 h-3.5" />,
      label: "Overview",
    },
    {
      href: "/dashboard/leads",
      icon: <UserCheck className="w-3.5 h-3.5" />,
      label: "Leads & Enrolments",
    },
    {
      href: "/dashboard/classes",
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: "Classes & Attendance",
    },
    {
      href: "/dashboard/diagnostics",
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      label: "Diagnostics",
    },
    {
      href: "/dashboard/communication",
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      label: "Communication",
    },
    {
      href: "/dashboard/campuses",
      icon: <School className="w-3.5 h-3.5" />,
      label: "Campuses & Programs",
    },
    {
      href: "/dashboard/users",
      icon: <Users className="w-3.5 h-3.5" />,
      label: "Users & Roles",
    },
    {
      href: "/dashboard/billing",
      icon: <CreditCard className="w-3.5 h-3.5" />,
      label: "Billing & Plans",
    },
  ];

  const userInitials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "A";

  return (
    <div className="min-h-screen bg-neutral-50/50 flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-neutral-200 bg-white/70 backdrop-blur-md transition-all duration-300 relative ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-100 justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="p-1.5 bg-neutral-900 text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold tracking-tight text-neutral-900 font-display text-sm">
                Eudora Admin
              </span>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        {/* Sidebar Collapse Toggle */}
        <div className="p-4 border-t border-neutral-100 flex justify-end">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg border border-neutral-200 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white z-50 border-r border-neutral-200 flex flex-col transform transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-neutral-100 justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setMobileMenuOpen(false)}>
            <div className="p-1.5 bg-neutral-900 text-white rounded-lg shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold tracking-tight text-neutral-900 font-display text-sm">
              Eudora Admin
            </span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={pathname === item.href}
              collapsed={false}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-neutral-200 bg-white/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-950 md:hidden hover:bg-neutral-50 transition-colors"
            >
              <Menu className="w-4 h-4" />
            </button>
            <h2 className="text-sm font-bold tracking-tight text-neutral-900 font-display">
              {navItems.find((item) => item.href === pathname)?.label || "Admin Console"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Campus/Centre Scope Selector */}
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-neutral-400" />
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="text-[11px] font-semibold h-9 px-3 border border-neutral-200 rounded-xl bg-white text-neutral-700 focus:outline-none focus:border-neutral-900 cursor-pointer shadow-sm hover:bg-neutral-50 transition-colors"
              >
                <option value="all">Global Scope (All Centres)</option>
                {campusesData?.items?.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    Centre: {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 hover:opacity-90 outline-none select-none">
                  <Avatar className="w-8 h-8 border border-neutral-200 shadow-sm">
                    <AvatarFallback className="bg-neutral-900 text-white text-xs font-bold font-display">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-neutral-900">{user.name}</p>
                    <p className="text-[10px] text-neutral-400 font-medium">{user.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-lg border border-neutral-200">
                <DropdownMenuLabel className="font-display px-2 py-1.5 text-xs text-neutral-500">
                  My Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-100" />
                <DropdownMenuItem className="text-xs font-semibold text-neutral-700 hover:bg-neutral-50 rounded-xl p-2 cursor-pointer">
                  {user.name} ({user.role || "Admin"})
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs font-medium text-neutral-500 hover:bg-neutral-50 rounded-xl p-2">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-100" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-xs font-semibold text-rose-500 hover:bg-rose-50 rounded-xl p-2 cursor-pointer flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
