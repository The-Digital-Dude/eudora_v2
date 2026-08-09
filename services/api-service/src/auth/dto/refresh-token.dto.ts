import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Native clients have no cookie jar to carry the refresh token, so they present
 * it in the body instead.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
