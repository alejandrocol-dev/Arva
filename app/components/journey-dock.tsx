"use client";

import { useEffect, useState } from "react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ArrowRight, ChevronDown, CircleCheck, PartyPopper, Sparkles, X } from "lucide-react";
import { useT } from "@/lib/i18n";
import { stepKey, useJourney, type JourneyStep } from "@/lib/journey";
import { useView, type View } from "@/lib/nav";
import { useStarterKit } from "@/components/starter-kit";
import { Button, cx } from "@/components/ui";

const KEY = "arva.dock.v1";
type Stored = { min?: boolean; closed?: boolean };

function read(): Stored {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Stored;
  } catch {
    return {};
  }
}
function write(s: Stored) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...read(), ...s }));
  } catch {
    // Storage unavailable: the dock just resets next visit.
  }
}

/** One-click action for each journey step, shared by the hero and the dock. */
export function useStepAction() {
  const [view, setView] = useView();
  const { setVisible } = useWalletModal();
  const kit = useStarterKit();
  const goTo = (target: View, anchor: string) => {
    if (view !== target) setView(target);
    else document.querySelector(`[data-tour="${anchor}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const run = (step: JourneyStep) => {
    if (step === "connect") setVisible(true);
    else if (step === "kit" || step === "usdc") void kit.run();
    else if (step === "deposit") goTo("earn", "earn-deposit");
    else goTo("borrow", "borrow-main");
  };
  return { run, kitBusy: kit.busy };
}

/**
 * Always-visible "next step" coach: tells the user exactly what to do next in
 * the demo path for their role, wherever they are in the app, in one click.
 */
export function JourneyDock({ hidden }: { hidden?: boolean }) {
  const t = useT();
  const action = useStepAction();
  const { role, steps, done, current, count, loading } = useJourney();
  const [state, setState] = useState<Stored>({ closed: true });

  // Slide in after the page settles, so it never competes with the first paint.
  useEffect(() => {
    const id = window.setTimeout(() => setState(read()), 1200);
    return () => window.clearTimeout(id);
  }, []);
  const update = (s: Stored) => {
    write(s);
    setState((p) => ({ ...p, ...s }));
  };

  if (hidden || state.closed || loading) return null;
  const complete = current === -1;
  const n = current + 1;
  const step = steps[current];
  const busy = (step === "kit" || step === "usdc") && action.kitBusy;

  if (state.min) {
    return (
      <button
        type="button"
        onClick={() => update({ min: false })}
        className="av-dock fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-full border border-white/10 bg-navy px-4 py-2.5 text-xs font-bold text-white shadow-(--shadow-float) hover:brightness-110 sm:inline-flex"
      >
        <Sparkles className="size-3.5 text-brand-glow" aria-hidden />
        {complete ? t("dock.done.pill") : t("dock.pill", { n, total: done.length })}
      </button>
    );
  }

  return (
    <aside
      aria-label={t("dock.aria")}
      className="av-dock av-night fixed bottom-5 right-5 z-40 hidden w-[320px] overflow-hidden rounded-2xl border border-white/10 p-4 text-white shadow-(--shadow-float) sm:block"
    >
      <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-brand/40 blur-3xl" />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-glow">
            {complete ? t("dock.done.label") : t("dock.label", { n, total: done.length })}
          </span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => update({ min: true })}
              aria-label={t("dock.minimize")}
              className="grid size-7 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => update({ closed: true })}
              aria-label={t("common.close")}
              className="grid size-7 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-1.5" aria-hidden>
          {done.map((d, i) => (
            <span
              key={i}
              className={cx(
                "h-1 flex-1 rounded-full transition-colors duration-500",
                d ? "bg-gradient-to-r from-brand-glow to-cyan" : i === current ? "bg-white/40" : "bg-white/10",
              )}
            />
          ))}
        </div>

        {complete ? (
          <div className="mt-4 flex gap-3">
            <PartyPopper className="mt-0.5 size-5 shrink-0 text-peach" aria-hidden />
            <div>
              <p className="font-display text-[15px] font-bold">{t(role === "investor" ? "inv.done.title" : "dock.done.title")}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">{t(role === "investor" ? "inv.done.body" : "dock.done.body")}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-4 font-display text-[15px] font-bold leading-snug">{t(stepKey(role, n, "title"))}</p>
            <p className="mt-1 text-xs leading-relaxed text-white/65">{t(stepKey(role, n, "dock"))}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white/50">
                <CircleCheck className="size-3.5 text-mint" aria-hidden />
                {t("dash.hero.progress", { done: count, total: steps.length })}
              </span>
              <Button size="sm" loading={busy} onClick={() => action.run(step)}>
                {t(stepKey(role, n, "cta"))}
                {!busy && <ArrowRight className="size-3.5" aria-hidden />}
              </Button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
