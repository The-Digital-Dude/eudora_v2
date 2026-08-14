import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardianAccessService } from '../family/guardian-access.service';
import { CatalogService } from '../catalog/catalog.service';
import { StudentService } from '../student/student.service';

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
    private readonly guardianAccessService: GuardianAccessService,
    private readonly catalogService: CatalogService,
    private readonly studentService: StudentService,
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

    if (!guardianProfile) {
      throw new NotFoundException('Guardian profile not found');
    }

    const childrenData = [];

    for (const rel of guardianProfile.students) {
      const child = rel.studentProfile;
      const classSection =
        child.placements.find((p) => p.isActive)?.classSection || null;
      const courseClassIds = child.enrollments.map((e) => e.courseClassId);

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
      const attendanceRate =
        totalAttendance > 0
          ? Math.round((presentAttendance / totalAttendance) * 100)
          : 100;

      // 2. Calculate Pending Homework Count
      let pendingHomeworkCount = 0;
      if (courseClassIds.length > 0) {
        const homework = await this.prisma.homework.findMany({
          where: { courseClassId: { in: courseClassIds } },
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

  async getChildTeachers(studentProfileId: string) {
    const placements = await this.prisma.studentClassPlacement.findMany({
      where: { studentProfileId, isActive: true },
      select: { classSectionId: true },
    });

    const classSectionIds = placements.map((p) => p.classSectionId);
    if (classSectionIds.length === 0) {
      return [];
    }

    const classTeachers = await this.prisma.classTeacher.findMany({
      where: { classSectionId: { in: classSectionIds } },
      include: {
        teacherProfile: {
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
        },
      },
    });

    const teachersMap = new Map();
    for (const ct of classTeachers) {
      const u = ct.teacherProfile?.user;
      if (u) {
        teachersMap.set(u.id, {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          avatarUrl: u.avatarUrl,
          specialization: ct.teacherProfile.specialization,
        });
      }
    }

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

    const courseClassIds = student.enrollments.map((e) => e.courseClassId);
    if (courseClassIds.length === 0) {
      return [];
    }

    const homework = await this.prisma.homework.findMany({
      where: { courseClassId: { in: courseClassIds } },
      include: {
        courseClass: { select: { name: true } },
        submissions: {
          where: { studentProfileId },
          select: {
            id: true,
            status: true,
            submissionDate: true,
            feedback: true,
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
      courseName: hw.courseClass.name,
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
        courseClass: { select: { name: true } },
        term: { select: { name: true } },
      },
      orderBy: { assessedAt: 'desc' },
    });

    return grades;
  }

  /** Read-only active-learning summary for the parent portal. */
  async getChildLearning(studentProfileId: string) {
    const [lessonsCompleted, streak, experience, mastery] = await Promise.all([
      this.prisma.lessonAttempt.count({
        where: { studentProfileId, status: 'COMPLETED' },
      }),
      this.prisma.studentStreak.findUnique({ where: { studentProfileId } }),
      this.prisma.studentExperience.findUnique({ where: { studentProfileId } }),
      this.prisma.competencyMastery.findMany({
        where: { studentProfileId },
        include: { competency: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 6,
      }),
    ]);

    return {
      lessonsCompleted,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      totalXp: experience?.totalXp ?? 0,
      level: experience?.level ?? 1,
      mastery: mastery.map((m) => ({
        competencyName: m.competency.name,
        masteryScore: m.masteryScore,
        status: m.status,
      })),
    };
  }

  async getInvoices(userId: string) {
    const familyId =
      await this.guardianAccessService.getGuardianFamilyId(userId);
    if (!familyId) {
      return [];
    }

    const invoices = await this.prisma.familyInvoice.findMany({
      where: { familyId },
      orderBy: { dueDate: 'desc' },
    });

    return invoices;
  }

  async getPayments(userId: string) {
    const familyId =
      await this.guardianAccessService.getGuardianFamilyId(userId);
    if (!familyId) {
      return [];
    }

    const payments = await this.prisma.familyPayment.findMany({
      where: { familyId },
      orderBy: { paymentDate: 'desc' },
    });

    return payments;
  }

  // --- Learning plan (catalog course assignment) ---------------------------
  // Ownership is enforced by `GuardianScopeGuard` on the routes; these methods
  // assume the caller is already authorized for `studentProfileId`.

  /**
   * Catalog courses available to this child, each flagged with whether it's
   * already in their learning plan. Reuses `CatalogService.listCourses` so the
   * PUBLISHED visibility rule stays in exactly one place rather than being
   * re-implemented here.
   */
  async getAvailableCourses(studentProfileId: string) {
    return this.catalogService.listCourses(
      undefined,
      false,
      studentProfileId,
    );
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
    const visible = await this.catalogService.listCourses(undefined, false);
    if (!visible.some((course) => course.id === courseId)) {
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
    return this.prisma.courseClass.findMany({
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
        select: { courseClassId: true },
      }),
    ]);
    const enrolledIds = new Set(enrollments.map((e) => e.courseClassId));
    return classes
      .filter((cls) => cls.capacity === null || cls._count.enrollments < cls.capacity)
      .map((cls) => ({ ...cls, isEnrolled: enrolledIds.has(cls.id) }));
  }

  async getClassEnrollments(studentProfileId: string) {
    return this.prisma.studentCourseEnrollment.findMany({
      where: { studentProfileId },
      include: {
        courseClass: {
          include: {
            term: { select: { id: true, name: true, endDate: true } },
          },
        },
      },
      orderBy: { enrollmentDate: 'desc' },
    });
  }

  async enrollInClass(studentProfileId: string, courseClassId: string) {
    // Re-run every condition server-side — the client's "available" list is
    // convenience, not the security/business-rule boundary. Same rationale
    // as `assignCourse` re-checking campus visibility above.
    const open = await this.listOpenClassesForStudent();
    const target = open.find((cls) => cls.id === courseClassId);
    if (!target) {
      throw new NotFoundException('This class is not open for enrollment');
    }

    // Ownership-style check before the capacity check: if this student is
    // already enrolled, that enrollment may itself be occupying the last
    // seat — checking capacity first would misreport an existing enrollment
    // as "class is full" instead of the actually-true "already enrolled".
    const existing = await this.prisma.studentCourseEnrollment.findUnique({
      where: {
        studentProfileId_courseClassId: { studentProfileId, courseClassId },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Student is already enrolled in this course class',
      );
    }

    if (target.capacity !== null && target._count.enrollments >= target.capacity) {
      throw new ForbiddenException('This class is full');
    }

    return this.studentService.createEnrollment({
      studentProfileId,
      courseClassId,
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
}
