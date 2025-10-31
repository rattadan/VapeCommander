use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("FjfxjdGpEFD1Qg4Vz8tdNpQVZh7RLXQZwY1cU79u7zo7");

#[program]
pub mod vapecommander_rewards {
    use super::*;

   
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.total_users = 0;
        config.bump = ctx.bumps.config;
        
        config.reward_mint = Pubkey::default();
        config.mint_bump = 0;
        config.mint_auth_bump = 0;
        config.decimals = 0;
        Ok(())
    }

   
    pub fn initialize_reward_mint(
        ctx: Context<InitializeRewardMint>,
        decimals: u8,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;

       
        config.reward_mint = ctx.accounts.reward_mint.key();
        config.mint_bump = ctx.bumps.reward_mint;
        config.mint_auth_bump = ctx.bumps.mint_auth_pda;
        config.decimals = decimals;

        Ok(())
    }

  
    pub fn subscribe_minutes(ctx: Context<SubscribeMinutes>, minutes: u64, timestamp: i64) -> Result<()> {
        let user_data = &mut ctx.accounts.user_data;

   
        let delta: u64;
        if user_data.lifetime_minutes > 0 {
            require!(minutes > user_data.lifetime_minutes, RewardsError::AlreadyClaimed);
            delta = minutes - user_data.lifetime_minutes;
        } else {
    
            delta = minutes;
        }

        user_data.user = ctx.accounts.user.key();
        user_data.lifetime_minutes = minutes;
        user_data.last_updated = timestamp;
   
        if user_data.bump == 0 {
            user_data.bump = ctx.bumps.user_data;
        }
  
        mint_delta_to_user(
            delta,
            &ctx.accounts.config,
            ctx.accounts.reward_mint.to_account_info(),
            ctx.accounts.mint_auth_pda.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        )?;
        Ok(())
    }

  
    pub fn add_minutes(ctx: Context<AddMinutes>, minutes: u64, timestamp: i64) -> Result<()> {
        let user_data = &mut ctx.accounts.user_data;
        require!(minutes > user_data.lifetime_minutes, RewardsError::AlreadyClaimed);
        let delta = minutes - user_data.lifetime_minutes;
        user_data.lifetime_minutes = minutes;
        user_data.last_updated = timestamp;
       
        mint_delta_to_user(
            delta,
            &ctx.accounts.config,
            ctx.accounts.reward_mint.to_account_info(),
            ctx.accounts.mint_auth_pda.to_account_info(),
            ctx.accounts.user_token_account.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
        )?;
        Ok(())
    }

  
    pub fn create_profile(
        ctx: Context<CreateProfile>,
        nickname: String,
        tg: String,
        x_handle: String,
        avatar_cid: String,
    ) -> Result<()> {
        require!(nickname.len() as u32 <= UserProfile::MAX_NICK, RewardsError::FieldTooLong);
        require!(tg.len() as u32 <= UserProfile::MAX_TG, RewardsError::FieldTooLong);
        require!(x_handle.len() as u32 <= UserProfile::MAX_X, RewardsError::FieldTooLong);
        require!(avatar_cid.len() as u32 <= UserProfile::MAX_CID, RewardsError::FieldTooLong);

        let profile = &mut ctx.accounts.user_profile;
        profile.user = ctx.accounts.user.key();
        profile.nickname = nickname;
        profile.tg = tg;
        profile.x_handle = x_handle;
        profile.avatar_cid = avatar_cid;
        profile.bump = ctx.bumps.user_profile;
        Ok(())
    }

   
    pub fn set_profile(
        ctx: Context<SetProfile>,
        nickname: String,
        tg: String,
        x_handle: String,
        avatar_cid: String,
    ) -> Result<()> {
        require!(nickname.len() as u32 <= UserProfile::MAX_NICK, RewardsError::FieldTooLong);
        require!(tg.len() as u32 <= UserProfile::MAX_TG, RewardsError::FieldTooLong);
        require!(x_handle.len() as u32 <= UserProfile::MAX_X, RewardsError::FieldTooLong);
        require!(avatar_cid.len() as u32 <= UserProfile::MAX_CID, RewardsError::FieldTooLong);

        let profile = &mut ctx.accounts.user_profile;
       
        require_keys_eq!(profile.user, ctx.accounts.user.key(), RewardsError::Unauthorized);
        profile.nickname = nickname;
        profile.tg = tg;
        profile.x_handle = x_handle;
        profile.avatar_cid = avatar_cid;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = 8 + UserProfile::LEN,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user_profile", user.key().as_ref()],
        bump = user_profile.bump
    )]
    pub user_profile: Account<'info, UserProfile>,
}

