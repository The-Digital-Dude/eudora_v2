import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHomeworkDto, UpdateHomeworkDto } from './dto/homework.dto';
import { SubmitHomeworkDto, GradeSubmissionDto } from './dto/submission.dto';
import { SubmissionStatus } from '@prisma/client';

@Injectable()
export class HomeworkService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Homework Assignments Operations ────────────────────────────────────────

  async createHomework(dto: CreateHomeworkDto, recordedByUserId?: string) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: dto.courseClassId },
    });
    if (!courseClass) {
      throw new NotFoundException('Course class not found');
    }

    const due = new Date(dto.dueDate);
    if (isNaN(due.getTime())) {
      throw new BadRequestException('Invalid due date format');
    }

    return this.prisma.homework.create({
      data: {
        courseClassId: dto.courseClassId,
        title: dto.title,
        description: dto.description,
        dueDate: due,
        maxPoints: dto.maxPoints,
        attachmentUrl: dto.attachmentUrl,
        recordedById: recordedByUserId,
      },
    });
  }

  async updateHomework(id: string, dto: UpdateHomeworkDto) {
    const homework = await this.prisma.homework.findUnique({
      where: { id },
    });
    if (!homework) {
      throw new NotFoundException('Homework not found');
    }

    let due = homework.dueDate;
    if (dto.dueDate) {
      due = new Date(dto.dueDate);
      if (isNaN(due.getTime())) {
        throw new BadRequestException('Invalid due date format');
      }
    }

    return this.prisma.homework.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        dueDate: dto.dueDate ? due : undefined,
        maxPoints: dto.maxPoints ?? undefined,
        attachmentUrl: dto.attachmentUrl ?? undefined,
      },
    });
  }

  async getHomeworkForClass(courseClassId: string) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
    });
    if (!courseClass) {
      throw new NotFoundException('Course class not found');
    }

    return this.prisma.homework.findMany({
      where: { courseClassId },
      orderBy: { dueDate: 'desc' },
    });
  }

  // ─── Submissions Operations ──────────────────────────────────────────────────

  async submitHomework(studentProfileId: string, dto: SubmitHomeworkDto) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: dto.homeworkId },
    });
    if (!homework) {
      throw new NotFoundException('Homework assignment not found');
    }

    // Verify student is enrolled in the course class
    const enrollment = await this.prisma.studentCourseEnrollment.findUnique({
      where: {
        studentProfileId_courseClassId: {
          studentProfileId,
          courseClassId: homework.courseClassId,
        },
      },
    });
    if (!enrollment) {
      throw new BadRequestException(
        'Student is not enrolled in the course class for this homework',
      );
    }

    const now = new Date();
    const isLate = now > homework.dueDate;
    const initialStatus = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

    return this.prisma.homeworkSubmission.upsert({
      where: {
        homeworkId_studentProfileId: {
          homeworkId: dto.homeworkId,
          studentProfileId,
        },
      },
      update: {
        content: dto.content,
        submissionDate: now,
        status: initialStatus,
        // Reset grade fields if resubmitted
        pointsEarned: null,
        feedback: null,
        gradedById: null,
        gradedAt: null,
      },
      create: {
        homeworkId: dto.homeworkId,
        studentProfileId,
        content: dto.content,
        submissionDate: now,
        status: initialStatus,
      },
    });
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, gradedByUserId?: string) {
    const submission = await this.prisma.homeworkSubmission.findUnique({
      where: { id: submissionId },
      include: { homework: true },
    });
    if (!submission) {
      throw new NotFoundException('Homework submission not found');
    }

    if (dto.pointsEarned > submission.homework.maxPoints) {
      throw new BadRequestException(
        `Points earned (${dto.pointsEarned}) cannot exceed max points for homework (${submission.homework.maxPoints})`,
      );
    }

    return this.prisma.homeworkSubmission.update({
      where: { id: submissionId },
      data: {
        pointsEarned: dto.pointsEarned,
        feedback: dto.feedback ?? undefined,
        status: SubmissionStatus.GRADED,
        gradedById: gradedByUserId,
        gradedAt: new Date(),
      },
    });
  }

  async getSubmissionsForHomework(homeworkId: string) {
    const homework = await this.prisma.homework.findUnique({
      where: { id: homeworkId },
    });
    if (!homework) {
      throw new NotFoundException('Homework assignment not found');
    }

    return this.prisma.homeworkSubmission.findMany({
      where: { homeworkId },
      include: {
        studentProfile: true,
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });
  }

  async getStudentSubmissions(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    return this.prisma.homeworkSubmission.findMany({
      where: { studentProfileId },
      include: {
        homework: {
          include: {
            courseClass: true,
          },
        },
      },
      orderBy: {
        submissionDate: 'desc',
      },
    });
  }
}
