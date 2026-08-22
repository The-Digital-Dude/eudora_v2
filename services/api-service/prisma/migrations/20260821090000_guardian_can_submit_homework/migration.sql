-- Let a guardian hand in their child's homework.
--
-- POST /homework/submit carries @Roles(... 'GUARDIAN') and
-- @RequirePermissions({ action: 'attempt', subject: 'Homework' }). The role
-- check passed and the permission check did not, so guardians met a bare
-- "Forbidden resource" with nothing explaining it.
--
-- Granting it is the correct fix rather than relaxing the route: a child
-- created through the family portal has no password and cannot sign in, so the
-- guardian submitting on their behalf is the ordinary path, not a workaround.
-- The acting-student rules still decide *which* child they may act for.

INSERT INTO "role_permissions" ("roleId", "permissionId", "assignedAt")
SELECT r."id", p."id", NOW()
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r."name" = 'GUARDIAN'
  AND p."action" = 'attempt'
  AND p."subject" = 'Homework'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
