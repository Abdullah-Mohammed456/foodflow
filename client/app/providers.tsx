"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import { CartProvider } from "@/components/cart-provider";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500), refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}><CartProvider>{children}</CartProvider></QueryClientProvider>
  );
}
