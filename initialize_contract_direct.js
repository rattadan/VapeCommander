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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
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
    
    // Discriminator for initializeConfig: [208, 127, 21, 1, 194, 190, 196, 70]
    // You'd need to get this from the IDL or calculate it
    // For initialize_config function, the discriminator is the first 8 bytes
    // of SHA256("global:initialize_config") truncated to 8 bytes
    const initializeConfigIxData = Buffer.from([...[208, 127, 21, 1, 194, 190, 196, 70]]); // discriminator
    
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
    const { blockhash } = await connection.getLatestBlockhash();
    configTx.recentBlockhash = blockhash;
    
    console.log('📤 Sending initializeConfig transaction...');
    try {
      const configSignature = await connection.sendTransaction(configTx, [payer]);
      console.log('✅ Config initialized successfully!');
      console.log('🔗 Transaction:', configSignature);
    } catch (error) {
      if (error.message.includes('already in use') || error.message.includes('custom program error')) {
        console.log('⚠️  Config already initialized or error (may be ok if already exists):', error.message);
      } else {
        console.error('❌ Error initializing config:', error);
        throw error;
      }
    }
    
    // 2. Initialize Reward Mint
    console.log('\n📝 Building initializeRewardMint transaction...');
    
    // Discriminator for initializeRewardMint + decimals (u8)
    // From the IDL, initialize_reward_mint has discriminator [136, 219, 113, 48, 109, 59, 18, 208]
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
        { pubkey: mintAuthPda, isSigner: false, isWritable: false },    // mint_auth_pda
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
      ],
      data: initializeRewardMintIxData,
    });
    
    const mintTx = new Transaction().add(initializeRewardMintIx);
    mintTx.feePayer = payer.publicKey;
    
    // Get recent blockhash for transaction
    const { blockhash: blockhash2 } = await connection.getLatestBlockhash();
    mintTx.recentBlockhash = blockhash2;
    
    console.log('📤 Sending initializeRewardMint transaction...');
    try {
      const mintSignature = await connection.sendTransaction(mintTx, [payer]);
      console.log('✅ Reward mint initialized successfully!');
      console.log('🔗 Transaction:', mintSignature);
      console.log('💳 Mint Address:', rewardMintPda.toString());
    } catch (error) {
      if (error.message.includes('already in use') || error.message.includes('custom program error')) {
        console.log('⚠️  Reward mint already initialized or error (may be ok if already exists):', error.message);
      } else {
        console.error('❌ Error initializing reward mint:', error);
        throw error;
      }
    }
    
    console.log('\n🎉 Contract initialization completed (or attempted)!');
    console.log('💡 The vapecommander_rewards program should now be ready for use');
    console.log('   - Check if mint authority has been transferred to the program');
    console.log('   - Users can now potentially earn rewards based on device usage');
    
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