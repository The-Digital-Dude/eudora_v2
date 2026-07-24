import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PlanInterval } from '@prisma/client';

export class CreateCheckoutSessionDto {
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
