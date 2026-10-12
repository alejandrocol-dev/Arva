"use client";

import { useSyncExternalStore } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { arva, isRealMode, LoanStatus } from "@/lib/arva";
import type { MessageKey } from "@/lib/i18n";
import { useAsyncData } from "@/lib/use-async";

/**
 * The guided demo paths, read from the connected wallet's state. Shared by the
 * overview hero and the floating guide so both always agree.
 * - producer: connect → starter kit → borrow → repay and get the warrant back.
 * - investor: connect → get test USDC → deposit into the pool.
 */
export type Role = "producer" | "investor";
export type JourneyStep = "connect" | "kit" | "borrow" | "repay" | "usdc" | "deposit";
export const JOURNEYS: Record<Role, JourneyStep[]> = {
  producer: ["connect", "kit", "borrow", "repay"],
  investor: ["connect", "usdc", "deposit"],
};

/* ----------------------------- role (persisted) ----------------------------- */

const ROLE_KEY = "arva.role.v1";
const roleListeners = new Set<() => void>();

function readRole(): Role {
  try {
    return window.localStorage.getItem(ROLE_KEY) === "investor" ? "investor" : "producer";
  } catch {
    return "producer";
  }
}

export function setRole(role: Role) {
  try {
    window.localStorage.setItem(ROLE_KEY, role);
  } catch {
    // Storage unavailable: the choice lasts until reload.
  }
  roleListeners.forEach((l) => l());
}

export function useRole(): Role {
  return useSyncExternalStore(
    (cb) => {
      roleListeners.add(cb);
      return () => roleListeners.delete(cb);
    },
    readRole,
    () => "producer" as Role,
  );
}

/* --------------------------- deposits (local mark) -------------------------- */

// The pool is a single vault with no per-depositor account on-chain, so the
// "deposited" step is a local mark set when a deposit confirms. The mock keeps
// it in memory so a reload resets the sandbox like the rest of the mock state.
const DEPOSIT_KEY = "arva.deposited.v1";
const mockDeposits = new Set<string>();

function hasDeposited(owner: string): boolean {
  if (!isRealMode) return mockDeposits.has(owner);
  try {
    return (JSON.parse(window.localStorage.getItem(DEPOSIT_KEY) ?? "[]") as string[]).includes(owner);
  } catch {
    return false;
  }
}

export function markDeposited(owner: string) {
  if (!isRealMode) {
    mockDeposits.add(owner);
    return;
  }
  try {
    const list = JSON.parse(window.localStorage.getItem(DEPOSIT_KEY) ?? "[]") as string[];
    if (!list.includes(owner)) window.localStorage.setItem(DEPOSIT_KEY, JSON.stringify([...list, owner]));
  } catch {
    // Storage unavailable: the step just won't tick.
  }
}

/** i18n key for step `n` (1-based) of a role's path. */
export function stepKey(role: Role, n: number, part: "title" | "body" | "cta" | "dock"): MessageKey {
  if (role === "investor") return (part === "dock" ? `inv.dock${n}` : `inv.step${n}.${part}`) as MessageKey;
  return (part === "dock" ? `dock.step${n}` : `demo.step${n}.${part}`) as MessageKey;
}

/* --------------------------------- journey ---------------------------------- */

export function useJourney() {
  const role = useRole();
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? null;
  const { data, loading } = useAsyncData(async () => {
    if (!owner) return null;
    const [warrants, balances] = await Promise.all([arva.getMyWarrants(owner), arva.getWalletBalances(owner)]);
    const mine = warrants.filter((p) => p.warrant.owner === owner);
    return {
      kit: mine.length > 0,
      borrowed: mine.some((p) => p.loan),
      repaid: mine.some((p) => p.loan?.status === LoanStatus.Repaid),
      usdc: balances.usdc > 0,
      deposit: hasDeposited(owner),
    };
  }, owner);

  const steps = JOURNEYS[role];
  const state: Record<JourneyStep, boolean> = {
    connect: !!owner,
    kit: !!data?.kit,
    borrow: !!data?.borrowed,
    repay: !!data?.repaid,
    usdc: !!data?.usdc || !!data?.deposit,
    deposit: !!data?.deposit,
  };
  const done = steps.map((s) => state[s]);
  const current = done.findIndex((d) => !d);
  return {
    role,
    steps,
    owner,
    done,
    /** Index of the next step to do, or -1 when the whole path is complete. */
    current,
    count: done.filter(Boolean).length,
    loading: !!owner && loading && !data,
  };
}
