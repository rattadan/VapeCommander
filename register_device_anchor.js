const anchor = require('@coral-xyz/anchor');
const { 
  Connection, 
  PublicKey, 
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY
} = require('@solana/web3.js');
const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');

async function registerDeviceWithAnchor() {
  console.log('📱 Registering demo device using Anchor...');
  console.log('Program Address: A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  console.log('Config Account: GCvK7a7g4ABQ3J862i4Qno5jahz4pDsmmGsb98JFBVj');
  console.log('');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  // Load wallet
  const secretKey = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json', 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  // Set up Anchor provider
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {
    commitment: 'confirmed',
  });
  
  // Load the IDL from the deployed contract
  const idl = JSON.parse(fs.readFileSync('./target/idl/vapecommander_rewards.json', 'utf8'));
  const programId = new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  
  // Create the program instance
  const program = new anchor.Program(idl, programId, provider);
  
  console.log('✅ Connected to Devnet via Anchor');
  console.log('💰 Authority Wallet:', payer.publicKey.toString());
  
  // Demo device information
  const deviceKeypair = Keypair.generate();
  const deviceMacAddress = 'aabbccddeeff';
  
  console.log('\n📋 Demo Device Information:');
  console.log('   Device Public Key:', deviceKeypair.publicKey.toString());
  console.log('   MAC Address:', deviceMacAddress);
  
  // Calculate device hash (SHA256 of lowercase MAC)
  const crypto = require('crypto');
  const deviceHash = crypto.createHash('sha256').update(deviceMacAddress.toLowerCase()).digest();
  console.log('   Device Hash:', deviceHash.toString('hex'));
  
  // Calculate device PDA using seeds ["device", device_hash]
  const [devicePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('device'), deviceHash],
    programId
  );
  
  console.log('   Device PDA:', devicePda.toString());
  
  // Calculate config PDA using seeds ["config", reward_mint]
  const rewardMint = new PublicKey('7Yk5srXSGPJmF7YzUxUCDaKLZ6w7NfVTeP5EbvsF5DiT');
  const [configPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from('config'), rewardMint.toBuffer()],
    programId
  );
  
  console.log('   Config PDA:', configPda.toString());
  
  try {
    console.log('\n📝 Registering device using Anchor...');
    console.log('   Config:', configPda.toString());
    console.log('   Device PDA:', devicePda.toString());
    console.log('   Device Public Key:', deviceKeypair.publicKey.toString());
    console.log('   Device Hash (first 8 bytes):', deviceHash.slice(0, 8).toString('hex'));
    
    // Call the registerDevice instruction
    const tx = await program.methods
      .registerDevice(deviceKeypair.publicKey, Array.from(deviceHash))
      .accounts({
        authority: payer.publicKey,
        config: configPda,
        device: devicePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log('\n🎉 Device registered successfully!');
    console.log('🔗 Transaction:', tx);
    console.log('📱 Device PDA:', devicePda.toString());
    console.log('🏷  Device Public Key:', deviceKeypair.publicKey.toString());
    console.log('🔢 Device Hash:', deviceHash.toString('hex'));
    console.log('');
    
    console.log('✅ Device registration completed successfully!');
    console.log('💡 The vapecommander_rewards program is fully operational!');
    
    return { devicePda, transactionSignature: tx };
    
  } catch (error) {
    console.error('\n❌ Error registering device with Anchor:', error);
    
    // Let's also try to check if the config account is properly set up
    try {
      console.log('\n🔍 Checking config account data...');
      const configData = await program.account.config.fetch(configPda);
      console.log('Config data found:', {
        authority: configData.authority.toString(),
        rewardMint: configData.rewardMint.toString(),
        baseRatePerMinute: configData.baseRatePerMinute.toString(),
        bump: configData.bump
      });
    } catch (configError) {
      console.error('Could not fetch config data:', configError.message);
    }
    
    throw error;
  }
}

registerDeviceWithAnchor();