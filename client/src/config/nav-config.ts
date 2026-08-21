import {
  BookOpen,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Library,
  type LucideIcon,
  MessageSquare,
  NotebookPen,
  PencilRuler,
  Presentation,
  Radio,
  Route,
  School,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCog,
  UserPlus,
  Users2,
  UsersRound,
} from "lucide-react";

import type { NavRequirement } from "@/lib/access-control";

export interface NavLeaf {
  title: string;
  url: string;
  icon: LucideIcon;
  requirement: NavRequirement;
  /** Feature has no backing page/API yet — shown greyed out with a "Soon" badge, not linked. */
  disabled?: boolean;
  /**
   * Descoped pending redesign: kept in this config (so the route guard still matches the URL and
   * denies it) but never rendered in the sidebar. Removing the entry outright would have the
   * opposite effect — the guard treats unmatched routes as "any authenticated role".
   */
  hidden?: boolean;
  /** Draws a calm pulsing outline (theme-colored) to call attention to this item while inactive. */
  highlight?: boolean;
}

export interface NavParent {
  title: string;
  icon: LucideIcon;
  children: NavLeaf[];
}

export type NavItem = NavLeaf | NavParent;

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export function isNavParent(item: NavItem): item is NavParent {
  return "children" in item;
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export const navGroups: NavGroup[] = [
  {
    label: "Academics",
    items: [
      {
        title: "Overview",
        url: "/dashboard",
        icon: LayoutDashboard,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Parent Portal",
        url: "/parent",
        icon: HeartHandshake,
        // Admins used to see this too via ...ADMIN_ROLES; re-add the spread to restore that.
        requirement: { type: "roles", roles: ["GUARDIAN"] /* , ...ADMIN_ROLES */ },
      },
      {
        title: "Student Portal",
        url: "/student",
        icon: GraduationCap,
        // Admins used to see this too via ...ADMIN_ROLES; re-add the spread to restore that.
        requirement: { type: "roles", roles: ["USER"] /* , ...ADMIN_ROLES */ },
      },
      {
        title: "Teacher Portal",
        url: "/teacher",
        icon: Presentation,
        // Admins used to see this too via ...ADMIN_ROLES; re-add the spread to restore that.
        requirement: { type: "roles", roles: ["TEACHER"] /* , ...ADMIN_ROLES */ },
      },
      {
        title: "Active Learning",
        url: "/learning",
        icon: Sparkles,
        requirement: { type: "roles", roles: ["TEACHER", "USER", ...ADMIN_ROLES] },
        highlight: true,
      },
      {
        title: "Schedule",
        icon: CalendarRange,
        children: [
          {
            title: "Live Classes",
            url: "/live-classes",
            icon: Radio,
            requirement: { type: "permission", action: "read", subject: "LiveClass" },
          },
          {
            title: "Attendance",
            url: "/attendance",
            icon: CalendarCheck,
            requirement: { type: "permission", action: "read", subject: "Attendance" },
          },
        ],
      },
      {
        title: "Coursework",
        icon: NotebookPen,
        children: [
          {
            title: "Homework",
            url: "/homework",
            icon: NotebookPen,
            requirement: { type: "permission", action: "read", subject: "Homework" },
          },
          {
            title: "Gradebook",
            url: "/gradebook",
            icon: ClipboardCheck,
            requirement: { type: "permission", action: "read", subject: "Gradebook" },
          },
          {
            title: "Assessments",
            url: "/assessments",
            icon: ClipboardList,
            requirement: { type: "roles", roles: ["TEACHER", ...ADMIN_ROLES] },
          },
          // "Report Card" used to sit here as a permanently-disabled entry pointing at /report-card,
          // which has no page. The report-card view (GPA, term average, class rank, percentile) is
          // the student/guardian branch of /gradebook, so that entry only ever hid the real gap:
          // GUARDIAN held read:ReportCard but not read:Gradebook, and so could reach neither.
        ],
      },
      {
        title: "Content Authoring",
        icon: PencilRuler,
        children: [
          {
            title: "Lesson Authoring",
            url: "/lessons",
            icon: PencilRuler,
            requirement: { type: "roles", roles: ["TEACHER", ...ADMIN_ROLES] },
          },
          {
            title: "Question Bank",
            url: "/questions",
            icon: Library,
            requirement: { type: "roles", roles: ["TEACHER", ...ADMIN_ROLES] },
          },
          {
            title: "Diagnostics",
            url: "/diagnostics",
            icon: Stethoscope,
            requirement: { type: "permission", action: "read", subject: "Diagnostic" },
            // Descoped: DiagnosticsService.scheduleDiagnostic() throws NotImplementedException, so
            // the page can only ever list pre-existing seed attempts. Grouped with Placement,
            // LearningGap and MasteryStatusChange for a later design pass.
            hidden: true,
          },
          {
            // The `Class` taxonomy master. Still titled "Grade Levels"
            // rather than "Classes": the ClassSection admin pages are gone,
            // but the model itself survives behind attendance and timetable,
            // so the word stays ambiguous in the codebase.
            title: "Grade Levels",
            url: "/grade-levels",
            icon: GraduationCap,
            requirement: { type: "roles", roles: ADMIN_ROLES },
          },
          {
            title: "Courses",
            url: "/courses",
            icon: BookOpen,
            requirement: { type: "roles", roles: ["TEACHER", ...ADMIN_ROLES] },
          },
          {
            title: "Learning Paths",
            url: "/learning-paths",
            icon: Route,
            requirement: { type: "roles", roles: ["TEACHER", ...ADMIN_ROLES] },
          },
        ],
      },
      {
        // Learning Gaps and Next Actions (Student Insights' other two children) were removed
        // entirely — nothing ever created a LearningGap row, the detection engine was never built.
        // Placement is kept as a route (still reachable directly) but stays out of the nav: it's
        // hidden for the same "depends on Diagnostics, which is also unbuilt" reason as before.
        title: "Placement",
        url: "/placement",
        icon: Layers,
        requirement: { type: "permission", action: "read", subject: "Placement" },
        hidden: true,
      },
    ],
  },
  {
    label: "Management",
    items: [
      {
        title: "Leads & Enrolments",
        url: "/leads",
        icon: UserPlus,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Student Roster",
        url: "/students",
        icon: UsersRound,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        // Support tooling for access: refunds, comps, and "I paid but I
        // can't see it" tickets all get resolved here.
        title: "Entitlements",
        url: "/entitlements",
        icon: ShieldCheck,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Teachers",
        url: "/teachers",
        icon: Users2,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        // The cohort a LIVE course is actually sold as a seat in. Had no
        // admin surface at all until now — batches could only be created by
        // calling the API directly.
        title: "Batches",
        url: "/batches",
        icon: Layers,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Academic Programs",
        url: "/programs",
        icon: School,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Users & Roles",
        url: "/users",
        icon: UserCog,
        requirement: { type: "roles", roles: ADMIN_ROLES },
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
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
    ],
  },
];

/** Flattened leaves, used by the route guard to match a pathname to its access requirement. */
export function flattenNavLeaves(groups: NavGroup[] = navGroups): NavLeaf[] {
  const leaves: NavLeaf[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      if (isNavParent(item)) {
        leaves.push(...item.children);
      } else {
        leaves.push(item);
      }
    }
  }
  return leaves;
}
