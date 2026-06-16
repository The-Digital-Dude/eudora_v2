"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/features/auth/authSlice";
import { useLogoutMutation } from "@/features/auth/authApi";

export default function Navbar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user) as any;
  const [logoutMutation] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation(undefined).unwrap();
    } catch (err) {
      console.error("Failed to call logout on backend:", err);
    } finally {
      dispatch(logout());
      router.push("/");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-neutral-200/50 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between select-none">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-1.5 bg-neutral-900 text-white rounded-lg transition-transform group-hover:scale-105 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-neutral-900 font-display">
            Eudora
          </span>
        </Link>

        {/* Mid Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">
            Features
          </a>
          <a href="#stats" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">
            Analytics
          </a>
          <a href="/docs" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">
            Documentation
          </a>
        </nav>

        {/* Right CTA Links */}
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-neutral-600">
                Hello, {user?.firstName || "User"}
              </span>
              <Link href="/dashboard" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">
                Dashboard
              </Link>
              <button 
                onClick={handleLogout}
                className="h-9 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs px-4 active:scale-97 shadow-sm transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-xs font-semibold text-neutral-500 hover:text-neutral-950 transition-colors">
                Sign In
              </Link>
              <Link href="/register">
                <button className="h-9 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl text-xs px-4 active:scale-97 shadow-sm transition-all cursor-pointer">
                  Get Started
                </button>
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}