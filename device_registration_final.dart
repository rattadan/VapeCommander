import 'dart:convert';
import 'dart:typed_data';
import 'dart:math';


class DeviceRegistrationDemo {
  static const String programId = 'A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq';
  
 
  static const List<int> registerDeviceDiscriminator = [200, 164, 212, 14, 13, 199, 24, 32];


  static void demonstrateRegistration() {
    print('📱 DEVICE REGISTRATION DEMONSTRATION');
    print('Contract: $programId');
    print('Network: Solana Devnet');
    print('');


    final devicePublicKey = _generateMockPublicKey();
    print('1. Device Public Key: ${_bytesToShortString(devicePublicKey)}');
    
 
    final deviceMac = 'aabbccddeeff';
    print('2. Device MAC Address: $deviceMac');
    
  
    final deviceHash = _sha256(utf8.encode(deviceMac.toLowerCase()));
    print('3. Device Hash: ${_bytesToShortString(deviceHash)}');
    
  
    final devicePda = _calculateDevicePda(deviceHash);
    print('4. Device PDA: $devicePda');
    
    
    final instructionData = Uint8List.fromList(devicePublicKey + deviceHash);
    print('5. Instruction Data: ${instructionData.length} bytes');

    final fullInstructionData = Uint8List.fromList(registerDeviceDiscriminator + instructionData);
    print('6. Full Instruction Data: ${fullInstructionData.length} bytes');
    print('   Discriminator: ${registerDeviceDiscriminator}');
    print('   Device Pubkey: ${_bytesToShortString(devicePublicKey)}');
    print('   Device Hash: ${_bytesToShortString(deviceHash)}');
    print('');

    print('📋 TRANSACTION STRUCTURE:');
    print('Program ID: $programId');
    print('Instruction Discriminator: ${_bytesToHexString(registerDeviceDiscriminator)}');
    print('');
    print('Required Accounts:');
    print('  [SIGNER, WRITABLE] Authority (your wallet - pays fees)');
    print('  [] Config PDA (already exists)');
    print('  [WRITABLE] Device PDA (to be created)');
    print('  [] System Program');
    print('');

  }


  static List<int> _generateMockPublicKey() {
    final rng = Random.secure();
    return List<int>.generate(32, (_) => rng.nextInt(256));
  }


  static List<int> _sha256(List<int> data) {
  
    final result = <int>[];
    for (int i = 0; i < 32; i++) {
      result.add((data[i % data.length] + i) % 256);
    }
    return result;
  }

 
  static String _calculateDevicePda(List<int> deviceHash) {

    return 'DevicePDA_${_bytesToShortString(deviceHash)}';
  }


  static String _bytesToShortString(List<int> bytes) {
    if (bytes.length <= 8) {
      return _bytesToHexString(bytes);
    }
    return '${_bytesToHexString(bytes.take(4).toList())}...${_bytesToHexString(bytes.skip(bytes.length - 4).take(4).toList())}';
  }


  static String _bytesToHexString(List<int> bytes) {
    return bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join('');
  }


  static void showRegisteredAccountStructure() {
    print('\n📋 DEVICE ACCOUNT STRUCTURE (after registration):');
    print(''); 
    print('Discriminator (8 bytes): [153, 248, 23, 39, 83, 45, 68, 128]');
    print('Device Pubkey (32 bytes): [..public key..]');
    print('Device Hash (32 bytes): [..SHA256 of MAC..]');
    print('Lifetime Minutes (8 bytes): 0 (u64 little-endian)');
    print('Report Counter (8 bytes): 0 (u64 little-endian)');
    print('Bump (1 byte): [..bump..]');
    print('');
    print('Total size: 89 bytes');
    print('');
    print('This account will be updated when device claims rewards,');
    print('ensuring lifetime_minutes and report_counter only increase.');
  }
}

void main() {
  DeviceRegistrationDemo.demonstrateRegistration();
  DeviceRegistrationDemo.showRegisteredAccountStructure();
  
  print('\n💡 INTEGRATION WITH FLUTTER:');
  print('');
  print('In your Flutter app, you would:');
  print('1. Connect to device via Bluetooth to get MAC address');
  print('2. Receive device public key from the device');
  print('3. Calculate device hash and PDA');
  print('4. Create and send registration transaction');
  print('5. Store the registration status locally');
  print('');
  print('Library suggestions for Flutter:');
  print('- flutter_blue_plus for Bluetooth connectivity');
  print('- solana_dart for Solana interactions');
  print('- crypto for SHA256 hashing');
  print('');
  print('✅ The deployed contract at ${DeviceRegistrationDemo.programId} is ready for device registration!');
}
