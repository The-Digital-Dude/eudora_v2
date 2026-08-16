import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DayOfWeek,
  TimetableStatus,
  TimetableSlotStatus,
} from '@prisma/client';

export class CreateTimetableDto {
  @IsString()
  academicYearId: string;

  @IsString()
  @IsOptional()
  termId?: string;

  @IsString()
  @IsOptional()
  classSectionId?: string;

  @IsString()
  name: string;

  @IsDateString()
  effectiveFrom: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}

export class UpdateTimetableDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(TimetableStatus)
  @IsOptional()
  status?: TimetableStatus;

  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;
}

export class CreateTimetableSlotDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsInt()
  @Min(0)
  periodIndex: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  startTimeMinutes: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  endTimeMinutes: number;

  @IsString()
  @IsOptional()
  room?: string;

  @IsString()
  classSectionId: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  teacherProfileId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTimetableSlotDto {
  @IsEnum(DayOfWeek)
  @IsOptional()
  dayOfWeek?: DayOfWeek;

  @IsInt()
  @Min(0)
  @IsOptional()
  periodIndex?: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  startTimeMinutes?: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  @IsOptional()
  endTimeMinutes?: number;

  @IsString()
  @IsOptional()
  room?: string;

  @IsString()
  @IsOptional()
  classSectionId?: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  teacherProfileId?: string;

  @IsEnum(TimetableSlotStatus)
  @IsOptional()
  status?: TimetableSlotStatus;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpsertTimetableSlotDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsInt()
  @Min(0)
  periodIndex: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  startTimeMinutes: number;

  @IsInt()
  @Min(0)
  @Max(1440)
  endTimeMinutes: number;

  @IsString()
  @IsOptional()
  room?: string;

  @IsString()
  classSectionId: string;

  @IsString()
  @IsOptional()
  batchId?: string;

  @IsString()
  @IsOptional()
  teacherProfileId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkUpsertSlotsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertTimetableSlotDto)
  slots: UpsertTimetableSlotDto[];
}
