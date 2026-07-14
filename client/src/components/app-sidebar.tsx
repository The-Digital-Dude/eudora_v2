"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { getRoleHome, getShellBrand, hasAccess } from "@/lib/access-control";
import { isNavParent,type NavGroup, navGroups } from "@/config/nav-config";

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

  const displayName =
    user.name || [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
  const userInitials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const filteredNavGroups = React.useMemo<NavGroup[]>(() => {
    return navGroups
      .map((group) => {
        const items = group.items
          .map((item) => {
            if (isNavParent(item)) {
              const children = item.children.filter((child) => hasAccess(user, child.requirement));
              return children.length > 0 ? { ...item, children } : null;
            }
            return hasAccess(user, item.requirement) ? item : null;
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [user]);

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-sidebar-border/50 border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={getRoleHome(user)}>
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Logo size={18} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-xs leading-tight">
                  <span className="truncate font-bold text-sidebar-foreground">
                    {getShellBrand(user).title}
                  </span>
                  <span className="truncate text-[10px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
                    {getShellBrand(user).subtitle}
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
            <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-bold tracking-wider text-sidebar-foreground/50 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  if (isNavParent(item)) {
                    const isChildActive = item.children.some((child) => pathname === child.url);
                    const Icon = item.icon;
                    return (
                      <Collapsible key={item.title} defaultOpen={isChildActive} className="group/collapsible">
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.title}
                              className={`w-full rounded-xl transition-all duration-200 ${
                                isChildActive
                                  ? "font-bold text-sidebar-foreground"
                                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="text-xs font-semibold">{item.title}</span>
                              <ChevronRight className="ml-auto h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => {
                                const isActive = pathname === child.url;
                                const ChildIcon = child.icon;
                                return (
                                  <SidebarMenuSubItem key={child.title}>
                                    {child.disabled ? (
                                      <span className="flex h-7 min-w-0 cursor-not-allowed items-center gap-2 rounded-md px-2 text-xs text-sidebar-foreground/40">
                                        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{child.title}</span>
                                        <Badge
                                          variant="outline"
                                          className="ml-auto px-1.5 py-0 text-[9px] font-semibold tracking-wider uppercase"
                                        >
                                          Soon
                                        </Badge>
                                      </span>
                                    ) : (
                                      <SidebarMenuSubButton asChild isActive={isActive}>
                                        <Link href={child.url} aria-current={isActive ? "page" : undefined}>
                                          <ChildIcon className="h-3.5 w-3.5" />
                                          <span>{child.title}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    )}
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

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
                            ? "bg-sidebar-primary font-bold text-sidebar-primary-foreground shadow-sm"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Link
                          href={item.url}
                          className="flex items-center gap-3"
                          aria-current={isActive ? "page" : undefined}
                        >
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
