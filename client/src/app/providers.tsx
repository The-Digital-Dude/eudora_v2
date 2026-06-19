"use client";

import React from "react";
import { Provider } from "react-redux";
import { store } from "@/store/store";

import { Sparkles } from "lucide-react";
import { useAppDispatch } from "@/store/hooks";
import { login, logout } from "@/features/auth/authSlice";
import { useGetMeQuery } from "@/features/auth/authApi";

import { GoogleOAuthProvider } from "@react-oauth/google";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { data: user, error, isLoading } = useGetMeQuery(undefined, {
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 text-neutral-900 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="p-2.5 bg-neutral-900 text-white rounded-xl shadow-sm animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold tracking-wide text-neutral-400 animate-pulse uppercase">
            Connecting...
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  return (
    <Provider store={store}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthInitializer>{children}</AuthInitializer>
      </GoogleOAuthProvider>
    </Provider>
  );
}