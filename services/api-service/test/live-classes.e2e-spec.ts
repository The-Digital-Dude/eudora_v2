import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Live Classes (e2e)', () => {
  let app: INestApplication<App>;
  let superAdminToken: string;
  let batchId: string;

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

    // Live classes are scheduled per Batch, not per ClassSection — create
    // one to hang the sessions off of, since none is seeded.
    const batchRes = await request(app.getHttpServer())
      .post('/api/batches')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: `E2E Live Batch ${Date.now()}`,
        code: `E2E-LIVE-${Date.now()}`,
      })
      .expect(201);
    batchId = (batchRes.body as { data: { id: string } }).data.id;
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
          batchId,
          topic: 'E2E Live Class',
          startTime: isoStart(60),
          endTime: isoStart(120),
        })
        .expect(201);

      expect(res.body.data.status).toBe('SCHEDULED');
      expect(res.body.data.provider).toBe('NONE');
      sessionId = res.body.data.id;
    });

    it('lists sessions filtered by batchId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/live-classes?batchId=${batchId}`)
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
          batchId,
          topic: 'E2E Cancelled Class',
          startTime: isoStart(60),
          endTime: isoStart(120),
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
          batchId,
          topic: 'Invalid window',
          startTime: isoStart(120),
          endTime: isoStart(60),
        })
        .expect(400);
    });

    it('rejects scheduling against a non-existent batch', async () => {
      await request(app.getHttpServer())
        .post('/api/live-classes')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          batchId: '00000000-0000-0000-0000-000000000000',
          topic: 'Missing batch',
          startTime: isoStart(60),
          endTime: isoStart(120),
        })
        .expect(404);
    });
  });
});
