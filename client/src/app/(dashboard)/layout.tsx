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
import { flattenNavLeaves } from "@/config/nav-config";
import { useLogoutMutation } from "@/features/auth/authApi";
import { logout } from "@/features/auth/authSlice";
import { useGetCampusesQuery } from "@/features/dashboard/dashboardApi";
import { useSidebarConfig } from "@/hooks/use-sidebar-config";
import { getUserRoles,hasAccess } from "@/lib/access-control";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const AUTHORIZED_ROLES = ["SUPER_ADMIN", "ADMIN", "TEACHER", "USER", "GUARDIAN"];

// Leaves sorted longest-url-first so a more specific route (e.g. /users/roles)
// is matched before a shorter sibling prefix (e.g. /users).
const navLeavesByUrlLength = flattenNavLeaves().sort((a, b) => b.url.length - a.url.length);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const auth = useAppSelector((state) => state.auth);
  const user = auth.user as any;
  const isAuthenticated = auth.isAuthenticated;
  const [logoutMutation] = useLogoutMutation();

  const userRolesForQueries = getUserRoles(user);
  const isAdminUser =
    userRolesForQueries.includes("ADMIN") || userRolesForQueries.includes("SUPER_ADMIN");
  // Campus scope is an admin concept — don't fire the query (403s) for other roles.
  const { data: campusesData } = useGetCampusesQuery(undefined, { skip: !isAdminUser });
  const [selectedCampusId, setSelectedCampusId] = useState<string>("all");

  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const { config } = useSidebarConfig();

  const pathname = usePathname();

  const userRoles = React.useMemo<string[]>(() => getUserRoles(user), [user]);

  const hasAuthorizedRole = React.useMemo(
    () => userRoles.some((role) => AUTHORIZED_ROLES.includes(role)),
    [userRoles],
  );

  // Derived from the same nav-config tree that drives the sidebar, so a route's
  // access requirement can never drift from what's shown as a menu item for it.
  const isRouteAuthorized = React.useMemo(() => {
    const matchedLeaf = navLeavesByUrlLength.find(
      (leaf) => pathname === leaf.url || pathname.startsWith(`${leaf.url}/`),
    );
    // Routes with no nav entry default to "any authenticated role", same as before.
    if (!matchedLeaf) return true;
    return hasAccess(user, matchedLeaf.requirement);
  }, [pathname, user]);

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Checking your session...
          </p>
        </div>
      </div>
    );
  }

  if (!hasAuthorizedRole || !isRouteAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-xl font-bold text-card-foreground">
              Access Denied
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
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
              className="h-11 w-full cursor-pointer rounded-xl text-xs font-semibold"
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
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-[calc(100vh-var(--header-height)-75px)] flex-1 flex-col outline-none"
      >
        <div className="flex flex-1 flex-col gap-2">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:gap-6 lg:px-6">
            {children}
          </div>
        </div>
      </main>
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
      {/* Skip to main content — screen reader + keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground focus:outline-none"
      >
        Skip to content
      </a>
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
