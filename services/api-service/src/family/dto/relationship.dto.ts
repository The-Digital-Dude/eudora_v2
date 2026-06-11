import { IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { RelationshipType } from '@prisma/client';

export class CreateRelationshipDto {
  @IsUUID()
  @IsNotEmpty()
  guardianProfileId: string;

  @IsUUID()
  @IsNotEmpty()
  studentProfileId: string;

  @IsEnum(RelationshipType)
  @IsNotEmpty()
  relationshipType: RelationshipType;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  hasFinancialResponsibility?: boolean;

  @IsBoolean()
  @IsOptional()
  hasAcademicAccess?: boolean;

  @IsBoolean()
  @IsOptional()
  hasEmergencyContact?: boolean;
}

export class UpdateRelationshipDto {
  @IsEnum(RelationshipType)
  @IsOptional()
  relationshipType?: RelationshipType;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsBoolean()
  @IsOptional()
  hasFinancialResponsibility?: boolean;

  @IsBoolean()
  @IsOptional()
  hasAcademicAccess?: boolean;

  @IsBoolean()
  @IsOptional()
  hasEmergencyContact?: boolean;
}
