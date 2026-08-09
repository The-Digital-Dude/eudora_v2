 
/**
 * In-app JSON mock backend.
 *
 * Enabled by NEXT_PUBLIC_USE_MOCK_API=true, which points the `/api/:path*`
 * rewrite here instead of the NestJS server (see next.config.ts). Responses
 * mirror the real backend's envelope ({ success, code, message, data, meta })
 * so the client-side unwrapping in authApi works identically against both.
 *
 * Data lives in src/mocks/db.json and is cloned into globalThis on first use,
 * so mutations (created rows, submitted attempts, ...) survive HMR but reset
 * when the dev server restarts. Login accepts any seeded email with ANY
 * password. Seed accounts:
 *   admin@eudora.app            (SUPER_ADMIN)
 *   prof.turing@eudora.app      (TEACHER)
 *   prof.lovelace@eudora.app    (TEACHER)
 *   charlotte@example.com       (STUDENT)
 *   elijah.m@example.com        (STUDENT)
 *   sarah.harris@example.com    (GUARDIAN)
 */
import { NextRequest, NextResponse } from "next/server";

import seed from "@/mocks/db.json";

type Db = { [K in keyof typeof seed]: any } & { [key: string]: any };

const g = globalThis as any;
function db(): Db {
  if (!g.__eudoraMockDb) g.__eudoraMockDb = structuredClone(seed);
  return g.__eudoraMockDb;
}

// ─── Envelope helpers ─────────────────────────────────────────────────────────

function ok(data: any, opts: { status?: number; pagination?: { page: number; limit: number; total: number } } = {}) {
  const body: any = {
    success: true,
    code: "OK",
    message: "OK",
    data,
    meta: { requestId: `mock-${Date.now()}`, timestamp: new Date().toISOString() },
  };
  if (opts.pagination) {
    body.meta.pagination = {
      ...opts.pagination,
      totalPages: Math.max(1, Math.ceil(opts.pagination.total / opts.pagination.limit)),
    };
  }
  return NextResponse.json(body, { status: opts.status ?? 200 });
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json(
    { success: false, code, message, data: null, meta: { requestId: `mock-${Date.now()}` } },
    { status },
  );
}

/** Paginate when the client asked for pagination (page/limit/pageSize present). */
function listResponse(rows: any[], sp: URLSearchParams) {
  const paged = sp.has("page") || sp.has("limit") || sp.has("pageSize");
  if (!paged) return ok(rows);
  const page = Number(sp.get("page") ?? 1) || 1;
  const limit = Number(sp.get("limit") ?? sp.get("pageSize") ?? 20) || 20;
  const start = (page - 1) * limit;
  return ok(rows.slice(start, start + limit), { pagination: { page, limit, total: rows.length } });
}

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, { action: string; subject: string }[]> = {
  SUPER_ADMIN: [],
  ADMIN: [],
  TEACHER: [
    "Attendance", "Diagnostic", "Gradebook", "Homework", "LearningGap",
    "LiveClass", "NextAction", "Placement", "ReportCard", "Timetable",
  ].map((subject) => ({ action: "read", subject })),
  STUDENT: ["Homework", "Timetable", "LiveClass", "ReportCard"].map((subject) => ({ action: "read", subject })),
  USER: [],
  GUARDIAN: ["Attendance", "Homework", "ReportCard", "Timetable"].map((subject) => ({ action: "read", subject })),
};

function buildAuthUser(u: any) {
  const d = db();
  const roles = (u.roleNames as string[]).map((name: string) => {
    const role = d.roles.find((r: any) => r.name === name) ?? { id: `r-${name}`, name };
    return { id: `ur-${u.id}-${name}`, userId: u.id, roleId: role.id, role };
  });
  const permissions = (u.roleNames as string[]).flatMap((n) => ROLE_PERMISSIONS[n] ?? []);
  const out: any = {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    name: u.name,
    avatarUrl: u.avatarUrl ?? null,
    status: u.status,
    roles,
    permissions,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
  if (u.studentProfileId) {
    out.studentProfileId = u.studentProfileId;
    out.studentProfile = d.studentProfiles.find((s: any) => s.id === u.studentProfileId) ?? null;
  }
  if (u.teacherProfileId) {
    out.teacherProfileId = u.teacherProfileId;
    out.teacherProfile = d.teacherProfiles.find((t: any) => t.id === u.teacherProfileId) ?? null;
  }
  if (u.guardianChildren) {
    out.guardianProfile = {
      id: `gp-${u.id}`,
      userId: u.id,
      students: (u.guardianChildren as string[]).map((id) => ({
        studentProfileId: id,
        studentProfile: d.studentProfiles.find((s: any) => s.id === id) ?? null,
      })),
    };
  }
  return out;
}

function sessionUser(req: NextRequest) {
  const id = req.cookies.get("mock_session")?.value;
  if (!id) return null;
  return db().users.find((u: any) => u.id === id) ?? null;
}

function loginResponse(u: any) {
  const res = ok(buildAuthUser(u));
  res.cookies.set("mock_session", u.id, { httpOnly: true, sameSite: "lax", path: "/" });
  res.cookies.set("csrf_token", "mock-csrf-token", { sameSite: "lax", path: "/" });
  return res;
}

// ─── Shared lookups ───────────────────────────────────────────────────────────

function expandAssessment(a: any) {
  const d = db();
  return {
    ...a,
    questionIds: undefined,
    questions: (a.questionIds ?? []).map((link: any) => ({
      id: link.aqId,
      questionId: link.questionId,
      questionNumber: link.questionNumber,
      marksAvailable: link.marksAvailable,
      sectionId: link.sectionId,
      question: d.questions.find((q: any) => q.id === link.questionId) ?? null,
    })),
  };
}

function studentProfileForUser(u: any) {
  return u?.studentProfileId ? db().studentProfiles.find((s: any) => s.id === u.studentProfileId) : null;
}

function attendanceSummaryFor(records: any[]) {
  const breakdown = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 } as Record<string, number>;
  records.forEach((r) => { if (breakdown[r.status] !== undefined) breakdown[r.status]++; });
  const total = records.length;
  const present = breakdown.PRESENT + breakdown.LATE + breakdown.EXCUSED;
  return { total, attendanceRate: total ? Math.round((present / total) * 100) : 100, breakdown };
}

