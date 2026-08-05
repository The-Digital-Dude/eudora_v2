import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLearningSubjectDto,
  UpdateLearningSubjectDto,
  CreateCourseDto,
  UpdateCourseDto,
  CreateLearningPathDto,
  UpdateLearningPathDto,
  AddCourseToPathDto,
  ReorderPathCoursesDto,
} from './dto/catalog.dto';

type ConceptWithLessons = {
  id: string;
  sortOrder: number;
  kind: string;
  passThresholdPercent: number | null;
  lessons: { id: string }[];
};

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Learning Subjects ───────────────────────────────────────────────────

  async createLearningSubject(dto: CreateLearningSubjectDto) {
    const existing = await this.prisma.learningSubject.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(
        'A learning subject with this code already exists',
      );
    }
    return this.prisma.learningSubject.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description || null,
        icon: dto.icon || null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async listLearningSubjects() {
    return this.prisma.learningSubject.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updateLearningSubject(id: string, dto: UpdateLearningSubjectDto) {
    const subject = await this.prisma.learningSubject.findUnique({
      where: { id },
    });
    if (!subject) {
      throw new NotFoundException('Learning subject not found');
    }
    return this.prisma.learningSubject.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });
  }

  // ─── Courses ─────────────────────────────────────────────────────────────

  async createCourse(dto: CreateCourseDto) {
    const subject = await this.prisma.learningSubject.findUnique({
      where: { id: dto.learningSubjectId },
    });
    if (!subject) {
      throw new NotFoundException('Learning subject not found');
    }
    const existingSlug = await this.prisma.course.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new BadRequestException('A course with this slug already exists');
    }
    return this.prisma.course.create({
      data: {
        learningSubjectId: dto.learningSubjectId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description || null,
        estimatedHours: dto.estimatedHours ?? null,
        status: dto.status ?? 'DRAFT',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async listCourses(learningSubjectId?: string) {
    return this.prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(learningSubjectId ? { learningSubjectId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        learningSubject: { select: { id: true, name: true, code: true } },
        _count: { select: { concepts: true } },
      },
    });
  }

  async getCourseDetail(id: string, userId?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        learningSubject: true,
        concepts: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                sortOrder: true,
                xpReward: true,
              },
            },
            items: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    const studentProfileId = userId
      ? await this.resolveStudentProfileId(userId)
      : null;
    const unlockState = await this.computeConceptUnlockState(
      studentProfileId,
      course.concepts,
    );
    const stateByConcept = new Map(unlockState.map((s) => [s.conceptId, s]));

    const allItemIds = course.concepts.flatMap((c) =>
      c.items.map((i) => i.id),
    );
    const completedItemIds = studentProfileId
      ? await this.getCompletedModuleItemIds(studentProfileId, allItemIds)
      : new Set<string>();

    return {
      ...course,
      concepts: course.concepts.map((concept) => ({
        ...concept,
        isDone: stateByConcept.get(concept.id)?.isDone ?? false,
        isLocked: stateByConcept.get(concept.id)?.isLocked ?? false,
        items: concept.items.map((item) => ({
          ...item,
          isDone: completedItemIds.has(item.id),
        })),
      })),
    };
  }

  private async getCompletedModuleItemIds(
    studentProfileId: string,
    moduleItemIds: string[],
  ): Promise<Set<string>> {
    if (moduleItemIds.length === 0) {
      return new Set();
    }
    const completed = await this.prisma.moduleItemProgress.findMany({
      where: {
        studentProfileId,
        moduleItemId: { in: moduleItemIds },
        completedAt: { not: null },
      },
      select: { moduleItemId: true },
    });
    return new Set(completed.map((c) => c.moduleItemId));
  }

  async updateCourse(id: string, dto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }
    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.estimatedHours !== undefined
          ? { estimatedHours: dto.estimatedHours }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  // ─── Learning Paths ──────────────────────────────────────────────────────

  async createLearningPath(dto: CreateLearningPathDto) {
    const subject = await this.prisma.learningSubject.findUnique({
      where: { id: dto.learningSubjectId },
    });
    if (!subject) {
      throw new NotFoundException('Learning subject not found');
    }
    const existingSlug = await this.prisma.learningPath.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new BadRequestException(
        'A learning path with this slug already exists',
      );
    }
    return this.prisma.learningPath.create({
      data: {
        learningSubjectId: dto.learningSubjectId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description || null,
        unlockMode: dto.unlockMode ?? 'SEQUENTIAL',
        status: dto.status ?? 'DRAFT',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async listLearningPaths(learningSubjectId?: string) {
    return this.prisma.learningPath.findMany({
      where: learningSubjectId ? { learningSubjectId } : {},
      orderBy: { sortOrder: 'asc' },
      include: {
        learningSubject: { select: { id: true, name: true, code: true } },
        _count: { select: { pathCourses: true } },
      },
    });
  }

  async getLearningPathDetail(id: string, userId?: string) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id },
      include: {
        learningSubject: true,
        pathCourses: {
          orderBy: { sortOrder: 'asc' },
          include: {
            course: {
              include: {
                concepts: {
                  include: { lessons: { select: { id: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    // The client only needs a course summary (matching listCourses' shape)
    // here, not the full nested concept/lesson tree used to compute
    // completion below — reshape to a _count instead of shipping it all.
    const shapeCourse = (pc: (typeof path.pathCourses)[number]) => {
      const { concepts, ...course } = pc.course;
      return { ...course, _count: { concepts: concepts.length } };
    };

    const studentProfileId = userId
      ? await this.resolveStudentProfileId(userId)
      : null;

    if (!studentProfileId || path.unlockMode === 'FREE_ROAM') {
      return {
        ...path,
        pathCourses: path.pathCourses.map((pc) => ({
          ...pc,
          course: shapeCourse(pc),
          isDone: false,
          isLocked: false,
        })),
      };
    }

    const allConcepts = path.pathCourses.flatMap((pc) => pc.course.concepts);
    const doneMap = await this.computeConceptDoneMap(studentProfileId, allConcepts);

    let previousDone = true;
    const pathCourses = path.pathCourses.map((pc) => {
      const concepts = pc.course.concepts;
      const isDone =
        concepts.length > 0 && concepts.every((c) => doneMap.get(c.id) ?? false);
      const isLocked = !previousDone;
      previousDone = isDone;
      return { ...pc, course: shapeCourse(pc), isDone, isLocked };
    });

    return { ...path, pathCourses };
  }

  async updateLearningPath(id: string, dto: UpdateLearningPathDto) {
    const path = await this.prisma.learningPath.findUnique({ where: { id } });
    if (!path) {
      throw new NotFoundException('Learning path not found');
    }
    return this.prisma.learningPath.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.unlockMode !== undefined
          ? { unlockMode: dto.unlockMode }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async addCourseToPath(pathId: string, dto: AddCourseToPathDto) {
    const [path, course] = await Promise.all([
      this.prisma.learningPath.findUnique({ where: { id: pathId } }),
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
    ]);
    if (!path) {
      throw new NotFoundException('Learning path not found');
    }
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const existing = await this.prisma.learningPathCourse.findUnique({
      where: { pathId_courseId: { pathId, courseId: dto.courseId } },
    });
    if (existing) {
      throw new BadRequestException('Course is already part of this path');
    }

    const maxSortOrder = await this.prisma.learningPathCourse.aggregate({
      where: { pathId },
      _max: { sortOrder: true },
    });

    return this.prisma.learningPathCourse.create({
      data: {
        pathId,
        courseId: dto.courseId,
        sortOrder: dto.sortOrder ?? (maxSortOrder._max.sortOrder ?? 0) + 1,
        isRequired: dto.isRequired ?? true,
      },
    });
  }

  async reorderPathCourses(pathId: string, dto: ReorderPathCoursesDto) {
    const path = await this.prisma.learningPath.findUnique({
      where: { id: pathId },
    });
    if (!path) {
      throw new NotFoundException('Learning path not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const courseOrder of dto.courses) {
        const updated = await tx.learningPathCourse.update({
          where: {
            pathId_courseId: { pathId, courseId: courseOrder.courseId },
          },
          data: { sortOrder: courseOrder.sortOrder },
        });
        results.push(updated);
      }
      return results;
    });
  }

  async removeCourseFromPath(pathId: string, courseId: string) {
    const existing = await this.prisma.learningPathCourse.findUnique({
      where: { pathId_courseId: { pathId, courseId } },
    });
    if (!existing) {
      throw new NotFoundException('Course is not part of this path');
    }
    return this.prisma.learningPathCourse.delete({
      where: { pathId_courseId: { pathId, courseId } },
    });
  }

  // ─── Unlock-state helpers ────────────────────────────────────────────────
  // Chapters/courses unlock strictly in sortOrder: item N+1 unlocks once item
  // N is fully completed. Derived at query time from LessonAttempt rather
  // than a prerequisite graph table, since the catalog's ordering is linear.

  private async resolveStudentProfileId(
    userId: string,
  ): Promise<string | null> {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return student?.id ?? null;
  }

  private async getCompletedLessonIds(
    studentProfileId: string,
    lessonIds: string[],
  ): Promise<Set<string>> {
    if (lessonIds.length === 0) {
      return new Set();
    }
    const completed = await this.prisma.lessonAttempt.findMany({
      where: {
        studentProfileId,
        lessonId: { in: lessonIds },
        status: 'COMPLETED',
      },
      select: { lessonId: true },
    });
    return new Set(completed.map((a) => a.lessonId));
  }

  private async computeConceptUnlockState(
    studentProfileId: string | null,
    concepts: ConceptWithLessons[],
  ): Promise<{ conceptId: string; isDone: boolean; isLocked: boolean }[]> {
    const ordered = [...concepts].sort((a, b) => a.sortOrder - b.sortOrder);

    if (!studentProfileId) {
      return ordered.map((concept) => ({
        conceptId: concept.id,
        isDone: false,
        isLocked: false,
      }));
    }

    const doneMap = await this.computeConceptDoneMap(studentProfileId, ordered);

    let previousDone = true;
    return ordered.map((concept) => {
      const isDone = doneMap.get(concept.id) ?? false;
      const isLocked = !previousDone;
      previousDone = isDone;
      return { conceptId: concept.id, isDone, isLocked };
    });
  }

  // A concept is "done" once every lesson under it has a COMPLETED attempt.
  // CHECKPOINT concepts additionally require a first-try accuracy of at
  // least passThresholdPercent across their (non-conceptual) cards — a
  // student who only got everything right after retries has completed the
  // lesson, but hasn't passed the checkpoint.
  private async computeConceptDoneMap(
    studentProfileId: string,
    concepts: ConceptWithLessons[],
  ): Promise<Map<string, boolean>> {
    const allLessonIds = concepts.flatMap((c) => c.lessons.map((l) => l.id));
    const completedIds = await this.getCompletedLessonIds(
      studentProfileId,
      allLessonIds,
    );

    const checkpointConcepts = concepts.filter(
      (c) => c.kind === 'CHECKPOINT' && c.passThresholdPercent != null,
    );
    const checkpointLessonIds = checkpointConcepts.flatMap((c) =>
      c.lessons.map((l) => l.id),
    );

    const responses = checkpointLessonIds.length
      ? await this.prisma.studentCardResponse.findMany({
          where: {
            attempt: {
              studentProfileId,
              lessonId: { in: checkpointLessonIds },
              status: 'COMPLETED',
            },
            card: { cardType: { not: 'CONCEPTUAL' } },
          },
          select: {
            attemptsCount: true,
            isCorrect: true,
            attempt: { select: { lessonId: true } },
          },
        })
      : [];

    const responsesByLesson = new Map<
      string,
      { attemptsCount: number; isCorrect: boolean }[]
    >();
    for (const r of responses) {
      const lessonId = r.attempt.lessonId;
      if (!responsesByLesson.has(lessonId)) {
        responsesByLesson.set(lessonId, []);
      }
      responsesByLesson.get(lessonId)!.push(r);
    }

    const doneMap = new Map<string, boolean>();
    for (const concept of concepts) {
      const allLessonsCompleted =
        concept.lessons.length > 0 &&
        concept.lessons.every((l) => completedIds.has(l.id));

      if (!allLessonsCompleted) {
        doneMap.set(concept.id, false);
        continue;
      }

      if (concept.kind !== 'CHECKPOINT' || concept.passThresholdPercent == null) {
        doneMap.set(concept.id, true);
        continue;
      }

      const checkpointResponses = concept.lessons.flatMap(
        (l) => responsesByLesson.get(l.id) ?? [],
      );
      if (checkpointResponses.length === 0) {
        doneMap.set(concept.id, true);
        continue;
      }

      const firstTryCorrect = checkpointResponses.filter(
        (r) => r.isCorrect && r.attemptsCount === 1,
      ).length;
      const scorePercent = (firstTryCorrect / checkpointResponses.length) * 100;
      doneMap.set(concept.id, scorePercent >= concept.passThresholdPercent);
    }

    return doneMap;
  }
}
