"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function ConnectWalletsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}

export const ConnectWallets = dynamic(
  () => import("./ConnectWalletsClient").then((mod) => mod.ConnectWalletsClient),
  {
    ssr: false,
    loading: () => <ConnectWalletsSkeleton />,
  }
);
