import { IsString, Length } from 'class-validator';

export class ApproveDevicePairingDto {
  @IsString()
  @Length(6, 12)
  code: string;
}
