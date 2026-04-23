"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "./contexts/wallet-context";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>{children}</WalletProvider>;
    </QueryClientProvider>
  );
}
