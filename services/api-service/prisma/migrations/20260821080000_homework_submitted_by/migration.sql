-- Record who handed the work in, separately from whose work it is.
--
-- A child created through the family portal has `password = NULL` and an
-- address on a reserved TLD -- they cannot sign in at all. Their guardian works
-- on their behalf through the `x-acting-student-id` header. So for the ordinary
-- case in this product, the person uploading homework is not the person whose
-- homework it is.
--
-- Nullable rather than backfilled: existing rows were written by a path that
-- never recorded an uploader, and guessing one would invent provenance the
-- system never had.

ALTER TABLE "homework_submissions" ADD COLUMN "submittedByUserId" TEXT;

-- SetNull, not Cascade: a guardian closing their account must not delete a
-- child's marked work.
ALTER TABLE "homework_submissions" ADD CONSTRAINT "homework_submissions_submittedByUserId_fkey"
    FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "homework_submissions_submittedByUserId_idx" ON "homework_submissions"("submittedByUserId");
