import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsUrl,
  MaxLength,
  ValidateIf,
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

  /**
   * Where the class actually meets — a Zoom, Meet or Teams link the teacher
   * already has.
   *
   * Optional because a session can be scheduled before anyone has made the
   * room. Until it is set the family sees the date and no way in, which is the
   * state every live class shipped in before this field existed.
   */
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  @MaxLength(2000)
  joinUrl?: string;
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

  /**
   * Send a URL to attach or replace the meeting link, or an empty string to
   * remove it. Omit the field to leave it untouched — a reschedule should not
   * silently drop the room.
   */
  @ValidateIf((_o, value) => value !== '')
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @IsOptional()
  @MaxLength(2000)
  joinUrl?: string;
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
