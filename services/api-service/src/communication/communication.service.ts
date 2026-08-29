import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBroadcastDto } from './dto/broadcast.dto';

@Injectable()
export class CommunicationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an announcement. Does not send one — see the Broadcast model.
   *
   * `status` and `recipientCount` are set here rather than accepted from the
   * caller, and take the column defaults (RECORDED / 0). Spreading the DTO
   * straight into `create` is what let the client assert a delivery that
   * never happened.
   */
  async createBroadcast(dto: CreateBroadcastDto) {
    return this.prisma.broadcast.create({
      data: {
        type: dto.type,
        title: dto.title,
        content: dto.content ?? null,
        ...(dto.sender ? { sender: dto.sender } : {}),
      },
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
