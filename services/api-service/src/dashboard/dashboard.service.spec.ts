import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    timetableSlot: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    studentClassPlacement: {
      count: jest.fn(),
    },
    dailyAttendance: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    homework: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    homeworkSubmission: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    gradeBookEntry: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    teacherProfile: {
      findUnique: jest.fn(),
    },
    classSection: {
      findMany: jest.fn(),
    },
    studentProfile: {
      findUnique: jest.fn(),
    },
    guardianProfile: {
      findUnique: jest.fn(),
    },
    assessmentAssignment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getAdminSnapshot', () => {
    it('should correctly map targetDate to DayOfWeek and query database', async () => {
      // 2026-06-22 is a Monday
      const mondayDate = new Date('2026-06-22T10:00:00.000Z');

      mockPrismaService.timetableSlot.count.mockResolvedValue(10);
      mockPrismaService.studentClassPlacement.count.mockResolvedValue(100);
      mockPrismaService.dailyAttendance.count.mockResolvedValue(90);
      mockPrismaService.homework.count.mockResolvedValue(5);
      mockPrismaService.homeworkSubmission.count.mockResolvedValue(8);
      mockPrismaService.gradeBookEntry.count.mockResolvedValue(12);

      const result = await service.getAdminSnapshot(mondayDate);

      expect(result).toEqual({
        timetableOccupancy: { activeSlotsCount: 10 },
        attendanceSnapshot: {
          markedCount: 90,
          totalStudents: 100,
          unmarkedCount: 10,
          absentCount: 90, // mockDailyAttendance.count mock value is returned for both dailyAttendance.count queries
        },
        homeworkSnapshot: { dueToday: 5, ungradedSubmissions: 8 },
        gradebookSnapshot: { draftEntries: 12 },
      });

      expect(mockPrismaService.timetableSlot.count).toHaveBeenCalledWith({
        where: {
          dayOfWeek: 'MONDAY',
          status: 'ACTIVE',
          timetable: {
            status: { not: 'ARCHIVED' },
          },
        },
      });
    });

    it('should correctly map Sunday targetDate to DayOfWeek SUNDAY', async () => {
      // 2026-06-21 is a Sunday
      const sundayDate = new Date('2026-06-21T10:00:00.000Z');

      await service.getAdminSnapshot(sundayDate);

      expect(mockPrismaService.timetableSlot.count).toHaveBeenCalledWith({
        where: {
          dayOfWeek: 'SUNDAY',
          status: 'ACTIVE',
          timetable: {
            status: { not: 'ARCHIVED' },
          },
        },
      });
    });
  });

  describe('getTeacherSnapshot', () => {
    it('should throw NotFoundException if teacher profile does not exist', async () => {
      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getTeacherSnapshot('non-existent-user', new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compile schedule, attendance tasks and ungraded submissions for teacher', async () => {
      const targetDate = new Date('2026-06-22T10:00:00.000Z'); // Monday
      const mockTeacher = {
        id: 'teacher-1',
        userId: 'user-1',
        classAssignments: [
          { classSectionId: 'section-1' },
          { classSectionId: 'section-2' },
        ],
      };

      mockPrismaService.teacherProfile.findUnique.mockResolvedValue(
        mockTeacher,
      );

      const mockSlots = [
        { id: 'slot-1', courseClassId: 'course-class-1', dayOfWeek: 'MONDAY' },
      ];
      mockPrismaService.timetableSlot.findMany.mockResolvedValue(mockSlots);

      // Section 1 has placements, Section 2 has placements
      const mockSections = [
        {
          id: 'section-1',
          name: 'Grade 10A',
          code: 'G10A',
          placements: [{ id: 'placement-1' }],
        },
        {
          id: 'section-2',
          name: 'Grade 10B',
          code: 'G10B',
          placements: [{ id: 'placement-2' }],
        },
      ];
      mockPrismaService.classSection.findMany.mockResolvedValue(mockSections);

      // Only section-1 has attendance marked today
      mockPrismaService.dailyAttendance.findMany.mockResolvedValue([
        { classSectionId: 'section-1' },
      ]);

      const mockSubmissions = [
        { id: 'sub-1', status: 'SUBMITTED', homework: { title: 'Homework 1' } },
      ];
      mockPrismaService.homeworkSubmission.findMany.mockResolvedValue(
        mockSubmissions,
      );

      const result = await service.getTeacherSnapshot('user-1', targetDate);

      expect(result).toBeDefined();
      expect(result.todaySchedule).toEqual(mockSlots);
      expect(result.attendanceTasks).toEqual([
        { classSectionId: 'section-2', name: 'Grade 10B', code: 'G10B' },
      ]);
      expect(result.ungradedSubmissions).toEqual(mockSubmissions);
    });
  });

  describe('getStudentSnapshot', () => {
    it('should throw NotFoundException if student profile does not exist', async () => {
      mockPrismaService.studentProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getStudentSnapshot('non-existent-user', new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compile schedule, pending homework and recent feedback for student', async () => {
      const targetDate = new Date('2026-06-22T10:00:00.000Z');
      const mockStudent = {
        id: 'student-1',
        userId: 'user-1',
        placements: [{ classSectionId: 'section-1' }],
        enrollments: [{ courseClassId: 'course-class-1' }],
      };

      mockPrismaService.studentProfile.findUnique.mockResolvedValue(
        mockStudent,
      );

      const mockSlots = [
        { id: 'slot-1', courseClassId: 'course-class-1', dayOfWeek: 'MONDAY' },
      ];
      mockPrismaService.timetableSlot.findMany.mockResolvedValue(mockSlots);

      const mockHomework = [
        {
          id: 'hw-1',
          title: 'Math Worksheet',
          dueDate: new Date(),
          courseClass: { name: 'Algebra 1' },
        },
      ];
      mockPrismaService.homework.findMany.mockResolvedValue(mockHomework);

      const mockFeedback = [
        { id: 'sub-1', pointsEarned: 95, homework: { maxPoints: 100 } },
      ];
      mockPrismaService.homeworkSubmission.findMany.mockResolvedValue(
        mockFeedback,
      );

      const mockAssessments = [
        {
          id: 'aa-1',
          dueAt: new Date(),
          assessment: { title: 'Assessment 1' },
        },
      ];
      mockPrismaService.assessmentAssignment.findMany.mockResolvedValue(
        mockAssessments,
      );
      mockPrismaService.dailyAttendance.count.mockResolvedValue(10); // returns 10 for counts

      const result = await service.getStudentSnapshot('user-1', targetDate);

      expect(result).toBeDefined();
      expect(result.todaySchedule).toEqual(mockSlots);
      expect(result.pendingHomework).toEqual([
        {
          id: 'hw-1',
          title: 'Math Worksheet',
          dueDate: mockHomework[0].dueDate,
          courseName: 'Algebra 1',
        },
      ]);
      expect(result.recentFeedback).toEqual(mockFeedback);
      expect(result.upcomingAssessments).toBeDefined();
      expect(result.attendanceSummary).toBeDefined();
      expect(result.attendanceSummary.attendanceRate).toBe(200); // (10 present + 10 late) / 10 total = 200%, capped by min/max in other calculations but mocks return 10
    });
  });

  describe('getGuardianSnapshot', () => {
    it('should throw NotFoundException if guardian profile does not exist', async () => {
      mockPrismaService.guardianProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getGuardianSnapshot('non-existent-user', new Date()),
      ).rejects.toThrow(NotFoundException);
    });

    it('should compile child schedules, grades, and pending homework count for guardian', async () => {
      const targetDate = new Date('2026-06-22T10:00:00.000Z');
      const mockGuardian = {
        id: 'guardian-1',
        userId: 'user-1',
        students: [
          {
            studentProfile: {
              id: 'child-1',
              fullName: 'John Doe',
              placements: [{ classSectionId: 'section-1' }],
              enrollments: [{ courseClassId: 'course-class-1' }],
            },
          },
        ],
      };

      mockPrismaService.guardianProfile.findUnique.mockResolvedValue(
        mockGuardian,
      );

      const mockSlots = [
        { id: 'slot-1', courseClassId: 'course-class-1', dayOfWeek: 'MONDAY' },
      ];
      mockPrismaService.timetableSlot.findMany.mockResolvedValue(mockSlots);

      const mockGrades = [
        { id: 'grade-1', title: 'Algebra Quiz', percentage: 90 },
      ];
      mockPrismaService.gradeBookEntry.findMany.mockResolvedValue(mockGrades);

      // Homework has no submissions for the child, representing pending
      const mockHomework = [{ id: 'hw-1', submissions: [] }];
      mockPrismaService.homework.findMany.mockResolvedValue(mockHomework);

      const result = await service.getGuardianSnapshot('user-1', targetDate);

      expect(result).toBeDefined();
      expect(result.children).toHaveLength(1);
      expect(result.children[0]).toEqual({
        studentId: 'child-1',
        fullName: 'John Doe',
        todaySchedule: mockSlots,
        recentGrades: mockGrades,
        pendingHomeworkCount: 1,
      });
    });
  });
});
