import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Batch schedule management: meeting pattern -> preview -> generate.
 *
 * Covers what replaced Timetable. The pattern is a *rule* — it produces
 * BatchSession rows and is never itself the schedule — so the things worth
 * asserting over HTTP are that generation is idempotent, that it refuses
 * rather than silently doing nothing, and that a teacher cannot be booked
 * into two places at once.
 */
describe('Batch schedule (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let batchId: string;

  const tag = `SCHED${Date.now()}`;

  // A fixed, known window: 1 Sep 2026 is a Tuesday, 30 Sep is a Wednesday.
  // Tuesdays in range: 1, 8, 15, 22, 29 — five meetings.
  const RANGE_FROM = '2026-09-01';
  const RANGE_TO = '2026-09-30';
  const EXPECTED_TUESDAYS = 5;

  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@eudora.app', password: 'Admin@123' })
      .expect(200);

    const raw = loginRes.headers['set-cookie'];
    const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const accessCookie = cookies.find((c: string) =>
      c.startsWith('access_token='),
    );
    token = accessCookie ? accessCookie.split(';')[0].split('=')[1] : '';
    expect(token).toBeTruthy();

    const batchRes = await request(app.getHttpServer())
      .post('/api/batches')
      .set(auth())
      .send({
        name: `E2E Schedule Batch ${tag}`,
        code: `E2E-SCHED-${tag}`,
        startDate: RANGE_FROM,
        endDate: RANGE_TO,
      })
      .expect(201);
    batchId = (batchRes.body as { data: { id: string } }).data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('meeting pattern', () => {
    it('refuses to preview before a pattern is set', async () => {
      await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions/preview`)
        .set(auth())
        .send({})
        .expect(400);
    });

    it('sets a weekly pattern', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/batches/${batchId}/meeting-pattern`)
        .set(auth())
        .send({
          meetingDays: ['TUESDAY'],
          meetingStartMinutes: 16 * 60,
          meetingDurationMinutes: 60,
        })
        .expect(200);

      const body = res.body as { data: { meetingDays: string[] } };
      expect(body.data.meetingDays).toEqual(['TUESDAY']);
    });

    it('rejects a start time outside the day', async () => {
      await request(app.getHttpServer())
        .put(`/api/batches/${batchId}/meeting-pattern`)
        .set(auth())
        .send({
          meetingDays: ['TUESDAY'],
          meetingStartMinutes: 24 * 60,
          meetingDurationMinutes: 60,
        })
        .expect(400);
    });

    it('rejects an empty set of days', async () => {
      await request(app.getHttpServer())
        .put(`/api/batches/${batchId}/meeting-pattern`)
        .set(auth())
        .send({
          meetingDays: [],
          meetingStartMinutes: 600,
          meetingDurationMinutes: 60,
        })
        .expect(400);
    });
  });

  describe('preview → generate', () => {
    it('previews every matching weekday without writing anything', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions/preview`)
        .set(auth())
        .send({})
        .expect(201);

      const body = res.body as {
        data: { planned: { date: string; alreadyScheduled: boolean }[] };
      };
      expect(body.data.planned).toHaveLength(EXPECTED_TUESDAYS);
      expect(body.data.planned.every((p) => !p.alreadyScheduled)).toBe(true);

      // Preview is a dry run: nothing should exist yet.
      const listRes = await request(app.getHttpServer())
        .get(`/api/batches/${batchId}/sessions`)
        .set(auth())
        .expect(200);
      expect((listRes.body as { data: unknown[] }).data).toHaveLength(0);
    });

    it('generates the sessions', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions/generate`)
        .set(auth())
        .send({ topic: `Weekly ${tag}` })
        .expect(201);

      const body = res.body as { data: { created: number; skipped: number } };
      expect(body.data.created).toBe(EXPECTED_TUESDAYS);
      expect(body.data.skipped).toBe(0);
    });

    it('lists them in date order with the topic applied', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/batches/${batchId}/sessions`)
        .set(auth())
        .expect(200);

      const sessions = (res.body as { data: { date: string; topic: string }[] })
        .data;
      expect(sessions).toHaveLength(EXPECTED_TUESDAYS);
      expect(sessions.every((s) => s.topic === `Weekly ${tag}`)).toBe(true);

      const dates = sessions.map((s) => s.date.slice(0, 10));
      expect(dates).toEqual([...dates].sort());
    });

    it('is idempotent — a second generate adds nothing and says so', async () => {
      await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions/generate`)
        .set(auth())
        .send({})
        .expect(409);

      const res = await request(app.getHttpServer())
        .get(`/api/batches/${batchId}/sessions`)
        .set(auth())
        .expect(200);
      expect((res.body as { data: unknown[] }).data).toHaveLength(
        EXPECTED_TUESDAYS,
      );
    });

    it('reports already-scheduled dates on a re-preview rather than hiding them', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions/preview`)
        .set(auth())
        .send({})
        .expect(201);

      const planned = (
        res.body as { data: { planned: { alreadyScheduled: boolean }[] } }
      ).data.planned;
      expect(planned).toHaveLength(EXPECTED_TUESDAYS);
      expect(planned.every((p) => p.alreadyScheduled)).toBe(true);
    });

    it('refuses a range the pattern produces no dates in', async () => {
      // Wed 2 Sep to Mon 7 Sep contains no Tuesday.
      await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions/generate`)
        .set(auth())
        .send({ from: '2026-09-02', to: '2026-09-07' })
        .expect(409);
    });
  });

  describe('one-off sessions and deletion', () => {
    let oneOffId: string;

    it('adds a session outside the pattern', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions`)
        .set(auth())
        .send({
          date: '2026-09-03',
          startTime: '2026-09-03T10:00:00.000Z',
          endTime: '2026-09-03T11:00:00.000Z',
          topic: `Make-up ${tag}`,
        })
        .expect(201);
      oneOffId = (res.body as { data: { id: string } }).data.id;
    });

    it('rejects a zero-length meeting', async () => {
      await request(app.getHttpServer())
        .post(`/api/batches/${batchId}/sessions`)
        .set(auth())
        .send({
          date: '2026-09-04',
          startTime: '2026-09-04T10:00:00.000Z',
          endTime: '2026-09-04T10:00:00.000Z',
        })
        .expect(400);
    });

    it('deletes a session that has no attendance', async () => {
      await request(app.getHttpServer())
        .delete(`/api/batches/${batchId}/sessions/${oneOffId}`)
        .set(auth())
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/batches/${batchId}/sessions`)
        .set(auth())
        .expect(200);
      expect((res.body as { data: unknown[] }).data).toHaveLength(
        EXPECTED_TUESDAYS,
      );
    });
  });

  describe('schedule reads', () => {
    it('404s a schedule for a teacher who does not exist', async () => {
      await request(app.getHttpServer())
        .get('/api/schedule/teacher/00000000-0000-4000-8000-000000000000')
        .set(auth())
        .expect(404);
    });

    it('returns an empty schedule for a student enrolled in nothing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/schedule/student/00000000-0000-4000-8000-000000000000')
        .set(auth())
        .expect(200);
      expect((res.body as { data: unknown[] }).data).toEqual([]);
    });
  });

  describe('teacher double-booking', () => {
    // POST /live-classes stamps the authenticated user as the host, so two
    // overlapping live classes booked by the same admin exercise the guard.
    // Unique per run. A fixed date fails on the second run: the previous
    // run left a booking there under the same host, so the "first" booking
    // clashes with it. Same trap that produced the E2E litter elsewhere.
    const day = new Date(
      Date.UTC(2030, 0, 1) + (Date.now() % 2000) * 86_400_000,
    )
      .toISOString()
      .slice(0, 10);

    it('accepts the first booking', async () => {
      await request(app.getHttpServer())
        .post('/api/live-classes')
        .set(auth())
        .send({
          batchId,
          topic: `Clash A ${tag}`,
          startTime: `${day}T09:00:00.000Z`,
          endTime: `${day}T10:00:00.000Z`,
        })
        .expect(201);
    });

    it('refuses an overlapping booking for the same host', async () => {
      await request(app.getHttpServer())
        .post('/api/live-classes')
        .set(auth())
        .send({
          batchId,
          topic: `Clash B ${tag}`,
          startTime: `${day}T09:30:00.000Z`,
          endTime: `${day}T10:30:00.000Z`,
        })
        .expect(409);
    });

    it('allows a back-to-back booking — overlap is half-open', async () => {
      await request(app.getHttpServer())
        .post('/api/live-classes')
        .set(auth())
        .send({
          batchId,
          topic: `Back to back ${tag}`,
          startTime: `${day}T10:00:00.000Z`,
          endTime: `${day}T11:00:00.000Z`,
        })
        .expect(201);
    });
  });
});
