import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Live Classes (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let classSectionId: string;

  const isoStart = (offsetMinutes: number) =>
    new Date(Date.now() + offsetMinutes * 60_000).toISOString();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@eudora.app',
        password: 'Admin@123',
      })
      .expect(200);

    const rawCookies = loginRes.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const accessTokenCookie = cookies.find((cookie: string) =>
      cookie.startsWith('access_token='),
    );
    superAdminToken = accessTokenCookie
      ? accessTokenCookie.split(';')[0].split('=')[1]
      : '';
    expect(superAdminToken).toBeDefined();

    const section = await prisma.classSection.findFirst({
      where: { code: 'CS-2026-A' },
    });
    expect(section).toBeTruthy();
    classSectionId = section!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('schedule → list → start → end', () => {
    let sessionId: string;

    it('schedules a live class session', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/live-classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classSectionId,
          title: 'E2E Live Class',
          scheduledStartAt: isoStart(60),
          scheduledEndAt: isoStart(120),
        })
        .expect(201);

      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.provider).toBe('NONE');
      sessionId = res.body.data.id;
    });

    it('lists sessions filtered by classSectionId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/live-classes?classSectionId=${classSectionId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(
        res.body.data.some((s: { id: string }) => s.id === sessionId),
      ).toBe(true);
    });

    it('lists sessions filtered by status=SCHEDULED', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/live-classes?status=SCHEDULED')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(
        res.body.data.some((s: { id: string }) => s.id === sessionId),
      ).toBe(true);
    });

    it('starts the session', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/live-classes/${sessionId}/start`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('LIVE');
    });

    it('rejects starting an already-LIVE session', async () => {
      await request(app.getHttpServer())
        .patch(`/api/live-classes/${sessionId}/start`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);
    });

    it('ends the session', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/live-classes/${sessionId}/end`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data.status).toBe('ENDED');
    });
  });

  describe('schedule → cancel → start rejected', () => {
    it('cancelling a session blocks it from ever being started', async () => {
      const scheduleRes = await request(app.getHttpServer())
        .post('/api/live-classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classSectionId,
          title: 'E2E Cancelled Class',
          scheduledStartAt: isoStart(60),
          scheduledEndAt: isoStart(120),
        })
        .expect(201);

      const sessionId = scheduleRes.body.data.id;

      await request(app.getHttpServer())
        .patch(`/api/live-classes/${sessionId}/cancel`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/live-classes/${sessionId}/start`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);
    });
  });

  describe('validation', () => {
    it('rejects an invalid scheduling window', async () => {
      await request(app.getHttpServer())
        .post('/api/live-classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classSectionId,
          title: 'Invalid window',
          scheduledStartAt: isoStart(120),
          scheduledEndAt: isoStart(60),
        })
        .expect(400);
    });

    it('rejects scheduling against a non-existent class section', async () => {
      await request(app.getHttpServer())
        .post('/api/live-classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          classSectionId: '00000000-0000-0000-0000-000000000000',
          title: 'Missing section',
          scheduledStartAt: isoStart(60),
          scheduledEndAt: isoStart(120),
        })
        .expect(404);
    });
  });
});
