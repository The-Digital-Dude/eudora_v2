import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Gender, GradeBand } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CatalogService } from '../catalog/catalog.service';
import { StudentService } from '../student/student.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

/**
 * Rough age-to-grade-band mapping, used only when a child has no class set.
 * Ages are the typical US entry ages for each band; a child sitting on a
 * boundary gets the lower band, which under-reaches rather than suggesting
 * work that is too hard. Returns null when the age is outside K-6 entirely,
 * so the caller falls back to unfiltered popular courses instead of showing
 * nothing.
 */
function gradeBandForBirthDate(birthDate: Date | null): GradeBand | null {
  if (!birthDate) return null;
  const ageMs = Date.now() - birthDate.getTime();
  const age = Math.floor(ageMs / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 4 || age > 12) return null;
  if (age <= 5) return 'PRE_K_K';
  if (age <= 7) return 'G1_2';
  if (age <= 9) return 'G3_4';
  return 'G5_6';
}

/** Course fields the learning-plan surfaces need — matches `listCourses`. */
const ASSIGNED_COURSE_INCLUDE = {
  course: {
    include: {
      learningSubject: { select: { id: true, name: true, code: true } },
      _count: { select: { concepts: true } },
    },
  },
} as const;

@Injectable()
export class ParentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalogService: CatalogService,
    private readonly studentService: StudentService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async getChildren(userId: string) {
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        students: {
          include: {
            studentProfile: {
              include: {
                placements: {
                  where: { isActive: true },
                  include: { classSection: true },
                },
                enrollments: true,
              },
            },
          },
        },
      },
    });

    // No profile means no children, not an error. This used to 404, which the
    // portal surfaced as a broken page for any guardian whose profile had not
    // been created yet — and since the portal's own "add your first child"
    // form is the thing that fixes that, the panel could not repair itself.
    // Registration now creates the profile up front, so this only covers
    // accounts that predate that.
    if (!guardianProfile) {
      return [];
    }

    const childrenData = [];

    for (const rel of guardianProfile.students) {
      const child = rel.studentProfile;
      const classSection =
        child.placements.find((p) => p.isActive)?.classSection || null;
      const batchIds = child.enrollments.map((e) => e.batchId);

      // 1. Calculate Attendance Rate
      const totalAttendance = await this.prisma.dailyAttendance.count({
        where: { studentProfileId: child.id },
      });
      const presentAttendance = await this.prisma.dailyAttendance.count({
        where: {
          studentProfileId: child.id,
          status: { in: ['PRESENT', 'LATE'] },
        },
      });
      // Null, not 100, when nothing has ever been recorded. A child with no
      // attendance history is not a child with perfect attendance — and a
      // guardian-created child never gets a ClassSection placement, so this
      // is the normal case for a self-service customer, not an edge case.
      // Callers render "not tracked" rather than a number.
      const attendanceRate =
        totalAttendance > 0
          ? Math.round((presentAttendance / totalAttendance) * 100)
          : null;

      // 2. Calculate Pending Homework Count
      let pendingHomeworkCount = 0;
      if (batchIds.length > 0) {
        const homework = await this.prisma.homework.findMany({
          where: { batchId: { in: batchIds } },
          include: {
            submissions: {
              where: { studentProfileId: child.id },
            },
          },
        });
        pendingHomeworkCount = homework.filter(
          (hw) => hw.submissions.length === 0,
        ).length;
      }

      // 3. Find Latest Grade
      const latestGrade = await this.prisma.gradeBookEntry.findFirst({
        where: {
          studentProfileId: child.id,
          status: 'PUBLISHED',
        },
        orderBy: { assessedAt: 'desc' },
      });

      childrenData.push({
        studentProfileId: child.id,
        fullName: child.fullName,
        birthDate: child.birthDate,
        gender: child.gender,
        classSection: classSection
          ? {
              id: classSection.id,
              name: classSection.name,
              code: classSection.code,
            }
          : null,
        attendanceRate,
        pendingHomeworkCount,
        latestGrade: latestGrade
          ? {
              title: latestGrade.title,
              percentage: latestGrade.percentage,
              pointsEarned: latestGrade.pointsEarned,
              pointsPossible: latestGrade.pointsPossible,
              assessedAt: latestGrade.assessedAt,
            }
          : null,
      });
    }

    return childrenData;
  }

  /**
   * Everyone who actually teaches this child, by every route they can have one.
   *
   * This used to resolve only through `StudentClassPlacement` -> `ClassTeacher`.
   * A child created through the guardian portal never receives a placement —
   * `createChild` does not make one — so a guardian who had bought a course was
   * told their child has no teachers at all. The purchase routes are the other
   * two: a course they are entitled to has `CourseTeacher`s, and a cohort seat
   * has the batch's lead teacher.
   */
  async getChildTeachers(studentProfileId: string) {
    const [placements, enrollments, entitledCourseIds] = await Promise.all([
      this.prisma.studentClassPlacement.findMany({
        where: { studentProfileId, isActive: true },
        select: { classSectionId: true },
      }),
      this.prisma.studentCourseEnrollment.findMany({
        where: { studentProfileId },
        select: { batchId: true },
      }),
      this.entitlements.entitledCourseIdsForStudent(studentProfileId),
    ]);

    const teacherProfileSelect = {
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    } as const;

    const classSectionIds = placements.map((p) => p.classSectionId);
    const batchIds = enrollments.map((e) => e.batchId);
    const courseIds = Array.from(entitledCourseIds);

    const [classTeachers, courseTeachers, batches] = await Promise.all([
      classSectionIds.length
        ? this.prisma.classTeacher.findMany({
            where: { classSectionId: { in: classSectionIds } },
            include: { teacherProfile: teacherProfileSelect },
          })
        : [],
      courseIds.length
        ? this.prisma.courseTeacher.findMany({
            where: { courseId: { in: courseIds } },
            include: { teacherProfile: teacherProfileSelect },
          })
        : [],
      batchIds.length
        ? this.prisma.batch.findMany({
            where: {
              id: { in: batchIds },
              leadTeacherProfileId: { not: null },
            },
            select: { leadTeacher: teacherProfileSelect },
          })
        : [],
    ]);

    // Deduped by user: one teacher reached by two routes is still one teacher.
    const teachersMap = new Map<string, unknown>();
    const add = (
      profile: {
        specialization: string | null;
        user: {
          id: string;
          firstName: string;
          lastName: string;
          avatarUrl: string | null;
        } | null;
      } | null,
    ) => {
      const u = profile?.user;
      if (!u || teachersMap.has(u.id)) return;
      teachersMap.set(u.id, {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        specialization: profile.specialization,
      });
    };

    for (const ct of classTeachers) add(ct.teacherProfile);
    for (const ct of courseTeachers) add(ct.teacherProfile);
    for (const b of batches) add(b.leadTeacher);

    return Array.from(teachersMap.values());
  }

  async getChildAttendance(studentProfileId: string) {
    const records = await this.prisma.dailyAttendance.findMany({
      where: { studentProfileId },
      orderBy: { date: 'desc' },
      include: {
        classSection: { select: { name: true } },
      },
    });

    return records;
  }

  async getChildHomework(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { enrollments: true },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const batchIds = student.enrollments.map((e) => e.batchId);
    if (batchIds.length === 0) {
      return [];
    }

    const homework = await this.prisma.homework.findMany({
      where: { batchId: { in: batchIds } },
      include: {
        batch: { select: { name: true } },
        submissions: {
          where: { studentProfileId },
          select: {
            id: true,
            status: true,
            submissionDate: true,
            feedback: true,
            // The mark itself. Its absence is why the family portal rendered
            // "/ 100 pts" with nothing before the slash for every graded piece
            // of homework — the number a guardian opens the page to see.
            pointsEarned: true,
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    });

    return homework.map((hw) => ({
      id: hw.id,
      title: hw.title,
      description: hw.description,
      dueDate: hw.dueDate,
      pointsPossible: hw.maxPoints,
      // This query selects on batchId, so a row here always has a batch. The
      // optional chain is for the type only, now that cohort membership is no
      // longer guaranteed on the model. Course-checkpoint homework does not
      // appear in this list yet.
      courseName: hw.batch?.name ?? null,
      submission: hw.submissions[0] || null,
    }));
  }

  async getChildGrades(studentProfileId: string) {
    const grades = await this.prisma.gradeBookEntry.findMany({
      where: {
        studentProfileId,
        status: 'PUBLISHED',
      },
      include: {
        batch: { select: { name: true } },
        term: { select: { name: true } },
      },
      orderBy: { assessedAt: 'desc' },
    });

    return grades;
  }

  /** Read-only active-learning summary for the parent portal. */
  async getChildLearning(studentProfileId: string) {
    const [lessonsCompleted, streak, experience] = await Promise.all([
      this.prisma.lessonAttempt.count({
        where: { studentProfileId, status: 'COMPLETED' },
      }),
      this.prisma.studentStreak.findUnique({ where: { studentProfileId } }),
      this.prisma.studentExperience.findUnique({ where: { studentProfileId } }),
    ]);

    return {
      lessonsCompleted,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalXp: experience?.totalXp ?? 0,
      level: experience?.level ?? 1,
    };
  }

  // --- Learning plan (catalog course assignment) ---------------------------
  // Ownership is enforced by `GuardianScopeGuard` on the routes; these methods
  // assume the caller is already authorized for `studentProfileId`.

  /**
   * Catalog courses available to this child, each flagged with whether it's
   * already in their learning plan. Reuses `CatalogService.listCourses` so the
   * PUBLISHED visibility rule stays in exactly one place rather than being
   * re-implemented here.
   *
   * Search and paging are passed straight through: listCourses has supported
   * both all along, but this method used to discard them along with the count,
   * which forced the client to pull the whole catalogue (a 500-row default) and
   * filter in the browser.
   */
  async getAvailableCourses(
    studentProfileId: string,
    opts: { search?: string; page?: number; limit?: number } = {},
  ) {
    return this.catalogService.listCourses(
      undefined,
      false,
      studentProfileId,
      opts.page ?? 1,
      opts.limit ?? 24,
      opts.search,
    );
  }

  /**
   * Courses worth suggesting for this child.
   *
   * Two signals, in order of confidence:
   *   1. The child's class, walked through the programmes built on it
   *      (Class -> Program -> ProgramCourse -> Course). This is a curriculum
   *      decision someone actually made, so it beats any inference.
   *   2. Failing that (no class set yet, which is the common case right after
   *      sign-up), the course's own `gradeBand` mapped from the child's age.
   *
   * Deliberately the single place recommendations are resolved: swapping in
   * placement-diagnostic results later means changing this method, not the
   * controller or the UI.
   */
  async getRecommendedCourses(studentProfileId: string, limit = 6) {
    const child = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { id: true, classId: true, birthDate: true },
    });
    if (!child) throw new NotFoundException('Student profile not found');

    // Anything already in the plan, or already owned, is not a suggestion.
    const [assigned, entitled] = await Promise.all([
      this.prisma.studentCourseAssignment.findMany({
        where: { studentProfileId },
        select: { courseId: true },
      }),
      this.prisma.entitlement.findMany({
        where: { studentProfileId, status: 'ACTIVE', courseId: { not: null } },
        select: { courseId: true },
      }),
    ]);
    const excludeIds = [
      ...assigned.map((a) => a.courseId),
      ...entitled.map((e) => e.courseId as string),
    ];

    const baseWhere = {
      deletedAt: null,
      status: 'PUBLISHED' as const,
      ...(excludeIds.length ? { id: { notIn: excludeIds } } : {}),
    };

    const select = {
      id: true,
      title: true,
      slug: true,
      description: true,
      estimatedHours: true,
      gradeBand: true,
      thumbnailUrl: true,
      learningSubject: { select: { id: true, name: true, code: true } },
      _count: { select: { concepts: true } },
    };

    if (child.classId) {
      const courses = await this.prisma.course.findMany({
        where: {
          ...baseWhere,
          programCourses: {
            some: { program: { classId: child.classId, status: 'PUBLISHED' } },
          },
        },
        select,
        orderBy: { sortOrder: 'asc' },
        take: limit,
      });
      if (courses.length > 0) {
        return { items: courses, basis: 'CLASS' as const };
      }
      // Fall through when the class has no published programmes yet, so a
      // freshly-created class doesn't produce an empty panel.
    }

    const gradeBand = gradeBandForBirthDate(child.birthDate);
    const courses = await this.prisma.course.findMany({
      where: { ...baseWhere, ...(gradeBand ? { gradeBand } : {}) },
      select,
      orderBy: { sortOrder: 'asc' },
      take: limit,
    });

    return {
      items: courses,
      basis: gradeBand ? ('GRADE_BAND' as const) : ('POPULAR' as const),
    };
  }

  async getCourseAssignments(studentProfileId: string) {
    return this.prisma.studentCourseAssignment.findMany({
      where: { studentProfileId },
      include: ASSIGNED_COURSE_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async assignCourse(
    studentProfileId: string,
    courseId: string,
    assignedByUserId: string,
  ) {
    // Re-resolve visibility server-side rather than trusting the courseId the
    // client sent — otherwise a guardian could add an unpublished course to
    // their child's plan by guessing its id. Same "not found, not forbidden"
    // response as `getCourseDetail`, so this doesn't confirm existence either.
    // A direct existence check, not listCourses — that returns a bounded page
    // of results, so checking membership against it would incorrectly 404 a
    // real course sitting outside that page once the catalog grows past it.
    const visibleCount = await this.prisma.course.count({
      where: { id: courseId, deletedAt: null, status: 'PUBLISHED' },
    });
    if (visibleCount === 0) {
      throw new NotFoundException('Course not found');
    }

    // Upsert so a double-submit is idempotent instead of a unique-constraint
    // 500 — the plan is a set, not a log.
    return this.prisma.studentCourseAssignment.upsert({
      where: { studentProfileId_courseId: { studentProfileId, courseId } },
      update: {},
      create: { studentProfileId, courseId, assignedByUserId },
      include: ASSIGNED_COURSE_INCLUDE,
    });
  }

  async removeCourseAssignment(studentProfileId: string, courseId: string) {
    const existing = await this.prisma.studentCourseAssignment.findUnique({
      where: { studentProfileId_courseId: { studentProfileId, courseId } },
    });
    if (!existing) {
      throw new NotFoundException(
        "This course is not in the student's learning plan",
      );
    }
    await this.prisma.studentCourseAssignment.delete({
      where: { studentProfileId_courseId: { studentProfileId, courseId } },
    });
    return { message: 'Course removed from learning plan' };
  }

  // --- Class enrollment (registrar-adjacent — deliberately more locked down
  // than course assignment above). A class only appears/accepts enrollment
  // once staff has explicitly opted it in via `isOpenForEnrollment`; the
  // default-false migration made nothing self-enrollable by accident.

  private async listOpenClassesForStudent() {
    return this.prisma.batch.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        isOpenForEnrollment: true,
        term: { status: 'ACTIVE' },
      },
      include: {
        term: { select: { id: true, name: true, endDate: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAvailableClasses(studentProfileId: string) {
    const [classes, enrollments] = await Promise.all([
      this.listOpenClassesForStudent(),
      this.prisma.studentCourseEnrollment.findMany({
        where: { studentProfileId },
        select: { batchId: true },
      }),
    ]);
    const enrolledIds = new Set(enrollments.map((e) => e.batchId));
    return classes
      .filter(
        (cls) => cls.capacity === null || cls._count.enrollments < cls.capacity,
      )
      .map((cls) => ({ ...cls, isEnrolled: enrolledIds.has(cls.id) }));
  }

  async getClassEnrollments(studentProfileId: string) {
    return this.prisma.studentCourseEnrollment.findMany({
      where: { studentProfileId },
      include: {
        batch: {
          include: {
            term: { select: { id: true, name: true, endDate: true } },
          },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
    });
  }

  async enrollInClass(studentProfileId: string, batchId: string) {
    // Re-run every condition server-side — the client's "available" list is
    // convenience, not the security/business-rule boundary. Same rationale
    // as `assignCourse` re-checking campus visibility above.
    const open = await this.listOpenClassesForStudent();
    const target = open.find((cls) => cls.id === batchId);
    if (!target) {
      throw new NotFoundException('This class is not open for enrollment');
    }

    // Ownership-style check before the capacity check: if this student is
    // already enrolled, that enrollment may itself be occupying the last
    // seat — checking capacity first would misreport an existing enrollment
    // as "class is full" instead of the actually-true "already enrolled".
    const existing = await this.prisma.studentCourseEnrollment.findUnique({
      where: {
        studentProfileId_batchId: { studentProfileId, batchId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Student is already enrolled in this course class',
      );
    }

    if (
      target.capacity !== null &&
      target._count.enrollments >= target.capacity
    ) {
      throw new ForbiddenException('This class is full');
    }

    return this.studentService.createEnrollment({
      studentProfileId,
      batchId,
    });
  }

  async removeClassEnrollment(studentProfileId: string, enrollmentId: string) {
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.studentProfileId !== studentProfileId) {
      throw new NotFoundException('Enrollment not found');
    }
    return this.studentService.deleteEnrollment(enrollmentId);
  }

  // --- Adding a child -------------------------------------------------------

  /**
   * Creates a child under the calling guardian.
   *
   * This replaces link-by-email as the primary path. That flow required the
   * child to already hold their own account *and* to have opened a lesson (the
   * only non-admin way a `StudentProfile` came into existence), which is not
   * something a parent buying a phonics course for a five-year-old can do.
   *
   * The child gets a `User` because `StudentProfile.userId` is required, but
   * with no password and a non-deliverable address: they have no login of their
   * own and reach content through the guardian's session. Giving them real
   * credentials is deliberately deferred.
   */
  /**
   * Returns the caller's guardian profile, creating it if this account somehow
   * holds the GUARDIAN role without one. The name is seeded from the user
   * record and is editable afterwards — a placeholder is strictly better than
   * blocking the guardian from using their own portal.
   */
  private async ensureGuardianProfile(userId: string) {
    const existing = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) return existing;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, deletedAt: true },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.guardianProfile.create({
      data: {
        userId,
        fullName: `${user.firstName} ${user.lastName}`.trim() || user.email,
        email: user.email,
      },
      select: { id: true },
    });
  }

  async createChild(
    guardianUserId: string,
    input: {
      fullName: string;
      birthDate: string;
      classId?: string;
      gender?: Gender;
    },
  ) {
    // Created on demand rather than demanded up front. The caller already
    // holds the GUARDIAN role — that is what authorises this — and the profile
    // is only data, so refusing to add a child until some other page has been
    // visited was a dead end rather than a safeguard. Registration now writes
    // the profile at signup; this covers accounts that predate that.
    const guardian = await this.ensureGuardianProfile(guardianUserId);

    const birthDate = new Date(input.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('birthDate is not a valid date');
    }
    if (birthDate > new Date()) {
      throw new BadRequestException('birthDate cannot be in the future');
    }

    if (input.classId) {
      const klass = await this.prisma.class.findUnique({
        where: { id: input.classId },
        select: { id: true },
      });
      if (!klass) throw new NotFoundException('Class not found');
    }

    const [firstName, ...rest] = input.fullName.trim().split(/\s+/);

    return this.prisma.$transaction(async (tx) => {
      const childUser = await tx.user.create({
        data: {
          // Unique, obviously synthetic, and on a reserved TLD so it can never
          // collide with or accidentally deliver to a real inbox.
          email: `child.${randomUUID()}@no-login.eudora.invalid`,
          password: null,
          firstName: firstName || input.fullName,
          lastName: rest.join(' ') || '-',
        },
      });

      const profile = await tx.studentProfile.create({
        data: {
          userId: childUser.id,
          fullName: input.fullName.trim(),
          birthDate,
          gender: input.gender ?? 'OTHER',
          classId: input.classId ?? null,
        },
        include: { class: { select: { id: true, name: true, slug: true } } },
      });

      // First child added becomes the primary relationship. Counted inside the
      // transaction so two children added concurrently cannot both come out
      // primary. Previously this was hardcoded false directly beneath the
      // comment saying otherwise, so no child was ever primary.
      const existingLinks = await tx.guardianStudentRelationship.count({
        where: { guardianProfileId: guardian.id },
      });

      await tx.guardianStudentRelationship.create({
        data: {
          guardianProfileId: guardian.id,
          studentProfileId: profile.id,
          relationshipType: 'GUARDIAN',
          isPrimary: existingLinks === 0,
          hasFinancialResponsibility: true,
          hasAcademicAccess: true,
        },
      });

      return profile;
    });
  }
}
