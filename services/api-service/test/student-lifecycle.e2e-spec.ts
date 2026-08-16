import request from 'supertest';
import {
  TestContext,
  TestUser,
  AcademicWorld,
  createTestApp,
  loginAsSuperAdmin,
  registerUser,
  buildAcademicWorld,
  createStudent,
  cleanupWorld,
  unwrap,
} from './helpers/fixtures';

describe('Student lifecycle: create -> place -> enroll -> attendance (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let plainUser: TestUser;
  let world: AcademicWorld;
  let studentUser: TestUser;
  let studentProfileId: string;
  const tag = `SL${Date.now()}`;
  const attendanceDate = '2026-03-02';

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    plainUser = await registerUser(ctx);
    world = await buildAcademicWorld(ctx, adminToken, tag);
  });

  afterAll(async () => {
    await cleanupWorld(ctx, world, [plainUser, studentUser].filter(Boolean));
    await ctx.app.close();
  });

  it('creates a student profile linked to a user account', async () => {
    const created = await createStudent(ctx, adminToken, `E2E Student ${tag}`);
    studentUser = created.user;
    studentProfileId = created.studentProfileId;

    const res = await http()
      .get(`/api/student-profiles/${studentProfileId}`)
      .set(asAdmin())
      .expect(200);
    const profile = unwrap<{ fullName: string; userId: string }>(res);
    expect(profile.fullName).toBe(`E2E Student ${tag}`);
    expect(profile.userId).toBe(studentUser.id);
  });

  it('places the student in the class section for the academic year', async () => {
    await http()
      .post('/api/student-placements')
      .set(asAdmin())
      .send({
        studentProfileId,
        classSectionId: world.classSectionId,
        academicYearId: world.academicYearId,
      })
      .expect(201);

    const res = await http()
      .get(
        `/api/student-placements/${studentProfileId}/${world.classSectionId}`,
      )
      .set(asAdmin())
      .expect(200);
    const placement = unwrap<{ studentProfileId: string }>(res);
    expect(placement.studentProfileId).toBe(studentProfileId);
  });

  it('enrolls the student in the course class', async () => {
    const res = await http()
      .post('/api/student-enrollments')
      .set(asAdmin())
      .send({ studentProfileId, batchId: world.batchId })
      .expect(201);
    const enrollment = unwrap<{ id: string; batchId: string }>(res);
    expect(enrollment.batchId).toBe(world.batchId);
  });

  it('rejects a duplicate enrollment in the same course class', async () => {
    const res = await http()
      .post('/api/student-enrollments')
      .set(asAdmin())
      .send({ studentProfileId, batchId: world.batchId });
    // Unique constraint [studentProfileId, batchId] — any 4xx is a
    // correct rejection; a 2xx or 5xx here is a regression.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('records daily attendance for the class section', async () => {
    await http()
      .post('/api/attendance/daily')
      .set(asAdmin())
      .send({
        classSectionId: world.classSectionId,
        date: attendanceDate,
        records: [{ studentProfileId, status: 'PRESENT' }],
      })
      .expect(201);

    const res = await http()
      .get(
        `/api/attendance/daily/class-section/${world.classSectionId}?date=${attendanceDate}`,
      )
      .set(asAdmin())
      .expect(200);
    const payload = unwrap<any>(res);
    const rows: Array<{ studentProfileId: string; status: string }> =
      Array.isArray(payload) ? payload : (payload.records ?? payload.data);
    const row = rows.find((r) => r.studentProfileId === studentProfileId);
    expect(row).toBeDefined();
    expect(row!.status).toBe('PRESENT');
  });

  it('recording attendance again for the same day upserts, not duplicates', async () => {
    await http()
      .post('/api/attendance/daily')
      .set(asAdmin())
      .send({
        classSectionId: world.classSectionId,
        date: attendanceDate,
        records: [{ studentProfileId, status: 'LATE' }],
      })
      .expect(201);

    const count = await ctx.prisma.dailyAttendance.count({
      where: {
        studentProfileId,
        classSectionId: world.classSectionId,
        date: new Date(attendanceDate),
      },
    });
    expect(count).toBe(1);
  });

  it('denies placement creation to a plain USER role (403)', async () => {
    await http()
      .post('/api/student-placements')
      .set('Authorization', `Bearer ${plainUser.token}`)
      .send({
        studentProfileId,
        classSectionId: world.classSectionId,
        academicYearId: world.academicYearId,
      })
      .expect(403);
  });

  it('denies the student list to an unauthenticated request (401)', async () => {
    await http().get('/api/student-profiles').expect(401);
  });
});
