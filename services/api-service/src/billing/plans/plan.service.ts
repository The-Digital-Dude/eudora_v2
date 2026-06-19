import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const existing = await this.prisma.plan.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Plan with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.plan.create({
      data: {
        ...dto,
        priceMonthly: dto.priceMonthly,
        priceAnnual: dto.priceAnnual,
        features: dto.features ?? [],
      },
    });
  }

  async findAllPublic() {
    return this.prisma.plan.findMany({
      where: { isActive: true, isPublic: true },
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async findAll() {
    return this.prisma.plan.findMany({
      orderBy: { priceMonthly: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);

    if (dto.name) {
      const conflict = await this.prisma.plan.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (conflict) {
        throw new ConflictException(
          `Plan with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Soft-delete: just deactivate the plan so existing subscriptions are unaffected
    return this.prisma.plan.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
