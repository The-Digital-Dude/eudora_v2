import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RubricLevelDto {
  @IsNumber()
  @Min(0)
  level: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  score: number;
}

export class RubricCriterionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0.1)
  @IsOptional()
  weight?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricLevelDto)
  levels: RubricLevelDto[];
}

export class CreateRubricDto {
  @IsString()
  @IsNotEmpty()
  competencyId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricCriterionDto)
  criteria: RubricCriterionDto[];
}
