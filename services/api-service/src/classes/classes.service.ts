import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CatalogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/slug.util';
import {
  audit,
  classSelect,
  enumFilter,
  normalizePagination,
  nullableNumber,
  requireText,
  searchFilter,
  toPage,
} from '../assessments/assessments.common';
import { LookupQueryDto } from '../assessments/dto/assessments.dto';
import { CreateClassDto, UpdateClassDto } from './dto/class.dto';

const CATALOG_STATUSES = Object.values(CatalogStatus);

/**
 * `Class` — the grade-level master at the top of Class -> Program -> Course.
 *
 * Lived in `AssessmentSetupService` until now, because it grew out of the old
 * `Level` lookup that only assessments and questions used. Once it became the
 * taxonomy root — carrying programmes, student grades and the public catalog
 * URL — serving it from `/api/assessments/classes` was actively misleading.
 *
 * The shared helpers still come from `assessments.common`; they are generic
 * list/paginate utilities, not assessment-specific logic.
 */
@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: LookupQueryDto = {}) {
    const pagination = normalizePagination(query);
    const where = {
      ...searchFilter(query.search, ['code', 'name']),
      ...enumFilter('status', query.status, CATALOG_STATUSES),
    };

    const [items, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
        skip: pagination.skip,
        take: pagination.pageSize,
        select: classSelect,
      }),
      this.prisma.class.count({ where }),
    ]);

    return toPage(items, total, pagination);
  }

  async create(input: CreateClassDto, actorUserId: string) {
    // Uppercased rather than run through the shared `normalizeCode`, which
    // lowercases: grade codes are written and read as K / G1 / G10, and the
    // seeded rows use that form.
    const code = requireText(input.code, 'code').trim().toUpperCase();
    await this.assertCodeAvailable(code);

    const name = requireText(input.name, 'name');
    const record = await this.prisma.class.create({
      data: {
        code,
        name,
        // Slug is required and unique — it is the public catalog URL segment.
        slug: slugify(name),
        description: input.description?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        // Defaults to DRAFT so a half-built class never reaches the catalog.
        status: input.status ?? CatalogStatus.DRAFT,
      },
      select: classSelect,
    });

    await audit(this.prisma, actorUserId, 'class.created', 'class', record.id);
    return record;
  }

  async update(id: string, input: UpdateClassDto, actorUserId: string) {
    const data: Prisma.ClassUpdateInput = {};

    if (input.name !== undefined) {
      const name = requireText(input.name, 'name');
      data.name = name;
      data.slug = slugify(name);
    }
    if (input.status !== undefined) {
      data.status = input.status;
    }
    if (input.description !== undefined) {
      data.description = input.description?.trim() || null;
    }
    if (input.sortOrder !== undefined) {
      data.sortOrder = nullableNumber(input.sortOrder, 'sortOrder') ?? 0;
    }

    // Surfaces a 404 rather than Prisma's raw "record not found" 500.
    const existing = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Class not found');
    }

    const record = await this.prisma.class.update({
      where: { id },
      data,
      select: classSelect,
    });

    await audit(this.prisma, actorUserId, 'class.updated', 'class', record.id);
    return record;
  }

  /**
   * Case-insensitive on purpose.
   *
   * The unique index on `code` is case-sensitive, so an admin typing "G1"
   * against a seeded "G1" would otherwise create a *second* Grade 1.
   */
  private async assertCodeAvailable(code: string): Promise<void> {
    const existing = await this.prisma.class.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Class code already exists');
    }
  }
}
