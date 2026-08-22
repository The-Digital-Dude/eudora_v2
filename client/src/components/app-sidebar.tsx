"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
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
import { homeLeaf, type NavGroup, navGroups, navTitle } from "@/config/nav-config";
import { getPrimaryRole, getRoleHome, hasAccess } from "@/lib/access-control";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    roles?: string[];
    role?: string;
    permissions?: { action: string; subject: string }[];
  };
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {
  const pathname = usePathname();
  const primaryRole = getPrimaryRole(user);
  const roleHome = getRoleHome(user);

  const displayName =
    user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // One flat list per group. The first group is unlabelled and holds only Home,
  // which replaced the four separate portal entries (Overview / Parent / Student
  // / Teacher Portal) that all meant "your landing page".
  const filteredNavGroups = React.useMemo<NavGroup[]>(() => {
    const home: NavGroup = { label: "", items: [homeLeaf(roleHome)] };
    const groups = navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.hidden && hasAccess(user, item.requirement)),
      }))
      .filter((group) => group.items.length > 0);
    return [home, ...groups];
  }, [user, roleHome]);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border/50 border-b p-0">
        <Link
          href={roleHome}
          className="flex items-center justify-center py-3 group-data-[collapsible=icon]:py-3"
        >
          {/* Icon-only mark, shown when the sidebar is collapsed to icon width */}
          <div className="hidden aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground group-data-[collapsible=icon]:flex">
            <Logo size={18} className="text-current" />
          </div>
          {/* Full-width wordmark, shown when the sidebar is expanded — spans the panel width, with a cap so it doesn't dominate the header */}
          <Image
            src="/landing/eudora_logo.png"
            alt="Eudora"
            width={218}
            height={72}
            className="h-auto w-full max-w-[130px] group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {filteredNavGroups.map((group) => (
          <SidebarGroup key={group.label || "home"}>
            {group.label && (
              <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-bold tracking-wider text-sidebar-foreground/50 uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const title = navTitle(item, primaryRole);
                  const isActive = pathname === item.url;
                  const Icon = item.icon;

                  if (item.disabled) {
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          tooltip={title}
                          aria-disabled
                          className="w-full cursor-not-allowed rounded-xl text-sidebar-foreground/40"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate text-xs font-semibold">{title}</span>
                          <Badge
                            variant="outline"
                            className="ml-auto px-1.5 py-0 text-[9px] font-semibold tracking-wider uppercase"
                          >
                            Soon
                          </Badge>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={title}
                        className={`w-full rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-primary font-bold text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        } ${item.highlight && !isActive ? "nav-pulse" : ""}`}
                      >
                        <Link
                          href={item.url}
                          className="flex items-center gap-3"
                          aria-current={isActive ? "page" : undefined}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="truncate text-xs font-semibold">{title}</span>
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
          <div className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            {userInitials}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-[10px] text-sidebar-foreground/50">{user.email}</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
