import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGuardianProfileDto,
  UpdateGuardianProfileDto,
} from './dto/guardian.dto';
import {
  CreateFamilyDto,
  UpdateFamilyDto,
  AddFamilyMemberDto,
} from './dto/family.dto';
import {
  CreateRelationshipDto,
  UpdateRelationshipDto,
} from './dto/relationship.dto';

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Guardian Profile Operations ---

  async createGuardianProfile(dto: CreateGuardianProfileDto) {
    // Always populated by the time this runs: the controller forces it for
    // a GUARDIAN-only caller; an admin/super-admin caller must supply a
    // real one themselves (there's no "self" to default to for them).
    if (!dto.userId) {
      throw new BadRequestException('userId is required');
    }
    const userId = dto.userId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const existingProfile = await this.prisma.guardianProfile.findUnique({
      where: { userId },
    });
    if (existingProfile) {
      throw new ConflictException(
        'A guardian profile already exists for this user',
      );
    }

    return this.prisma.guardianProfile.create({
      data: { ...dto, userId },
    });
  }

  async findAllGuardianProfiles(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [guardians, total] = await Promise.all([
      this.prisma.guardianProfile.findMany({
        skip,
        take: limit,
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.guardianProfile.count(),
    ]);

    return {
      data: guardians,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findGuardianProfileById(id: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        students: { include: { studentProfile: true } },
        families: { include: { family: true } },
      },
    });
    if (!guardian) {
      throw new NotFoundException('Guardian profile not found');
    }
    return guardian;
  }

  async updateGuardianProfile(id: string, dto: UpdateGuardianProfileDto) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { id },
    });
    if (!guardian) {
      throw new NotFoundException('Guardian profile not found');
    }

    if (dto.userId && dto.userId !== guardian.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user || user.deletedAt) {
        throw new NotFoundException('User not found');
      }

      const existingProfile = await this.prisma.guardianProfile.findUnique({
        where: { userId: dto.userId },
      });
      if (existingProfile) {
        throw new ConflictException(
          'A guardian profile already exists for this user',
        );
      }
    }

    return this.prisma.guardianProfile.update({
      where: { id },
      data: dto,
    });
  }

  async deleteGuardianProfile(id: string) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { id },
    });
    if (!guardian) {
      throw new NotFoundException('Guardian profile not found');
    }

    await this.prisma.guardianProfile.delete({
      where: { id },
    });

    return { message: 'Guardian profile deleted successfully' };
  }

  // --- Family Operations ---

  async createFamily(dto: CreateFamilyDto) {
    return this.prisma.family.create({
      data: dto,
    });
  }

  async findAllFamilies(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [families, total] = await Promise.all([
      this.prisma.family.findMany({
        skip,
        take: limit,
        orderBy: { householdName: 'asc' },
      }),
      this.prisma.family.count(),
    ]);

    return {
      data: families,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findFamilyById(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
      include: {
        students: { include: { studentProfile: true } },
        guardians: { include: { guardianProfile: true } },
      },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }
    return family;
  }

  async updateFamily(id: string, dto: UpdateFamilyDto) {
    const family = await this.prisma.family.findUnique({
      where: { id },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    return this.prisma.family.update({
      where: { id },
      data: dto,
    });
  }

  async deleteFamily(id: string) {
    const family = await this.prisma.family.findUnique({
      where: { id },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    await this.prisma.family.delete({
      where: { id },
    });

    return { message: 'Family deleted successfully' };
  }

  // --- Family Membership Operations ---

  async addMemberToFamily(familyId: string, dto: AddFamilyMemberDto) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    if (!dto.studentProfileId && !dto.guardianProfileId) {
      throw new BadRequestException(
        'Either studentProfileId or guardianProfileId must be provided',
      );
    }

    if (dto.studentProfileId) {
      const student = await this.prisma.studentProfile.findUnique({
        where: { id: dto.studentProfileId },
      });
      if (!student) {
        throw new NotFoundException('Student profile not found');
      }

      const existingMember = await this.prisma.familyStudent.findUnique({
        where: {
          familyId_studentProfileId: {
            familyId,
            studentProfileId: dto.studentProfileId,
          },
        },
      });
      if (existingMember) {
        throw new ConflictException(
          'Student is already a member of this family',
        );
      }

      await this.prisma.familyStudent.create({
        data: {
          familyId,
          studentProfileId: dto.studentProfileId,
        },
      });
    }

    if (dto.guardianProfileId) {
      const guardian = await this.prisma.guardianProfile.findUnique({
        where: { id: dto.guardianProfileId },
      });
      if (!guardian) {
        throw new NotFoundException('Guardian profile not found');
      }

      const existingMember = await this.prisma.familyGuardian.findUnique({
        where: {
          familyId_guardianProfileId: {
            familyId,
            guardianProfileId: dto.guardianProfileId,
          },
        },
      });
      if (existingMember) {
        throw new ConflictException(
          'Guardian is already a member of this family',
        );
      }

      await this.prisma.familyGuardian.create({
        data: {
          familyId,
          guardianProfileId: dto.guardianProfileId,
        },
      });
    }

    return { message: 'Member added to family successfully' };
  }

  async removeMemberFromFamily(
    familyId: string,
    studentProfileId?: string,
    guardianProfileId?: string,
  ) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) {
      throw new NotFoundException('Family not found');
    }

    if (!studentProfileId && !guardianProfileId) {
      throw new BadRequestException(
        'Either studentProfileId or guardianProfileId must be specified to remove',
      );
    }

    if (studentProfileId) {
      const existing = await this.prisma.familyStudent.findUnique({
        where: {
          familyId_studentProfileId: { familyId, studentProfileId },
        },
      });
      if (!existing) {
        throw new NotFoundException(
          'Student member relationship not found in this family',
        );
      }
      await this.prisma.familyStudent.delete({
        where: {
          familyId_studentProfileId: { familyId, studentProfileId },
        },
      });
    }

    if (guardianProfileId) {
      const existing = await this.prisma.familyGuardian.findUnique({
        where: {
          familyId_guardianProfileId: { familyId, guardianProfileId },
        },
      });
      if (!existing) {
        throw new NotFoundException(
          'Guardian member relationship not found in this family',
        );
      }
      await this.prisma.familyGuardian.delete({
        where: {
          familyId_guardianProfileId: { familyId, guardianProfileId },
        },
      });
    }

    return { message: 'Member removed from family successfully' };
  }

  // --- Guardian Student Relationship Operations ---

  async createRelationship(dto: CreateRelationshipDto) {
    const [guardian, student] = await Promise.all([
      this.prisma.guardianProfile.findUnique({
        where: { id: dto.guardianProfileId },
      }),
      this.prisma.studentProfile.findUnique({
        where: { id: dto.studentProfileId },
      }),
    ]);

    if (!guardian) {
      throw new NotFoundException('Guardian profile not found');
    }
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const existingRel =
      await this.prisma.guardianStudentRelationship.findUnique({
        where: {
          guardianProfileId_studentProfileId: {
            guardianProfileId: dto.guardianProfileId,
            studentProfileId: dto.studentProfileId,
          },
        },
      });
    if (existingRel) {
      throw new ConflictException(
        'A relationship already exists between this guardian and student',
      );
    }

    return this.prisma.guardianStudentRelationship.create({
      data: dto,
    });
  }

  async findAllRelationships(
    page = 1,
    limit = 10,
    guardianProfileId?: string,
    studentProfileId?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (guardianProfileId) where.guardianProfileId = guardianProfileId;
    if (studentProfileId) where.studentProfileId = studentProfileId;

    const [rels, total] = await Promise.all([
      this.prisma.guardianStudentRelationship.findMany({
        where,
        skip,
        take: limit,
        include: {
          guardianProfile: true,
          studentProfile: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guardianStudentRelationship.count({ where }),
    ]);

    return {
      data: rels,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRelationship(guardianProfileId: string, studentProfileId: string) {
    const rel = await this.prisma.guardianStudentRelationship.findUnique({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId,
          studentProfileId,
        },
      },
      include: {
        guardianProfile: true,
        studentProfile: true,
      },
    });
    if (!rel) {
      throw new NotFoundException('Guardian student relationship not found');
    }
    return rel;
  }

  async updateRelationship(
    guardianProfileId: string,
    studentProfileId: string,
    dto: UpdateRelationshipDto,
  ) {
    const rel = await this.prisma.guardianStudentRelationship.findUnique({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId,
          studentProfileId,
        },
      },
    });
    if (!rel) {
      throw new NotFoundException('Guardian student relationship not found');
    }

    return this.prisma.guardianStudentRelationship.update({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId,
          studentProfileId,
        },
      },
      data: dto,
    });
  }

  async deleteRelationship(
    guardianProfileId: string,
    studentProfileId: string,
  ) {
    const rel = await this.prisma.guardianStudentRelationship.findUnique({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId,
          studentProfileId,
        },
      },
    });
    if (!rel) {
      throw new NotFoundException('Guardian student relationship not found');
    }

    await this.prisma.guardianStudentRelationship.delete({
      where: {
        guardianProfileId_studentProfileId: {
          guardianProfileId,
          studentProfileId,
        },
      },
    });

    return { message: 'Guardian student relationship deleted successfully' };
  }

  async selfLink(userId: string, studentEmail: string, relationshipType: any) {
    const guardian = await this.prisma.guardianProfile.findUnique({
      where: { userId },
    });
    if (!guardian) {
      throw new NotFoundException(
        'Guardian profile not found. Please complete your profile details first.',
      );
    }

    const studentUser = await this.prisma.user.findFirst({
      where: { email: studentEmail.toLowerCase().trim() },
      include: {
        studentProfile: true,
      },
    });
    if (!studentUser || !studentUser.studentProfile) {
      throw new NotFoundException(
        `No student account matches the email: ${studentEmail}`,
      );
    }

    const existingRel =
      await this.prisma.guardianStudentRelationship.findUnique({
        where: {
          guardianProfileId_studentProfileId: {
            guardianProfileId: guardian.id,
            studentProfileId: studentUser.studentProfile.id,
          },
        },
      });

    if (existingRel) {
      return existingRel;
    }

    return this.prisma.guardianStudentRelationship.create({
      data: {
        guardianProfileId: guardian.id,
        studentProfileId: studentUser.studentProfile.id,
        relationshipType: relationshipType || 'OTHER',
        isPrimary: false,
        hasAcademicAccess: true,
      },
    });
  }
}
