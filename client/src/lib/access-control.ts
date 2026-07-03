export interface AuthPermission {
  action: string;
  subject: string;
}

export interface AuthUser {
  role?: string;
  roles?: unknown[];
  permissions?: AuthPermission[];
}

export type NavRequirement =
  // Any authenticated user with at least one recognized role.
  | { type: "always" }
  // Matches a specific action+subject permission granted to the user's role(s).
  | { type: "permission"; action: string; subject: string }
  // Fallback for pages that don't map to a single CRUD subject (portals, admin screens
  // shared by low-level permissions that shouldn't imply access on their own).
  | { type: "roles"; roles: string[] };

/** Normalizes the many shapes `user.roles`/`user.role` can arrive in (string, {name}, {role:{name}}). */
export function getUserRoles(user: AuthUser | null | undefined): string[] {
  if (!user) return [];
  const rolesList: string[] = [];
  if (user.role) rolesList.push(user.role);
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r: any) => {
      if (typeof r === "string") rolesList.push(r);
      else if (r && typeof r === "object") {
        if (r.name) rolesList.push(r.name);
        else if (r.role?.name) rolesList.push(r.role.name);
      }
    });
  }
  return rolesList;
}

export function getUserPermissions(user: AuthUser | null | undefined): AuthPermission[] {
  return Array.isArray(user?.permissions) ? user!.permissions! : [];
}

/** SUPER_ADMIN always passes, matching the backend RolesGuard/PermissionsGuard bypass. */
export function hasAccess(user: AuthUser | null | undefined, requirement: NavRequirement): boolean {
  const roles = getUserRoles(user);
  if (roles.includes("SUPER_ADMIN")) return true;
  if (roles.length === 0) return false;

  switch (requirement.type) {
    case "always":
      return true;
    case "roles":
      return requirement.roles.some((role) => roles.includes(role));
    case "permission": {
      const permissions = getUserPermissions(user);
      return permissions.some(
        (p) => p.action === requirement.action && p.subject === requirement.subject,
      );
    }
  }
}
