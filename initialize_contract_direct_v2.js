const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} = require('@solana/web3.js');

const {
  TOKEN_PROGRAM_ID,
  getMint,
  createAccount,
  getAssociatedTokenAddress,
} = require('@solana/spl-token');
const fs = require('fs');

// Program ID from declare_id! in the on-chain program
const PROGRAM_ID = new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');

async function initializeContractDirect() {
  console.log('🚀 Initializing vapecommander_rewards contract (Direct Transaction)...');
  
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet from Solana CLI config
  try {
    const secretKey = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json', 'utf8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
    
    console.log('✅ Connected to Devnet');
    console.log('💰 Wallet:', payer.publicKey.toString());
    
    // Derive PDAs
    const [configPda] = PublicKey.findProgramAddressSync([
      Buffer.from('config2'),  // Updated to match contract
    ], PROGRAM_ID);
    
    const [rewardMintPda] = PublicKey.findProgramAddressSync([
      Buffer.from('reward_mint'),
    ], PROGRAM_ID);
    
    const [mintAuthPda] = PublicKey.findProgramAddressSync([
      Buffer.from('reward_mint_auth'),
    ], PROGRAM_ID);
    
    console.log('\n📋 PDA Addresses:');
    console.log('   Config PDA:', configPda.toString());
    console.log('   Reward Mint PDA:', rewardMintPda.toString());
    console.log('   Mint Auth PDA:', mintAuthPda.toString());
    
    // Parameters
    const decimals = 6; // Standard SPL token decimals
    
    // 1. Initialize Config
    console.log('\n📝 Building initializeConfig transaction...');
    
    // Discriminator for initialize_config: [208, 127, 21, 1, 194, 190, 196, 70]
    const initializeConfigIxData = Buffer.from([208, 127, 21, 1, 194, 190, 196, 70]); // discriminator
    
    const initializeConfigIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },  // authority
        { pubkey: configPda, isSigner: false, isWritable: true },       // config
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
      ],
      data: initializeConfigIxData,
    });
    
    const configTx = new Transaction().add(initializeConfigIx);
    configTx.feePayer = payer.publicKey;
    
    // Get recent blockhash for transaction
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    configTx.recentBlockhash = blockhash;
    
    console.log('📤 Sending initializeConfig transaction...');
    const configSignature = await connection.sendTransaction(configTx, [payer]);
    
    // Wait for confirmation
    await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature: configSignature,
    });
    
    console.log('✅ Config initialized successfully!');
    console.log('🔗 Transaction:', configSignature);
    
    // Verify config was created
    console.log('\n🔍 Verifying config was created...');
    try {
      const configAccount = await connection.getAccountInfo(configPda);
      if (configAccount) {
        console.log('✅ Config account exists with data');
      } else {
        console.log('⚠️ Config account does not exist yet');
      }
    } catch (e) {
      console.log('⚠️ Could not fetch config account (may be due to program account structure):', e.message);
    }
    
    // 2. Initialize Reward Mint (after ensuring config is available)
    console.log('\n📝 Building initializeRewardMint transaction...');
    
    // Discriminator for initialize_reward_mint: [136, 219, 113, 48, 109, 59, 18, 208]
    const initializeRewardMintDiscriminator = [136, 219, 113, 48, 109, 59, 18, 208];
    const decimalsBuffer = Buffer.from([decimals]); // u8 for decimals
    
    const initializeRewardMintIxData = Buffer.concat([
      Buffer.from(initializeRewardMintDiscriminator),
      decimalsBuffer
    ]);
    
    const initializeRewardMintIx = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },  // payer
        { pubkey: configPda, isSigner: false, isWritable: true },       // config
        { pubkey: rewardMintPda, isSigner: false, isWritable: true },   // reward_mint
        { pubkey: mintAuthPda, isSigner: false, isWritable: false },    // mint_auth_pda - should be "unchecked" account
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      ],
      data: initializeRewardMintIxData,
    });
    
    const mintTx = new Transaction().add(initializeRewardMintIx);
    mintTx.feePayer = payer.publicKey;
    
    // Get recent blockhash for transaction
    const { blockhash: blockhash2, lastValidBlockHeight: lastValidBlockHeight2 } = await connection.getLatestBlockhash();
    mintTx.recentBlockhash = blockhash2;
    
    console.log('📤 Sending initializeRewardMint transaction...');
    try {
      const mintSignature = await connection.sendTransaction(mintTx, [payer]);
      
      // Wait for confirmation
      await connection.confirmTransaction({
        blockhash: blockhash2,
        lastValidBlockHeight: lastValidBlockHeight2,
        signature: mintSignature,
      });
      
      console.log('✅ Reward mint initialized successfully!');
      console.log('🔗 Transaction:', mintSignature);
      console.log('💳 Mint Address:', rewardMintPda.toString());
      
      // Try to fetch the mint to confirm
      try {
        const mintInfo = await getMint(connection, rewardMintPda);
        console.log('\n📋 Mint Information:');
        console.log('   Supply:', mintInfo.supply.toString());
        console.log('   Decimals:', mintInfo.decimals);
        console.log('   Mint Authority:', mintInfo.mintAuthority?.toString() || 'null');
        console.log('   Freeze Authority:', mintInfo.freezeAuthority?.toString() || 'null');
      } catch (e) {
        console.log('\n⚠️ Could not fetch mint info (may still be initializing):', e.message);
      }
    } catch (error) {
      console.error('\n❌ Error initializing reward mint:', error);
      console.log('\n💡 This could be due to:'); 
      console.log('   - The PDA addresses not matching what the program expects');
      console.log('   - The mint already existing');
      console.log('   - Transaction timing issues');
      throw error;
    }
    
    console.log('\n🎉 Contract initialization completed successfully!');
    console.log('💡 The vapecommander_rewards program is now ready for use');
    console.log('   - Mint authority has been transferred to the program');
    console.log('   - Users can now earn rewards based on device usage');
    
  } catch (error) {
    console.error('\n❌ Error during initialization:', error);
    throw error;
  }
}

initializeContractDirect()
  .then(() => {
    console.log('\n✅ Initialization process completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  });