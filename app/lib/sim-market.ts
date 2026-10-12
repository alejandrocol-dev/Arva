"use client";

import { useSyncExternalStore } from "react";
import { WarrantStatus, type ActivityKind, type PoolStats } from "@/lib/arva";

/**
 * Simulated global market for the dashboard showcase: silos across Argentina
 * and neighbouring countries, several grains, and a live tape of protocol
 * activity. Clearly labelled as simulated in the UI. Personal data (wallet,
 * loans, starter kit) never comes from here.
 */
export type SimGrain = "soy" | "corn" | "wheat" | "sunflower" | "sorghum" | "barley";

export interface SimWarrant {
  id: string;
  place: string;
  country: string;
  grain: SimGrain;
  tons: number;
  status: WarrantStatus;
  /** Open loan principal in USDC (0 when not in custody). */
  loan: number;
}

export interface SimEvent {
  id: number;
  kind: ActivityKind;
  /** Unix seconds. */
  at: number;
  warrant: SimWarrant;
  amount: number;
}

export interface SimMarket {
  warrants: SimWarrant[];
  events: SimEvent[];
  stats: PoolStats;
  tons: number;
}

const PRICE: Record<SimGrain, number> = { soy: 380, corn: 190, wheat: 230, sunflower: 410, sorghum: 170, barley: 210 };
const LTV = 0.7;
const TAPE = 6;
const TICK_MS = 10_000;

const { Issued, InCustody, Released, Liquidated } = WarrantStatus;
const SILOS: Array<[string, string, string, SimGrain, number, WarrantStatus]> = [
  ["AR-SF-0142", "Rosario, Santa Fe", "AR", "soy", 240, InCustody],
  ["AR-SF-0318", "Venado Tuerto, Santa Fe", "AR", "corn", 410, InCustody],
  ["AR-BA-0077", "Pergamino, Buenos Aires", "AR", "soy", 320, InCustody],
  ["AR-BA-0521", "Necochea, Buenos Aires", "AR", "wheat", 180, Issued],
  ["AR-CB-0203", "Marcos Juárez, Córdoba", "AR", "corn", 520, InCustody],
  ["AR-CB-0419", "Río Cuarto, Córdoba", "AR", "soy", 150, Released],
  ["AR-ER-0088", "Paraná, Entre Ríos", "AR", "wheat", 200, InCustody],
  ["AR-LP-0034", "General Pico, La Pampa", "AR", "sunflower", 130, Issued],
  ["AR-TU-0012", "Monteros, Tucumán", "AR", "soy", 90, InCustody],
  ["AR-SE-0056", "Quimilí, Santiago del Estero", "AR", "sorghum", 160, InCustody],
  ["AR-CH-0021", "Charata, Chaco", "AR", "sunflower", 110, Liquidated],
  ["BR-MT-1180", "Sorriso, Mato Grosso", "BR", "soy", 600, InCustody],
  ["BR-PR-0734", "Cascavel, Paraná", "BR", "corn", 380, Issued],
  ["UY-SO-0045", "Mercedes, Soriano", "UY", "barley", 140, InCustody],
  ["PY-IT-0093", "Encarnación, Itapúa", "PY", "soy", 260, InCustody],
  ["US-IA-2210", "Ames, Iowa", "US", "corn", 450, Released],
];

const pick = <T,>(xs: T[]): T | undefined => xs[Math.floor(Math.random() * xs.length)];
const now = () => Math.floor(Date.now() / 1000);
const between = (lo: number, hi: number, step: number) => Math.round((lo + Math.random() * (hi - lo)) / step) * step;

/** Mixed ticket sizes: mostly small and mid, sometimes large. */
function ticket(): number {
  const r = Math.random();
  if (r < 0.4) return between(250, 3_000, 10);
  if (r < 0.82) return between(3_000, 18_000, 50);
  return between(18_000, 75_000, 500);
}