function recalcAttempt(attempt: any) {
  const d = db();
  const assignment = d.assignments.find((a: any) => a.id === attempt.assessmentAssignmentId);
  const assessment = assignment ? d.assessments.find((a: any) => a.id === assignment.assessmentId) : null;
  let raw = 0;
  let max = 0;
  let needsReview = false;
  for (const link of assessment?.questionIds ?? []) {
    max += link.marksAvailable;
    const q = d.questions.find((x: any) => x.id === link.questionId);
    const resp = attempt.responses.find((r: any) => r.questionId === link.questionId);
    if (!resp) continue;
    resp.marksAvailable = link.marksAvailable;
    if (q?.questionType === "mcq") {
      const correct = q.options.find((o: any) => o.isCorrect);
      resp.isCorrect = !!resp.selectedOptionId && resp.selectedOptionId === correct?.id;
      resp.marksAwarded = resp.isCorrect ? link.marksAvailable : 0;
    } else if (q?.questionType === "numeric" && q.correctAnswer != null) {
      resp.isCorrect = String(resp.responseText ?? "").trim() === String(q.correctAnswer).trim();
      resp.marksAwarded = resp.isCorrect ? link.marksAvailable : 0;
    } else if (resp.marksAwarded == null) {
      needsReview = true;
    }
    raw += resp.marksAwarded ?? 0;
  }
  attempt.rawScore = raw;
  attempt.maxScore = max;
  attempt.percentageScore = max ? Math.round((raw / max) * 100) : 0;
  return needsReview;
}

// ─── Generic REST collections ────────────────────────────────────────────────

const COLLECTIONS: Record<string, string> = {
  "campuses": "campuses",
  "programs": "programs",
  "leads": "leads",
  "subjects": "subjects",
  "levels": "levels",
  "terms": "terms",
  "academic-years": "academicYears",
  "class-sections": "classSections",
  "course-classes": "courseClasses",
  "student-profiles": "studentProfiles",
  "guardian-profiles": "guardianProfiles",
  "student-enrollments": "studentEnrollments",
  "student-placements": "studentPlacements",
  "makeup-requests": "makeupRequests",
  "questions": "questions",
  "uploads": "uploads",
  "live-classes": "liveClasses",
  "gaps": "learningGaps",
  "next-actions": "nextActions",
};

