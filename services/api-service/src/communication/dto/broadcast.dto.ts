import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Note what is absent: `status` and `recipientCount`.
 *
 * The client used to send both — a hardcoded "SENT" and
 * `Math.floor(Math.random() * 50) + 12` — and the server stored them
 * verbatim, so the broadcast log displayed an invented number as fact. They
 * are server-owned now, and neither is something a caller gets to assert.
 */
export class CreateBroadcastDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  sender?: string;
}
