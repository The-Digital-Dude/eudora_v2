import request from 'supertest';
import {
  TestContext,
  TestUser,
  AuthCreds,
  AcademicWorld,
  createTestApp,
  loginAsSuperAdminFull,
  buildAcademicWorld,
  createStudent,
  cleanupWorld,
  csrfHeaders,
  unwrap,
} from './helpers/fixtures';

describe('Assessment flow: author -> assign -> attempt -> mark -> gradebook (e2e)', () => {
  let ctx: TestContext;
  let admin: AuthCreds;
  let world: AcademicWorld;
  let studentUser: TestUser;
  let studentProfileId: string;
  let subjectId: string;
  let classId: string;
  let typeId: string;
  let questionId: string;
  let correctOptionId: string;
  let assessmentId: string;
  let assignmentId: string;
  let attemptId: string;
  const tag = `AF${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => csrfHeaders(admin);
  const asStudent = () => csrfHeaders(studentUser);

  beforeAll(async () => {
    ctx = await createTestApp();
    admin = await loginAsSuperAdminFull(ctx.app);
    world = await buildAcademicWorld(ctx, admin.token, tag);
    const student = await createStudent(
      ctx,
      admin.token,
      `E2E Assessed ${tag}`,
    );
    studentUser = student.user;
    studentProfileId = student.studentProfileId;

    // Assignments resolve the student's active class-section placement.
    await request(ctx.app.getHttpServer())
      .post('/api/student-placements')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        studentProfileId,
        classSectionId: world.classSectionId,
        academicYearId: world.academicYearId,
      })
      .expect(201);
  });

  afterAll(async () => {
    const { prisma } = ctx;
    if (assessmentId) {
      await (prisma.assessment.deleteMany as any)({
        where: { id: assessmentId },
        forceDelete: true,
      }).catch(() => undefined);
    }
    if (questionId) {
      await (prisma.question.deleteMany as any)({
        where: { id: questionId },
        forceDelete: true,
      }).catch(() => undefined);
    }
    await prisma.subject
      .deleteMany({ where: { code: `E2E-SUB-${tag}` } })
      .catch(() => undefined);
    await prisma.class
      .deleteMany({ where: { code: `E2E-CLS-${tag}` } })
      .catch(() => undefined);
    await prisma.assessmentType
      .deleteMany({ where: { code: `E2E-TYP-${tag}` } })
      .catch(() => undefined);
    await cleanupWorld(ctx, world, [studentUser]);
    await ctx.app.close();
  });

  it('creates the assessment lookups: subject, class, type', async () => {
    const subjectRes = await http()
      .post('/api/subjects')
      .set(asAdmin())
      .send({ code: `E2E-SUB-${tag}`, name: `E2E Subject ${tag}` })
      .expect(201);
    subjectId = unwrap<{ id: string }>(subjectRes).id;

    const classRes = await http()
      .post('/api/classes')
      .set(asAdmin())
      .send({ code: `E2E-CLS-${tag}`, name: `E2E Class ${tag}` })
      .expect(201);
    classId = unwrap<{ id: string }>(classRes).id;

    const typeRes = await http()
      .post('/api/assessments/types')
      .set(asAdmin())
      .send({ code: `E2E-TYP-${tag}`, name: `E2E Type ${tag}` })
      .expect(201);
    typeId = unwrap<{ id: string }>(typeRes).id;
  });

  it('creates an MCQ question with a correct option', async () => {
    const res = await http()
      .post('/api/questions')
      .set(asAdmin())
      .send({
        subjectId,
        classId,
        questionType: 'mcq',
        prompt: 'What is 2 + 2?',
        difficulty: 'easy',
        options: [
          { optionLabel: 'A', optionText: '4', isCorrect: true },
          { optionLabel: 'B', optionText: '5', isCorrect: false },
        ],
      })
      .expect(201);
    const question = unwrap<{
      id: string;
      options: Array<{ id: string; isCorrect: boolean }>;
    }>(res);
    questionId = question.id;
    const correct = question.options.find((o) => o.isCorrect);
    expect(correct).toBeDefined();
    correctOptionId = correct!.id;
  });

  it('creates, populates, and publishes the assessment', async () => {
    const res = await http()
      .post('/api/assessments')
      .set(asAdmin())
      .send({
        assessmentTypeId: typeId,
        subjectId,
        classId,
        title: `E2E Assessment ${tag}`,
        totalMarks: 10,
        // sectionId is mandatory when attaching questions (service-level
        // requireText), so the assessment needs at least one section.
        sections: [{ title: 'Section A', sortOrder: 1 }],
      })
      .expect(201);
    const created = unwrap<{
      id: string;
      sections?: Array<{ id: string }>;
    }>(res);
    assessmentId = created.id;

    let sectionId = created.sections?.[0]?.id;
    if (!sectionId) {
      const getRes = await http()
        .get(`/api/assessments/${assessmentId}`)
        .set(asAdmin())
        .expect(200);
      sectionId = unwrap<{ sections: Array<{ id: string }> }>(getRes)
        .sections[0].id;
    }

    await http()
      .post(`/api/assessments/${assessmentId}/questions`)
      .set(asAdmin())
      .send({ questionId, questionNumber: 1, marksAvailable: 10, sectionId })
      .expect(201);

    await http()
      .post(`/api/assessments/${assessmentId}/publish`)
      .set(asAdmin())
      .expect(201);
  });

  it('assigns the assessment to the student', async () => {
    const res = await http()
      .post('/api/assignments')
      .set(asAdmin())
      .send({ assessmentId, studentProfileId })
      .expect(201);
    assignmentId = unwrap<{ id: string }>(res).id;
  });

  it('lets the student start an attempt and answer correctly', async () => {
    const attemptRes = await http()
      .post('/api/attempts')
      .set(asStudent())
      .send({ assessmentAssignmentId: assignmentId })
      .expect(201);
    attemptId = unwrap<{ id: string }>(attemptRes).id;

    await http()
      .post('/api/responses')
      .set(asStudent())
      .send({
        assessmentAttemptId: attemptId,
        questionId,
        selectedOptionId: correctOptionId,
        timeSpentSeconds: 12,
      })
      .expect(201);
  });

  it('lets the student submit the attempt', async () => {
    await http()
      .post(`/api/attempts/${attemptId}/submit`)
      .set(asStudent())
      .expect(201);
  });

  it('denies marking to the student (403)', async () => {
    await http()
      .post(`/api/attempts/${attemptId}/mark`)
      .set(asStudent())
      .send({ mode: 'auto' })
      .expect(403);
  });

  it('auto-marks the attempt with a full score', async () => {
    const res = await http()
      .post(`/api/attempts/${attemptId}/mark`)
      .set(asAdmin())
      .send({ mode: 'auto' })
      .expect(201);
    const marked = unwrap<{
      rawScore: number | string;
      percentageScore: number | string;
    }>(res);
    expect(Number(marked.rawScore)).toBe(10);
    expect(Number(marked.percentageScore)).toBe(100);
  });

  it('propagates the marked attempt into the gradebook', async () => {
    const entries = await ctx.prisma.gradeBookEntry.findMany({
      where: { studentProfileId, sourceType: 'ASSESSMENT_ATTEMPT' },
    });
    expect(entries.length).toBeGreaterThanOrEqual(1);
  });

  it('denies assessment authoring to the student (403)', async () => {
    await http()
      .post('/api/assessments')
      .set(asStudent())
      .send({
        assessmentTypeId: typeId,
        subjectId,
        classId,
        title: `E2E Illegal ${tag}`,
        totalMarks: 5,
      })
      .expect(403);
  });
});
