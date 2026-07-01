import { Test, TestingModule } from '@nestjs/testing';
import { LiveClassesService } from './live-classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LiveClassStatus } from '@prisma/client';

describe('LiveClassesService', () => {
  let service: LiveClassesService;

  const mockPrismaService = {
    classSection: {
      findUnique: jest.fn(),
    },
    liveClassSession: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const baseSession = {
    id: 'session-1',
    classSectionId: 'section-1',
    teacherUserId: 'teacher-1',
    title: 'Fractions Review',
    scheduledStartAt: new Date('2026-07-08T10:00:00.000Z'),
    scheduledEndAt: new Date('2026-07-08T11:00:00.000Z'),
    status: LiveClassStatus.SCHEDULED,
    provider: 'NONE',
    cancelledAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveClassesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LiveClassesService>(LiveClassesService);
    jest.clearAllMocks();
  });

  describe('scheduleLiveClass', () => {
    it('throws NotFoundException if the class section does not exist', async () => {
      mockPrismaService.classSection.findUnique.mockResolvedValue(null);

      await expect(
        service.scheduleLiveClass(
          {
            classSectionId: 'missing',
            title: 'Test',
            scheduledStartAt: '2026-07-08T10:00:00.000Z',
            scheduledEndAt: '2026-07-08T11:00:00.000Z',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if scheduledEndAt is not after scheduledStartAt', async () => {
      mockPrismaService.classSection.findUnique.mockResolvedValue({
        id: 'section-1',
      });

      await expect(
        service.scheduleLiveClass(
          {
            classSectionId: 'section-1',
            title: 'Test',
            scheduledStartAt: '2026-07-08T11:00:00.000Z',
            scheduledEndAt: '2026-07-08T10:00:00.000Z',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a SCHEDULED session with the given teacher as host', async () => {
      mockPrismaService.classSection.findUnique.mockResolvedValue({
        id: 'section-1',
      });
      mockPrismaService.liveClassSession.create.mockResolvedValue(
        baseSession,
      );

      const result = await service.scheduleLiveClass(
        {
          classSectionId: 'section-1',
          title: 'Fractions Review',
          scheduledStartAt: '2026-07-08T10:00:00.000Z',
          scheduledEndAt: '2026-07-08T11:00:00.000Z',
        },
        'teacher-1',
      );

      expect(mockPrismaService.liveClassSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            classSectionId: 'section-1',
            teacherUserId: 'teacher-1',
            title: 'Fractions Review',
          }),
        }),
      );
      expect(result).toEqual(baseSession);
    });
  });

  describe('getLiveClassById', () => {
    it('throws NotFoundException if the session does not exist', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue(null);

      await expect(service.getLiveClassById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rescheduleLiveClass', () => {
    it('throws BadRequestException if the session is already CANCELLED', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.CANCELLED,
      });

      await expect(
        service.rescheduleLiveClass('session-1', { title: 'New title' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if the session is already ENDED', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.ENDED,
      });

      await expect(
        service.rescheduleLiveClass('session-1', { title: 'New title' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if the new window is invalid', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue(
        baseSession,
      );

      await expect(
        service.rescheduleLiveClass('session-1', {
          scheduledStartAt: '2026-07-08T12:00:00.000Z',
          scheduledEndAt: '2026-07-08T11:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the session when SCHEDULED and the window is valid', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue(
        baseSession,
      );
      mockPrismaService.liveClassSession.update.mockResolvedValue({
        ...baseSession,
        title: 'Updated title',
      });

      const result = await service.rescheduleLiveClass('session-1', {
        title: 'Updated title',
      });

      expect(mockPrismaService.liveClassSession.update).toHaveBeenCalled();
      expect(result.title).toBe('Updated title');
    });
  });

  describe('cancelLiveClass', () => {
    it('throws BadRequestException if already CANCELLED or ENDED', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.ENDED,
      });

      await expect(service.cancelLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to CANCELLED and stamps cancelledAt', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue(
        baseSession,
      );
      mockPrismaService.liveClassSession.update.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      const result = await service.cancelLiveClass('session-1');

      expect(mockPrismaService.liveClassSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: LiveClassStatus.CANCELLED,
          }),
        }),
      );
      expect(result.status).toBe(LiveClassStatus.CANCELLED);
    });
  });

  describe('startLiveClass', () => {
    it('throws BadRequestException if the session is already LIVE (no double-start)', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.LIVE,
      });

      await expect(service.startLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if the session is CANCELLED', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.CANCELLED,
      });

      await expect(service.startLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to LIVE when currently SCHEDULED', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue(
        baseSession,
      );
      mockPrismaService.liveClassSession.update.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.LIVE,
      });

      const result = await service.startLiveClass('session-1');

      expect(result.status).toBe(LiveClassStatus.LIVE);
    });
  });

  describe('endLiveClass', () => {
    it('throws BadRequestException if the session is not LIVE', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue(
        baseSession,
      );

      await expect(service.endLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to ENDED when currently LIVE', async () => {
      mockPrismaService.liveClassSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.LIVE,
      });
      mockPrismaService.liveClassSession.update.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.ENDED,
      });

      const result = await service.endLiveClass('session-1');

      expect(result.status).toBe(LiveClassStatus.ENDED);
    });
  });
});
