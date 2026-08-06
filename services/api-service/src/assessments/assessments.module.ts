import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GradebookModule } from '../gradebook/gradebook.module';
import { FamilyModule } from '../family/family.module';
import { AssessmentSetupController } from './assessment-setup.controller';
import { AssessmentSetupService } from './assessment-setup.service';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { StudentResponsesController } from './student-responses.controller';
import { StudentResponsesService } from './student-responses.service';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [PrismaModule, GradebookModule, FamilyModule],
  controllers: [
    AssessmentSetupController,
    SubjectsController,
    QuestionsController,
    AssignmentsController,
    AttemptsController,
    StudentResponsesController,
  ],
  providers: [
    AssessmentSetupService,
    SubjectsService,
    QuestionsService,
    AssignmentsService,
    AttemptsService,
    StudentResponsesService,
  ],
  exports: [
    AssessmentSetupService,
    SubjectsService,
    QuestionsService,
    AssignmentsService,
    AttemptsService,
    StudentResponsesService,
  ],
})
export class AssessmentsModule {}
