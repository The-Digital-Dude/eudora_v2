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
 * Covers guardian-student linking and the guardian-scope guard: a guardian
 * may only read the children they are linked to — the denial case is the
 * point.
 */
describe('Guardian & parent portal scoping (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let plainUser: TestUser;
  let studentUser: TestUser;
  let studentProfileId: string;
  let linkedGuardian: TestUser;
  let linkedGuardianProfileId: string;
  let unlinkedGuardian: TestUser;
  const tag = `FP${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    // Explicitly USER: signup defaults to GUARDIAN, so registering without
    // a role would hand this test a guardian and invert its 403 assertion.
    plainUser = await registerUser(ctx, { role: 'USER' });

    const student = await createStudent(ctx, adminToken, `E2E Child ${tag}`);
    studentUser = student.user;
    studentProfileId = student.studentProfileId;

    linkedGuardian = await registerUser(ctx, { firstName: 'Linked' });
    await grantRole(ctx, adminToken, linkedGuardian.id, 'GUARDIAN');
    unlinkedGuardian = await registerUser(ctx, { firstName: 'Unlinked' });
    await grantRole(ctx, adminToken, unlinkedGuardian.id, 'GUARDIAN');
  });

  afterAll(async () => {
    await cleanupWorld(ctx, null, [
      plainUser,
      studentUser,
      linkedGuardian,
      unlinkedGuardian,
    ]);
    await ctx.app.close();
  });

  it('gets a guardian profile from registration, without a second create', async () => {
    // Registration writes the GuardianProfile alongside the GUARDIAN role, so
    // POST /guardian-profiles would 409 here. That endpoint keeps its conflict
    // deliberately — an admin making a second profile for someone is a mistake.
    const linked = await ctx.prisma.guardianProfile.findUnique({
      where: { userId: linkedGuardian.id },
    });
    expect(linked).toBeTruthy();
    linkedGuardianProfileId = linked!.id;

    const unlinked = await ctx.prisma.guardianProfile.findUnique({
      where: { userId: unlinkedGuardian.id },
    });
    expect(unlinked).toBeTruthy();
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

  it("shows the linked child in guardian A's parent portal", async () => {
    const res = await http()
      .get('/api/parent/children')
      .set('Authorization', `Bearer ${linkedGuardian.token}`)
      .expect(200);
    const children = unwrap<Array<{ studentProfileId: string }>>(res);
    expect(children.some((c) => c.studentProfileId === studentProfileId)).toBe(
      true,
    );
  });

  it("lets guardian A read the linked child's homework and attendance", async () => {
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
});
