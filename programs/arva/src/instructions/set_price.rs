use anchor_lang::prelude::*;

use crate::{constants::*, error::AgroError, state::Config};

#[derive(Accounts)]
pub struct SetPrice<'info> {
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [CONFIG_SEED],
        bump = config.bump,
        has_one = admin @ AgroError::NotAdmin,
    )]
    pub config: Account<'info, Config>,
}

pub fn handle_set_price(ctx: Context<SetPrice>, price: u64) -> Result<()> {
    // Circuit breaker: once a price exists, each update may at most halve or double it.
    let current = ctx.accounts.config.price_per_ton as u128;
    let new = price as u128;
    require!(
        current == 0 || (new * 2 >= current && new <= current * 2),
        AgroError::PriceChangeTooLarge
    );
    ctx.accounts.config.price_per_ton = price;
    msg!("price_per_ton set to {}", price);
    Ok(())
}
