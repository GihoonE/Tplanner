"use client";

import { SessionProvider } from "next-auth/react";

const SESSION_REFETCH_INTERVAL_SECONDS = 30 * 60;

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      refetchInterval={SESSION_REFETCH_INTERVAL_SECONDS}
      refetchOnWindowFocus
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  );
}
