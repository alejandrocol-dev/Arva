"use client";

import { CircleCheck, Coins, Lock, Stamp, TrendingUp, Undo2, Wheat, type LucideIcon } from "lucide-react";
import { useFmt, useT } from "@/lib/i18n";
import { Card, IconTile, Notice, PageHeader, type IconTileTone } from "@/components/ui";

type HelpStep = { icon: LucideIcon; title: string; body: string };

export function HelpView() {
  const t = useT();
  const f = useFmt();
  const producer: HelpStep[] = [
    { icon: Stamp, title: t("overview.how.1.title"), body: t("overview.how.1.body") },
    { icon: Lock, title: t("overview.how.2.title"), body: t("overview.how.2.body") },
    { icon: Coins, title: t("overview.how.3.title"), body: t("overview.how.3.body", { ltv: f.bps(7000) }) },
    { icon: Undo2, title: t("overview.how.4.title"), body: t("overview.how.4.body") },
  ];
  const investor: Array<{ icon: LucideIcon; tone: IconTileTone; body: string }> = [
    { icon: Coins, tone: "lime", body: t("earn.how.1") },
    { icon: TrendingUp, tone: "sky", body: t("earn.how.2") },
    { icon: Wheat, tone: "amber", body: t("earn.how.3") },
  ];

  return (
    <div className="space-y-10">
      <PageHeader title={t("help.title")} subtitle={t("help.subtitle")} />

      <section>
        <h2 className="mb-1 text-xl font-extrabold tracking-tight text-ink">{t("help.producer.title")}</h2>
        <p className="mb-5 text-sm text-mute">{t("help.producer.subtitle")}</p>
        <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-[44px] hidden h-px bg-[linear-gradient(90deg,var(--color-brand-glow)_50%,transparent_50%)] bg-[length:10px_1px] lg:block" />
          {producer.map((s, i) => (
            <li key={i} className="av-lift relative rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card)">
              <div className="mb-4 flex items-center justify-between">
                <IconTile icon={s.icon} tone="navy" size="sm" className="size-10 shadow-[0_8px_18px_-8px_rgba(99,85,246,0.8)]" />
                <span className="font-display text-sm font-bold text-brand">0{i + 1}</span>
              </div>
              <h3 className="text-base font-bold text-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-mute">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-1 text-xl font-extrabold tracking-tight text-ink">{t("help.investor.title")}</h2>
        <p className="mb-5 text-sm text-mute">{t("help.investor.subtitle")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {investor.map((s, i) => (
            <div key={i} className="av-lift flex items-start gap-3 rounded-(--radius-card) border border-line bg-surface p-5 shadow-(--shadow-card)">
              <IconTile icon={s.icon} tone={s.tone} />
              <p className="text-sm leading-relaxed text-mute">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t("overview.why.title")}>
          <ul className="space-y-3 text-sm text-mute">
            {(["overview.why.1", "overview.why.2", "overview.why.3"] as const).map((k) => (
              <li key={k} className="flex gap-2.5">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-mint" aria-hidden />
                {t(k)}
              </li>
            ))}
          </ul>
        </Card>
        <Notice tone="warn" title={t("overview.honest.title")} className="self-start">
          {t("overview.honest.body")}
        </Notice>
      </div>
    </div>
  );
}
