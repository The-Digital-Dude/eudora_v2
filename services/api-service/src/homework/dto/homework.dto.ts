import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHomeworkDto {
  @IsString()
  @IsNotEmpty()
  courseClassId: string;

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

  @IsString()
  @IsOptional()
  attachmentUrl?: string;
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

  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}
