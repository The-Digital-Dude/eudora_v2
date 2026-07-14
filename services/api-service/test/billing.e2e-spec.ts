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

/**
 * Billing coverage note: subscription create/change and webhook processing
 * construct `new Stripe(...)` directly in service constructors, so they
 * cannot be exercised without live keys. This suite covers the Stripe-free
 * surface (plans, family invoicing via the parent portal) plus the negative
 * proof that the webhook endpoint rejects unsigned events.
 */
describe('Billing: plans, family invoices, webhook rejection (e2e)', () => {
  let ctx: TestContext;
  let adminToken: string;
  let plainUser: TestUser;
  let guardian: TestUser;
  let guardianProfileId: string;
  let familyId: string;
  let planId: string;
  let invoiceId: string;
  const tag = `BIL${Date.now()}`;

  const http = () => request(ctx.app.getHttpServer());
  const asAdmin = () => ({ Authorization: `Bearer ${adminToken}` });

  beforeAll(async () => {
    ctx = await createTestApp();
    adminToken = await loginAsSuperAdmin(ctx.app);
    plainUser = await registerUser(ctx);

    guardian = await registerUser(ctx, { firstName: 'Bill', lastName: 'Payer' });
    await grantRole(ctx, adminToken, guardian.id, 'GUARDIAN');
    const profileRes = await http()
      .post('/api/guardian-profiles')
      .set(asAdmin())
      .send({ userId: guardian.id, fullName: `E2E Payer ${tag}` })
      .expect(201);
    guardianProfileId = unwrap<{ id: string }>(profileRes).id;

    const familyRes = await http()
      .post('/api/families')
      .set(asAdmin())
      .send({ householdName: `E2E Billing Household ${tag}` })
      .expect(201);
    familyId = unwrap<{ id: string }>(familyRes).id;
    await http()
      .post(`/api/families/${familyId}/members`)
      .set(asAdmin())
      .send({ guardianProfileId })
      .expect(201);

    const invoice = await ctx.prisma.familyInvoice.create({
      data: {
        familyId,
        amount: 250.0,
        description: `E2E Term Fee ${tag}`,
        issueDate: new Date('2026-07-01'),
        dueDate: new Date('2026-08-01'),
      },
    });
    invoiceId = invoice.id;
  });

  afterAll(async () => {
    if (planId) {
      await ctx.prisma.plan
        .deleteMany({ where: { id: planId } })
        .catch(() => undefined);
    }
    if (familyId) {
      await (ctx.prisma.family.deleteMany as any)({
        where: { id: familyId },
        forceDelete: true,
      }).catch(() => undefined);
    }
    await cleanupWorld(ctx, null, [plainUser, guardian]);
    await ctx.app.close();
  });

  it('lets the super admin create a plan', async () => {
    const res = await http()
      .post('/api/billing/plans')
      .set(asAdmin())
      .send({
        name: `E2E Plan ${tag}`,
        description: 'Starter tier',
        priceMonthly: 49,
        priceAnnual: 490,
        maxStudents: 100,
      })
      .expect(201);
    planId = unwrap<{ id: string }>(res).id;
    expect(planId).toBeTruthy();
  });

  it('exposes the plan on the public pricing endpoint without auth', async () => {
    const res = await http().get('/api/billing/plans/public').expect(200);
    const plans = unwrap<Array<{ id: string }>>(res);
    expect(plans.some((p) => p.id === planId)).toBe(true);
  });

  it('lets the super admin update plan pricing', async () => {
    const res = await http()
      .patch(`/api/billing/plans/${planId}`)
      .set(asAdmin())
      .send({ priceMonthly: 59 })
      .expect(200);
    expect(Number(unwrap<{ priceMonthly: string | number }>(res).priceMonthly)).toBe(
      59,
    );
  });

  it('denies plan creation to a plain USER (403)', async () => {
    await http()
      .post('/api/billing/plans')
      .set('Authorization', `Bearer ${plainUser.token}`)
      .send({ name: `E2E Illegal Plan ${tag}`, priceMonthly: 1, priceAnnual: 10 })
      .expect(403);
  });

  it('rejects an unsigned Stripe webhook event', async () => {
    const res = await http()
      .post('/api/billing/webhooks/stripe')
      .set('stripe-signature', 't=1,v1=forged')
      .send({ type: 'invoice.paid', data: {} });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('shows the family invoice in the guardian billing portal', async () => {
    const res = await http()
      .get('/api/parent/billing/invoices')
      .set('Authorization', `Bearer ${guardian.token}`)
      .expect(200);
    const payload = unwrap<any>(res);
    const invoices: Array<{ id: string }> = Array.isArray(payload)
      ? payload
      : payload.data;
    expect(invoices.some((i) => i.id === invoiceId)).toBe(true);
  });

  it('denies the billing portal to a plain USER (403)', async () => {
    await http()
      .get('/api/parent/billing/invoices')
      .set('Authorization', `Bearer ${plainUser.token}`)
      .expect(403);
  });
});
