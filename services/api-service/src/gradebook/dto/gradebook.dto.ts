import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GradeBookEntryStatus } from '@prisma/client';

export class CreateManualGradeDto {
  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  classSectionId?: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  pointsEarned?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pointsPossible: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsEnum(GradeBookEntryStatus)
  @IsOptional()
  status?: GradeBookEntryStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  sourceId?: string;
}

export class UpdateGradeEntryDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  pointsEarned?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  pointsPossible?: number;

  @IsEnum(GradeBookEntryStatus)
  @IsOptional()
  status?: GradeBookEntryStatus;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkUpsertGradeEntryDto {
  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  classSectionId?: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  pointsEarned?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pointsPossible: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  weight?: number;

  @IsEnum(GradeBookEntryStatus)
  @IsOptional()
  status?: GradeBookEntryStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  sourceId?: string;
}

export class BulkUpsertGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpsertGradeEntryDto)
  entries: BulkUpsertGradeEntryDto[];
}
