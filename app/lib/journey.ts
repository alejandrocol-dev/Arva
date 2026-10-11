"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { arva, LoanStatus } from "@/lib/arva";
import { useAsyncData } from "@/lib/use-async";

/**
 * The guided demo path, read from the connected wallet's on-chain state:
 * connect → get the starter kit → borrow → repay and get the warrant back.
 * Shared by the overview hero and the floating guide so both always agree.
 */
export const JOURNEY = ["connect", "kit", "borrow", "repay"] as const;
export type JourneyStep = (typeof JOURNEY)[number];

export function useJourney() {
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? null;
  const { data, loading } = useAsyncData(async () => {
    if (!owner) return null;
    const mine = (await arva.getMyWarrants(owner)).filter((p) => p.warrant.owner === owner);
    return {
      kit: mine.length > 0,
      borrowed: mine.some((p) => p.loan),
      repaid: mine.some((p) => p.loan?.status === LoanStatus.Repaid),
    };
  }, owner);

  const done = [!!owner, !!data?.kit, !!data?.borrowed, !!data?.repaid];
  const current = done.findIndex((d) => !d);
  return {
    owner,
    done,
    /** Index of the next step to do, or -1 when the whole cycle is complete. */
    current,
    count: done.filter(Boolean).length,
    loading: !!owner && loading && !data,
  };
}
