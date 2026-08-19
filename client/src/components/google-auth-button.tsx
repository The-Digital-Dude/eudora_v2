"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { toast } from "sonner";

import { useGoogleLoginMutation } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import { useAppDispatch } from "@/store/hooks";

/**
 * Whether a client ID is configured at all. Both call sites render a disabled
 * placeholder when it is not, rather than a button that fails on click.
 */
export const googleOAuthConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * Google sign-in, shared by /login and /register.
 *
 * It lived only on the login page, so /register shipped a Google button that
 * was pure decoration — `type="button"` with no handler — next to a GitHub one
 * for a provider the API does not implement. Signing up with Google was
 * therefore impossible from the page whose entire job is signing up.
 *
 * useGoogleLogin() must only ever mount inside a GoogleOAuthProvider (see
 * providers.tsx, which skips that provider when no client ID is configured),
 * which is why this is a whole component the caller renders conditionally
 * rather than a hook called behind an `if`.
 */
export function GoogleAuthButton({
  roleHint,
  disabled,
  onAuthenticated,
  label = "Google",
}: {
  /**
   * Which account type a *first* sign-in creates. Ignored when the Google
   * identity already resolves to a user, and re-checked server-side against
   * the self-signup allowlist either way — so this is a hint, not a grant.
   */
  roleHint: "GUARDIAN" | "USER";
  disabled?: boolean;
  onAuthenticated: (user: unknown) => void;
  label?: string;
}) {
  const dispatch = useAppDispatch();
  const [googleLoginMutation] = useGoogleLoginMutation();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const authedUser = await googleLoginMutation({
          token: tokenResponse.access_token,
          role: roleHint,
        }).unwrap();
        dispatch(login({ user: authedUser, csrfToken: (authedUser as any).csrfToken }));
        toast.success("Successfully signed in with Google!");
        onAuthenticated(authedUser);
      } catch (err: any) {
        console.error(err);
        const errMsg = err?.data?.message || "Google authentication failed. Please try again.";
        toast.error(errMsg);
      }
    },
    onError: () => {
      toast.error("Google authentication failed. Please try again.");
    },
  });

  return (
    <button
      type="button"
      onClick={() => handleGoogleLogin()}
      disabled={disabled}
      className="border-border bg-card text-card-foreground hover:bg-accent flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-98 disabled:opacity-50"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

/** The disabled twin, for when no client ID is configured. */
export function GoogleAuthButtonUnavailable({ label = "Google" }: { label?: string }) {
  return (
    <button
      type="button"
      disabled
      title="Google sign-in is not configured."
      className="border-border bg-card text-card-foreground flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold opacity-50 shadow-sm"
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

export function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
