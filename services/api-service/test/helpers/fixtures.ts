import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Shared e2e fixtures (Scope A of docs/scoping-smoke-tests-and-soft-delete-2026-07-03.md).
 *
 * All test data is created through the public API (not raw Prisma) so the
 * fixtures themselves exercise the endpoints, and every record is tagged with
 * a unique run id to coexist with seed data. The Q1 tenancy epic extends
 * `buildAcademicWorld` with an organization parameter to spin up two tenants
 * for isolation tests.
 */

export const SUPER_ADMIN_CREDENTIALS = {
  email: 'admin@eudora.app',
  password: 'Admin@123',
};

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
}

export interface TestUser {
  id: string;
  email: string;
  token: string;
  csrf: string;
}

export interface AuthCreds {
  token: string;
  csrf: string;
}

/**
 * Headers for endpoints behind CsrfGuard (assessments module): the guard
 * demands cookie + header on every unsafe method, even with Bearer auth.
 */
export function csrfHeaders(creds: AuthCreds): Record<string, string> {
  return {
    Authorization: `Bearer ${creds.token}`,
    Cookie: `csrf_token=${creds.csrf}`,
    'x-csrf-token': creds.csrf,
  };
}

export interface AcademicWorld {
  tag: string;
  programId: string;
  academicYearId: string;
  classSectionId: string;
  termId: string;
  batchId: string;
}

/** Boots the full AppModule the same way main.ts does. */
export async function createTestApp(): Promise<TestContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication<App> = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

/** Every response goes through the API envelope interceptor; payload lives under `data`. */
export function unwrap<T = any>(res: request.Response): T {
  return (res.body as { data: T }).data;
}

function cookieValue(res: request.Response, name: string): string {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const cookie = cookies.find((c: string) => c.startsWith(`${name}=`));
  return cookie ? cookie.split(';')[0].split('=')[1] : '';
}

function tokenFromCookies(res: request.Response): string {
  return cookieValue(res, 'access_token');
}

export async function loginFull(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<AuthCreds> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  const token = tokenFromCookies(res);
  expect(token).toBeTruthy();
  return { token, csrf: cookieValue(res, 'csrf_token') };
}

export async function loginAs(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string> {
  return (await loginFull(app, email, password)).token;
}

export async function loginAsSuperAdmin(
  app: INestApplication<App>,
): Promise<string> {
  return loginAs(
    app,
    SUPER_ADMIN_CREDENTIALS.email,
    SUPER_ADMIN_CREDENTIALS.password,
  );
}

export async function loginAsSuperAdminFull(
  app: INestApplication<App>,
): Promise<AuthCreds> {
  return loginFull(
    app,
    SUPER_ADMIN_CREDENTIALS.email,
    SUPER_ADMIN_CREDENTIALS.password,
  );
}

/** Registers a fresh user (default USER role) and returns id + bearer token. */
export async function registerUser(
  ctx: TestContext,
  overrides: { firstName?: string; lastName?: string } = {},
): Promise<TestUser> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const res = await request(ctx.app.getHttpServer())
    .post('/api/auth/register')
    .send({
      email,
      password: 'Password@123',
      firstName: overrides.firstName ?? 'E2E',
      lastName: overrides.lastName ?? 'User',
    })
    .expect(201);

  const token = tokenFromCookies(res);
  expect(token).toBeTruthy();

  const dbUser = await ctx.prisma.user.findUnique({ where: { email } });
  expect(dbUser).toBeTruthy();
  return { id: dbUser!.id, email, token, csrf: cookieValue(res, 'csrf_token') };
}

/** Grants a seeded role (e.g. GUARDIAN, TEACHER) to a user via the users API. */
export async function grantRole(
  ctx: TestContext,
  adminToken: string,
  userId: string,
  roleName: string,
): Promise<void> {
  const role = await ctx.prisma.role.findUnique({ where: { name: roleName } });
  expect(role).toBeTruthy();
  await request(ctx.app.getHttpServer())
    .post(`/api/users/${userId}/roles`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ roleId: role!.id })
    .expect(201);
}

/**
 * Builds the canonical academic chain through the API:
 * program -> academic year -> class section -> term -> course class.
 * `tag` keeps unique-constrained fields (names/codes) collision-free.
 */
