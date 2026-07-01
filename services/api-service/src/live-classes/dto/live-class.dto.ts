import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { LiveClassStatus } from '@prisma/client';

export class CreateLiveClassDto {
  @IsString()
  @IsNotEmpty()
  classSectionId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  scheduledStartAt: string;

  @IsDateString()
  scheduledEndAt: string;
}

export class RescheduleLiveClassDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsDateString()
  @IsOptional()
  scheduledStartAt?: string;

  @IsDateString()
  @IsOptional()
  scheduledEndAt?: string;
}

export class ListLiveClassesQueryDto {
  @IsOptional()
  classSectionId?: string;

  @IsOptional()
  teacherUserId?: string;

  @IsOptional()
  @IsEnum(LiveClassStatus)
  status?: LiveClassStatus;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;
}
