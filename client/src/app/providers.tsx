"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import React from "react";
import { Provider } from "react-redux";

import { Toaster } from "@/components/ui/sonner";
import { useGetMeQuery } from "@/features/auth/authApi";
import { login, logout } from "@/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { store } from "@/store/store";

// Routes that must render immediately (marketing + auth entry points) — the
// session check still runs, but never blocks their first paint.
const PUBLIC_PATHS = ["/", "/login", "/register"];
const PUBLIC_PREFIXES = ["/landing"];

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const {
    data: user,
    error,
    isLoading,
  } = useGetMeQuery(undefined, {
    skip: !mounted,
  });

  React.useEffect(() => {
    if (user) {
      dispatch(login({ user, csrfToken: (user as any).csrfToken }));
    } else if (error) {
      dispatch(logout());
    }
  }, [user, error, dispatch]);

  // Hold the gate until the Redux store reflects the fetched session — the
  // login dispatch happens in an effect, so there is one render frame where
  // the query has resolved but the store hasn't caught up. Letting protected
  // layouts render in that frame makes their auth redirects misfire.
  const storeOutOfSync = !!user && !isAuthenticated;

  if ((!mounted || isLoading || storeOutOfSync) && !isPublicPath(pathname)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-pulse rounded-xl bg-foreground p-2.5 text-background shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="animate-pulse text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Connecting...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  const body = (
    <>
      <AuthInitializer>{children}</AuthInitializer>
      <Toaster />
    </>
  );

  return (
    <Provider store={store}>
      {/* Mounting GoogleOAuthProvider loads Google's GSI script, and any
          useGoogleLogin() consumer then calls initTokenClient() with
          whatever clientId is in context — an empty string makes that call
          throw. Skip the provider entirely when unconfigured so the login
          page's Google button can safely no-op instead of crashing. */}
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>{body}</GoogleOAuthProvider>
      ) : (
        body
      )}
    </Provider>
  );
}
