import { IsString, IsNotEmpty } from 'class-validator';

export class PollDevicePairingDto {
  @IsString()
  @IsNotEmpty()
  deviceCode: string;
}
