import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TeacherApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { assertPdfUpload } from '../common/files/pdf-upload.validator';
import {
  CreateTeacherApplicationDto,
  ReviewTeacherApplicationDto,
} from './dto/teacher-application.dto';

/** Where CVs live in the private bucket. */
const RESUME_KEY_PREFIX = 'teacher-applications';

/**
 * What an applicant may see about their own application. Notably not
 * `reviewNotes` — those are the operator's working notes about a person, not
 * feedback written for them.
 */
const APPLICANT_VIEW = {
  id: true,
  status: true,
  fullName: true,
  phone: true,
  specialization: true,
  yearsExperience: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
} satisfies Prisma.TeacherApplicationSelect;

@Injectable()
export class TeacherApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  /**
   * Files an application for the signed-in user. Grants nothing: the account
   * keeps whatever role it already had until a reviewer approves.
   */
  async apply(userId: string, dto: CreateTeacherApplicationDto, resume: any) {
    assertPdfUpload(resume);

    const existing = await this.prisma.teacherApplication.findUnique({
      where: { userId },
      select: { id: true, status: true },
    });
    if (existing) {
      // Re-applying after a rejection is a conversation to have with the
      // operator, not a form to resubmit — otherwise a rejected applicant can
      // refile in a loop and the queue becomes theirs to fill.
      throw new ConflictException(
        existing.status === 'REJECTED'
          ? 'This account has already applied and was not accepted. Contact us if your circumstances have changed.'
          : 'You already have an application in progress.',
      );
    }

    const alreadyTeaching = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (alreadyTeaching) {
      throw new ConflictException('This account already teaches here.');
    }

    // Stored before the row exists, so a failure leaves an orphaned object
    // rather than a row pointing at a file that was never saved. The former is
    // a cleanup job; the latter is a review with nothing to review.
    const file = await this.uploads.uploadPrivateFile(
      resume,
      userId,
      RESUME_KEY_PREFIX,
    );

    return this.prisma.teacherApplication.create({
      data: {
        userId,
        fullName: dto.fullName,
        phone: dto.phone,
        specialization: dto.specialization,
        yearsExperience: dto.yearsExperience,
        bio: dto.bio,
        resumeFileId: file.id,
      },
      select: APPLICANT_VIEW,
    });
  }

  /**
   * The applicant's own status page. Null rather than 404 — "you have not
   * applied" is a valid answer, not a missing resource.
   */
  async findMine(userId: string) {
    return this.prisma.teacherApplication.findUnique({
      where: { userId },
      select: APPLICANT_VIEW,
    });
  }

  /**
   * The review queue. Unreviewed first, then oldest first, so the application
   * that has been waiting longest is the one on top.
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    status?: TeacherApplicationStatus;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const where: Prisma.TeacherApplicationWhereInput = params.status
      ? { status: params.status }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.teacherApplication.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
        include: {
          user: { select: { id: true, email: true } },
          resumeFile: { select: { id: true, originalName: true, size: true } },
          reviewedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.teacherApplication.count({ where }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        resumeFile: { select: { id: true, originalName: true, size: true } },
        reviewedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return application;
  }

  /** Resolves an application's CV for a reviewer the controller has already gated. */
  async readResume(id: string) {
    const application = await this.prisma.teacherApplication.findUnique({
      where: { id },
      select: { resumeFileId: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    return this.uploads.readPrivateFile(application.resumeFileId);
  }

  /**
   * Records a decision, and for an approval performs the grant it authorises:
   * the TEACHER role and the teacher_profiles row are created here and nowhere
   * else in this flow. One transaction, so an account can never come away
   * holding the role without the profile — the same split that stranded
   * guardians on a portal none of whose endpoints would answer them.
   */
  async review(
    id: string,
    reviewerId: string,
    dto: ReviewTeacherApplicationDto,
  ) {
    if (dto.status === 'PENDING') {
      throw new BadRequestException(
        'An application cannot be returned to PENDING once it has been read.',
      );
    }

    const application = await this.prisma.teacherApplication.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        fullName: true,
        phone: true,
        specialization: true,
      },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.status === 'APPROVED') {
      throw new ConflictException(
        'This application was already approved. Change the teacher record instead.',
      );
    }

    if (dto.status !== 'APPROVED') {
      return this.prisma.teacherApplication.update({
        where: { id },
        data: {
          status: dto.status,
          reviewNotes: dto.reviewNotes,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
    }

    const teacherRole = await this.prisma.role.findUnique({
      where: { name: 'TEACHER' },
      select: { id: true },
    });
    if (!teacherRole) {
      throw new NotFoundException('TEACHER role not found in database');
    }

    if (dto.employeeCode) {
      const taken = await this.prisma.teacherProfile.findUnique({
        where: { employeeCode: dto.employeeCode },
        select: { id: true },
      });
      if (taken) {
        throw new ConflictException('Employee code is already in use');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // The applicant keeps the role they signed up with and gains TEACHER
      // alongside it. skipDuplicates because an admin may have assigned it by
      // hand while the application sat in the queue, and that should not turn
      // approval into a 500.
      await tx.userRole.createMany({
        data: [{ userId: application.userId, roleId: teacherRole.id }],
        skipDuplicates: true,
      });

      // Upsert for the same reason. `update: {}` leaves an existing profile
      // exactly as it is — approval should not quietly overwrite details an
      // administrator has already curated.
      await tx.teacherProfile.upsert({
        where: { userId: application.userId },
        update: {},
        create: {
          userId: application.userId,
          fullName: application.fullName,
          phone: application.phone,
          specialization: application.specialization,
          employeeCode: dto.employeeCode,
        },
      });

      return tx.teacherApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewNotes: dto.reviewNotes,
          reviewedById: reviewerId,
          reviewedAt: new Date(),
        },
      });
    });
  }
}
