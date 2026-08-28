import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CatalogStatus, DeliveryMode, ModuleItemKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSort } from '../common/sort.util';
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
import { assertPriceFloor } from '../billing/pricing/price-rules';
import { ProgressionService } from '../progression/progression.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

const COURSE_SORTABLE_FIELDS = ['title', 'status', 'createdAt'] as const;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progression: ProgressionService,
    private readonly entitlements: EntitlementsService,
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

  /**
   * A published course has to be reachable by some route to a purchase.
   *
   * Two legitimate ways to have no price of your own: the program that bundles
   * you carries the pricing, or — once the product supports it — the course is
   * explicitly free. Only the first is expressible today, so that is what this
   * enforces; there is deliberately no `isFree` flag yet, because a course
   * marked free with no way to enrol in it would just be a different false
   * promise. Content is gated on an Entitlement row, and nothing but Stripe
   * checkout and admin grant writes one.
   *
   * Without this, "published, unpriced, in no program" was reachable, and the
   * public course page filled the silence by telling the visitor the course was
   * available as part of a programme — which for three live courses was untrue.
   */
  private async assertPublishable(
    courseId: string | null,
    status: CatalogStatus | undefined,
    priceOneTimeCents: number | null | undefined,
  ) {
    if (status !== CatalogStatus.PUBLISHED) return;
    if (priceOneTimeCents !== null && priceOneTimeCents !== undefined) return;

    const programCount = courseId
      ? await this.prisma.programCourse.count({ where: { courseId } })
      : 0;
    if (programCount > 0) return;

    throw new BadRequestException(
      'A published course must either carry its own price or belong to at least one program. ' +
        'Set priceOneTimeCents, attach it to a program, or leave it as DRAFT.',
    );
  }

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
    assertPriceFloor(dto);
    // A brand-new course cannot already be in a program, so publishing one
    // without a price is always the stranded state described below.
    await this.assertPublishable(null, dto.status, dto.priceOneTimeCents);

    return this.prisma.course.create({
      data: {
        learningSubjectId: dto.learningSubjectId,
        title: dto.title,
        slug: dto.slug,
        description: dto.description || null,
        estimatedHours: dto.estimatedHours ?? null,
        status: dto.status ?? 'DRAFT',
        sortOrder: dto.sortOrder ?? 0,
        // Everything below was accepted and validated by the DTO and then
        // dropped here, so a course could never be given a price, artwork or
        // grade band through the API — it returned 200 and discarded them.
        // Nulls are meaningful: null price means "not sold a la carte".
        durationWeeks: dto.durationWeeks ?? null,
        thumbnailUrl: dto.thumbnailUrl ?? null,
        gradeBand: dto.gradeBand ?? null,
        priceOneTimeCents: dto.priceOneTimeCents ?? null,
        priceMonthlyCents: dto.priceMonthlyCents ?? null,
        installmentCount: dto.installmentCount ?? null,
        // Both have column defaults, so only override when actually supplied.
        ...(dto.deliveryMode !== undefined
          ? { deliveryMode: dto.deliveryMode }
          : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
      },
    });
  }

  // `listCourses`/`getCourseDetail` are shared by every role (`CatalogController`
  // is `@Roles('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'USER', 'GUARDIAN')`) — staff
  // need to see DRAFT courses to author them, students/guardians never should.
  // Missing this filter previously let any DRAFT course (including empty
  // authoring-UI scratch courses) leak into the student-facing course list.
  async listCourses(
    learningSubjectId?: string,
    includeUnpublished = false,
    // When set, each row is annotated with `isAssigned` — whether the course
    // is in that student's guardian-curated learning plan. Annotation only;
    // it never filters, because an assignment is a recommendation, not an
    // access grant (catalog content is open to any authenticated student).
    annotateForStudentProfileId: string | null = null,
    page = 1,
    // 500 comfortably covers "give me the whole catalog" for callers that
    // don't paginate (pickers, guardian course-plan browsing) without an
    // unbounded query — a real school's catalog isn't going to clear that.
    limit = 500,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
  ) {
    const where = {
      deletedAt: null,
      ...(includeUnpublished ? {} : { status: 'PUBLISHED' as const }),
      ...(learningSubjectId ? { learningSubjectId } : {}),
      ...(search
        ? { title: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    // 'sortOrder' is also a real Course column (manual curation position),
    // so it's deliberately excluded from the user-choosable allowlist below
    // to avoid confusing it with the sort *direction* of the same name — it
    // remains the fallback field, reproducing the original hardcoded default.
    const orderBy = resolveSort(
      sortBy,
      sortOrder,
      COURSE_SORTABLE_FIELDS,
      'sortOrder',
      'asc',
    );

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          learningSubject: { select: { id: true, name: true, code: true } },
          _count: { select: { concepts: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    if (!annotateForStudentProfileId) {
      return { items: courses, total, page, pageSize: limit };
    }

    const assignments = await this.prisma.studentCourseAssignment.findMany({
      where: {
        studentProfileId: annotateForStudentProfileId,
        courseId: { in: courses.map((c) => c.id) },
      },
      select: { courseId: true },
    });
    const assignedIds = new Set(assignments.map((a) => a.courseId));
    return {
      items: courses.map((course) => ({
        ...course,
        isAssigned: assignedIds.has(course.id),
      })),
      total,
      page,
      pageSize: limit,
    };
  }

  /**
   * Anonymous, unauthenticated course search for the marketing site. Returns
   * only what a visitor deciding whether to sign up needs — never price,
   * Stripe ids, or any other field a logged-out stranger shouldn't see, and
   * never a DRAFT/ARCHIVED row regardless of what the search term matches.
   */
  async listPublicCourses(search?: string, page = 1, limit = 12) {
    const where = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(search
        ? { title: { contains: search, mode: 'insensitive' as const } }
        : {}),
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          estimatedHours: true,
          gradeBand: true,
          learningSubject: { select: { id: true, name: true, code: true } },
          _count: { select: { concepts: true } },
        },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items: courses, total, page, pageSize: limit };
  }

  // ─── Course teaching staff ───────────────────────────────────────────────
  // A plain many-to-many. "One course, many teachers" never needed a cohort
  // system — `Batch` is a cohort and exists for live delivery instead.

  async listCourseTeachers(courseId: string) {
    return this.prisma.courseTeacher.findMany({
      where: { courseId },
      orderBy: [{ role: 'asc' }, { assignedAt: 'asc' }],
      select: {
        role: true,
        assignedAt: true,
        teacherProfile: {
          select: {
            id: true,
            fullName: true,
            specialization: true,
            status: true,
          },
        },
      },
    });
  }

  async attachCourseTeacher(
    courseId: string,
    teacherProfileId: string,
    role = 'LEAD',
  ) {
    const [course, teacher] = await Promise.all([
      this.prisma.course.findFirst({
        where: { id: courseId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.teacherProfile.findFirst({
        where: { id: teacherProfileId, deletedAt: null },
        select: { id: true },
      }),
    ]);
    if (!course) throw new NotFoundException('Course not found');
    if (!teacher) throw new NotFoundException('Teacher not found');

    // Upsert rather than create: re-adding an existing teacher should change
    // their role, not fail with a duplicate-key error.
    return this.prisma.courseTeacher.upsert({
      where: { courseId_teacherProfileId: { courseId, teacherProfileId } },
      create: { courseId, teacherProfileId, role },
      update: { role },
    });
  }

  async detachCourseTeacher(courseId: string, teacherProfileId: string) {
    const existing = await this.prisma.courseTeacher.findUnique({
      where: { courseId_teacherProfileId: { courseId, teacherProfileId } },
    });
    if (!existing) {
      throw new NotFoundException(
        'That teacher is not assigned to this course',
      );
    }
    await this.prisma.courseTeacher.delete({
      where: { courseId_teacherProfileId: { courseId, teacherProfileId } },
    });
    return { message: 'Teacher removed from course' };
  }

  // ─── Public SKU surface ──────────────────────────────────────────────────
  // Separate from `listPublicCourses` above in one important way: these DO
  // expose price, because a programme page that cannot show what it costs
  // cannot sell. Stripe ids are never exposed, and only PUBLISHED rows are
  // ever returned regardless of what was asked for.

  private static readonly PUBLIC_PROGRAM_FIELDS = {
    id: true,
    name: true,
    slug: true,
    shortDescription: true,
    description: true,
    thumbnailUrl: true,
    outcomes: true,
    deliveryMode: true,
    durationMonths: true,
    priceOneTimeCents: true,
    priceMonthlyCents: true,
    installmentCount: true,
    currency: true,
    class: { select: { id: true, name: true, slug: true, code: true } },
  } as const;

  async listPublicPrograms(classSlug?: string, limit = 50) {
    return this.prisma.program.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(classSlug ? { class: { slug: classSlug } } : {}),
      },
      orderBy: [{ class: { sortOrder: 'asc' } }, { name: 'asc' }],
      take: limit,
      select: {
        ...CatalogService.PUBLIC_PROGRAM_FIELDS,
        _count: { select: { programCourses: true } },
      },
    });
  }

  async listPublicClasses() {
    return this.prisma.class.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        description: true,
        _count: { select: { programs: true } },
      },
    });
  }

  /**
   * Programme detail for the public SKU page.
   *
   * The outline is DERIVED from the concept tree rather than authored — there
   * is no second syllabus to keep in sync, and it is substantial indexable
   * content for free.
   */
  async getPublicProgramBySlug(slug: string) {
    const program = await this.prisma.program.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: {
        ...CatalogService.PUBLIC_PROGRAM_FIELDS,
        syllabusFile: { select: { url: true, originalName: true } },
        programCourses: {
          orderBy: { sortOrder: 'asc' },
          select: {
            sortOrder: true,
            isRequired: true,
            course: {
              select: {
                id: true,
                title: true,
                slug: true,
                description: true,
                estimatedHours: true,
                durationWeeks: true,
                gradeBand: true,
                status: true,
                learningSubject: { select: { name: true, code: true } },
                concepts: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    name: true,
                    kind: true,
                    sortOrder: true,
                    _count: { select: { lessons: true, items: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!program) throw new NotFoundException('Programme not found');

    // A DRAFT course inside a published programme must not leak.
    const courses = program.programCourses
      .filter((pc) => pc.course.status === 'PUBLISHED')
      .map((pc) => ({
        ...pc.course,
        isRequired: pc.isRequired,
        sortOrder: pc.sortOrder,
      }));

    return {
      ...program,
      programCourses: undefined,
      courses,
      totalChapters: courses.reduce((n, c) => n + c.concepts.length, 0),
      totalEstimatedHours: courses.reduce(
        (n, c) => n + (c.estimatedHours ?? 0),
        0,
      ),
    };
  }

  /**
   * Course detail for the public long-tail page. Item titles and durations are
   * returned so the outline is browsable and indexable, but bodies are
   * withheld unless the item is a free preview — this endpoint is anonymous,
   * so there is no entitlement to check against.
   */
  async getPublicCourseBySlug(slug: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnailUrl: true,
        estimatedHours: true,
        durationWeeks: true,
        gradeBand: true,
        deliveryMode: true,
        priceOneTimeCents: true,
        priceMonthlyCents: true,
        installmentCount: true,
        currency: true,
        learningSubject: { select: { id: true, name: true, code: true } },
        concepts: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            kind: true,
            sortOrder: true,
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, title: true, sortOrder: true },
            },
            items: {
              where: { deletedAt: null, status: 'PUBLISHED' },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                title: true,
                kind: true,
                sortOrder: true,
                videoDurationSeconds: true,
                isFreePreview: true,
              },
            },
          },
        },
        programCourses: {
          select: {
            program: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                priceOneTimeCents: true,
                currency: true,
              },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Course not found');

    // Every published programme containing this course, so the page can
    // cross-sell the bundle rather than only selling the single course.
    const programs = course.programCourses
      .map((pc) => pc.program)
      .filter((p) => p.status === 'PUBLISHED');

    return { ...course, programCourses: undefined, programs };
  }

  async getCourseDetail(
    id: string,
    userId?: string,
    includeUnpublished = false,
    roles?: string[],
    /** Set when a guardian is viewing on behalf of one of their children. */
    actingStudentId?: string | null,
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

    // Progress and unlock state follow the acting child too — otherwise a
    // guardian on a shared device would see their own empty progression
    // instead of the work their child has actually done.
    const studentProfileId = userId
      ? ((await this.progression.resolveStudentProfileId(userId)) ??
        actingStudentId ??
        null)
      : null;
    const unlockState = await this.progression.computeConceptUnlockState(
      studentProfileId,
      course.concepts,
    );
    const stateByConcept = new Map(unlockState.map((s) => [s.conceptId, s]));

    const allItemIds = course.concepts.flatMap((c) => c.items.map((i) => i.id));
    const completedItemIds = studentProfileId
      ? await this.getCompletedModuleItemIds(studentProfileId, allItemIds)
      : new Set<string>();

    // The outline (titles, ordering, durations) always stays visible — it is
    // the sales pitch and the indexable content. Only the payload of each item
    // is withheld, so an unentitled visitor sees exactly what they would get.
    const { allowed: isEntitled } = await this.entitlements.resolveCourseAccess(
      userId,
      roles,
      course.id,
      actingStudentId,
    );

    return {
      ...course,
      isEntitled,
      concepts: course.concepts.map((concept) => ({
        ...concept,
        isDone: stateByConcept.get(concept.id)?.isDone ?? false,
        isLocked: stateByConcept.get(concept.id)?.isLocked ?? false,
        items: concept.items.map((item) => {
          const unlocked = isEntitled || item.isFreePreview;
          return {
            ...item,
            // Withholding the bodies rather than the rows: the learner still
            // sees what exists and how long it runs.
            videoUrl: unlocked ? item.videoUrl : null,
            readingContent: unlocked ? item.readingContent : null,
            assessmentId: unlocked ? item.assessmentId : null,
            isContentLocked: !unlocked,
            isDone: completedItemIds.has(item.id),
          };
        }),
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

    // `deliveryMode` was accepted by the DTO but silently dropped here, so a
    // course could never change mode through the API. It is wired up now
    // because the LIVE-only rule below has to be enforced somewhere.
    if (
      dto.deliveryMode !== undefined &&
      dto.deliveryMode !== DeliveryMode.LIVE
    ) {
      const liveItems = await this.prisma.moduleItem.count({
        where: {
          kind: ModuleItemKind.LIVE_CLASS,
          deletedAt: null,
          concept: { courseId: id },
        },
      });
      if (liveItems > 0) {
        throw new ConflictException(
          `Cannot set delivery mode to ${dto.deliveryMode}: this course has ${liveItems} live class item(s), which only a cohort can attend. Remove them first.`,
        );
      }
    }

    assertPriceFloor(dto);

    // Only checked when the write actually engages with sellability — an
    // explicit publish, or a price change. Editing the title of a course that
    // is already in the bad state stays possible on purpose: the guard exists
    // to stop that state being entered or deepened, not to brick edits on the
    // rows that predate it (those are cleaned up separately).
    const engagesPublishState =
      dto.status === 'PUBLISHED' || dto.priceOneTimeCents !== undefined;
    if (engagesPublishState) {
      await this.assertPublishable(
        id,
        dto.status ?? course.status,
        dto.priceOneTimeCents !== undefined
          ? dto.priceOneTimeCents
          : course.priceOneTimeCents,
      );
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
        ...(dto.deliveryMode !== undefined
          ? { deliveryMode: dto.deliveryMode }
          : {}),
        // Same omission as createCourse had, on the handler where deliveryMode
        // was already fixed. Undefined means "not being changed"; null is an
        // explicit clear, so both have to stay distinguishable here.
        ...(dto.durationWeeks !== undefined
          ? { durationWeeks: dto.durationWeeks }
          : {}),
        ...(dto.thumbnailUrl !== undefined
          ? { thumbnailUrl: dto.thumbnailUrl }
          : {}),
        ...(dto.gradeBand !== undefined ? { gradeBand: dto.gradeBand } : {}),
        ...(dto.priceOneTimeCents !== undefined
          ? { priceOneTimeCents: dto.priceOneTimeCents }
          : {}),
        ...(dto.priceMonthlyCents !== undefined
          ? { priceMonthlyCents: dto.priceMonthlyCents }
          : {}),
        ...(dto.installmentCount !== undefined
          ? { installmentCount: dto.installmentCount }
          : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
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
    const doneMap = await this.progression.computeConceptDoneMap(
      studentProfileId,
      allConcepts,
    );

    let previousDone = true;
    const pathCourses = path.pathCourses.map((pc) => {
      const concepts = pc.course.concepts;
      const isDone =
        concepts.length > 0 &&
        concepts.every((c) => doneMap.get(c.id) ?? false);
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
        ...(dto.unlockMode !== undefined ? { unlockMode: dto.unlockMode } : {}),
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
