import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsUUID,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitHomeworkDto {
  @IsString()
  @IsNotEmpty()
  homeworkId: string;

  @IsString()
  @IsOptional()
  content?: string; // Optional submitted text

  /**
   * Files already uploaded through POST /homework/attachments, referenced by
   * id. Never a URL: the caller does not get to say where a learner's work
   * lives, which is exactly what the old `attachmentUrls` array allowed.
   */
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  attachmentFileIds?: string[];
}

export class GradeSubmissionDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pointsEarned: number;

  @IsString()
  @IsOptional()
  feedback?: string;
}