/** A loan never exceeds the warrant's max LTV. */
const loanFor = (w: SimWarrant) => Math.min(ticket(), Math.round(w.tons * PRICE[w.grain] * LTV));

let warrants: SimWarrant[] = [];
let events: SimEvent[] = [];
let total = 0;
let seq = 0;
let snapshot: SimMarket | null = null;

function rebuild() {
  const debt = warrants.reduce((s, w) => s + (w.status === InCustody ? w.loan : 0), 0);
  snapshot = {
    warrants: [...warrants],
    events: [...events],
    stats: {
      totalLiquidity: total,
      outstandingDebt: debt,
      available: Math.max(0, total - debt),
      utilizationBps: total > 0 ? Math.round((debt / total) * 10_000) : 0,
    },
    tons: warrants.reduce((s, w) => s + w.tons, 0),
  };
}

function seed() {
  warrants = SILOS.map(([id, place, country, grain, tons, status]) => {
    const w: SimWarrant = { id, place, country, grain, tons, status, loan: 0 };
    return status === InCustody ? { ...w, loan: loanFor(w) } : w;
  });
  total = 420_000;
  const t = now();
  const kinds: ActivityKind[] = ["borrow", "depositLiquidity", "repay", "registerWarrant", "borrow", "setPrice"];
  events = kinds.map((kind, i) => {
    const w = warrants[(i * 5) % warrants.length];
    const amount = kind === "registerWarrant" ? w.tons : kind === "setPrice" ? PRICE[w.grain] : ticket();
    return { id: ++seq, kind, at: t - (i + 1) * 53, warrant: w, amount };
  });
  rebuild();
}

/** One simulated protocol transaction, applied to the market state. */
function step() {
  const by = (s: WarrantStatus) => warrants.filter((w) => w.status === s);
  const roll = Math.random();
  let ev: Omit<SimEvent, "id" | "at"> | null = null;
  const set = (w: SimWarrant, status: WarrantStatus, loan = 0) => {
    const next = { ...w, status, loan };
    warrants = warrants.map((x) => (x.id === w.id ? next : x));
    return next;
  };

  if (roll < 0.3) {
    const w = pick(by(Issued));
    if (w) {
      const loan = loanFor(w);
      ev = { kind: "borrow", warrant: set(w, InCustody, loan), amount: loan };
    }
  } else if (roll < 0.52) {
    const w = pick(by(InCustody));
    if (w) {
      total += Math.round(w.loan * 0.012);
      ev = { kind: "repay", warrant: set(w, Released), amount: w.loan };
    }
  } else if (roll < 0.72) {
    const amount = ticket();
    total += amount;
    ev = { kind: "depositLiquidity", warrant: pick(warrants)!, amount };
  } else if (roll < 0.92) {
    const w = pick([...by(Released), ...by(Liquidated)]);
    if (w) ev = { kind: "registerWarrant", warrant: set(w, Issued), amount: w.tons };
  } else if (roll < 0.97) {
    const w = pick(warrants)!;
    ev = { kind: "setPrice", warrant: w, amount: PRICE[w.grain] };
  } else {
    const w = pick(by(InCustody));
    if (w) ev = { kind: "liquidate", warrant: set(w, Liquidated), amount: w.loan };
  }
  if (!ev) return;
  events = [{ ...ev, id: ++seq, at: now() }, ...events].slice(0, TAPE);
  rebuild();
}

const listeners = new Set<() => void>();
let timer: number | null = null;

function subscribe(cb: () => void) {
  if (!snapshot) seed();
  listeners.add(cb);
  if (timer === null) {
    timer = window.setInterval(() => {
      if (document.hidden) return;
      step();
      listeners.forEach((l) => l());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  };
}

/** Live simulated market; null during SSR and the first client paint. */
export function useSimMarket(): SimMarket | null {
  return useSyncExternalStore(subscribe, () => snapshot, () => null);
}
