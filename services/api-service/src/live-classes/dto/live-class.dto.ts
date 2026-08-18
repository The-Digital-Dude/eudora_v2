import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { LiveClassStatus } from '@prisma/client';

export class CreateLiveClassDto {
  /**
   * The cohort that meets. A live class is scheduled per batch, not per
   * course — the same chapter item resolves to a different meeting for
   * every batch that buys the course.
   */
  @IsString()
  @IsNotEmpty()
  batchId: string;

  /**
   * The `ModuleItem(kind: LIVE_CLASS)` this meeting fulfils, if any. Null for
   * ad-hoc sessions (a make-up class, an extra revision hour) that are not
   * part of the published outline.
   */
  @IsString()
  @IsOptional()
  moduleItemId?: string;

  /** Falls back to the linked module item's title when omitted. */
  @IsString()
  @IsOptional()
  topic?: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class RescheduleLiveClassDto {
  @IsString()
  @IsOptional()
  topic?: string;

  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;
}

export class ListLiveClassesQueryDto {
  @IsOptional()
  batchId?: string;

  @IsOptional()
  moduleItemId?: string;

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
