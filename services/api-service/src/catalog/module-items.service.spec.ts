import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ModuleItemKind } from '@prisma/client';
import { ModuleItemsService } from './module-items.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionService } from '../progression/progression.service';
import { ActingStudentService } from '../entitlements/acting-student.service';

describe('ModuleItemsService.getMySessionForItem', () => {
  let service: ModuleItemsService;

  const prisma = {
    moduleItem: { findUnique: jest.fn() },
    studentCourseEnrollment: { findMany: jest.fn() },
    batchSession: { findFirst: jest.fn() },
  };
  const acting = { resolve: jest.fn() };

  const liveItem = {
    id: 'item-1',
    kind: ModuleItemKind.LIVE_CLASS,
    title: 'Live Walkthrough',
    deletedAt: null,
  };

  beforeEach(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        ModuleItemsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProgressionService, useValue: {} },
        { provide: ActingStudentService, useValue: acting },
      ],
    }).compile();
    service = mod.get(ModuleItemsService);
    jest.clearAllMocks();
  });

  it('rejects an item that is not a live class', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue({
      ...liveItem,
      kind: ModuleItemKind.VIDEO,
    });
    await expect(service.getMySessionForItem('item-1', 'u1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('404s on a soft-deleted item', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue({
      ...liveItem,
      deletedAt: new Date(),
    });
    await expect(service.getMySessionForItem('item-1', 'u1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reports NOT_A_STUDENT when the caller resolves to no student profile', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue(liveItem);
    acting.resolve.mockResolvedValue(null);

    const result = await service.getMySessionForItem('item-1', 'u1');

    expect(result).toEqual({ session: null, reason: 'NOT_A_STUDENT' });
  });

  it('reports NOT_IN_A_BATCH when the student has no active enrollment', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue(liveItem);
    acting.resolve.mockResolvedValue('student-1');
    prisma.studentCourseEnrollment.findMany.mockResolvedValue([]);

    const result = await service.getMySessionForItem('item-1', 'u1');

    expect(result).toEqual({ session: null, reason: 'NOT_IN_A_BATCH' });
  });

  it('reports NOT_SCHEDULED when the batch has not scheduled this item', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue(liveItem);
    acting.resolve.mockResolvedValue('student-1');
    prisma.studentCourseEnrollment.findMany.mockResolvedValue([
      { batchId: 'batch-1' },
    ]);
    prisma.batchSession.findFirst.mockResolvedValue(null);

    const result = await service.getMySessionForItem('item-1', 'u1');

    expect(result).toEqual({ session: null, reason: 'NOT_SCHEDULED' });
  });

  it('scopes the lookup to the batches the student is actually enrolled in', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue(liveItem);
    acting.resolve.mockResolvedValue('student-1');
    prisma.studentCourseEnrollment.findMany.mockResolvedValue([
      { batchId: 'batch-1' },
      { batchId: 'batch-2' },
    ]);
    prisma.batchSession.findFirst.mockResolvedValue({
      id: 'session-1',
      startUrl: 'https://zoom.example/host',
      joinUrl: 'https://zoom.example/join',
    });

    await service.getMySessionForItem('item-1', 'u1');

    expect(prisma.batchSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          moduleItemId: 'item-1',
          batchId: { in: ['batch-1', 'batch-2'] },
        }),
      }),
    );
  });

  it('never leaks the host startUrl to a learner', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue(liveItem);
    acting.resolve.mockResolvedValue('student-1');
    prisma.studentCourseEnrollment.findMany.mockResolvedValue([
      { batchId: 'batch-1' },
    ]);
    prisma.batchSession.findFirst.mockResolvedValue({
      id: 'session-1',
      startUrl: 'https://zoom.example/host',
      joinUrl: 'https://zoom.example/join',
    });

    const result = await service.getMySessionForItem('item-1', 'u1');

    expect(result.session).not.toHaveProperty('startUrl');
    expect(result.session).toMatchObject({
      joinUrl: 'https://zoom.example/join',
    });
  });

  it('passes the acting-child header through so a guardian sees the child session', async () => {
    prisma.moduleItem.findUnique.mockResolvedValue(liveItem);
    acting.resolve.mockResolvedValue('child-1');
    prisma.studentCourseEnrollment.findMany.mockResolvedValue([]);

    await service.getMySessionForItem('item-1', 'guardian-user', 'child-1');

    expect(acting.resolve).toHaveBeenCalledWith('guardian-user', 'child-1');
  });
});
