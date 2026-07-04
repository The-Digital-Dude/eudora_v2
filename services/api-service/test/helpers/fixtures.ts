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
}

export interface AcademicWorld {
  tag: string;
  campusId: string;
  programId: string;
  academicYearId: string;
  classSectionId: string;
  termId: string;
  courseClassId: string;
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

function tokenFromCookies(res: request.Response): string {
  const raw = res.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const accessCookie = cookies.find((c: string) =>
    c.startsWith('access_token='),
  );
  return accessCookie ? accessCookie.split(';')[0].split('=')[1] : '';
}

export async function loginAs(
  app: INestApplication<App>,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  const token = tokenFromCookies(res);
  expect(token).toBeTruthy();
  return token;
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
  return { id: dbUser!.id, email, token };
}

/**
 * Builds the canonical academic chain through the API:
 * campus -> program -> academic year -> class section -> term -> course class.
 * `tag` keeps unique-constrained fields (names/codes) collision-free.
 */
export async function buildAcademicWorld(
  ctx: TestContext,
  adminToken: string,
  tag: string = `${Date.now()}`,
): Promise<AcademicWorld> {
  const http = () => request(ctx.app.getHttpServer());
  const auth = { Authorization: `Bearer ${adminToken}` };

  const campusRes = await http()
    .post('/api/campuses')
    .set(auth)
    .send({ name: `E2E Campus ${tag}` })
    .expect(201);
  const campusId = unwrap<{ id: string }>(campusRes).id;

  const programRes = await http()
    .post('/api/programs')
    .set(auth)
    .send({ campusId, name: `E2E Program ${tag}`, code: `E2E-PRG-${tag}` })
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
  const courseClassId = unwrap<{ id: string }>(courseRes).id;

  return {
    tag,
    campusId,
    programId,
    academicYearId,
    classSectionId,
    termId,
    courseClassId,
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
 * Removes everything a suite created. Deletes roots and lets the schema's
 * cascades clear the children; user cleanup mirrors the rbac suite.
 */
export async function cleanupWorld(
  ctx: TestContext,
  world: AcademicWorld | null,
  users: Array<TestUser | undefined> = [],
): Promise<void> {
  const { prisma } = ctx;
  const realUsers = users.filter((u): u is TestUser => Boolean(u));
  if (world) {
    await prisma.academicYear
      .deleteMany({ where: { id: world.academicYearId } })
      .catch(() => undefined);
    await prisma.campus
      .deleteMany({ where: { id: world.campusId } })
      .catch(() => undefined);
  }
  for (const user of realUsers) {
    await prisma.userRole
      .deleteMany({ where: { userId: user.id } })
      .catch(() => undefined);
    await prisma.user
      .deleteMany({ where: { id: user.id } })
      .catch(() => undefined);
  }
}
