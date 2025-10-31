const anchor = require('@project-serum/anchor');
const { Keypair, PublicKey, Connection, SystemProgram } = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

// Program ID from declare_id! in the on-chain program
const PROGRAM_ID = new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');

async function initializeContract() {
  console.log('🚀 Initializing vapecommander_rewards contract...');
  
  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet from Solana CLI config
  try {
    const secretKey = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json', 'utf8'));
    const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
    
    console.log('✅ Connected to Devnet');
    console.log('💰 Wallet:', payer.publicKey.toString());
    
    // Create provider
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
      commitment: 'confirmed',
    });
    
    anchor.setProvider(provider);
    
    // Load IDL from the local file
    const idlPath = './target/idl/vapecommander_rewards.json';
    const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
    
    // Create program instance
    const program = new anchor.Program(idl, PROGRAM_ID, provider);
    
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
    
    console.log('\n📝 Step 1: Initialize Config Account...');
    try {
      const configTx = await program.methods.initializeConfig()
        .accounts({
          authority: payer.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([payer])
        .rpc();
        
      console.log('✅ Config initialized successfully!');
      console.log('🔗 Transaction:', configTx);
    } catch (error) {
      if (error.message.includes('already in use')) {
        console.log('⚠️  Config already initialized, continuing...');
      } else {
        console.error('❌ Error initializing config:', error);
        throw error;
      }
    }
    
    console.log('\n📝 Step 2: Initialize Reward Mint...');
    try {
      const mintTx = await program.methods.initializeRewardMint(decimals)
        .accounts({
          payer: payer.publicKey,
          config: configPda,
          rewardMint: rewardMintPda,
          mintAuthPda: mintAuthPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([payer])
        .rpc();
        
      console.log('✅ Reward mint initialized successfully!');
      console.log('🔗 Transaction:', mintTx);
      console.log('💳 Mint Address:', rewardMintPda.toString());
      
      // Fetch mint info to confirm
      const mintAccount = await program.account.config.fetch(configPda);
      console.log('\n📋 Config Account Data:');
      console.log('   Authority:', mintAccount.authority.toString());
      console.log('   Total Users:', mintAccount.totalUsers.toString());
      console.log('   Reward Mint:', mintAccount.rewardMint.toString());
      console.log('   Decimals:', mintAccount.decimals);
      
    } catch (error) {
      if (error.message.includes('already in use')) {
        console.log('⚠️  Reward mint already initialized, continuing...');
      } else {
        console.error('❌ Error initializing reward mint:', error);
        throw error;
      }
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

initializeContract()
  .then(() => {
    console.log('\n✅ Initialization process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Initialization failed:', error);
    process.exit(1);
  });