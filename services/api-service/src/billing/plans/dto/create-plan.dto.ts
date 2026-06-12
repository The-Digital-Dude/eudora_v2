import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceMonthly: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceAnnual: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  stripePriceIdMonthly?: string;

  @IsString()
  @IsOptional()
  stripePriceIdAnnual?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxStudents?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxCampuses?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  maxPrograms?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