export async function buildAcademicWorld(
  ctx: TestContext,
  adminToken: string,
  tag: string = `${Date.now()}`,
): Promise<AcademicWorld> {
  const http = () => request(ctx.app.getHttpServer());
  const auth = { Authorization: `Bearer ${adminToken}` };

  const programRes = await http()
    .post('/api/programs')
    .set(auth)
    .send({ name: `E2E Program ${tag}`, code: `E2E-PRG-${tag}` })
    .expect(201);
  const programId = unwrap<{ id: string }>(programRes).id;

  const yearRes = await http()
    .post('/api/academic-years')
    .set(auth)
    .send({
      name: `E2E Year ${tag}`,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    })
    .expect(201);
  const academicYearId = unwrap<{ id: string }>(yearRes).id;

  const sectionRes = await http()
    .post('/api/class-sections')
    .set(auth)
    .send({
      programId,
      academicYearId,
      name: `E2E Section ${tag}`,
      code: `E2E-SEC-${tag}`,
    })
    .expect(201);
  const classSectionId = unwrap<{ id: string }>(sectionRes).id;

  const termRes = await http()
    .post('/api/terms')
    .set(auth)
    .send({
      academicYearId,
      name: `E2E Term ${tag}`,
      startDate: '2026-01-01',
      endDate: '2026-06-30',
    })
    .expect(201);
  const termId = unwrap<{ id: string }>(termRes).id;

  const courseRes = await http()
    .post('/api/course-classes')
    .set(auth)
    .send({ termId, name: `E2E Course ${tag}`, code: `E2E-CRS-${tag}` })
    .expect(201);
  const batchId = unwrap<{ id: string }>(courseRes).id;

  return {
    tag,
    programId,
    academicYearId,
    classSectionId,
    termId,
    batchId,
  };
}

/** Registers a user and creates a student profile for them via the API. */
export async function createStudent(
  ctx: TestContext,
  adminToken: string,
  fullName: string,
): Promise<{ user: TestUser; studentProfileId: string }> {
  const user = await registerUser(ctx, {
    firstName: fullName.split(' ')[0],
    lastName: fullName.split(' ').slice(1).join(' ') || 'Student',
  });

  const res = await request(ctx.app.getHttpServer())
    .post('/api/student-profiles')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      userId: user.id,
      fullName,
      birthDate: '2015-05-01',
      gender: 'FEMALE',
    })
    .expect(201);

  return { user, studentProfileId: unwrap<{ id: string }>(res).id };
}

/**
 * Removes everything a suite created — HARD deletes via the scoping
 * extension's `forceDelete` escape hatch (plain deletes on Tier-1 models are
 * rewritten to archives). Student-history rows (attendance, gradebook,
 * mastery, attempts) have Restrict FKs to StudentProfile, so they are purged
 * first or the profile/user deletes would be rejected.
 */
export async function cleanupWorld(
  ctx: TestContext,
  world: AcademicWorld | null,
  users: Array<TestUser | undefined> = [],
): Promise<void> {
  const { prisma } = ctx;
  const realUsers = users.filter((u): u is TestUser => Boolean(u));
  const userIds = realUsers.map((u) => u.id);

  if (userIds.length) {
    const profiles: Array<{ id: string }> = await (
      prisma.studentProfile.findMany as any
    )({
      where: { userId: { in: userIds } },
      select: { id: true },
      includeArchived: true,
    });
    const profileIds = profiles.map((p) => p.id);
    if (profileIds.length) {
      const byProfile = { studentProfileId: { in: profileIds } };
      await prisma.assessmentAttempt
        .deleteMany({ where: byProfile })
        .catch(() => undefined);
      await (prisma.gradeBookEntry.deleteMany as any)({
        where: byProfile,
        forceDelete: true,
      }).catch(() => undefined);
      await prisma.dailyAttendance
        .deleteMany({ where: byProfile })
        .catch(() => undefined);
      await prisma.batchAttendance
        .deleteMany({ where: byProfile })
        .catch(() => undefined);
      await prisma.competencyMastery
        .deleteMany({ where: byProfile })
        .catch(() => undefined);
      await (prisma.studentProfile.deleteMany as any)({
        where: { id: { in: profileIds } },
        forceDelete: true,
      }).catch(() => undefined);
    }
  }

  if (world) {
    await (prisma.academicYear.deleteMany as any)({
      where: { id: world.academicYearId },
      forceDelete: true,
    }).catch(() => undefined);
  }
  for (const user of realUsers) {
    await prisma.userRole
      .deleteMany({ where: { userId: user.id } })
      .catch(() => undefined);
    await (prisma.user.deleteMany as any)({
      where: { id: user.id },
      forceDelete: true,
    }).catch(() => undefined);
  }
}
