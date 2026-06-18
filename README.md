# Eudora 🌟

Eudora is a state-of-the-art educational management system and interactive, gamified active learning platform. It provides school administrators with robust tools to manage academic setups, billing, student records, and grading rubrics, while offering students a highly engaging, gamified interface to complete interactive learning cards guided by a Rive mascot named **Clio**.

---

## 🏗️ Architecture Overview

Eudora is built as a split client-server architecture with an administrative dashboard and student workspace communicating with a robust modular NestJS backend API.

```mermaid
graph TD
    subgraph Client ["Client (Next.js 16 App)"]
        Landing["Landing Page (/)"]
        Auth["Auth (Login/Register)"]
        Dashboard["Admin Dashboard (/dashboard)"]
        Learn["Active Student Learning (/learn)"]
        Clio["Rive Mascot (Clio)"]
        Widgets["Interactive Widgets"]
    end

    subgraph Backend ["Backend (NestJS API Service)"]
        AuthMod["Auth Module (JWT & Sessions)"]
        InstMod["Institution Module (Campuses, Programs)"]
        StudentMod["Student Module (Profiles, Streaks, XP)"]
        BillingMod["Billing Module (Stripe Plans/Subs)"]
        LearnMod["Lessons Module (Lessons, Cards, Widgets)"]
        EvalMod["Evaluation Module (Competency, Rubrics)"]
    end

    subgraph Database ["Database Layer"]
        Postgres[(PostgreSQL)]
        Prisma[[Prisma ORM]]
    end

    %% Connections
    Client -->|REST API Requests| Backend
    Backend --> Prisma
    Prisma --> Postgres
    Learn --> Clio
    Learn --> Widgets
```

---

## 🛠️ Tech Stack

### Frontend Client (`/client`)
*   **Framework**: Next.js 16 (App Router, React 19)
*   **State Management**: Redux Toolkit & React Redux
*   **Styling**: Tailwind CSS v4, Lucide React, and Shadcn UI (Radix)
*   **Gamification/Interactivity**: Rive Canvas (`@rive-app/react-canvas`) for interactive mascot animations

### Backend API Service (`/services/api-service`)
*   **Framework**: NestJS (Node.js progressive framework)
*   **Database ORM**: Prisma Client v7
*   **Database**: PostgreSQL v17
*   **Payments & Billing**: Stripe SDK
*   **Security & Auth**: Passport.js (JWT Strategy), bcryptjs

---

## 📂 Project Structure

```
eudora/
├── client/                     # Next.js frontend application
│   ├── public/rive/            # Rive animation files (.riv) for Clio & gamification
│   ├── src/app/                # App router pages (dashboard, learn, landing, login)
│   ├── src/features/           # Domain features (auth, clio, dashboard)
│   └── src/store/              # Redux global store configurations
├── services/
│   └── api-service/            # NestJS backend application
│       ├── prisma/             # Prisma schema, migrations, and seeds
│       └── src/                # Modular domain source files (academic, lessons, billing, etc.)
└── docker-compose.yml          # Local container configuration for Postgres and api-service
```

---

## ⚡ Getting Started

Follow these steps to run Eudora locally on your system.

### Prerequisites
Make sure you have the following installed:
*   [Node.js](https://nodejs.org/) (v20 or v22 recommended)
*   [pnpm](https://pnpm.io/) (v10+ recommended)
*   [Docker & Docker Compose](https://www.docker.com/)

---

### 1. Database Setup

To spin up a local PostgreSQL database, use Docker Compose at the root of the project:

```bash
docker compose up -d postgres
```
This boots up a PostgreSQL container named `eudora_postgres` listening on host port **5433**.

---

### 2. Backend API Service Configuration & Run

1. Navigate to the backend directory:
   ```bash
   cd services/api-service
   ```
2. Copy the example environment variables or ensure `.env` matches your setup:
   ```env
   NODE_ENV=development
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/eudora_db"
   JWT_SECRET="super-secret-key-change-this-in-production-12345"
   JWT_EXPIRATION="1d"
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run Prisma database migrations to set up the schemas:
   ```bash
   pnpm prisma:migrate
   ```
5. Seed the database with default structures, lessons, and test credentials:
   ```bash
   npx prisma db seed
   ```
6. Start the NestJS backend in development/watch mode:
   ```bash
   pnpm run start:dev
   ```
   The backend API will be available at [http://localhost:5000/api](http://localhost:5000/api).

---

### 3. Frontend Client Configuration & Run

1. Navigate to the client directory:
   ```bash
   cd ../../client
   ```
2. Configure `.env.local` to point to the backend API port:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start the Next.js development server:
   ```bash
   pnpm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🔑 Default Seed Accounts

The seeding script generates an administrative account and several student accounts for easy testing. Use these credentials to sign in:

### System Administrator (Accesses the Admin Dashboard)
*   **Email**: `admin@eudora.app`
*   **Password**: `Admin@123`

### Students (Accesses the Active Learning/Student Space)
*   `charlotte@example.com` / `Admin@123`
*   `elijah.m@example.com` / `Admin@123`
*   `aria.w@example.com` / `Admin@123`
*   `lucas.b@example.com` / `Admin@123`

---

## 🎮 Active Learning & Interactive Widgets

Under the `/learn` section, students interact with concept cards. Cards support different dynamic assessment widget types configured inside the database and rendered on the client:

*   **`STANDARD_MCQ`**: Standard multiple-choice questions.
*   **`SLIDER_MANIPULATIVE`**: Interactive sliders mapping mathematical balances or fraction scales (e.g. visualizing division increments).
*   **`DRAG_AND_DROP_LABELS`**: Label-based sorting or classification challenges.
*   **`COORDINATE_PLOTTER`**: Interactive grid graphing system.
*   **`CODE_PLAYGROUND`**: Sandboxed environment for running code.
*   **`GRID_MATCHING`**: Drag-and-drop matching of variables.

### Clio the Rive Mascot
The learning experience features **Clio**, a reactive mascot built with **Rive**, who responds to student actions:
*   Correct responses trigger XP bursts, confetti, and happy animations.
*   Wrong responses prompt supportive gestures.
*   Streaks and XP levels update in real-time on the student's gamification HUD.
