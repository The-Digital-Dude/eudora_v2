"use client";

import React from "react";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground flex min-h-screen w-full flex-col overflow-hidden antialiased">
      {children}
    </div>
  );
}
