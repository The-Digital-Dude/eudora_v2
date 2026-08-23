"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  GoogleAuthButton,
  GoogleAuthButtonUnavailable,
  googleOAuthConfigured,
} from "@/components/google-auth-button";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useRegisterMutation } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import { getRoleHome } from "@/lib/access-control";
import { readNextParam, withNext } from "@/lib/safe-next";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email address is required")
      .email("Please enter a valid email address"),
    // Must stay in step with RegisterDto on the API (auth/dto/register.dto.ts).
    // When these drift the form accepts a password the server then rejects, and
    // the user meets a generic 400 instead of inline field errors.
    password: z
      .string()
      .min(10, "Password must be at least 10 characters long")
      // bcrypt silently ignores bytes past 72, so the server caps it there.
      .max(72, "Password must be at most 72 characters long")
      .regex(
        /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must include lowercase, uppercase, and number characters",
      ),
    confirmPassword: z.string().min(1, "Confirm password is required"),
    agree: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms of Service and Privacy Policy",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * What kind of account this signup produces.
 *
 * "parent" is the default and the overwhelming majority: this is a B2C product
 * where an adult buys for a child. "teacher" does NOT create a teacher — it
 * creates an ordinary account and sends the person to an application the
 * operator reviews. Nobody self-grants a role that reads student records.
 */
