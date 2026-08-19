import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AvailableCoursesQueryDto {
  /** Matched against course title, case-insensitively, by CatalogService. */
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  // Capped so a hand-edited query string can't ask for the whole catalogue in
  // one response; the service defaults to 24 when this is omitted.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
