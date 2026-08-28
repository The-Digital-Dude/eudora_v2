import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  // Same rules as ChangePasswordDto — a password set by reset must not be
  // weaker than one set while signed in.
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
