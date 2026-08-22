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

/**
 * The differentiator chain: concept -> competency -> rubric -> evidence ->
 * rubric assessment -> mastery recalculation.
 */
describe('Evaluation chain: evidence -> mastery (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let studentUser: TestUser;
  let studentProfileId: string;
  let conceptId: string;
  let competencyId: string;
  let rubricId: string;
  let criterionIds: string[] = [];
  let firstMasteryScore: number;
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
    const rows =
      unwrap<
        Array<{ competencyId: string; masteryScore: number; status: string }>
      >(res);
    const row = rows.find((r) => r.competencyId === competencyId);
    expect(row).toBeDefined();
    return row!;
  }

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);

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

  it('denies curriculum authoring to a student (403)', async () => {
    await http()
      .post('/api/evaluation/concepts')
      .set('Authorization', `Bearer ${studentUser.token}`)
      .send({ name: `E2E Illegal Concept ${tag}` })
      .expect(403);
  });
});
