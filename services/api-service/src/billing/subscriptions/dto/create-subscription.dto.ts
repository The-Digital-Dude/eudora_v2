import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { PlanInterval } from '@prisma/client';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  campusId: string;

  @IsString()
  @IsNotEmpty()
  planId: string;

  @IsEnum(PlanInterval)
  @IsOptional()
  interval?: PlanInterval;
}
