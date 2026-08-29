"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useLogoutMutation } from "@/features/auth/authApi";
import { logout } from "@/features/auth/authSlice";
import { getPrimaryRole, getRoleHome } from "@/lib/access-control";
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
    <header className="sticky top-0 z-50 w-full border-b border-amber-200/40 bg-amber-50/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 select-none">
        {/* Logo */}
        <Link href="/" className="group flex items-center">
          <Image
            src="/landing/eudora_logo.png"
            alt="Eudora"
            width={218}
            height={72}
            priority
            className="h-9 w-auto transition-transform group-hover:scale-105"
          />
        </Link>

        {/* Section links. The navbar had none at all until now, which left
            /about-eudora and /explore reachable only by typing the URL. */}
        <nav className="hidden items-center gap-6 text-xs font-semibold sm:flex">
          <Link
            href="/about-eudora"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="/explore"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Courses
          </Link>
        </nav>

        {/* Right CTA Links */}
        <div className="flex items-center gap-4 text-sm">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-muted-foreground">
                Hello, {user?.firstName || "User"}
              </span>
              <Link
                href={getRoleHome(user)}
                className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                {getPrimaryRole(user) === "ADMIN" ? "Dashboard" : "My Portal"}
              </Link>
              <button
                onClick={handleLogout}
                className="h-9 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-97"
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
                <button className="h-9 cursor-pointer rounded-xl bg-foreground px-4 text-xs font-semibold text-background shadow-sm transition-all hover:bg-foreground/90 active:scale-97">
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
