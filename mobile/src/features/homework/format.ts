/**
 * Display helpers for homework whose cohort and deadline are both optional.
 *
 * Homework became a course checkpoint on 2026-08-20, which made `batchId` and
 * `dueDate` nullable: a self-paced learner has no cohort to name and no
 * deadline to miss. Both screens formatted them unconditionally, so a
 * self-paced checkpoint rendered "Invalid Date" and an empty cohort label.
 *
 * Kept out of the screens so the two of them cannot disagree about what a
 * missing deadline looks like.
 */

/** What to call the cohort when there isn't one. */
export function batchLabel(batch: { name: string } | null): string {
  return batch?.name ?? 'Self-paced';
}

/**
 * Never returns "Invalid Date". A self-paced checkpoint genuinely has no due
 * date — that is not a missing value to paper over.
 */
export function dueLabel(dueDate: string | null): string {
  if (!dueDate) return 'No due date';
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return 'No due date';
  return `Due ${parsed.toLocaleDateString()}`;
}

/**
 * Undated work is never overdue. Treating a null deadline as "already passed"
 * would paint every self-paced checkpoint red the moment it appeared.
 */
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed < new Date();
}
