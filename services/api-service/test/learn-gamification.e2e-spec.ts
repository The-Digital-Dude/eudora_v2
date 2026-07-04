import request from 'supertest';
import {
  TestContext,
  TestUser,
  createTestApp,
  loginAsSuperAdmin,
  createStudent,
  cleanupWorld,
  unwrap,
} from './helpers/fixtures';

describe('Learn flow: lesson -> card submit -> XP & streak (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let studentUser: TestUser;
  let studentProfileId: string;
  let conceptId: string;
  let lessonId: string;
  let cardId: string;
  const tag = `LG${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });
  const asStudent = () => ({ Authorization: `Bearer ${studentUser.token}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    const student = await createStudent(ctx, adminToken, `E2E Learner ${tag}`);
    studentUser = student.user;
    studentProfileId = student.studentProfileId;
  });

  afterAll(async () => {
    if (conceptId) {
      await ctx.prisma.concept
        .deleteMany({ where: { id: conceptId } })
        .catch(() => undefined);
    }
    await cleanupWorld(ctx, null, [studentUser]);
    await ctx.app.close();
  });

  it('lets the admin author a lesson with a card', async () => {
    const conceptRes = await http()
      .post('/api/evaluation/concepts')
      .set(asAdmin())
      .send({ name: `E2E Learn Concept ${tag}` })
      .expect(201);
    conceptId = unwrap<{ id: string }>(conceptRes).id;

    const lessonRes = await http()
      .post('/api/lessons')
      .set(asAdmin())
      .send({
        conceptId,
        title: `E2E Lesson ${tag}`,
        description: 'Fractions on a number line',
        xpReward: 50,
      })
      .expect(201);
    lessonId = unwrap<{ id: string }>(lessonRes).id;

    const cardRes = await http()
      .post('/api/lessons/cards')
      .set(asAdmin())
      .send({
        lessonId,
        title: `E2E Card ${tag}`,
        cardType: 'CONCEPTUAL',
        content: 'A fraction represents part of a whole.',
      })
      .expect(201);
    cardId = unwrap<{ id: string }>(cardRes).id;
  });

  it('serves the lesson flow to the student', async () => {
    const res = await http()
      .get(`/api/lessons/${lessonId}/flow`)
      .set(asStudent())
      .expect(200);
    const flow = unwrap<{
      lesson: { cards: Array<{ id: string }> };
      attempt: { status: string };
    }>(res);
    expect(flow.lesson.cards.some((c) => c.id === cardId)).toBe(true);
    expect(flow.attempt.status).toBe('IN_PROGRESS');
  });

  it('accepts the card submission and awards XP', async () => {
    const res = await http()
      .post(`/api/lessons/cards/${cardId}/submit`)
      .set(asStudent())
      .send({ timeSpentSeconds: 30 })
      .expect(201);
    const result = unwrap<{ xpEarned?: number }>(res);
    expect(result.xpEarned ?? 0).toBeGreaterThan(0);
  });

  it('reflects XP and streak in the gamification profile', async () => {
    const res = await http()
      .get('/api/gamification/me')
      .set(asStudent())
      .expect(200);
    expect(unwrap(res)).toBeTruthy();

    const experience = await ctx.prisma.studentExperience.findFirst({
      where: { studentProfileId },
    });
    expect(experience).toBeTruthy();

    const streak = await ctx.prisma.studentStreak.findFirst({
      where: { studentProfileId },
    });
    expect(streak).toBeTruthy();
  });

  it('denies lesson authoring to the student (403)', async () => {
    await http()
      .post('/api/lessons')
      .set(asStudent())
      .send({ conceptId, title: `E2E Illegal Lesson ${tag}` })
      .expect(403);
  });
});
