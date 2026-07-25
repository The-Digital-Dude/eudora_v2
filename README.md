# Eudora! An AI-powered Education OS

**Live UI:** [client-production-a931.up.railway.app](https://client-production-a931.up.railway.app/)

Eudora is a full-stack education operating system that brings school operations, curriculum delivery, and student learning into one product. It is designed around a simple idea: give educators a clear operational workspace while making learning more personal, interactive, and measurable for students.


## AI at the center

Eudora frames AI as practical classroom leverage rather than a standalone chat feature:

| AI capability | What it enables |
| --- | --- |
| **Personalized learning paths** | Curriculum and pace recommendations that can adapt to a student’s strengths and progress. |
| **Automated grading** | Faster evaluation of assignments and assessments, with space for pedagogical feedback. |
| **Lesson AI Designer** | A workflow for creating lesson plans, learning materials, and assessment content aligned to curriculum outcomes. |
| **Learning-gap intelligence** | Student and class-level signals that help staff identify gaps, follow up with interventions, and track next actions. |
| **Diagnostic-led placement** | Diagnostic data and placement recommendations give administrators a reviewable basis for student placement decisions. |

The product keeps educators in control: recommendations and insight workflows are presented for review, while the platform supplies the operational context needed to act on them.

## Product tour

### One command center for school operations

The admin console surfaces attendance, scheduling, enrolment, revenue, grading work, engagement, and learning activity in a cohesive workspace.

![Eudora admin overview: operational KPIs and engagement analytics](public/screens/1.jpg)

### Active learning that feels built for students

Students work through interactive lesson cards, receive support from Clio, and build momentum through visible progress, XP, and streaks.

![Interactive student lesson with Clio companion, progress, XP, and streaks](public/screens/2.jpg)

### Author lessons with a live student preview

Educators can compose lesson cards, bind interactive questions, and see the learner-facing result while they author.

![Lesson authoring studio with card editor, question binding, and live student preview](public/screens/3.jpg)

### Track course progress across learning paths

Course views provide a concise view of publishing state, milestones, instructors, and student progress.

![Courses view showing learning-path milestones and progress](public/screens/4.jpg)

### Turn academic plans into an operational timetable

Timetable management connects academic years, terms, sections, teachers, rooms, and course schedules.

![Timetable and scheduling workspace](public/screens/5.jpg)

## Platform capabilities

- **District and campus operations:** campuses, programmes, users, roles, leads, enrolment, billing, and Stripe subscriptions.
- **Academic management:** courses, lesson authoring, question banks, assessments, gradebooks, report-card workflows, and homework.
- **Student success:** diagnostics, learning gaps, next actions, student placement, attendance, live classes, and guardian visibility.
- **Interactive learning:** multiple-choice, sliders, drag-and-drop labelling, coordinate plotting, matching, and code-playground assessment widgets.
- **Role-specific portals:** dedicated experiences for administrators, teachers, guardians, and students.


## Run locally

### Prerequisites

- Node.js 20 or 22
- pnpm 10+
- Docker and Docker Compose

### 1. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Start the API

```bash
cd services/api-service
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma db seed
pnpm start:dev
```

Create `services/api-service/.env` with at least:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/eudora_db"
JWT_SECRET="change-me-in-production"
JWT_EXPIRATION="1d"
APP_URL="http://localhost:3000"
```

### 3. Start the client

```bash
cd client
pnpm install
pnpm dev
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

After seeding the database, use the following password for the accounts below: `Admin@123`.

| Role | Email |
| --- | --- |
| System administrator | `admin@eudora.app` |
| Student | `charlotte@example.com` |
| Student | `elijah.m@example.com` |
| Student | `aria.w@example.com` |
| Student | `lucas.b@example.com` |
