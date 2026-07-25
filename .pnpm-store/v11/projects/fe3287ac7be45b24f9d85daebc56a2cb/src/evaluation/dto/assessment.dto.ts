import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EvidenceSourceType } from '@prisma/client';

export class RecordEvidenceDto {
  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsNotEmpty()
  competencyId: string;

  @IsEnum(EvidenceSourceType)
  @IsNotEmpty()
  sourceType: EvidenceSourceType;

  @IsString()
  @IsOptional()
  homeworkSubmissionId?: string;

  @IsOptional()
  metadata?: any;
}

export class CriterionRatingInputDto {
  @IsString()
  @IsNotEmpty()
  criterionId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  selectedLevel: number;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class CreateAssessmentDto {
  @IsString()
  @IsNotEmpty()
  rubricId: string;

  @IsString()
  @IsNotEmpty()
  evidenceId: string;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionRatingInputDto)
  ratings: CriterionRatingInputDto[];
}
