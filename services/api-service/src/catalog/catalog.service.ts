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
import { ProgressionService } from '../progression/progression.service';

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
  ) {}

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

  // `listCourses`/`getCourseDetail` are shared by every role (`CatalogController`
  // is `@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')`) — staff
  // need to see DRAFT courses to author them, students/guardians never should.
  // Missing this filter previously let any DRAFT course (including empty
  // authoring-UI scratch courses) leak into the student-facing course list.
  async listCourses(learningSubjectId?: string, includeUnpublished = false) {
    return this.prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(includeUnpublished ? {} : { status: 'PUBLISHED' }),
        ...(learningSubjectId ? { learningSubjectId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        learningSubject: { select: { id: true, name: true, code: true } },
        _count: { select: { concepts: true } },
      },
    });
  }

  async getCourseDetail(
    id: string,
    userId?: string,
    includeUnpublished = false,
  ) {
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
    // Same "not found" (not "forbidden") for deleted vs. unpublished-and-not-
    // staff — doesn't confirm to a probing student whether a draft course
    // with that id exists at all.
    if (
      !course ||
      course.deletedAt ||
      (!includeUnpublished && course.status !== 'PUBLISHED')
    ) {
      throw new NotFoundException('Course not found');
    }

    const studentProfileId = userId
      ? await this.progression.resolveStudentProfileId(userId)
      : null;
    const unlockState = await this.progression.computeConceptUnlockState(
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
      ? await this.progression.resolveStudentProfileId(userId)
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
    const doneMap = await this.progression.computeConceptDoneMap(studentProfileId, allConcepts);

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

}
