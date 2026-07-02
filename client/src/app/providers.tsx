"use client";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { Sparkles } from "lucide-react";
import React from "react";
import { Provider } from "react-redux";

import { useGetMeQuery } from "@/features/auth/authApi";
import { login, logout } from "@/features/auth/authSlice";
import { useAppDispatch } from "@/store/hooks";
import { store } from "@/store/store";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
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
      dispatch(login({ user, token: null }));
    } else if (error) {
      dispatch(logout());
    }
  }, [user, error, dispatch]);

  if (!mounted || isLoading) {
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

  return (
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthInitializer>{children}</AuthInitializer>
      </GoogleOAuthProvider>
    </Provider>
  );
}
