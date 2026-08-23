import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanupWorld, unwrap, type TestContext, type TestUser } from './helpers/fixtures';

/**
 * `POST /api/auth/token/register` — native signup for bearer-token clients.
 *
 * The cookie route (`/auth/register`) is already exercised indirectly by every
 * spec that calls `registerUser`. What is untested, and what mobile actually
 * depends on, is that the native twin hands back a usable token pair and sets
 * no cookies.
 *
 * Two app instances, deliberately:
 *
 * - `ctx` has ThrottlerGuard overridden. The endpoint allows five signups per
 *   hour per IP, and asserting its behaviour takes more than five requests, so
 *   without this the suite would spend its whole budget proving unrelated
 *   things and then 429 on the assertions that matter. Raising the production
 *   limit to fit the tests would have been the wrong direction entirely.
 * - `throttledCtx` keeps the real guard, and exists solely so the rate limit is
 *   covered rather than merely worked around. Its own app means its own
 *   in-memory throttler storage, so its budget is untouched by the tests above.
 */
describe('Native token auth (e2e)', () => {
  let ctx: TestContext;
  const created: TestUser[] = [];

  const password = 'Password@123';
  const newEmail = () =>
    `e2e-native-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

  /**
   * Swaps the throttler's *storage*, not its guard.
   *
   * `overrideGuard(ThrottlerGuard)` looks like the obvious move and silently
   * does nothing: the guard is registered as `{ provide: APP_GUARD, useClass:
   * ThrottlerGuard }`, so `ThrottlerGuard` is never a provider token to
   * override. Overriding APP_GUARD instead would take JwtAuthGuard and
   * RolesGuard down with it and quietly turn every auth assertion below into a
   * test of nothing. The storage token is the one seam that disables counting
   * without touching what the guards enforce.
   */
  async function buildApp(unthrottled: boolean): Promise<TestContext> {
    const base = Test.createTestingModule({ imports: [AppModule] });
    const builder: TestingModule = await (
      unthrottled
        ? base.overrideProvider(ThrottlerStorage).useValue({
            increment: async () => ({
              totalHits: 1,
              timeToExpire: 60,
              isBlocked: false,
              timeToBlockExpire: 0,
            }),
          })
        : base
    ).compile();

    const app: INestApplication<App> = builder.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    return { app, prisma: app.get(PrismaService) };
  }

  // Not `async`: awaiting here would collapse supertest's chainable Test into a
  // plain Promise, so callers could no longer add `.set(...)` / `.expect(...)`.
  function registerNative(target: TestContext, body: Record<string, unknown>) {
    return request(target.app.getHttpServer())
      .post('/api/auth/token/register')
      .send(body);
  }

  function track(email: string, payload: any) {
    created.push({ id: payload.user.id, email, token: payload.accessToken, csrf: '' });
  }

  /** Registers against the un-throttled app and records the user for teardown. */
  async function registerAndTrack(email: string, extra: Record<string, unknown> = {}) {
    const res = await registerNative(ctx, {
      email,
      password,
      firstName: 'Native',
      lastName: 'Signup',
      ...extra,
    }).expect(201);

    const payload = unwrap<any>(res);
    track(email, payload);
    return { res, payload };
  }

  beforeAll(async () => {
    ctx = await buildApp(true);
  });

  afterAll(async () => {
    await cleanupWorld(ctx, null, created);
    await ctx.app.close();
  });

  it('returns a token pair in the body and sets no cookies', async () => {
    const { res, payload } = await registerAndTrack(newEmail());

    expect(payload.accessToken).toEqual(expect.any(String));
    expect(payload.refreshToken).toEqual(expect.any(String));
    expect(payload.expiresIn).toEqual(expect.any(Number));
    expect(payload.refreshExpiresIn).toEqual(expect.any(Number));

    // The whole reason this endpoint exists. A native client manages no cookie
    // jar, so a Set-Cookie here would be a session it cannot see.
    expect(res.headers['set-cookie']).toBeUndefined();

    // csrfToken defends cookie sessions and is meaningless without one; leaking
    // it here would invite a native client to start sending it.
    expect(payload).not.toHaveProperty('csrfToken');
    expect(payload.user).not.toHaveProperty('csrfToken');
    expect(payload.user).not.toHaveProperty('password');
  });

  it('issues an access token that authenticates as the new user', async () => {
    const email = newEmail();
    const { payload } = await registerAndTrack(email);

    const me = await request(ctx.app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${payload.accessToken}`)
      .expect(200);

    expect(unwrap<any>(me).email).toBe(email);
  });

  it('defaults to GUARDIAN with the profile already created', async () => {
    const { payload } = await registerAndTrack(newEmail());

    // Not incidental: POST /guardian-profiles requires the GUARDIAN role, so a
    // signup landing on USER would 403 on the first step of its own setup.
    const roles = payload.user.roles.map((r: any) => r.role?.name ?? r);
    expect(roles).toContain('GUARDIAN');

    // Registration seeds the profile in the same write. Without it every
    // /parent endpoint 404s — including the "add your first child" form that is
    // supposed to repair the account.
    const profile = await ctx.prisma.guardianProfile.findUnique({
      where: { userId: payload.user.id },
    });
    expect(profile).toBeTruthy();
  });

  it('honours an explicit USER role hint', async () => {
    const { payload } = await registerAndTrack(newEmail(), { role: 'USER' });

    const roles = payload.user.roles.map((r: any) => r.role?.name ?? r);
    expect(roles).toContain('USER');
    expect(roles).not.toContain('GUARDIAN');
  });

  it('ignores a privileged role hint rather than honouring it', async () => {
    const { payload } = await registerAndTrack(newEmail(), { role: 'SUPER_ADMIN' });

    // resolveSelfSignupRole allowlists USER/GUARDIAN and falls back to
    // GUARDIAN, so a body naming a privileged role yields an ordinary account
    // instead of a privilege escalation.
    const roles = payload.user.roles.map((r: any) => r.role?.name ?? r);
    expect(roles).toEqual(['GUARDIAN']);
  });

  it('records the calling device on the session it creates', async () => {
    const email = newEmail();
    const res = await registerNative(ctx, {
      email,
      password,
      firstName: 'Native',
      lastName: 'Signup',
    })
      .set('User-Agent', 'EudoraMobile/1.0 (e2e)')
      .expect(201);

    const payload = unwrap<any>(res);
    track(email, payload);

    // This is the account's first session. Before device info was threaded
    // through register it landed null, so the device a user signed up on was
    // the one session that could never be named.
    const sessions = await ctx.prisma.authSession.findMany({
      where: { userId: payload.user.id },
    });
    expect(sessions).toHaveLength(1);
    expect(sessions[0].userAgent).toBe('EudoraMobile/1.0 (e2e)');
  });

  it('rejects a duplicate email with 409', async () => {
    const email = newEmail();
    await registerAndTrack(email);

    await registerNative(ctx, {
      email,
      password,
      firstName: 'Native',
      lastName: 'Duplicate',
    }).expect(409);
  });

  it('rejects passwords that fail the complexity rules', async () => {
    // Mobile mirrors these client-side so a user gets an actionable message
    // rather than a bare 400. If the server relaxed them, the app would be
    // enforcing a rule the API no longer has.
    await registerNative(ctx, {
      email: newEmail(),
      password: 'alllowercase123',
      firstName: 'Native',
      lastName: 'Weak',
    }).expect(400);

    await registerNative(ctx, {
      email: newEmail(),
      password: 'Short@1',
      firstName: 'Native',
      lastName: 'Short',
    }).expect(400);
  });

  describe('rate limiting', () => {
    let throttledCtx: TestContext;
    const throttleCreated: TestUser[] = [];

    beforeAll(async () => {
      throttledCtx = await buildApp(false);
    });

    afterAll(async () => {
      await cleanupWorld(throttledCtx, null, throttleCreated);
      await throttledCtx.app.close();
    });

    it('caps signups at five per hour', async () => {
      // Five is the same budget the cookie route carries. The native twin must
      // not be the cheaper door: it creates the same rows, so leaving it on the
      // app-wide 120/min default would make the tighter limit next door
      // pointless.
      for (let i = 0; i < 5; i++) {
        const email = newEmail();
        const res = await registerNative(throttledCtx, {
          email,
          password,
          firstName: 'Native',
          lastName: `Burst${i}`,
        }).expect(201);
        throttleCreated.push({
          id: unwrap<any>(res).user.id,
          email,
          token: '',
          csrf: '',
        });
      }

      await registerNative(throttledCtx, {
        email: newEmail(),
        password,
        firstName: 'Native',
        lastName: 'Blocked',
      }).expect(429);
    });
  });
});
