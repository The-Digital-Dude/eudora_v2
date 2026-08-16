import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class GrantEntitlementDto {
  @IsUUID()
  studentProfileId: string;

  /** Exactly one of programId / courseId — validated in the controller so the
   * error is a 400 rather than a database CHECK violation. */
  @IsOptional()
  @IsUUID()
  programId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  /** Omit for permanent access (self-paced, fully paid). */
  @IsOptional()
  @IsDateString()
  accessExpiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class RevokeEntitlementDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
