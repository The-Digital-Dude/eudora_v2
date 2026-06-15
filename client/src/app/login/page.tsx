"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useLoginMutation } from "@/features/auth/authApi";
import { login } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [loginMutation, { isLoading: loading }] = useLoginMutation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError("");

    try {
      const user = await loginMutation({ email, password }).unwrap();
      dispatch(login({ user, token: null }));
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err?.data?.message || "Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 dot-grid relative select-none font-sans bg-neutral-50 text-neutral-900">
      
      {/* Centered card container with slide-up fade-in animation */}
      <div className="w-full max-w-[440px] space-y-8 animate-fade-in-up">
        
        {/* Brand Logo and Name */}
        <div className="flex flex-col items-center space-y-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Eudora
          </span>
        </div>

        {/* Clean Login Card */}
        <div className="bg-white border border-neutral-200/80 rounded-[24px] p-8 md:p-10 shadow-[0_24px_60px_rgba(0,0,0,0.035),0_4px_12px_rgba(0,0,0,0.015)]">
          
          {/* Header */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 font-display">
              Sign in to your account
            </h1>
            <p className="text-xs text-neutral-400 max-w-[280px] mx-auto leading-normal">
              Enter your email and password below to access your classrooms and learning paths.
            </p>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 transition-all text-xs font-semibold cursor-pointer active:scale-98 shadow-sm"
            >
              {/* Google SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300 text-neutral-700 transition-all text-xs font-semibold cursor-pointer active:scale-98 shadow-sm"
            >
              {/* GitHub SVG */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </button>
          </div>

          {/* Separator */}
          <div className="relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-100"></div>
            </div>
            <span className="relative px-3 text-[10px] text-neutral-400 uppercase tracking-widest bg-white font-semibold">
              Or continue with
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            
            {/* Email Address */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Email Address</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                  <Mail className="w-4 h-4" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-10 h-11 border-neutral-200 bg-neutral-50/50 text-neutral-900 rounded-xl focus:border-neutral-900 placeholder:text-neutral-300 cupertino-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Password</Label>
                <a className="text-[11px] text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer transition-colors hover:underline">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-neutral-400">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 border-neutral-200 bg-neutral-50/50 text-neutral-900 rounded-xl focus:border-neutral-900 placeholder:text-neutral-300 cupertino-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Option */}
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer group text-xs text-neutral-500 hover:text-neutral-800 select-none">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-200 bg-white text-neutral-900 focus:ring-neutral-900/20 transition-all cursor-pointer"
                />
                Keep me signed in
              </label>
            </div>

            {/* Primary Action Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-950 text-white font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-75 disabled:pointer-events-none disabled:active:scale-100"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

        </div>

        {/* Footer Registration Link */}
        <div className="text-center text-xs text-neutral-400">
          Don’t have an account?{" "}
          <Link href="/register" className="text-neutral-900 hover:underline font-semibold transition-colors">
            Create an account
          </Link>
        </div>

      </div>

    </div>
  );
}