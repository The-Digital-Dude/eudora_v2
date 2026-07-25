"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useLoginMutation } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import { getPrimaryRole, getRoleHome } from "@/lib/access-control";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const googleOAuthConfigured = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// useGoogleLogin() must only ever mount inside a GoogleOAuthProvider (see
// providers.tsx, which skips that provider when no client ID is configured)
// — isolated here so LoginPage can render this conditionally as a whole
// component instead of conditionally calling a hook.
function GoogleLoginButton({
  loginAs,
  disabled,
  onLoggedIn,
}: {
  loginAs: "student" | "guardian" | "admin";
  disabled: boolean;
  onLoggedIn: (user: unknown) => void;
}) {
  const dispatch = useAppDispatch();
  const [googleLoginMutation] = useGoogleLoginMutation();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const loggedInUser = await googleLoginMutation({
          token: tokenResponse.access_token,
          role: loginAs === "guardian" ? "GUARDIAN" : "USER",
        }).unwrap();
        dispatch(login({ user: loggedInUser, token: null }));
        toast.success("Successfully logged in with Google!");
        onLoggedIn(loggedInUser);
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
      Google
    </button>
  );
}

function GoogleIcon() {
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

const loginSchema = z.object({
  email: z.string().min(1, "Email address is required").email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginAs, setLoginAs] = useState<"student" | "guardian" | "admin">("student");

  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user) as any;
  const [loginMutation, { isLoading: loading }] = useLoginMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const checkRedirect = useCallback(
    (u: any) => {
      if (!u) return;

      // Every role lands on its purpose-built home: admin -> /dashboard,
      // teacher -> /teacher, guardian -> /parent, student -> /student.
      if (getPrimaryRole(u) === "GUARDIAN") {
        const hasProfile = !!u.guardianProfile;
        const hasStudents =
          hasProfile &&
          Array.isArray(u.guardianProfile.students) &&
          u.guardianProfile.students.length > 0;
        router.replace(!hasProfile || !hasStudents ? "/complete-profile" : "/parent");
        return;
      }
      router.replace(getRoleHome(u));
    },
    [router],
  );

  useEffect(() => {
    if (isAuthenticated && user) {
      checkRedirect(user);
    }
  }, [isAuthenticated, user, checkRedirect]);

  // The Apple callback cannot render a toast itself — it is a server-side
  // redirect — so it hands back a fixed slug for us to translate here.
  // Read from location rather than useSearchParams: the latter would force the
  // whole page behind a Suspense boundary to keep prerendering working.
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;

    const messages: Record<string, string> = {
      apple_cancelled: "Apple sign-in was cancelled.",
      apple_rejected:
        "Apple sign-in was rejected. If this email already has an account, sign in with your password first.",
      apple_failed: "Apple sign-in failed. Please try again.",
    };
    if (messages[error]) {
      toast.error(messages[error]);
      router.replace("/login");
    }
  }, [router]);

  const handleLogin = async (values: LoginFormValues) => {
    try {
      const loggedInUser = await loginMutation({
        email: values.email,
        password: values.password,
      }).unwrap();
      dispatch(login({ user: loggedInUser, token: null }));
      toast.success("Welcome back! Successfully logged in.");
      checkRedirect(loggedInUser);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.data?.message || "Invalid email or password.";
      toast.error(errMsg);
    }
  };

  return (
    <div className="dot-grid bg-background text-foreground relative flex min-h-screen flex-col items-center justify-center px-4 py-12 font-sans select-none">
      <div className="animate-fade-in-up w-full max-w-[440px] space-y-8">
        {/* Brand Logo */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-foreground text-background rounded-xl p-2.5 shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-foreground text-xl font-bold tracking-tight">
            Eudora
          </span>
        </div>

        {/* Login Card */}
        <div className="border-border bg-card rounded-3xl border p-8 shadow-[0_24px_60px_color-mix(in_oklch,var(--foreground)_4%,transparent),0_4px_12px_color-mix(in_oklch,var(--foreground)_2%,transparent)] md:p-10">
          {/* Header */}
          <div className="mb-8 space-y-2 text-center">
            <h1 className="font-display text-card-foreground text-2xl font-bold tracking-tight">
              Sign in to your account
            </h1>
            <p className="text-muted-foreground mx-auto max-w-[280px] text-xs leading-normal">
              Enter your email and password below to access your classrooms and learning paths.
            </p>
          </div>

          {/* Role Switcher */}
          <div className="bg-muted mb-6 flex gap-1 rounded-xl p-1">
            {(["student", "guardian", "admin"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setLoginAs(role)}
                className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs font-semibold capitalize transition-all select-none ${
                  loginAs === role
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {/* Social Logins */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="border-border bg-card text-card-foreground hover:bg-accent flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-98 disabled:opacity-50"
            >
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
              Google
            </button>
            {/*
              Apple is a plain navigation, not a fetch: the flow is a
              server-side redirect that ends in a cross-site form_post back to
              /api/auth/apple/callback, which sets the session cookies itself.
            */}
            <a
              href={`/api/auth/apple/start?role=${loginAs === "guardian" ? "GUARDIAN" : "USER"}`}
              className="border-border bg-card text-card-foreground hover:bg-accent flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-98"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.55.02-2.98.9-3.77 2.28-1.61 2.79-.41 6.92 1.15 9.18.76 1.11 1.67 2.35 2.87 2.31 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.13 2.78-2.24.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.41-.93-2.42-3.69zM14.79 5.4c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.77-.96 2.81 1.01.08 2.05-.51 2.69-1.28z" />
              </svg>
              Apple
            </a>
          </div>

          {/* Divider */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t"></div>
            </div>
            <span className="bg-card text-muted-foreground relative px-3 text-[10px] font-semibold tracking-widest uppercase">
              Or continue with
            </span>
          </div>

          {/* Form */}
          <Form {...form}>
            <form className="space-y-5" onSubmit={form.handleSubmit(handleLogin)}>
              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      Email Address
                    </FormLabel>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Mail className="h-4 w-4" />
                      </span>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          autoComplete="email"
                          placeholder="name@company.com"
                          className="cupertino-input h-11 rounded-xl pl-10"
                          disabled={loading}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                        Password
                      </FormLabel>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground cursor-pointer text-[11px] font-semibold transition-colors hover:underline"
                        onClick={() => {
                          /* TODO: forgot password flow */
                        }}
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Lock className="h-4 w-4" />
                      </span>
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className="cupertino-input h-11 rounded-xl pr-10 pl-10"
                          disabled={loading}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Keep me signed in */}
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-y-0 space-x-2.5">
                    <FormControl>
                      <Checkbox
                        id="remember"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel
                      htmlFor="remember"
                      className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-normal select-none"
                    >
                      Keep me signed in
                    </FormLabel>
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button
                type="submit"
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="mr-2 -ml-1 h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="text-muted-foreground text-center text-xs">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-foreground font-semibold transition-colors hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
