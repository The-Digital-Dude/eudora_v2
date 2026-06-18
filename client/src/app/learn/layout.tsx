"use client";

import React from "react";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col overflow-hidden antialiased">
      {children}
    </div>
  );
}
