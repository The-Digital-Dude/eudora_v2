import request from 'supertest';
import {
  TestContext,
  TestUser,
  createTestApp,
  loginAsSuperAdmin,
  createStudent,
  cleanupWorld,
  unwrap,
  SUPER_ADMIN_CREDENTIALS,
} from './helpers/fixtures';

/**
 * The differentiator chain: concept -> competency -> rubric -> evidence ->
 * rubric assessment -> mastery recalculation -> gap -> next action.
 * Gap CREATION is seeded via Prisma because the detection rule engine is
 * intentionally unbuilt (gap.service.detectGaps throws); when it lands, the
 * seeding step here should switch to the detection API.
 */
describe('Evaluation chain: evidence -> mastery -> gap -> next action (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let adminUserId: string;
  let studentUser: TestUser;
  let studentProfileId: string;
  let conceptId: string;
  let competencyId: string;
  let rubricId: string;
  let criterionIds: string[] = [];
  let firstMasteryScore: number;
  let gapId: string;
  let nextActionId: string;
  const tag = `EV${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  async function recordEvidenceAndAssess(selectedLevel: number) {
    const evidenceRes = await http()
      .post('/api/evaluation/evidence')
      .set(asAdmin())
      .send({
        studentProfileId,
        competencyId,
        sourceType: 'OBSERVATION',
      })
      .expect(201);
    const evidenceId = unwrap<{ id: string }>(evidenceRes).id;

    await http()
      .post('/api/evaluation/assessments')
      .set(asAdmin())
      .send({
        rubricId,
        evidenceId,
        ratings: criterionIds.map((criterionId) => ({
          criterionId,
          selectedLevel,
        })),
      })
      .expect(201);
  }

  async function getMastery(): Promise<{
    masteryScore: number;
    status: string;
  }> {
    const res = await http()
      .get(`/api/evaluation/mastery/student/${studentProfileId}`)
      .set(asAdmin())
      .expect(200);
    const rows = unwrap<
      Array<{ competencyId: string; masteryScore: number; status: string }>
    >(res);
    const row = rows.find((r) => r.competencyId === competencyId);
    expect(row).toBeDefined();
    return row!;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    const admin = await ctx.prisma.user.findUnique({
      where: { email: SUPER_ADMIN_CREDENTIALS.email },
    });
    adminUserId = admin!.id;

    const student = await createStudent(ctx, adminToken, `E2E Eval ${tag}`);
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

  it('creates the curriculum spine: concept -> competency -> rubric', async () => {
    const conceptRes = await http()
      .post('/api/evaluation/concepts')
      .set(asAdmin())
      .send({ name: `E2E Concept ${tag}` })
      .expect(201);
    conceptId = unwrap<{ id: string }>(conceptRes).id;

    const compRes = await http()
      .post('/api/evaluation/competencies')
      .set(asAdmin())
      .send({ conceptId, name: `E2E Competency ${tag}` })
      .expect(201);
    competencyId = unwrap<{ id: string }>(compRes).id;

    await http()
      .post('/api/evaluation/rubrics')
      .set(asAdmin())
      .send({
        competencyId,
        name: `E2E Rubric ${tag}`,
        criteria: [
          {
            title: 'Accuracy',
            levels: [1, 2, 3, 4].map((level) => ({
              level,
              title: `Level ${level}`,
              description: `Performance level ${level}`,
              score: level * 25,
            })),
          },
        ],
      })
      .expect(201);

    const rubricRes = await http()
      .get(`/api/evaluation/rubrics/competency/${competencyId}`)
      .set(asAdmin())
      .expect(200);
    const rubric = unwrap<{ id: string; criteria: Array<{ id: string }> }>(
      rubricRes,
    );
    rubricId = rubric.id;
    criterionIds = rubric.criteria.map((c) => c.id);
    expect(criterionIds.length).toBe(1);
  });

  it('records evidence + rubric assessment and computes initial mastery', async () => {
    await recordEvidenceAndAssess(2);
    const mastery = await getMastery();
    expect(mastery.masteryScore).toBeGreaterThan(0);
    firstMasteryScore = mastery.masteryScore;
  });

  it('recalculates mastery on a second, stronger assessment', async () => {
    await recordEvidenceAndAssess(4);
    const mastery = await getMastery();
    // Decaying weighted average: a max-level rating must raise the score.
    expect(mastery.masteryScore).toBeGreaterThan(firstMasteryScore);
  });

  it('exposes a learning gap through the gaps API', async () => {
    // Seeded directly until the detection engine exists (see suite docblock).
    const gap = await ctx.prisma.learningGap.create({
      data: {
        studentProfileId,
        competencyId,
        severity: 'HIGH',
        rootCause: 'Struggles to apply the concept under time pressure',
        detectedFrom: 'RUBRIC',
      },
    });
    gapId = gap.id;

    const res = await http()
      .get(`/api/gaps?studentProfileId=${studentProfileId}`)
      .set(asAdmin())
      .expect(200);
    const gaps = unwrap<Array<{ id: string; status: string }>>(res);
    const found = gaps.find((g) => g.id === gapId);
    expect(found).toBeDefined();
    expect(found!.status).toBe('OPEN');
  });

  it('moves the gap to ADDRESSING', async () => {
    const res = await http()
      .patch(`/api/gaps/${gapId}`)
      .set(asAdmin())
      .send({ status: 'ADDRESSING' })
      .expect(200);
    expect(unwrap<{ status: string }>(res).status).toBe('ADDRESSING');
  });

  it('creates a next action linked to the gap', async () => {
    const res = await http()
      .post('/api/next-actions')
      .set(asAdmin())
      .send({
        gapId,
        studentProfileId,
        competencyId,
        actionType: 'REVIEW',
        reason: 'Review the concept with worked examples',
        ownerUserId: adminUserId,
        dueDate: '2026-08-01T00:00:00.000Z',
      })
      .expect(201);
    nextActionId = unwrap<{ id: string; status: string }>(res).id;
    expect(nextActionId).toBeTruthy();
  });

  it('completes the next action', async () => {
    const res = await http()
      .patch(`/api/next-actions/${nextActionId}`)
      .set(asAdmin())
      .send({ status: 'DONE' })
      .expect(200);
    expect(unwrap<{ status: string }>(res).status).toBe('DONE');
  });

  it('denies curriculum authoring to a student (403)', async () => {
    await http()
      .post('/api/evaluation/concepts')
      .set('Authorization', `Bearer ${studentUser.token}`)
      .send({ name: `E2E Illegal Concept ${tag}` })
      .expect(403);
  });

  it('denies the gaps list to a student (403)', async () => {
    await http()
      .get('/api/gaps')
      .set('Authorization', `Bearer ${studentUser.token}`)
      .expect(403);
  });
});
