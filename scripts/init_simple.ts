import * as anchor from '@project-serum/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Program ID
const PROGRAM_ID = new PublicKey('FjfxjdGpEFD1Qg4Vz8tdNpQVZh7RLXQZwY1cU79u7zo7');

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config2')],
    PROGRAM_ID
  );
  
  const [rewardMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_mint')],
    PROGRAM_ID
  );
  
  const [mintAuthPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_mint_auth')],
    PROGRAM_ID
  );
  
  console.log('Program ID:', PROGRAM_ID.toString());
  console.log('Config PDA:', configPda.toString());
  console.log('Reward Mint PDA:', rewardMintPda.toString());
  console.log('Mint Auth PDA:', mintAuthPda.toString());
  console.log();
  
  try {
    // Check if config already exists
    const configAccount = await provider.connection.getAccountInfo(configPda);
    
    if (!configAccount) {
      // 1. Initialize config
      console.log('Step 1: Initializing config...');
      const initConfigIx = await buildInitializeConfigInstruction(
        provider.wallet.publicKey,
        configPda,
        PROGRAM_ID
      );
      
      const initConfigTx = new anchor.web3.Transaction().add(initConfigIx);
      const initConfigSig = await provider.sendAndConfirm(initConfigTx);
      console.log('✅ Config initialized. Tx:', initConfigSig);
    } else {
      console.log('✅ Config already initialized');
    }
    
    // Check if reward mint already exists
    const rewardMintAccount = await provider.connection.getAccountInfo(rewardMintPda);
    
    if (!rewardMintAccount) {
      // 2. Initialize reward mint
      console.log('Step 2: Initializing reward mint...');
      const initMintIx = await buildInitializeRewardMintInstruction(
        provider.wallet.publicKey,
        configPda,
        rewardMintPda,
        mintAuthPda,
        PROGRAM_ID
      );
      
      const initMintTx = new anchor.web3.Transaction().add(initMintIx);
      const initMintSig = await provider.sendAndConfirm(initMintTx);
      console.log('✅ Reward mint initialized. Tx:', initMintSig);
    } else {
      console.log('✅ Reward mint already initialized');
    }
    
    console.log();
    console.log('🎉 Initialization complete!');
    console.log('You can now use the reward mint:', rewardMintPda.toString());
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

// Build initialize_config instruction manually
function buildInitializeConfigInstruction(
  authority: PublicKey,
  config: PublicKey,
  programId: PublicKey
): anchor.web3.TransactionInstruction {
  // Discriminator for initialize_config (from IDL)
  const discriminator = Buffer.from([208, 127, 21, 1, 194, 190, 196, 70]);
  
  return new anchor.web3.TransactionInstruction({
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId,
    data: discriminator,
  });
}

// Build initialize_reward_mint instruction manually
function buildInitializeRewardMintInstruction(
  payer: PublicKey,
  config: PublicKey,
  rewardMint: PublicKey,
  mintAuthPda: PublicKey,
  programId: PublicKey
): anchor.web3.TransactionInstruction {
  // Discriminator for initialize_reward_mint (from IDL)
  const discriminator = Buffer.from([136, 219, 113, 48, 109, 59, 18, 208]);
  
  // Decimals parameter (6)
  const decimals = Buffer.from([6]);
  
  const data = Buffer.concat([discriminator, decimals]);
  
  return new anchor.web3.TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: config, isSigner: false, isWritable: true },
      { pubkey: rewardMint, isSigner: false, isWritable: true },
      { pubkey: mintAuthPda, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId,
    data,
  });
}

main().catch(console.error);
