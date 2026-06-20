import { IsOptional, IsString, IsEnum } from 'class-validator';
import { TeacherStatus } from '@prisma/client';

export class UpdateTeacherDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  employeeCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @IsEnum(TeacherStatus)
  @IsOptional()
  status?: TeacherStatus;
}
