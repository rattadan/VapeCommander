import { Keypair } from '@solana/web3.js';
import { createHash, randomBytes } from 'crypto';

function generateKeypair() {
    // Generate a 32-byte seed
    const seed = randomBytes(32);
    const keypair = Keypair.fromSeed(seed);

    console.log('🔑 Device Keypair Generated');
    console.log(`PRIVATE_KEY=${seed.toString('hex')}`);  // 64 chars
    console.log(`PUBLIC_KEY=${keypair.publicKey.toBase58()}`);
}

function hashMacAddress(mac: string) {
    const normalizedMac = mac.toLowerCase().replace(/[^a-f0-9]/g, '');
    const hash = createHash('sha256').update(normalizedMac, 'hex').digest('hex');
    console.log('🔒 Device Hash:');
    console.log(`MAC: ${normalizedMac}`);
    console.log(`HASH: ${hash}`);
    return hash;
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'generate':
        generateKeypair();
        break;
    case 'hash':
        if (args[1]) {
            hashMacAddress(args[1]);
        } else {
            console.error('Please provide a MAC address (e.g., 12:34:56:78:90:ab)');
            process.exit(1);
        }
        break;
    default:
        console.log('Usage:');
        console.log('  npx tsx scripts/device_utils.ts generate');
        console.log('  npx tsx scripts/device_utils.ts hash <MAC_ADDRESS>');
        process.exit(1);
}