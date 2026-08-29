import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Education OS Administrative Modules (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let superAdminToken: string;

  // Regular User details
  let regularUserToken: string;
  let regularUserId: string;

  // Academic/Institution ID trackers
  let programId: string;
  // Unique per run: these rows carry unique constraints, and without a tag
  // the second run of this suite 409s on every create.
  const tag = `EOS${Date.now()}`;

  let academicYearId: string;
  let termId: string;
  let classSectionId: string;
  let batchId: string;

  // Profiles and relationship trackers
  let studentUserId: string;
  let studentProfileId: string;
  let guardianUserId: string;
  let guardianProfileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Login as Super Admin to perform administrative actions
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@eudora.app',
        password: 'Admin@123',
      })
      .expect(200);

    const rawCookies = loginRes.headers['set-cookie'];
    const cookies = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const accessTokenCookie = cookies.find((cookie: string) =>
      cookie.startsWith('access_token='),
    );
    superAdminToken = accessTokenCookie
      ? accessTokenCookie.split(';')[0].split('=')[1]
      : '';
    expect(superAdminToken).toBeDefined();

    // Create a regular user for RBAC verification
    const uniqueEmail = `regular-user-${Date.now()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: uniqueEmail,
        password: 'Password@123',
        firstName: 'Regular',
        lastName: 'User',
      })
      .expect(201);

    const rawRegCookies = registerRes.headers['set-cookie'];
    const regCookies = Array.isArray(rawRegCookies)
      ? rawRegCookies
      : rawRegCookies
        ? [rawRegCookies]
        : [];
    const regAccessTokenCookie = regCookies.find((cookie: string) =>
      cookie.startsWith('access_token='),
    );
    regularUserToken = regAccessTokenCookie
      ? regAccessTokenCookie.split(';')[0].split('=')[1]
      : '';
    const dbRegularUser = await prisma.user.findUnique({
      where: { email: uniqueEmail },
    });
    regularUserId = dbRegularUser!.id;
  });

  afterAll(async () => {
    // Cascade onDelete in prisma schema will clean up related records when we delete parent rows.
    // Clean up created entities to leave DB clean
    if (studentProfileId) {
      await prisma.studentProfile
        .delete({ where: { id: studentProfileId } })
        .catch(() => {});
    }
    if (guardianProfileId) {
      await prisma.guardianProfile
        .delete({ where: { id: guardianProfileId } })
        .catch(() => {});
    }
    if (studentUserId) {
      await prisma.userRole
        .deleteMany({ where: { userId: studentUserId } })
        .catch(() => {});
      await prisma.user
        .delete({ where: { id: studentUserId } })
        .catch(() => {});
    }
    if (guardianUserId) {
      await prisma.userRole
        .deleteMany({ where: { userId: guardianUserId } })
        .catch(() => {});
      await prisma.user
        .delete({ where: { id: guardianUserId } })
        .catch(() => {});
    }
    if (batchId) {
      await prisma.batch.delete({ where: { id: batchId } }).catch(() => {});
    }
    if (classSectionId) {
      await prisma.classSection
        .delete({ where: { id: classSectionId } })
        .catch(() => {});
    }
    if (termId) {
      await prisma.term.delete({ where: { id: termId } }).catch(() => {});
    }
    if (academicYearId) {
      await prisma.academicYear
        .delete({ where: { id: academicYearId } })
        .catch(() => {});
    }
    if (programId) {
      await prisma.program.delete({ where: { id: programId } }).catch(() => {});
    }
    if (regularUserId) {
      await prisma.userRole
        .deleteMany({ where: { userId: regularUserId } })
        .catch(() => {});
      await prisma.user
        .delete({ where: { id: regularUserId } })
        .catch(() => {});
    }

    await app.close();
  });

  describe('Institution Module & RBAC', () => {
    it('should deny a regular user from creating a program', async () => {
      await request(app.getHttpServer())
        .post('/api/programs')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({
          name: `Computer Science ${tag}`,
          code: `CS101-${tag}`,
        })
        .expect(403);
    });

    it('should allow super admin to create a program', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/programs')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: `Software Engineering ${tag}`,
          code: `SE-BSC-${tag}`,
        })
        .expect(201);

      const body = res.body as { data: { id: string; code: string } };
      expect(body.data).toHaveProperty('id');
      expect(body.data.code).toBe(`SE-BSC-${tag}`);
      programId = body.data.id;
    });
  });

  describe('Academic Module', () => {
    it('should allow admin to create an academic year', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/academic-years')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: `Academic Year ${tag}`,
          startDate: '2026-09-01T00:00:00.000Z',
          endDate: '2027-06-30T00:00:00.000Z',
        })
        .expect(201);

      const body = res.body as { data: { id: string } };
      academicYearId = body.data.id;
      expect(academicYearId).toBeDefined();
    });

    it('should throw bad request when creating a term outside the academic year dates', async () => {
      await request(app.getHttpServer())
        .post('/api/terms')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          academicYearId,
          name: `Term Out of Bounds ${tag}`,
          startDate: '2026-08-15T00:00:00.000Z', // Starts before AY
          endDate: '2026-12-15T00:00:00.000Z',
        })
        .expect(400);
    });

    it('should allow admin to create a term within academic year dates', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/terms')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          academicYearId,
          name: `Fall Term ${tag}`,
          startDate: '2026-09-10T00:00:00.000Z',
          endDate: '2026-12-20T00:00:00.000Z',
        })
        .expect(201);

      const body = res.body as { data: { id: string } };
      termId = body.data.id;
      expect(termId).toBeDefined();
    });

    it('should allow admin to create a class section under a program and academic year', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/class-sections')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          programId,
          academicYearId,
          name: 'SE Section A',
          code: `SE-A-${tag}`,
          class: 'Grade 10',
          classroom: 'Room 302',
        })
        .expect(201);

      const body = res.body as { data: { id: string } };
      classSectionId = body.data.id;
      expect(classSectionId).toBeDefined();
    });

    it('should allow admin to create a course class under a term', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/batches')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          termId,
          name: 'Algorithms & Data Structures',
          code: `DSA-${tag}`,
        })
        .expect(201);

      const body = res.body as { data: { id: string } };
      batchId = body.data.id;
      expect(batchId).toBeDefined();
    });
  });

  describe('Student Module', () => {
    beforeAll(async () => {
      // Create a user account to link to the student profile
      const uniqueStudentEmail = `student-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueStudentEmail,
          password: 'Student@123',
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201);

      const dbStudent = await prisma.user.findUnique({
        where: { email: uniqueStudentEmail },
      });
      studentUserId = dbStudent!.id;
    });

    it('should allow creating a student profile for an existing user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/student-profiles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          userId: studentUserId,
          fullName: 'John Doe Jr.',
          birthDate: '2010-05-15T00:00:00.000Z',
          gender: 'MALE',
        })
        .expect(201);

      const body = res.body as { data: { id: string } };
      studentProfileId = body.data.id;
      expect(studentProfileId).toBeDefined();
    });

    it('should allow placing a student into a class section', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/student-placements')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          studentProfileId,
          classSectionId,
          academicYearId,
          status: 'PLACED',
        })
        .expect(201);

      const body = res.body as {
        data: { studentProfileId: string; classSectionId: string };
      };
      expect(body.data.studentProfileId).toBe(studentProfileId);
      expect(body.data.classSectionId).toBe(classSectionId);
    });

    it('should allow enrolling a student in a course class', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/student-enrollments')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          studentProfileId,
          batchId,
          status: 'ENROLLED',
        })
        .expect(201);

      const body = res.body as {
        data: { studentProfileId: string; batchId: string };
      };
      expect(body.data.studentProfileId).toBe(studentProfileId);
      expect(body.data.batchId).toBe(batchId);
    });
  });

  describe('Family & Guardian Module', () => {
    beforeAll(async () => {
      // Create a user account to link to the guardian profile
      const uniqueGuardianEmail = `guardian-${Date.now()}@example.com`;
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: uniqueGuardianEmail,
          password: 'Guardian@123',
          firstName: 'Robert',
          lastName: 'Doe',
        })
        .expect(201);

      const dbGuardian = await prisma.user.findUnique({
        where: { email: uniqueGuardianEmail },
      });
      guardianUserId = dbGuardian!.id;
    });

    it('gets the guardian profile written at registration', async () => {
      // POST /guardian-profiles keeps its 409 on purpose: a second profile for
      // the same person is an admin mistake. Registration already made this one.
      const profile = await prisma.guardianProfile.findUnique({
        where: { userId: guardianUserId },
      });
      expect(profile).toBeTruthy();
      guardianProfileId = profile!.id;
    });

    it('should allow defining a relationship between guardian and student', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/guardian-relationships')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          guardianProfileId,
          studentProfileId,
          relationshipType: 'FATHER',
          isPrimary: true,
          hasFinancialResponsibility: true,
          hasAcademicAccess: true,
        })
        .expect(201);

      const body = res.body as {
        data: { relationshipType: string; guardianProfileId: string };
      };
      expect(body.data.relationshipType).toBe('FATHER');
      expect(body.data.guardianProfileId).toBe(guardianProfileId);
    });
  });
});
