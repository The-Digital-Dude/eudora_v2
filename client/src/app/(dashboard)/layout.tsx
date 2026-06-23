"use client";

import { Loader2, ShieldAlert } from "lucide-react";
import { usePathname,useRouter } from "next/navigation";
import React, { useState } from "react";

// New dashboard layout elements
import { AppSidebar } from "@/components/app-sidebar";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeCustomizer, ThemeCustomizerTrigger } from "@/components/theme-customizer";
import { Button } from "@/components/ui/button";
import { SidebarInset,SidebarProvider } from "@/components/ui/sidebar";
import { useLogoutMutation } from "@/features/auth/authApi";
import { logout } from "@/features/auth/authSlice";
import { useGetCampusesQuery } from "@/features/dashboard/dashboardApi";
import { useSidebarConfig } from "@/hooks/use-sidebar-config";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isAuthenticated = auth.isAuthenticated;
  const [logoutMutation] = useLogoutMutation();

  const { data: campusesData } = useGetCampusesQuery();
  const [selectedCampusId, setSelectedCampusId] = useState<string>("all");

  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const { config } = useSidebarConfig();

  const pathname = usePathname();

  // Normalize user roles
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

  // Check auth and roles
  const hasAuthorizedRole = React.useMemo(() => {
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "TEACHER", "USER", "GUARDIAN"];
    return userRoles.some((role) => allowedRoles.includes(role));
  }, [userRoles]);

  const isRouteAuthorized = React.useMemo(() => {
    if (userRoles.includes("SUPER_ADMIN") || userRoles.includes("ADMIN")) {
      return true;
    }

    const adminOnlyRoutes = [
      "/users",
      "/campuses",
      "/plans",
      "/leads",
      "/teachers",
      "/communication",
    ];

    const isSensitive = adminOnlyRoutes.some((route) => pathname.startsWith(route));

    if (isSensitive) {
      return false;
    }

    const teacherOnlyRoutes = ["/classes", "/diagnostics", "/lessons", "/questions", "/assessments", "/teacher"];
    const studentOnlyRoutes = ["/learn", "/student"];
    const guardianOnlyRoutes = ["/parent"];

    if (teacherOnlyRoutes.some((route) => pathname.startsWith(route))) {
      return userRoles.includes("TEACHER");
    }

    if (studentOnlyRoutes.some((route) => pathname.startsWith(route))) {
      return userRoles.includes("USER") || userRoles.includes("TEACHER");
    }

    if (guardianOnlyRoutes.some((route) => pathname.startsWith(route))) {
      return userRoles.includes("GUARDIAN");
    }

    return true;
  }, [pathname, userRoles]);

  const handleLogout = async () => {
    try {
      await logoutMutation().unwrap();
      dispatch(logout());
      router.push("/login");
    } catch (err) {
      dispatch(logout());
      router.push("/login");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-4 dark:bg-zinc-950">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-900 dark:text-neutral-50" />
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  if (!hasAuthorizedRole || !isRouteAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 dark:bg-zinc-950">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-100 bg-rose-50 text-rose-500 dark:border-rose-900/50 dark:bg-rose-950/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold text-neutral-900 dark:text-neutral-50">
              Access Denied
            </h1>
            <p className="text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">
              You do not have permission to access this page. Please contact your administrator if
              you believe this is an error.
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="h-11 w-full cursor-pointer rounded-xl text-xs font-semibold"
            >
              Go to Home Page
            </Button>
            <Button
              onClick={handleLogout}
              className="h-11 w-full cursor-pointer rounded-xl bg-neutral-900 text-xs font-semibold text-white hover:bg-neutral-800 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <AppSidebar
      user={user}
      variant={config.variant}
      collapsible={config.collapsible}
      side={config.side}
    />
  );

  const innerContent = (
    <SidebarInset>
      <SiteHeader
        selectedCampusId={selectedCampusId}
        setSelectedCampusId={setSelectedCampusId}
        campuses={campusesData?.items || []}
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex min-h-[calc(100vh-var(--header-height)-75px)] flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-2">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:gap-6 lg:px-6">
            {children}
          </div>
        </div>
      </div>
      <SiteFooter />
    </SidebarInset>
  );

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
          "--header-height": "3.5rem",
        } as React.CSSProperties
      }
      className={config.collapsible === "none" ? "sidebar-none-mode" : ""}
    >
      {config.side === "left" ? (
        <>
          {sidebarContent}
          {innerContent}
        </>
      ) : (
        <>
          {innerContent}
          {sidebarContent}
        </>
      )}

      {/* Theme Customizer Controls */}
      <ThemeCustomizerTrigger onClick={() => setThemeCustomizerOpen(true)} />
      <ThemeCustomizer open={themeCustomizerOpen} onOpenChange={setThemeCustomizerOpen} />
    </SidebarProvider>
  );
}
