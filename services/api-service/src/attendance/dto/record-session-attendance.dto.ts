import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class CreateSessionDto {
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsString()
  @IsOptional()
  startTime?: string; // ISO or hh:mm

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  topic?: string;
}

export class SingleSessionAttendanceDto {
  @IsString()
  @IsNotEmpty()
  studentProfileId: string;

  @IsEnum(AttendanceStatus)
  @IsNotEmpty()
  status: AttendanceStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}

export class RecordSessionAttendanceDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleSessionAttendanceDto)
  records: SingleSessionAttendanceDto[];
}
