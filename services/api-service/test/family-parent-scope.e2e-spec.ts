import request from 'supertest';
import {
  TestContext,
  TestUser,
  createTestApp,
  loginAsSuperAdmin,
  registerUser,
  grantRole,
  createStudent,
  cleanupWorld,
  unwrap,
} from './helpers/fixtures';

/**
 * Covers the household model and the guardian-scope guard: a guardian may
 * only read the children they are linked to — the denial case is the point.
 */
describe('Family & parent portal scoping (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let plainUser: TestUser;
  let studentUser: TestUser;
  let studentProfileId: string;
  let linkedGuardian: TestUser;
  let linkedGuardianProfileId: string;
  let unlinkedGuardian: TestUser;
  let unlinkedGuardianProfileId: string;
  let familyId: string;
  const tag = `FP${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    plainUser = await registerUser(ctx);

    const student = await createStudent(ctx, adminToken, `E2E Child ${tag}`);
    studentUser = student.user;
    studentProfileId = student.studentProfileId;

    linkedGuardian = await registerUser(ctx, { firstName: 'Linked' });
    await grantRole(ctx, adminToken, linkedGuardian.id, 'GUARDIAN');
    unlinkedGuardian = await registerUser(ctx, { firstName: 'Unlinked' });
    await grantRole(ctx, adminToken, unlinkedGuardian.id, 'GUARDIAN');
  });

  afterAll(async () => {
    if (familyId) {
      await (ctx.prisma.family.deleteMany as any)({
        where: { id: familyId },
        forceDelete: true,
      }).catch(() => undefined);
    }
    await cleanupWorld(ctx, null, [
      plainUser,
      studentUser,
      linkedGuardian,
      unlinkedGuardian,
    ]);
    await ctx.app.close();
  });

  it('creates guardian profiles for both guardian users', async () => {
    const linkedRes = await http()
      .post('/api/guardian-profiles')
      .set(asAdmin())
      .send({ userId: linkedGuardian.id, fullName: `E2E Guardian A ${tag}` })
      .expect(201);
    linkedGuardianProfileId = unwrap<{ id: string }>(linkedRes).id;

    const unlinkedRes = await http()
      .post('/api/guardian-profiles')
      .set(asAdmin())
      .send({ userId: unlinkedGuardian.id, fullName: `E2E Guardian B ${tag}` })
      .expect(201);
    unlinkedGuardianProfileId = unwrap<{ id: string }>(unlinkedRes).id;
  });

  it('links guardian A to the student with a relationship', async () => {
    await http()
      .post('/api/guardian-relationships')
      .set(asAdmin())
      .send({
        guardianProfileId: linkedGuardianProfileId,
        studentProfileId,
        relationshipType: 'MOTHER',
        hasAcademicAccess: true,
      })
      .expect(201);

    const res = await http()
      .get(
        `/api/guardian-relationships/${linkedGuardianProfileId}/${studentProfileId}`,
      )
      .set(asAdmin())
      .expect(200);
    expect(unwrap<{ relationshipType: string }>(res).relationshipType).toBe(
      'MOTHER',
    );
  });

  it('builds the household: family with student and guardian members', async () => {
    const familyRes = await http()
      .post('/api/families')
      .set(asAdmin())
      .send({ householdName: `E2E Household ${tag}` })
      .expect(201);
    familyId = unwrap<{ id: string }>(familyRes).id;

    await http()
      .post(`/api/families/${familyId}/members`)
      .set(asAdmin())
      .send({ studentProfileId })
      .expect(201);
    await http()
      .post(`/api/families/${familyId}/members`)
      .set(asAdmin())
      .send({ guardianProfileId: linkedGuardianProfileId })
      .expect(201);

    const res = await http()
      .get(`/api/families/${familyId}`)
      .set(asAdmin())
      .expect(200);
    const family = unwrap<{
      students: unknown[];
      guardians: unknown[];
      householdName: string;
    }>(res);
    expect(family.householdName).toBe(`E2E Household ${tag}`);
    expect(family.students.length + family.guardians.length).toBeGreaterThanOrEqual(2);
  });

  it('shows the linked child in guardian A\'s parent portal', async () => {
    const res = await http()
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${linkedGuardian.token}`)
      .expect(200);
    const children = unwrap<Array<{ studentProfileId: string }>>(res);
    expect(
      children.some((c) => c.studentProfileId === studentProfileId),
    ).toBe(true);
  });

  it('lets guardian A read the linked child\'s homework and attendance', async () => {
    await http()
      .get(`/api/parent/children/${studentProfileId}/homework`)
      .set('Authorization', `Bearer ${linkedGuardian.token}`)
      .expect(200);
    await http()
      .get(`/api/parent/children/${studentProfileId}/attendance`)
      .set('Authorization', `Bearer ${linkedGuardian.token}`)
      .expect(200);
  });

  it('DENIES guardian B access to a child they are not linked to (guardian-scope guard)', async () => {
    await http()
      .get(`/api/parent/children/${studentProfileId}/homework`)
      .set('Authorization', `Bearer ${unlinkedGuardian.token}`)
      .expect(403);
    await http()
      .get(`/api/parent/children/${studentProfileId}/grades`)
      .set('Authorization', `Bearer ${unlinkedGuardian.token}`)
      .expect(403);
  });

  it('denies the parent portal to a plain USER role (403)', async () => {
    await http()
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${plainUser.token}`)
      .expect(403);
  });

  it('denies family creation to a guardian (admin-only)', async () => {
    await http()
      .post('/api/families')
      .set('Authorization', `Bearer ${linkedGuardian.token}`)
      .send({ householdName: `E2E Forbidden Household ${tag}` })
      .expect(403);
  });
});
