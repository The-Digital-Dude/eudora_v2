import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLessonDto,
  CreateCardDto,
  SubmitCardResponseDto,
  UpdateLessonDto,
  UpdateCardDto,
  ReorderCardsDto,
} from './dto/lessons.dto';
import { deriveSeed } from '../common/widgets/seed.util';
import { generateWidgetInstance } from '../common/widgets/widget-generator';
import { gradeWidgetSubmission } from '../common/widgets/widget-grader';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async listLessons(conceptId?: string) {
    const where = conceptId ? { conceptId } : {};
    return this.prisma.lesson.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: {
        concept: {
          select: { name: true },
        },
      },
    });
  }

  private async getOrCreateStudentProfile(userId: string) {
    let student = await this.prisma.studentProfile.findUnique({
      where: { userId },
    });

    if (!student) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }

      student = await this.prisma.studentProfile.create({
        data: {
          userId,
          fullName: `${user.firstName} ${user.lastName}`,
          birthDate: new Date('2010-01-01'),
          gender: 'OTHER',
          status: 'ACTIVE',
        },
      });
    }

    return student;
  }

  async getLessonFlow(lessonId: string, userId: string) {
    const student = await this.getOrCreateStudentProfile(userId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        cards: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    // Find or create lesson attempt
    let attempt = await this.prisma.lessonAttempt.findFirst({
      where: {
        lessonId,
        studentProfileId: student.id,
        status: 'IN_PROGRESS',
      },
      include: {
        cardResponses: true,
      },
    });

    if (!attempt) {
      attempt = await this.prisma.lessonAttempt.create({
        data: {
          lessonId,
          studentProfileId: student.id,
          status: 'IN_PROGRESS',
        },
        include: {
          cardResponses: true,
        },
      });
    }

    return {
      lesson: {
        ...lesson,
        cards: this.enrichCardsForAttempt(lesson.cards, attempt.id),
      },
      attempt,
    };
  }

  // Replaces each card's stored question config/options with the instance
  // generated for this specific attempt — a no-op for fixed/legacy questions
  // (the generator resolves to the exact same stored shape), and the actual
  // per-attempt randomization for parameterized ones. Same (attemptId, cardId)
  // always regenerates the same instance, so this stays stable across
  // refreshes and retries within one attempt.
  private enrichCardsForAttempt<
    T extends { id: string; question: Parameters<typeof generateWidgetInstance>[0] | null },
  >(cards: T[], attemptId: string): T[] {
    return cards.map((card) => {
      if (!card.question) {
        return card;
      }
      const seed = deriveSeed(attemptId, card.id);
      const instance = generateWidgetInstance(card.question, seed);
      return {
        ...card,
        question: {
          ...card.question,
          widgetConfig: instance.displayConfig,
          options: instance.options ?? card.question.options,
        },
      };
    });
  }

  async submitCardResponse(
    userId: string,
    cardId: string,
    submission: SubmitCardResponseDto,
  ) {
    const student = await this.getOrCreateStudentProfile(userId);

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        question: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    // Retrieve active attempt
    let attempt = await this.prisma.lessonAttempt.findFirst({
      where: {
        lessonId: card.lessonId,
        studentProfileId: student.id,
        status: 'IN_PROGRESS',
      },
    });

    if (!attempt) {
      attempt = await this.prisma.lessonAttempt.create({
        data: {
          lessonId: card.lessonId,
          studentProfileId: student.id,
          status: 'IN_PROGRESS',
        },
      });
    }

    // Evaluate correctness via the shared widget grader — recomputes the
    // same per-attempt generated instance used to render this card, so a
    // parameterized question is graded against whatever was actually shown,
    // never against anything the client could have altered.
    let isCorrect = true;
    let correctReveal: unknown;
    const explanation = card.question?.explanation || 'Card completed.';

    if (card.cardType !== 'CONCEPTUAL' && card.question) {
      const seed = deriveSeed(attempt.id, card.id);
      const instance = generateWidgetInstance(card.question, seed);
      const graded = gradeWidgetSubmission(instance.resolvedAnswer, {
        selectedOptionId: submission.selectedOptionId,
        responseText: submission.responseText,
        interactionState: submission.interactionState,
      });
      isCorrect = graded.isCorrect ?? true;
      // Only ever reveal the correct-answer data once the student has
      // actually gotten it wrong — never leak it alongside a correct
      // submission, and never before one exists at all.
      if (!isCorrect) {
        correctReveal = graded.correctReveal;
      }
    }

    // Retrieve previous response status
    const previousResponse = await this.prisma.studentCardResponse.findUnique({
      where: {
        lessonAttemptId_cardId: {
          lessonAttemptId: attempt.id,
          cardId,
        },
      },
    });

    const wasAlreadyCorrect = previousResponse?.isCorrect || false;

    // Save response trace
    const finalResponse = await this.prisma.studentCardResponse.upsert({
      where: {
        lessonAttemptId_cardId: {
          lessonAttemptId: attempt.id,
          cardId,
        },
      },
      update: {
        attemptsCount: previousResponse
          ? previousResponse.attemptsCount + 1
          : 1,
        isCorrect,
        interactionTrace: submission.interactionState || null,
      },
      create: {
        lessonAttemptId: attempt.id,
        cardId,
        attemptsCount: 1,
        isCorrect,
        interactionTrace: submission.interactionState || null,
      },
    });

    // Handle XP allocation and leveling up if correct and was not already completed
    let xpEarned = 0;
    if (isCorrect && !wasAlreadyCorrect) {
      const attemptsCount = finalResponse.attemptsCount;
      if (card.cardType === 'CONCEPTUAL') {
        xpEarned = 5;
      } else if (attemptsCount === 1) {
        xpEarned = 15; // First try correct
      } else {
        xpEarned = 8; // Subsequent try correct
      }

      await this.awardXp(student.id, xpEarned);
      await this.updateStreak(student.id);

      // Add XP to attempt log
      await this.prisma.lessonAttempt.update({
        where: { id: attempt.id },
        data: {
          xpEarned: { increment: xpEarned },
          timeSpentSeconds: { increment: submission.timeSpentSeconds },
        },
      });
    }

    // Check if entire lesson is completed
    const allCards = await this.prisma.card.findMany({
      where: { lessonId: card.lessonId },
      select: { id: true, cardType: true },
    });

    const correctResponses = await this.prisma.studentCardResponse.findMany({
      where: {
        lessonAttemptId: attempt.id,
        isCorrect: true,
      },
      select: { cardId: true },
    });

    const correctCardIds = new Set(correctResponses.map((r) => r.cardId));
    const allCompleted = allCards.every(
      (c) => c.cardType === 'CONCEPTUAL' || correctCardIds.has(c.id),
    );

    if (allCompleted && attempt.status !== 'COMPLETED') {
      // Complete attempt
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: card.lessonId },
        select: { xpReward: true },
      });
      const completeBonus = lesson?.xpReward || 50;

      await this.prisma.lessonAttempt.update({
        where: { id: attempt.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          xpEarned: { increment: completeBonus },
        },
      });

      await this.awardXp(student.id, completeBonus);
      xpEarned += completeBonus;
    }

    return {
      isCorrect,
      explanation,
      xpEarned,
      isLessonComplete: allCompleted,
      ...(correctReveal !== undefined ? { correctReveal } : {}),
    };
  }

  private async awardXp(studentProfileId: string, amount: number) {
    let exp = await this.prisma.studentExperience.findUnique({
      where: { studentProfileId },
    });

    if (!exp) {
      exp = await this.prisma.studentExperience.create({
        data: {
          studentProfileId,
          totalXp: 0,
          level: 1,
          nextLevelXp: 100,
        },
      });
    }

    const newXp = exp.totalXp + amount;
    let currentLevel = exp.level;
    let nextThreshold = exp.nextLevelXp;

    // Simple level progression: level logic increases threshold progressively
    while (newXp >= nextThreshold) {
      currentLevel += 1;
      nextThreshold = Math.round(nextThreshold * 1.5);
    }

    await this.prisma.studentExperience.update({
      where: { studentProfileId },
      data: {
        totalXp: newXp,
        level: currentLevel,
        nextLevelXp: nextThreshold,
      },
    });
  }

  private async updateStreak(studentProfileId: string) {
    const streak = await this.prisma.studentStreak.findUnique({
      where: { studentProfileId },
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayDate = new Date(todayStr);

    if (!streak) {
      await this.prisma.studentStreak.create({
        data: {
          studentProfileId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: todayDate,
          streakCharges: 1,
        },
      });
      return;
    }

    if (!streak.lastActiveDate) {
      await this.prisma.studentStreak.update({
        where: { studentProfileId },
        data: {
          currentStreak: 1,
          longestStreak: Math.max(streak.longestStreak, 1),
          lastActiveDate: todayDate,
        },
      });
      return;
    }

    const lastActiveStr = streak.lastActiveDate.toISOString().split('T')[0];
    const lastActiveDate = new Date(lastActiveStr);

    const diffTime = Math.abs(todayDate.getTime() - lastActiveDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Already active today, streak is untouched
      return;
    }

    if (diffDays === 1) {
      // Active consecutive day, increment streak
      const newStreak = streak.currentStreak + 1;
      await this.prisma.studentStreak.update({
        where: { studentProfileId },
        data: {
          currentStreak: newStreak,
          longestStreak: Math.max(streak.longestStreak, newStreak),
          lastActiveDate: todayDate,
        },
      });
    } else {
      // Streak broken. Check if they have streak charges/freezes.
      if (streak.streakCharges > 0) {
        // Freeze active. Consume 1 charge, keep the streak
        const newStreak = streak.currentStreak + 1;
        await this.prisma.studentStreak.update({
          where: { studentProfileId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(streak.longestStreak, newStreak),
            streakCharges: streak.streakCharges - 1,
            lastActiveDate: todayDate,
          },
        });
      } else {
        // Reset streak to 1
        await this.prisma.studentStreak.update({
          where: { studentProfileId },
          data: {
            currentStreak: 1,
            lastActiveDate: todayDate,
          },
        });
      }
    }
  }

  // Admin capabilities for authoring
  async createLesson(dto: CreateLessonDto) {
    return this.prisma.lesson.create({
      data: {
        conceptId: dto.conceptId,
        title: dto.title,
        description: dto.description || null,
        sortOrder: dto.sortOrder || 1,
        xpReward: dto.xpReward || 50,
      },
    });
  }

  async createCard(dto: CreateCardDto) {
    return this.prisma.card.create({
      data: {
        lessonId: dto.lessonId,
        title: dto.title,
        sortOrder: dto.sortOrder || 1,
        cardType: dto.cardType,
        content: dto.content,
        questionId: dto.questionId || null,
      },
    });
  }

  async updateLesson(id: string, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }
    return this.prisma.lesson.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.xpReward !== undefined ? { xpReward: dto.xpReward } : {}),
      },
    });
  }

  async updateCard(id: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    return this.prisma.card.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.cardType !== undefined ? { cardType: dto.cardType } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.questionId !== undefined ? { questionId: dto.questionId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async reorderCards(lessonId: string, dto: ReorderCardsDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const cardOrder of dto.cards) {
        const updated = await tx.card.update({
          where: { id: cardOrder.cardId, lessonId },
          data: { sortOrder: cardOrder.sortOrder },
        });
        results.push(updated);
      }
      return results;
    });
  }

  async deleteCard(id: string) {
    const card = await this.prisma.card.findUnique({ where: { id } });
    if (!card) {
      throw new NotFoundException('Card not found');
    }
    return this.prisma.card.delete({ where: { id } });
  }
}
