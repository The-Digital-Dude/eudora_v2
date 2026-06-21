import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
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

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentUrls?: string[]; // Optional submission attachments
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
