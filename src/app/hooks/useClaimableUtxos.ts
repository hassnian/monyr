"use client";

import { useQuery } from "@tanstack/react-query";

import { getMyClaimableUtxos } from "@/app/actions/claimable-utxos";
import { useAuth } from "@/app/contexts/auth-context";

export function useClaimableUtxos() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["claimable-utxos", user?.handle],
    queryFn: () => getMyClaimableUtxos(user?.handle),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}
