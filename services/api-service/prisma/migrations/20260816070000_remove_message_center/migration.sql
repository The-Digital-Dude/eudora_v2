-- DropForeignKey
ALTER TABLE "message_threads" DROP CONSTRAINT "message_threads_guardianUserId_fkey";

-- DropForeignKey
ALTER TABLE "message_threads" DROP CONSTRAINT "message_threads_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "message_threads" DROP CONSTRAINT "message_threads_teacherUserId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_senderUserId_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_threadId_fkey";

-- DropTable
DROP TABLE "message_threads";

-- DropTable
DROP TABLE "messages";

-- DropEnum
DROP TYPE "MessageThreadStatus";
