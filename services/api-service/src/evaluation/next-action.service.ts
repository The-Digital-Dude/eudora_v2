import {
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NextActionStatus } from '@prisma/client';
import {
  CreateNextActionDto,
  ListNextActionsQueryDto,
  UpdateNextActionDto,
} from './dto/next-action.dto';

@Injectable()
export class NextActionService {
  constructor(private readonly prisma: PrismaService) {}

  async listNextActions(query: ListNextActionsQueryDto) {
    return this.prisma.nextAction.findMany({
      where: {
        ...(query.ownerUserId ? { ownerUserId: query.ownerUserId } : {}),
        ...(query.studentProfileId
          ? { studentProfileId: query.studentProfileId }
          : {}),
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getNextActionById(id: string) {
    const action = await this.prisma.nextAction.findUnique({ where: { id } });
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
