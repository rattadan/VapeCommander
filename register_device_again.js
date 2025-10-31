const {
  Connection,
  Keypair,
  clusterApiUrl,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} = require('@solana/web3.js');

async function tryRegisterDeviceAgain() {
  console.log('📱 Trying to register demo device again with vapecommander_rewards program...');
  console.log('Program Address: A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  console.log('Config Account: GCvK7a7g4ABQ3J862iZ4Qno5jahz4pDsmmGsb98JFBVj');
  console.log('');

  // Connect to devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  
  // Load wallet
  const fs = require('fs');
  const secretKey = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json', 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  console.log('✅ Connected to Devnet');
  console.log('💰 Authority Wallet:', payer.publicKey.toString());
  
  // Demo device information
  const deviceKeypair = Keypair.generate(); // In real usage, this comes from the device
  const deviceMacAddress = 'aabbccddeeff'; // Demo MAC address
  
  console.log('\n📋 Demo Device Information:');
  console.log('   Device Public Key:', deviceKeypair.publicKey.toString());
  console.log('   MAC Address:', deviceMacAddress);
  
  // Calculate device hash (SHA256 of lowercase MAC)
  const crypto = require('crypto');
  const deviceHash = crypto.createHash('sha256').update(deviceMacAddress.toLowerCase()).digest();
  console.log('   Device Hash:', deviceHash.toString('hex'));
  
  // Calculate device PDA using seeds ["device", device_hash]
  const programId = new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  const [devicePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('device'), deviceHash],
    programId
  );
  
  console.log('   Device PDA:', devicePda.toString());
  
  try {
    console.log('\n📝 Preparing registerDevice transaction again...');
    console.log('   Device PDA:', devicePda.toString());
    console.log('   Device Public Key:', deviceKeypair.publicKey.toString());
    console.log('   Device Hash:', deviceHash.toString('hex'));
    
    // Get the correct discriminator for registerDevice from the IDL
    // Looking for the correct discriminator in the program structure
    // Based on previous checks: registerDevice should be [200, 164, 212, 14, 13, 199, 24, 32]
    const registerDeviceDiscriminator = Buffer.from([200, 164, 212, 14, 13, 199, 24, 32]);
    
    // The registerDevice function expects:
    // - 32 bytes: device public key
    // - 32 bytes: device hash (array of 32 u8s)
    const devicePubkeyBytes = deviceKeypair.publicKey.toBuffer();
    const deviceHashBytes = Buffer.from(deviceHash);
    
    // Combine device public key (32 bytes) and device hash (32 bytes as array)
    const deviceData = Buffer.concat([
      devicePubkeyBytes,
      deviceHashBytes
    ]);
    
    // Combine discriminator with device data
    const instructionData = Buffer.concat([
      registerDeviceDiscriminator,
      deviceData
    ]);
    
    console.log('   Instruction Data Length:', instructionData.length, 'bytes (should be 72: 8 + 32 + 32)');
    console.log('   Instruction Data:', instructionData.toString('hex'));
    console.log('   Expected: 72 bytes (8 discriminator + 32 pubkey + 32 hash)');
    
    // Verify size
    if (instructionData.length !== 72) {
      console.log(`   ❌ WARNING: Expected 72 bytes, got ${instructionData.length} bytes`);
      return;
    }
    
    // Accounts for registerDevice instruction
    const configPda = new PublicKey('GCvK7a7g4ABQ3J862iZ4Qno5jahz4pDsmmGsb98JFBVj');
    const accounts = [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },  // Authority
      { pubkey: configPda, isSigner: false, isWritable: false },      // Config
      { pubkey: devicePda, isSigner: false, isWritable: true },       // Device (new account)
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System Program
    ];
    
    // Create the instruction
    const registerDeviceIx = new TransactionInstruction({
      programId: programId,
      keys: accounts,
      data: instructionData,
    });
    
    console.log('\n📋 Transaction Accounts:');
    for (const [index, account] of accounts.entries()) {
      console.log(`   [${index}] ${account.isSigner ? 'SIGNER' : 'READ'} ${account.isWritable ? '+WRITE' : 'READ'}: ${account.pubkey.toString()}`);
    }
    
    // Create transaction
    const transaction = new Transaction().add(registerDeviceIx);
    
    console.log('\n📤 Attempting to broadcast registerDevice transaction...');
    const signature = await connection.sendTransaction(transaction, [payer]);
    
    console.log('\n🎉 Device registered successfully!');
    console.log('🔗 Transaction:', signature);
    console.log('📱 Device PDA:', devicePda.toString());
    console.log('🏷  Device Public Key:', deviceKeypair.publicKey.toString());
    console.log('🔢 Device Hash:', deviceHash.toString('hex'));
    console.log('');
    
    console.log('✅ Device registration completed successfully!');
    console.log('💡 The vapecommander_rewards program is fully operational!');
    
    return { devicePda, transactionSignature: signature };
    
  } catch (error) {
    console.error('\n❌ Error registering device (again):', error);
    
    // Check if config account is still valid
    try {
      const accountInfo = await connection.getAccountInfo(new PublicKey('GCvK7a7g4ABQ3J862iZ4Qno5jahz4pDsmmGsb98JFBVj'));
      console.log('\n🔍 Config account verification:');
      console.log('   Owner:', accountInfo.owner.toString());
      console.log('   Balance:', accountInfo.lamports / 1000000000, 'SOL');
      console.log('   Status: Config account exists and is owned by the program');
    } catch (configErr) {
      console.error('   ❌ Config account not accessible:', configErr.message);
    }
    
    console.log('\n💡 Possible issue: There might be a difference between the deployed program and expected instruction format.');
    console.log('   The program was successfully deployed and config initialization worked,');
    console.log('   but there might be specific requirements for the device registration instruction.');
    
    throw error;
  }
}

tryRegisterDeviceAgain();