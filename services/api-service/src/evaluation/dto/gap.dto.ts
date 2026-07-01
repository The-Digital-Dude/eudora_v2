import { IsEnum, IsOptional } from 'class-validator';
import { GapStatus } from '@prisma/client';

export class UpdateGapDto {
  @IsEnum(GapStatus)
  status: GapStatus;
}

export class ListGapsQueryDto {
  @IsOptional()
  studentProfileId?: string;

  @IsOptional()
  competencyId?: string;

  @IsOptional()
  @IsEnum(GapStatus)
  status?: GapStatus;
}
