import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { EducationalInstitutionStatus } from '@prisma/client';

export class CreateCampusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  representative?: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}

export class UpdateCampusDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  representative?: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}
