import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  dueDate: string; // ISO DateTime string

  @IsNumber()
  @IsPositive()
  @Min(1)
  @Type(() => Number)
  maxPoints: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentUrls?: string[];
}

export class UpdateHomeworkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  dueDate?: string; // ISO DateTime string

  @IsNumber()
  @IsPositive()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  maxPoints?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachmentUrls?: string[];
}
