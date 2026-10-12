use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    constants::*,
    error::AgroError,
    state::{loan_status, warrant_status, Config, Loan, Warrant},
};

#[derive(Accounts)]
pub struct Liquidate<'info> {
    /// Permissionless: anyone can trigger liquidation of an unhealthy loan.
    #[account(mut)]
    pub liquidator: Signer<'info>,
    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump,
    )]
    pub config: Box<Account<'info, Config>>,
    #[account(
        mut,
        seeds = [WARRANT_SEED, warrant.silo_id.as_bytes()],
        bump = warrant.bump,
        has_one = mint,
    )]
    pub warrant: Box<Account<'info, Warrant>>,
    #[account(
        mut,
        seeds = [LOAN_SEED, warrant.key().as_ref()],
        bump = loan.bump,
        constraint = loan.status == loan_status::OPEN @ AgroError::LoanNotOpen,
    )]
    pub loan: Box<Account<'info, Loan>>,
    /// Warrant mint backing the collateral (1 token = 1 ton).
    pub mint: Box<Account<'info, Mint>>,
    /// CHECK: PDA that only acts as token authority over the warrant custody account; stores no data.
    #[account(
        seeds = [WARRANT_VAULT_SEED, warrant.key().as_ref()],
        bump
    )]
    pub warrant_vault: UncheckedAccount<'info>,
    /// CHECK: PDA that only acts as token authority over the pool accounts; stores no data.
    #[account(seeds = [POOL_VAULT_SEED], bump)]
    pub pool_vault: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = warrant_vault,
        associated_token::token_program = token_program,
    )]
    pub custody_token_account: Box<Account<'info, TokenAccount>>,
    /// Pool treasury for seized collateral: ATA of the pool vault PDA for this warrant mint.
    #[account(
        init_if_needed,
        payer = liquidator,
        associated_token::mint = mint,
        associated_token::authority = pool_vault,
        associated_token::token_program = token_program,
    )]
    pub pool_collateral_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = liquidator,
        associated_token::mint = mint,
        associated_token::authority = liquidator,
        associated_token::token_program = token_program,
    )]
    pub liquidator_warrant_token_account: Box<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handle_liquidate(ctx: Context<Liquidate>) -> Result<()> {
    let config = &ctx.accounts.config;
    let interest = ctx
        .accounts
        .loan
        .accrued_interest(config.annual_interest_bps, Clock::get()?.unix_timestamp)?;
    let debt = (ctx.accounts.loan.principal as u128)
        .checked_add(interest as u128)
        .ok_or(AgroError::MathOverflow)?;
    let value = (ctx.accounts.warrant.tons as u128)
        .checked_mul(config.price_per_ton as u128)
        .ok_or(AgroError::MathOverflow)?;

    // health = value * liq_threshold_bps / (debt * 10_000); liquidatable iff health < 1.
    // A zero-debt loan is trivially healthy (also avoids the division).
    let healthy = debt == 0
        || value
            .checked_mul(config.liq_threshold_bps as u128)
            .ok_or(AgroError::MathOverflow)?
            >= debt.checked_mul(10_000).ok_or(AgroError::MathOverflow)?;
    require!(!healthy, AgroError::HealthyLoan);

    // Seize the collateral: the liquidator earns a bonus share, the pool treasury keeps the rest.
    let collateral = ctx.accounts.custody_token_account.amount;
    let bonus = (collateral as u128)
        .checked_mul(LIQUIDATION_BONUS_BPS as u128)
        .map(|v| v / 10_000)
        .ok_or(AgroError::MathOverflow)?;
    let bonus = u64::try_from(bonus).map_err(|_| AgroError::MathOverflow)?;
    let to_pool = collateral.checked_sub(bonus).ok_or(AgroError::MathOverflow)?;

    let warrant_key = ctx.accounts.warrant.key();
    let warrant_vault_seeds: &[&[u8]] = &[
        WARRANT_VAULT_SEED,
        warrant_key.as_ref(),
        &[ctx.bumps.warrant_vault],
    ];
    for (to, amount) in [
        (ctx.accounts.pool_collateral_token_account.to_account_info(), to_pool),
        (ctx.accounts.liquidator_warrant_token_account.to_account_info(), bonus),
    ] {
        if amount == 0 {
            continue;
        }
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.custody_token_account.to_account_info(),
                    to,
                    authority: ctx.accounts.warrant_vault.to_account_info(),
                },
                &[warrant_vault_seeds],
            ),
            amount,
        )?;
    }

    ctx.accounts.loan.status = loan_status::LIQUIDATED;
    ctx.accounts.warrant.status = warrant_status::LIQUIDATED;

    msg!("Loan liquidated: {} t to pool, {} t bonus to liquidator", to_pool, bonus);
    Ok(())
}
