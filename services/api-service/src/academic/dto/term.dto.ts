import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { CourseTermStatus } from '@prisma/client';

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  academicYearId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsEnum(CourseTermStatus)
  @IsOptional()
  status?: CourseTermStatus;
}

export class UpdateTermDto {
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(CourseTermStatus)
  @IsOptional()
  status?: CourseTermStatus;
}
