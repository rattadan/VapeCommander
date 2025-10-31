const {
  Connection,
  Keypair,
  clusterApiUrl,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} = require('@solana/web3.js');

const {
  TOKEN_PROGRAM_ID,
} = require('@solana/spl-token');

async function initializeConfigOnDevnet() {
  console.log('🚀 Initializing vapecommander_rewards config on Solana Devnet...');
  console.log('Reward Mint: 7Yk5srXSGPJmF7YzUxUCDaKLZ6w7NfVTeP5EbvsF5DiT');
  console.log('Program Address: A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  console.log('');

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load wallet (current authority)
  const fs = require('fs');
  const secretKey = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json', 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  console.log('✅ Connected to Devnet');
  console.log('💰 Wallet:', payer.publicKey.toString());
  
  // Our reward token mint
  const rewardMint = new PublicKey('7Yk5srXSGPJmF7YzUxUCDaKLZ6w7NfVTeP5EbvsF5DiT');
  
  // The vapecommander_rewards program
  const programId = new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  
  // Calculate the config PDA that will receive mint authority
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config'), rewardMint.toBuffer()],
    programId
  );
  
  console.log('📌 Config PDA:', configPda.toString());
  console.log('');
  
  try {
    console.log('📝 Preparing initializeConfig transaction...');
    console.log('   Config PDA:', configPda.toString());
    console.log('   Reward Mint:', rewardMint.toString());
    console.log('   Base Rate: 1_000_000 (1 token per minute with 6 decimals)');
    
    // The discriminator for initialize_config: [208, 127, 21, 1, 194, 190, 196, 70] from IDL
    const initializeConfigDiscriminator = Buffer.from([208, 127, 21, 1, 194, 190, 196, 70]);
    
    // Base rate per minute as 8-byte little-endian (1 token per minute)
    const baseRatePerMinute = BigInt(1_000_000); // 1 full token with 6 decimals
    const rateBuffer = Buffer.alloc(8);
    rateBuffer.writeBigUInt64LE(baseRatePerMinute, 0);
    
    // Combine discriminator with rate data
    const instructionData = Buffer.concat([
      initializeConfigDiscriminator,
      rateBuffer
    ]);
    
    console.log('   Instruction Data:', instructionData.toString('hex'));
    
    // Accounts for initializeConfig instruction
    const accounts = [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: rewardMint, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
    
    // Create the instruction
    const initializeConfigIx = new TransactionInstruction({
      programId: programId,
      keys: accounts,
      data: instructionData,
    });
    
    // Create transaction
    const transaction = new Transaction().add(initializeConfigIx);
    
    console.log('\n📤 Broadcasting initializeConfig transaction...');
    const signature = await connection.sendTransaction(transaction, [payer]);
    
    console.log('\n🎉 Config initialized successfully!');
    console.log('🔗 Transaction:', signature);
    console.log('💳 Config PDA:', configPda.toString());
    console.log('🏷  Reward Mint:', rewardMint.toString());
    console.log('📊 Base Rate: 1 token per minute');
    console.log('');
    
    console.log('🔐 AUTHORITY TRANSFER COMPLETED:');
    console.log('   - Mint authority was transferred to the program config PDA');
    console.log('   - Only the vapecommander_rewards program can now mint tokens');
    console.log('   - The program controls all reward distribution');
    console.log('');
    
    console.log('✅ Step 2 Complete: Config initialized and authority transferred');
    console.log('💡 Ready for device registration!');
    
    return { configPda, transactionSignature: signature };
    
  } catch (error) {
    console.error('\n❌ Error initializing config:', error);
    throw error;
  }
}

initializeConfigOnDevnet();