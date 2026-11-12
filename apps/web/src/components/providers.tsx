"use client";

import { isApiError } from "@mal3abi/shared/api";
import type { Direction as Dir } from "@mal3abi/shared/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Direction } from "radix-ui";
import { useState, type ReactNode } from "react";
import { setUpApi } from "@/lib/api";

setUpApi();

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Do not retry answers the backend gave on purpose (4xx); retry network and 5xx twice.
        retry: (failureCount, error) =>
          !(isApiError(error) && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
      mutations: { retry: false },
    },
  });
}

/** Client-side providers shared by every page. */
export function Providers({ dir, children }: { dir: Dir; children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <Direction.Provider dir={dir}>{children}</Direction.Provider>
    </QueryClientProvider>
  );
}
