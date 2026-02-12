import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { migrate } from "../db/migrations";
import { queryClient } from "../lib/queryClient";
import { AuthProvider } from "./AuthProvider";

// Run migrations on boot
migrate();

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
