import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  const subjects = ['User', 'Role', 'Permission', 'Teacher', 'Student', 'Assessment'];
  const actions = ['create', 'read', 'update', 'delete', 'manage', 'attempt', 'mark', 'assign'];

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

  const guardianRole = await prisma.role.upsert({
    where: { name: 'GUARDIAN' },
    update: {},
    create: {
      name: 'GUARDIAN',
      description: 'Guardian with read-only dashboard access to their linked students',
    },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'TEACHER' },
    update: {},
    create: {
      name: 'TEACHER',
      description: 'Teacher with class management and assessment scoring permissions',
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
    'create:User', 'read:User', 'update:User', 'delete:User',
    'create:Role', 'read:Role', 'update:Role', 'delete:Role',
    'read:Permission',
    'create:Teacher', 'read:Teacher', 'update:Teacher', 'delete:Teacher', 'manage:Teacher',
    'create:Student', 'read:Student', 'update:Student', 'delete:Student', 'manage:Student',
    'read:Assessment', 'manage:Assessment', 'assign:Assessment'
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

  const userPermissions = [
    'read:User',
    'read:Student',
    'read:Assessment', 'attempt:Assessment'
  ];
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

  const teacherPermissions = [
    'read:User',
    'read:Teacher',
    'read:Student', 'update:Student', 'manage:Student',
    'read:Assessment', 'attempt:Assessment', 'mark:Assessment', 'assign:Assessment'
  ];
  for (const permKey of teacherPermissions) {
    const permissionId = permissionIds[permKey];
    if (permissionId) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: teacherRole.id,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId: teacherRole.id,
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

  const demoClassSection = await prisma.classSection.upsert({
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

  const teacherPassword = await bcrypt.hash('Teacher@123', 10);

  const teacherData = [
    { email: 'prof.turing@eudora.app', firstName: 'Alan', lastName: 'Turing', specialization: 'Computer Science', employeeCode: 'EMP-TURING' },
    { email: 'prof.lovelace@eudora.app', firstName: 'Ada', lastName: 'Lovelace', specialization: 'Mathematics', employeeCode: 'EMP-LOVELACE' },
  ];

  for (const t of teacherData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        password: teacherPassword,
        firstName: t.firstName,
        lastName: t.lastName,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: teacherRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: teacherRole.id,
      },
    });

    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        fullName: `${t.firstName} ${t.lastName}`,
        employeeCode: t.employeeCode,
        specialization: t.specialization,
        status: 'ACTIVE',
      },
    });

    await prisma.classTeacher.upsert({
      where: {
        teacherProfileId_classSectionId: {
          teacherProfileId: profile.id,
          classSectionId: demoClassSection.id,
        },
      },
      update: {},
      create: {
        teacherProfileId: profile.id,
        classSectionId: demoClassSection.id,
        role: 'PRIMARY',
      },
    });
  }

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

  console.log('🌱 Seeding active learning lessons...');
  let lesson = await prisma.lesson.findFirst({
    where: { title: 'Intro to Comparing Fractions' },
  });

  if (!lesson) {
    lesson = await prisma.lesson.create({
      data: {
        conceptId: concept.id,
        title: 'Intro to Comparing Fractions',
        description: 'Visualizing and understanding how different fractions compare.',
        sortOrder: 1,
        xpReward: 50,
      },
    });

    const mathSubject = await prisma.subject.upsert({
      where: { code: 'MATH' },
      update: {},
      create: { code: 'MATH', name: 'Mathematics' },
    });

    const gradeLevel = await prisma.level.upsert({
      where: { code: 'G10' },
      update: {},
      create: { code: 'G10', name: 'Grade 10', sortOrder: 10 },
    });

    const q1 = await prisma.question.create({
      data: {
        subjectId: mathSubject.id,
        levelId: gradeLevel.id,
        questionType: 'interactive',
        prompt: 'Slide the dial to increase the numerator and see how the shaded area changes.',
        correctAnswer: '5',
        widgetType: 'SLIDER_MANIPULATIVE',
        isGraded: false,
        explanation: 'As the numerator increases, you shade more parts of the whole, meaning the value of the fraction grows!',
        hints: ['Try moving the slider all the way to 5 parts.'],
        widgetConfig: {
          min: 1,
          max: 10,
          step: 1,
          defaultValue: 2,
          targetValue: 5,
          tolerance: 0.1,
          displayFormula: '{val} / 10',
          visualizationType: 'scale_balance',
        },
      },
    });

    await prisma.card.create({
      data: {
        lessonId: lesson.id,
        title: 'Shading the Whole',
        sortOrder: 1,
        cardType: 'CONCEPTUAL',
        content: 'Fractions represent parts of a whole. Let us visualize $$\\frac{x}{10}$$ dynamically. Drag the slider to observe how the value changes relative to 1.',
        questionId: q1.id,
      },
    });

    const q2 = await prisma.question.create({
      data: {
        subjectId: mathSubject.id,
        levelId: gradeLevel.id,
        questionType: 'mcq',
        prompt: 'Which fraction is larger: $$\\frac{3}{5}$$ or $$\\frac{3}{7}$$?',
        correctAnswer: null,
        widgetType: 'STANDARD_MCQ',
        isGraded: true,
        explanation: 'When numerators are equal, the fraction with the smaller denominator is larger because the whole is divided into fewer, larger pieces!',
        hints: ['Think about sharing a pizza with 5 people versus 7 people.'],
      },
    });

    await prisma.questionOption.create({
      data: {
        questionId: q2.id,
        optionLabel: 'A',
        optionText: '$$\\frac{3}{5}$$',
        isCorrect: true,
      },
    });

    await prisma.questionOption.create({
      data: {
        questionId: q2.id,
        optionLabel: 'B',
        optionText: '$$\\frac{3}{7}$$',
        isCorrect: false,
      },
    });

    await prisma.card.create({
      data: {
        lessonId: lesson.id,
        title: 'Comparing Equal Numerators',
        sortOrder: 2,
        cardType: 'INTERACTIVE',
        content: 'Now, let us compare two fractions that have the same numerator but different denominators. Make a prediction!',
        questionId: q2.id,
      },
    });
  }
  console.log('✅ Seeded active learning lessons');

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

  console.log('🌱 Seeding student users and profiles...');
  const studentData = [
    { email: 'charlotte@example.com', firstName: 'Charlotte', lastName: 'Harris', gender: 'FEMALE' },
    { email: 'elijah.m@example.com', firstName: 'Elijah', lastName: 'Miller', gender: 'MALE' },
    { email: 'aria.w@example.com', firstName: 'Aria', lastName: 'Watson', gender: 'FEMALE' },
    { email: 'lucas.b@example.com', firstName: 'Lucas', lastName: 'Brooks', gender: 'MALE' },
  ];

  const studentProfiles = [];
  const classSection = await prisma.classSection.findUnique({ where: { code: 'CS-2026-A' } });

  for (const s of studentData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        password: hashedPassword,
        firstName: s.firstName,
        lastName: s.lastName,
        isActive: true,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: userRole.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        roleId: userRole.id,
      },
    });

    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: `${s.firstName} ${s.lastName}`,
        gender: s.gender as any,
        status: 'ACTIVE',
      },
      create: {
        userId: user.id,
        fullName: `${s.firstName} ${s.lastName}`,
        birthDate: new Date('2010-05-15'),
        gender: s.gender as any,
        status: 'ACTIVE',
      },
    });
    studentProfiles.push(profile);

    // Seed class placement
    if (classSection) {
      await prisma.studentClassPlacement.upsert({
        where: {
          studentProfileId_classSectionId: {
            studentProfileId: profile.id,
            classSectionId: classSection.id,
          },
        },
        update: {},
        create: {
          studentProfileId: profile.id,
          classSectionId: classSection.id,
          academicYearId: academicYear.id,
          status: s.firstName === 'Elijah' ? 'PENDING' : 'PLACED',
          isActive: true,
        },
      });
    }
  }
  console.log('✅ Seeded student users and profiles');

  // Seed daily attendance
  console.log('🌱 Seeding daily attendance records...');
  if (classSection) {
    const dates = [
      new Date('2026-06-12'),
      new Date('2026-06-13'),
      new Date('2026-06-14'),
      new Date('2026-06-15'),
    ];

    for (const profile of studentProfiles) {
      for (const d of dates) {
        const isAbsent = profile.fullName === 'Charlotte Harris' && d.getTime() === new Date('2026-06-12').getTime();
        const status = isAbsent ? 'ABSENT' : 'PRESENT';
        const remarks = isAbsent ? 'Medical Leave' : 'On time';

        await prisma.dailyAttendance.upsert({
          where: {
            studentProfileId_classSectionId_date: {
              studentProfileId: profile.id,
              classSectionId: classSection.id,
              date: d,
            },
          },
          update: {
            status,
            remarks,
          },
          create: {
            studentProfileId: profile.id,
            classSectionId: classSection.id,
            date: d,
            status,
            remarks,
            recordedById: superAdminUser.id,
          },
        });
      }
    }
  }
  console.log('✅ Seeded daily attendance records');

  // Seed leads
  console.log('🌱 Seeding leads...');
  await prisma.lead.deleteMany();
  await prisma.lead.createMany({
    data: [
      {
        name: 'Charlotte Harris',
        email: 'charlotte@example.com',
        phone: '(555) 019-8832',
        status: 'New',
        source: 'Website Form',
        notes: 'Interested in Grade 10 programming bootcamp.',
      },
      {
        name: 'Elijah Miller',
        email: 'elijah.m@example.com',
        phone: '(555) 012-3841',
        status: 'Diagnostic Scheduled',
        source: 'Referral',
        notes: 'Needs diagnostic assessment for math level alignment.',
      },
      {
        name: 'Aria Watson',
        email: 'aria.w@example.com',
        phone: '(555) 019-3392',
        status: 'Pending Enrolment',
        source: 'Facebook Ad',
        notes: 'Completed evaluation, pending enrollment confirmation.',
      },
      {
        name: 'Lucas Brooks',
        email: 'lucas.b@example.com',
        phone: '(555) 015-2831',
        status: 'Enrolled',
        source: 'Walk-in',
        notes: 'Fully enroled in BSC-CS program.',
      },
    ],
  });
  console.log('✅ Seeded leads');

  // Seed broadcasts
  console.log('🌱 Seeding communication broadcasts...');
  await prisma.broadcast.deleteMany();
  await prisma.broadcast.createMany({
    data: [
      {
        type: 'Announcement',
        title: 'Fall Semester 2026 Registration Open',
        content: 'Registration is now open for all programs in the Fall 2026 term.',
        sender: 'System',
        status: 'SENT',
        recipientCount: 120,
      },
      {
        type: 'SMS Alert',
        title: 'Attendance Reminder Sent to Parent (Watson)',
        content: 'Watson was absent from morning roll call.',
        sender: 'Main Campus Branch',
        status: 'SENT',
        recipientCount: 1,
      },
      {
        type: 'Email Broadcast',
        title: 'Tuition Invoices Generated',
        content: 'Term invoices for Fall Semester 2026 have been issued.',
        sender: 'Billing System',
        status: 'SENT',
        recipientCount: 95,
      },
    ],
  });
  console.log('✅ Seeded communication broadcasts');

  // Seed makeup requests
  console.log('🌱 Seeding makeup requests...');
  await prisma.makeupRequest.deleteMany();
  const charlotteProfile = studentProfiles.find((p) => p.fullName === 'Charlotte Harris');
  const elijahProfile = studentProfiles.find((p) => p.fullName === 'Elijah Miller');
  const dsaClass = await prisma.courseClass.findUnique({ where: { code: 'CS-DSA-2026' } });

  if (charlotteProfile && elijahProfile && dsaClass) {
    await prisma.makeupRequest.createMany({
      data: [
        {
          studentProfileId: charlotteProfile.id,
          courseClassId: dsaClass.id,
          originalDate: new Date('2026-06-12'),
          reason: 'Medical Leave',
          status: 'Awaiting Action',
        },
        {
          studentProfileId: elijahProfile.id,
          courseClassId: dsaClass.id,
          originalDate: new Date('2026-06-15'),
          reason: 'Family Event',
          status: 'Scheduled',
          scheduledDate: new Date('2026-06-18'),
        },
      ],
    });
  }
  console.log('✅ Seeded makeup requests');

  // Seed notifications
  console.log('🌱 Seeding notifications...');
  await prisma.notification.deleteMany();
  await prisma.notification.createMany({
    data: [
      {
        userId: superAdminUser.id,
        type: 'INFO',
        title: 'Welcome to Eudora',
        body: 'Welcome to your new educational management dashboard. Explore your administrative options!',
        readAt: null,
      },
      {
        userId: superAdminUser.id,
        type: 'WARNING',
        title: 'High Makeup Request Volume',
        body: 'There are pending makeup requests that require attention.',
        readAt: null,
      },
      {
        userId: superAdminUser.id,
        type: 'SYSTEM',
        title: 'Backup Successful',
        body: 'System database backup completed successfully.',
        readAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      }
    ],
  });
  console.log('✅ Seeded notifications');

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
