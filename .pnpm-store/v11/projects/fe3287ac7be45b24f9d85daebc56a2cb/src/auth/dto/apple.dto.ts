import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Query params on GET /auth/apple/start. */
export class AppleAuthorizeDto {
  @IsString()
  @IsOptional()
  role?: string;
}

/**
 * Apple's form_post body. `user` is a JSON string carrying the display name and
 * is present only on the user's first authorization.
 */
export class AppleCallbackDto {
  // Optional because a user who cancels at Apple's consent screen gets a body
  // with `error` and `state` but no `code`; rejecting it here would 400 before
  // the controller can redirect them somewhere useful.
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsOptional()
  user?: string;

  @IsString()
  @IsOptional()
  error?: string;
}
