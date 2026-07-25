import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PlanInterval } from '@prisma/client';

export class ChangePlanDto {
  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(PlanInterval)
  @IsOptional()
  interval?: PlanInterval;
}
