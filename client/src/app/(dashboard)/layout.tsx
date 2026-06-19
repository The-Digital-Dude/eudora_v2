"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";
import { Button } from "@/components/ui/button";
import { useGetCampusesQuery } from "@/features/dashboard/dashboardApi";

// New dashboard layout elements
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeCustomizer, ThemeCustomizerTrigger } from "@/components/theme-customizer";
import { useSidebarConfig } from "@/hooks/use-sidebar-config";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  // Check auth and roles
  const hasAdminRole = React.useMemo(() => {
    if (!user) return false;
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
      dispatch(logout());
      router.push("/login");
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-zinc-950 p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Loader2 className="w-8 h-8 text-neutral-900 dark:text-neutral-50 animate-spin" />
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-zinc-950 p-6">
        <div className="bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-6">
          <div className="mx-auto w-12 h-12 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-2xl flex items-center justify-center text-rose-500">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 font-display">Access Denied</h1>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              This dashboard is only accessible to system administrators. Please contact your administrator if you believe this is an error.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="w-full rounded-xl text-xs font-semibold h-11 cursor-pointer"
            >
              Go to Home Page
            </Button>
            <Button
              onClick={handleLogout}
              className="w-full bg-neutral-900 dark:bg-zinc-100 hover:bg-neutral-800 dark:hover:bg-zinc-200 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold h-11 cursor-pointer"
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
      <div className="flex flex-1 flex-col min-h-[calc(100vh-var(--header-height)-75px)]">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-6 md:gap-6 max-w-7xl w-full mx-auto px-4 lg:px-6">
            {children}
          </div>
        </div>
      </div>
      <SiteFooter />
    </SidebarInset>
  );

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "16rem",
        "--sidebar-width-icon": "3rem",
        "--header-height": "3.5rem",
      } as React.CSSProperties}
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
      <ThemeCustomizer
        open={themeCustomizerOpen}
        onOpenChange={setThemeCustomizerOpen}
      />
    </SidebarProvider>
  );
}
