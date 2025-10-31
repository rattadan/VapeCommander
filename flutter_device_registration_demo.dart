import 'dart:typed_data';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart' as crypto;

class SolanaKeypair {
  final Uint8List publicKey;
  final Uint8List secretKey;

  SolanaKeypair(this.publicKey, this.secretKey);

  static SolanaKeypair generate() {
    final random = Random.secure();
    final pubKey =
        Uint8List.fromList(List.generate(32, (index) => random.nextInt(256)));
    final privKey =
        Uint8List.fromList(List.generate(64, (index) => random.nextInt(256)));
    return SolanaKeypair(pubKey, privKey);
  }

  String get publicKeyBase58 {
    return base16Encode(publicKey).substring(0, 16);
  }
}

class SolanaProgramInteraction {
  static const String programId =
      'A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq';
  static const String domain = 'CRAFTY_V1';

  static Uint8List sha256(Uint8List data) {
    final hash = crypto.sha256.convert(data);
    return Uint8List.fromList(hash.bytes);
  }

  static Uint8List hashDeviceMacAddress(String macAddress) {
    final lowerMac = macAddress.toLowerCase().trim();
    final bytes = utf8.encode(lowerMac);
    return sha256(bytes);
  }

  static Uint8List createRegisterDeviceInstructionData(
    Uint8List devicePublicKey,
    Uint8List deviceHash,
  ) {
    final instructionData = <int>[];

    instructionData.addAll(devicePublicKey);

    instructionData.addAll(deviceHash);

    return Uint8List.fromList(instructionData);
  }

  static String calculateDevicePda(String deviceHashHex) {
    return "DevicePDA_${deviceHashHex.substring(0, 16)}";
  }

  static String calculateConfigPda(String rewardMint) {
    return "ConfigPDA_${rewardMint.substring(0, 16)}";
  }
}

void main() async {
  print(' Flutter Demo: Device Registration with Solana');
  print('Program: vapecommander_rewards');
  print('Address: ${SolanaProgramInteraction.programId}');
  print('');

  print('📋 Device Registration Process:');

  final deviceMacAddress = 'AA:BB:CC:DD:EE:FF';
  print('1. Device MAC Address: $deviceMacAddress');

  final deviceKeypair = SolanaKeypair.generate();
  print('2. Device Public Key: ${deviceKeypair.publicKeyBase58}');

  final deviceHash =
      SolanaProgramInteraction.hashDeviceMacAddress(deviceMacAddress);
  print('3. Device Hash (SHA256): ${base16Encode(deviceHash)}');

  final devicePda =
      SolanaProgramInteraction.calculateDevicePda(base16Encode(deviceHash));
  print('4. Device PDA: $devicePda');

  final rewardMint = 'DemoRewardMint1234567890123456789012345678'; // 44 chars
  final configPda = SolanaProgramInteraction.calculateConfigPda(rewardMint);
  print('5. Config PDA: $configPda');

  final instructionData =
      SolanaProgramInteraction.createRegisterDeviceInstructionData(
          deviceKeypair.publicKey, deviceHash);
  print('6. Instruction Data Length: ${instructionData.length} bytes');

  print('');
  print(' Required Accounts for Register Device Transaction:');
  print('  - [signer] Authority (your wallet)');
  print('  - [] Config PDA: $configPda');
  print('  - [writable] Device PDA (new account): $devicePda');
  print('  - [] System Program');
  print('');

  print(' Instruction Data (first 64 bytes):');
  print('  ${base16Encode(instructionData).substring(0, 64)}...');
  print('');

  print(' In your Flutter app, you would:');
  print('  1. Get the device MAC address via Bluetooth/BLE');
  print('  2. Generate or retrieve the device keypair');
  print('  3. Calculate the device hash from the MAC address');
  print(
      '  4. Create a transaction with the required accounts and instruction data');
  print('  5. Send the transaction to the Solana network');
  print('');

  print(' Security Notes:');
  print('  - Device keypair should be generated securely on the device');
  print('  - Private keys should never be transmitted over the network');
  print('  - Device signatures will be verified on-chain using Ed25519');
  print('');

  print(' Device registration demo completed!');
}

String base16Encode(Uint8List bytes) {
  return bytes.map((byte) => byte.toRadixString(16).padLeft(2, '0')).join('');
}
