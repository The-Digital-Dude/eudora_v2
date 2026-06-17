import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMakeupRequestDto, UpdateMakeupRequestDto } from './dto/makeup.dto';

@Injectable()
export class MakeupService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMakeupRequestDto) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: dto.studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: dto.courseClassId },
    });
    if (!courseClass) {
      throw new NotFoundException('Course class not found');
    }

    return this.prisma.makeupRequest.create({
      data: {
        studentProfileId: dto.studentProfileId,
        courseClassId: dto.courseClassId,
        originalDate: new Date(dto.originalDate),
        reason: dto.reason,
        status: 'Awaiting Action',
      },
    });
  }

  async findAll(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [requests, total] = await Promise.all([
      this.prisma.makeupRequest.findMany({
        skip,
        take: limit,
        include: {
          studentProfile: {
            select: {
              fullName: true,
            },
          },
          courseClass: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.makeupRequest.count(),
    ]);

    return {
      data: requests,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.makeupRequest.findUnique({
      where: { id },
      include: {
        studentProfile: {
          select: {
            fullName: true,
          },
        },
        courseClass: {
          select: {
            name: true,
          },
        },
      },
    });
    if (!request) {
      throw new NotFoundException('Makeup request not found');
    }
    return request;
  }

  async update(id: string, dto: UpdateMakeupRequestDto) {
    await this.findOne(id);
    return this.prisma.makeupRequest.update({
      where: { id },
      data: {
        status: dto.status,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.makeupRequest.delete({
      where: { id },
    });
    return { message: 'Makeup request deleted successfully' };
  }
}
