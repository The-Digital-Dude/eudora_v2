import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  const subjects = ['User', 'Role', 'Permission'];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissionIds: Record<string, string> = {};

  for (const subject of subjects) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: {
          action_subject: { action, subject },
        },
        update: {},
        create: {
          action,
          subject,
          description: `Can ${action} ${subject}s`,
        },
      });
      permissionIds[`${action}:${subject}`] = permission.id;
    }
  }
  console.log('✅ Created permissions');

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: {},
    create: {
      name: 'SUPER_ADMIN',
      description: 'Super administrator with all permissions',
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Administrator with management permissions',
    },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'USER' },
    update: {},
    create: {
      name: 'USER',
      description: 'Regular user with profile-only access',
    },
  });
  console.log('✅ Created roles');

  for (const permissionId of Object.values(permissionIds)) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId,
      },
    });
  }

  const adminPermissions = [
    'read:User', 'update:User',
    'create:Role', 'read:Role', 'update:Role', 'delete:Role',
    'read:Permission'
  ];

  for (const permKey of adminPermissions) {
    const permissionId = permissionIds[permKey];
    if (permissionId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId,
        },
      });
    }
  }

  const userPermissions = ['read:User'];
  for (const permKey of userPermissions) {
    const permissionId = permissionIds[permKey];
    if (permissionId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: userRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: userRole.id,
          permissionId,
        },
      });
    }
  }
  console.log('✅ Assigned permissions to roles');

  const adminEmail = 'admin@eudora.app';
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('✅ Created super-admin user');

  console.log('🌱 Seeding institution and academic structures...');
  const campus = await prisma.campus.upsert({
    where: { name: 'Main Campus' },
    update: {},
    create: {
      name: 'Main Campus',
      representative: 'Dr. Alan Turing',
      status: 'ACTIVE',
    },
  });

  const program = await prisma.program.upsert({
    where: { code: 'BSC-CS' },
    update: {},
    create: {
      campusId: campus.id,
      name: 'Bachelor of Science in Computer Science',
      code: 'BSC-CS',
      status: 'ACTIVE',
    },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: { name: 'Academic Year 2026-2027' },
    update: {},
    create: {
      name: 'Academic Year 2026-2027',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2027-06-30T00:00:00.000Z'),
      status: 'ACTIVE',
    },
  });

  let term = await prisma.term.findFirst({
    where: { name: 'Fall Semester 2026', academicYearId: academicYear.id },
  });
  if (!term) {
    term = await prisma.term.create({
      data: {
        academicYearId: academicYear.id,
        name: 'Fall Semester 2026',
        startDate: new Date('2026-09-10T00:00:00.000Z'),
        endDate: new Date('2026-12-20T00:00:00.000Z'),
        status: 'ACTIVE',
      },
    });
  }

  await prisma.classSection.upsert({
    where: { code: 'CS-2026-A' },
    update: {},
    create: {
      programId: program.id,
      academicYearId: academicYear.id,
      name: 'CS Section A',
      code: 'CS-2026-A',
      class: 'Grade 10',
      classroom: 'Lab 1',
      status: 'ACTIVE',
    },
  });

  await prisma.courseClass.upsert({
    where: { code: 'CS-DSA-2026' },
    update: {},
    create: {
      termId: term.id,
      name: 'Algorithms & Data Structures',
      code: 'CS-DSA-2026',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Seeded institution & academic structures');

  console.log('🌱 Seeding billing plans...');
  const plansData = [
    {
      name: 'Free',
      description: 'Free tier for small campuses',
      priceMonthly: 0.00,
      priceAnnual: 0.00,
      currency: 'USD',
      stripePriceIdMonthly: null,
      stripePriceIdAnnual: null,
      maxStudents: 50,
      maxCampuses: 1,
      maxPrograms: 5,
      features: [],
      isActive: true,
      isPublic: true,
    },
    {
      name: 'Starter',
      description: 'Starter tier for growing educational institutions',
      priceMonthly: 29.00,
      priceAnnual: 290.00,
      currency: 'USD',
      stripePriceIdMonthly: 'price_starter_monthly_placeholder',
      stripePriceIdAnnual: 'price_starter_annual_placeholder',
      maxStudents: 200,
      maxCampuses: 2,
      maxPrograms: 15,
      features: ['basic_analytics'],
      isActive: true,
      isPublic: true,
    },
    {
      name: 'Pro',
      description: 'Advanced features for established schools',
      priceMonthly: 79.00,
      priceAnnual: 790.00,
      currency: 'USD',
      stripePriceIdMonthly: 'price_pro_monthly_placeholder',
      stripePriceIdAnnual: 'price_pro_annual_placeholder',
      maxStudents: 1000,
      maxCampuses: 10,
      maxPrograms: 50,
      features: ['basic_analytics', 'advanced_reports', 'api_access'],
      isActive: true,
      isPublic: true,
    },
    {
      name: 'Enterprise',
      description: 'Custom limits and dedicated support for large networks',
      priceMonthly: 299.00,
      priceAnnual: 2990.00,
      currency: 'USD',
      stripePriceIdMonthly: 'price_enterprise_monthly_placeholder',
      stripePriceIdAnnual: 'price_enterprise_annual_placeholder',
      maxStudents: null,
      maxCampuses: null,
      maxPrograms: null,
      features: ['basic_analytics', 'advanced_reports', 'api_access', 'dedicated_support'],
      isActive: true,
      isPublic: true,
    },
  ];

  const plans: Record<string, any> = {};
  for (const planData of plansData) {
    const seededPlan = await prisma.plan.upsert({
      where: { name: planData.name },
      update: {
        description: planData.description,
        priceMonthly: planData.priceMonthly,
        priceAnnual: planData.priceAnnual,
        stripePriceIdMonthly: planData.stripePriceIdMonthly,
        stripePriceIdAnnual: planData.stripePriceIdAnnual,
        maxStudents: planData.maxStudents,
        maxCampuses: planData.maxCampuses,
        maxPrograms: planData.maxPrograms,
        features: planData.features,
        isActive: planData.isActive,
        isPublic: planData.isPublic,
      },
      create: planData,
    });
    plans[planData.name] = seededPlan;
  }
  console.log('✅ Seeded billing plans');

  // Subscribe Main Campus to Free plan if it doesn't have a subscription
  const existingSub = await prisma.subscription.findUnique({
    where: { campusId: campus.id },
  });

  if (!existingSub) {
    const freePlan = plans['Free'];
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 100);

    await prisma.subscription.create({
      data: {
        campusId: campus.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        interval: 'MONTHLY',
        currentPeriodStart: new Date(),
        currentPeriodEnd,
      },
    });
    console.log('✅ Subscribed Main Campus to Free plan');
  }

  console.log('🌱 Seeding concept mastery curriculum structures...');
  const concept = await prisma.concept.upsert({
    where: { name: 'Fractions' },
    update: {},
    create: {
      name: 'Fractions',
      description: 'Understanding fraction concepts, operations, and applications',
    },
  });

  let competency = await prisma.competency.findFirst({
    where: { name: 'Compare Fractions', conceptId: concept.id },
  });
  if (!competency) {
    competency = await prisma.competency.create({
      data: {
        conceptId: concept.id,
        name: 'Compare Fractions',
        description: 'Ability to compare and order fractions with like and unlike denominators',
      },
    });
  }

  let rubric = await prisma.rubric.findFirst({
    where: { competencyId: competency.id },
  });
  if (!rubric) {
    rubric = await prisma.rubric.create({
      data: {
        competencyId: competency.id,
        name: 'Comparing Fractions Rubric',
        description: 'Evaluates correctness and mathematical reasoning when comparing fractions',
      },
    });
  }

  let criterionCorrectness = await prisma.rubricCriterion.findFirst({
    where: { rubricId: rubric.id, title: 'Correctness' },
  });
  if (!criterionCorrectness) {
    criterionCorrectness = await prisma.rubricCriterion.create({
      data: {
        rubricId: rubric.id,
        title: 'Correctness',
        description: 'Accuracy of the comparison results',
        weight: 2.0,
      },
    });

    const correctnessLevels = [
      { level: 0, title: 'Not Demonstrated', score: 0.0, description: 'Cannot compare fractions' },
      { level: 1, title: 'Emerging', score: 1.0, description: 'Needs substantial support' },
      { level: 2, title: 'Developing', score: 2.0, description: 'Can compare simple fractions with common denominators' },
      { level: 3, title: 'Proficient', score: 3.0, description: 'Can compare fractions with different denominators' },
      { level: 4, title: 'Advanced', score: 4.0, description: 'Can compare and simplify complex fractions' },
    ];

    for (const lvl of correctnessLevels) {
      await prisma.rubricLevel.create({
        data: {
          criterionId: criterionCorrectness.id,
          level: lvl.level,
          title: lvl.title,
          description: lvl.description,
          score: lvl.score,
        },
      });
    }
  }

  let criterionReasoning = await prisma.rubricCriterion.findFirst({
    where: { rubricId: rubric.id, title: 'Reasoning' },
  });
  if (!criterionReasoning) {
    criterionReasoning = await prisma.rubricCriterion.create({
      data: {
        rubricId: rubric.id,
        title: 'Reasoning',
        description: 'Justification of the comparison steps',
        weight: 1.0,
      },
    });

    const reasoningLevels = [
      { level: 0, title: 'Not Demonstrated', score: 0.0, description: 'No reasoning provided' },
      { level: 1, title: 'Emerging', score: 1.0, description: 'Lists steps without explanation' },
      { level: 2, title: 'Developing', score: 2.0, description: 'Explains steps but lacks deep justification' },
      { level: 3, title: 'Proficient', score: 3.0, description: 'Explains and justifies comparison logic clearly' },
      { level: 4, title: 'Advanced', score: 4.0, description: 'Exemplary explanation with visual/algebraic proof' },
    ];

    for (const lvl of reasoningLevels) {
      await prisma.rubricLevel.create({
        data: {
          criterionId: criterionReasoning.id,
          level: lvl.level,
          title: lvl.title,
          description: lvl.description,
          score: lvl.score,
        },
      });
    }
  }

  console.log('✅ Seeded concept mastery curriculum');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
