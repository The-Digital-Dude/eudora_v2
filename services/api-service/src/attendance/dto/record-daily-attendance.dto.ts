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

export class SingleDailyAttendanceDto {
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

export class RecordDailyAttendanceDto {
  @IsString()
  @IsNotEmpty()
  classSectionId: string;

  @IsString()
  @IsNotEmpty()
  date: string; // YYYY-MM-DD

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SingleDailyAttendanceDto)
  records: SingleDailyAttendanceDto[];
}
