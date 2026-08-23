import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        experience: true,
        streak: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const completedLessonsCount = await this.prisma.lessonAttempt.count({
      where: {
        studentProfileId: student.id,
        status: 'COMPLETED',
      },
    });

    return {
      experience: {
        totalXp: student.experience?.totalXp ?? 0,
        level: student.experience?.level ?? 1,
        nextLevelXp: student.experience?.nextLevelXp ?? 100,
      },
      streak: {
        currentStreak: student.streak?.currentStreak ?? 0,
        longestStreak: student.streak?.longestStreak ?? 0,
        lastActiveDate: student.streak?.lastActiveDate ?? null,
      },
      lessonsCompleted: completedLessonsCount,
    };
  }

  // Daily "Today's goals" checklist — computed live from timestamps that
  // already exist (LessonAttempt.completedAt, ModuleItemProgress.completedAt)
  // rather than a new persisted daily counter. Targets are hardcoded for v1;
  // admin-configurable targets are future work.
  async getToday(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [lessonsToday, videosToday, readingsToday, moduleItemsToday] =
      await Promise.all([
        this.prisma.lessonAttempt.count({
          where: {
            studentProfileId: student.id,
            status: 'COMPLETED',
            completedAt: { gte: startOfToday },
          },
        }),
        this.prisma.moduleItemProgress.count({
          where: {
            studentProfileId: student.id,
            completedAt: { gte: startOfToday },
            moduleItem: { kind: 'VIDEO' },
          },
        }),
        this.prisma.moduleItemProgress.count({
          where: {
            studentProfileId: student.id,
            completedAt: { gte: startOfToday },
            moduleItem: { kind: 'READING' },
          },
        }),
        this.prisma.moduleItemProgress.count({
          where: {
            studentProfileId: student.id,
            completedAt: { gte: startOfToday },
          },
        }),
      ]);

    const targets = { items: 3, videos: 3, readings: 2 };
    const itemsCompleted = lessonsToday + moduleItemsToday;

    return {
      goals: [
        {
          key: 'items',
          label: 'Complete any 3 learning items',
          target: targets.items,
          progress: Math.min(itemsCompleted, targets.items),
        },
        {
          key: 'videos',
          label: 'Watch 3 videos',
          target: targets.videos,
          progress: Math.min(videosToday, targets.videos),
        },
        {
          key: 'readings',
          label: 'Complete 2 readings',
          target: targets.readings,
          progress: Math.min(readingsToday, targets.readings),
        },
      ],
    };
  }

  async getLeaderboard(
    studentProfileId: string,
    scope: 'class' | 'year' = 'class',
  ) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        placements: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const activePlacement = student.placements.find((p) => p.isActive);
    if (!activePlacement && scope === 'class') {
      return { data: [], me: null };
    }

    // Query students with experience
    let whereClause: any = {};
    if (scope === 'class' && activePlacement) {
      whereClause = {
        placements: {
          some: {
            classSectionId: activePlacement.classSectionId,
            isActive: true,
          },
        },
      };
    }

    const students = await this.prisma.studentProfile.findMany({
      where: whereClause,
      include: {
        experience: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // Map and sort by XP desc
    const ranked = students
      .map((s) => ({
        studentProfileId: s.id,
        fullName: s.fullName,
        totalXp: s.experience?.totalXp ?? 0,
        level: s.experience?.level ?? 1,
      }))
      .sort((a, b) => b.totalXp - a.totalXp)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    const myRow = ranked.find((r) => r.studentProfileId === student.id) || null;

    return {
      data: ranked,
      me: myRow,
    };
  }

  async getBadges(studentProfileId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: {
        experience: true,
        streak: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Student profile not found');
    }

    const totalXp = student.experience?.totalXp ?? 0;
    const currentStreak = student.streak?.currentStreak ?? 0;
    const completedLessonsCount = await this.prisma.lessonAttempt.count({
      where: {
        studentProfileId: student.id,
        status: 'COMPLETED',
      },
    });

    const badges = [
      {
        code: 'FIRST_STEPS',
        name: 'First Steps',
        description: 'Complete your first active learning lesson.',
        earned: completedLessonsCount >= 1,
        progress: completedLessonsCount,
        maxProgress: 1,
      },
      {
        code: 'LESSON_EXPLORER',
        name: 'Lesson Explorer',
        description: 'Complete 5 active learning lessons.',
        earned: completedLessonsCount >= 5,
        progress: completedLessonsCount,
        maxProgress: 5,
      },
      {
        code: 'XP_SCHOLAR',
        name: 'XP Scholar',
        description: 'Earn 500 total Experience Points (XP).',
        earned: totalXp >= 500,
        progress: totalXp,
        maxProgress: 500,
      },
      {
        code: 'XP_MASTER',
        name: 'XP Master',
        description: 'Earn 1,500 total Experience Points (XP).',
        earned: totalXp >= 1500,
        progress: totalXp,
        maxProgress: 1500,
      },
      {
        code: 'STREAK_STARTER',
        name: 'Streak Starter',
        description: 'Maintain an active login streak of 3 days.',
        earned: currentStreak >= 3,
        progress: currentStreak,
        maxProgress: 3,
      },
      {
        code: 'STREAK_LEGEND',
        name: 'Streak Legend',
        description: 'Maintain an active login streak of 7 days.',
        earned: currentStreak >= 7,
        progress: currentStreak,
        maxProgress: 7,
      },
    ];

    return badges;
  }
}
