import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { Gender, StudentStatus } from '@prisma/client';

export class CreateStudentProfileDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString()
  @IsNotEmpty()
  birthDate: string;

  @IsEnum(Gender)
  @IsNotEmpty()
  gender: Gender;

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}

/**
 * Deliberately a distinct, narrower DTO from `UpdateStudentProfileDto` — a
 * student updating their own profile may only touch the profile-completion
 * contact fields, never `fullName`/`birthDate`/`gender`/`status`.
 */
export class UpdateMyStudentProfileDto {
  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;
}

export class UpdateStudentProfileDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;
}
