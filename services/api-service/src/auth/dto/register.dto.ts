import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  // bcrypt silently ignores bytes beyond 72; cap length so what the user typed
  // is what actually protects the account.
  @MaxLength(72, { message: 'Password must be at most 72 characters long' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must include lowercase, uppercase, and number characters',
  })
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  /**
   * Which kind of account to create. Deliberately a *hint*: the service runs it
   * through SELF_SIGNUP_ROLES, so anything outside USER/GUARDIAN silently falls
   * back to USER rather than granting a privileged role from the request body.
   * Same treatment the OAuth signup path already gives its roleHint.
   */
  @IsOptional()
  @IsString()
  role?: string;
}
