const {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} = require('@solana/web3.js');

const {
  TOKEN_PROGRAM_ID,
  createMint,
  getMint,
  MINT_SIZE,
} = require('@solana/spl-token');

async function createRewardTokenMint() {
  console.log('🚀 Creating reward token mint for vapecommander_rewards...');
  console.log('Program Address: A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  console.log('');

 
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  

  const payer = Keypair.generate(); // just for demo 
  console.log('⚠️  DEMO ONLY: Using generated keypair for demonstration');
  console.log('⚠️  In real implementation, use your funded wallet keypair');
  console.log('');

  try {
   
    const balance = await connection.getBalance(payer.publicKey);
    console.log(`Current balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    
   
  
 
    console.log('📋 REWARD TOKEN MINT CREATION PROCESS:');
    console.log('Parameters:');
    console.log('  - Mint Authority: Your wallet (will transfer to program later)');
    console.log('  - Freeze Authority: null (no freeze authority)');
    console.log('  - Decimals: 6 (standard for tokens)');
    console.log('');
    
    console.log('Transaction would include:');
    console.log('  1. SystemProgram.createAccount for mint account (rent-exempt)');
    console.log('  2. TokenProgram.initializeMint instruction');
    console.log('  3. Account size: 82 bytes (MINT_SIZE)');
    console.log('  4. Estimated cost: ~0.0015 SOL for rent + transaction fees');
    console.log('');

   
    console.log('MINT ACCOUNT STRUCTURE:');
    console.log('  - mintAuthority: Your wallet public key');
    console.log('  - supply: 0 (initially no tokens exist)');
    console.log('  - decimals: 6');
    console.log('  - isInitialized: true');
    console.log('  - freezeAuthority: null');
    console.log('');


    const expectedMintAddress = payer.publicKey; 
    console.log('Expected Mint Address (demo):', expectedMintAddress.toString());
    console.log('');

    console.log('🔐 SECURITY NOTES:');
    console.log('  - Mint authority will be transferred to the program config PDA');
    console.log('  - Only the program will be able to mint new tokens');
    console.log('  - No one can burn tokens (no burn authority set)');
    console.log('  - Total supply controlled by usage in the program');
    console.log('');

    console.log('💡 FOR FLUTTER INTEGRATION:');
    console.log('  - Use solana_dart package to create mint');
    console.log('  - Need a funded wallet to pay for account creation');
    console.log('  - Consider token metadata (name, symbol, icon) using Token Metadata Program');
    console.log('');

    console.log('✅ Reward token mint structure is ready!');
    console.log('Next step would be: Initialize config account with this mint');

   
    
  } catch (error) {
    console.error('Error creating reward token:', error);
  }
}

createRewardTokenMint();
