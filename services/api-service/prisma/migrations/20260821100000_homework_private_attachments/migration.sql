-- Student work becomes a managed, private file rather than a public URL.
--
-- `homework_submissions.attachmentUrls` was a bare text array. Whatever wrote
-- it decided where the bytes lived, and the only path that ever did -- the
-- FileUploader component -- posted to the public upload endpoint and stored the
-- public URL. So a child's handed-in work was readable by anyone holding the
-- link, with no record of its size, type, or owner, and no way to delete it.
--
-- It is replaced by a join onto `file_uploads`, whose rows carry `isPrivate`
-- and are served only through an endpoint that checks who is asking.
--
-- The column is dropped rather than migrated: it has never held a value in any
-- environment, so there is nothing to carry across.

CREATE TABLE "homework_submission_attachments" (
    "id"           TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fileUploadId" TEXT NOT NULL,
    "sortOrder"    INTEGER NOT NULL DEFAULT 0,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homework_submission_attachments_pkey" PRIMARY KEY ("id")
);

-- A stored file belongs to exactly one submission, so it cannot be re-pointed
-- at another child's work after the fact.
CREATE UNIQUE INDEX "homework_submission_attachments_fileUploadId_key"
    ON "homework_submission_attachments"("fileUploadId");
CREATE UNIQUE INDEX "homework_submission_attachments_submissionId_fileUploadId_key"
    ON "homework_submission_attachments"("submissionId", "fileUploadId");
CREATE INDEX "homework_submission_attachments_submissionId_idx"
    ON "homework_submission_attachments"("submissionId");

ALTER TABLE "homework_submission_attachments"
    ADD CONSTRAINT "homework_submission_attachments_submissionId_fkey"
    FOREIGN KEY ("submissionId") REFERENCES "homework_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_submission_attachments"
    ADD CONSTRAINT "homework_submission_attachments_fileUploadId_fkey"
    FOREIGN KEY ("fileUploadId") REFERENCES "file_uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "homework_submissions" DROP COLUMN "attachmentUrls";
