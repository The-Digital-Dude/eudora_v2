"use client";

import { useGoogleLogin } from "@react-oauth/google";
import { ArrowRight,Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoogleLoginMutation,useLoginMutation } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loginAs, setLoginAs] = useState<"student" | "guardian" | "admin">("student");

  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user) as any;
  const [loginMutation, { isLoading: loading }] = useLoginMutation();
  const [googleLoginMutation, { isLoading: googleLoading }] = useGoogleLoginMutation();

  const checkRedirect = (u: any) => {
    if (!u) return;

    const hasAdminRole =
      u.role === "ADMIN" ||
      u.role === "SUPER_ADMIN" ||
      (Array.isArray(u.roles) &&
        u.roles.some(
          (r: any) =>
            r === "ADMIN" ||
            r === "SUPER_ADMIN" ||
            r.name === "ADMIN" ||
            r.name === "SUPER_ADMIN" ||
            r.role?.name === "ADMIN" ||
            r.role?.name === "SUPER_ADMIN",
        ));

    const isGuardian =
      u.role === "GUARDIAN" ||
      (Array.isArray(u.roles) &&
        u.roles.some(
          (r: any) => r === "GUARDIAN" || r.name === "GUARDIAN" || r.role?.name === "GUARDIAN",
        ));

    if (isGuardian) {
      const hasProfile = !!u.guardianProfile;
      const hasStudents =
        hasProfile &&
        Array.isArray(u.guardianProfile.students) &&
        u.guardianProfile.students.length > 0;
      if (!hasProfile || !hasStudents) {
        router.push("/complete-profile");
      } else {
        router.push("/dashboard");
      }
    } else if (hasAdminRole) {
      router.push("/dashboard");
    } else {
      router.push("/learn");
    }
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      checkRedirect(user);
    }
  }, [isAuthenticated, user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");

    try {
      const loggedInUser = await loginMutation({ email, password }).unwrap();
      dispatch(login({ user: loggedInUser, token: null }));
      checkRedirect(loggedInUser);
    } catch (err: any) {
      console.error(err);
      setError(err?.data?.message || "Invalid email or password.");
    }
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setError("");
      try {
        const loggedInUser = await googleLoginMutation({
          token: tokenResponse.access_token,
          role: loginAs === "guardian" ? "GUARDIAN" : "USER",
        }).unwrap();
        dispatch(login({ user: loggedInUser, token: null }));
        checkRedirect(loggedInUser);
      } catch (err: any) {
        console.error(err);
        setError(err?.data?.message || "Google authentication failed. Please try again.");
      }
    },
    onError: () => {
      setError("Google authentication failed. Please try again.");
    },
  });

  return (
    <div className="dot-grid relative flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 py-12 font-sans text-neutral-900 select-none dark:bg-zinc-950 dark:text-zinc-50">
      {/* Centered card container with slide-up fade-in animation */}
      <div className="animate-fade-in-up w-full max-w-[440px] space-y-8">
        {/* Brand Logo and Name */}
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-xl bg-neutral-900 p-2.5 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50">
            Eudora
          </span>
        </div>

        {/* Clean Login Card */}
        <div className="rounded-[24px] border border-neutral-200/80 bg-white p-8 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)] md:p-10 dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header */}
          <div className="mb-8 space-y-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900 dark:text-zinc-50">
              Sign in to your account
            </h1>
            <p className="mx-auto max-w-[280px] text-xs leading-normal text-neutral-400 dark:text-zinc-500">
              Enter your email and password below to access your classrooms and learning paths.
            </p>
          </div>

          {/* Role Switcher */}
          <div className="mb-6 flex gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-zinc-950">
            {(["student", "guardian", "admin"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setLoginAs(role)}
                className={`flex-1 cursor-pointer rounded-lg py-1.5 text-center text-xs font-semibold capitalize transition-all select-none ${
                  loginAs === role
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-zinc-200"
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
              onClick={() => handleGoogleLogin()}
              disabled={googleLoading || loading}
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-98 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
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
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50 active:scale-98 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
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
              <div className="w-full border-t border-neutral-100 dark:border-zinc-800"></div>
            </div>
            <span className="relative bg-white px-3 text-[10px] font-semibold tracking-widest text-neutral-400 uppercase dark:bg-zinc-900 dark:text-zinc-500">
              Or continue with
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-500 dark:border-rose-900/30 dark:bg-rose-950/20">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Email Address */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                Email Address
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="cupertino-input h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pl-10 text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 dark:placeholder:text-zinc-700 dark:focus:border-zinc-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold tracking-wider text-neutral-400 uppercase dark:text-zinc-500">
                  Password
                </Label>
                <a className="cursor-pointer text-[11px] font-semibold text-neutral-500 transition-colors hover:text-neutral-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-neutral-400">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="cupertino-input h-11 rounded-xl border-neutral-200 bg-neutral-50/50 pr-10 pl-10 text-neutral-900 placeholder:text-neutral-300 focus:border-neutral-900 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-50 dark:placeholder:text-zinc-700 dark:focus:border-zinc-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center">
              <label className="group flex cursor-pointer items-center gap-2.5 text-xs text-neutral-500 select-none hover:text-neutral-800 dark:text-zinc-400 dark:hover:text-zinc-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 cursor-pointer rounded border-neutral-200 bg-white text-neutral-900 transition-all focus:ring-neutral-900/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
                />
                Keep me signed in
              </label>
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-neutral-900 font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all hover:bg-neutral-800 active:scale-98 disabled:pointer-events-none disabled:opacity-75 disabled:active:scale-100 dark:bg-zinc-100 dark:text-neutral-900 dark:hover:bg-zinc-200"
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
        </div>

        {/* Footer Registration Link */}
        <div className="text-center text-xs text-neutral-400 dark:text-zinc-500">
          Don’t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-neutral-900 transition-colors hover:underline dark:text-zinc-50"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
