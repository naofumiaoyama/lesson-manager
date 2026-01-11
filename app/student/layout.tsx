"use client";

import { SessionProvider } from "next-auth/react";
import { StudentHeader } from "@/components/layout/StudentHeader";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-muted/30">
        <StudentHeader />
        <main className="mx-auto max-w-7xl p-8">{children}</main>
      </div>
    </SessionProvider>
  );
}
