const {
  Connection,
  Keypair,
  clusterApiUrl,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} = require('@solana/web3.js');

async function registerDeviceOnDevnet() {
  console.log('📱 Registering demo device with vapecommander_rewards program...');
  console.log('Program Address: A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq');
  console.log('Config Account: GCvK7a7g4ABQ3J862iZ4Qno5jahz4pDsmmGsb98JFBVj');
  console.log('');


  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');


  const fs = require('fs');
  const secretKey = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/solana/id.json', 'utf8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));

  console.log('✅ Connected to Devnet');
  console.log('💰 Authority Wallet:', payer.publicKey.toString());


  const deviceKeypair = Keypair.generate(); // In real usage, this comes from the device
  const deviceMacAddress = 'aabbccddeeff'; // Demo MAC address

  console.log('\n Demo Device Information:');
  console.log('   Device Public Key:', deviceKeypair.publicKey.toString());
  console.log('   MAC Address:', deviceMacAddress);


  const crypto = require('crypto');
  const deviceHash = crypto.createHash('sha256').update(deviceMacAddress.toLowerCase()).digest();
  console.log('   Device Hash:', deviceHash.toString('hex'));


  const [devicePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('device'), deviceHash],
    new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq')
  );

  console.log('   Device PDA:', devicePda.toString());

  try {
    console.log('\n📝 Preparing registerDevice transaction...');
    console.log('   Device PDA:', devicePda.toString());
    console.log('   Device Public Key:', deviceKeypair.publicKey.toString());
    console.log('   Device Hash:', deviceHash.toString('hex'));


    const registerDeviceDiscriminator = Buffer.from([200, 164, 212, 14, 13, 199, 24, 32]);


    const deviceData = Buffer.concat([
      deviceKeypair.publicKey.toBuffer(),
      Buffer.from(deviceHash)
    ]);


    const instructionData = Buffer.concat([
      registerDeviceDiscriminator,
      deviceData
    ]);

    console.log('   Instruction Data Length:', instructionData.length, 'bytes');
    console.log('   Instruction Data:', instructionData.toString('hex'));


    const accounts = [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },  // Authority
      { pubkey: new PublicKey('GCvK7a7g4ABQ3J862iZ4Qno5jahz4pDsmmGsb98JFBVj'), isSigner: false, isWritable: false }, // Config
      { pubkey: devicePda, isSigner: false, isWritable: true },       // Device (new account)
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // System Program
    ];


    const registerDeviceIx = new TransactionInstruction({
      programId: new PublicKey('A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq'),
      keys: accounts,
      data: instructionData,
    });


    const transaction = new Transaction().add(registerDeviceIx);

    console.log('\n Broadcasting registerDevice transaction...');
    const signature = await connection.sendTransaction(transaction, [payer]);

    console.log('\n Device registered successfully!');
    console.log(' Transaction:', signature);
    console.log(' Device PDA:', devicePda.toString());
    console.log('  Device Public Key:', deviceKeypair.publicKey.toString());
    console.log(' Device Hash:', deviceHash.toString('hex'));
    console.log('');

    console.log(' SECURITY NOTES:');
    console.log('   - Device private key remains on the device (not transmitted)');
    console.log('   - Only the public key is stored on-chain');
    console.log('   - MAC hash prevents duplicate device registrations');
    console.log('');

    console.log('✅ Step 3 Complete: Demo device registered');
    console.log('💡 The vapecommander_rewards program is fully operational!');
    console.log('   - Reward token created and authority transferred');
    console.log('   - Config initialized with reward parameters');
    console.log('   - Demo device registered and ready to earn rewards');

    return { devicePda, transactionSignature: signature };

  } catch (error) {
    console.error('\n❌ Error registering device:', error);
    throw error;
  }
}

registerDeviceOnDevnet();