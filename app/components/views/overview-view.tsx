"use client";

import { useState } from "react";
import {
  ArrowRight,
  CircleCheck,
  CircleHelp,
  ExternalLink,
  Coins,
  Gauge,
  Gift,
  Globe,
  LoaderCircle,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Undo2,
  Vault,
  Wallet,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { arva, WarrantStatus, type Config, type PoolStats } from "@/lib/arva";
import { useFmt, useT, type MessageKey } from "@/lib/i18n";
import { setRole, stepKey, useJourney, type JourneyStep, type Role } from "@/lib/journey";
import { PROGRAM_ID } from "@/lib/constants";
import { explorerAddressUrl } from "@/lib/format";
import { useView, type View } from "@/lib/nav";
import { useAsyncData } from "@/lib/use-async";
import { useWallet } from "@solana/wallet-adapter-react";
import { ActivityFeed, KIND } from "@/components/activity-feed";
import { useSimMarket, type SimEvent, type SimWarrant } from "@/lib/sim-market";
import { useStepAction } from "@/components/journey-dock";
import { BarList, Donut, Legend } from "@/components/charts";
import { Badge, Card, ExplorerLink, IconTile, ProgressBar, Skeleton, cx, type IconTileTone } from "@/components/ui";

export function OverviewView() {
  const t = useT();
  const [, setView] = useView();
  const { data } = useAsyncData(async () => {
    const [stats, config] = await Promise.all([arva.getPoolStats(), arva.getConfig()]);
    return { stats, config };
  });
  const sim = useSimMarket();
  const [tape, setTape] = useState<"sim" | "real">("sim");

  return (
    <div className="space-y-6">
      <DemoHero onGo={setView} stats={data?.stats} config={data?.config} />

      <MyActivity />

      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink">{t("dash.global.title")}</h2>
        <Badge tone="info" icon={<Globe className="size-3.5" aria-hidden />}>
          {t("dash.global.badge")}
        </Badge>
      </div>

      <div data-tour="kpis">
        <Kpis stats={sim?.stats} config={data?.config} tons={sim?.tons} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title={t("dash.warrants.title")} subtitle={t("dash.warrants.subtitle")}>
          {sim ? <SimWarrantBars warrants={sim.warrants} /> : <Skeleton className="h-48" />}
        </Card>
        <Card title={t("dash.pool.title")} subtitle={t("dash.pool.subtitle")}>
          {sim ? <PoolDonut stats={sim.stats} /> : <Skeleton className="h-56" />}
        </Card>
        <Card
          tour="activity"
          title={
            <span className="inline-flex items-center gap-2">
              {t("activity.title")}
              {tape === "sim" && <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-2 py-0.5 text-[11px] font-bold text-brand-strong">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-70" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-mint" />
                </span>
                {t("sim.live")}
              </span>}
            </span>
          }
          subtitle={t(tape === "sim" ? "sim.activity.subtitle" : "activity.subtitle")}
        >
          <div role="tablist" aria-label={t("sim.tape.aria")} className="mb-4 grid grid-cols-2 rounded-xl bg-sunken p-1">
            {(["sim", "real"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tape === k}
                onClick={() => setTape(k)}
                className={cx(
                  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  tape === k ? "bg-surface text-ink shadow-sm" : "text-mute hover:text-ink",
                )}
              >
                {k === "real" && <ShieldCheck className="size-3.5" aria-hidden />}
                {t(k === "sim" ? "sim.tape.sim" : "sim.tape.real")}
              </button>
            ))}
          </div>
          {tape === "real" ? (
            <ActivityFeed limit={6} />
          ) : sim ? (
            <SimTape events={sim.events} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </Card>
      </div>

      <button
        type="button"
        onClick={() => setView("help")}
        className="group flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 text-left shadow-(--shadow-card) transition-colors hover:border-brand/40"
      >
        <span className="flex items-center gap-3">
          <IconTile icon={CircleHelp} tone="lilac" size="sm" />
          <span>
            <span className="block text-sm font-bold text-ink">{t("dash.help.title")}</span>
            <span className="block text-xs text-mute">{t("dash.help.body")}</span>
          </span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
      </button>
    </div>
  );
}

/* --------------------------------- Hero / demo ------------------------------- */

const STEP_STYLE: Record<JourneyStep, { tile: string; icon: LucideIcon }> = {
  connect: { tile: "bg-tile-lime", icon: Wallet },
  kit: { tile: "bg-tile-sky", icon: Gift },
  borrow: { tile: "bg-tile-amber", icon: Coins },
  repay: { tile: "bg-tile-lilac", icon: Undo2 },
  usdc: { tile: "bg-tile-sky", icon: Gift },
  deposit: { tile: "bg-tile-amber", icon: TrendingUp },
};

const ROLES: Array<{ id: Role; icon: LucideIcon; label: MessageKey }> = [
  { id: "producer", icon: Wheat, label: "dash.role.producer" },
  { id: "investor", icon: TrendingUp, label: "dash.role.investor" },
];

/** The wallet's own transactions on devnet — every row opens a real signature in Explorer. */
function MyActivity() {
  const t = useT();
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58();
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {t("mine.title")}
          <Badge tone="info" icon={<ShieldCheck className="size-3.5" aria-hidden />}>
            {t("mine.badge")}
          </Badge>
        </span>
      }
      subtitle={t("mine.subtitle")}
      actions={
        owner ? (
          <ExplorerLink kind="address" value={owner} label={t("mine.explorer")} />
        ) : undefined
      }
    >
      {owner ? (
        <ActivityFeed limit={6} owner={owner} />
      ) : (
        <p className="text-sm text-mute">{t("mine.connect")}</p>
      )}
    </Card>
  );
}

