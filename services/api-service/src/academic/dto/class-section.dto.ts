import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ClassStatus } from '@prisma/client';

export class CreateClassSectionDto {
  @IsString()
  @IsNotEmpty()
  programId: string;

  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  classroom?: string;

  @IsEnum(ClassStatus)
  @IsOptional()
  status?: ClassStatus;
}

export class UpdateClassSectionDto {
  @IsString()
  @IsOptional()
  programId?: string;

  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  class?: string;

  @IsString()
  @IsOptional()
  classroom?: string;

  @IsEnum(ClassStatus)
  @IsOptional()
  status?: ClassStatus;
}
