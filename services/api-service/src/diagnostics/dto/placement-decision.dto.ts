import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlacementRecStatus } from '@prisma/client';

export class PlacementDecisionDto {
  @IsEnum(PlacementRecStatus)
  status: PlacementRecStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

export class ListPlacementRecommendationsQueryDto {
  @IsOptional()
  studentProfileId?: string;

  @IsOptional()
  leadId?: string;

  @IsOptional()
  @IsEnum(PlacementRecStatus)
  status?: PlacementRecStatus;
}
