import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCampusCourseDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateCampusCourseDto {
  @IsBoolean()
  @IsNotEmpty()
  enabled: boolean;
}