// ─── The handler ─────────────────────────────────────────────────────────────

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  if (process.env.NEXT_PUBLIC_USE_MOCK_API !== "true") {
    return fail(404, "MOCK_DISABLED", "Mock API is disabled. Set NEXT_PUBLIC_USE_MOCK_API=true.");
  }
  const { path } = await ctx.params;

  // GET /api/_reset re-seeds the in-memory DB from db.json (useful after
  // editing the fixtures, since the working copy survives HMR).
  if (path[0] === "_reset") {
    g.__eudoraMockDb = structuredClone(seed);
    return ok({ reset: true });
  }

  const d = db();
  const sp = req.nextUrl.searchParams;
  const method = req.method.toUpperCase();
  const [p0, p1, p2, p3] = path;
  const body = ["POST", "PATCH", "PUT"].includes(method)
    ? await req.json().catch(() => ({}))
    : {};
  const me = sessionUser(req);

  // ── Auth ──
  if (p0 === "auth") {
    if (p1 === "login" && method === "POST") {
      const u = d.users.find((x: any) => x.email?.toLowerCase() === String(body.email ?? "").toLowerCase());
      if (!u) return fail(401, "INVALID_CREDENTIALS", "No mock user with that email. Try admin@eudora.app");
      return loginResponse(u);
    }
    if (p1 === "register" && method === "POST") {
      const existing = d.users.find((x: any) => x.email === body.email);
      if (existing) return fail(409, "EMAIL_TAKEN", "Email already registered");
      const [firstName, ...rest] = String(body.name ?? body.firstName ?? "New Student").split(" ");
      const u = {
        id: uid("u"), email: body.email, firstName, lastName: rest.join(" ") || "User",
        name: body.name ?? `${firstName} ${rest.join(" ")}`.trim(), status: "ACTIVE", avatarUrl: null,
        roleNames: ["USER", "STUDENT"], createdAt: nowIso(), updatedAt: nowIso(),
      };
      d.users.push(u);
      return loginResponse(u);
    }
    if (p1 === "google" && method === "POST") {
      return loginResponse(d.users.find((x: any) => x.id === "u-charlotte"));
    }
    if (p1 === "me") {
      if (!me) return fail(401, "UNAUTHORIZED", "Not signed in");
      return ok(buildAuthUser(me));
    }
    if (p1 === "refresh" && method === "POST") {
      if (!me) return fail(401, "UNAUTHORIZED", "Session expired");
      return loginResponse(me);
    }
    if (p1 === "logout" && method === "POST") {
      const res = ok(null);
      res.cookies.delete("mock_session");
      return res;
    }
  }

  // Mirrors @Public() on PlanController in the real API — the marketing
  // pricing page fetches this anonymously, so it can't sit behind the
  // blanket auth gate below.
  if (p0 === "billing" && p1 === "plans" && p2 === "public" && method === "GET") {
    return ok(d.billingPlans.filter((p: any) => p.isActive && p.isPublic));
  }

  if (!me) return fail(401, "UNAUTHORIZED", "Not signed in");

  // ── Dashboard snapshot (role-aware superset) ──
  if (p0 === "dashboard" && p1 === "snapshot") {
    const weekday = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date().getDay()];
    const todaySlots = d.timetableSlots.filter((s: any) => s.dayOfWeek === weekday);
    const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const todaySchedule = todaySlots.map((s: any) => ({
      id: s.id, title: s.courseClass?.name, courseClassName: s.courseClass?.name,
      classSectionId: s.classSectionId, classSectionName: s.classSection?.name,
      teacherName: s.teacherProfile?.fullName, room: s.room, periodIndex: s.periodIndex,
      startTimeMinutes: s.startTimeMinutes, endTimeMinutes: s.endTimeMinutes,
      startTime: fmt(s.startTimeMinutes), endTime: fmt(s.endTimeMinutes),
    }));
    const ungraded = d.homeworkSubmissions.filter((s: any) => s.status === "SUBMITTED");
    return ok({
      todaySchedule,
      attendanceTasks: d.classSections.map((cs: any) => ({
        classSectionId: cs.id, classSectionName: cs.name, code: cs.code,
        rosterCount: d.studentProfiles.filter((s: any) => s.placements?.some((p: any) => p.classSectionId === cs.id)).length,
        marked: cs.id === "cs-7a", isAttendanceMarkedToday: cs.id === "cs-7a",
      })),
      ungradedSubmissions: ungraded.map((s: any) => ({
        id: s.id, homeworkId: s.homeworkId,
        homeworkTitle: d.homework.find((h: any) => h.id === s.homeworkId)?.title,
        studentName: s.studentProfile?.fullName, submittedAt: s.submissionDate,
      })),
      pendingHomework: d.homework.filter((h: any) => new Date(h.dueDate) > new Date()),
      recentFeedback: d.gradebookEntries
        .filter((e: any) => e.status === "PUBLISHED")
        .map((e: any) => ({ id: e.id, title: e.title, category: e.category, percentage: e.percentage, pointsEarned: e.pointsEarned, pointsPossible: e.pointsPossible, assessedAt: e.assessedAt })),
      children: mockChildren(),
      timetableOccupancy: { activeSlotsCount: d.timetableSlots.length },
      attendanceSnapshot: {
        markedCount: 1, unmarkedCount: d.classSections.length - 1,
        totalStudents: d.studentProfiles.length,
        absentCount: d.attendanceRecords.filter((r: any) => r.status === "ABSENT").length,
      },
      homeworkSnapshot: { dueToday: 1, ungradedSubmissions: ungraded.length },
      gradebookSnapshot: { draftEntries: d.gradebookEntries.filter((e: any) => e.status === "DRAFT").length },
    });
  }

  // ── Simple aliases ──
  if (p0 === "roles" && !p1) return ok(d.roles);
  if (p0 === "users" && !p1) {
    const rows = d.users.map((u: any) => ({
      id: u.id, email: u.email, name: u.name, status: u.status,
      createdAt: u.createdAt, updatedAt: u.updatedAt,
      roles: buildAuthUser(u).roles,
    }));
    return listResponse(rows, sp);
  }
  if (p0 === "users" && p1 && !p2 && method === "PATCH") {
    const u = d.users.find((x: any) => x.id === p1);
    if (!u) return fail(404, "NOT_FOUND", "User not found");
    Object.assign(u, body, { updatedAt: nowIso() });
    return ok(buildAuthUser(u));
  }
  if (p0 === "users" && p2 === "roles") {
    const u = d.users.find((x: any) => x.id === p1);
    if (!u) return fail(404, "NOT_FOUND", "User not found");
    const role = d.roles.find((r: any) => r.id === (p3 ?? body.roleId));
    if (method === "POST" && role && !u.roleNames.includes(role.name)) u.roleNames.push(role.name);
    if (method === "DELETE" && role) u.roleNames = u.roleNames.filter((n: string) => n !== role.name);
    return ok(buildAuthUser(u));
  }
  if (p0 === "billing" && p1 === "plans") {
    if (method === "POST") {
      const plan = { id: uid("bp"), isActive: true, isPublic: true, features: [], currency: "USD", createdAt: nowIso(), updatedAt: nowIso(), ...body };
      d.billingPlans.push(plan);
      return ok(plan, { status: 201 });
    }
    return ok(d.billingPlans);
  }
  if (p0 === "communication" && p1 === "broadcasts") {
    if (method === "POST") {
      const bc = { id: uid("bc"), status: "SENT", recipientCount: 0, sender: me.name, createdAt: nowIso(), updatedAt: nowIso(), ...body };
      d.broadcasts.unshift(bc);
      return ok(bc, { status: 201 });
    }
    return listResponse(d.broadcasts, sp);
  }
  if (p0 === "diagnostics" && p1 === "placements") {
    if (p2 && p3 === "decision" && method === "PATCH") {
      const rec = d.placementRecommendations.find((r: any) => r.id === p2);
      if (rec) Object.assign(rec, { status: body.decision ?? body.status ?? "APPROVED" });
      return ok(rec ?? null);
    }
    return ok(d.placementRecommendations);
  }
  if (p0 === "evaluation" && p1 === "concepts") return ok(d.concepts);
  if (p0 === "guardian-relationships" && p1 === "self-link" && method === "POST") {
    return ok({ linked: true });
  }

  // ── Notifications ──
  if (p0 === "notifications") {
    const mine = d.notifications.filter((n: any) => n.userId === me.id);
    if (p1 === "unread-count") return ok({ count: mine.filter((n: any) => !n.readAt).length });
    if (p1 === "read-all") { mine.forEach((n: any) => { n.readAt = nowIso(); }); return ok({ updated: mine.length }); }
    if (p1 && p2 === "read") {
      const n = mine.find((x: any) => x.id === p1);
      if (n) n.readAt = nowIso();
      return ok(n ?? null);
    }
    if (p1 && method === "DELETE") {
      d.notifications = d.notifications.filter((n: any) => n.id !== p1);
      return ok(null);
    }
    return ok(mine);
  }

  // ── Assessments ──
  if (p0 === "assessments") {
    if (p1 === "types") return listResponse(d.assessmentTypes, sp);
    if (p1 === "levels") return listResponse(d.levels, sp);
    if (!p1) {
      if (method === "POST") {
        const a = {
          id: uid("as"), status: "draft", totalMarks: 0, publishedAt: null,
          createdAt: nowIso(), updatedAt: nowIso(), sections: [{ id: uid("sec"), title: "Section A", sortOrder: 1 }],
          questionIds: [], ...body,
          subject: d.subjects.find((s: any) => s.id === body.subjectId),
          level: d.levels.find((l: any) => l.id === body.levelId),
          assessmentType: d.assessmentTypes.find((t: any) => t.id === body.assessmentTypeId),
          term: d.terms.find((t: any) => t.id === body.termId) ?? null,
        };
        d.assessments.push(a);
        return ok(expandAssessment(a), { status: 201 });
      }
      let rows = d.assessments;
      if (sp.get("subjectId")) rows = rows.filter((a: any) => a.subjectId === sp.get("subjectId"));
      if (sp.get("levelId")) rows = rows.filter((a: any) => a.levelId === sp.get("levelId"));
      if (sp.get("status")) rows = rows.filter((a: any) => a.status === sp.get("status"));
      if (sp.get("search")) rows = rows.filter((a: any) => a.title.toLowerCase().includes(sp.get("search")!.toLowerCase()));
      return listResponse(rows.map(expandAssessment), sp);
    }
    const a = d.assessments.find((x: any) => x.id === p1);
    if (!a) return fail(404, "NOT_FOUND", "Assessment not found");
    if (p2 === "publish") { a.status = "published"; a.publishedAt = nowIso(); return ok(expandAssessment(a)); }
    if (p2 === "questions") {
      if (method === "POST") {
        a.questionIds.push({
          aqId: uid("aq"), questionId: body.questionId,
          questionNumber: a.questionIds.length + 1,
          marksAvailable: body.marksAvailable ?? 1,
          sectionId: body.sectionId ?? a.sections?.[0]?.id,
        });
        a.totalMarks = a.questionIds.reduce((s: number, l: any) => s + l.marksAvailable, 0);
        return ok(expandAssessment(a), { status: 201 });
      }
      if (method === "DELETE") {
        a.questionIds = a.questionIds.filter((l: any) => l.questionId !== p3 && l.aqId !== p3);
        a.totalMarks = a.questionIds.reduce((s: number, l: any) => s + l.marksAvailable, 0);
        return ok(expandAssessment(a));
      }
      if (method === "PUT") {
        const link = a.questionIds.find((l: any) => l.questionId === p3 || l.aqId === p3);
        if (link) Object.assign(link, { marksAvailable: body.marksAvailable ?? link.marksAvailable });
        a.totalMarks = a.questionIds.reduce((s: number, l: any) => s + l.marksAvailable, 0);
        return ok(expandAssessment(a));
      }
    }
    if (method === "PUT" || method === "PATCH") { Object.assign(a, body, { updatedAt: nowIso() }); return ok(expandAssessment(a)); }
    if (method === "DELETE") { d.assessments = d.assessments.filter((x: any) => x.id !== p1); return ok(null); }
    return ok(expandAssessment(a));
  }

  // ── Assignments & attempts ──
  if (p0 === "students" && p2 === "assignments") {
    return ok(d.assignments.filter((a: any) => a.studentProfileId === p1));
  }
  if (p0 === "assignments") {
    if (!p1 && method === "POST") {
      const targets: string[] = body.studentProfileId
        ? [body.studentProfileId]
        : d.studentProfiles.filter((s: any) => s.placements?.some((p: any) => p.classSectionId === body.classSectionId)).map((s: any) => s.id);
      const created = targets.map((sid) => {
        const spf = d.studentProfiles.find((s: any) => s.id === sid);
        const assessment = d.assessments.find((a: any) => a.id === body.assessmentId);
        const asg = {
          id: uid("asg"), assessmentId: body.assessmentId, studentProfileId: sid,
          classSectionId: body.classSectionId ?? spf?.placements?.[0]?.classSectionId ?? null,
          opensAt: body.opensAt ?? nowIso(), dueAt: body.dueAt ?? nowIso(),
          status: "assigned", reminderCount: 0, createdAt: nowIso(),
          assessment: assessment && { id: assessment.id, title: assessment.title, status: assessment.status, totalMarks: assessment.totalMarks },
          studentProfile: spf && { id: spf.id, fullName: spf.fullName },
          classSection: d.classSections.find((c: any) => c.id === (body.classSectionId ?? spf?.placements?.[0]?.classSectionId)),
        };
        d.assignments.push(asg);
        return asg;
      });
      return ok(created, { status: 201 });
    }
    const asg = d.assignments.find((a: any) => a.id === p1);
    if (!asg) return fail(404, "NOT_FOUND", "Assignment not found");
    if (p2 === "attempts") return ok({ items: d.attempts.filter((t: any) => t.assessmentAssignmentId === p1) });
    return ok(asg);
  }
  if (p0 === "attempts") {
    if (!p1 && method === "POST") {
      const asg = d.assignments.find((a: any) => a.id === body.assessmentAssignmentId);
      if (!asg) return fail(404, "NOT_FOUND", "Assignment not found");
      const attempt = {
        id: uid("att"), assessmentAssignmentId: asg.id, studentProfileId: asg.studentProfileId,
        attemptNumber: d.attempts.filter((t: any) => t.assessmentAssignmentId === asg.id).length + 1,
        startedAt: nowIso(), submittedAt: null, timeSpentSeconds: 0,
        rawScore: null, maxScore: null, percentageScore: null, resultStatus: "in_progress",
        isLatest: true, isBest: false, markedByUserId: null, teacherComment: null, parentComment: null,
        createdAt: nowIso(), updatedAt: nowIso(),
        studentProfile: asg.studentProfile,
        assignment: { id: asg.id, assessment: { id: asg.assessmentId, title: asg.assessment?.title, subject: { name: "" } } },
        responses: [],
      };
      d.attempts.push(attempt);
      asg.status = "started";
      return ok(attempt, { status: 201 });
    }
    if (!p1) return listResponse(d.attempts, sp);
    const attempt = d.attempts.find((t: any) => t.id === p1);
    if (!attempt) return fail(404, "NOT_FOUND", "Attempt not found");
    if (p2 === "submit" && method === "POST") {
      const needsReview = recalcAttempt(attempt);
      attempt.submittedAt = nowIso();
      attempt.resultStatus = needsReview ? "submitted" : "marked";
      const asg = d.assignments.find((a: any) => a.id === attempt.assessmentAssignmentId);
      if (asg) asg.status = "submitted";
      return ok(attempt);
    }
    if (p2 === "mark" && method === "POST") {
      for (const r of body.responses ?? []) {
        const resp = attempt.responses.find((x: any) => x.id === r.id || x.questionId === r.questionId);
        if (resp) Object.assign(resp, { marksAwarded: r.marksAwarded, feedback: r.feedback ?? resp.feedback, isCorrect: r.marksAwarded > 0 });
      }
      recalcAttempt(attempt);
      attempt.resultStatus = "marked";
      attempt.markedByUserId = me.id;
      if (body.teacherComment != null) attempt.teacherComment = body.teacherComment;
      return ok(attempt);
    }
    return ok(attempt);
  }
  if (p0 === "responses") {
    if (!p1 && method === "POST") {
      const attempt = d.attempts.find((t: any) => t.id === body.assessmentAttemptId);
      if (!attempt) return fail(404, "NOT_FOUND", "Attempt not found");
      let resp = attempt.responses.find((r: any) => r.questionId === body.questionId);
      if (!resp) {
        resp = { id: uid("resp"), questionId: body.questionId, marksAvailable: 0, timeSpentSeconds: 0 };
        attempt.responses.push(resp);
      }
      Object.assign(resp, {
        selectedOptionId: body.selectedOptionId ?? null,
        responseText: body.responseText ?? null,
        interactionState: body.interactionState ?? null,
        timeSpentSeconds: (resp.timeSpentSeconds ?? 0) + (body.timeSpentSeconds ?? 0),
      });
      return ok(resp, { status: 201 });
    }
    if (p2 === "mark" && method === "POST") {
      for (const attempt of d.attempts) {
        const resp = attempt.responses.find((r: any) => r.id === p1);
        if (resp) {
          Object.assign(resp, { marksAwarded: body.marksAwarded, feedback: body.feedback ?? resp.feedback, isCorrect: (body.marksAwarded ?? 0) > 0 });
          recalcAttempt(attempt);
          return ok(resp);
        }
      }
      return fail(404, "NOT_FOUND", "Response not found");
    }
  }

  // ── Clio lessons ──
  if (p0 === "lessons") {
    if (!p1) {
      if (method === "POST") {
        const lesson = { id: uid("les"), sortOrder: d.lessons.length + 1, xpReward: 50, cards: [], concept: d.concepts.find((c: any) => c.id === body.conceptId) ?? { name: "General" }, ...body };
        d.lessons.push(lesson);
        return ok(lesson, { status: 201 });
      }
      const conceptId = sp.get("conceptId");
      const rows = d.lessons.filter((l: any) => !conceptId || l.conceptId === conceptId);
      return ok(rows.map(({ cards, ...rest }: any) => ({ ...rest, description: rest.description ?? null })));
    }
    if (p1 === "cards") {
      if (!p2 && method === "POST") {
        const lesson = d.lessons.find((l: any) => l.id === body.lessonId);
        if (!lesson) return fail(404, "NOT_FOUND", "Lesson not found");
        const card = { id: uid("card"), question: null, sortOrder: lesson.cards.length + 1, ...body };
        lesson.cards.push(card);
        return ok(card, { status: 201 });
      }
      const lesson = d.lessons.find((l: any) => l.cards.some((c: any) => c.id === p2));
      const card = lesson?.cards.find((c: any) => c.id === p2);
      if (!card) return fail(404, "NOT_FOUND", "Card not found");
      if (p3 === "submit" && method === "POST") {
        const q = card.question;
        let isCorrect = true;
        if (q?.options?.length) {
          const correct = q.options.find((o: any) => o.isCorrect);
          isCorrect = body.selectedOptionId === correct?.id;
        } else if (q?.correctAnswer != null) {
          isCorrect = String(body.responseText ?? "").trim() === String(q.correctAnswer).trim();
        }
        let attempt = d.lessonAttempts.find((a: any) => a.lessonId === lesson.id && a.userId === me.id && a.status === "IN_PROGRESS");
        if (!attempt) {
          attempt = { id: uid("latt"), lessonId: lesson.id, userId: me.id, status: "IN_PROGRESS", xpEarned: 0, cardResponses: [] };
          d.lessonAttempts.push(attempt);
        }
        if (!attempt.cardResponses.some((r: any) => r.cardId === card.id)) {
          attempt.cardResponses.push({ cardId: card.id, isCorrect });
        }
        const xp = isCorrect ? Math.round((lesson.xpReward ?? 50) / lesson.cards.length) : 0;
        attempt.xpEarned += xp;
        const isLessonComplete = attempt.cardResponses.length >= lesson.cards.length;
        if (isLessonComplete) attempt.status = "COMPLETED";
        return ok({ isCorrect, explanation: q?.explanation ?? "", xpEarned: xp, isLessonComplete });
      }
      if (method === "PATCH") { Object.assign(card, body); return ok(card); }
      if (method === "DELETE") {
        lesson.cards = lesson.cards.filter((c: any) => c.id !== p2);
        return ok(null);
      }
      return ok(card);
    }
    const lesson = d.lessons.find((l: any) => l.id === p1);
    if (!lesson) return fail(404, "NOT_FOUND", "Lesson not found");
    if (p2 === "flow") {
      let attempt = d.lessonAttempts.find((a: any) => a.lessonId === lesson.id && a.userId === me.id && a.status === "IN_PROGRESS");
      if (!attempt) {
        attempt = { id: uid("latt"), lessonId: lesson.id, userId: me.id, status: "IN_PROGRESS", xpEarned: 0, cardResponses: [] };
        d.lessonAttempts.push(attempt);
      }
      return ok({ lesson, attempt });
    }
    if (p2 === "cards" && p3 === "reorder" && method === "PATCH") {
      const order: string[] = body.cardIds ?? [];
      lesson.cards.sort((a: any, b: any) => order.indexOf(a.id) - order.indexOf(b.id));
      lesson.cards.forEach((c: any, i: number) => { c.sortOrder = i + 1; });
      return ok(lesson.cards);
    }
    if (method === "PATCH") { Object.assign(lesson, body); return ok(lesson); }
    return ok(lesson);
  }

  // ── Homework ──
  if (p0 === "homework") {
    if (p1 === "course-class") return ok(d.homework.filter((h: any) => h.courseClassId === p2));
    if (p1 === "submissions" && p2 === "homework") {
      return ok(d.homeworkSubmissions
        .filter((s: any) => s.homeworkId === p3)
        .map((s: any) => ({ ...s, homework: d.homework.find((h: any) => h.id === s.homeworkId) })));
    }
    if (p1 === "submissions" && p3 === "grade" && method === "PATCH") {
      const s = d.homeworkSubmissions.find((x: any) => x.id === p2);
      if (!s) return fail(404, "NOT_FOUND", "Submission not found");
      Object.assign(s, { status: "GRADED", pointsEarned: body.pointsEarned, feedback: body.feedback ?? null, gradedById: me.id, gradedAt: nowIso(), updatedAt: nowIso() });
      return ok(s);
    }
    if (p1 === "student") {
      const submissions = d.homeworkSubmissions
        .filter((s: any) => s.studentProfileId === p2)
        .map((s: any) => ({ ...s, homework: d.homework.find((h: any) => h.id === s.homeworkId) }));
      if (p3 === "pending") {
        const spf = d.studentProfiles.find((s: any) => s.id === p2);
        const enrolled = (spf?.enrollments ?? []).map((e: any) => e.courseClassId);
        const done = submissions.map((s: any) => s.homeworkId);
        return ok(d.homework.filter((h: any) => enrolled.includes(h.courseClassId) && !done.includes(h.id)));
      }
      return ok(submissions);
    }
    if (p1 === "me" && p2 === "pending") {
      const spf = studentProfileForUser(me);
      if (!spf) return ok([]);
      const enrolled = (spf.enrollments ?? []).map((e: any) => e.courseClassId);
      const done = d.homeworkSubmissions.filter((s: any) => s.studentProfileId === spf.id).map((s: any) => s.homeworkId);
      return ok(d.homework.filter((h: any) => enrolled.includes(h.courseClassId) && !done.includes(h.id)));
    }
    if (p1 === "submit" && method === "POST") {
      const spf = studentProfileForUser(me);
      const sub = {
        id: uid("hws"), homeworkId: body.homeworkId, studentProfileId: spf?.id ?? "sp-1",
        submissionDate: nowIso(), content: body.content ?? null, attachmentUrls: body.attachmentUrls ?? [],
        status: "SUBMITTED", pointsEarned: null, feedback: null, gradedById: null, gradedAt: null,
        createdAt: nowIso(), updatedAt: nowIso(),
        studentProfile: spf && { id: spf.id, fullName: spf.fullName },
      };
      d.homeworkSubmissions.push(sub);
      return ok(sub, { status: 201 });
    }
    if (!p1 && method === "POST") {
      const hw = {
        id: uid("hw"), attachmentUrls: [], recordedById: me.id, createdAt: nowIso(), updatedAt: nowIso(),
        courseClass: d.courseClasses.find((c: any) => c.id === body.courseClassId), ...body,
      };
      d.homework.push(hw);
      return ok(hw, { status: 201 });
    }
    if (p1 && method === "PATCH") {
      const hw = d.homework.find((h: any) => h.id === p1);
      if (!hw) return fail(404, "NOT_FOUND", "Homework not found");
      Object.assign(hw, body, { updatedAt: nowIso() });
      return ok(hw);
    }
    return ok(d.homework);
  }

  // ── Attendance ──
  if (p0 === "attendance") {
    if (p1 === "daily" && p2 === "class-section") {
      const date = sp.get("date");
      const roster = d.studentProfiles.filter((s: any) => s.placements?.some((p: any) => p.classSectionId === p3));
      return ok(roster.map((s: any) => {
        const rec = d.attendanceRecords.find((r: any) => r.studentProfileId === s.id && r.classSectionId === p3 && r.date === date);
        return {
          studentProfileId: s.id, fullName: s.fullName, gender: s.gender,
          status: rec?.status ?? null, remarks: rec?.remarks ?? null, attendanceId: rec?.id ?? null,
        };
      }));
    }
    if (p1 === "daily" && method === "POST") {
      for (const r of body.records ?? []) {
        const existing = d.attendanceRecords.find((x: any) => x.studentProfileId === r.studentProfileId && x.classSectionId === body.classSectionId && x.date === body.date);
        if (existing) Object.assign(existing, { status: r.status, remarks: r.remarks ?? null });
        else d.attendanceRecords.push({ id: uid("att-r"), studentProfileId: r.studentProfileId, classSectionId: body.classSectionId, date: body.date, status: r.status, remarks: r.remarks ?? null });
      }
      return ok({ recorded: (body.records ?? []).length }, { status: 201 });
    }
    if (p1 === "reports") {
      if (p2 === "class-section") return ok(attendanceSummaryFor(d.attendanceRecords.filter((r: any) => r.classSectionId === p3)));
      if (p2 === "monthly") {
        const s = attendanceSummaryFor(d.attendanceRecords);
        return ok([{ month: new Date().toISOString().slice(0, 7), ...s }]);
      }
      if (p2 === "absence-trends") {
        const byDate: Record<string, { absentCount: number; lateCount: number }> = {};
        for (const r of d.attendanceRecords) {
          byDate[r.date] ??= { absentCount: 0, lateCount: 0 };
          if (r.status === "ABSENT") byDate[r.date].absentCount++;
          if (r.status === "LATE") byDate[r.date].lateCount++;
        }
        return ok(Object.entries(byDate).map(([date, v]) => ({ date, ...v })));
      }
      if (p2 === "at-risk") {
        return ok([{
          studentProfileId: "sp-4", fullName: "Lucas Brooks", classSectionName: "Year 7 Alpha", classSectionId: "cs-7a",
          attendanceRate: 72, absentCount: 5, lateCount: 2, totalClasses: 25,
        }]);
      }
    }
    if (p1 === "student" && p3 === "summary") {
      return ok(attendanceSummaryFor(d.attendanceRecords.filter((r: any) => r.studentProfileId === p2)));
    }
  }

  // ── Timetables ──
  if (p0 === "timetables") {
    const withSlots = (t: any) => ({ ...t, slots: d.timetableSlots.filter((s: any) => s.timetableId === t.id) });
    if (p1 === "conflicts" && method === "POST") return ok([]);
    if (p1 === "schedule") {
      if (p2 === "student") {
        const spf = d.studentProfiles.find((s: any) => s.id === p3);
        const sections = (spf?.placements ?? []).map((p: any) => p.classSectionId);
        return ok(d.timetableSlots.filter((s: any) => sections.includes(s.classSectionId)));
      }
      if (p2 === "teacher") return ok(d.timetableSlots.filter((s: any) => s.teacherProfileId === p3));
      if (p2 === "class-section") return ok(d.timetableSlots.filter((s: any) => s.classSectionId === p3));
    }
    if (!p1) {
      if (method === "POST") {
        const t = { id: uid("tt"), status: "DRAFT", publishedAt: null, createdById: me.id, createdAt: nowIso(), updatedAt: nowIso(), ...body };
        d.timetables.push(t);
        return ok(withSlots(t), { status: 201 });
      }
      let rows = d.timetables;
      if (sp.get("classSectionId")) rows = rows.filter((t: any) => t.classSectionId === sp.get("classSectionId"));
      return listResponse(rows.map(withSlots), sp);
    }
    const t = d.timetables.find((x: any) => x.id === p1);
    if (!t) return fail(404, "NOT_FOUND", "Timetable not found");
    if (p2 === "publish" && method === "POST") { t.status = "PUBLISHED"; t.publishedAt = nowIso(); return ok(withSlots(t)); }
    if (p2 === "slots") {
      if (p3 === "bulk-upsert" && method === "POST") {
        for (const s of body.slots ?? []) {
          const existing = d.timetableSlots.find((x: any) => x.id === s.id);
          if (existing) Object.assign(existing, s, { updatedAt: nowIso() });
          else d.timetableSlots.push(decorateSlot({ id: uid("ts"), timetableId: t.id, status: "ACTIVE", notes: null, createdAt: nowIso(), updatedAt: nowIso(), ...s }));
        }
        return ok(withSlots(t));
      }
      if (!p3 && method === "POST") {
        const slot = decorateSlot({ id: uid("ts"), timetableId: t.id, status: "ACTIVE", notes: null, createdAt: nowIso(), updatedAt: nowIso(), ...body });
        d.timetableSlots.push(slot);
        return ok(slot, { status: 201 });
      }
      const slot = d.timetableSlots.find((x: any) => x.id === p3);
      if (!slot) return fail(404, "NOT_FOUND", "Slot not found");
      if (method === "PATCH") { Object.assign(slot, body, { updatedAt: nowIso() }); decorateSlot(slot); return ok(slot); }
      if (method === "DELETE") { d.timetableSlots = d.timetableSlots.filter((x: any) => x.id !== p3); return ok(null); }
    }
    if (method === "PATCH") { Object.assign(t, body, { updatedAt: nowIso() }); return ok(withSlots(t)); }
    if (method === "DELETE") { d.timetables = d.timetables.filter((x: any) => x.id !== p1); return ok(null); }
    return ok(withSlots(t));
  }

  // ── Teacher profiles (custom bits before the generic fallback) ──
  if (p0 === "teacher-profiles") {
    if (p1 === "me") {
      const tp = me.teacherProfileId
        ? d.teacherProfiles.find((t: any) => t.id === me.teacherProfileId)
        : d.teacherProfiles[0];
      return ok(tp ?? null);
    }
    if (p2 === "classes") {
      const tp = d.teacherProfiles.find((t: any) => t.id === p1);
      if (!tp) return fail(404, "NOT_FOUND", "Teacher not found");
      if (method === "POST") {
        tp.classAssignments.push({ teacherProfileId: tp.id, classSectionId: body.classSectionId, role: body.role ?? "SUBJECT", assignedAt: nowIso(), classSection: d.classSections.find((c: any) => c.id === body.classSectionId) });
        return ok(tp);
      }
      if (method === "DELETE") {
        tp.classAssignments = tp.classAssignments.filter((c: any) => c.classSectionId !== p3);
        return ok(tp);
      }
      return ok(tp.classAssignments);
    }
  }

  // ── Gradebook ──
  if (p0 === "gradebook") {
    if (p1 === "course-class") {
      const entries = d.gradebookEntries.filter((e: any) => e.courseClassId === p2);
      const students = d.studentProfiles
        .filter((s: any) => (s.enrollments ?? []).some((e: any) => e.courseClassId === p2))
        .map((s: any) => ({ id: s.id, fullName: s.fullName }));
      if (p3 === "summary") {
        return ok(students.map((s: any) => ({
          studentId: s.id, fullName: s.fullName,
          categoryAverages: { HOMEWORK: 85, ASSESSMENT: 72 },
          termAverage: 78, gpa: 3.1, letterGrade: "B", classRank: 2, classPercentile: 80,
        })));
      }
      return ok({ students, entries });
    }
    if (p1 === "class-section") {
      const roster = d.studentProfiles.filter((s: any) => s.placements?.some((p: any) => p.classSectionId === p2));
      const ids = roster.map((s: any) => s.id);
      return ok({
        students: roster.map((s: any) => ({ id: s.id, fullName: s.fullName })),
        entries: d.gradebookEntries.filter((e: any) => ids.includes(e.studentProfileId)),
      });
    }
    if (p1 === "student") {
      const entries = d.gradebookEntries.filter((e: any) => e.studentProfileId === p2);
      if (p3 === "summary") {
        return ok({ categoryAverages: { HOMEWORK: 90, ASSESSMENT: 75, CLASSWORK: 88 }, termAverage: 84, gpa: 3.4, letterGrade: "B+", classRank: 2, classPercentile: 85 });
      }
      return ok(entries);
    }
    if (p1 === "manual-entry" && method === "POST") {
      const e = {
        id: uid("gb"), sourceType: "MANUAL", sourceId: body.sourceId ?? null, category: body.category ?? "CLASSWORK",
        weight: body.weight ?? 1, status: body.status ?? "DRAFT", notes: body.notes ?? null,
        percentage: body.pointsEarned != null ? Math.round((body.pointsEarned / body.pointsPossible) * 100) : null,
        assessedAt: nowIso(), createdAt: nowIso(), updatedAt: nowIso(),
        courseClassId: body.courseClassId ?? null, classSectionId: body.classSectionId ?? null, termId: body.termId ?? null,
        ...body,
      };
      d.gradebookEntries.push(e);
      return ok(e, { status: 201 });
    }
    if (p1 === "entries") {
      if (p2 === "bulk" && method === "POST") return ok({ created: (body.entries ?? []).length });
      const e = d.gradebookEntries.find((x: any) => x.id === p2);
      if (!e) return fail(404, "NOT_FOUND", "Entry not found");
      if (method === "PATCH") {
        Object.assign(e, body, { updatedAt: nowIso() });
        if (e.pointsEarned != null && e.pointsPossible) e.percentage = Math.round((e.pointsEarned / e.pointsPossible) * 100);
        return ok(e);
      }
      if (method === "DELETE") { d.gradebookEntries = d.gradebookEntries.filter((x: any) => x.id !== p2); return ok(null); }
    }
    if (p1 === "sync" && method === "POST") return ok({ synced: 0 });
  }

  // ── Messaging ──
  if (p0 === "messages") {
    const visible = d.messageThreads.filter((t: any) =>
      t.guardianUserId === me.id || t.teacherUserId === me.id || me.roleNames.includes("SUPER_ADMIN") || me.roleNames.includes("ADMIN"));
    const withMeta = (t: any) => ({
      ...t,
      messages: d.messages.filter((m: any) => m.threadId === t.id),
      unreadCount: d.messages.filter((m: any) => m.threadId === t.id && m.senderUserId !== me.id && !m.readAt).length,
    });
    if (p1 === "unread-count") {
      const ids = visible.map((t: any) => t.id);
      return ok({ count: d.messages.filter((m: any) => ids.includes(m.threadId) && m.senderUserId !== me.id && !m.readAt).length });
    }
    if (p1 === "threads") {
      if (!p2) {
        if (method === "POST") {
          const spf = d.studentProfiles.find((s: any) => s.id === body.studentProfileId);
          const thread = {
            id: uid("th"), subject: body.subject ?? "New conversation",
            studentProfileId: body.studentProfileId ?? null,
            guardianUserId: me.roleNames.includes("GUARDIAN") ? me.id : "u-guardian",
            teacherUserId: body.teacherUserId ?? (me.roleNames.includes("TEACHER") ? me.id : "u-turing"),
            status: "OPEN", lastMessageAt: nowIso(), createdAt: nowIso(),
            studentProfile: spf && { id: spf.id, fullName: spf.fullName },
            guardian: { id: "u-guardian", firstName: "Sarah", lastName: "Harris", avatarUrl: null },
            teacher: { id: "u-turing", firstName: "Alan", lastName: "Turing", avatarUrl: null },
          };
          d.messageThreads.unshift(thread);
          if (body.body) {
            d.messages.push({ id: uid("msg"), threadId: thread.id, senderUserId: me.id, body: body.body, readAt: null, attachmentUrls: [], createdAt: nowIso(), sender: { id: me.id, firstName: me.firstName, lastName: me.lastName, avatarUrl: null } });
          }
          return ok(withMeta(thread), { status: 201 });
        }
        return ok(visible.map(withMeta));
      }
      const thread = d.messageThreads.find((t: any) => t.id === p2);
      if (!thread) return fail(404, "NOT_FOUND", "Thread not found");
      if (p3 === "read" && method === "POST") {
        d.messages.forEach((m: any) => { if (m.threadId === thread.id && m.senderUserId !== me.id) m.readAt = nowIso(); });
        return ok(withMeta(thread));
      }
      if (method === "POST") {
        const msg = { id: uid("msg"), threadId: thread.id, senderUserId: me.id, body: body.body ?? "", readAt: null, attachmentUrls: body.attachmentUrls ?? [], createdAt: nowIso(), sender: { id: me.id, firstName: me.firstName, lastName: me.lastName, avatarUrl: null } };
        d.messages.push(msg);
        thread.lastMessageAt = msg.createdAt;
        return ok(msg, { status: 201 });
      }
      return ok(withMeta(thread));
    }
  }

  // ── Student portal ──
  if (p0 === "gamification") {
    const spf = studentProfileForUser(me);
    const gam = (spf && d.gamification[spf.id]) || { experience: { totalXp: 0, level: 1, nextLevelXp: 100 }, streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null }, lessonsCompleted: 0 };
    if (p1 === "me" && !p2) return ok(gam);
    if (p1 === "me" && p2 === "badges") return ok(d.badges);
    if (p1 === "leaderboard") {
      const meRow = spf ? d.leaderboard.find((r: any) => r.studentProfileId === spf.id) ?? null : null;
      return ok({ data: d.leaderboard, me: meRow });
    }
  }

  // ── Teacher portal ──
  if (p0 === "teacher") {
    if (p1 === "classes") {
      const tp = me.teacherProfileId ? d.teacherProfiles.find((t: any) => t.id === me.teacherProfileId) : d.teacherProfiles[0];
      const sections = (tp?.classAssignments ?? []).map((c: any) => c.classSectionId);
      return ok(d.classSections.filter((c: any) => sections.includes(c.id)).map((c: any) => ({
        classSectionId: c.id, name: c.name, code: c.code,
        rosterCount: d.studentProfiles.filter((s: any) => s.placements?.some((p: any) => p.classSectionId === c.id)).length,
        isAttendanceMarkedToday: c.id === "cs-7a",
      })));
    }
    if (p1 === "alerts") {
      return ok([
        { studentProfileId: "sp-4", fullName: "Lucas Brooks", classSectionName: "Year 7 Alpha", reason: "LOW_ATTENDANCE", metric: "72% attendance" },
        { studentProfileId: "sp-2", fullName: "Elijah Miller", classSectionName: "Year 7 Alpha", reason: "LOW_GRADE", metric: "60% on Algebra Basics Quiz" },
      ]);
    }
  }

  // ── Parent portal ──
  if (p0 === "parent") {
    if (p1 === "children" && !p2) return ok(mockChildren());
    if (p1 === "children" && p2) {
      const spf = d.studentProfiles.find((s: any) => s.id === p2);
      if (!spf) return fail(404, "NOT_FOUND", "Child not found");
      if (p3 === "teachers") {
        return ok(d.teacherProfiles.map((t: any) => ({
          id: t.id, teacherProfileId: t.id, fullName: t.fullName,
          specialization: t.specialization, email: t.user.email,
        })));
      }
      if (p3 === "attendance") {
        return ok(d.attendanceRecords.filter((r: any) => r.studentProfileId === p2).map((r: any) => ({ date: r.date, status: r.status, remarks: r.remarks })));
      }
      if (p3 === "homework") {
        const enrolled = (spf.enrollments ?? []).map((e: any) => e.courseClassId);
        return ok(d.homework.filter((h: any) => enrolled.includes(h.courseClassId)).map((h: any) => {
          const sub = d.homeworkSubmissions.find((s: any) => s.homeworkId === h.id && s.studentProfileId === p2);
          return {
            id: h.id, title: h.title, description: h.description, dueDate: h.dueDate,
            courseName: h.courseClass?.name, pointsPossible: h.maxPoints,
            submission: sub ? { id: sub.id, status: sub.status, pointsEarned: sub.pointsEarned, feedback: sub.feedback, submissionDate: sub.submissionDate } : null,
          };
        }));
      }
      if (p3 === "grades") return ok(d.gradebookEntries.filter((e: any) => e.studentProfileId === p2 && e.status === "PUBLISHED"));
      if (p3 === "learning") {
        const gam = d.gamification[p2] ?? { experience: { totalXp: 0, level: 1 }, streak: { currentStreak: 0, longestStreak: 0 }, lessonsCompleted: 0 };
        return ok({
          lessonsCompleted: gam.lessonsCompleted, currentStreak: gam.streak.currentStreak,
          longestStreak: gam.streak.longestStreak, totalXp: gam.experience.totalXp, level: gam.experience.level,
          mastery: [
            { competencyName: "Linear Equations", masteryScore: 78, status: "DEVELOPING" },
            { competencyName: "Fractions & Ratios", masteryScore: 91, status: "NEAR_MASTERY" },
          ],
        });
      }
    }
    if (p1 === "billing" && p2 === "invoices") return ok(d.familyInvoices);
    if (p1 === "billing" && p2 === "payments") return ok(d.familyPayments);
  }

  // ── Generic REST fallback ──
  const key = COLLECTIONS[p0];
  if (key) {
    const rows: any[] = d[key];
    if (!p1) {
      if (method === "POST") {
        const row = { id: uid(p0.slice(0, 3)), status: "ACTIVE", createdAt: nowIso(), updatedAt: nowIso(), ...body };
        rows.push(row);
        return ok(row, { status: 201 });
      }
      let filtered = rows;
      const status = sp.get("status");
      if (status) filtered = filtered.filter((r: any) => String(r.status).toLowerCase() === status.toLowerCase());
      const search = sp.get("search");
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter((r: any) => JSON.stringify(r).toLowerCase().includes(q));
      }
      return listResponse(filtered, sp);
    }
    const row = rows.find((r: any) => r.id === p1);
    if (p2 === "restore" && row) { row.deletedAt = null; return ok(row); }
    if (p2 === "decision" && row && method === "PATCH") { Object.assign(row, body); return ok(row); }
    if (p2 === "cancel" && row) { row.status = "CANCELLED"; row.cancelledAt = nowIso(); return ok(row); }
    if (p2 === "start" && row) { row.status = "LIVE"; return ok(row); }
    if (p2 === "end" && row) { row.status = "ENDED"; return ok(row); }
    if (!row) return fail(404, "NOT_FOUND", `${p0}/${p1} not found`);
    if (method === "PATCH" || method === "PUT") { Object.assign(row, body, { updatedAt: nowIso() }); return ok(row); }
    if (method === "DELETE") { d[key] = rows.filter((r: any) => r.id !== p1); return ok(null); }
    return ok(row);
  }

  return fail(404, "NOT_FOUND", `Mock API has no handler for ${method} /${path.join("/")}`);
}

