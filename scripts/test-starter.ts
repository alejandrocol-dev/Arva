/**
 * test-starter.ts — exercises the /api/starter faucet (devnet starter kit).
 *
 * Hits the HTTP endpoint with freshly generated wallets, no Phantom needed:
 * funds a new wallet, checks the per-wallet cooldown, confirms a second
 * wallet is unaffected, rejects bad input, and verifies the "already topped
 * up" skip once the cooldown expires.
 *
 * Run:  npx tsx scripts/test-starter.ts [baseUrl]   (from repo root, inside WSL)
 *       default base: http://localhost:3000 — pass https://arva-devnet.vercel.app for prod
 */

import { Keypair } from "@solana/web3.js";

const BASE = process.argv[2] ?? "http://localhost:3000";
const COOLDOWN_WAIT_MS = 22_000;

let pass = 0;
let failCount = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? "PASS" : "FAIL"} ${name} — ${detail}`);
  ok ? pass++ : failCount++;
}

async function post(wallet: string): Promise<{ status: number; body: any }> {
  const res = await fetch(`${BASE}/api/starter`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet }),
  });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error page */
  }
  return { status: res.status, body };
}

async function main() {
  const w1 = Keypair.generate().publicKey.toBase58();
  const w2 = Keypair.generate().publicKey.toBase58();
  console.log(`target: ${BASE}`);

  // 1. A fresh wallet gets SOL + USDC + a demo warrant in one tx.
  const r1 = await post(w1);
  check(
    "fresh wallet funded",
    r1.status === 200 &&
      r1.body?.ok === true &&
      r1.body.granted?.sol > 0 &&
      r1.body.granted?.usdc > 0 &&
      typeof r1.body.granted?.warrant === "string",
    `${r1.status} ${JSON.stringify(r1.body)}`,
  );

  // 2. Same wallet inside the 20 s cooldown is rejected.
  const r2 = await post(w1);
  check(
    "cooldown blocks same wallet",
    r2.status === 429 && r2.body?.error === "cooldown",
    `${r2.status} ${JSON.stringify(r2.body)}`,
  );

  // 3. Cooldown is per wallet: a different fresh one still gets funded.
  const r3 = await post(w2);
  check(
    "other wallet unaffected",
    r3.status === 200 && r3.body?.ok === true,
    `${r3.status} ${JSON.stringify(r3.body)}`,
  );

  // 4. Bad input is a 400.
  const r4 = await post("notawallet");
  check("bad wallet rejected", r4.status === 400 && r4.body?.error === "bad_wallet", `${r4.status}`);

  // 5. After the cooldown the same wallet is already topped up: all skipped.
  console.log(`waiting ${COOLDOWN_WAIT_MS / 1000}s for the cooldown to expire...`);
  await new Promise((r) => setTimeout(r, COOLDOWN_WAIT_MS));
  const r5 = await post(w1);
  check(
    "already funded -> nothing granted",
    r5.status === 200 &&
      r5.body?.ok === true &&
      r5.body.signature === null &&
      r5.body.granted?.sol === 0 &&
      r5.body.granted?.usdc === 0 &&
      r5.body.granted?.warrant === null,
    `${r5.status} ${JSON.stringify(r5.body)}`,
  );

  console.log(`\n${pass} passed, ${failCount} failed`);
  process.exit(failCount ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
