import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { resolveSort } from '../common/sort.util';
import { NextActionStatus } from '@prisma/client';
import {
  CreateNextActionDto,
  ListNextActionsQueryDto,
  UpdateNextActionDto,
} from './dto/next-action.dto';

const NEXT_ACTION_SORTABLE_FIELDS = ['actionType', 'status', 'dueDate'] as const;

@Injectable()
export class NextActionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly listInclude = {
    studentProfile: { select: { id: true, fullName: true } },
    competency: { select: { id: true, name: true } },
    owner: { select: { id: true, firstName: true, lastName: true } },
  };

  async listNextActions(query: ListNextActionsQueryDto) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    // 500 comfortably covers "every action" for callers that don't paginate —
    // this endpoint had none before, so that's still the effective default.
    const limit = query.limit ? parseInt(query.limit, 10) : 500;
    const where = {
      ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
      ...(query.studentProfileId
        ? { studentProfileId: query.studentProfileId }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { reason: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };
    const orderBy = resolveSort(
      query.sortBy,
      query.sortOrder,
      NEXT_ACTION_SORTABLE_FIELDS,
      'dueDate',
      'asc',
    );

    const [items, total] = await Promise.all([
      this.prisma.nextAction.findMany({
        where,
        include: this.listInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.nextAction.count({ where }),
    ]);

    return { items, total, page, pageSize: limit };
  }

  async getNextActionById(id: string) {
    const action = await this.prisma.nextAction.findUnique({
      where: { id },
      include: this.listInclude,
    });
    if (!action) {
      throw new NotFoundException('Next action not found');
    }
    return action;
  }

  async createNextAction(dto: CreateNextActionDto) {
    return this.prisma.nextAction.create({
      data: {
        ...dto,
        dueDate: new Date(dto.dueDate),
      },
    });
  }

  async updateNextAction(id: string, dto: UpdateNextActionDto) {
    await this.getNextActionById(id);
    const isCompleting = dto.status === NextActionStatus.DONE;
    return this.prisma.nextAction.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.dueDate ? { dueDate: new Date(dto.dueDate) } : {}),
        ...(dto.reassessmentPlan !== undefined
          ? { reassessmentPlan: dto.reassessmentPlan }
          : {}),
        ...(isCompleting ? { completedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Week 2: on gap open, auto-generate a NextAction owned by the student's
   * assigned class teacher with a templated reassessment plan. Not
   * implemented yet — scaffold only.
   */
  generateNextAction(): never {
    throw new NotImplementedException(
      'Automatic next-action generation lands in Week 2.',
    );
  }
}
