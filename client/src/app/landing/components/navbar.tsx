"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLogoutMutation } from "@/features/auth/authApi";
import { logout } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 select-none">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2">
          <div className="rounded-lg bg-foreground p-1.5 text-white shadow-sm transition-transform group-hover:scale-105">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-bold tracking-tight text-foreground">
            Eudora
          </span>
        </Link>

        {/* Mid Navigation Links */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#stats"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Analytics
          </a>
          <a
            href="/docs"
            className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Documentation
          </a>
        </nav>

        {/* Right CTA Links */}
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-muted-foreground">
                Hello, {user?.firstName || "User"}
              </span>
              <Link
                href={
                  user?.role === "ADMIN" ||
                  user?.role === "SUPER_ADMIN" ||
                  (Array.isArray(user?.roles) &&
                    user?.roles.some(
                      (r: any) =>
                        r === "ADMIN" ||
                        r === "SUPER_ADMIN" ||
                        r.name === "ADMIN" ||
                        r.name === "SUPER_ADMIN" ||
                        r.role?.name === "ADMIN" ||
                        r.role?.name === "SUPER_ADMIN",
                    ))
                    ? "/dashboard"
                    : "/learn"
                }
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {user?.role === "ADMIN" ||
                user?.role === "SUPER_ADMIN" ||
                (Array.isArray(user?.roles) &&
                  user?.roles.some(
                    (r: any) =>
                      r === "ADMIN" ||
                      r === "SUPER_ADMIN" ||
                      r.name === "ADMIN" ||
                      r.name === "SUPER_ADMIN" ||
                      r.role?.name === "ADMIN" ||
                      r.role?.name === "SUPER_ADMIN",
                  ))
                  ? "Dashboard"
                  : "Active Learning"}
              </Link>
              <button
                onClick={handleLogout}
                className="h-9 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-foreground/90 active:scale-97"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Sign In
              </Link>
              <Link href="/register">
                <button className="h-9 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-white shadow-sm transition-all hover:bg-foreground/90 active:scale-97">
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
