import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SubmitHomeworkDto {
  @IsString()
  @IsNotEmpty()
  homeworkId: string;

  @IsString()
  @IsNotEmpty()
  content: string; // The submitted text/links
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
