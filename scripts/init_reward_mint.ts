import * as anchor from '@project-serum/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Program ID from declare_id! in the on-chain program
const PROGRAM_ID = new PublicKey('FjfxjdGpEFD1Qg4Vz8tdNpQVZh7RLXQZwY1cU79u7zo7');

// Define the Config account type
interface ConfigAccount {
  authority: PublicKey;
  totalUsers: anchor.BN;
  bump: number;
  rewardMint: PublicKey;
  mintBump: number;
  mintAuthBump: number;
  decimals: number;
}

async function main() {
  // Load provider from environment (Anchor.toml wallet/cluster)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Load IDL from local file
  const idl = JSON.parse(require('fs').readFileSync(
    require('path').join(__dirname, '../target/idl/vapecommander_rewards.json'),
    'utf8'
  ));
  
  const program = new anchor.Program(idl, PROGRAM_ID, provider);
  
  // Derive PDAs
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from('config2')],
    program.programId
  );
  
  const [rewardMintPda] = await PublicKey.findProgramAddress(
    [Buffer.from('reward_mint')],
    program.programId
  );
  
  const [mintAuthPda] = await PublicKey.findProgramAddress(
    [Buffer.from('reward_mint_auth')],
    program.programId
  );
  
  console.log('Program ID:', program.programId.toString());
  console.log('Config PDA:', configPda.toString());
  console.log('Reward Mint PDA:', rewardMintPda.toString());
  console.log('Mint Auth PDA:', mintAuthPda.toString());
  
  try {
    // 1. Initialize config
    console.log('Initializing config...');
    const initConfigTx = await program.methods.initializeConfig()
      .accounts({
        config: configPda,
        rewardMint: rewardMintPda,
        mintAuthority: mintAuthPda,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('Config initialized. Tx:', initConfigTx);
    
    // 2. Initialize reward mint
    console.log('Initializing reward mint...');
    const initMintTx = await program.methods.initializeRewardMint(new anchor.BN(6)) // 6 decimals
      .accounts({
        config: configPda,
        rewardMint: rewardMintPda,
        mintAuthority: mintAuthPda,
        payer: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    
    console.log('Reward mint initialized. Tx:', initMintTx);
    
    // Verify the initialization
    console.log('Verifying initialization...');
    const config = await program.account.config.fetch(configPda) as ConfigAccount;
    console.log('Config account:', {
      authority: config.authority.toString(),
      rewardMint: config.rewardMint.toString(),
      totalUsers: config.totalUsers.toString(),
      decimals: config.decimals
    });
    
    console.log('🎉 Program initialized successfully!');
  } catch (error) {
    console.error('Error initializing program:', error);
    throw error;
  }
}

main().catch(console.error);
