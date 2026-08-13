import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail } from 'class-validator';
import { EducationalInstitutionStatus } from '@prisma/client';

export class CreateCampusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

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
  code?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  representative?: string;

  @IsEnum(EducationalInstitutionStatus)
  @IsOptional()
  status?: EducationalInstitutionStatus;
}
