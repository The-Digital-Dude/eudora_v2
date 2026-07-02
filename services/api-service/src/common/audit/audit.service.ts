import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogInput {
  actorUserId: string | null;
  event: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: unknown;
}

/**
 * Central writer for the audit trail. Security-sensitive mutations (role and
 * permission changes, user administration) should record an entry here so that
 * privilege changes are traceable.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          event: input.event,
          targetType: input.targetType ?? null,
          targetId: input.targetId ?? null,
          metadata: input.metadata
            ? JSON.parse(JSON.stringify(input.metadata))
            : null,
        },
      });
    } catch (err) {
      // Never let an audit-write failure break the underlying operation, but do
      // surface it so a broken trail is noticed.
      this.logger.error(
        `Failed to write audit log for event "${input.event}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
