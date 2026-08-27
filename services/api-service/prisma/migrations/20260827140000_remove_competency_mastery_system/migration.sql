-- DropForeignKey
ALTER TABLE "assessment_evidences" DROP CONSTRAINT "assessment_evidences_competencyId_fkey";

-- DropForeignKey
ALTER TABLE "assessment_evidences" DROP CONSTRAINT "assessment_evidences_homeworkSubmissionId_fkey";

-- DropForeignKey
ALTER TABLE "assessment_evidences" DROP CONSTRAINT "assessment_evidences_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "competencies" DROP CONSTRAINT "competencies_conceptId_fkey";

-- DropForeignKey
ALTER TABLE "competency_masteries" DROP CONSTRAINT "competency_masteries_competencyId_fkey";

-- DropForeignKey
ALTER TABLE "competency_masteries" DROP CONSTRAINT "competency_masteries_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "mastery_status_changes" DROP CONSTRAINT "mastery_status_changes_competencyId_fkey";

-- DropForeignKey
ALTER TABLE "mastery_status_changes" DROP CONSTRAINT "mastery_status_changes_studentProfileId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_assessments" DROP CONSTRAINT "rubric_assessments_evaluatorId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_assessments" DROP CONSTRAINT "rubric_assessments_evidenceId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_assessments" DROP CONSTRAINT "rubric_assessments_rubricId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_criteria" DROP CONSTRAINT "rubric_criteria_rubricId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_criterion_ratings" DROP CONSTRAINT "rubric_criterion_ratings_assessmentId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_criterion_ratings" DROP CONSTRAINT "rubric_criterion_ratings_criterionId_fkey";

-- DropForeignKey
ALTER TABLE "rubric_levels" DROP CONSTRAINT "rubric_levels_criterionId_fkey";

-- DropForeignKey
ALTER TABLE "rubrics" DROP CONSTRAINT "rubrics_competencyId_fkey";

-- DropTable
DROP TABLE "assessment_evidences";

-- DropTable
DROP TABLE "competencies";

-- DropTable
DROP TABLE "competency_masteries";

-- DropTable
DROP TABLE "mastery_status_changes";

-- DropTable
DROP TABLE "rubric_assessments";

-- DropTable
DROP TABLE "rubric_criteria";

-- DropTable
DROP TABLE "rubric_criterion_ratings";

-- DropTable
DROP TABLE "rubric_levels";

-- DropTable
DROP TABLE "rubrics";

-- DropEnum
DROP TYPE "EvidenceSourceType";

-- DropEnum
DROP TYPE "MasteryStatus";

