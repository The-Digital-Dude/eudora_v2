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

/**
 * Scope B acceptance suite (docs/scoping-smoke-tests-and-soft-delete-2026-07-03.md):
 * archive -> invisible -> history intact -> restorable, Restrict back-stop,
 * and lifecycle of archived user accounts.
 */
describe('Soft delete: archive -> invisible -> restore (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let world: AcademicWorld;
  let studentUser: TestUser;
  let studentProfileId: string;
  const tag = `SD${Date.now()}`;
  const attendanceDate = '2026-04-06';

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    world = await buildAcademicWorld(ctx, adminToken, tag);

    const student = await createStudent(ctx, adminToken, `E2E Archived ${tag}`);
    studentUser = student.user;
    studentProfileId = student.studentProfileId;

    await http()
      .post('/api/student-placements')
      .set(asAdmin())
      .send({
        studentProfileId,
        classSectionId: world.classSectionId,
        academicYearId: world.academicYearId,
      })
      .expect(201);
    await http()
      .post('/api/attendance/daily')
      .set(asAdmin())
      .send({
        classSectionId: world.classSectionId,
        date: attendanceDate,
        records: [{ studentProfileId, status: 'PRESENT' }],
      })
      .expect(201);
  });

  afterAll(async () => {
    await cleanupWorld(ctx, world, [studentUser]);
    await ctx.app.close();
  });

  it('archives the student instead of deleting', async () => {
    const res = await http()
      .delete(`/api/student-profiles/${studentProfileId}`)
      .set(asAdmin())
      .expect(200);
    expect(unwrap<{ message: string }>(res).message).toContain('archived');

    const row = await (ctx.prisma.studentProfile.findUnique as any)({
      where: { id: studentProfileId },
      includeArchived: true,
    });
    expect(row).not.toBeNull();
    expect(row!.deletedAt).not.toBeNull();
  });

  it('hides the archived student from lists and detail routes', async () => {
    const listRes = await http()
      .get('/api/student-profiles?limit=100')
      .set(asAdmin())
      .expect(200);
    const list = unwrap<{ data: Array<{ id: string }> }>(listRes);
    expect(list.data.some((p) => p.id === studentProfileId)).toBe(false);

    await http()
      .get(`/api/student-profiles/${studentProfileId}`)
      .set(asAdmin())
      .expect(404);
  });

  it('keeps the learning history intact under the archive', async () => {
    const attendance = await ctx.prisma.dailyAttendance.count({
      where: { studentProfileId },
    });
    expect(attendance).toBeGreaterThanOrEqual(1);
  });

  it('shows the archived student when includeArchived is requested', async () => {
    const res = await http()
      .get('/api/student-profiles?limit=100&includeArchived=true')
      .set(asAdmin())
      .expect(200);
    const list = unwrap<{ data: Array<{ id: string; deletedAt: string | null }> }>(
      res,
    );
    const archived = list.data.find((p) => p.id === studentProfileId);
    expect(archived).toBeDefined();
    expect(archived!.deletedAt).not.toBeNull();
  });

  it('restores the student', async () => {
    await http()
      .post(`/api/student-profiles/${studentProfileId}/restore`)
      .set(asAdmin())
      .expect(201);

    await http()
      .get(`/api/student-profiles/${studentProfileId}`)
      .set(asAdmin())
      .expect(200);
  });

  it('back-stops raw hard deletes of students with history (Restrict edges)', async () => {
    await expect(
      (ctx.prisma.studentProfile.delete as any)({
        where: { id: studentProfileId },
        forceDelete: true,
      }),
    ).rejects.toThrow();
  });

  it('blocks authentication for archived user accounts', async () => {
    const doomed = await registerUser(ctx);
    // Archive via the extension's delete rewrite.
    await ctx.prisma.user.delete({ where: { id: doomed.id } });

    await http()
      .post('/api/auth/login')
      .send({ email: doomed.email, password: 'Password@123' })
      .expect(401);

    // Existing bearer tokens die with the archive too.
    await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${doomed.token}`)
      .expect(401);

    // Policy: the archived email stays reserved (restore, don't re-register).
    await http()
      .post('/api/auth/register')
      .send({
        email: doomed.email,
        password: 'Password@123',
        firstName: 'Copy',
        lastName: 'Cat',
      })
      .expect(409);

    await cleanupWorld(ctx, null, [doomed]);
  });

  it('archives a campus together with its programs', async () => {
    const campusRes = await http()
      .post('/api/campuses')
      .set(asAdmin())
      .send({ name: `E2E SD Campus ${tag}` })
      .expect(201);
    const campusId = unwrap<{ id: string }>(campusRes).id;
    const programRes = await http()
      .post('/api/programs')
      .set(asAdmin())
      .send({ campusId, name: `E2E SD Program ${tag}`, code: `E2E-SDP-${tag}` })
      .expect(201);
    const programId = unwrap<{ id: string }>(programRes).id;

    await http().delete(`/api/campuses/${campusId}`).set(asAdmin()).expect(200);

    const program = await (ctx.prisma.program.findUnique as any)({
      where: { id: programId },
      includeArchived: true,
    });
    expect(program!.deletedAt).not.toBeNull();

    await (ctx.prisma.campus.deleteMany as any)({
      where: { id: campusId },
      forceDelete: true,
    });
  });
});
