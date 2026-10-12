# SPEC: Arva (technical contract)

> **This file is the contract between the program and the frontend.** Both are built against it, not against each other. If something changes, it changes here first.

## Anchor program `arva` (a single program)

### Accounts

| Account | Type | Fields |
|---|---|---|
| `Config` | PDA seeds `["config"]` | `admin`, `certifier`, `usdc_mint`, `price_per_ton` (u64, USDC with 6 decimals), `ltv_bps` (u16, default 7000), `liq_threshold_bps` (u16, default 8000), `fee_bps` (u16, default 75), `annual_interest_bps` (u16, configurable, **demo assumption**), `bump` |
| `Warrant` | PDA seeds `["warrant", silo_id]` | `owner` (producer), `certifier`, `silo_id` (string, max 32 bytes), `grain` (u8: 0 = soybean), `tons` (u64), `mint` (SPL), `status` (0 = Issued, 1 = InCustody, 2 = Liquidated, 3 = Released), `bump` |
| `Loan` | PDA seeds `["loan", warrant]` | `borrower`, `warrant`, `principal` (u64), `opened_at` (i64), `status` (0 = Open, 1 = Repaid, 2 = Liquidated), `bump` |
| Pool USDC | ATA of the `["pool_vault"]` PDA | holds the liquidity |
| Pool treasury | ATA of the `["pool_vault"]` PDA for a warrant mint | receives seized collateral |
| Warrant custody | ATA of the `["warrant_vault", warrant]` PDA | holds the collateral while a loan is open |

The warrant is a **classic SPL mint** (0 decimals, supply = tons) with PDA authority `["mint_authority", warrant]`. Token-2022 is out of scope for the MVP.

### Instructions

| Instruction | Who | What it does |
|---|---|---|
| `initialize` | admin | Creates `Config` and the pool vault. |
| `set_price(price)` | admin only | Updates `price_per_ton`. Once a price exists, each update must stay between half and double the current price. |
| `deposit_liquidity(amount)` | anyone | Transfers the caller's USDC into the pool. |
| `register_warrant(silo_id, grain, tons, producer)` | `certifier` only | Creates `Warrant` and its SPL mint, and mints `tons` to the producer. |
| `borrow(warrant)` | warrant owner | Checks status Issued and ownership; requires the borrower to hold exactly `tons` warrant tokens and moves them to custody; `max = tons × price × ltv_bps / 10000`; transfers `max - fee` USDC to the borrower (the fee stays in the pool); creates `Loan`. |
| `repay(warrant)` | borrower | `total = principal + principal × annual_interest_bps × elapsed / (10000 × seconds_per_year)` (simple interest by timestamp); transfers USDC to the pool; returns the warrant tokens; `Loan` → Repaid, `Warrant` → Released. |
| `liquidate(warrant)` | anyone | `health = value × liq_threshold_bps / (debt × 10000)` with `value = tons × price`; if `health < 1`: moves the custody tokens to the pool treasury, minus `LIQUIDATION_BONUS_BPS` (500 = 5%) paid to the liquidator; `Loan` → Liquidated, `Warrant` → Liquidated. |
| `withdraw_liquidity` | out of MVP scope | (roadmap) |

### Math

- Integers only (u64, with u128 for products), no floats, checked operations.
- `value = tons × price_per_ton`.
- `max_loan = value × ltv_bps / 10000`.
- `health = value × liq_threshold_bps / (debt × 10000)`; liquidate when `health < 1`.
- Test USDC has 6 decimals; the warrant has 0 decimals (1 token = 1 ton).

### Errors (enum `AgroError`, codes from 6000)

`NotAdmin`, `NotCertifier`, `NotOwner`, `WarrantNotIssued`, `LoanExists`, `LoanNotOpen`, `InsufficientLiquidity`, `LtvExceeded`, `HealthyLoan`, `MathOverflow`, `NothingToRepay`, `PriceNotSet`, `CollateralMismatch`, `PriceChangeTooLarge`.

## Tests: Rust with LiteSVM (`cargo test`)

> Anchor 1.1.2 template: tests live in `programs/arva/tests/*.rs` and use `litesvm`, which loads the compiled `.so` and runs in-process (fast, no validator). Run `anchor build` and then `cargo test` from the repo root.

Happy path: initialize → set_price → deposit → register → borrow → repay.
Negative and edge cases: non-certifier registers; non-admin sets the price; price update outside the circuit breaker; double borrow on the same warrant; borrow by a non-owner; borrow with partial collateral; borrow without liquidity; borrow without a price; repay by a non-borrower; repay of a closed loan; liquidate a healthy loan; liquidate after a price drop (collateral to the pool treasury, bonus to the liquidator); liquidate twice.

## Frontend (`app/`, Next.js + TS + Tailwind + wallet adapter)

- Fixed **devnet** cluster, Phantom. UI in **English and Spanish**. The simulated parts (certifier, oracle, global market view) are labeled as such.
- Views: **Overview**, **Borrow** (producer), **Earn** (investor) and the demo tools **Certifier** and **Admin** (set price, "Simulate price drop −30%", "Reset to 350", `liquidate` on open loans).
- Every transaction links to Solana Explorer (devnet).
- Data goes through a typed interface (`lib/arva.ts`) with an in-memory mock and the real client generated from the IDL (`lib/arva-real.ts`).
- Starter kit (`app/app/api/starter/route.ts`): sends devnet SOL, test USDC and a 100 t demo warrant to the requesting wallet, signed by the service wallet from the `ARVA_SERVICE_SECRET` environment variable (never in the repo).

## Scripts (`scripts/`)

- `setup-devnet.ts`: creates the test USDC mint, initializes, sets the price, funds the pool and registers a sample warrant. Keys stay **outside the repo**.
- `test-cycle.ts`, `test-starter.ts`, `list-warrants.ts`, `inspect.ts`: devnet checks.

## Conventions

- Rust: standard Anchor, Anchor error codes, comments only where the business rule isn't obvious. No `unsafe`.
- TS: Next.js ESLint config, no `any` in the program client.
- **Hard rule:** no mainnet, no keys in files, every transaction signature needs human approval.
