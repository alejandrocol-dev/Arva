"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { toast } from "sonner";
import { Gift } from "lucide-react";
import { arva, Grain, isRealMode, suggestNextSiloId } from "@/lib/arva";
import { notifyDataChanged } from "@/lib/data-bus";
import { explorerTxUrl } from "@/lib/format";
import { useFmt, useT, type MessageKey } from "@/lib/i18n";
import { Button } from "@/components/ui";

type Granted = { sol: number; usdc: number; warrant: string | null };

/**
 * One click to get everything a fresh devnet wallet needs to walk the cycle:
 * test SOL for fees, test USDC for interest and a 100 t demo warrant.
 * Real mode calls /api/starter (server-side service wallet); the mock just
 * issues the warrant in memory.
 */
export function useStarterKit() {
  const t = useT();
  const f = useFmt();
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);

  const run = useCallback(async () => {
    if (!publicKey) {
      setVisible(true);
      return false;
    }
    const wallet = publicKey.toBase58();
    setBusy(true);
    try {
      let signature: string | null;
      let granted: Granted;
      if (isRealMode) {
        const res = await fetch("/api/starter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet }),
        });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; signature?: string | null; granted?: Granted };
        if (!res.ok || !body.ok || !body.granted) throw new Error(body.error ?? "chain_error");
        signature = body.signature ?? null;
        granted = body.granted;
      } else {
        const taken = (await arva.getAllWarrants()).map((w) => w.siloId);
        const siloId = suggestNextSiloId(taken, "DEMO-");
        const res = await arva.registerWarrant({ siloId, grain: Grain.Soybean, tons: 100, producer: wallet });
        signature = res.signature;
        granted = { sol: 0, usdc: 0, warrant: siloId };
      }
      notifyDataChanged();
      if (!signature) {
        toast.success(t("kit.already"));
        return true;
      }
      const parts = [
        granted.warrant && t("kit.got.warrant", { silo: granted.warrant }),
        granted.usdc > 0 && f.usdc(granted.usdc),
        granted.sol > 0 && `${granted.sol} SOL`,
      ].filter(Boolean);
      toast.success(t("kit.success"), {
        description: parts.join(" · "),
        action: { label: t("kit.viewTx"), onClick: () => window.open(explorerTxUrl(signature), "_blank", "noopener") },
      });
      return true;
    } catch (e) {
      const code = e instanceof Error ? e.message : "chain_error";
      const known = ["not_configured", "cooldown", "bad_wallet"].includes(code) ? code : "chain_error";
      toast.error(t("kit.error.title"), { description: t(`kit.error.${known}` as MessageKey) });
      return false;
    } finally {
      setBusy(false);
    }
  }, [publicKey, setVisible, t, f]);

  return { run, busy };
}

export function StarterKitButton({
  size = "md",
  variant = "primary",
  className,
}: {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const t = useT();
  const { run, busy } = useStarterKit();
  return (
    <Button size={size} variant={variant} loading={busy} onClick={() => void run()} className={className}>
      {!busy && <Gift className="size-4" aria-hidden />}
      {busy ? t("kit.loading") : t("kit.cta")}
    </Button>
  );
}
