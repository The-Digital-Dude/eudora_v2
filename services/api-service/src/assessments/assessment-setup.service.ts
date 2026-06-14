import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAssessmentDto,
  CreateLookupDto,
  ListAssessmentsQueryDto,
  LookupQueryDto,
  UpdateAssessmentDto,
  UpdateLookupDto,
} from './dto/assessments.dto';
import {
  assessmentSelect,
  assertNullablePositiveInteger,
  assertPositiveNumber,
  enumFilter,
  enumValue,
  idFilter,
  levelSelect,
  lookupSelect,
  normalizeCode,
  normalizePagination,
  normalizeSections,
  nullableNumber,
  numberFilter,
  requireRecord,
  requireText,
  searchFilter,
  toPage,
  audit,
} from './assessments.common';

@Injectable()
export class AssessmentSetupService {
  constructor(private readonly prisma: PrismaService) {}

  async listAssessmentTypes(query: LookupQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...searchFilter(query.search, ['code', 'name']),
      ...enumFilter('status', query.status, ['active', 'inactive', 'archived']),
    };
    const [items, total] = await Promise.all([
      this.prisma.assessmentType.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: pagination.skip,
        take: pagination.pageSize,
        select: lookupSelect,
      }),
      this.prisma.assessmentType.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async createAssessmentType(input: CreateLookupDto, actorUserId: string) {
    const code = normalizeCode(input.code);
    await this.assertAssessmentTypeCodeAvailable(code);
    const record = await this.prisma.assessmentType.create({
      data: { code, name: requireText(input.name, 'name') },
      select: lookupSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.assessmentType.created', 'assessmentType', record.id);
    return record;
  }

  async updateAssessmentType(id: string, input: UpdateLookupDto, actorUserId: string) {
    const record = await this.prisma.assessmentType.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: requireText(input.name, 'name') } : {}),
        ...(input.status !== undefined ? { status: enumValue(input.status, ['active', 'inactive', 'archived'], 'status') } : {}),
      } as any,
      select: lookupSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.assessmentType.updated', 'assessmentType', record.id);
    return record;
  }

  async listLevels(query: LookupQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...searchFilter(query.search, ['code', 'name']),
      ...enumFilter('status', query.status, ['active', 'inactive', 'archived']),
    };
    const [items, total] = await Promise.all([
      this.prisma.level.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: pagination.skip,
        take: pagination.pageSize,
        select: levelSelect,
      }),
      this.prisma.level.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async createLevel(input: CreateLookupDto, actorUserId: string) {
    const code = normalizeCode(input.code);
    await this.assertLevelCodeAvailable(code);
    const record = await this.prisma.level.create({
      data: {
        code,
        name: requireText(input.name, 'name'),
        sortOrder: input.sortOrder ?? 0,
      },
      select: levelSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.level.created', 'level', record.id);
    return record;
  }

  async updateLevel(id: string, input: UpdateLookupDto, actorUserId: string) {
    const record = await this.prisma.level.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: requireText(input.name, 'name') } : {}),
        ...(input.status !== undefined ? { status: enumValue(input.status, ['active', 'inactive', 'archived'], 'status') } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: nullableNumber(input.sortOrder, 'sortOrder') ?? 0 } : {}),
      } as any,
      select: levelSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.level.updated', 'level', record.id);
    return record;
  }

  async listAssessments(query: ListAssessmentsQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...searchFilter(query.search, ['title']),
      ...idFilter('assessmentTypeId', query.assessmentTypeId),
      ...idFilter('subjectId', query.subjectId),
      ...idFilter('levelId', query.levelId),
      ...idFilter('termId', query.termId),
      ...numberFilter('weekNumber', query.weekNumber),
      ...enumFilter('status', query.status, ['draft', 'published', 'archived']),
    };
    const [items, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.pageSize,
        select: assessmentSelect,
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async getAssessment(id: string) {
    const assessment = await this.prisma.assessment.findUnique({ where: { id }, select: assessmentSelect });
    return requireRecord(assessment, 'Assessment not found');
  }

  async createAssessment(input: CreateAssessmentDto, actorUserId: string) {
    assertPositiveNumber(input.totalMarks, 'totalMarks');
    assertNullablePositiveInteger(input.weekNumber, 'weekNumber');
    assertNullablePositiveInteger(input.estimatedDurationMinutes, 'estimatedDurationMinutes');
    const assessment = await this.prisma.assessment.create({
      data: {
        assessmentTypeId: requireText(input.assessmentTypeId, 'assessmentTypeId'),
        subjectId: requireText(input.subjectId, 'subjectId'),
        levelId: requireText(input.levelId, 'levelId'),
        termId: input.termId ? requireText(input.termId, 'termId') : null,
        weekNumber: input.weekNumber ?? null,
        title: requireText(input.title, 'title'),
        totalMarks: input.totalMarks,
        estimatedDurationMinutes: input.estimatedDurationMinutes ?? undefined,
        ...(input.sections ? { sections: { create: normalizeSections(input.sections) } } : {}),
      },
      select: assessmentSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.assessment.created', 'assessment', assessment.id);
    return assessment;
  }

  async updateAssessment(id: string, input: UpdateAssessmentDto, actorUserId: string) {
    if (input.totalMarks !== undefined) {
      assertPositiveNumber(input.totalMarks, 'totalMarks');
    }
    assertNullablePositiveInteger(input.weekNumber, 'weekNumber');
    assertNullablePositiveInteger(input.estimatedDurationMinutes, 'estimatedDurationMinutes');

    const assessment = await this.prisma.$transaction(async (tx) => {
      if (input.sections) {
        await tx.assessmentSection.deleteMany({ where: { assessmentId: id } });
      }
      return tx.assessment.update({
        where: { id },
        data: {
          ...(input.assessmentTypeId !== undefined ? { assessmentTypeId: requireText(input.assessmentTypeId, 'assessmentTypeId') } : {}),
          ...(input.subjectId !== undefined ? { subjectId: requireText(input.subjectId, 'subjectId') } : {}),
          ...(input.levelId !== undefined ? { levelId: requireText(input.levelId, 'levelId') } : {}),
          ...(input.termId !== undefined ? { termId: input.termId ? requireText(input.termId, 'termId') : null } : {}),
          ...(input.weekNumber !== undefined ? { weekNumber: input.weekNumber } : {}),
          ...(input.title !== undefined ? { title: requireText(input.title, 'title') } : {}),
          ...(input.totalMarks !== undefined ? { totalMarks: input.totalMarks } : {}),
          ...(input.estimatedDurationMinutes !== undefined
            ? { estimatedDurationMinutes: input.estimatedDurationMinutes ?? undefined }
            : {}),
          ...(input.sections ? { sections: { create: normalizeSections(input.sections) } } : {}),
        } as any,
        select: assessmentSelect,
      });
    });
    await audit(this.prisma, actorUserId, 'assessments.assessment.updated', 'assessment', assessment.id);
    return assessment;
  }

  async archiveAssessment(id: string, actorUserId: string) {
    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: { status: 'archived' },
      select: assessmentSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.assessment.archived', 'assessment', assessment.id);
    return assessment;
  }

  async publishAssessment(id: string, actorUserId: string) {
    const questionCount = await this.prisma.assessmentQuestion.count({ where: { assessmentId: id } });
    if (questionCount === 0) {
      throw new ConflictException('Cannot publish an assessment without questions');
    }
    const assessment = await this.prisma.assessment.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
      select: assessmentSelect,
    });
    await audit(this.prisma, actorUserId, 'assessments.assessment.published', 'assessment', assessment.id);
    return assessment;
  }

  private async assertAssessmentTypeCodeAvailable(code: string): Promise<void> {
    const existing = await this.prisma.assessmentType.findUnique({ where: { code }, select: { id: true } });
    if (existing) {
      throw new ConflictException('Assessment type code already exists');
    }
  }

  private async assertLevelCodeAvailable(code: string): Promise<void> {
    const existing = await this.prisma.level.findUnique({ where: { code }, select: { id: true } });
    if (existing) {
      throw new ConflictException('Assessment level code already exists');
    }
  }
}
