import { IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsUUID } from 'class-validator';
import { PlacementStatus } from '@prisma/client';

export class CreatePlacementDto {
  @IsUUID()
  @IsNotEmpty()
  studentProfileId: string;

  @IsUUID()
  @IsNotEmpty()
  classSectionId: string;

  @IsUUID()
  @IsNotEmpty()
  academicYearId: string;

  @IsEnum(PlacementStatus)
  @IsOptional()
  status?: PlacementStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdatePlacementDto {
  @IsEnum(PlacementStatus)
  @IsOptional()
  status?: PlacementStatus;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
