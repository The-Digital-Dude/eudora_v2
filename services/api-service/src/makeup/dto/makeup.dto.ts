import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUUID,
} from 'class-validator';

export class CreateMakeupRequestDto {
  @IsUUID()
  @IsNotEmpty()
  studentProfileId: string;

  @IsUUID()
  @IsNotEmpty()
  batchId: string;

  @IsDateString()
  @IsNotEmpty()
  originalDate: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class UpdateMakeupRequestDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;
}
