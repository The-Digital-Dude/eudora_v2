/**
 * Mirrors `RegisterDto` in api-service (`src/auth/dto/register.dto.ts`) so a
 * weak password fails in the form, not as a bare 400 the user cannot act on.
 * Keep these two in step by hand — there is no shared package between the two
 * projects to enforce it, and a client rule looser than the server's just
 * means a confusing round trip; a client rule *stricter* than the server's
 * would reject passwords the server would have accepted.
 */
const MIN_LENGTH = 10;
const MAX_LENGTH = 72;
const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;

export interface PasswordRuleCheck {
  label: string;
  met: boolean;
}

/** For live checklist-style feedback under the password field. */
export function passwordRuleChecks(password: string): PasswordRuleCheck[] {
  return [
    { label: 'At least 10 characters', met: password.length >= MIN_LENGTH },
    { label: 'A lowercase letter', met: HAS_LOWER.test(password) },
    { label: 'An uppercase letter', met: HAS_UPPER.test(password) },
    { label: 'A number', met: HAS_DIGIT.test(password) },
  ];
}

/** For the pre-submit gate. Null means the password is acceptable. */
export function passwordError(password: string): string | null {
  if (password.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters long.`;
  }
  // bcrypt silently ignores bytes beyond 72, matching the server's own reason
  // for capping here: what the user typed should be what protects the account.
  if (password.length > MAX_LENGTH) {
    return `Password must be at most ${MAX_LENGTH} characters long.`;
  }
  if (!HAS_LOWER.test(password) || !HAS_UPPER.test(password) || !HAS_DIGIT.test(password)) {
    return 'Password must include lowercase, uppercase, and number characters.';
  }
  return null;
}
