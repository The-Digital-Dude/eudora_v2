import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsEmail,
  IsUUID,
} from 'class-validator';
import { GuardianStatus } from '@prisma/client';

export class CreateGuardianProfileDto {
  // Optional at the DTO-validation layer, not just in practice: the
  // controller forces this to the caller's own id for a GUARDIAN-only
  // caller (family.controller.ts:createGuardianProfile), but that override
  // runs *after* class-validator, so a self-service client that correctly
  // omits userId (it has no business supplying one) was rejected before the
  // override ever ran. Admin/super-admin callers still must supply a real
  // one — nothing defaults it for them.
  @IsUUID()
  @IsOptional()
  userId?: string;

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