#[derive(Accounts)]
#[instruction(minutes: u64, timestamp: i64)]
pub struct SubscribeMinutes<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserData::LEN,
        seeds = [b"user_data", user.key().as_ref()],
        bump
    )]
    pub user_data: Account<'info, UserData>,

    #[account(
        seeds = [b"config2"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"reward_mint"],
        bump = config.mint_bump,
    )]
    pub reward_mint: Account<'info, Mint>,

    
    #[account(
        seeds = [b"reward_mint_auth"],
        bump = config.mint_auth_bump,
    )]
    pub mint_auth_pda: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = reward_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(minutes: u64, timestamp: i64)]
pub struct AddMinutes<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"user_data", user.key().as_ref()],
        bump = user_data.bump
    )]
    pub user_data: Account<'info, UserData>,

    #[account(
        seeds = [b"config2"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        mut,
        seeds = [b"reward_mint"],
        bump = config.mint_bump,
    )]
    pub reward_mint: Account<'info, Mint>,

  
    #[account(
        seeds = [b"reward_mint_auth"],
        bump = config.mint_auth_bump,
    )]
    pub mint_auth_pda: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = reward_mint,
        associated_token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Config::LEN,
        seeds = [b"config2"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(decimals: u8)]
pub struct InitializeRewardMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"config2"],
        bump = config.bump,
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = mint_auth_pda,
        seeds = [b"reward_mint"],
        bump,
    )]
    pub reward_mint: Account<'info, Mint>,

   
    #[account(seeds = [b"reward_mint_auth"], bump)]
    pub mint_auth_pda: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Config {
    pub authority: Pubkey,
    pub total_users: u64,
    pub bump: u8,
    pub reward_mint: Pubkey,
    pub mint_bump: u8,
    pub mint_auth_bump: u8,
    pub decimals: u8,
}

impl Config {
    pub const LEN: usize = 32 + 8 + 1 + 32 + 1 + 1 + 1;
}


fn mint_delta_to_user<'info>(
    delta_minutes: u64,
    config: &Account<Config>,
    reward_mint: AccountInfo<'info>,
    mint_auth_pda: AccountInfo<'info>,
    user_token_account: AccountInfo<'info>,
    token_program: AccountInfo<'info>,
) -> Result<()> {
    if delta_minutes == 0 {
        return Ok(());
    }
    let scale = pow10(config.decimals as u32);
    let amount = delta_minutes
        .checked_mul(scale)
        .ok_or(error!(RewardsError::Unauthorized))?;

    let seeds: &[&[u8]] = &[b"reward_mint_auth", &[config.mint_auth_bump]];
    let signer: &[&[&[u8]]] = &[seeds];

    let cpi_ctx = CpiContext::new_with_signer(
        token_program,
        MintTo { mint: reward_mint, to: user_token_account, authority: mint_auth_pda },
        signer,
    );
    token::mint_to(cpi_ctx, amount)?;
    Ok(())
}

fn pow10(exp: u32) -> u64 {
    10u64.saturating_pow(exp)
}

impl UserData {
    pub const LEN: usize = 32 + 8 + 8 + 1;
}

#[account]
pub struct UserData {
    pub user: Pubkey,
    pub lifetime_minutes: u64,
    pub last_updated: i64,
    pub bump: u8,
}

#[account]
pub struct UserProfile {
    pub user: Pubkey,
    pub nickname: String,
    pub tg: String,
    pub x_handle: String,
    pub avatar_cid: String,
    pub bump: u8,
}

impl UserProfile {
  
    pub const MAX_NICK: u32 = 32;
    pub const MAX_TG: u32 = 64;
    pub const MAX_X: u32 = 64;
    pub const MAX_CID: u32 = 100;
  
    pub const LEN: usize = 32
        + (4 + Self::MAX_NICK as usize)
        + (4 + Self::MAX_TG as usize)
        + (4 + Self::MAX_X as usize)
        + (4 + Self::MAX_CID as usize)
        + 1;
}

#[error_code]
pub enum RewardsError {
    #[msg("Vape rewards already claimed: you can't travel backwards in time")]
    AlreadyClaimed,
    #[msg("Provided field exceeds maximum length")]
    FieldTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
}
