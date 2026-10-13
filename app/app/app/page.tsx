"use client";

import type { ReactNode } from "react";
import { AdminView } from "@/components/views/admin-view";
import { CertifierView } from "@/components/views/certifier-view";
import { HelpView } from "@/components/views/help-view";
import { InvestorView } from "@/components/views/investor-view";
import { OverviewView } from "@/components/views/overview-view";
import { ProducerView } from "@/components/views/producer-view";
import { OperatorGate } from "@/components/operator-gate";
import { Skeleton } from "@/components/ui";
import { useScrollTopOnChange, useView } from "@/lib/nav";
import { useOperator } from "@/lib/role";

export default function AppHome() {
  const [view] = useView();
  const { ready, canCertify, canAdmin } = useOperator();
  useScrollTopOnChange(view);

  const operatorOnly = (allowed: boolean, screen: ReactNode) =>
    allowed ? screen : ready ? <OperatorGate /> : <Skeleton className="h-64" />;

  return (
    <div key={view} className="av-view">
      {view === "overview" && <OverviewView />}
      {view === "borrow" && <ProducerView />}
      {view === "earn" && <InvestorView />}
      {view === "certifier" && operatorOnly(canCertify, <CertifierView />)}
      {view === "admin" && operatorOnly(canAdmin, <AdminView />)}
      {view === "help" && <HelpView />}
    </div>
  );
}
