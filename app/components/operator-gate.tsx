"use client";

import { useT } from "@/lib/i18n";
import { useView } from "@/lib/nav";
import { StarterKitButton } from "@/components/starter-kit";
import { Button, Card } from "@/components/ui";

/** Shown instead of an operator screen when a regular wallet opens its link directly. */
export function OperatorGate() {
  const t = useT();
  const [, setView] = useView();
  return (
    <div className="mx-auto max-w-xl pt-6">
      <Card title={t("operator.gate.title")}>
        <p className="text-sm leading-relaxed text-mute">{t("operator.gate.body")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StarterKitButton />
          <Button variant="secondary" onClick={() => setView("borrow")}>
            {t("operator.gate.cta")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
