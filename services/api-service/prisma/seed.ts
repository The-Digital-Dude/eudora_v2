import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL ?? '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // ─── Permissions & Roles ─────────────────────────────────────────────────────
  const subjects = ['User', 'Role', 'Permission', 'Teacher', 'Student', 'Assessment', 'Timetable', 'Attendance', 'Homework', 'Gradebook', 'ReportCard', 'LearningGap', 'NextAction', 'Diagnostic', 'Placement', 'LiveClass'];
  const actions = ['create', 'read', 'update', 'delete', 'manage', 'attempt', 'mark', 'assign'];
  const permissionIds: Record<string, string> = {};

  for (const subject of subjects) {
    for (const action of actions) {
      const permission = await prisma.permission.upsert({
        where: { action_subject: { action, subject } },
        update: {},
        create: { action, subject, description: `Can ${action} ${subject}s` },
      });
      permissionIds[`${action}:${subject}`] = permission.id;
    }
  }
  console.log('✅ Created permissions');

  const superAdminRole = await prisma.role.upsert({ where: { name: 'SUPER_ADMIN' }, update: {}, create: { name: 'SUPER_ADMIN', description: 'Super administrator with all permissions' } });
  const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN', description: 'Administrator with management permissions' } });
  const userRole = await prisma.role.upsert({ where: { name: 'USER' }, update: {}, create: { name: 'USER', description: 'Regular user with profile-only access' } });
  const guardianRole = await prisma.role.upsert({ where: { name: 'GUARDIAN' }, update: {}, create: { name: 'GUARDIAN', description: 'Guardian with read-only dashboard access to their linked students' } });
  const teacherRole = await prisma.role.upsert({ where: { name: 'TEACHER' }, update: {}, create: { name: 'TEACHER', description: 'Teacher with class management and assessment scoring permissions' } });
  console.log('✅ Created roles');

  for (const permissionId of Object.values(permissionIds)) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId },
    });
  }

  const adminPerms = [
    'create:User','read:User','update:User','delete:User','create:Role','read:Role','update:Role','delete:Role',
    'read:Permission','create:Teacher','read:Teacher','update:Teacher','delete:Teacher','manage:Teacher',
    'create:Student','read:Student','update:Student','delete:Student','manage:Student',
    'read:Assessment','manage:Assessment','assign:Assessment',
    'create:Timetable','read:Timetable','update:Timetable','delete:Timetable','manage:Timetable',
    'create:Attendance','read:Attendance','update:Attendance','delete:Attendance','manage:Attendance',
    'create:Homework','read:Homework','update:Homework','delete:Homework','manage:Homework',
    'create:Gradebook','read:Gradebook','update:Gradebook','delete:Gradebook','manage:Gradebook',
    'create:ReportCard','read:ReportCard','update:ReportCard','delete:ReportCard','manage:ReportCard',
    'create:LearningGap','read:LearningGap','update:LearningGap','delete:LearningGap','manage:LearningGap',
    'create:NextAction','read:NextAction','update:NextAction','delete:NextAction','manage:NextAction',
    'create:Diagnostic','read:Diagnostic','update:Diagnostic','delete:Diagnostic','manage:Diagnostic',
    'create:Placement','read:Placement','update:Placement','delete:Placement','manage:Placement',
    'create:LiveClass','read:LiveClass','update:LiveClass','delete:LiveClass','manage:LiveClass',
  ];
  for (const k of adminPerms) {
    const pid = permissionIds[k];
    if (pid) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: adminRole.id, permissionId: pid } }, update: {}, create: { roleId: adminRole.id, permissionId: pid } });
  }
  for (const k of ['read:User','read:Student','read:Assessment','attempt:Assessment','read:Timetable','read:Attendance','read:Homework','attempt:Homework','read:Gradebook','read:ReportCard']) {
    const pid = permissionIds[k];
    if (pid) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: userRole.id, permissionId: pid } }, update: {}, create: { roleId: userRole.id, permissionId: pid } });
  }
  for (const k of ['read:User','read:Teacher','read:Student','update:Student','manage:Student','read:Assessment','attempt:Assessment','mark:Assessment','assign:Assessment','read:Timetable','create:Attendance','read:Attendance','update:Attendance','manage:Attendance','create:Homework','read:Homework','update:Homework','delete:Homework','manage:Homework','create:Gradebook','read:Gradebook','update:Gradebook','manage:Gradebook','read:LearningGap','update:LearningGap','create:NextAction','read:NextAction','update:NextAction','create:Diagnostic','read:Diagnostic','update:Diagnostic','create:Placement','read:Placement','update:Placement','create:LiveClass','read:LiveClass','update:LiveClass']) {
    const pid = permissionIds[k];
    if (pid) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: teacherRole.id, permissionId: pid } }, update: {}, create: { roleId: teacherRole.id, permissionId: pid } });
  }
  for (const k of ['read:User','read:Student','read:Timetable','read:Attendance','read:Homework','read:ReportCard']) {
    const pid = permissionIds[k];
    if (pid) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: guardianRole.id, permissionId: pid } }, update: {}, create: { roleId: guardianRole.id, permissionId: pid } });
  }
  console.log('✅ Assigned permissions to roles');

  // ─── Super Admin User ─────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'admin@eudora.app' },
    update: { password: hashedPassword },
    create: { email: 'admin@eudora.app', password: hashedPassword, firstName: 'System', lastName: 'Admin', isActive: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id },
  });
  console.log('✅ Created super-admin user');

  // ─── Institution & Academic Structure ────────────────────────────────────────
  console.log('🌱 Seeding institution and academic structures...');
  const campus = await prisma.campus.upsert({
    where: { name: 'Main Campus' },
    update: {},
    create: { name: 'Main Campus', representative: 'Dr. Alan Turing', status: 'ACTIVE' },
  });

  const northCampus = await prisma.campus.upsert({
    where: { name: 'North Campus' },
    update: {},
    create: { name: 'North Campus', representative: 'Dr. Grace Hopper', status: 'ACTIVE' },
  });

  const program = await prisma.program.upsert({
    where: { code: 'BSC-CS' },
    update: {},
    create: { campusId: campus.id, name: 'Bachelor of Science in Computer Science', code: 'BSC-CS', status: 'ACTIVE' },
  });

  const mathProgram = await prisma.program.upsert({
    where: { code: 'BSC-MATH' },
    update: {},
    create: { campusId: campus.id, name: 'Bachelor of Science in Mathematics', code: 'BSC-MATH', status: 'ACTIVE' },
  });

  const academicYear = await prisma.academicYear.upsert({
    where: { name: 'Academic Year 2026-2027' },
    update: {},
    create: { name: 'Academic Year 2026-2027', startDate: new Date('2026-09-01'), endDate: new Date('2027-06-30'), status: 'ACTIVE' },
  });

  let term = await prisma.term.findFirst({ where: { name: 'Fall Semester 2026', academicYearId: academicYear.id } });
  if (!term) {
    term = await prisma.term.create({ data: { academicYearId: academicYear.id, name: 'Fall Semester 2026', startDate: new Date('2026-09-10'), endDate: new Date('2026-12-20'), status: 'ACTIVE' } });
  }

  let springTerm = await prisma.term.findFirst({ where: { name: 'Spring Semester 2027', academicYearId: academicYear.id } });
  if (!springTerm) {
    springTerm = await prisma.term.create({ data: { academicYearId: academicYear.id, name: 'Spring Semester 2027', startDate: new Date('2027-01-15'), endDate: new Date('2027-05-30'), status: 'ACTIVE' } });
  }

  // Class sections
  const sectionA = await prisma.classSection.upsert({
    where: { code: 'CS-2026-A' },
    update: {},
    create: { programId: program.id, academicYearId: academicYear.id, name: 'CS Section A', code: 'CS-2026-A', class: 'Grade 10', classroom: 'Lab 1', status: 'ACTIVE' },
  });

  const sectionB = await prisma.classSection.upsert({
    where: { code: 'CS-2026-B' },
    update: {},
    create: { programId: program.id, academicYearId: academicYear.id, name: 'CS Section B', code: 'CS-2026-B', class: 'Grade 10', classroom: 'Lab 2', status: 'ACTIVE' },
  });

  const mathSection = await prisma.classSection.upsert({
    where: { code: 'MATH-2026-A' },
    update: {},
    create: { programId: mathProgram.id, academicYearId: academicYear.id, name: 'Math Section A', code: 'MATH-2026-A', class: 'Grade 10', classroom: 'Room 201', status: 'ACTIVE' },
  });

  // ─── Subjects & Levels ───────────────────────────────────────────────────────
  const mathSubject = await prisma.subject.upsert({ where: { code: 'MATH' }, update: {}, create: { code: 'MATH', name: 'Mathematics' } });
  const csSubject = await prisma.subject.upsert({ where: { code: 'CS' }, update: {}, create: { code: 'CS', name: 'Computer Science' } });
  const engSubject = await prisma.subject.upsert({ where: { code: 'ENG' }, update: {}, create: { code: 'ENG', name: 'English' } });

  const gradeLevel = await prisma.level.upsert({ where: { code: 'G10' }, update: {}, create: { code: 'G10', name: 'Grade 10', sortOrder: 10 } });
  const grade11Level = await prisma.level.upsert({ where: { code: 'G11' }, update: {}, create: { code: 'G11', name: 'Grade 11', sortOrder: 11 } });

  // ─── Course Classes ───────────────────────────────────────────────────────────
  const dsaClass = await prisma.courseClass.upsert({ where: { code: 'CS-DSA-2026' }, update: {}, create: { termId: term.id, name: 'Algorithms & Data Structures', code: 'CS-DSA-2026', status: 'ACTIVE' } });
  const algClass = await prisma.courseClass.upsert({ where: { code: 'CS-ALG-2026' }, update: {}, create: { termId: term.id, name: 'Introduction to Algorithms', code: 'CS-ALG-2026', status: 'ACTIVE' } });
  const webClass = await prisma.courseClass.upsert({ where: { code: 'CS-WEB-2026' }, update: {}, create: { termId: term.id, name: 'Web Development Fundamentals', code: 'CS-WEB-2026', status: 'ACTIVE' } });
  const calcClass = await prisma.courseClass.upsert({ where: { code: 'MATH-CALC-2026' }, update: {}, create: { termId: term.id, name: 'Calculus I', code: 'MATH-CALC-2026', status: 'ACTIVE' } });
  const engClass = await prisma.courseClass.upsert({ where: { code: 'ENG-COMP-2026' }, update: {}, create: { termId: term.id, name: 'English Composition', code: 'ENG-COMP-2026', status: 'ACTIVE' } });

  console.log('✅ Seeded institution & academic structures');

  // ─── Teachers ─────────────────────────────────────────────────────────────────
  console.log('🌱 Seeding teachers...');
  const teacherPassword = await bcrypt.hash('Teacher@123', 10);
  const teacherData = [
    { email: 'prof.turing@eudora.app', firstName: 'Alan', lastName: 'Turing', specialization: 'Computer Science', employeeCode: 'EMP-TURING', phone: '(555) 100-0001' },
    { email: 'prof.lovelace@eudora.app', firstName: 'Ada', lastName: 'Lovelace', specialization: 'Mathematics', employeeCode: 'EMP-LOVELACE', phone: '(555) 100-0002' },
    { email: 'prof.hopper@eudora.app', firstName: 'Grace', lastName: 'Hopper', specialization: 'Computer Science', employeeCode: 'EMP-HOPPER', phone: '(555) 100-0003' },
    { email: 'prof.euler@eudora.app', firstName: 'Leonhard', lastName: 'Euler', specialization: 'Mathematics', employeeCode: 'EMP-EULER', phone: '(555) 100-0004' },
  ];

  const teacherProfiles: Record<string, any> = {};
  const teacherUsers: Record<string, any> = {};

  for (const t of teacherData) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: { email: t.email, password: teacherPassword, firstName: t.firstName, lastName: t.lastName, isActive: true },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: teacherRole.id } },
      update: {},
      create: { userId: user.id, roleId: teacherRole.id },
    });
    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, fullName: `${t.firstName} ${t.lastName}`, employeeCode: t.employeeCode, specialization: t.specialization, phone: t.phone, status: 'ACTIVE' },
    });
    teacherProfiles[t.employeeCode] = profile;
    teacherUsers[t.employeeCode] = user;
  }

  // Assign teachers to class sections
  const classSectionAssignments = [
    { teacherCode: 'EMP-TURING', classSectionId: sectionA.id, role: 'PRIMARY' },
    { teacherCode: 'EMP-LOVELACE', classSectionId: sectionA.id, role: 'ASSISTANT' },
    { teacherCode: 'EMP-HOPPER', classSectionId: sectionB.id, role: 'PRIMARY' },
    { teacherCode: 'EMP-EULER', classSectionId: mathSection.id, role: 'PRIMARY' },
  ];
  for (const a of classSectionAssignments) {
    await prisma.classTeacher.upsert({
      where: { teacherProfileId_classSectionId: { teacherProfileId: teacherProfiles[a.teacherCode].id, classSectionId: a.classSectionId } },
      update: {},
      create: { teacherProfileId: teacherProfiles[a.teacherCode].id, classSectionId: a.classSectionId, role: a.role },
    });
  }
  console.log('✅ Seeded teachers');

  // ─── Billing Plans ────────────────────────────────────────────────────────────
  console.log('🌱 Seeding billing plans...');
  const plansData = [
    { name: 'Free', description: 'Free tier for small campuses', priceMonthly: 0, priceAnnual: 0, currency: 'USD', stripePriceIdMonthly: null, stripePriceIdAnnual: null, maxStudents: 50, maxCampuses: 1, maxPrograms: 5, features: [], isActive: true, isPublic: true },
    { name: 'Starter', description: 'Starter tier for growing educational institutions', priceMonthly: 29, priceAnnual: 290, currency: 'USD', stripePriceIdMonthly: 'price_starter_monthly_placeholder', stripePriceIdAnnual: 'price_starter_annual_placeholder', maxStudents: 200, maxCampuses: 2, maxPrograms: 15, features: ['basic_analytics'], isActive: true, isPublic: true },
    { name: 'Pro', description: 'Advanced features for established schools', priceMonthly: 79, priceAnnual: 790, currency: 'USD', stripePriceIdMonthly: 'price_pro_monthly_placeholder', stripePriceIdAnnual: 'price_pro_annual_placeholder', maxStudents: 1000, maxCampuses: 10, maxPrograms: 50, features: ['basic_analytics', 'advanced_reports', 'api_access'], isActive: true, isPublic: true },
    { name: 'Enterprise', description: 'Custom limits and dedicated support for large networks', priceMonthly: 299, priceAnnual: 2990, currency: 'USD', stripePriceIdMonthly: 'price_enterprise_monthly_placeholder', stripePriceIdAnnual: 'price_enterprise_annual_placeholder', maxStudents: null, maxCampuses: null, maxPrograms: null, features: ['basic_analytics', 'advanced_reports', 'api_access', 'dedicated_support'], isActive: true, isPublic: true },
  ];
  const plans: Record<string, any> = {};
  for (const p of plansData) {
    plans[p.name] = await prisma.plan.upsert({
      where: { name: p.name },
      update: { description: p.description, priceMonthly: p.priceMonthly, priceAnnual: p.priceAnnual, stripePriceIdMonthly: p.stripePriceIdMonthly, stripePriceIdAnnual: p.stripePriceIdAnnual, maxStudents: p.maxStudents, maxCampuses: p.maxCampuses, maxPrograms: p.maxPrograms, features: p.features, isActive: p.isActive, isPublic: p.isPublic },
      create: p,
    });
  }

  const existingSub = await prisma.subscription.findUnique({ where: { campusId: campus.id } });
  if (!existingSub) {
    const end = new Date(); end.setFullYear(end.getFullYear() + 100);
    await prisma.subscription.create({ data: { campusId: campus.id, planId: plans['Free'].id, status: 'ACTIVE', interval: 'MONTHLY', currentPeriodStart: new Date(), currentPeriodEnd: end } });
  }
  console.log('✅ Seeded billing plans');

  // ─── Concepts, Competencies, Lessons ─────────────────────────────────────────
  console.log('🌱 Seeding curriculum...');

  const fractionsConc = await prisma.concept.upsert({ where: { name: 'Fractions' }, update: {}, create: { name: 'Fractions', description: 'Understanding fraction concepts, operations, and applications' } });
  const algebraConc = await prisma.concept.upsert({ where: { name: 'Algebra Fundamentals' }, update: {}, create: { name: 'Algebra Fundamentals', description: 'Basic algebraic thinking and expressions' } });
  const sortingConc = await prisma.concept.upsert({ where: { name: 'Sorting Algorithms' }, update: {}, create: { name: 'Sorting Algorithms', description: 'Understanding comparison-based and non-comparison-based sorting' } });
  const htmlConc = await prisma.concept.upsert({ where: { name: 'HTML & CSS Basics' }, update: {}, create: { name: 'HTML & CSS Basics', description: 'Building the structure and style of web pages' } });

  // Competencies
  let compFractions = await prisma.competency.findFirst({ where: { name: 'Compare Fractions', conceptId: fractionsConc.id } });
  if (!compFractions) compFractions = await prisma.competency.create({ data: { conceptId: fractionsConc.id, name: 'Compare Fractions', description: 'Ability to compare and order fractions with like and unlike denominators' } });

  let compAlgebra = await prisma.competency.findFirst({ where: { name: 'Solve Linear Equations', conceptId: algebraConc.id } });
  if (!compAlgebra) compAlgebra = await prisma.competency.create({ data: { conceptId: algebraConc.id, name: 'Solve Linear Equations', description: 'Solve one-variable linear equations' } });

  let compSorting = await prisma.competency.findFirst({ where: { name: 'Implement Bubble Sort', conceptId: sortingConc.id } });
  if (!compSorting) compSorting = await prisma.competency.create({ data: { conceptId: sortingConc.id, name: 'Implement Bubble Sort', description: 'Implement and trace bubble sort algorithm' } });

  // Lessons
  let lesson1 = await prisma.lesson.findFirst({ where: { title: 'Intro to Comparing Fractions' } });
  if (!lesson1) {
    lesson1 = await prisma.lesson.create({ data: { conceptId: fractionsConc.id, title: 'Intro to Comparing Fractions', description: 'Visualizing and understanding how different fractions compare.', sortOrder: 1, xpReward: 50 } });
    const q1 = await prisma.question.create({ data: { subjectId: mathSubject.id, levelId: gradeLevel.id, questionType: 'interactive', prompt: 'Slide the dial to increase the numerator and see how the shaded area changes.', correctAnswer: '5', widgetType: 'SLIDER_MANIPULATIVE', isGraded: false, explanation: 'As the numerator increases, you shade more parts of the whole.', hints: ['Try moving the slider all the way to 5 parts.'], widgetConfig: { min: 1, max: 10, step: 1, defaultValue: 2, targetValue: 5, tolerance: 0.1, displayFormula: '{val} / 10', visualizationType: 'scale_balance' } } });
    await prisma.card.create({ data: { lessonId: lesson1.id, title: 'Shading the Whole', sortOrder: 1, cardType: 'CONCEPTUAL', content: 'Fractions represent parts of a whole. Let us visualize $$\\frac{x}{10}$$ dynamically.', questionId: q1.id } });
    const q2 = await prisma.question.create({ data: { subjectId: mathSubject.id, levelId: gradeLevel.id, questionType: 'mcq', prompt: 'Which fraction is larger: $$\\frac{3}{5}$$ or $$\\frac{3}{7}$$?', correctAnswer: null, widgetType: 'STANDARD_MCQ', isGraded: true, explanation: 'When numerators are equal, the fraction with the smaller denominator is larger.', hints: ['Think about sharing a pizza with 5 people versus 7 people.'] } });
    await prisma.questionOption.create({ data: { questionId: q2.id, optionLabel: 'A', optionText: '$$\\frac{3}{5}$$', isCorrect: true } });
    await prisma.questionOption.create({ data: { questionId: q2.id, optionLabel: 'B', optionText: '$$\\frac{3}{7}$$', isCorrect: false } });
    await prisma.card.create({ data: { lessonId: lesson1.id, title: 'Comparing Equal Numerators', sortOrder: 2, cardType: 'INTERACTIVE', content: 'Now compare two fractions with the same numerator but different denominators.', questionId: q2.id } });
  }

  let lesson2 = await prisma.lesson.findFirst({ where: { title: 'Adding Fractions with Like Denominators' } });
  if (!lesson2) {
    lesson2 = await prisma.lesson.create({ data: { conceptId: fractionsConc.id, title: 'Adding Fractions with Like Denominators', description: 'Learn to add fractions that share a common denominator.', sortOrder: 2, xpReward: 60 } });
    const q3 = await prisma.question.create({ data: { subjectId: mathSubject.id, levelId: gradeLevel.id, questionType: 'mcq', prompt: 'What is $$\\frac{2}{7} + \\frac{3}{7}$$?', correctAnswer: null, widgetType: 'STANDARD_MCQ', isGraded: true, explanation: 'Add the numerators and keep the denominator the same.', hints: ['Keep the denominator. Add the numerators.'] } });
    await prisma.questionOption.create({ data: { questionId: q3.id, optionLabel: 'A', optionText: '$$\\frac{5}{7}$$', isCorrect: true } });
    await prisma.questionOption.create({ data: { questionId: q3.id, optionLabel: 'B', optionText: '$$\\frac{5}{14}$$', isCorrect: false } });
    await prisma.questionOption.create({ data: { questionId: q3.id, optionLabel: 'C', optionText: '$$\\frac{6}{7}$$', isCorrect: false } });
    await prisma.card.create({ data: { lessonId: lesson2.id, title: 'Same Bottom, Add the Top', sortOrder: 1, cardType: 'INTERACTIVE', content: 'When denominators match, we simply add the numerators.', questionId: q3.id } });
  }

  let lesson3 = await prisma.lesson.findFirst({ where: { title: 'Variables and Expressions' } });
  if (!lesson3) {
    lesson3 = await prisma.lesson.create({ data: { conceptId: algebraConc.id, title: 'Variables and Expressions', description: 'Introduction to algebraic variables and forming expressions.', sortOrder: 1, xpReward: 55 } });
    const q4 = await prisma.question.create({ data: { subjectId: mathSubject.id, levelId: gradeLevel.id, questionType: 'mcq', prompt: 'If x = 4, what is the value of 3x + 2?', correctAnswer: null, widgetType: 'STANDARD_MCQ', isGraded: true, explanation: 'Substitute x = 4: 3(4) + 2 = 12 + 2 = 14.', hints: ['Replace x with 4.'] } });
    await prisma.questionOption.create({ data: { questionId: q4.id, optionLabel: 'A', optionText: '14', isCorrect: true } });
    await prisma.questionOption.create({ data: { questionId: q4.id, optionLabel: 'B', optionText: '12', isCorrect: false } });
    await prisma.questionOption.create({ data: { questionId: q4.id, optionLabel: 'C', optionText: '9', isCorrect: false } });
    await prisma.card.create({ data: { lessonId: lesson3.id, title: 'Substituting Values', sortOrder: 1, cardType: 'INTERACTIVE', content: 'A variable is a symbol that stands for a number. Let\'s practice substitution.', questionId: q4.id } });
  }

  let lesson4 = await prisma.lesson.findFirst({ where: { title: 'Bubble Sort Step by Step' } });
  if (!lesson4) {
    lesson4 = await prisma.lesson.create({ data: { conceptId: sortingConc.id, title: 'Bubble Sort Step by Step', description: 'Trace through the bubble sort algorithm and understand its complexity.', sortOrder: 1, xpReward: 75 } });
    const q5 = await prisma.question.create({ data: { subjectId: csSubject.id, levelId: gradeLevel.id, questionType: 'mcq', prompt: 'What is the time complexity of Bubble Sort in the worst case?', correctAnswer: null, widgetType: 'STANDARD_MCQ', isGraded: true, explanation: 'Bubble Sort compares each pair of adjacent elements, resulting in O(n²) operations in the worst case.', hints: ['Think about nested loops.'] } });
    await prisma.questionOption.create({ data: { questionId: q5.id, optionLabel: 'A', optionText: 'O(n²)', isCorrect: true } });
    await prisma.questionOption.create({ data: { questionId: q5.id, optionLabel: 'B', optionText: 'O(n log n)', isCorrect: false } });
    await prisma.questionOption.create({ data: { questionId: q5.id, optionLabel: 'C', optionText: 'O(n)', isCorrect: false } });
    await prisma.card.create({ data: { lessonId: lesson4.id, title: 'Comparing Pairs', sortOrder: 1, cardType: 'CONCEPTUAL', content: 'Bubble Sort repeatedly steps through the list, compares adjacent elements and swaps them if they are in the wrong order.' } });
    await prisma.card.create({ data: { lessonId: lesson4.id, title: 'Complexity Quiz', sortOrder: 2, cardType: 'INTERACTIVE', content: 'Test your understanding of Bubble Sort\'s time complexity.', questionId: q5.id } });
  }

  // Rubric for fractions competency
  let rubric = await prisma.rubric.findFirst({ where: { competencyId: compFractions.id } });
  if (!rubric) {
    rubric = await prisma.rubric.create({ data: { competencyId: compFractions.id, name: 'Comparing Fractions Rubric', description: 'Evaluates correctness and mathematical reasoning when comparing fractions' } });
    const crit1 = await prisma.rubricCriterion.create({ data: { rubricId: rubric.id, title: 'Correctness', description: 'Accuracy of the comparison results', weight: 2.0 } });
    for (const lvl of [{ level: 0, title: 'Not Demonstrated', score: 0 }, { level: 1, title: 'Emerging', score: 1 }, { level: 2, title: 'Developing', score: 2 }, { level: 3, title: 'Proficient', score: 3 }, { level: 4, title: 'Advanced', score: 4 }]) {
      await prisma.rubricLevel.create({ data: { criterionId: crit1.id, level: lvl.level, title: lvl.title, description: `Level ${lvl.level} performance`, score: lvl.score } });
    }
    const crit2 = await prisma.rubricCriterion.create({ data: { rubricId: rubric.id, title: 'Reasoning', description: 'Justification of the comparison steps', weight: 1.0 } });
    for (const lvl of [{ level: 0, title: 'Not Demonstrated', score: 0 }, { level: 1, title: 'Emerging', score: 1 }, { level: 2, title: 'Developing', score: 2 }, { level: 3, title: 'Proficient', score: 3 }, { level: 4, title: 'Advanced', score: 4 }]) {
      await prisma.rubricLevel.create({ data: { criterionId: crit2.id, level: lvl.level, title: lvl.title, description: `Level ${lvl.level} reasoning`, score: lvl.score } });
    }
  }
  console.log('✅ Seeded curriculum');

  // ─── Assessment Types ─────────────────────────────────────────────────────────
  console.log('🌱 Seeding assessment types & assessments...');
  const quizType = await prisma.assessmentType.upsert({ where: { code: 'QUIZ' }, update: {}, create: { code: 'QUIZ', name: 'Quiz' } });
  const midtermType = await prisma.assessmentType.upsert({ where: { code: 'MIDTERM' }, update: {}, create: { code: 'MIDTERM', name: 'Midterm Exam' } });
  const finalType = await prisma.assessmentType.upsert({ where: { code: 'FINAL' }, update: {}, create: { code: 'FINAL', name: 'Final Exam' } });
  const hwType = await prisma.assessmentType.upsert({ where: { code: 'HW' }, update: {}, create: { code: 'HW', name: 'Homework Assessment' } });
  await prisma.assessmentType.upsert({ where: { code: 'DIAGNOSTIC' }, update: {}, create: { code: 'DIAGNOSTIC', name: 'Diagnostic Assessment' } });

  // Questions for assessments
  const makeQ = async (subjectId: string, levelId: string, prompt: string, options: { label: string; text: string; correct: boolean }[], explanation: string) => {
    const existing = await prisma.question.findFirst({ where: { prompt } });
    if (existing) return existing;
    const q = await prisma.question.create({ data: { subjectId, levelId, questionType: 'mcq', prompt, widgetType: 'STANDARD_MCQ', isGraded: true, explanation, hints: [] } });
    for (const o of options) {
      await prisma.questionOption.create({ data: { questionId: q.id, optionLabel: o.label, optionText: o.text, isCorrect: o.correct } });
    }
    return q;
  };

  const mathQ1 = await makeQ(mathSubject.id, gradeLevel.id, 'Solve: 2x + 6 = 14. What is x?', [{ label: 'A', text: '4', correct: true }, { label: 'B', text: '3', correct: false }, { label: 'C', text: '10', correct: false }, { label: 'D', text: '5', correct: false }], 'Subtract 6 from both sides: 2x = 8. Divide by 2: x = 4.');
  const mathQ2 = await makeQ(mathSubject.id, gradeLevel.id, 'Which of these is equivalent to $$\\frac{4}{6}$$?', [{ label: 'A', text: '$$\\frac{2}{3}$$', correct: true }, { label: 'B', text: '$$\\frac{3}{4}$$', correct: false }, { label: 'C', text: '$$\\frac{1}{2}$$', correct: false }], 'Divide numerator and denominator by 2: 4÷2 / 6÷2 = 2/3.');
  const mathQ3 = await makeQ(mathSubject.id, gradeLevel.id, 'What is 15% of 200?', [{ label: 'A', text: '30', correct: true }, { label: 'B', text: '25', correct: false }, { label: 'C', text: '40', correct: false }], '15% × 200 = 0.15 × 200 = 30.');
  const csQ1 = await makeQ(csSubject.id, gradeLevel.id, 'Which data structure uses LIFO (Last In First Out)?', [{ label: 'A', text: 'Stack', correct: true }, { label: 'B', text: 'Queue', correct: false }, { label: 'C', text: 'Array', correct: false }], 'A Stack uses LIFO — the last element pushed is the first one popped.');
  const csQ2 = await makeQ(csSubject.id, gradeLevel.id, 'What does HTML stand for?', [{ label: 'A', text: 'HyperText Markup Language', correct: true }, { label: 'B', text: 'High-Level Text Markup Language', correct: false }, { label: 'C', text: 'HyperText Machine Language', correct: false }], 'HTML = HyperText Markup Language, the standard language for web pages.');
  const csQ3 = await makeQ(csSubject.id, gradeLevel.id, 'What is the output of: console.log(typeof null)?', [{ label: 'A', text: '"object"', correct: true }, { label: 'B', text: '"null"', correct: false }, { label: 'C', text: '"undefined"', correct: false }], 'This is a long-standing JavaScript quirk: typeof null returns "object".');

  // Create assessments
  const createAssessment = async (typeId: string, subjectId: string, levelId: string, tId: string, title: string, totalMarks: number, status: string, weekNumber: number | null) => {
    const existing = await prisma.assessment.findFirst({ where: { title } });
    if (existing) {
      const existingSection = await prisma.assessmentSection.findFirstOrThrow({ where: { assessmentId: existing.id } });
      return { assessment: existing, section: existingSection };
    }
    const a = await prisma.assessment.create({
      data: { assessmentTypeId: typeId, subjectId, levelId, termId: tId, title, totalMarks, estimatedDurationMinutes: 30, status, weekNumber, publishedAt: status === 'published' ? new Date() : null },
    });
    const section = await prisma.assessmentSection.create({ data: { assessmentId: a.id, title: 'Section 1', sortOrder: 1 } });
    return { assessment: a, section };
  };

  const { assessment: mathQuiz1, section: mathQ1Section } = await createAssessment(quizType.id, mathSubject.id, gradeLevel.id, term.id, 'Week 1 Math Quiz — Fractions', 30, 'published', 1);
  await prisma.assessmentQuestion.upsert({ where: { assessmentId_questionId: { assessmentId: mathQuiz1.id, questionId: mathQ1.id } }, update: {}, create: { assessmentId: mathQuiz1.id, sectionId: mathQ1Section.id, questionId: mathQ1.id, questionNumber: 1, marksAvailable: 10 } });
  await prisma.assessmentQuestion.upsert({ where: { assessmentId_questionId: { assessmentId: mathQuiz1.id, questionId: mathQ2.id } }, update: {}, create: { assessmentId: mathQuiz1.id, sectionId: mathQ1Section.id, questionId: mathQ2.id, questionNumber: 2, marksAvailable: 10 } });
  await prisma.assessmentQuestion.upsert({ where: { assessmentId_questionId: { assessmentId: mathQuiz1.id, questionId: mathQ3.id } }, update: {}, create: { assessmentId: mathQuiz1.id, sectionId: mathQ1Section.id, questionId: mathQ3.id, questionNumber: 3, marksAvailable: 10 } });

  const { assessment: csQuiz1, section: csQ1Section } = await createAssessment(quizType.id, csSubject.id, gradeLevel.id, term.id, 'Week 2 CS Quiz — Data Structures', 30, 'published', 2);
  await prisma.assessmentQuestion.upsert({ where: { assessmentId_questionId: { assessmentId: csQuiz1.id, questionId: csQ1.id } }, update: {}, create: { assessmentId: csQuiz1.id, sectionId: csQ1Section.id, questionId: csQ1.id, questionNumber: 1, marksAvailable: 10 } });
  await prisma.assessmentQuestion.upsert({ where: { assessmentId_questionId: { assessmentId: csQuiz1.id, questionId: csQ2.id } }, update: {}, create: { assessmentId: csQuiz1.id, sectionId: csQ1Section.id, questionId: csQ2.id, questionNumber: 2, marksAvailable: 10 } });
  await prisma.assessmentQuestion.upsert({ where: { assessmentId_questionId: { assessmentId: csQuiz1.id, questionId: csQ3.id } }, update: {}, create: { assessmentId: csQuiz1.id, sectionId: csQ1Section.id, questionId: csQ3.id, questionNumber: 3, marksAvailable: 10 } });

  const { assessment: mathMidterm } = await createAssessment(midtermType.id, mathSubject.id, gradeLevel.id, term.id, 'Fall Midterm — Mathematics', 100, 'published', 8);
  const { assessment: csMidterm } = await createAssessment(midtermType.id, csSubject.id, gradeLevel.id, term.id, 'Fall Midterm — Computer Science', 100, 'published', 8);
  const { assessment: mathFinal } = await createAssessment(finalType.id, mathSubject.id, gradeLevel.id, term.id, 'Final Exam — Mathematics', 100, 'draft', 16);
  const { assessment: csHw } = await createAssessment(hwType.id, csSubject.id, gradeLevel.id, term.id, 'CS Homework Assessment — Algorithms', 20, 'published', 3);
  console.log('✅ Seeded assessments');

  // ─── Students ─────────────────────────────────────────────────────────────────
  console.log('🌱 Seeding students...');
  const allStudentData = [
    { email: 'charlotte@example.com', firstName: 'Charlotte', lastName: 'Harris', gender: 'FEMALE', birth: '2010-05-15', sectionId: sectionA.id, placement: 'PLACED' },
    { email: 'elijah.m@example.com', firstName: 'Elijah', lastName: 'Miller', gender: 'MALE', birth: '2010-08-22', sectionId: sectionA.id, placement: 'PENDING' },
    { email: 'aria.w@example.com', firstName: 'Aria', lastName: 'Watson', gender: 'FEMALE', birth: '2010-03-10', sectionId: sectionA.id, placement: 'PLACED' },
    { email: 'lucas.b@example.com', firstName: 'Lucas', lastName: 'Brooks', gender: 'MALE', birth: '2010-11-30', sectionId: sectionA.id, placement: 'PLACED' },
    { email: 'noah.j@example.com', firstName: 'Noah', lastName: 'Johnson', gender: 'MALE', birth: '2010-03-22', sectionId: sectionA.id, placement: 'PLACED' },
    { email: 'emma.d@example.com', firstName: 'Emma', lastName: 'Davis', gender: 'FEMALE', birth: '2010-07-14', sectionId: sectionA.id, placement: 'PLACED' },
    { email: 'oliver.w@example.com', firstName: 'Oliver', lastName: 'Wilson', gender: 'MALE', birth: '2010-01-08', sectionId: sectionB.id, placement: 'PLACED' },
    { email: 'sophia.m@example.com', firstName: 'Sophia', lastName: 'Martinez', gender: 'FEMALE', birth: '2010-09-30', sectionId: sectionB.id, placement: 'PLACED' },
    { email: 'william.a@example.com', firstName: 'William', lastName: 'Anderson', gender: 'MALE', birth: '2010-11-17', sectionId: sectionB.id, placement: 'PLACED' },
    { email: 'isabella.t@example.com', firstName: 'Isabella', lastName: 'Thomas', gender: 'FEMALE', birth: '2010-06-25', sectionId: sectionB.id, placement: 'PLACED' },
    { email: 'james.ta@example.com', firstName: 'James', lastName: 'Taylor', gender: 'MALE', birth: '2010-04-12', sectionId: mathSection.id, placement: 'PLACED' },
    { email: 'mia.g@example.com', firstName: 'Mia', lastName: 'Garcia', gender: 'FEMALE', birth: '2010-08-03', sectionId: mathSection.id, placement: 'PLACED' },
  ];

  const studentProfiles: any[] = [];
  for (const s of allStudentData) {
    const user = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { email: s.email, password: hashedPassword, firstName: s.firstName, lastName: s.lastName, isActive: true },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: userRole.id } },
      update: {},
      create: { userId: user.id, roleId: userRole.id },
    });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: { fullName: `${s.firstName} ${s.lastName}`, status: 'ACTIVE' },
      create: { userId: user.id, fullName: `${s.firstName} ${s.lastName}`, birthDate: new Date(s.birth), gender: s.gender as any, status: 'ACTIVE' },
    });
    studentProfiles.push({ ...profile, firstName: s.firstName, lastName: s.lastName, sectionId: s.sectionId });

    await prisma.studentClassPlacement.upsert({
      where: { studentProfileId_classSectionId: { studentProfileId: profile.id, classSectionId: s.sectionId } },
      update: {},
      create: { studentProfileId: profile.id, classSectionId: s.sectionId, academicYearId: academicYear.id, status: s.placement as any, isActive: true },
    });

    // Enroll in course classes
    for (const cc of [dsaClass, algClass, webClass, calcClass, engClass]) {
      await prisma.studentCourseEnrollment.upsert({
        where: { studentProfileId_courseClassId: { studentProfileId: profile.id, courseClassId: cc.id } },
        update: {},
        create: { studentProfileId: profile.id, courseClassId: cc.id, status: 'ENROLLED' },
      });
    }

    // Streak & XP
    await prisma.studentStreak.upsert({
      where: { studentProfileId: profile.id },
      update: {},
      create: { studentProfileId: profile.id, currentStreak: Math.floor(Math.random() * 15) + 1, longestStreak: Math.floor(Math.random() * 30) + 5, lastActiveDate: new Date('2026-06-23'), streakCharges: 1 },
    });
    await prisma.studentExperience.upsert({
      where: { studentProfileId: profile.id },
      update: {},
      create: { studentProfileId: profile.id, totalXp: Math.floor(Math.random() * 800) + 100, level: Math.floor(Math.random() * 5) + 1, nextLevelXp: 500 },
    });

    // CompetencyMastery
    await prisma.competencyMastery.upsert({
      where: { studentProfileId_competencyId: { studentProfileId: profile.id, competencyId: compFractions.id } },
      update: {},
      create: { studentProfileId: profile.id, competencyId: compFractions.id, masteryScore: Math.random() * 0.4 + 0.5, confidence: Math.random() * 0.3 + 0.6 },
    });
    await prisma.competencyMastery.upsert({
      where: { studentProfileId_competencyId: { studentProfileId: profile.id, competencyId: compSorting.id } },
      update: {},
      create: { studentProfileId: profile.id, competencyId: compSorting.id, masteryScore: Math.random() * 0.5 + 0.3, confidence: Math.random() * 0.4 + 0.4 },
    });
  }
  console.log('✅ Seeded students');

  // ─── Attendance ───────────────────────────────────────────────────────────────
  console.log('🌱 Seeding attendance...');
  const sectionAStudents = studentProfiles.filter(p => p.sectionId === sectionA.id);
  const attendanceDates = [
    '2026-06-09','2026-06-10','2026-06-11','2026-06-12','2026-06-13',
    '2026-06-16','2026-06-17','2026-06-18','2026-06-19','2026-06-20',
    '2026-06-23',
  ];
  const absentOverrides: Record<string, string[]> = {
    'Charlotte Harris': ['2026-06-12'],
    'Elijah Miller': ['2026-06-16', '2026-06-17'],
    'Noah Johnson': ['2026-06-10'],
  };
  const lateOverrides: Record<string, string[]> = {
    'Aria Watson': ['2026-06-11'],
    'Emma Davis': ['2026-06-19'],
  };

  for (const profile of sectionAStudents) {
    const name = `${profile.firstName} ${profile.lastName}`;
    for (const dateStr of attendanceDates) {
      const date = new Date(dateStr);
      let status: string = 'PRESENT';
      let remarks: string = 'On time';
      if (absentOverrides[name]?.includes(dateStr)) { status = 'ABSENT'; remarks = 'Absent'; }
      else if (lateOverrides[name]?.includes(dateStr)) { status = 'LATE'; remarks = 'Arrived late'; }
      await prisma.dailyAttendance.upsert({
        where: { studentProfileId_classSectionId_date: { studentProfileId: profile.id, classSectionId: sectionA.id, date } },
        update: { status: status as any, remarks },
        create: { studentProfileId: profile.id, classSectionId: sectionA.id, date, status: status as any, remarks, recordedById: superAdminUser.id },
      });
    }
  }
  console.log('✅ Seeded attendance');

  // ─── Timetable ────────────────────────────────────────────────────────────────
  console.log('🌱 Seeding timetable...');
  let timetable = await prisma.timetable.findFirst({ where: { name: 'Fall 2026 — CS Section A', classSectionId: sectionA.id } });
  if (!timetable) {
    timetable = await prisma.timetable.create({
      data: {
        academicYearId: academicYear.id,
        termId: term.id,
        classSectionId: sectionA.id,
        name: 'Fall 2026 — CS Section A',
        status: 'PUBLISHED',
        effectiveFrom: new Date('2026-09-10'),
        effectiveTo: new Date('2026-12-20'),
        publishedAt: new Date(),
        createdById: superAdminUser.id,
      },
    });
  }

  // Weekly timetable: Mon-Fri, 5 periods each day
  // startTimeMinutes: 480 = 8:00am, 540 = 9:00am, 600 = 10:00am, 660 = 11:00am, 750 = 12:30pm, 810 = 13:30pm
  const slotDefinitions = [
    // MONDAY
    { day: 'MONDAY', period: 1, start: 480, end: 540, room: 'Lab 1', courseClassId: dsaClass.id, teacherCode: 'EMP-TURING' },
    { day: 'MONDAY', period: 2, start: 540, end: 620, room: 'Room 101', courseClassId: algClass.id, teacherCode: 'EMP-HOPPER' },
    { day: 'MONDAY', period: 3, start: 640, end: 720, room: 'Lab 2', courseClassId: webClass.id, teacherCode: 'EMP-TURING' },
    { day: 'MONDAY', period: 4, start: 750, end: 830, room: 'Room 201', courseClassId: calcClass.id, teacherCode: 'EMP-EULER' },
    // TUESDAY
    { day: 'TUESDAY', period: 1, start: 480, end: 540, room: 'Room 103', courseClassId: engClass.id, teacherCode: 'EMP-HOPPER' },
    { day: 'TUESDAY', period: 2, start: 540, end: 620, room: 'Lab 1', courseClassId: dsaClass.id, teacherCode: 'EMP-TURING' },
    { day: 'TUESDAY', period: 3, start: 640, end: 720, room: 'Room 101', courseClassId: algClass.id, teacherCode: 'EMP-HOPPER' },
    { day: 'TUESDAY', period: 4, start: 750, end: 830, room: 'Lab 2', courseClassId: webClass.id, teacherCode: 'EMP-TURING' },
    // WEDNESDAY
    { day: 'WEDNESDAY', period: 1, start: 480, end: 540, room: 'Room 201', courseClassId: calcClass.id, teacherCode: 'EMP-EULER' },
    { day: 'WEDNESDAY', period: 2, start: 540, end: 620, room: 'Room 103', courseClassId: engClass.id, teacherCode: 'EMP-LOVELACE' },
    { day: 'WEDNESDAY', period: 3, start: 640, end: 720, room: 'Lab 1', courseClassId: dsaClass.id, teacherCode: 'EMP-TURING' },
    { day: 'WEDNESDAY', period: 4, start: 750, end: 830, room: 'Room 101', courseClassId: algClass.id, teacherCode: 'EMP-HOPPER' },
    // THURSDAY
    { day: 'THURSDAY', period: 1, start: 480, end: 540, room: 'Lab 2', courseClassId: webClass.id, teacherCode: 'EMP-TURING' },
    { day: 'THURSDAY', period: 2, start: 540, end: 620, room: 'Room 201', courseClassId: calcClass.id, teacherCode: 'EMP-EULER' },
    { day: 'THURSDAY', period: 3, start: 640, end: 720, room: 'Room 103', courseClassId: engClass.id, teacherCode: 'EMP-LOVELACE' },
    { day: 'THURSDAY', period: 4, start: 750, end: 830, room: 'Lab 1', courseClassId: dsaClass.id, teacherCode: 'EMP-TURING' },
    // FRIDAY
    { day: 'FRIDAY', period: 1, start: 480, end: 540, room: 'Room 101', courseClassId: algClass.id, teacherCode: 'EMP-HOPPER' },
    { day: 'FRIDAY', period: 2, start: 540, end: 620, room: 'Lab 2', courseClassId: webClass.id, teacherCode: 'EMP-TURING' },
    { day: 'FRIDAY', period: 3, start: 640, end: 720, room: 'Room 201', courseClassId: calcClass.id, teacherCode: 'EMP-EULER' },
    { day: 'FRIDAY', period: 4, start: 750, end: 830, room: 'Room 103', courseClassId: engClass.id, teacherCode: 'EMP-LOVELACE' },
  ] as const;

  for (const s of slotDefinitions) {
    const existing = await prisma.timetableSlot.findFirst({ where: { timetableId: timetable.id, dayOfWeek: s.day, periodIndex: s.period } });
    if (!existing) {
      await prisma.timetableSlot.create({
        data: {
          timetableId: timetable.id,
          dayOfWeek: s.day,
          periodIndex: s.period,
          startTimeMinutes: s.start,
          endTimeMinutes: s.end,
          room: s.room,
          classSectionId: sectionA.id,
          courseClassId: s.courseClassId,
          teacherProfileId: teacherProfiles[s.teacherCode].id,
          status: 'ACTIVE',
        },
      });
    }
  }
  console.log('✅ Seeded timetable');

  // ─── Homework ─────────────────────────────────────────────────────────────────
  console.log('🌱 Seeding homework...');
  const turingUser = teacherUsers['EMP-TURING'];

  const hw1 = await prisma.homework.upsert({
    where: { id: (await prisma.homework.findFirst({ where: { title: 'DSA Problem Set 1', courseClassId: dsaClass.id } }))?.id ?? 'nonexistent-id' },
    update: {},
    create: { courseClassId: dsaClass.id, title: 'DSA Problem Set 1', description: 'Implement a linked list with insert, delete, and search operations.', dueDate: new Date('2026-09-25'), maxPoints: 100, recordedById: turingUser.id },
  }).catch(async () => {
    const existing = await prisma.homework.findFirst({ where: { title: 'DSA Problem Set 1', courseClassId: dsaClass.id } });
    if (existing) return existing;
    return prisma.homework.create({ data: { courseClassId: dsaClass.id, title: 'DSA Problem Set 1', description: 'Implement a linked list with insert, delete, and search operations.', dueDate: new Date('2026-09-25'), maxPoints: 100, recordedById: turingUser.id } });
  });

  const hw2 = await (async () => {
    const existing = await prisma.homework.findFirst({ where: { title: 'Web Dev Project 1', courseClassId: webClass.id } });
    if (existing) return existing;
    return prisma.homework.create({ data: { courseClassId: webClass.id, title: 'Web Dev Project 1', description: 'Build a responsive landing page using HTML and CSS.', dueDate: new Date('2026-09-30'), maxPoints: 100, recordedById: turingUser.id } });
  })();

  const hw3 = await (async () => {
    const existing = await prisma.homework.findFirst({ where: { title: 'Calculus Assignment 1', courseClassId: calcClass.id } });
    if (existing) return existing;
    return prisma.homework.create({ data: { courseClassId: calcClass.id, title: 'Calculus Assignment 1', description: 'Solve limits and derivatives from Chapter 2.', dueDate: new Date('2026-09-22'), maxPoints: 50, recordedById: superAdminUser.id } });
  })();

  // Homework submissions
  const sectionAPlacedStudents = sectionAStudents.filter(p => p.firstName !== 'Elijah');
  const submissionScores: Record<string, number[]> = {
    'Charlotte': [88, 92, 45],
    'Aria': [95, 78, 48],
    'Lucas': [72, 85, 38],
    'Noah': [90, 88, 47],
    'Emma': [85, 91, 42],
  };

  for (const profile of sectionAPlacedStudents) {
    const scores = submissionScores[profile.firstName] ?? [75, 80, 40];
    for (const [hwObj, score] of [[hw1, scores[0]], [hw2, scores[1]], [hw3, scores[2]]] as [any, number][]) {
      const existing = await prisma.homeworkSubmission.findFirst({ where: { homeworkId: hwObj.id, studentProfileId: profile.id } });
      if (!existing) {
        await prisma.homeworkSubmission.create({
          data: { homeworkId: hwObj.id, studentProfileId: profile.id, status: 'GRADED', content: `Submission by ${profile.firstName}`, pointsEarned: score, feedback: score >= 85 ? 'Excellent work!' : score >= 70 ? 'Good effort.' : 'Needs improvement.', gradedById: turingUser.id, gradedAt: new Date() },
        });
      }
    }
  }
  console.log('✅ Seeded homework');

  // ─── Assessment Assignments & Attempts ───────────────────────────────────────
  console.log('🌱 Seeding assessment assignments & attempts...');
  const opensAt = new Date('2026-09-15');
  const dueAt = new Date('2026-09-16');

  const attemptScores: Record<string, Record<string, number>> = {
    'Charlotte': { mathQuiz1: 27, csQuiz1: 24, mathMidterm: 85, csMidterm: 91 },
    'Aria': { mathQuiz1: 30, csQuiz1: 28, mathMidterm: 92, csMidterm: 88 },
    'Lucas': { mathQuiz1: 21, csQuiz1: 20, mathMidterm: 72, csMidterm: 74 },
    'Noah': { mathQuiz1: 26, csQuiz1: 25, mathMidterm: 80, csMidterm: 83 },
    'Emma': { mathQuiz1: 28, csQuiz1: 26, mathMidterm: 88, csMidterm: 86 },
  };

  const assessmentMap: Record<string, { id: string; totalMarks: number }> = {
    mathQuiz1: { id: mathQuiz1.id, totalMarks: 30 },
    csQuiz1: { id: csQuiz1.id, totalMarks: 30 },
    mathMidterm: { id: mathMidterm.id, totalMarks: 100 },
    csMidterm: { id: csMidterm.id, totalMarks: 100 },
  };

  for (const profile of sectionAPlacedStudents) {
    const scores = attemptScores[profile.firstName] ?? { mathQuiz1: 20, csQuiz1: 18, mathMidterm: 70, csMidterm: 70 };
    for (const [key, { id: assessmentId, totalMarks }] of Object.entries(assessmentMap)) {
      const existingAssignment = await prisma.assessmentAssignment.findFirst({ where: { assessmentId, studentProfileId: profile.id } });
      let assignment = existingAssignment;
      if (!assignment) {
        assignment = await prisma.assessmentAssignment.create({
          data: { assessmentId, studentProfileId: profile.id, classSectionId: sectionA.id, assignedByUserId: superAdminUser.id, opensAt, dueAt, status: 'assigned' },
        });
      }
      const existingAttempt = await prisma.assessmentAttempt.findFirst({ where: { assessmentAssignmentId: assignment.id, studentProfileId: profile.id } });
      if (!existingAttempt) {
        const rawScore = (scores as any)[key] ?? 20;
        await prisma.assessmentAttempt.create({
          data: { assessmentAssignmentId: assignment.id, studentProfileId: profile.id, attemptNumber: 1, startedAt: new Date('2026-09-15T09:00:00'), submittedAt: new Date('2026-09-15T09:28:00'), timeSpentSeconds: 1680, rawScore, maxScore: totalMarks, percentageScore: Math.round((rawScore / totalMarks) * 100), resultStatus: 'marked', isLatest: true, isBest: true, markedByUserId: superAdminUser.id, teacherComment: rawScore / totalMarks >= 0.85 ? 'Excellent!' : 'Keep it up.' },
        });
      }
    }
  }
  console.log('✅ Seeded assessment assignments & attempts');

  // ─── GradeBook Entries ────────────────────────────────────────────────────────
  console.log('🌱 Seeding gradebook...');
  const gradeData: { name: string; mathQ: number; csQ: number; mathM: number; csM: number; hw: number }[] = [
    { name: 'Charlotte', mathQ: 90, csQ: 80, mathM: 85, csM: 91, hw: 88 },
    { name: 'Aria', mathQ: 100, csQ: 93, mathM: 92, csM: 88, hw: 95 },
    { name: 'Lucas', mathQ: 70, csQ: 67, mathM: 72, csM: 74, hw: 72 },
    { name: 'Noah', mathQ: 87, csQ: 83, mathM: 80, csM: 83, hw: 90 },
    { name: 'Emma', mathQ: 93, csQ: 87, mathM: 88, csM: 86, hw: 85 },
  ];

  for (const profile of sectionAPlacedStudents) {
    const g = gradeData.find(d => d.name === profile.firstName) ?? { mathQ: 75, csQ: 70, mathM: 75, csM: 70, hw: 75 };
    const entries = [
      { title: 'Week 1 Math Quiz', category: 'QUIZ', points: g.mathQ, possible: 100, srcType: 'ASSESSMENT_ATTEMPT' as const, srcId: `mq1-${profile.id}` },
      { title: 'Week 2 CS Quiz', category: 'QUIZ', points: g.csQ, possible: 100, srcType: 'ASSESSMENT_ATTEMPT' as const, srcId: `csq1-${profile.id}` },
      { title: 'Fall Midterm — Math', category: 'MIDTERM', points: g.mathM, possible: 100, srcType: 'ASSESSMENT_ATTEMPT' as const, srcId: `mm-${profile.id}` },
      { title: 'Fall Midterm — CS', category: 'MIDTERM', points: g.csM, possible: 100, srcType: 'ASSESSMENT_ATTEMPT' as const, srcId: `csm-${profile.id}` },
      { title: 'DSA Problem Set 1', category: 'HOMEWORK', points: g.hw, possible: 100, srcType: 'HOMEWORK_SUBMISSION' as const, srcId: `hw1-${profile.id}` },
    ];
    for (const e of entries) {
      const existing = await prisma.gradeBookEntry.findFirst({ where: { studentProfileId: profile.id, sourceType: e.srcType, sourceId: e.srcId } });
      if (!existing) {
        await prisma.gradeBookEntry.create({
          data: { studentProfileId: profile.id, classSectionId: sectionA.id, courseClassId: dsaClass.id, termId: term.id, sourceType: e.srcType, sourceId: e.srcId, title: e.title, category: e.category, pointsEarned: e.points, pointsPossible: e.possible, percentage: e.points, weight: 1.0, status: 'PUBLISHED', assessedAt: new Date('2026-09-16'), publishedAt: new Date(), createdById: superAdminUser.id },
        });
      }
    }
  }
  console.log('✅ Seeded gradebook');

  // ─── Lesson Attempts (Gamification) ──────────────────────────────────────────
  console.log('🌱 Seeding lesson attempts...');
  const allLessons = [lesson1!, lesson2!, lesson3!, lesson4!];
  for (const profile of studentProfiles.slice(0, 8)) {
    for (const lesson of allLessons) {
      const existing = await prisma.lessonAttempt.findFirst({ where: { lessonId: lesson.id, studentProfileId: profile.id } });
      if (!existing) {
        await prisma.lessonAttempt.create({ data: { lessonId: lesson.id, studentProfileId: profile.id, status: 'COMPLETED', xpEarned: lesson.xpReward, startedAt: new Date('2026-09-10'), completedAt: new Date('2026-09-10'), timeSpentSeconds: 420 } });
      }
    }
  }
  console.log('✅ Seeded lesson attempts');

  // ─── Guardians & Families ─────────────────────────────────────────────────────
  console.log('🌱 Seeding guardians & families...');
  const guardian1User = await prisma.user.upsert({
    where: { email: 'guardian.harris@example.com' },
    update: {},
    create: { email: 'guardian.harris@example.com', password: hashedPassword, firstName: 'Robert', lastName: 'Harris', isActive: true },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: guardian1User.id, roleId: guardianRole.id } }, update: {}, create: { userId: guardian1User.id, roleId: guardianRole.id } });
  const guardian1Profile = await prisma.guardianProfile.upsert({
    where: { userId: guardian1User.id },
    update: {},
    create: { userId: guardian1User.id, fullName: 'Robert Harris', email: 'guardian.harris@example.com', phone: '(555) 200-0001', status: 'ACTIVE' },
  });

  const charlotteProfile = studentProfiles.find(p => p.firstName === 'Charlotte');
  if (charlotteProfile) {
    const existingRel = await prisma.guardianStudentRelationship.findFirst({ where: { guardianProfileId: guardian1Profile.id, studentProfileId: charlotteProfile.id } });
    if (!existingRel) {
      await prisma.guardianStudentRelationship.create({ data: { guardianProfileId: guardian1Profile.id, studentProfileId: charlotteProfile.id, relationshipType: 'FATHER', isPrimary: true, hasFinancialResponsibility: true, hasAcademicAccess: true, hasEmergencyContact: true } });
    }

    const existingFamily = await prisma.family.findFirst({ where: { householdName: 'Harris Family' } });
    const family = existingFamily ?? await prisma.family.create({ data: { householdName: 'Harris Family', status: 'ACTIVE' } });

    const existingFS = await prisma.familyStudent.findFirst({ where: { familyId: family.id, studentProfileId: charlotteProfile.id } });
    if (!existingFS) await prisma.familyStudent.create({ data: { familyId: family.id, studentProfileId: charlotteProfile.id } });

    const existingFG = await prisma.familyGuardian.findFirst({ where: { familyId: family.id, guardianProfileId: guardian1Profile.id } });
    if (!existingFG) await prisma.familyGuardian.create({ data: { familyId: family.id, guardianProfileId: guardian1Profile.id } });

    const existingInv = await prisma.familyInvoice.findFirst({ where: { familyId: family.id } });
    if (!existingInv) {
      await prisma.familyInvoice.create({ data: { familyId: family.id, amount: 1500, currency: 'USD', description: 'Fall Semester 2026 Tuition', issueDate: new Date('2026-08-01'), dueDate: new Date('2026-09-01'), status: 'PAID' } });
    }
  }
  console.log('✅ Seeded guardians & families');

  // ─── Leads ────────────────────────────────────────────────────────────────────
  console.log('🌱 Seeding leads...');
  await prisma.lead.deleteMany();
  await prisma.lead.createMany({
    data: [
      { name: 'Charlotte Harris', email: 'charlotte@example.com', phone: '(555) 019-8832', status: 'Enrolled', source: 'Website Form', notes: 'Enrolled in Grade 10 CS.' },
      { name: 'Elijah Miller', email: 'elijah.m@example.com', phone: '(555) 012-3841', status: 'Diagnostic Scheduled', source: 'Referral', notes: 'Needs diagnostic assessment for math level alignment.' },
      { name: 'Aria Watson', email: 'aria.w@example.com', phone: '(555) 019-3392', status: 'Enrolled', source: 'Facebook Ad', notes: 'Completed evaluation and enrolled.' },
      { name: 'Lucas Brooks', email: 'lucas.b@example.com', phone: '(555) 015-2831', status: 'Enrolled', source: 'Walk-in', notes: 'Fully enrolled in BSC-CS program.' },
      { name: 'Noah Johnson', email: 'noah.j@example.com', phone: '(555) 030-1122', status: 'Enrolled', source: 'Website Form', notes: 'Enrolled via online portal.' },
      { name: 'Emma Davis', email: 'emma.d@example.com', phone: '(555) 030-3344', status: 'Pending Enrolment', source: 'Referral', notes: 'Awaiting final enrollment confirmation.' },
      { name: 'Oliver Wilson', email: 'oliver.w@example.com', phone: '(555) 030-5566', status: 'Enrolled', source: 'School Fair', notes: 'Enrolled in CS Section B.' },
      { name: 'Sophia Martinez', email: 'sophia.m@example.com', phone: '(555) 030-7788', status: 'Enrolled', source: 'Website Form', notes: 'Enrolled after passing diagnostic.' },
      { name: 'Aiden Clark', email: 'aiden.c@example.com', phone: '(555) 040-1234', status: 'New', source: 'Website Form', notes: 'Just submitted inquiry form.' },
      { name: 'Olivia Brown', email: 'olivia.b@example.com', phone: '(555) 040-5678', status: 'Diagnostic Scheduled', source: 'Social Media', notes: 'Diagnostic scheduled for June 25.' },
    ],
  });
  console.log('✅ Seeded leads');

  // ─── Broadcasts ───────────────────────────────────────────────────────────────
  console.log('🌱 Seeding broadcasts...');
  await prisma.broadcast.deleteMany();
  await prisma.broadcast.createMany({
    data: [
      { type: 'Announcement', title: 'Fall Semester 2026 Registration Open', content: 'Registration is now open for all programs in the Fall 2026 term. Deadline: August 30.', sender: 'System', status: 'SENT', recipientCount: 120 },
      { type: 'SMS Alert', title: 'Attendance Reminder Sent to Parent (Watson)', content: 'Watson was late for morning roll call on June 11.', sender: 'Main Campus Branch', status: 'SENT', recipientCount: 1 },
      { type: 'Email Broadcast', title: 'Tuition Invoices Generated', content: 'Term invoices for Fall Semester 2026 have been issued. Please check the billing portal.', sender: 'Billing System', status: 'SENT', recipientCount: 95 },
      { type: 'Announcement', title: 'Mid-Semester Progress Reports Available', content: 'Progress reports for the first half of Fall 2026 are now available in the parent portal.', sender: 'Academic Office', status: 'SENT', recipientCount: 200 },
      { type: 'SMS Alert', title: 'School Closure — Weather Advisory', content: 'Classes are suspended tomorrow due to a weather advisory. Online sessions will be held.', sender: 'Main Campus', status: 'SENT', recipientCount: 350 },
    ],
  });
  console.log('✅ Seeded broadcasts');

  // ─── Makeup Requests ──────────────────────────────────────────────────────────
  console.log('🌱 Seeding makeup requests...');
  await prisma.makeupRequest.deleteMany();
  const charlotteP = studentProfiles.find(p => p.firstName === 'Charlotte');
  const elijahP = studentProfiles.find(p => p.firstName === 'Elijah');
  const noahP = studentProfiles.find(p => p.firstName === 'Noah');

  if (charlotteP) await prisma.makeupRequest.create({ data: { studentProfileId: charlotteP.id, courseClassId: dsaClass.id, originalDate: new Date('2026-06-12'), reason: 'Medical Leave', status: 'Awaiting Action' } });
  if (elijahP) await prisma.makeupRequest.create({ data: { studentProfileId: elijahP.id, courseClassId: dsaClass.id, originalDate: new Date('2026-06-16'), reason: 'Family Event', status: 'Scheduled', scheduledDate: new Date('2026-06-25') } });
  if (elijahP) await prisma.makeupRequest.create({ data: { studentProfileId: elijahP.id, courseClassId: algClass.id, originalDate: new Date('2026-06-17'), reason: 'Family Event', status: 'Awaiting Action' } });
  if (noahP) await prisma.makeupRequest.create({ data: { studentProfileId: noahP.id, courseClassId: webClass.id, originalDate: new Date('2026-06-10'), reason: 'Doctor appointment', status: 'Declined' } });
  console.log('✅ Seeded makeup requests');

  // ─── Notifications ────────────────────────────────────────────────────────────
  console.log('🌱 Seeding notifications...');
  await prisma.notification.deleteMany();
  await prisma.notification.createMany({
    data: [
      { userId: superAdminUser.id, type: 'INFO', title: 'Welcome to Eudora', body: 'Welcome to your new educational management dashboard. Explore your administrative options!', readAt: null },
      { userId: superAdminUser.id, type: 'WARNING', title: 'High Makeup Request Volume', body: 'There are 3 pending makeup requests that require your attention.', readAt: null },
      { userId: superAdminUser.id, type: 'SYSTEM', title: 'Backup Successful', body: 'System database backup completed successfully.', readAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { userId: superAdminUser.id, type: 'INFO', title: 'New Student Enrollment', body: 'Emma Davis has completed enrollment and has been placed in CS Section A.', readAt: null },
      { userId: superAdminUser.id, type: 'INFO', title: 'Timetable Published', body: 'The Fall 2026 timetable for CS Section A has been published successfully.', readAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { userId: superAdminUser.id, type: 'WARNING', title: 'Assessment Due Soon', body: 'The Fall Midterm — Mathematics closes in 24 hours. 2 students have not yet submitted.', readAt: null },
    ],
  });
  console.log('✅ Seeded notifications');

  // ─── Course Class Sessions & Session Attendance ─────────────────────────────
  console.log('🌱 Seeding course class sessions...');
  const sessionDefs = [
    { courseClassId: dsaClass.id, date: '2026-09-15', topic: 'Introduction to Linked Lists', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-09-18', topic: 'Stacks and Queues', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-09-22', topic: 'Binary Trees', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-09-25', topic: 'Tree Traversal Algorithms', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-09-29', topic: 'Hash Tables', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-10-02', topic: 'Graph Representation', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-10-06', topic: 'BFS and DFS', start: '08:00', end: '09:00' },
    { courseClassId: dsaClass.id, date: '2026-10-09', topic: 'Dynamic Programming Introduction', start: '08:00', end: '09:00' },
    { courseClassId: algClass.id, date: '2026-09-15', topic: 'Big-O Notation', start: '09:10', end: '10:20' },
    { courseClassId: algClass.id, date: '2026-09-18', topic: 'Divide and Conquer', start: '09:10', end: '10:20' },
    { courseClassId: algClass.id, date: '2026-09-22', topic: 'Sorting Algorithms', start: '09:10', end: '10:20' },
    { courseClassId: algClass.id, date: '2026-09-25', topic: 'Merge Sort & Quick Sort', start: '09:10', end: '10:20' },
    { courseClassId: webClass.id, date: '2026-09-15', topic: 'HTML Structure & Semantics', start: '10:40', end: '12:00' },
    { courseClassId: webClass.id, date: '2026-09-18', topic: 'CSS Selectors & Box Model', start: '10:40', end: '12:00' },
    { courseClassId: webClass.id, date: '2026-09-22', topic: 'Responsive Design', start: '10:40', end: '12:00' },
    { courseClassId: calcClass.id, date: '2026-09-15', topic: 'Limits and Continuity', start: '12:30', end: '13:50' },
    { courseClassId: calcClass.id, date: '2026-09-18', topic: 'Introduction to Derivatives', start: '12:30', end: '13:50' },
    { courseClassId: calcClass.id, date: '2026-09-22', topic: 'Chain Rule', start: '12:30', end: '13:50' },
    { courseClassId: engClass.id, date: '2026-09-15', topic: 'Paragraph Structure', start: '14:00', end: '15:00' },
    { courseClassId: engClass.id, date: '2026-09-18', topic: 'Thesis Statements', start: '14:00', end: '15:00' },
    { courseClassId: engClass.id, date: '2026-09-22', topic: 'Evidence & Citations', start: '14:00', end: '15:00' },
  ];

  const sessions: any[] = [];
  for (const sd of sessionDefs) {
    const d = new Date(sd.date);
    const existing = await prisma.courseClassSession.findFirst({ where: { courseClassId: sd.courseClassId, date: d } });
    const session = existing ?? await prisma.courseClassSession.create({
      data: {
        courseClassId: sd.courseClassId,
        date: d,
        startTime: new Date(`${sd.date}T${sd.start}:00.000Z`),
        endTime: new Date(`${sd.date}T${sd.end}:00.000Z`),
        topic: sd.topic,
      },
    });
    sessions.push(session);
  }

  // Session attendance — all sectionA students, Elijah absent early
  const sectionAAll = studentProfiles.filter(p => p.sectionId === sectionA.id);
  const sessionAbsences: Record<string, string[]> = {
    'Elijah': ['2026-09-15', '2026-09-18'],
    'Charlotte': ['2026-09-29'],
  };
  const sessionLate: Record<string, string[]> = {
    'Aria': ['2026-09-22'],
    'Noah': ['2026-10-02'],
  };
  for (const session of sessions) {
    if (session.courseClassId !== dsaClass.id) continue; // only seed DSA session attendance
    const dateStr = (session.date instanceof Date ? session.date : new Date(session.date)).toISOString().slice(0, 10);
    for (const profile of sectionAAll) {
      const isAbsent = sessionAbsences[profile.firstName]?.includes(dateStr);
      const isLate = !isAbsent && sessionLate[profile.firstName]?.includes(dateStr);
      const existing = await prisma.courseClassAttendance.findFirst({ where: { studentProfileId: profile.id, sessionId: session.id } });
      if (!existing) {
        await prisma.courseClassAttendance.create({
          data: {
            studentProfileId: profile.id,
            sessionId: session.id,
            status: isAbsent ? 'ABSENT' : isLate ? 'LATE' : 'PRESENT',
            remarks: isAbsent ? 'Absent — excused' : isLate ? 'Arrived late' : 'Present',
            recordedById: superAdminUser.id,
          },
        });
      }
    }
  }
  console.log('✅ Seeded course class sessions');

  // ─── Student Responses ───────────────────────────────────────────────────────
  console.log('🌱 Seeding student responses...');
  const mathQ1Opts = await prisma.questionOption.findMany({ where: { questionId: mathQ1.id } });
  const mathQ2Opts = await prisma.questionOption.findMany({ where: { questionId: mathQ2.id } });
  const mathQ3Opts = await prisma.questionOption.findMany({ where: { questionId: mathQ3.id } });
  const csQ1Opts = await prisma.questionOption.findMany({ where: { questionId: csQ1.id } });
  const csQ2Opts = await prisma.questionOption.findMany({ where: { questionId: csQ2.id } });
  const csQ3Opts = await prisma.questionOption.findMany({ where: { questionId: csQ3.id } });

  const cOpt = (opts: any[]) => opts.find((o: any) => o.isCorrect);
  const wOpt = (opts: any[]) => opts.find((o: any) => !o.isCorrect);

  // [mathQ1, mathQ2, mathQ3, csQ1, csQ2, csQ3] — true = correct answer
  const responsePattern: Record<string, boolean[]> = {
    Charlotte: [true,  true,  false, true,  true,  false],
    Aria:      [true,  true,  true,  true,  true,  true],
    Lucas:     [true,  false, false, true,  false, false],
    Noah:      [true,  true,  false, true,  true,  false],
    Emma:      [true,  true,  false, true,  true,  true],
  };

  for (const profile of sectionAPlacedStudents) {
    const pat = responsePattern[profile.firstName] ?? [true, false, false, true, false, false];

    const mathAttempt = await prisma.assessmentAttempt.findFirst({
      where: { studentProfileId: profile.id, assignment: { assessmentId: mathQuiz1.id } },
    });
    if (mathAttempt) {
      for (const [i, { q, opts }] of [[0, { q: mathQ1, opts: mathQ1Opts }], [1, { q: mathQ2, opts: mathQ2Opts }], [2, { q: mathQ3, opts: mathQ3Opts }]] as [number, {q:any;opts:any[]}][]) {
        const isCorrect = pat[i];
        const selOpt = isCorrect ? cOpt(opts) : wOpt(opts);
        const exists = await prisma.studentResponse.findFirst({ where: { assessmentAttemptId: mathAttempt.id, questionId: q.id } });
        if (!exists && selOpt) {
          await prisma.studentResponse.create({ data: { assessmentAttemptId: mathAttempt.id, questionId: q.id, selectedOptionId: selOpt.id, isCorrect, marksAwarded: isCorrect ? 10 : 0, marksAvailable: 10, timeSpentSeconds: 65 } });
        }
      }
    }

    const csAttempt = await prisma.assessmentAttempt.findFirst({
      where: { studentProfileId: profile.id, assignment: { assessmentId: csQuiz1.id } },
    });
    if (csAttempt) {
      for (const [i, { q, opts }] of [[3, { q: csQ1, opts: csQ1Opts }], [4, { q: csQ2, opts: csQ2Opts }], [5, { q: csQ3, opts: csQ3Opts }]] as [number, {q:any;opts:any[]}][]) {
        const isCorrect = pat[i];
        const selOpt = isCorrect ? cOpt(opts) : wOpt(opts);
        const exists = await prisma.studentResponse.findFirst({ where: { assessmentAttemptId: csAttempt.id, questionId: q.id } });
        if (!exists && selOpt) {
          await prisma.studentResponse.create({ data: { assessmentAttemptId: csAttempt.id, questionId: q.id, selectedOptionId: selOpt.id, isCorrect, marksAwarded: isCorrect ? 10 : 0, marksAvailable: 10, timeSpentSeconds: 58 } });
        }
      }
    }
  }
  console.log('✅ Seeded student responses');

  // ─── Student Card Responses ──────────────────────────────────────────────────
  console.log('🌱 Seeding student card responses...');
  const allLessonsForCards = [lesson1!, lesson2!, lesson3!, lesson4!];
  for (const profile of studentProfiles.slice(0, 10)) {
    for (const lesson of allLessonsForCards) {
      const attempt = await prisma.lessonAttempt.findFirst({ where: { lessonId: lesson.id, studentProfileId: profile.id } });
      if (!attempt) continue;
      const cards = await prisma.card.findMany({ where: { lessonId: lesson.id }, orderBy: { sortOrder: 'asc' } });
      for (const card of cards) {
        const existing = await prisma.studentCardResponse.findFirst({ where: { lessonAttemptId: attempt.id, cardId: card.id } });
        if (!existing) {
          const isConceptual = card.cardType === 'CONCEPTUAL';
          await prisma.studentCardResponse.create({
            data: {
              lessonAttemptId: attempt.id,
              cardId: card.id,
              attemptsCount: isConceptual ? 1 : (profile.firstName === 'Lucas' ? 2 : 1),
              hintsViewedCount: isConceptual ? 0 : (profile.firstName === 'Elijah' ? 1 : 0),
              isCorrect: isConceptual ? true : responsePattern[profile.firstName]?.[0] ?? true,
              interactionTrace: isConceptual ? undefined : { events: ['view', 'select'], durationMs: 12400 },
            },
          });
        }
      }
    }
  }
  console.log('✅ Seeded student card responses');

  // ─── Assessment Evidence & Rubric Assessments ────────────────────────────────
  console.log('🌱 Seeding assessment evidence & rubric assessments...');
  const rubricCriteria = await prisma.rubricCriterion.findMany({ where: { rubricId: rubric.id } });

  const evidenceStudents = sectionAPlacedStudents.slice(0, 4);
  const rubricScores: Record<string, number> = { Charlotte: 3, Aria: 4, Lucas: 2, Noah: 3, Emma: 3 };

  for (const profile of evidenceStudents) {
    const submission = await prisma.homeworkSubmission.findFirst({ where: { homeworkId: hw1.id, studentProfileId: profile.id } });
    if (!submission) continue;
    const existing = await prisma.assessmentEvidence.findFirst({ where: { studentProfileId: profile.id, competencyId: compFractions.id } });
    if (!existing) {
      const evidence = await prisma.assessmentEvidence.create({
        data: {
          studentProfileId: profile.id,
          competencyId: compFractions.id,
          homeworkSubmissionId: submission.id,
          sourceType: 'HOMEWORK',
          metadata: { submissionId: submission.id, homeworkTitle: 'DSA Problem Set 1' },
        },
      });
      const score = rubricScores[profile.firstName] ?? 3;
      const ra = await prisma.rubricAssessment.create({
        data: {
          rubricId: rubric.id,
          evidenceId: evidence.id,
          evaluatorId: superAdminUser.id,
          overallScore: score + 0.5,
          feedback: score >= 4 ? 'Excellent demonstration of fraction mastery.' : score >= 3 ? 'Proficient. Minor gaps in reasoning.' : 'Developing — needs more practice with unlike denominators.',
        },
      });
      for (const criterion of rubricCriteria) {
        const exist = await prisma.rubricCriterionRating.findFirst({ where: { assessmentId: ra.id, criterionId: criterion.id } });
        if (!exist) {
          await prisma.rubricCriterionRating.create({
            data: { assessmentId: ra.id, criterionId: criterion.id, selectedLevel: score, comments: `Level ${score} — ${criterion.title}` },
          });
        }
      }
    }
  }
  console.log('✅ Seeded assessment evidence');

  // ─── More Guardians ──────────────────────────────────────────────────────────
  console.log('🌱 Seeding additional guardians...');
  const ariaProfile = studentProfiles.find(p => p.firstName === 'Aria');
  const noahProfile = studentProfiles.find(p => p.firstName === 'Noah');
  const lucasProfile = studentProfiles.find(p => p.firstName === 'Lucas');

  const guardian2User = await prisma.user.upsert({
    where: { email: 'guardian.watson@example.com' },
    update: {},
    create: { email: 'guardian.watson@example.com', password: hashedPassword, firstName: 'Helen', lastName: 'Watson', isActive: true },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: guardian2User.id, roleId: guardianRole.id } }, update: {}, create: { userId: guardian2User.id, roleId: guardianRole.id } });
  const guardian2Profile = await prisma.guardianProfile.upsert({
    where: { userId: guardian2User.id },
    update: {},
    create: { userId: guardian2User.id, fullName: 'Helen Watson', email: 'guardian.watson@example.com', phone: '(555) 200-0002', status: 'ACTIVE' },
  });
  if (ariaProfile) {
    const existRel = await prisma.guardianStudentRelationship.findFirst({ where: { guardianProfileId: guardian2Profile.id, studentProfileId: ariaProfile.id } });
    if (!existRel) await prisma.guardianStudentRelationship.create({ data: { guardianProfileId: guardian2Profile.id, studentProfileId: ariaProfile.id, relationshipType: 'MOTHER', isPrimary: true, hasFinancialResponsibility: true, hasAcademicAccess: true, hasEmergencyContact: true } });
  }

  const guardian3User = await prisma.user.upsert({
    where: { email: 'guardian.johnson@example.com' },
    update: {},
    create: { email: 'guardian.johnson@example.com', password: hashedPassword, firstName: 'David', lastName: 'Johnson', isActive: true },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: guardian3User.id, roleId: guardianRole.id } }, update: {}, create: { userId: guardian3User.id, roleId: guardianRole.id } });
  const guardian3Profile = await prisma.guardianProfile.upsert({
    where: { userId: guardian3User.id },
    update: {},
    create: { userId: guardian3User.id, fullName: 'David Johnson', email: 'guardian.johnson@example.com', phone: '(555) 200-0003', status: 'ACTIVE' },
  });
  if (noahProfile) {
    const existRel = await prisma.guardianStudentRelationship.findFirst({ where: { guardianProfileId: guardian3Profile.id, studentProfileId: noahProfile.id } });
    if (!existRel) await prisma.guardianStudentRelationship.create({ data: { guardianProfileId: guardian3Profile.id, studentProfileId: noahProfile.id, relationshipType: 'FATHER', isPrimary: true, hasFinancialResponsibility: true, hasAcademicAccess: true, hasEmergencyContact: true } });
  }

  const guardian4User = await prisma.user.upsert({
    where: { email: 'guardian.brooks@example.com' },
    update: {},
    create: { email: 'guardian.brooks@example.com', password: hashedPassword, firstName: 'Sandra', lastName: 'Brooks', isActive: true },
  });
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: guardian4User.id, roleId: guardianRole.id } }, update: {}, create: { userId: guardian4User.id, roleId: guardianRole.id } });
  const guardian4Profile = await prisma.guardianProfile.upsert({
    where: { userId: guardian4User.id },
    update: {},
    create: { userId: guardian4User.id, fullName: 'Sandra Brooks', email: 'guardian.brooks@example.com', phone: '(555) 200-0004', status: 'ACTIVE' },
  });
  if (lucasProfile) {
    const existRel = await prisma.guardianStudentRelationship.findFirst({ where: { guardianProfileId: guardian4Profile.id, studentProfileId: lucasProfile.id } });
    if (!existRel) await prisma.guardianStudentRelationship.create({ data: { guardianProfileId: guardian4Profile.id, studentProfileId: lucasProfile.id, relationshipType: 'MOTHER', isPrimary: true, hasFinancialResponsibility: true, hasAcademicAccess: true, hasEmergencyContact: false } });
  }
  console.log('✅ Seeded additional guardians');

  // ─── Families ────────────────────────────────────────────────────────────────
  console.log('🌱 Seeding families...');
  // Watson family
  const watsonFamily = await prisma.family.findFirst({ where: { householdName: 'Watson Family' } });
  const watsonFam = watsonFamily ?? await prisma.family.create({ data: { householdName: 'Watson Family', status: 'ACTIVE' } });
  if (ariaProfile) {
    const existFS = await prisma.familyStudent.findFirst({ where: { familyId: watsonFam.id, studentProfileId: ariaProfile.id } });
    if (!existFS) await prisma.familyStudent.create({ data: { familyId: watsonFam.id, studentProfileId: ariaProfile.id } });
  }
  const existFG2 = await prisma.familyGuardian.findFirst({ where: { familyId: watsonFam.id, guardianProfileId: guardian2Profile.id } });
  if (!existFG2) await prisma.familyGuardian.create({ data: { familyId: watsonFam.id, guardianProfileId: guardian2Profile.id } });

  // Johnson family
  const johnsonFamily = await prisma.family.findFirst({ where: { householdName: 'Johnson Family' } });
  const johnsonFam = johnsonFamily ?? await prisma.family.create({ data: { householdName: 'Johnson Family', status: 'ACTIVE' } });
  if (noahProfile) {
    const existFS = await prisma.familyStudent.findFirst({ where: { familyId: johnsonFam.id, studentProfileId: noahProfile.id } });
    if (!existFS) await prisma.familyStudent.create({ data: { familyId: johnsonFam.id, studentProfileId: noahProfile.id } });
  }
  const existFG3 = await prisma.familyGuardian.findFirst({ where: { familyId: johnsonFam.id, guardianProfileId: guardian3Profile.id } });
  if (!existFG3) await prisma.familyGuardian.create({ data: { familyId: johnsonFam.id, guardianProfileId: guardian3Profile.id } });

  // Brooks family
  const brooksFamily = await prisma.family.findFirst({ where: { householdName: 'Brooks Family' } });
  const brooksFam = brooksFamily ?? await prisma.family.create({ data: { householdName: 'Brooks Family', status: 'ACTIVE' } });
  if (lucasProfile) {
    const existFS = await prisma.familyStudent.findFirst({ where: { familyId: brooksFam.id, studentProfileId: lucasProfile.id } });
    if (!existFS) await prisma.familyStudent.create({ data: { familyId: brooksFam.id, studentProfileId: lucasProfile.id } });
  }
  const existFG4 = await prisma.familyGuardian.findFirst({ where: { familyId: brooksFam.id, guardianProfileId: guardian4Profile.id } });
  if (!existFG4) await prisma.familyGuardian.create({ data: { familyId: brooksFam.id, guardianProfileId: guardian4Profile.id } });
  console.log('✅ Seeded families');

  // ─── Family Invoices & Payments ──────────────────────────────────────────────
  console.log('🌱 Seeding family invoices & payments...');
  const familyInvoiceData = [
    { fam: watsonFam, desc: 'Fall Semester 2026 Tuition', amount: 1500, issue: '2026-08-01', due: '2026-09-01', status: 'OVERDUE', paidAmt: null as number | null },
    { fam: johnsonFam, desc: 'Fall Semester 2026 Tuition', amount: 1500, issue: '2026-08-01', due: '2026-09-01', status: 'PAID', paidAmt: 1500 },
    { fam: brooksFam, desc: 'Fall Semester 2026 Tuition', amount: 1500, issue: '2026-08-01', due: '2026-09-01', status: 'PAID', paidAmt: 1500 },
    { fam: brooksFam, desc: 'Uniform & Supply Fee', amount: 120, issue: '2026-08-15', due: '2026-09-15', status: 'PAID', paidAmt: 120 },
    { fam: watsonFam, desc: 'Library & Lab Fee', amount: 80, issue: '2026-08-15', due: '2026-09-15', status: 'PENDING', paidAmt: null },
  ];

  // Harris family — add Q2 invoice (not yet paid)
  const harrisFamily = await prisma.family.findFirst({ where: { householdName: 'Harris Family' } });
  if (harrisFamily) {
    const existH = await prisma.familyInvoice.findFirst({ where: { familyId: harrisFamily.id } });
    if (existH) {
      const existPayH = await prisma.familyPayment.findFirst({ where: { familyId: harrisFamily.id } });
      if (!existPayH) {
        await prisma.familyPayment.create({ data: { familyId: harrisFamily.id, invoiceId: existH.id, amount: 1500, currency: 'USD', paymentDate: new Date('2026-08-28'), method: 'BANK_TRANSFER', reference: 'TXN-2026-H-001', notes: 'Fall 2026 tuition.' } });
      }
    }
    const existQ2 = await prisma.familyInvoice.findFirst({ where: { familyId: harrisFamily.id, description: 'Spring Semester 2027 Tuition' } });
    if (!existQ2) {
      await prisma.familyInvoice.create({ data: { familyId: harrisFamily.id, amount: 1500, currency: 'USD', description: 'Spring Semester 2027 Tuition', issueDate: new Date('2026-12-01'), dueDate: new Date('2027-01-10'), status: 'PENDING' } });
    }
  }

  for (const { fam, desc, amount, issue, due, status, paidAmt } of familyInvoiceData) {
    const existInv = await prisma.familyInvoice.findFirst({ where: { familyId: fam.id, description: desc } });
    const inv = existInv ?? await prisma.familyInvoice.create({ data: { familyId: fam.id, amount, currency: 'USD', description: desc, issueDate: new Date(issue), dueDate: new Date(due), status } });
    if (paidAmt && status === 'PAID') {
      const existPay = await prisma.familyPayment.findFirst({ where: { familyId: fam.id, invoiceId: inv.id } });
      if (!existPay) {
        await prisma.familyPayment.create({ data: { familyId: fam.id, invoiceId: inv.id, amount: paidAmt, currency: 'USD', paymentDate: new Date('2026-08-28'), method: 'BANK_TRANSFER', reference: `TXN-${fam.id.slice(0, 8)}`, notes: 'Paid via bank transfer.' } });
      }
    }
  }
  console.log('✅ Seeded family invoices & payments');

  // ─── Subscription Invoice & Payment ──────────────────────────────────────────
  console.log('🌱 Seeding subscription invoice...');
  const subscription = await prisma.subscription.findUnique({ where: { campusId: campus.id } });
  if (subscription) {
    const existInv = await prisma.invoice.findFirst({ where: { subscriptionId: subscription.id } });
    if (!existInv) {
      const inv = await prisma.invoice.create({ data: { subscriptionId: subscription.id, amount: 0, currency: 'USD', status: 'PAID', dueDate: new Date('2026-10-01'), paidAt: new Date('2026-09-28') } });
      await prisma.payment.create({ data: { invoiceId: inv.id, amount: 0, currency: 'USD', status: 'SUCCEEDED', paymentMethod: 'card', metadata: { note: 'Free plan billing — $0 charge' } } });
    }
  }
  console.log('✅ Seeded subscription invoice');

  // ─── Message Threads & Messages ──────────────────────────────────────────────
  console.log('🌱 Seeding message threads...');
  const turingU = teacherUsers['EMP-TURING'];
  const lovelaceU = teacherUsers['EMP-LOVELACE'];
  const hopperU = teacherUsers['EMP-HOPPER'];

  // Thread 1: Harris guardian ↔ Turing — Charlotte absence
  const t1Exists = await prisma.messageThread.findFirst({ where: { guardianUserId: guardian1User.id, teacherUserId: turingU.id } });
  if (!t1Exists && charlotteProfile) {
    const t1 = await prisma.messageThread.create({ data: { subject: "Charlotte's Absence — June 12", studentProfileId: charlotteProfile.id, guardianUserId: guardian1User.id, teacherUserId: turingU.id, status: 'OPEN', lastMessageAt: new Date('2026-06-13T10:30:00') } });
    await prisma.message.create({ data: { threadId: t1.id, senderUserId: guardian1User.id, body: "Hello Prof. Turing, Charlotte was absent on June 12 due to a medical appointment. I've attached the doctor's note.", readAt: new Date('2026-06-13T09:00:00'), createdAt: new Date('2026-06-12T18:00:00') } });
    await prisma.message.create({ data: { threadId: t1.id, senderUserId: turingU.id, body: "Thank you, Robert. The absence is noted as excused. Charlotte can complete the missed work by June 20.", readAt: null, createdAt: new Date('2026-06-13T10:30:00') } });
    await prisma.message.create({ data: { threadId: t1.id, senderUserId: guardian1User.id, body: "Thank you for understanding. She'll have the makeup work done by then.", readAt: null, createdAt: new Date('2026-06-13T11:00:00') } });
  }

  // Thread 2: Harris guardian ↔ Lovelace — midterm topics
  const t2Exists = await prisma.messageThread.findFirst({ where: { guardianUserId: guardian1User.id, teacherUserId: lovelaceU.id } });
  if (!t2Exists && charlotteProfile) {
    const t2 = await prisma.messageThread.create({ data: { subject: 'Upcoming Fall Midterm — Topics', studentProfileId: charlotteProfile.id, guardianUserId: guardian1User.id, teacherUserId: lovelaceU.id, status: 'OPEN', lastMessageAt: new Date('2026-09-10T14:00:00') } });
    await prisma.message.create({ data: { threadId: t2.id, senderUserId: guardian1User.id, body: "Dear Prof. Lovelace, could you share the topics that will be covered in the Fall Midterm?", readAt: new Date('2026-09-10T11:00:00'), createdAt: new Date('2026-09-09T20:00:00') } });
    await prisma.message.create({ data: { threadId: t2.id, senderUserId: lovelaceU.id, body: "Good morning! The midterm covers Chapters 1–6: Fractions, Basic Algebra, Ratios, Percentages, Geometry basics, and Data interpretation.", readAt: new Date('2026-09-10T14:00:00'), createdAt: new Date('2026-09-10T11:00:00') } });
    await prisma.message.create({ data: { threadId: t2.id, senderUserId: guardian1User.id, body: "Perfect, thank you! Any practice resources you'd recommend?", readAt: null, createdAt: new Date('2026-09-10T14:00:00') } });
    await prisma.message.create({ data: { threadId: t2.id, senderUserId: lovelaceU.id, body: "Yes! Khan Academy's Algebra Foundations track is excellent. Also check the student portal for the past-paper pack I uploaded.", readAt: null, createdAt: new Date('2026-09-10T15:30:00') } });
  }

  // Thread 3: Watson guardian ↔ Turing — Aria's performance
  const t3Exists = await prisma.messageThread.findFirst({ where: { guardianUserId: guardian2User.id, teacherUserId: turingU.id } });
  if (!t3Exists && ariaProfile) {
    const t3 = await prisma.messageThread.create({ data: { subject: "Aria's Outstanding Quiz Performance", studentProfileId: ariaProfile.id, guardianUserId: guardian2User.id, teacherUserId: turingU.id, status: 'OPEN', lastMessageAt: new Date('2026-09-20T14:00:00') } });
    await prisma.message.create({ data: { threadId: t3.id, senderUserId: turingU.id, body: "Dear Mrs. Watson, I wanted to let you know Aria scored 100% on her Week 1 Math Quiz. She is an exceptional student.", readAt: new Date('2026-09-20T14:00:00'), createdAt: new Date('2026-09-19T16:00:00') } });
    await prisma.message.create({ data: { threadId: t3.id, senderUserId: guardian2User.id, body: "Thank you so much! Aria has been working very hard. We're very proud of her.", readAt: null, createdAt: new Date('2026-09-20T14:00:00') } });
  }

  // Thread 4: Johnson guardian ↔ Turing — Noah's progress
  const t4Exists = await prisma.messageThread.findFirst({ where: { guardianUserId: guardian3User.id, teacherUserId: turingU.id } });
  if (!t4Exists && noahProfile) {
    const t4 = await prisma.messageThread.create({ data: { subject: "Noah's Mid-Semester Progress", studentProfileId: noahProfile.id, guardianUserId: guardian3User.id, teacherUserId: turingU.id, status: 'OPEN', lastMessageAt: new Date('2026-10-05T09:00:00') } });
    await prisma.message.create({ data: { threadId: t4.id, senderUserId: guardian3User.id, body: "Hi Prof. Turing, how is Noah doing so far this semester? We want to make sure he stays on track.", readAt: new Date('2026-10-05T09:00:00'), createdAt: new Date('2026-10-04T19:00:00') } });
    await prisma.message.create({ data: { threadId: t4.id, senderUserId: turingU.id, body: "Hello David! Noah is doing well — scoring above 80% on all assessments. He's engaged in class and participates actively. Keep encouraging him!", readAt: null, createdAt: new Date('2026-10-05T09:00:00') } });
  }

  // Thread 5: Brooks guardian ↔ Hopper — Lucas in Section B
  const t5Exists = await prisma.messageThread.findFirst({ where: { guardianUserId: guardian4User.id, teacherUserId: hopperU.id } });
  if (!t5Exists && lucasProfile) {
    const t5 = await prisma.messageThread.create({ data: { subject: 'Lucas — Homework Submission Concerns', studentProfileId: lucasProfile.id, guardianUserId: guardian4User.id, teacherUserId: hopperU.id, status: 'ARCHIVED', lastMessageAt: new Date('2026-09-28T12:00:00') } });
    await prisma.message.create({ data: { threadId: t5.id, senderUserId: guardian4User.id, body: "Dear Prof. Hopper, Lucas mentioned he's finding the DSA assignments challenging. Is there additional support available?", readAt: new Date('2026-09-28T12:00:00'), createdAt: new Date('2026-09-27T20:00:00') } });
    await prisma.message.create({ data: { threadId: t5.id, senderUserId: hopperU.id, body: "Hi Sandra, absolutely. We offer peer tutoring sessions every Thursday after school. I've also created supplementary notes — available in the student portal.", readAt: null, createdAt: new Date('2026-09-28T12:00:00') } });
  }
  console.log('✅ Seeded message threads');

  // ─── Section B Timetable & Attendance ────────────────────────────────────────
  console.log('🌱 Seeding Section B timetable & attendance...');
  let timetableB = await prisma.timetable.findFirst({ where: { classSectionId: sectionB.id } });
  if (!timetableB) {
    timetableB = await prisma.timetable.create({
      data: { academicYearId: academicYear.id, termId: term.id, classSectionId: sectionB.id, name: 'Fall 2026 — CS Section B', status: 'PUBLISHED', effectiveFrom: new Date('2026-09-10'), effectiveTo: new Date('2026-12-20'), publishedAt: new Date(), createdById: superAdminUser.id },
    });
    const bSlots = [
      { day: 'MONDAY',    period: 1, start: 540,  end: 620,  room: 'Lab 3',    ccId: dsaClass.id,  tc: 'EMP-HOPPER' },
      { day: 'MONDAY',    period: 2, start: 640,  end: 720,  room: 'Room 102', ccId: algClass.id,  tc: 'EMP-LOVELACE' },
      { day: 'TUESDAY',   period: 1, start: 480,  end: 560,  room: 'Lab 3',    ccId: webClass.id,  tc: 'EMP-HOPPER' },
      { day: 'TUESDAY',   period: 2, start: 640,  end: 720,  room: 'Room 204', ccId: calcClass.id, tc: 'EMP-EULER' },
      { day: 'WEDNESDAY', period: 1, start: 540,  end: 620,  room: 'Lab 3',    ccId: dsaClass.id,  tc: 'EMP-HOPPER' },
      { day: 'WEDNESDAY', period: 2, start: 640,  end: 720,  room: 'Room 102', ccId: engClass.id,  tc: 'EMP-LOVELACE' },
      { day: 'THURSDAY',  period: 1, start: 480,  end: 560,  room: 'Room 204', ccId: calcClass.id, tc: 'EMP-EULER' },
      { day: 'THURSDAY',  period: 2, start: 640,  end: 720,  room: 'Lab 3',    ccId: webClass.id,  tc: 'EMP-HOPPER' },
      { day: 'FRIDAY',    period: 1, start: 540,  end: 620,  room: 'Room 102', ccId: algClass.id,  tc: 'EMP-LOVELACE' },
      { day: 'FRIDAY',    period: 2, start: 640,  end: 720,  room: 'Room 103', ccId: engClass.id,  tc: 'EMP-LOVELACE' },
    ] as const;
    for (const s of bSlots) {
      await prisma.timetableSlot.create({ data: { timetableId: timetableB.id, dayOfWeek: s.day, periodIndex: s.period, startTimeMinutes: s.start, endTimeMinutes: s.end, room: s.room, classSectionId: sectionB.id, courseClassId: s.ccId, teacherProfileId: teacherProfiles[s.tc].id, status: 'ACTIVE' } });
    }
  }

  // Section B daily attendance (same date range)
  const sectionBStudents = studentProfiles.filter(p => p.sectionId === sectionB.id);
  const bAbsences: Record<string, string[]> = { William: ['2026-06-18', '2026-06-19'], Sophia: ['2026-06-23'] };
  const bLate: Record<string, string[]> = { Isabella: ['2026-06-16'] };
  for (const profile of sectionBStudents) {
    for (const dateStr of attendanceDates) {
      const date = new Date(dateStr);
      const isAbsent = bAbsences[profile.firstName]?.includes(dateStr);
      const isLate = !isAbsent && bLate[profile.firstName]?.includes(dateStr);
      await prisma.dailyAttendance.upsert({
        where: { studentProfileId_classSectionId_date: { studentProfileId: profile.id, classSectionId: sectionB.id, date } },
        update: {},
        create: { studentProfileId: profile.id, classSectionId: sectionB.id, date, status: isAbsent ? 'ABSENT' : isLate ? 'LATE' : 'PRESENT', remarks: isAbsent ? 'Absent' : isLate ? 'Arrived late' : 'On time', recordedById: superAdminUser.id },
      });
    }
  }

  // Math section attendance
  const mathSectionStudents = studentProfiles.filter(p => p.sectionId === mathSection.id);
  for (const profile of mathSectionStudents) {
    for (const dateStr of attendanceDates) {
      const date = new Date(dateStr);
      await prisma.dailyAttendance.upsert({
        where: { studentProfileId_classSectionId_date: { studentProfileId: profile.id, classSectionId: mathSection.id, date } },
        update: {},
        create: { studentProfileId: profile.id, classSectionId: mathSection.id, date, status: 'PRESENT', remarks: 'On time', recordedById: superAdminUser.id },
      });
    }
  }
  console.log('✅ Seeded Section B timetable & attendance');

  // ─── GradeBook for Section B ─────────────────────────────────────────────────
  console.log('🌱 Seeding Section B gradebook...');
  const bGradeData: {name:string; mathQ:number; csQ:number}[] = [
    { name: 'Oliver',   mathQ: 82, csQ: 78 },
    { name: 'Sophia',   mathQ: 91, csQ: 88 },
    { name: 'William',  mathQ: 68, csQ: 72 },
    { name: 'Isabella', mathQ: 95, csQ: 90 },
  ];
  for (const profile of sectionBStudents) {
    const g = bGradeData.find(d => d.name === profile.firstName);
    if (!g) continue;
    const entries = [
      { title: 'Week 1 Math Quiz', cat: 'QUIZ', pts: g.mathQ, srcId: `mq1-b-${profile.id}`, srcType: 'ASSESSMENT_ATTEMPT' as const },
      { title: 'Week 2 CS Quiz',   cat: 'QUIZ', pts: g.csQ,   srcId: `csq1-b-${profile.id}`, srcType: 'ASSESSMENT_ATTEMPT' as const },
    ];
    for (const e of entries) {
      const exists = await prisma.gradeBookEntry.findFirst({ where: { studentProfileId: profile.id, sourceType: e.srcType, sourceId: e.srcId } });
      if (!exists) {
        await prisma.gradeBookEntry.create({ data: { studentProfileId: profile.id, classSectionId: sectionB.id, termId: term.id, sourceType: e.srcType, sourceId: e.srcId, title: e.title, category: e.cat, pointsEarned: e.pts, pointsPossible: 100, percentage: e.pts, weight: 1.0, status: 'PUBLISHED', assessedAt: new Date('2026-09-16'), publishedAt: new Date(), createdById: superAdminUser.id } });
      }
    }
  }
  console.log('✅ Seeded Section B gradebook');

  // ─── Audit Logs ──────────────────────────────────────────────────────────────
  console.log('🌱 Seeding audit logs...');
  await prisma.auditLog.createMany({
    data: [
      { actorUserId: superAdminUser.id, event: 'CAMPUS_CREATED', targetType: 'Campus', targetId: campus.id, ipAddress: '127.0.0.1', metadata: { name: 'Main Campus' } },
      { actorUserId: superAdminUser.id, event: 'TIMETABLE_PUBLISHED', targetType: 'Timetable', targetId: timetable.id, ipAddress: '127.0.0.1', metadata: { name: 'Fall 2026 — CS Section A' } },
      { actorUserId: superAdminUser.id, event: 'ASSESSMENT_PUBLISHED', targetType: 'Assessment', targetId: mathQuiz1.id, ipAddress: '127.0.0.1', metadata: { title: 'Week 1 Math Quiz — Fractions' } },
      { actorUserId: superAdminUser.id, event: 'ASSESSMENT_PUBLISHED', targetType: 'Assessment', targetId: csQuiz1.id, ipAddress: '127.0.0.1', metadata: { title: 'Week 2 CS Quiz — Data Structures' } },
      { actorUserId: superAdminUser.id, event: 'STUDENT_ENROLLED', targetType: 'StudentProfile', targetId: studentProfiles[0]?.id, ipAddress: '127.0.0.1', metadata: { name: 'Charlotte Harris', section: 'CS Section A' } },
      { actorUserId: superAdminUser.id, event: 'STUDENT_ENROLLED', targetType: 'StudentProfile', targetId: studentProfiles[4]?.id, ipAddress: '127.0.0.1', metadata: { name: 'Noah Johnson', section: 'CS Section A' } },
      { actorUserId: superAdminUser.id, event: 'PLAN_SUBSCRIBED', targetType: 'Subscription', targetId: campus.id, ipAddress: '127.0.0.1', metadata: { plan: 'Free' } },
      { actorUserId: turingU.id, event: 'HOMEWORK_CREATED', targetType: 'Homework', targetId: hw1.id, ipAddress: '10.0.0.1', metadata: { title: 'DSA Problem Set 1' } },
      { actorUserId: turingU.id, event: 'GRADE_PUBLISHED', targetType: 'GradeBookEntry', targetId: null, ipAddress: '10.0.0.1', metadata: { assessment: 'Week 1 Math Quiz', studentCount: 5 } },
      { actorUserId: turingU.id, event: 'SESSION_CREATED', targetType: 'CourseClassSession', targetId: sessions[0]?.id ?? null, ipAddress: '10.0.0.1', metadata: { topic: 'Introduction to Linked Lists' } },
      { actorUserId: teacherUsers['EMP-LOVELACE'].id, event: 'HOMEWORK_GRADED', targetType: 'Homework', targetId: hw3.id, ipAddress: '10.0.0.2', metadata: { title: 'Calculus Assignment 1' } },
      { actorUserId: teacherUsers['EMP-HOPPER'].id, event: 'TIMETABLE_PUBLISHED', targetType: 'Timetable', targetId: null, ipAddress: '10.0.0.3', metadata: { name: 'Fall 2026 — CS Section B' } },
      { actorUserId: guardian1User.id, event: 'MESSAGE_SENT', targetType: 'MessageThread', targetId: null, ipAddress: '203.0.113.1', metadata: { subject: "Charlotte's Absence — June 12" } },
      { actorUserId: superAdminUser.id, event: 'ATTENDANCE_RECORDED', targetType: 'DailyAttendance', targetId: null, ipAddress: '127.0.0.1', metadata: { date: '2026-06-23', sections: ['CS-2026-A', 'CS-2026-B'], totalRecords: 11 } },
      { actorUserId: superAdminUser.id, event: 'RUBRIC_ASSESSMENT_CREATED', targetType: 'RubricAssessment', targetId: null, ipAddress: '127.0.0.1', metadata: { rubricName: 'Comparing Fractions Rubric', evaluatedCount: 4 } },
    ],
  });
  console.log('✅ Seeded audit logs');

  // ─── Teacher & Guardian Notifications ────────────────────────────────────────
  console.log('🌱 Seeding teacher & guardian notifications...');
  await prisma.notification.createMany({
    data: [
      { userId: turingU.id, type: 'INFO',    title: 'New Message from Robert Harris', body: "Robert Harris sent a message about Charlotte's June 12 absence.", readAt: null },
      { userId: turingU.id, type: 'INFO',    title: 'Week 1 Quiz — All Submissions In', body: '5 students completed the Week 1 Math Quiz. Click to review.', readAt: new Date() },
      { userId: turingU.id, type: 'WARNING', title: 'Makeup Request Pending', body: "Charlotte Harris has an unresolved makeup request for the June 12 DSA session.", readAt: null },
      { userId: turingU.id, type: 'INFO',    title: 'Noah Johnson — Midterm Marked', body: "Noah's Fall Midterm has been marked. Score: 80/100.", readAt: null },
      { userId: lovelaceU.id, type: 'INFO',    title: 'New Message from Robert Harris', body: 'Robert Harris asked about Fall Midterm topics for Charlotte.', readAt: new Date() },
      { userId: lovelaceU.id, type: 'WARNING', title: 'Calculus HW1 — 3 Not Submitted', body: 'Calculus Assignment 1 deadline passed. 3 students still outstanding.', readAt: null },
      { userId: lovelaceU.id, type: 'INFO',    title: 'Gradebook Published', body: 'Your Week 1 Math Quiz grades have been published to students and guardians.', readAt: null },
      { userId: teacherUsers['EMP-HOPPER'].id, type: 'INFO',    title: 'Section B Timetable Active', body: 'Fall 2026 timetable for CS Section B is now live.', readAt: null },
      { userId: teacherUsers['EMP-HOPPER'].id, type: 'INFO',    title: 'New Message from Sandra Brooks', body: 'Sandra Brooks inquired about support resources for Lucas.', readAt: null },
      { userId: teacherUsers['EMP-EULER'].id,  type: 'WARNING', title: 'Low Attendance Alert', body: "William Anderson was absent 2 days this week (June 18–19). Consider reaching out.", readAt: null },
      { userId: guardian1User.id, type: 'INFO',    title: 'Grade Published — Week 1 Math Quiz', body: "Charlotte's Week 1 Math Quiz grade (90%) is now available.", readAt: null },
      { userId: guardian1User.id, type: 'INFO',    title: 'Reply from Prof. Turing', body: 'Alan Turing replied to your message about the June 12 absence.', readAt: new Date() },
      { userId: guardian2User.id, type: 'INFO',    title: 'Aria scored 100% on Math Quiz!', body: 'Prof. Turing has a message for you regarding Aria\'s outstanding performance.', readAt: null },
      { userId: guardian3User.id, type: 'INFO',    title: 'Reply from Prof. Turing', body: 'Alan Turing replied to your progress inquiry about Noah.', readAt: null },
      { userId: guardian4User.id, type: 'INFO',    title: 'Reply from Prof. Hopper', body: 'Grace Hopper replied with tutoring support information for Lucas.', readAt: null },
    ],
  });
  console.log('✅ Seeded teacher & guardian notifications');

  // ─── Learning Catalog (Subjects, Courses, Learning Paths) ────────────────────
  console.log('🌱 Seeding learning catalog...');

  const mathLearningSubject = await prisma.learningSubject.upsert({
    where: { code: 'MATH' },
    update: {},
    create: { code: 'MATH', name: 'Mathematics', description: 'Numbers, algebra, geometry, and more.', sortOrder: 1 },
  });

  const algebraCourse = await prisma.course.upsert({
    where: { slug: 'algebra-foundations' },
    update: {},
    create: {
      learningSubjectId: mathLearningSubject.id,
      title: 'Algebra Foundations',
      slug: 'algebra-foundations',
      description: 'Build a solid foundation in algebraic thinking, from variables to solving equations.',
      estimatedHours: 8,
      status: 'PUBLISHED',
      sortOrder: 1,
    },
  });

  const variablesChapter = await prisma.concept.upsert({
    where: { name: 'Variables and Expressions' },
    update: { courseId: algebraCourse.id, sortOrder: 1, kind: 'CHAPTER' },
    create: { name: 'Variables and Expressions', description: 'Introducing algebraic variables and how to form expressions with them.', courseId: algebraCourse.id, sortOrder: 1, kind: 'CHAPTER' },
  });

  let variablesLesson = await prisma.lesson.findFirst({ where: { title: 'Intro to Variables', conceptId: variablesChapter.id } });
  if (!variablesLesson) {
    variablesLesson = await prisma.lesson.create({ data: { conceptId: variablesChapter.id, title: 'Intro to Variables', description: "What a variable is and how it stands in for a number.", sortOrder: 1, xpReward: 50 } });
    await prisma.card.create({ data: { lessonId: variablesLesson.id, title: 'What is a Variable?', sortOrder: 1, cardType: 'CONCEPTUAL', content: "A variable is a symbol — usually a letter like $$x$$ or $$y$$ — that stands in for a number we don't know yet." } });
  }

  const linearEquationsChapter = await prisma.concept.upsert({
    where: { name: 'Linear Equations' },
    update: { courseId: algebraCourse.id, sortOrder: 2, kind: 'CHAPTER' },
    create: { name: 'Linear Equations', description: 'Solving one-variable linear equations step by step.', courseId: algebraCourse.id, sortOrder: 2, kind: 'CHAPTER' },
  });

  let linearEquationsLesson = await prisma.lesson.findFirst({ where: { title: 'Solving for X', conceptId: linearEquationsChapter.id } });
  if (!linearEquationsLesson) {
    linearEquationsLesson = await prisma.lesson.create({ data: { conceptId: linearEquationsChapter.id, title: 'Solving for X', description: 'Isolating the variable to solve a simple linear equation.', sortOrder: 1, xpReward: 60 } });
    await prisma.card.create({ data: { lessonId: linearEquationsLesson.id, title: 'Balancing the Equation', sortOrder: 1, cardType: 'CONCEPTUAL', content: 'Whatever you do to one side of an equation, you must do to the other to keep it balanced.' } });
    const linEqQ = await prisma.question.create({ data: { subjectId: mathSubject.id, levelId: gradeLevel.id, questionType: 'mcq', prompt: 'Solve: $$x + 5 = 12$$. What is $$x$$?', correctAnswer: null, widgetType: 'STANDARD_MCQ', isGraded: true, explanation: 'Subtract 5 from both sides: x = 12 - 5 = 7.', hints: ['Subtract 5 from both sides.'] } });
    await prisma.questionOption.create({ data: { questionId: linEqQ.id, optionLabel: 'A', optionText: '7', isCorrect: true } });
    await prisma.questionOption.create({ data: { questionId: linEqQ.id, optionLabel: 'B', optionText: '17', isCorrect: false } });
    await prisma.questionOption.create({ data: { questionId: linEqQ.id, optionLabel: 'C', optionText: '5', isCorrect: false } });
    await prisma.card.create({ data: { lessonId: linearEquationsLesson.id, title: 'Solve It', sortOrder: 2, cardType: 'INTERACTIVE', content: 'Now try solving one yourself.', questionId: linEqQ.id } });
  }

  const foundationalMathPath = await prisma.learningPath.upsert({
    where: { slug: 'foundational-math' },
    update: {},
    create: {
      learningSubjectId: mathLearningSubject.id,
      title: 'Foundational Math',
      slug: 'foundational-math',
      description: 'A guided, step-by-step path from foundational algebra onward.',
      unlockMode: 'SEQUENTIAL',
      status: 'PUBLISHED',
      sortOrder: 1,
    },
  });

  await prisma.learningPathCourse.upsert({
    where: { pathId_courseId: { pathId: foundationalMathPath.id, courseId: algebraCourse.id } },
    update: {},
    create: { pathId: foundationalMathPath.id, courseId: algebraCourse.id, sortOrder: 1, isRequired: true },
  });

  console.log('✅ Seeded learning catalog');

  // ─── Module Items: Video / Reading / Discussion / Assessment variety ────────
  console.log('🌱 Seeding module items (video, reading, discussion, assessment)...');

  const practiceQuizQ = await makeQ(
    mathSubject.id,
    gradeLevel.id,
    'Solve: 3x - 4 = 11. What is x?',
    [
      { label: 'A', text: '5', correct: true },
      { label: 'B', text: '3', correct: false },
      { label: 'C', text: '25', correct: false },
    ],
    'Add 4 to both sides: 3x = 15. Divide by 3: x = 5.',
  );

  let linearEquationsPractice = await prisma.assessment.findFirst({ where: { title: 'Practice Quiz — Solving for X' } });
  if (!linearEquationsPractice) {
    linearEquationsPractice = await prisma.assessment.create({
      data: {
        assessmentTypeId: quizType.id,
        subjectId: mathSubject.id,
        levelId: gradeLevel.id,
        termId: term.id,
        title: 'Practice Quiz — Solving for X',
        description: 'Low-stakes practice before the graded check-in. Attempt as many times as you like within the cap.',
        totalMarks: 10,
        estimatedDurationMinutes: 10,
        status: 'published',
        countsTowardGrade: false,
        maxAttempts: 2,
        weekNumber: 2,
        publishedAt: new Date(),
      },
    });
    const section = await prisma.assessmentSection.create({ data: { assessmentId: linearEquationsPractice.id, title: 'Section 1', sortOrder: 1 } });
    await prisma.assessmentQuestion.create({ data: { assessmentId: linearEquationsPractice.id, sectionId: section.id, questionId: practiceQuizQ.id, questionNumber: 1, marksAvailable: 10 } });
  }

  const checkInQ = await makeQ(
    mathSubject.id,
    gradeLevel.id,
    'Solve: 5x + 2 = 27. What is x?',
    [
      { label: 'A', text: '5', correct: true },
      { label: 'B', text: '29', correct: false },
      { label: 'C', text: '4', correct: false },
    ],
    'Subtract 2 from both sides: 5x = 25. Divide by 5: x = 5.',
  );

  let linearEquationsCheckIn = await prisma.assessment.findFirst({ where: { title: 'Graded Check-In — Solving for X' } });
  if (!linearEquationsCheckIn) {
    linearEquationsCheckIn = await prisma.assessment.create({
      data: {
        assessmentTypeId: quizType.id,
        subjectId: mathSubject.id,
        levelId: gradeLevel.id,
        termId: term.id,
        title: 'Graded Check-In — Solving for X',
        description: 'One graded attempt to confirm you can solve linear equations on your own.',
        totalMarks: 10,
        estimatedDurationMinutes: 10,
        status: 'published',
        countsTowardGrade: true,
        maxAttempts: 1,
        weekNumber: 2,
        publishedAt: new Date(),
      },
    });
    const section = await prisma.assessmentSection.create({ data: { assessmentId: linearEquationsCheckIn.id, title: 'Section 1', sortOrder: 1 } });
    await prisma.assessmentQuestion.create({ data: { assessmentId: linearEquationsCheckIn.id, sectionId: section.id, questionId: checkInQ.id, questionNumber: 1, marksAvailable: 10 } });
  }

  const practiceChapter = await prisma.concept.upsert({
    where: { name: 'Solving Equations in Practice' },
    update: { courseId: algebraCourse.id, sortOrder: 3, kind: 'CHAPTER' },
    create: {
      name: 'Solving Equations in Practice',
      description: 'Apply what you learned about linear equations through video, reading, discussion, and quizzes.',
      courseId: algebraCourse.id,
      sortOrder: 3,
      kind: 'CHAPTER',
    },
  });

  let videoItem = await prisma.moduleItem.findFirst({ where: { conceptId: practiceChapter.id, kind: 'VIDEO' } });
  if (!videoItem) {
    videoItem = await prisma.moduleItem.create({
      data: {
        conceptId: practiceChapter.id,
        kind: 'VIDEO',
        title: 'Watch: Solving Linear Equations Walkthrough',
        sortOrder: 1,
        status: 'PUBLISHED',
        videoUrl: 'https://www.youtube.com/watch?v=Qyd_v3DGzTM',
        videoDurationSeconds: 341,
      },
    });
  }

  let readingItem = await prisma.moduleItem.findFirst({ where: { conceptId: practiceChapter.id, kind: 'READING' } });
  if (!readingItem) {
    readingItem = await prisma.moduleItem.create({
      data: {
        conceptId: practiceChapter.id,
        kind: 'READING',
        title: 'Reading: Why Balance Matters',
        sortOrder: 2,
        status: 'PUBLISHED',
        readingContent:
          "An equation like $$3x - 4 = 11$$ is a statement that both sides are equal. Whatever operation you " +
          'apply to one side, you must apply to the other — otherwise the equality breaks. This is why we add, ' +
          'subtract, multiply, or divide both sides together when isolating a variable: it keeps the scale balanced ' +
          'while peeling away everything that is not the variable itself.',
      },
    });
  }

  let discussionItem = await prisma.moduleItem.findFirst({ where: { conceptId: practiceChapter.id, kind: 'DISCUSSION' } });
  if (!discussionItem) {
    discussionItem = await prisma.moduleItem.create({
      data: {
        conceptId: practiceChapter.id,
        kind: 'DISCUSSION',
        title: 'Discuss: Real-World Equations',
        sortOrder: 3,
        status: 'PUBLISHED',
      },
    });
  }

  let discussionThread = await prisma.discussionThread.findUnique({ where: { moduleItemId: discussionItem.id } });
  if (!discussionThread) {
    discussionThread = await prisma.discussionThread.create({
      data: {
        moduleItemId: discussionItem.id,
        prompt: 'Where have you seen a linear equation used in real life? Share an example and try setting it up as an equation.',
      },
    });

    const charlotteProfileForThread = studentProfiles.find((p) => p.firstName === 'Charlotte');
    const ariaProfileForThread = studentProfiles.find((p) => p.firstName === 'Aria');
    const noahProfileForThread = studentProfiles.find((p) => p.firstName === 'Noah');

    if (charlotteProfileForThread) {
      const post1 = await prisma.discussionPost.create({
        data: {
          discussionThreadId: discussionThread.id,
          studentProfileId: charlotteProfileForThread.id,
          body: "If I have $20 and save $5 a week, the week 'w' where I hit $50 is 20 + 5w = 50!",
        },
      });
      if (ariaProfileForThread) {
        await prisma.discussionPost.create({
          data: {
            discussionThreadId: discussionThread.id,
            studentProfileId: ariaProfileForThread.id,
            parentPostId: post1.id,
            body: 'Nice example! That solves to w = 6 weeks.',
          },
        });
      }
    }
    if (noahProfileForThread) {
      await prisma.discussionPost.create({
        data: {
          discussionThreadId: discussionThread.id,
          studentProfileId: noahProfileForThread.id,
          body: 'A taxi fare of $3 plus $2 per mile is 3 + 2m = total fare — I used this to figure out how far I could go with $15.',
        },
      });
    }
  }

  let practiceQuizItem = await prisma.moduleItem.findFirst({ where: { conceptId: practiceChapter.id, assessmentId: linearEquationsPractice.id } });
  if (!practiceQuizItem) {
    practiceQuizItem = await prisma.moduleItem.create({
      data: {
        conceptId: practiceChapter.id,
        kind: 'ASSESSMENT',
        title: 'Practice Quiz: Solving for X',
        sortOrder: 4,
        status: 'PUBLISHED',
        assessmentId: linearEquationsPractice.id,
      },
    });
  }

  let checkInItem = await prisma.moduleItem.findFirst({ where: { conceptId: practiceChapter.id, assessmentId: linearEquationsCheckIn.id } });
  if (!checkInItem) {
    checkInItem = await prisma.moduleItem.create({
      data: {
        conceptId: practiceChapter.id,
        kind: 'ASSESSMENT',
        title: 'Graded Check-In: Solving for X',
        sortOrder: 5,
        status: 'PUBLISHED',
        assessmentId: linearEquationsCheckIn.id,
      },
    });
  }

  // A couple of students have already watched the video & read the reading —
  // gives the outline checkmarks and course-progress views something to show.
  for (const name of ['Charlotte', 'Aria']) {
    const profile = studentProfiles.find((p) => p.firstName === name);
    if (!profile) continue;
    for (const item of [videoItem, readingItem]) {
      const existing = await prisma.moduleItemProgress.findUnique({
        where: { moduleItemId_studentProfileId: { moduleItemId: item.id, studentProfileId: profile.id } },
      });
      if (!existing) {
        await prisma.moduleItemProgress.create({
          data: {
            moduleItemId: item.id,
            studentProfileId: profile.id,
            completedAt: new Date('2026-09-11'),
            lastPositionSeconds: item.kind === 'VIDEO' ? item.videoDurationSeconds ?? undefined : undefined,
          },
        });
      }
    }
  }

  // Assign the two new quizzes to a few students so the "Start assignment"
  // path in AssessmentItemView resolves to a real assignment for their login.
  for (const name of ['Charlotte', 'Aria', 'Noah']) {
    const profile = studentProfiles.find((p) => p.firstName === name);
    if (!profile) continue;
    for (const assessment of [linearEquationsPractice, linearEquationsCheckIn]) {
      const existingAssignment = await prisma.assessmentAssignment.findFirst({
        where: { assessmentId: assessment.id, studentProfileId: profile.id },
      });
      if (!existingAssignment) {
        await prisma.assessmentAssignment.create({
          data: {
            assessmentId: assessment.id,
            studentProfileId: profile.id,
            classSectionId: sectionA.id,
            assignedByUserId: superAdminUser.id,
            opensAt,
            dueAt,
            status: 'assigned',
          },
        });
      }
    }
  }

  console.log('✅ Seeded module items (video, reading, discussion, assessment)');

  // ─── Checkpoint Concept ───────────────────────────────────────────────────────
  console.log('🌱 Seeding checkpoint chapter...');

  const checkpointChapter = await prisma.concept.upsert({
    where: { name: 'Algebra Foundations Checkpoint' },
    update: { courseId: algebraCourse.id, sortOrder: 4, kind: 'CHECKPOINT', passThresholdPercent: 70 },
    create: {
      name: 'Algebra Foundations Checkpoint',
      description: 'A short checkpoint quiz covering variables and linear equations — pass at 70% or better on the first try to complete this chapter.',
      courseId: algebraCourse.id,
      sortOrder: 4,
      kind: 'CHECKPOINT',
      passThresholdPercent: 70,
    },
  });

  let checkpointLesson = await prisma.lesson.findFirst({ where: { title: 'Checkpoint: Algebra Foundations', conceptId: checkpointChapter.id } });
  if (!checkpointLesson) {
    checkpointLesson = await prisma.lesson.create({
      data: {
        conceptId: checkpointChapter.id,
        title: 'Checkpoint: Algebra Foundations',
        description: 'Confirm your understanding of variables, expressions, and solving linear equations.',
        sortOrder: 1,
        xpReward: 75,
      },
    });
    await prisma.card.create({
      data: {
        lessonId: checkpointLesson.id,
        title: 'Before You Start',
        sortOrder: 1,
        cardType: 'CONCEPTUAL',
        content: "This checkpoint checks first-try accuracy — retries won't count toward passing, so take your time on the question ahead.",
      },
    });
    const checkpointQ = await makeQ(
      mathSubject.id,
      gradeLevel.id,
      'Solve: 4x + 3 = 19. What is x?',
      [
        { label: 'A', text: '4', correct: true },
        { label: 'B', text: '5.5', correct: false },
        { label: 'C', text: '16', correct: false },
      ],
      'Subtract 3 from both sides: 4x = 16. Divide by 4: x = 4.',
    );
    await prisma.card.create({
      data: {
        lessonId: checkpointLesson.id,
        title: 'Checkpoint Question',
        sortOrder: 2,
        cardType: 'CHECKPOINT',
        content: 'Solve this on your own, no hints — this is what determines whether you pass.',
        questionId: checkpointQ.id,
      },
    });
  }

  console.log('✅ Seeded checkpoint chapter');

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
