-- Rescue accounts the old signup stranded on the student portal.
--
-- Until the previous migration, register() hardcoded the USER role and ignored
-- the requested one, so every self-signup became a learner. Those accounts are
-- not merely mislabelled -- they are unusable: nothing ever created a
-- StudentProfile for them, so /student has no record to show, while /parent is
-- closed to them because the route is gated on the GUARDIAN role.
--
-- The predicate below is deliberately narrow. It touches only accounts that
-- have NO student profile and NO teacher profile, which is precisely the set
-- that cannot have been provisioned as a learner or staff member by an
-- administrator. A real student always has a StudentProfile, so no genuine
-- learner is in scope.

-- 1. Grant GUARDIAN to stranded self-signup accounts.
INSERT INTO "user_roles" ("userId", "roleId", "assignedAt")
SELECT u."id", r."id", NOW()
FROM "users" u
CROSS JOIN "roles" r
WHERE r."name" = 'GUARDIAN'
  AND u."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "student_profiles" sp WHERE sp."userId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "teacher_profiles" tp WHERE tp."userId" = u."id")
  AND NOT EXISTS (
    -- Anything already carrying a role that decides a portal is left alone:
    -- re-homing an admin or a teacher is not this migration's business.
    SELECT 1 FROM "user_roles" ur
    JOIN "roles" r2 ON r2."id" = ur."roleId"
    WHERE ur."userId" = u."id"
      AND r2."name" IN ('GUARDIAN', 'TEACHER', 'ADMIN', 'SUPER_ADMIN')
  )
ON CONFLICT ("userId", "roleId") DO NOTHING;

-- 2. Give them the profile the role implies, on the same terms registration
--    now does -- role and profile are never created apart, because an account
--    holding one without the other cannot use the portal it was sent to.
INSERT INTO "guardian_profiles" ("id", "userId", "fullName", "email", "status", "createdAt", "updatedAt")
SELECT gen_random_uuid(),
       u."id",
       NULLIF(TRIM(CONCAT(u."firstName", ' ', u."lastName")), ''),
       u."email",
       'ACTIVE',
       NOW(),
       NOW()
FROM "users" u
JOIN "user_roles" ur ON ur."userId" = u."id"
JOIN "roles" r ON r."id" = ur."roleId" AND r."name" = 'GUARDIAN'
WHERE u."deletedAt" IS NULL
  AND NOT EXISTS (SELECT 1 FROM "guardian_profiles" gp WHERE gp."userId" = u."id")
ON CONFLICT ("userId") DO NOTHING;

-- A guardian whose name columns were both empty would violate the NOT NULL on
-- fullName; fall back to the email, which is the same choice the application
-- makes when a provider returns no name.
UPDATE "guardian_profiles" SET "fullName" = "email" WHERE "fullName" IS NULL;