function DemoHero({ onGo, stats, config }: { onGo: (v: View) => void; stats?: PoolStats; config?: Config }) {
  const t = useT();
  const f = useFmt();
  const action = useStepAction();
  const { role, steps, done, current, count, owner } = useJourney();
  const pct = Math.round((count / steps.length) * 100);
  const apy = stats && config ? f.bps((config.annualInterestBps * stats.utilizationBps) / 10_000) : null;
  const investor = role === "investor";

  return (
    <section id="demo" data-tour="demo" className="av-night av-glow-line relative overflow-hidden rounded-[24px] p-5 text-white shadow-(--shadow-float) sm:p-6">
      <div aria-hidden className="av-grid pointer-events-none absolute inset-0 opacity-50" />
      <div aria-hidden className="av-float pointer-events-none absolute -left-20 -top-24 size-72 rounded-full bg-brand/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 right-10 size-64 rounded-full bg-peach/15 blur-3xl" />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)] lg:items-center">
        <div>
          <div role="tablist" aria-label={t("dash.role.aria")} className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur">
            {ROLES.map((r) => {
              const Icon = r.icon;
              const active = role === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRole(r.id)}
                  className={cx(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    active ? "bg-white text-navy shadow-sm" : "text-white/70 hover:text-white",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {t(r.label)}
                </button>
              );
            })}
          </div>
          <h1 className="mt-4 text-[24px] font-extrabold leading-[1.15] sm:text-[28px]">
            {t(investor ? "inv.hero.title" : "dash.hero.title")}
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
            {t(investor ? "inv.hero.body" : "dash.hero.body")}
          </p>
          <div className="mt-4 flex max-w-sm items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-glow via-brand to-cyan shadow-[0_0_12px_rgba(180,169,255,0.7)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-xs font-semibold text-white/70">{t("dash.hero.progress", { done: count, total: steps.length })}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
            {investor && apy && (
              <span className="inline-flex items-center gap-1.5 font-semibold text-white/80">
                <span className="size-1.5 rounded-full bg-mint shadow-[0_0_8px_var(--color-mint)]" />
                {t("inv.hero.yield", { apy })}
              </span>
            )}
            {!owner && <span className="text-white/50">{t("demo.needWallet")}</span>}
            <button
              type="button"
              onClick={() => onGo("admin")}
              className="inline-flex items-center gap-1.5 font-semibold text-brand-glow hover:text-white"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              {t(investor ? "inv.extra" : "demo.extra")}
              <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>

        <ol className={cx("grid gap-3", steps.length === 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-1 sm:grid-cols-3")}>
          {steps.map((id, i) => {
            const s = STEP_STYLE[id];
            const Icon = s.icon;
            const isDone = done[i];
            const isCurrent = i === current;
            const n = i + 1;
            const busy = (id === "kit" || id === "usdc") && action.kitBusy;
            return (
              <li
                key={`${role}-${id}`}
                className={cx(
                  "flex min-h-[148px] flex-col rounded-2xl p-3.5 text-navy shadow-[0_10px_30px_-14px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-0.5",
                  s.tile,
                  isCurrent && "ring-2 ring-brand-glow ring-offset-2 ring-offset-navy shadow-[0_0_0_6px_rgba(180,169,255,0.15),0_16px_40px_-12px_rgba(99,85,246,0.8)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy/50">0{n}</span>
                  {isDone ? (
                    <CircleCheck className="size-5 text-brand-strong" aria-label={t("demo.done")} />
                  ) : (
                    <span className="grid size-7 place-items-center rounded-lg bg-white/60 text-navy shadow-sm">
                      <Icon className="size-3.5" aria-hidden />
                    </span>
                  )}
                </div>
                <p className="mt-2.5 font-display text-[14px] font-bold leading-snug">{t(stepKey(role, n, "title"))}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-snug text-navy/60">{t(stepKey(role, n, "body"))}</p>
                <div className="mt-auto pt-2.5">
                  {isDone ? (
                    <span className="text-xs font-bold text-brand-strong">{t("demo.done")}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => action.run(id)}
                      disabled={busy}
                      className={cx(
                        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-70",
                        isCurrent ? "bg-brand text-white shadow-[0_6px_14px_-6px_rgba(99,85,246,0.8)] hover:bg-brand-strong" : "bg-white/70 text-navy hover:bg-white",
                      )}
                    >
                      {busy && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
                      {t(stepKey(role, n, "cta"))}
                      {!busy && <ArrowRight className="size-3.5" aria-hidden />}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}


/* ------------------------------------ KPIs ----------------------------------- */

function Kpis({ stats, config, tons }: { stats?: PoolStats; config?: Config; tons?: number }) {
  const t = useT();
  const f = useFmt();
  if (!stats || tons === undefined)
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-2xl" />
        ))}
      </div>
    );
  const ltv = config?.ltvBps ?? 7000;
  const liq = config?.liqThresholdBps ?? 8000;
  const items: Array<{ icon: LucideIcon; tone: IconTileTone; accent: string; label: string; value: string; hint: string }> = [
    { icon: Vault, tone: "lime", accent: "#6355f6", label: t("overview.kpi.liquidity"), value: f.usdcRound(stats.available), hint: t("overview.kpi.liquidityHint") },
    { icon: Coins, tone: "sky", accent: "#22d3ee", label: t("overview.kpi.debt"), value: f.usdcRound(stats.outstandingDebt), hint: t("overview.kpi.debtHint") },
    { icon: Wheat, tone: "amber", accent: "#ffb38a", label: t("overview.kpi.tons"), value: f.tons(tons), hint: t("overview.kpi.tonsHint") },
    { icon: Gauge, tone: "lilac", accent: "#8f83ff", label: t("overview.kpi.ltv"), value: f.bps(ltv), hint: t("overview.kpi.ltvHint", { liq: f.bps(liq) }) },
  ];
  return (
    <section aria-label="Live metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="av-lift relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)"
          style={{ backgroundImage: `radial-gradient(120% 80% at 100% 0%, ${it.accent}14, transparent 60%)` }}
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${it.accent}, ${it.accent}00)` }} />
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold text-mute">{it.label}</p>
            <IconTile icon={it.icon} tone={it.tone} size="sm" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold tracking-tight text-ink tabular-nums transition-all sm:text-[26px]">{it.value}</p>
          <p className="mt-1 text-xs text-faint">{it.hint}</p>
        </div>
      ))}
    </section>
  );
}

/* ---------------------------------- Charts ----------------------------------- */

function PoolDonut({ stats }: { stats: PoolStats }) {
  const t = useT();
  const f = useFmt();
  const util = stats.utilizationBps / 10_000;
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row lg:flex-col">
      <Donut
        segments={[
          { value: stats.available, color: "var(--color-brand)", label: t("dash.pool.available") },
          { value: stats.outstandingDebt, color: "var(--color-cyan)", label: t("dash.pool.lent") },
        ]}
        center={
          <div>
            <p className="text-[11px] font-medium text-mute">{t("dash.pool.total")}</p>
            <p className="font-display text-lg font-extrabold text-ink">{f.number(stats.totalLiquidity, 0)}</p>
            <p className="text-[11px] font-semibold text-faint">USDC</p>
          </div>
        }
      />
      <div className="w-full min-w-0 flex-1 space-y-4">
        <Legend
          items={[
            { color: "var(--color-brand)", label: t("dash.pool.available"), value: f.usdcRound(stats.available) },
            { color: "var(--color-cyan)", label: t("dash.pool.lent"), value: f.usdcRound(stats.outstandingDebt) },
          ]}
        />
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-mute">{t("dash.pool.utilization")}</span>
            <span className="font-semibold text-ink">{f.pct(util, 1)}</span>
          </div>
          <ProgressBar value={util} tone="info" />
        </div>
      </div>
    </div>
  );
}

const STATUS: Record<WarrantStatus, { label: MessageKey; color: string; tone: "brand" | "info" | "danger" | "neutral" }> = {
  [WarrantStatus.Issued]: { label: "status.issued", color: "var(--color-info)", tone: "info" },
  [WarrantStatus.InCustody]: { label: "status.inCustody", color: "var(--color-brand)", tone: "neutral" },
  [WarrantStatus.Liquidated]: { label: "status.liquidated", color: "var(--color-danger)", tone: "danger" },
  [WarrantStatus.Released]: { label: "status.released", color: "var(--color-mint)", tone: "brand" },
};

const SIM_ROWS = 7;

function SimWarrantBars({ warrants }: { warrants: SimWarrant[] }) {
  const t = useT();
  const f = useFmt();
  const totals = Object.values(WarrantStatus)
    .filter((v): v is WarrantStatus => typeof v === "number")
    .map((st) => ({ st, tons: warrants.filter((w) => w.status === st).reduce((n, w) => n + w.tons, 0) }))
    .filter((x) => x.tons > 0);
  const rows = [...warrants].sort((a, b) => b.tons - a.tons).slice(0, SIM_ROWS);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {totals.map(({ st, tons }) => (
          <Badge key={st} tone={STATUS[st].tone}>
            {t(STATUS[st].label)} · {f.tons(tons)}
          </Badge>
        ))}
      </div>
      <BarList
        items={rows.map((w) => ({
          label: w.id,
          value: w.tons,
          display: f.tons(w.tons),
          color: STATUS[w.status].color,
          tag: <span className="truncate text-[11px] text-faint">{t(`sim.grain.${w.grain}` as MessageKey)} · {w.place}</span>,
        }))}
      />
      {warrants.length > SIM_ROWS && (
        <p className="text-xs text-faint">{t("sim.more", { n: warrants.length - SIM_ROWS })}</p>
      )}
    </div>
  );
}

function SimTape({ events }: { events: SimEvent[] }) {
  const t = useT();
  const f = useFmt();
  const value = (e: SimEvent) =>
    e.kind === "registerWarrant"
      ? f.tons(e.amount)
      : e.kind === "setPrice"
        ? `${f.usdc(e.amount)}/t`
        : f.usdcRound(e.amount);
  return (
    <div>
      <ol className="relative space-y-1 overflow-hidden">
      {events.map((e) => {
        const k = KIND[e.kind];
        const Icon = k.icon;
        return (
          <li key={e.id} className="av-tape-in flex items-center gap-3 rounded-xl px-2 py-2">
            <span className={cx("grid size-9 shrink-0 place-items-center rounded-xl", k.tile)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{t(k.label)}</p>
              <p className="truncate text-xs text-faint">
                {e.warrant.place} · {e.warrant.country} · {f.ago(e.at)}
              </p>
            </div>
            <span className="shrink-0 font-mono text-xs font-semibold text-ink tabular-nums">{value(e)}</span>
            <span
              role="button"
              aria-disabled="true"
              tabIndex={0}
              title={t("sim.audit.disabled")}
              aria-label={t("sim.audit.disabled")}
              className="grid size-7 shrink-0 cursor-not-allowed place-items-center rounded-lg text-faint/60 hover:bg-sunken"
            >
              <ExternalLink className="size-3.5" aria-hidden />
            </span>
          </li>
        );
      })}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5 text-faint">
          <ShieldCheck className="size-3.5" aria-hidden />
          {t("sim.audit.note")}
        </span>
        <a
          href={explorerAddressUrl(PROGRAM_ID)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
        >
          {t("sim.audit.real")}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}
