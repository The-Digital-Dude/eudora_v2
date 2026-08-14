import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { NextActionType, NextActionStatus } from '@prisma/client';

export class CreateNextActionDto {
  @IsString()
  @IsOptional()
  gapId?: string;

  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsString()
  @IsNotEmpty()
  competencyId: string;

  @IsEnum(NextActionType)
  actionType: NextActionType;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsNotEmpty()
  ownerUserId: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsOptional()
  reassessmentPlan?: string;
}

export class UpdateNextActionDto {
  @IsEnum(NextActionStatus)
  @IsOptional()
  status?: NextActionStatus;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  reassessmentPlan?: string;
}

export class ListNextActionsQueryDto {
  @IsOptional()
  ownerUserId?: string;

  @IsOptional()
  studentProfileId?: string;

  @IsOptional()
  @IsEnum(NextActionStatus)
  status?: NextActionStatus;

  @IsOptional()
  search?: string;

  @IsOptional()
  page?: string;

  @IsOptional()
  limit?: string;

  @IsOptional()
  sortBy?: string;

  @IsOptional()
  sortOrder?: string;
}
