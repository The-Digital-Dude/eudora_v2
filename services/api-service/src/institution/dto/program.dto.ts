import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { EducationalInstitutionStatus } from '@prisma/client';

export class CreateProgramDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}

export class UpdateProgramDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}
