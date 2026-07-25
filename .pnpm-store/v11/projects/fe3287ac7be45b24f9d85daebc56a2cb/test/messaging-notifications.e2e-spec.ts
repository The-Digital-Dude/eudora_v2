import request from 'supertest';
import {
  TestContext,
  TestUser,
  createTestApp,
  loginAsSuperAdmin,
  registerUser,
  grantRole,
  cleanupWorld,
  unwrap,
} from './helpers/fixtures';

describe('Messaging: thread -> reply -> unread -> read (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let guardian: TestUser;
  let teacher: TestUser;
  let plainUser: TestUser;
  let threadId: string;
  const tag = `MSG${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asGuardian = () => ({ Authorization: `Bearer ${guardian.token}` });
  const asTeacher = () => ({ Authorization: `Bearer ${teacher.token}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    plainUser = await registerUser(ctx);
    guardian = await registerUser(ctx, { firstName: 'Msg', lastName: 'Guardian' });
    await grantRole(ctx, adminToken, guardian.id, 'GUARDIAN');
    teacher = await registerUser(ctx, { firstName: 'Msg', lastName: 'Teacher' });
    await grantRole(ctx, adminToken, teacher.id, 'TEACHER');

    // createThread requires actual profiles, not just roles.
    await http()
      .post('/api/guardian-profiles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: guardian.id, fullName: `E2E Msg Guardian ${tag}` })
      .expect(201);
    await ctx.prisma.teacherProfile.create({
      data: { userId: teacher.id, fullName: `E2E Msg Teacher ${tag}` },
    });
  });

  afterAll(async () => {
    if (threadId) {
      await ctx.prisma.messageThread
        .deleteMany({ where: { id: threadId } })
        .catch(() => undefined);
    }
    await cleanupWorld(ctx, null, [plainUser, guardian, teacher]);
    await ctx.app.close();
  });

  it('lets a guardian open a thread with a teacher', async () => {
    const res = await http()
      .post('/api/messages/threads')
      .set(asGuardian())
      .send({
        subject: `E2E Thread ${tag}`,
        teacherUserId: teacher.id,
        firstMessageBody: 'How is my child doing in class?',
      })
      .expect(201);
    threadId = unwrap<{ id: string }>(res).id;
    expect(threadId).toBeTruthy();
  });

  it('shows the thread in the teacher inbox with an unread count', async () => {
    const listRes = await http()
      .get('/api/messages/threads')
      .set(asTeacher())
      .expect(200);
    const payload = unwrap<any>(listRes);
    const threads: Array<{ id: string }> = Array.isArray(payload)
      ? payload
      : payload.data;
    expect(threads.some((t) => t.id === threadId)).toBe(true);

    const countRes = await http()
      .get('/api/messages/unread-count')
      .set(asTeacher())
      .expect(200);
    const count = unwrap<any>(countRes);
    const unread = typeof count === 'number' ? count : count.count;
    expect(unread).toBeGreaterThanOrEqual(1);
  });

  it('lets the teacher reply on the thread', async () => {
    await http()
      .post(`/api/messages/threads/${threadId}`)
      .set(asTeacher())
      .send({ body: 'She is doing great — big progress on fractions.' })
      .expect(201);

    const res = await http()
      .get(`/api/messages/threads/${threadId}`)
      .set(asGuardian())
      .expect(200);
    const thread = unwrap<{ messages: Array<{ body: string }> }>(res);
    expect(thread.messages.length).toBeGreaterThanOrEqual(2);
  });

  it('clears the guardian unread count after marking read', async () => {
    await http()
      .post(`/api/messages/threads/${threadId}/read`)
      .set(asGuardian())
      .expect(200);

    const countRes = await http()
      .get('/api/messages/unread-count')
      .set(asGuardian())
      .expect(200);
    const count = unwrap<any>(countRes);
    const unread = typeof count === 'number' ? count : count.count;
    expect(unread).toBe(0);
  });

  it('emits a notification to the teacher for the new thread', async () => {
    const notifications = await ctx.prisma.notification.count({
      where: { userId: teacher.id },
    });
    expect(notifications).toBeGreaterThanOrEqual(1);
  });

  it('denies the messaging inbox to a plain USER role (403)', async () => {
    await http()
      .get('/api/messages/threads')
      .set('Authorization', `Bearer ${plainUser.token}`)
      .expect(403);
  });

  it('prevents an outsider reading a thread they are not part of', async () => {
    const outsiderGuardian = await registerUser(ctx, { firstName: 'Outsider' });
    await grantRole(ctx, adminToken, outsiderGuardian.id, 'GUARDIAN');
    const res = await http()
      .get(`/api/messages/threads/${threadId}`)
      .set('Authorization', `Bearer ${outsiderGuardian.token}`);
    expect([403, 404]).toContain(res.status);
    await cleanupWorld(ctx, null, [outsiderGuardian]);
  });
});
