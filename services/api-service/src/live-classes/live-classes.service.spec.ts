import { Test, TestingModule } from '@nestjs/testing';
import { LiveClassesService } from './live-classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { BatchSessionsService } from '../batch-sessions/batch-sessions.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LiveClassStatus, ModuleItemKind } from '@prisma/client';

describe('LiveClassesService', () => {
  let service: LiveClassesService;

  const mockBatchSessions = { createSession: jest.fn() };

  const mockPrismaService = {
    batch: {
      findUnique: jest.fn(),
    },
    moduleItem: {
      findUnique: jest.fn(),
    },
    batchSession: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const baseSession = {
    id: 'session-1',
    batchId: 'batch-1',
    moduleItemId: null,
    teacherUserId: 'teacher-1',
    topic: 'Fractions Review',
    date: new Date('2026-07-08T00:00:00.000Z'),
    startTime: new Date('2026-07-08T10:00:00.000Z'),
    endTime: new Date('2026-07-08T11:00:00.000Z'),
    status: LiveClassStatus.SCHEDULED,
    provider: 'NONE',
    cancelledAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveClassesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BatchSessionsService, useValue: mockBatchSessions },
      ],
    }).compile();

    service = module.get<LiveClassesService>(LiveClassesService);
    jest.clearAllMocks();
    // Creation is delegated to BatchSessionsService; the service then
    // re-reads the row with its relations.
    mockBatchSessions.createSession.mockResolvedValue({ id: 'session-1' });
    mockPrismaService.batchSession.findUniqueOrThrow.mockResolvedValue(
      baseSession,
    );
  });

  describe('scheduleLiveClass', () => {
    it('throws NotFoundException if the batch does not exist', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue(null);

      await expect(
        service.scheduleLiveClass(
          {
            batchId: 'missing',
            topic: 'Test',
            startTime: '2026-07-08T10:00:00.000Z',
            endTime: '2026-07-08T11:00:00.000Z',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if endTime is not after startTime', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        courseId: 'course-1',
      });

      await expect(
        service.scheduleLiveClass(
          {
            batchId: 'batch-1',
            topic: 'Test',
            startTime: '2026-07-08T11:00:00.000Z',
            endTime: '2026-07-08T10:00:00.000Z',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a SCHEDULED session with the given teacher as host', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        courseId: 'course-1',
      });
      mockPrismaService.batchSession.create.mockResolvedValue(baseSession);

      const result = await service.scheduleLiveClass(
        {
          batchId: 'batch-1',
          topic: 'Fractions Review',
          startTime: '2026-07-08T10:00:00.000Z',
          endTime: '2026-07-08T11:00:00.000Z',
        },
        'teacher-1',
      );

      expect(mockBatchSessions.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          batchId: 'batch-1',
          teacherUserId: 'teacher-1',
          topic: 'Fractions Review',
          // The instant is handed over as-is; reducing it to a DATE is
          // BatchSessionsService's job, covered by its own spec.
          date: new Date('2026-07-08T10:00:00.000Z'),
          startTime: new Date('2026-07-08T10:00:00.000Z'),
          endTime: new Date('2026-07-08T11:00:00.000Z'),
        }),
      );
      expect(result).toEqual(baseSession);
    });

    it('rejects a module item that is not a LIVE_CLASS', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        courseId: 'course-1',
      });
      mockPrismaService.moduleItem.findUnique.mockResolvedValue({
        id: 'item-1',
        kind: ModuleItemKind.VIDEO,
        title: 'A video',
        deletedAt: null,
        concept: { courseId: 'course-1' },
      });

      await expect(
        service.scheduleLiveClass(
          {
            batchId: 'batch-1',
            moduleItemId: 'item-1',
            startTime: '2026-07-08T10:00:00.000Z',
            endTime: '2026-07-08T11:00:00.000Z',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a module item belonging to a different course than the batch', async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        courseId: 'course-1',
      });
      mockPrismaService.moduleItem.findUnique.mockResolvedValue({
        id: 'item-1',
        kind: ModuleItemKind.LIVE_CLASS,
        title: 'Plot a Triangle',
        deletedAt: null,
        concept: { courseId: 'course-2' },
      });

      await expect(
        service.scheduleLiveClass(
          {
            batchId: 'batch-1',
            moduleItemId: 'item-1',
            startTime: '2026-07-08T10:00:00.000Z',
            endTime: '2026-07-08T11:00:00.000Z',
          },
          'teacher-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("falls back to the module item's title when no topic is given", async () => {
      mockPrismaService.batch.findUnique.mockResolvedValue({
        id: 'batch-1',
        courseId: 'course-1',
      });
      mockPrismaService.moduleItem.findUnique.mockResolvedValue({
        id: 'item-1',
        kind: ModuleItemKind.LIVE_CLASS,
        title: 'Plot a Triangle',
        deletedAt: null,
        concept: { courseId: 'course-1' },
      });
      mockPrismaService.batchSession.create.mockResolvedValue(baseSession);

      await service.scheduleLiveClass(
        {
          batchId: 'batch-1',
          moduleItemId: 'item-1',
          startTime: '2026-07-08T10:00:00.000Z',
          endTime: '2026-07-08T11:00:00.000Z',
        },
        'teacher-1',
      );

      expect(mockBatchSessions.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          moduleItemId: 'item-1',
          topic: 'Plot a Triangle',
        }),
      );
    });
  });

  describe('getLiveClassById', () => {
    it('throws NotFoundException if the session does not exist', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(null);

      await expect(service.getLiveClassById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('rescheduleLiveClass', () => {
    it('throws BadRequestException if the session is already CANCELLED', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.CANCELLED,
      });

      await expect(
        service.rescheduleLiveClass('session-1', { topic: 'New topic' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if the session is already ENDED', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.ENDED,
      });

      await expect(
        service.rescheduleLiveClass('session-1', { topic: 'New topic' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if the new window is invalid', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(baseSession);

      await expect(
        service.rescheduleLiveClass('session-1', {
          startTime: '2026-07-08T12:00:00.000Z',
          endTime: '2026-07-08T11:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the session when SCHEDULED and the window is valid', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(baseSession);
      mockPrismaService.batchSession.update.mockResolvedValue({
        ...baseSession,
        topic: 'Updated topic',
      });

      const result = await service.rescheduleLiveClass('session-1', {
        topic: 'Updated topic',
      });

      expect(mockPrismaService.batchSession.update).toHaveBeenCalled();
      expect(result.topic).toBe('Updated topic');
    });

    it('moves the DATE column when the start instant moves to another day', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(baseSession);
      mockPrismaService.batchSession.update.mockResolvedValue(baseSession);

      await service.rescheduleLiveClass('session-1', {
        startTime: '2026-07-09T10:00:00.000Z',
        endTime: '2026-07-09T11:00:00.000Z',
      });

      expect(mockPrismaService.batchSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            date: new Date('2026-07-09T00:00:00.000Z'),
          }),
        }),
      );
    });
  });

  describe('cancelLiveClass', () => {
    it('throws BadRequestException if already CANCELLED or ENDED', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.ENDED,
      });

      await expect(service.cancelLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to CANCELLED and stamps cancelledAt', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(baseSession);
      mockPrismaService.batchSession.update.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.CANCELLED,
        cancelledAt: new Date(),
      });

      const result = await service.cancelLiveClass('session-1');

      expect(mockPrismaService.batchSession.update).toHaveBeenCalledWith(
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
      mockPrismaService.batchSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.LIVE,
      });

      await expect(service.startLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if the session is CANCELLED', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.CANCELLED,
      });

      await expect(service.startLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to LIVE when currently SCHEDULED', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(baseSession);
      mockPrismaService.batchSession.update.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.LIVE,
      });

      const result = await service.startLiveClass('session-1');

      expect(result.status).toBe(LiveClassStatus.LIVE);
    });
  });

  describe('endLiveClass', () => {
    it('throws BadRequestException if the session is not LIVE', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue(baseSession);

      await expect(service.endLiveClass('session-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sets status to ENDED when currently LIVE', async () => {
      mockPrismaService.batchSession.findUnique.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.LIVE,
      });
      mockPrismaService.batchSession.update.mockResolvedValue({
        ...baseSession,
        status: LiveClassStatus.ENDED,
      });

      const result = await service.endLiveClass('session-1');

      expect(result.status).toBe(LiveClassStatus.ENDED);
    });
  });
});
