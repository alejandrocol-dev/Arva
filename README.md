<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/img/arva-mark-white.png" />
    <img src="docs/img/arva-mark.png" width="96" alt="ARVA" />
  </picture>
</p>

<h1 align="center">ARVA</h1>

<p align="center">
  <b>Open credit for digital grain warrants, on Solana.</b><br/>
  A producer locks a certified grain warrant as collateral and receives USDC in seconds from an open liquidity pool, without selling the harvest.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solana-devnet-6355F6?style=flat-square&logo=solana&logoColor=white" alt="Solana devnet" />
  <img src="https://img.shields.io/badge/Anchor-1.1.2-1B1440?style=flat-square" alt="Anchor" />
  <img src="https://img.shields.io/badge/Next.js-16-17132B?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/USDC-test%20funds-22D3EE?style=flat-square" alt="Test USDC" />
  <img src="https://img.shields.io/badge/status-unaudited-FFB38A?style=flat-square" alt="Unaudited" />
</p>

<p align="center">
  <a href="https://explorer.solana.com/address/AERC53ZiqizgjYdJK9hCeGtSk6PfzwnEn2z3wkMKiqiJ?cluster=devnet"><b>Program on Explorer</b></a> ·
  <a href="docs/SPEC.md"><b>Technical spec</b></a> ·
  <a href="#run-it-locally"><b>Run it</b></a>
</p>

