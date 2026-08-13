import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateCourseAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  courseId: string;
}