type AccountType = "parent" | "teacher";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("parent");

  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user) as any;
  const [registerMutation, { isLoading: loading }] = useRegisterMutation();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema as any),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      agree: false,
    },
  });

  // Carries the checkout destination through registration, so a first-time
  // buyer who signs up mid-purchase is not dumped on a dashboard.
  const [nextParam, setNextParam] = useState<string | null>(null);
  useEffect(() => setNextParam(readNextParam()), []);

  // `?as=teacher` lets the marketing site link straight into the teacher
  // branch. Read from window.location rather than useSearchParams, matching
  // safe-next.ts — it keeps this route prerenderable without a Suspense
  // boundary around the whole form.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("as") === "teacher") {
      setAccountType("teacher");
    }
  }, []);

  /**
   * Where a new account goes once the session exists.
   *
   * A teacher applicant has an ordinary account and nothing to see in any
   * portal yet, so they go to the application form. Everyone else lands on
   * their own portal — which for a guardian is the family panel, already
   * usable because registration created their guardian profile alongside the
   * role. `next` still wins, so a buyer who signed up mid-checkout returns to
   * the purchase they abandoned.
   */
  const destinationFor = (newUser: unknown, type: AccountType) =>
    type === "teacher"
      ? "/apply/teacher"
      : (readNextParam() ?? getRoleHome(newUser as any));

  /**
   * Sends an already-signed-in visitor to where they belong.
   *
   * Deliberately resolved through destinationFor, the same helper the submit
   * handlers use. This effect also fires when signing up flips
   * `isAuthenticated`, so it races every redirect on this page — and when it
   * computed the destination from the role alone it won that race with the
   * wrong answer: a teacher applicant is a plain USER, so it pushed /student
   * over /apply/teacher. Parents never saw it, because for them both answers
   * were /parent. Sharing one helper means the two cannot disagree again,
   * whichever wins.
   */
  useEffect(() => {
    if (isAuthenticated) {
      router.push(destinationFor(user, accountType));
    }
     
  }, [isAuthenticated, user, accountType, router]);

  const handleRegister = async (values: RegisterFormValues) => {
    const nameParts = values.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "User";

    try {
      const user = await registerMutation({
        email: values.email,
        password: values.password,
        firstName,
        lastName,
        // A parent buying for a child gets GUARDIAN; a teacher applicant gets
        // an ordinary account, because TEACHER is granted by review and never
        // by a request body. The server re-checks either against an allowlist,
        // so both are hints rather than grants.
        role: accountType === "teacher" ? "USER" : "GUARDIAN",
      }).unwrap();

      // Automatically sign in locally on register success
      dispatch(login({ user, csrfToken: user.csrfToken }));
      toast.success("Account created successfully!");
      // Straight to the destination rather than via /login: registration
      // already set the session cookies and the line above populated the
      // store, so bouncing through the login page asked people to sign in to
      // an account they were seconds old and already signed into.
      router.push(destinationFor(user, accountType));
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.data?.message || "An error occurred. Please try again.";
      toast.error(errMsg);
    }
  };

  return (
    <div className="dot-grid bg-muted/50 text-foreground relative flex min-h-screen flex-col items-center justify-center px-4 py-12 font-sans select-none">
      {/* Slide-up entrance animated container */}
      <div className="animate-fade-in-up w-full max-w-[440px] space-y-8">
        {/* Brand Logo and Title */}
        <div className="flex flex-col items-center">
          <Link href="/" className="transition-transform hover:scale-105">
            <Image src="/landing/eudora_logo.png" alt="Eudora" width={218} height={72} className="h-11 w-auto" />
          </Link>
        </div>

        {/* Clean Cupertino Card */}
        <div className="border-border/60 bg-card rounded-3xl border p-8 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)] md:p-10">
          {/* Header */}
          <div className="mb-6 space-y-2 text-center">
            <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground mx-auto max-w-[280px] text-xs leading-normal">
              Create a parent account to enrol your child and follow their progress.
            </p>
          </div>

          {/* Account type. Parent first because it is the default and the
              common case; the teacher branch leads to a reviewed application,
              not to a teacher account. */}
          <div className="bg-muted mb-6 flex gap-1 rounded-xl p-1">
            {(
              [
                ["parent", "I am a parent"],
                ["teacher", "I am a teacher"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                aria-pressed={accountType === value}
                className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs font-semibold transition-all select-none ${
                  accountType === value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {accountType === "teacher" && (
            <p className="border-border bg-muted/40 text-muted-foreground mb-6 rounded-xl border p-3 text-[11px] leading-relaxed">
              Create your account first. You will then be asked for your CV as a
              PDF, and we will review your application before your teaching
              access is switched on.
            </p>
          )}

          {/* Google sign-up. There used to be a GitHub button beside this one
              for a provider the API does not implement, and neither did
              anything on click. */}
          <div className="mb-6 grid grid-cols-1 gap-3">
            {googleOAuthConfigured ? (
              <GoogleAuthButton
                roleHint={accountType === "teacher" ? "USER" : "GUARDIAN"}
                disabled={loading}
                onAuthenticated={(newUser) =>
                  router.push(destinationFor(newUser, accountType))
                }
                label="Continue with Google"
              />
            ) : (
              <GoogleAuthButtonUnavailable label="Continue with Google" />
            )}
          </div>

          {/* Separator */}
          <div className="relative mb-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t"></div>
            </div>
            <span className="bg-card text-muted-foreground relative px-3 text-[10px] font-semibold tracking-widest uppercase">
              Or sign up with
            </span>
          </div>

          {/* Registration Form */}
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(handleRegister)}>
              {/* Full Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      Full Name
                    </FormLabel>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <User className="h-4 w-4" />
                      </span>
                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          autoComplete="name"
                          placeholder="John Doe"
                          className="cupertino-input border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-ring h-11 rounded-xl pl-10"
                          disabled={loading}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email Address */}
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
                          placeholder="name@school.edu"
                          className="cupertino-input border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-ring h-11 rounded-xl pl-10"
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
                    <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      Password
                    </FormLabel>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Lock className="h-4 w-4" />
                      </span>
                      <FormControl>
                        <Input
                          {...field}
                          type={showPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="cupertino-input border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-ring h-11 rounded-xl pr-10 pl-10"
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

              {/* Confirm Password */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                      Confirm Password
                    </FormLabel>
                    <div className="relative">
                      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Lock className="h-4 w-4" />
                      </span>
                      <FormControl>
                        <Input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          autoComplete="new-password"
                          placeholder="••••••••"
                          className="cupertino-input border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/50 focus:border-ring h-11 rounded-xl pr-10 pl-10"
                          disabled={loading}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center pr-3 transition-colors"
                      >
                        {showConfirmPassword ? (
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

              {/* Terms and Conditions Option */}
              <FormField
                control={form.control}
                name="agree"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-2.5 py-1">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="border-border bg-card text-foreground focus:ring-ring/20 mt-0.5 h-4 w-4 cursor-pointer rounded transition-all"
                      />
                    </FormControl>
                    <div className="grid gap-1.5 leading-none">
                      <FormLabel className="text-muted-foreground hover:text-foreground cursor-pointer text-xs font-normal select-none">
                        I agree to the{" "}
                        <a className="hover:text-foreground underline">Terms of Service</a> and{" "}
                        <a className="hover:text-foreground underline">Privacy Policy</a>.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              {/* Primary Action Button */}
              <Button
                type="submit"
                className="bg-primary hover:bg-foreground/90 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold text-primary-foreground shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all active:scale-98 disabled:pointer-events-none disabled:opacity-75 disabled:active:scale-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="mr-2 -ml-1 h-4 w-4 animate-spin text-primary-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Footer Sign-In Link */}
        <div className="text-muted-foreground text-center text-xs">
          Already have an account?{" "}
          <Link
            href={withNext("/login", nextParam)}
            className="text-foreground font-semibold transition-colors hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