function decorateSlot(slot: any) {
  const d = db();
  slot.courseClass = d.courseClasses.find((c: any) => c.id === slot.courseClassId) ?? slot.courseClass ?? null;
  const tp = d.teacherProfiles.find((t: any) => t.id === slot.teacherProfileId);
  slot.teacherProfile = tp ? { id: tp.id, fullName: tp.fullName } : (slot.teacherProfile ?? null);
  const cs = d.classSections.find((c: any) => c.id === slot.classSectionId);
  slot.classSection = cs ? { id: cs.id, name: cs.name, code: cs.code } : (slot.classSection ?? null);
  return slot;
}

function mockChildren() {
  const d = db();
  return ["sp-1", "sp-2"].map((id) => {
    const s = d.studentProfiles.find((x: any) => x.id === id);
    const records = d.attendanceRecords.filter((r: any) => r.studentProfileId === id);
    const summary = attendanceSummaryFor(records);
    const enrolled = (s.enrollments ?? []).map((e: any) => e.courseClassId);
    const done = d.homeworkSubmissions.filter((x: any) => x.studentProfileId === id).map((x: any) => x.homeworkId);
    const pending = d.homework.filter((h: any) => enrolled.includes(h.courseClassId) && !done.includes(h.id)).length;
    const latest = d.gradebookEntries
      .filter((e: any) => e.studentProfileId === id && e.status === "PUBLISHED" && e.percentage != null)
      .sort((a: any, b: any) => String(b.assessedAt).localeCompare(String(a.assessedAt)))[0];
    return {
      studentProfileId: id, fullName: s.fullName, birthDate: s.birthDate, gender: s.gender,
      classSection: s.placements?.[0]?.classSection ?? null,
      attendanceRate: summary.attendanceRate, pendingHomeworkCount: pending,
      latestGrade: latest ? { title: latest.title, percentage: latest.percentage, pointsEarned: latest.pointsEarned, pointsPossible: latest.pointsPossible, assessedAt: latest.assessedAt } : null,
    };
  });
}

export { handle as DELETE, handle as GET, handle as PATCH, handle as POST, handle as PUT };
