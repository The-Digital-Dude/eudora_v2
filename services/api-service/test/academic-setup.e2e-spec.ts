import request from 'supertest';
import {
  TestContext,
  TestUser,
  AcademicWorld,
  createTestApp,
  loginAsSuperAdmin,
  registerUser,
  buildAcademicWorld,
  cleanupWorld,
  unwrap,
} from './helpers/fixtures';

describe('Academic setup chain (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let plainUser: TestUser;
  let world: AcademicWorld;
  const tag = `AS${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    plainUser = await registerUser(ctx);
  });

  afterAll(async () => {
    await cleanupWorld(ctx, world ?? null, [plainUser]);
    await ctx.app.close();
  });

  it('builds the full program -> year -> section -> term -> course chain', async () => {
    world = await buildAcademicWorld(ctx, adminToken, tag);

    expect(world.programId).toBeTruthy();
    expect(world.courseClassId).toBeTruthy();

    const courseRes = await http()
      .get(`/api/course-classes/${world.courseClassId}`)
      .set(asAdmin())
      .expect(200);
    const course = unwrap<{ id: string; code: string; termId: string }>(
      courseRes,
    );
    expect(course.code).toBe(`E2E-CRS-${tag}`);
    expect(course.termId).toBe(world.termId);
  });

  it('lists the created class section for the admin', async () => {
    const res = await http()
      .get('/api/class-sections')
      .set(asAdmin())
      .expect(200);
    const payload = unwrap<any>(res);
    const sections: Array<{ id: string }> = Array.isArray(payload)
      ? payload
      : payload.data;
    expect(sections.some((s) => s.id === world.classSectionId)).toBe(true);
  });

  it('rejects creating a course class under a nonexistent term', async () => {
    await http()
      .post('/api/course-classes')
      .set(asAdmin())
      .send({
        termId: '00000000-0000-0000-0000-000000000000',
        name: `E2E Ghost ${tag}`,
        code: `E2E-GHOST-${tag}`,
      })
      .expect(404);
  });

  it('denies unauthenticated campus creation (401)', async () => {
    await http()
      .post('/api/campuses')
      .send({ name: `E2E NoAuth ${tag}` })
      .expect(401);
  });

  it('denies campus creation to a plain USER role (403)', async () => {
    await http()
      .post('/api/campuses')
      .set('Authorization', `Bearer ${plainUser.token}`)
      .send({ name: `E2E Forbidden ${tag}` })
      .expect(403);
  });

  it('denies the class-section roster to a plain USER role (403)', async () => {
    await http()
      .get(`/api/class-sections/${world.classSectionId}/roster`)
      .set('Authorization', `Bearer ${plainUser.token}`)
      .expect(403);
  });

  it('deletes an empty course class cleanly', async () => {
    const createRes = await http()
      .post('/api/course-classes')
      .set(asAdmin())
      .send({
        termId: world.termId,
        name: `E2E Disposable ${tag}`,
        code: `E2E-DISP-${tag}`,
      })
      .expect(201);
    const disposableId = unwrap<{ id: string }>(createRes).id;

    await http()
      .delete(`/api/course-classes/${disposableId}`)
      .set(asAdmin())
      .expect(200);

    await http()
      .get(`/api/course-classes/${disposableId}`)
      .set(asAdmin())
      .expect(404);
  });

  /**
   * Scope B behavior: deleting an academic year ARCHIVES it and its children
   * (terms, course classes, class sections) — nothing is hard-deleted.
   */
  it('archives an academic year together with its children (soft delete)', async () => {
    const yearRes = await http()
      .post('/api/academic-years')
      .set(asAdmin())
      .send({
        name: `E2E Cascade Year ${tag}`,
        startDate: '2027-01-01',
        endDate: '2027-12-31',
      })
      .expect(201);
    const yearId = unwrap<{ id: string }>(yearRes).id;

    const termRes = await http()
      .post('/api/terms')
      .set(asAdmin())
      .send({
        academicYearId: yearId,
        name: `E2E Cascade Term ${tag}`,
        startDate: '2027-01-01',
        endDate: '2027-06-30',
      })
      .expect(201);
    const termId = unwrap<{ id: string }>(termRes).id;

    await http()
      .delete(`/api/academic-years/${yearId}`)
      .set(asAdmin())
      .expect(200);

    // Both rows survive in the database, stamped as archived.
    const archivedTerm = await (ctx.prisma.term.findUnique as any)({
      where: { id: termId },
      includeArchived: true,
    });
    expect(archivedTerm).not.toBeNull();
    expect(archivedTerm!.deletedAt).not.toBeNull();

    const archivedYear = await (ctx.prisma.academicYear.findUnique as any)({
      where: { id: yearId },
      includeArchived: true,
    });
    expect(archivedYear!.deletedAt).not.toBeNull();

    // Archived records vanish from the API surface.
    await http().get(`/api/terms/${termId}`).set(asAdmin()).expect(404);

    await (ctx.prisma.academicYear.deleteMany as any)({
      where: { id: yearId },
      forceDelete: true,
    });
  });
});
