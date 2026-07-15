"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

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
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const registerSchema = z
  .object({
    name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email address is required")
      .email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
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

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
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

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

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
      }).unwrap();

      // Automatically sign in locally on register success
      dispatch(login({ user, token: null }));
      toast.success("Account created successfully!");
      router.push("/login");
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
        <div className="flex flex-col items-center space-y-3">
          <Link
            href="/"
            className="bg-foreground text-background flex items-center justify-center rounded-xl p-2.5 shadow-sm transition-transform hover:scale-105"
          >
            <Sparkles className="h-5 w-5" />
          </Link>
          <span className="font-display text-foreground text-xl font-bold tracking-tight">
            Eudora
          </span>
        </div>

        {/* Clean Cupertino Card */}
        <div className="border-border/60 bg-card rounded-[24px] border p-8 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)] md:p-10">
          {/* Header */}
          <div className="mb-6 space-y-2 text-center">
            <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
              Create your account
            </h1>
            <p className="text-muted-foreground mx-auto max-w-[280px] text-xs leading-normal">
              Sign up to start designing student learning paths and curriculums.
            </p>
          </div>

          {/* Social Registrations */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="border-border bg-card text-foreground hover:border-border hover:bg-muted flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-98"
            >
              {/* Google SVG */}
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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
            <button
              type="button"
              className="border-border bg-card text-foreground hover:border-border hover:bg-muted flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold shadow-sm transition-all active:scale-98"
            >
              {/* GitHub SVG */}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"
                />
              </svg>
              GitHub
            </button>
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
                className="bg-primary hover:bg-foreground/90 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all active:scale-98 disabled:pointer-events-none disabled:opacity-75 disabled:active:scale-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg
                      className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
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
            href="/login"
            className="text-foreground font-semibold transition-colors hover:underline"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
