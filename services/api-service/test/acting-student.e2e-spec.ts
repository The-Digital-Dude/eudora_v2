import request from 'supertest';

import {
  TestContext,
  TestUser,
  cleanupWorld,
  createStudent,
  createTestApp,
  grantRole,
  loginAsSuperAdmin,
  registerUser,
  unwrap,
} from './helpers/fixtures';

const ACTING_HEADER = 'x-acting-student-id';

/**
 * Covers `x-acting-student-id` on the surfaces that resolve a learner:
 * gamification and the course list.
 *
 * These two used to read the caller's own student profile and stop there,
 * which made them unreachable for the audience the product is now built
 * around — a guardian owns no student profile, and a child created through the
 * family portal has no password to sign in with. The interesting cases are not
 * the happy path but the two ways this can go wrong: a guardian reading a child
 * they are not linked to, and a *student* trying to use the header to read a
 * sibling.
 */
describe('Acting-student resolution (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;

  let guardian: TestUser;
  let guardianProfileId: string;
  let otherGuardian: TestUser;

  let childUser: TestUser;
  let childProfileId: string;
  let siblingUser: TestUser;
  let siblingProfileId: string;

  const tag = `AS${Date.now()}`;
  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  /** Guardian credentials plus the acting header, the way mobile sends them. */
  const actingAs = (user: TestUser, studentProfileId: string) => ({
    Authorization: `Bearer ${user.token}`,
    [ACTING_HEADER]: studentProfileId,
  });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);

    const child = await createStudent(ctx, adminToken, `Acting Child ${tag}`);
    childUser = child.user;
    childProfileId = child.studentProfileId;

    const sibling = await createStudent(ctx, adminToken, `Acting Sibling ${tag}`);
    siblingUser = sibling.user;
    siblingProfileId = sibling.studentProfileId;

    guardian = await registerUser(ctx, { firstName: 'Acting' });
    await grantRole(ctx, adminToken, guardian.id, 'GUARDIAN');
    otherGuardian = await registerUser(ctx, { firstName: 'Stranger' });
    await grantRole(ctx, adminToken, otherGuardian.id, 'GUARDIAN');

    // Registration seeds the profile alongside the role, so this is a read.
    const profile = await ctx.prisma.guardianProfile.findUnique({
      where: { userId: guardian.id },
    });
    guardianProfileId = profile!.id;

    await http()
      .post('/api/guardian-relationships')
      .set(asAdmin())
      .send({
        guardianProfileId,
        studentProfileId: childProfileId,
        relationshipType: 'MOTHER',
        hasAcademicAccess: true,
      })
      .expect(201);
  });

  afterAll(async () => {
    await cleanupWorld(ctx, null, [
      guardian,
      otherGuardian,
      childUser,
      siblingUser,
    ]);
    await ctx.app.close();
  });

  describe('gamification', () => {
    it('serves the linked child’s profile to their guardian', async () => {
      const res = await http()
        .get('/api/gamification/me')
        .set(actingAs(guardian, childProfileId))
        .expect(200);

      // Before these routes were acting-aware this was a 404 for every
      // guardian, so XP, streaks and goals had no reader at all.
      expect(unwrap<any>(res).experience).toBeDefined();
    });

    it('denies a guardian acting for a child they are not linked to', async () => {
      await http()
        .get('/api/gamification/me')
        .set(actingAs(otherGuardian, childProfileId))
        .expect(403);
    });

    it('tells a guardian who sent no header to pick a child, rather than 404ing', async () => {
      // A guardian has no student profile of their own. "Select a child" is a
      // different situation from "this learner does not exist", and only the
      // former tells the client what to do about it.
      await http()
        .get('/api/gamification/me')
        .set({ Authorization: `Bearer ${guardian.token}` })
        .expect(403);
    });

    it('ignores the header for a student, who always resolves to themselves', async () => {
      // The sibling-read case. Order matters inside ActingStudentService: a
      // caller who *is* a student resolves to their own profile before the
      // header is even looked at, so this must return the caller's own data
      // rather than the sibling's.
      const own = await http()
        .get('/api/gamification/me')
        .set({ Authorization: `Bearer ${childUser.token}` })
        .expect(200);

      const withHeader = await http()
        .get('/api/gamification/me')
        .set({
          Authorization: `Bearer ${childUser.token}`,
          [ACTING_HEADER]: siblingProfileId,
        })
        .expect(200);

      expect(unwrap<any>(withHeader)).toEqual(unwrap<any>(own));
    });

    it('applies the same resolution to goals and badges', async () => {
      await http()
        .get('/api/gamification/today')
        .set(actingAs(guardian, childProfileId))
        .expect(200);

      await http()
        .get('/api/gamification/me/badges')
        .set(actingAs(guardian, childProfileId))
        .expect(200);

      await http()
        .get('/api/gamification/today')
        .set(actingAs(otherGuardian, childProfileId))
        .expect(403);
    });
  });

  describe('course list', () => {
    it('serves a guardian the list scoped to the child they are acting for', async () => {
      // The per-learner fields here used to come from the caller's own student
      // profile — null for a guardian — so the audience that actually chooses
      // courses saw every personalised field blank while the course *detail*
      // endpoint next door answered for the child correctly.
      const res = await http()
        .get('/api/catalog/courses')
        .set(actingAs(guardian, childProfileId))
        .expect(200);

      expect(Array.isArray(unwrap<any>(res))).toBe(true);
    });

    it('denies a guardian acting for an unlinked child', async () => {
      await http()
        .get('/api/catalog/courses')
        .set(actingAs(otherGuardian, childProfileId))
        .expect(403);
    });

    it('still serves a guardian who has not picked a child', async () => {
      // Unlike gamification this one degrades rather than refuses: browsing the
      // catalogue without a child selected is a legitimate thing to do, it just
      // cannot personalise. Resolution returns null and the list comes back
      // unscoped.
      await http()
        .get('/api/catalog/courses')
        .set({ Authorization: `Bearer ${guardian.token}` })
        .expect(200);
    });
  });
});
