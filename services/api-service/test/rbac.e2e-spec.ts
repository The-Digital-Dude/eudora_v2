import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('RBAC Verification (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let superAdminToken: string;
  let testUserToken: string;
  let testUserId: string;
  let adminRoleId: string;
  let userRoleId: string;

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

    // Get the seeded roles
    const adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    const userRole = await prisma.role.findUnique({ where: { name: 'USER' } });
    adminRoleId = adminRole!.id;
    userRoleId = userRole!.id;

    // Login as Super Admin to perform admin operations
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@eudora.app',
        password: 'Admin@123',
      })
      .expect(201);
    
    superAdminToken = loginRes.body.access_token;
    expect(superAdminToken).toBeDefined();
  });

  afterAll(async () => {
    // Clean up test users
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userId: testUserId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
    await app.close();
  });

  it('should successfully register a test user with default USER role', async () => {
    const uniqueEmail = `test-user-${Date.now()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: uniqueEmail,
        password: 'Password@123',
        firstName: 'Test',
        lastName: 'User',
      })
      .expect(201);

    testUserToken = registerRes.body.access_token;
    expect(testUserToken).toBeDefined();

    // Verify user role in database is USER
    const dbUser = await prisma.user.findUnique({
      where: { email: uniqueEmail },
      include: { roles: { include: { role: true } } },
    });
    expect(dbUser).toBeDefined();
    testUserId = dbUser!.id;
    expect(dbUser!.roles.length).toBe(1);
    expect(dbUser!.roles[0].role.name).toBe('USER');
  });

  it('should deny the regular test user access to get all users', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(403);
  });

  it('should allow Super Admin access to get all users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);
    
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should allow Super Admin to assign the ADMIN role to the test user', async () => {
    await request(app.getHttpServer())
      .post(`/api/users/${testUserId}/roles`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ roleId: adminRoleId })
      .expect(201);

    // Verify test user now has both USER and ADMIN roles
    const dbUser = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { roles: { include: { role: true } } },
    });
    const roleNames = dbUser!.roles.map((ur) => ur.role.name);
    expect(roleNames).toContain('USER');
    expect(roleNames).toContain('ADMIN');
  });

  it('should now allow the test user to query all users (since they have the ADMIN role)', async () => {
    // Note: Due to JwtStrategy fetching roles from database on every validation,
    // the user's existing token should automatically authorize them.
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('data');
  });

  it('should allow Super Admin to remove the ADMIN role from the test user', async () => {
    await request(app.getHttpServer())
      .delete(`/api/users/${testUserId}/roles/${adminRoleId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .expect(200);

    // Verify user only has USER role again
    const dbUser = await prisma.user.findUnique({
      where: { id: testUserId },
      include: { roles: { include: { role: true } } },
    });
    const roleNames = dbUser!.roles.map((ur) => ur.role.name);
    expect(roleNames).toEqual(['USER']);
  });

  it('should deny the test user access to get all users again', async () => {
    await request(app.getHttpServer())
      .get('/api/users')
      .set('Authorization', `Bearer ${testUserToken}`)
      .expect(403);
  });
});
