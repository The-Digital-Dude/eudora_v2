import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GuardianAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getLinkedStudentIds(userId: string): Promise<string[]> {
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        students: {
          where: {
            hasAcademicAccess: true,
          },
        },
      },
    });

    if (!guardianProfile) {
      return [];
    }

    return guardianProfile.students.map((rel) => rel.studentProfileId);
  }

  async assertCanAccessStudent(
    userId: string,
    studentProfileId: string,
  ): Promise<void> {
    const linkedIds = await this.getLinkedStudentIds(userId);
    if (!linkedIds.includes(studentProfileId)) {
      throw new ForbiddenException(
        "You do not have permission to access this student's academic records.",
      );
    }
  }

  async getGuardianFamilyId(userId: string): Promise<string | null> {
    const guardianProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
      include: {
        families: true,
      },
    });

    if (!guardianProfile || guardianProfile.families.length === 0) {
      return null;
    }

    return guardianProfile.families[0].familyId;
  }
}
