import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, {
    message: 'New password must be at least 10 characters long',
  })
  @MaxLength(72, {
    message: 'New password must be at most 72 characters long',
  })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'New password must include lowercase, uppercase, and number characters',
  })
  newPassword: string;
}
