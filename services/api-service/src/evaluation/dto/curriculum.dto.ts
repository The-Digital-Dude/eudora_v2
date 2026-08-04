import { IsEnum, IsInt, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ConceptKind } from '@prisma/client';

export class CreateConceptDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsEnum(ConceptKind)
  @IsOptional()
  kind?: ConceptKind;

  @IsInt()
  @IsOptional()
  passThresholdPercent?: number;
}

export class UpdateConceptDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  courseId?: string | null;

  @IsInt()
  @IsOptional()
  sortOrder?: number;

  @IsEnum(ConceptKind)
  @IsOptional()
  kind?: ConceptKind;

  @IsInt()
  @IsOptional()
  passThresholdPercent?: number;
}

export class CreateCompetencyDto {
  @IsString()
  @IsNotEmpty()
  conceptId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
