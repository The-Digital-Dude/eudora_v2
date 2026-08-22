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

/**
 * SUPER_ADMIN always passes permission checks, matching the backend RolesGuard/PermissionsGuard
 * bypass. `roles` requirements are exempt: they name their intended audience explicitly (admin
 * screens spread ADMIN_ROLES in), so a blanket bypass would defeat lists that deliberately
 * exclude admins, like the parent/student/teacher portals.
 */
export function hasAccess(user: AuthUser | null | undefined, requirement: NavRequirement): boolean {
  const roles = getUserRoles(user);
  if (roles.length === 0) return false;
  // Old blanket bypass — restore this instead of the line below to make SUPER_ADMIN pass every requirement again.
  // if (roles.includes("SUPER_ADMIN")) return true;
  if (requirement.type !== "roles" && roles.includes("SUPER_ADMIN")) return true;

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

export type PrimaryRole = "ADMIN" | "TEACHER" | "GUARDIAN" | "STUDENT";

/**
 * The role that decides which experience shell a user gets. Admin outranks
 * teacher outranks guardian; plain USER means student.
 */
export function getPrimaryRole(user: AuthUser | null | undefined): PrimaryRole {
  const roles = getUserRoles(user);
  if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN")) return "ADMIN";
  if (roles.includes("TEACHER")) return "TEACHER";
  if (roles.includes("GUARDIAN")) return "GUARDIAN";
  return "STUDENT";
}

/** Where each role lands after login and where the sidebar logo links to. */
export function getRoleHome(user: AuthUser | null | undefined): string {
  switch (getPrimaryRole(user)) {
    case "ADMIN":
      return "/dashboard";
    case "TEACHER":
      return "/teacher";
    case "GUARDIAN":
      return "/parent";
    default:
      return "/student";
  }
}
