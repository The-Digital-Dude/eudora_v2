import request from 'supertest';
import {
  TestContext,
  TestUser,
  AcademicWorld,
  createTestApp,
  loginAsSuperAdmin,
  buildAcademicWorld,
  createStudent,
  cleanupWorld,
  unwrap,
} from './helpers/fixtures';

describe('Homework flow: assign -> submit -> grade -> gradebook (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let world: AcademicWorld;
  let studentUser: TestUser;
  let studentProfileId: string;
  let homeworkId: string;
  let submissionId: string;
  const tag = `HW${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });
  const asStudent = () => ({ Authorization: `Bearer ${studentUser.token}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    world = await buildAcademicWorld(ctx, adminToken, tag);

    const student = await createStudent(ctx, adminToken, `E2E HW Student ${tag}`);
    studentUser = student.user;
    studentProfileId = student.studentProfileId;

    await http()
      .post('/api/student-enrollments')
      .set(asAdmin())
      .send({ studentProfileId, batchId: world.batchId })
      .expect(201);
  });

  afterAll(async () => {
    if (homeworkId) {
      await ctx.prisma.homework
        .deleteMany({ where: { id: homeworkId } })
        .catch(() => undefined);
    }
    await cleanupWorld(ctx, world, [studentUser]);
    await ctx.app.close();
  });

  it('lets the admin assign homework to the course class', async () => {
    const res = await http()
      .post('/api/homework')
      .set(asAdmin())
      .send({
        batchId: world.batchId,
        title: `E2E Homework ${tag}`,
        description: 'Solve the practice set',
        dueDate: '2026-12-31T23:59:59.000Z',
        maxPoints: 100,
      })
      .expect(201);
    homeworkId = unwrap<{ id: string }>(res).id;
    expect(homeworkId).toBeTruthy();
  });

  it('lists the homework for the course class', async () => {
    const res = await http()
      .get(`/api/homework/course-class/${world.batchId}`)
      .set(asAdmin())
      .expect(200);
    const payload = unwrap<any>(res);
    const items: Array<{ id: string }> = Array.isArray(payload)
      ? payload
      : payload.data;
    expect(items.some((h) => h.id === homeworkId)).toBe(true);
  });

  it('shows the homework as pending for the student', async () => {
    const res = await http()
      .get('/api/homework/me/pending')
      .set(asStudent())
      .expect(200);
    const payload = unwrap<any>(res);
    const items: Array<{ id: string }> = Array.isArray(payload)
      ? payload
      : payload.data;
    expect(items.some((h) => h.id === homeworkId)).toBe(true);
  });

  it('lets the student submit', async () => {
    const res = await http()
      .post('/api/homework/submit')
      .set(asStudent())
      .send({ homeworkId, content: 'My answers: 42.' })
      .expect(201);
    const submission = unwrap<{ id: string; status: string }>(res);
    submissionId = submission.id;
    expect(['SUBMITTED', 'LATE']).toContain(submission.status);
  });

  it('denies grading to the student (403)', async () => {
    await http()
      .patch(`/api/homework/submissions/${submissionId}/grade`)
      .set(asStudent())
      .send({ pointsEarned: 100 })
      .expect(403);
  });

  it('lets the admin grade the submission', async () => {
    const res = await http()
      .patch(`/api/homework/submissions/${submissionId}/grade`)
      .set(asAdmin())
      .send({ pointsEarned: 85, feedback: 'Solid work' })
      .expect(200);
    const graded = unwrap<{ status: string; pointsEarned: number }>(res);
    expect(graded.status).toBe('GRADED');
    expect(Number(graded.pointsEarned)).toBe(85);
  });

  it('propagates the grade into the gradebook (evidence chain)', async () => {
    const entries = await ctx.prisma.gradeBookEntry.findMany({
      where: { studentProfileId },
    });
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const hwEntry = entries.find(
      (e) => e.sourceType === 'HOMEWORK_SUBMISSION',
    );
    expect(hwEntry).toBeDefined();
  });

  it('denies homework creation to the student (403)', async () => {
    await http()
      .post('/api/homework')
      .set(asStudent())
      .send({
        batchId: world.batchId,
        title: `E2E Illegal ${tag}`,
        dueDate: '2026-12-31T23:59:59.000Z',
        maxPoints: 10,
      })
      .expect(403);
  });
});