> [!IMPORTANT]
> ARVA runs **only on Solana devnet** (Solana's test network: funds come from a faucet and have no real value). The certifier and the price oracle are **simulated**. The code is **not audited**.

<p align="center">
  <img src="docs/img/dashboard.png" alt="ARVA dashboard reading live data from devnet" />
</p>

---

## The harvest exists. The capital doesn't.

Stored grain is a real asset, but an illiquid one. A producer can have 100 tons of soy sitting in a silo bag, roughly USD 35,000 of goods, and still lack working capital for the next season. Seed, fuel and debt are due on the planting calendar, not the selling one.

Argentina already has a legal instrument over that asset: the **warrant**, a credit title that represents stored goods (**Law 9,643**). In practice, using it as collateral is limited to banks and brokers: bilateral deals, manual paperwork and approval times that don't match the season.

**ARVA turns the warrant into programmable collateral.** The warrant is represented on-chain as one token per ton. The producer locks it in the program's vault, and an open USDC pool originates the loan. Repay, and the collateral is released. If the grain price breaks the liquidation threshold, anyone can liquidate the position, and the rules are the same for everyone.

> *Because the harvest doesn't wait.*

---

## How it works

```
 Certified warrant  ──►  ARVA program vault  ──►  Open USDC pool
  (1 token = 1 t)        (PDA, no private key)     (anyone can supply)
```

| | Step | What happens on-chain |
|---|---|---|
| 1 | **Certify** | The certifier registers a warrant (silo ID, grain, tons) and mints tokens to the producer. |
| 2 | **Supply** | Anyone deposits USDC into the liquidity pool. |
| 3 | **Borrow** | The producer locks the warrant and receives up to **70%** of its value, minus a **0.75%** origination fee. |
| 4 | **Repay** | Principal plus simple interest (accrued per second) is paid back and the tokens are returned. |
| 5 | **Liquidate** | If debt exceeds **80%** of the collateral value, anyone can liquidate and the pool keeps the warrant. |

**Example:** 100 t of soy at 350 USDC/t = 35,000 USDC of collateral → 24,500 USDC loan → **≈ 24,316 USDC** received after the fee. The position becomes liquidatable if soy falls below **306 USDC/t**.

---

## Why on-chain

- **Programmable collateral.** It locks itself, releases itself on repayment, and liquidation is executed by code, not by a court.
- **Public audit trail.** Every loan, repayment and liquidation is a transaction anyone can inspect.
- **No custodian.** The collateral sits in a program-derived vault with no private key.
- **Seconds and cents.** Solana's speed and fees make lending to a small producer viable.

---

## The market

- **The instrument is legal and modernized.** Law 9,643, updated by **DNU 70/2023**, enabled electronic warrants, lot splitting and the producer as depositary.
- **It's growing.** Warrants worth **US$2,079M were issued in 2025, +93% year over year** (Secretaría de Agricultura, via Bichos de Campo).
- **Digitization has started.** A3 Mercados and Matba Rofex launched digital warrant platforms, and the Bolsa de Comercio del Chaco structured the first promissory note backed by a digital warrant on MAV.
- **The capital exists.** **74.3%** of Argentine investors hold crypto (Nexo, *Future of Digital Wealth* 2026) and stablecoins are **72%** of local crypto activity (EY), yet that money rarely reaches the real economy.

**Where ARVA fits:** ARVA doesn't digitize warrants; A3 and Matba Rofex already do. **ARVA is the credit layer on top**, making a digital warrant borrowable against open capital, not only a bank's.

| | What they do | How ARVA differs |
|---|---|---|
| A3 Mercados / Matba Rofex | Issue and register digital warrants | They are issuance. ARVA can be their liquidity layer |
| Banks and brokers | Lend against warrants, bilaterally | ARVA uses an open pool and public rules |
| Agrotoken, Nera, SiloReal, Origino | Tokenize or monitor grain and silo bags | A different instrument. ARVA works on the legal warrant |

---

## The app

- **Landing** that explains the product in plain language, for producers and investors alike.
- **Dashboard** with pool liquidity, outstanding debt, tokenized tons, charts and the latest program transactions, each linked to Solana Explorer.
- **Liquidation simulator:** move the grain price and see exactly when a loan becomes liquidatable.
- **Review screen before every signature:** what you give, what you get, the fee and the liquidation price.
- **Risk in plain language:** four tiers (Healthy, Watch, At risk, Liquidatable) plus how far the price can drop.
- **Guided tour** on every screen for first-time users.
- **English and Spanish.**
- **Demo tools, clearly labeled as simulated:** Certifier (issue warrants) and Admin (move the grain price).

### Real vs. simulated

| ✅ Real (on devnet) | 🧪 Simulated |
|---|---|
| The program, accounts, signatures and public record | The certifier (in production, a licensed warehouse) |
| The collateral vault and liquidation logic | The price oracle (in production, a market feed) |
| Warrant tokens and the liquidity pool | USDC is a test token; the pool is funded by the team |

---

## Roadmap

1. **Validate with the industry:** producers, grain elevators and licensed warehouses.
2. **Real certification:** a licensed warehouse signs issuance, following the Chaco precedent.
3. **Real prices:** replace the simulated oracle with a grain price feed.
4. **Plug into existing rails:** act as the open liquidity layer for A3 and Matba Rofex digital warrants.
5. **Withdrawals and yield for lenders:** in this MVP, supplied liquidity can't be withdrawn yet.
6. **More agro instruments:** the same model for other negotiable titles.
7. **Audit and regulatory framework** before any use with real money.

---

## Built with

| Layer | Stack |
|---|---|
| On-chain program | Anchor 1.1.2 + SPL Token (classic), a single program |
| Tests | Rust + LiteSVM (`cargo test`), 16 tests covering instructions and negative cases |
| Frontend | Next.js 16 + TypeScript + Tailwind + Solana Wallet Adapter (Phantom) |
| Scripts | TypeScript (devnet setup, full cycle, inspection) |

**Instructions:** `initialize` · `set_price` · `register_warrant` · `deposit_liquidity` · `borrow` · `repay` · `liquidate`

**Program ID (devnet):** [`AERC53ZiqizgjYdJK9hCeGtSk6PfzwnEn2z3wkMKiqiJ`](https://explorer.solana.com/address/AERC53ZiqizgjYdJK9hCeGtSk6PfzwnEn2z3wkMKiqiJ?cluster=devnet)<br/>
**Test USDC mint:** `12KPRGKraqyydu8favsGtMGqqm23YUEwgc3TVHGwjuef`

```
programs/arva/   Anchor program (src/, tests/)
app/              Next.js frontend (landing at public/index.html, app at /app)
scripts/          Devnet scripts (TS)
docs/SPEC.md      Technical contract (takes precedence over code)
docs/DESIGN.md    UI design brief
docs/img/         Screenshots and brand assets
```

<a id="run-it-locally"></a>
### Run it locally

```bash
# Program
anchor build
cargo test
anchor deploy --provider.cluster devnet

# Frontend → http://localhost:3000
cd app
npm install
NEXT_PUBLIC_USE_REAL=true npm run dev
```

- `NEXT_PUBLIC_USE_REAL=true` reads and writes on devnet; without it, the app uses in-memory mock data.
- `NEXT_PUBLIC_RPC_URL` overrides the RPC (default `https://api.devnet.solana.com`).
- You need **Phantom set to devnet** to sign transactions.

---

## Project rules

- **Devnet only.** Never mainnet, never real funds.
- **No keys or secrets** in the repository.
- **Every transaction requires the user's explicit signature.**

## Use of AI

Built with Devin as a coding assistant. The idea, product design, specifications and review are the author's; generated code was reviewed before each commit.

<p align="center"><sub>ARVA · built on Solana · devnet · not audited</sub></p>
