import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLookupDto,
  LookupQueryDto,
  UpdateLookupDto,
} from './dto/assessments.dto';
import {
  enumFilter,
  enumValue,
  lookupSelect,
  normalizeCode,
  normalizePagination,
  requireText,
  searchFilter,
  toPage,
  audit,
} from './assessments.common';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSubjects(query: LookupQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...searchFilter(query.search, ['code', 'name']),
      ...enumFilter('status', query.status, ['active', 'inactive', 'archived']),
    };
    const [items, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        orderBy: { code: 'asc' },
        skip: pagination.skip,
        take: pagination.pageSize,
        select: lookupSelect,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async createSubject(input: CreateLookupDto, actorUserId: string) {
    const code = normalizeCode(input.code);
    await this.assertSubjectCodeAvailable(code);
    const record = await this.prisma.subject.create({
      data: { code, name: requireText(input.name, 'name') },
      select: lookupSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.subject.created',
      'subject',
      record.id,
    );
    return record;
  }

  async updateSubject(id: string, input: UpdateLookupDto, actorUserId: string) {
    const record = await this.prisma.subject.update({
      where: { id },
      data: {
        ...(input.name !== undefined
          ? { name: requireText(input.name, 'name') }
          : {}),
        ...(input.status !== undefined
          ? {
              status: enumValue(
                input.status,
                ['active', 'inactive', 'archived'],
                'status',
              ),
            }
          : {}),
      } as any,
      select: lookupSelect,
    });
    await audit(
      this.prisma,
      actorUserId,
      'assessments.subject.updated',
      'subject',
      record.id,
    );
    return record;
  }

  private async assertSubjectCodeAvailable(code: string): Promise<void> {
    const existing = await this.prisma.subject.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Subject code already exists');
    }
  }
}
