-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "status" "CatalogStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "moduleItemId" DROP NOT NULL;

