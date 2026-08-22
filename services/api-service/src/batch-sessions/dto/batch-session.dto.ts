import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { DayOfWeek } from '@prisma/client';

/** The weekly pattern, set on the batch and used to generate sessions. */
export class UpdateMeetingPatternDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(DayOfWeek, { each: true })
  meetingDays: DayOfWeek[];

  /** Minutes past midnight — 16:00 is 960. */
  @IsInt()
  @Min(0)
  @Max(24 * 60 - 1)
  meetingStartMinutes: number;

  @IsInt()
  @Min(5)
  @Max(24 * 60)
  meetingDurationMinutes: number;
}

export class GenerateSessionsDto {
  /** Defaults to the batch's own startDate. */
  @IsDateString()
  @IsOptional()
  from?: string;

  /** Defaults to the batch's own endDate. */
  @IsDateString()
  @IsOptional()
  to?: string;

  /** Applied to every generated session; each can be retitled afterwards. */
  @IsString()
  @IsOptional()
  topic?: string;
}

export class CreateOneOffSessionDto {
  @IsDateString()
  date: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsUUID()
  @IsOptional()
  moduleItemId?: string;
}
