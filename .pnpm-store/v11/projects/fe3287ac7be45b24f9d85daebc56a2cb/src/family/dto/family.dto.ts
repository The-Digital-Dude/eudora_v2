import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { FamilyStatus } from '@prisma/client';

export class CreateFamilyDto {
  @IsString()
  @IsNotEmpty()
  householdName: string;

  @IsEnum(FamilyStatus)
  @IsOptional()
  status?: FamilyStatus;
}

export class UpdateFamilyDto {
  @IsString()
  @IsOptional()
  householdName?: string;

  @IsEnum(FamilyStatus)
  @IsOptional()
  status?: FamilyStatus;
}

export class AddFamilyMemberDto {
  @IsUUID()
  @IsOptional()
  studentProfileId?: string;

  @IsUUID()
  @IsOptional()
  guardianProfileId?: string;
}
