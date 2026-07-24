import { AuthProvider } from '@prisma/client';

/**
 * Provider-agnostic view of a verified federated identity. Each provider
 * verifier is responsible for producing this; everything downstream of it is
 * shared, so linking and role rules live in exactly one place.
 */
export interface NormalizedOAuthProfile {
  provider: AuthProvider;
  /** Provider's stable subject identifier (`sub`). Never the email. */
  providerUserId: string;
  email: string;
  /**
   * Whether the provider asserts the email is verified. Auto-linking to an
   * existing password account is gated on this — see linkOrCreateOAuthUser.
   */
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
  /** Apple "Hide My Email" relay address; mail to it may bounce. */
  isPrivateRelay?: boolean;
}

/**
 * Roles a user may obtain by signing in with a provider for the first time.
 * TEACHER, STAFF, ADMIN and STUDENT are deliberately absent: those accounts are
 * provisioned by an administrator, and OAuth may only ever *link* to one that
 * already exists. Without this allowlist a caller could self-assign a
 * privileged role via the request body.
 */
export const SELF_SIGNUP_ROLES = ['USER', 'GUARDIAN'] as const;

export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

export function resolveSelfSignupRole(
  roleHint?: string | null,
): SelfSignupRole {
  const candidate = (roleHint ?? '').trim().toUpperCase();
  return (SELF_SIGNUP_ROLES as readonly string[]).includes(candidate)
    ? (candidate as SelfSignupRole)
    : 'USER';
}
