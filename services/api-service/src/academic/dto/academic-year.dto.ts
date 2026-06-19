import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { EducationalInstitutionStatus } from '@prisma/client';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}

export class UpdateAcademicYearDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}
