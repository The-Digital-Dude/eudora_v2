import { IsString, IsNotEmpty, IsOptional, IsEnum, IsEmail, IsUUID } from 'class-validator';
import { GuardianStatus } from '@prisma/client';

export class CreateGuardianProfileDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(GuardianStatus)
  @IsOptional()
  status?: GuardianStatus;
}

export class UpdateGuardianProfileDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  fullName?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(GuardianStatus)
  @IsOptional()
  status?: GuardianStatus;
}
