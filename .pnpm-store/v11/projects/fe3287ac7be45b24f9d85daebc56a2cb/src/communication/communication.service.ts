import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  async createBroadcast(dto: CreateBroadcastDto) {
    return this.prisma.broadcast.create({
      data: dto,
    });
  }

  async getBroadcasts(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [broadcasts, total] = await Promise.all([
      this.prisma.broadcast.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.broadcast.count(),
    ]);

    return {
      data: broadcasts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
