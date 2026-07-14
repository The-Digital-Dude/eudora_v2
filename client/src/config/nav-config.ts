import {
  AlertTriangle,
  CalendarCheck,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  HeartHandshake,
  Layers,
  LayoutDashboard,
  Library,
  ListChecks,
  MessageSquare,
  NotebookPen,
  PencilRuler,
  Presentation,
  Radio,
  School,
  Sparkles,
  SquareStack,
  Stethoscope,
  UserCog,
  UserPlus,
  Users2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { NavRequirement } from "@/lib/access-control";

export interface NavLeaf {
  title: string;
  url: string;
  icon: LucideIcon;
  requirement: NavRequirement;
  /** Feature has no backing page/API yet — shown greyed out with a "Soon" badge, not linked. */
  disabled?: boolean;
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
        requirement: { type: "roles", roles: ["GUARDIAN", ...ADMIN_ROLES] },
      },
      {
        title: "Student Portal",
        url: "/student",
        icon: GraduationCap,
        requirement: { type: "roles", roles: ["USER", ...ADMIN_ROLES] },
      },
      {
        title: "Teacher Portal",
        url: "/teacher",
        icon: Presentation,
        requirement: { type: "roles", roles: ["TEACHER", ...ADMIN_ROLES] },
      },
      {
        title: "Active Learning",
        url: "/learning",
        icon: Sparkles,
        requirement: { type: "roles", roles: ["TEACHER", "USER", ...ADMIN_ROLES] },
      },
      {
        title: "Schedule",
        icon: CalendarRange,
        children: [
          {
            title: "Timetable",
            url: "/timetable",
            icon: CalendarRange,
            requirement: { type: "permission", action: "read", subject: "Timetable" },
          },
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
          {
            title: "Report Card",
            url: "/report-card",
            icon: FileText,
            requirement: { type: "permission", action: "read", subject: "ReportCard" },
            disabled: true,
          },
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
          },
        ],
      },
      {
        title: "Student Insights",
        icon: ListChecks,
        children: [
          {
            title: "Learning Gaps",
            url: "/learning-gaps",
            icon: AlertTriangle,
            requirement: { type: "permission", action: "read", subject: "LearningGap" },
          },
          {
            title: "Next Actions",
            url: "/next-actions",
            icon: ListChecks,
            requirement: { type: "permission", action: "read", subject: "NextAction" },
          },
          {
            title: "Placement",
            url: "/placement",
            icon: Layers,
            requirement: { type: "permission", action: "read", subject: "Placement" },
          },
        ],
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
        title: "Teachers",
        url: "/teachers",
        icon: Users2,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Classes & Attendance",
        url: "/classes",
        icon: SquareStack,
        requirement: { type: "roles", roles: ADMIN_ROLES },
      },
      {
        title: "Campuses & Programs",
        url: "/campuses",
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
      {
        title: "Billing & Plans",
        url: "/plans",
        icon: CreditCard,
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
