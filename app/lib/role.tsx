"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { arva, isRealMode } from "@/lib/arva";
import { useAsyncData } from "@/lib/use-async";

/**
 * Who is looking at the app. The certifier and admin (price oracle) roles are
 * enforced on-chain, so the producer interface never shows their tools. In mock
 * mode (local dev, no chain) every tool stays available.
 */
type Operator = {
  /** The on-chain config has been read, so the role checks below are reliable. */
  ready: boolean;
  canCertify: boolean;
  canAdmin: boolean;
  /** A real-mode wallet holding at least one operator role. */
  operator: boolean;
};

const OPEN: Operator = { ready: true, canCertify: true, canAdmin: true, operator: false };
const Ctx = createContext<Operator>(OPEN);

export function OperatorProvider({ children }: { children: ReactNode }) {
  const { publicKey } = useWallet();
  const { data, error } = useAsyncData(() => arva.getConfig());
  const owner = publicKey?.toBase58() ?? null;

  const value = useMemo<Operator>(() => {
    if (!isRealMode) return OPEN;
    const canCertify = !!owner && data?.certifier === owner;
    const canAdmin = !!owner && data?.admin === owner;
    return { ready: !!data || !!error, canCertify, canAdmin, operator: canCertify || canAdmin };
  }, [owner, data, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useOperator = () => useContext(Ctx);
