import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Row-scoping Prisma extension — the single enforcement point for data
 * lifecycle policy (docs/scoping-smoke-tests-and-soft-delete-2026-07-03.md,
 * Scope B). The Q1 tenancy epic composes organization scoping into this same
 * extension, which is why it lives here rather than inside any one service.
 *
 * Behavior for models in SOFT_DELETE_MODELS (Tier 1 of the lifecycle policy):
 * - list/count reads (`findMany`, `findFirst`, `findFirstOrThrow`, `count`,
 *   `aggregate`, `groupBy`) exclude archived rows unless the caller passes
 *   `includeArchived: true` (stripped before reaching Prisma).
 * - `delete`/`deleteMany` are rewritten to set `deletedAt` instead, unless the
 *   caller passes `forceDelete: true` (test cleanup / irreversible admin ops).
 * - `findUnique`/`findUniqueOrThrow` are rewritten to filtered `findFirst`
 *   variants so archived records 404 on detail routes; restore flows pass
 *   `includeArchived: true` to see them.
 * - Reads nested inside `include` and operations on non-Tier-1 models pass
 *   through untouched.
 *
 * Transaction caveat: the delete->update and findUnique->findFirst rewrites
 * run on the BASE client and therefore escape an open interactive
 * transaction. Inside `$transaction` callbacks, archive Tier-1 rows with an
 * explicit `updateMany({ data: { deletedAt } })` (see academic.service) and
 * prefer `findFirst` over `findUnique`.
 */
export const SOFT_DELETE_MODELS: ReadonlySet<string> = new Set([
  'User',
  'Campus',
  'Program',
  'AcademicYear',
  'ClassSection',
  'Term',
  'CourseClass',
  'StudentProfile',
  'GuardianProfile',
  'Family',
  'TeacherProfile',
  'Invoice',
  'Payment',
  'Assessment',
  'Question',
  'Lesson',
  'GradeBookEntry',
  'FamilyInvoice',
  'FamilyPayment',
]);

/** Model delegate property names (camelCase) that must route through the extension. */
export const SCOPED_DELEGATES: ReadonlySet<string> = new Set(
  [...SOFT_DELETE_MODELS].map((m) => m.charAt(0).toLowerCase() + m.slice(1)),
);

const FILTERED_READ_OPS = new Set([
  'findMany',
  'findFirst',
  'findFirstOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

function delegateFor(client: PrismaClient, model: string) {
  const prop = model.charAt(0).toLowerCase() + model.slice(1);
  return (client as Record<string, any>)[prop];
}

export function createScopingExtension(base: PrismaClient) {
  return Prisma.defineExtension({
    name: 'row-scoping',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !SOFT_DELETE_MODELS.has(model)) {
            return query(args);
          }
          const a = (args ?? {}) as Record<string, any>;

          if (FILTERED_READ_OPS.has(operation)) {
            const includeArchived = a.includeArchived === true;
            delete a.includeArchived;
            if (!includeArchived) {
              a.where = { ...(a.where ?? {}), deletedAt: null };
            }
            return query(a);
          }

          if (
            operation === 'findUnique' ||
            operation === 'findUniqueOrThrow'
          ) {
            const includeArchived = a.includeArchived === true;
            delete a.includeArchived;
            if (includeArchived) {
              return query(a);
            }
            const fn =
              operation === 'findUnique' ? 'findFirst' : 'findFirstOrThrow';
            return delegateFor(base, model)[fn]({
              ...a,
              where: { ...(a.where ?? {}), deletedAt: null },
            });
          }

          if (operation === 'delete') {
            if (a.forceDelete === true) {
              delete a.forceDelete;
              return query(a);
            }
            return delegateFor(base, model).update({
              where: a.where,
              data: { deletedAt: new Date() },
            });
          }

          if (operation === 'deleteMany') {
            if (a.forceDelete === true) {
              delete a.forceDelete;
              return query(a);
            }
            return delegateFor(base, model).updateMany({
              where: { ...(a.where ?? {}), deletedAt: null },
              data: { deletedAt: new Date() },
            });
          }

          return query(args);
        },
      },
    },
  });
}

/**
 * Loosely-typed helper for the few call sites that use the custom args
 * (`includeArchived`, `forceDelete`) the extension strips before validation.
 */
export type ScopedArgs<T> = T & {
  includeArchived?: boolean;
  forceDelete?: boolean;
};
