import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:convert/convert.dart';
import 'dart:math';

/// Demonstrates how to query registered devices from the vapecommander_rewards contract
/// This script shows the proper approach to query the actual deployed contract
class OnChainQueryDemo {
  static const String programId = 'A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq';
  static const String devnetRpcUrl = 'https://api.devnet.solana.com';
  
  // Device account discriminator [153, 248, 23, 39, 83, 45, 68, 128] from IDL
  static const List<int> deviceDiscriminator = [153, 248, 23, 39, 83, 45, 68, 128];
  
  // Config account discriminator [0, 248, 217, 82, 135, 235, 107, 10] from IDL
  static const List<int> configDiscriminator = [0, 248, 217, 82, 135, 235, 107, 10];

  /// Helper to convert discriminator bytes to base64
  static String discriminatorToBase64(List<int> discriminator) {
    return base64Encode(Uint8List.fromList(discriminator));
  }

  /// Query all device accounts associated with the program
  static Future<void> queryAllDevices() async {
    print('🔍 Querying all device accounts from the program...');
    print('Program ID: $programId');
    
    // Convert discriminator to base64
    String discriminatorBase64 = discriminatorToBase64(deviceDiscriminator);
    print('Device Discriminator (base64): $discriminatorBase64');
    
    final Map<String, dynamic> requestData = {
      'jsonrpc': '2.0',
      'id': 'getProgramAccounts',
      'method': 'getProgramAccounts',
      'params': [
        programId,
        {
          'encoding': 'base64',
          'filters': [
            {
              // Filter for accounts that start with the device discriminator
              'memcmp': {
                'offset': 0,  // Discriminator is at the beginning of the account data
                'bytes': discriminatorBase64,
              }
            }
          ],
        }
      ]
    };

    print('\nRequest being sent:');
    print('  Method: getProgramAccounts');
    print('  Program: $programId');
    print('  Filter: memcmp with discriminator at offset 0');
    print('');

    try {
      final response = await http.post(
        Uri.parse(devnetRpcUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestData),
      );

      print('Response status: ${response.statusCode}');
      if (response.statusCode != 200) {
        print('Response body: ${response.body}');
        return;
      }

      final data = jsonDecode(response.body);
      if (data['result'] != null && data['result']['value'] != null) {
        final accounts = data['result']['value'] as List;
        print('Found ${accounts.length} device accounts');
        
        if (accounts.isNotEmpty) {
          for (int i = 0; i < accounts.length && i < 5; i++) { // Show first 5 for demo
            final account = accounts[i];
            final pubkey = account['pubkey'];
            final accountInfo = account['account'];
            print('  Device ${i+1}: $pubkey');
            
            // Decode account data to show structure
            final dataBase64 = accountInfo['data'][0];
            final rawData = base64Decode(dataBase64);
            print('    Data length: ${rawData.length} bytes');
            print('    First 32 bytes: ${hex.encode(rawData.take(32).toList())}');
          }
          
          if (accounts.length > 5) {
            print('  ... and ${accounts.length - 5} more');
          }
        } else {
          print('  No device accounts found. This could mean:');
          print('    - No devices have been registered yet');
          print('    - The program isn\'t deployed correctly');
          print('    - The discriminator is incorrect');
        }
      } else if (data['error'] != null) {
        print('RPC Error: ${data['error']}');
        print('This may indicate the program isn\'t deployed at the expected address');
      } else {
        print('No results returned from query');
      }
    } catch (e) {
      print('Error querying devices: $e');
    }
  }

  /// Show how to calculate PDA addresses properly
  static void showPdaCalculation() {
    print('\n🔑 PDA (Program Derived Address) Calculation:');
    print('For Device PDA:');
    print('  Seeds: ["device", device_hash]');
    print('  Program ID: $programId');
    print('  Example: If device hash is "c1582e87c802221899199e286ead9a7ed13eb3b5e3827be6cc149fb82a9e04f7"');
    print('  PDA would be derived using: ["device", <32-byte hash>]');
    print('');
    print('For Config PDA:');
    print('  Seeds: ["config", reward_mint]');
    print('  Program ID: $programId');
    print('  Example: If reward mint is "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"');
    print('  PDA would be derived using: ["config", <32-byte mint address>]');
    print('');
  }

  /// Show the account structure based on the IDL
  static void showAccountStructure() {
    print('\n📋 Account Structures (from IDL):');
    print('Device Account:');
    print('  - Discriminator: [153, 248, 23, 39, 83, 45, 68, 128] (8 bytes)');
    print('  - device_pubkey: 32 bytes (public key)');
    print('  - device_hash: 32 bytes (SHA256 of MAC address)');
    print('  - lifetime_minutes: 8 bytes (u64)');
    print('  - report_counter: 8 bytes (u64)');
    print('  - bump: 1 byte (u8)');
    print('');
    print('Config Account:');
    print('  - Discriminator: [0, 248, 217, 82, 135, 235, 107, 10] (8 bytes)');
    print('  - authority: 32 bytes (public key)');
    print('  - reward_mint: 32 bytes (public key)');
    print('  - base_rate_per_minute: 8 bytes (u64)');
    print('  - bump: 1 byte (u8)');
    print('');
  }

  /// Show example usage in Flutter context
  static void showFlutterUsage() {
    print('\n📱 Flutter Integration Examples:');
    print('To query registered devices in your Flutter app:');
    print('');
    print('// 1. Query if a specific device is registered');
    print('// Calculate device hash from MAC address');
    print('String deviceMac = "AA:BB:CC:DD:EE:FF";');
    print('List<int> deviceHash = sha256(utf8.encode(deviceMac.toLowerCase()));');
    print('// Calculate PDA and query account...');
    print('');
    print('// 2. Show all registered devices for a user');
    print('// Use getProgramAccounts with device discriminator filter...');
    print('');
    print('// 3. Check device usage statistics');
    print('// Query specific device account and decode lifetime_minutes and report_counter...');
    print('');
  }
  
  /// Simple account data decoder for demo purposes
  static void decodeExampleAccountData() {
    print('\n🔍 Example Account Data Decoding:');
    print('When you receive account data from Solana, it comes as base64-encoded bytes.');
    print('To decode a Device account:');
    print('');
    print('1. The first 8 bytes are the discriminator');
    print('2. Next 32 bytes are the device public key');
    print('3. Next 32 bytes are the device hash (from MAC address)');
    print('4. Next 8 bytes are lifetime_minutes (u64, little-endian)');
    print('5. Next 8 bytes are report_counter (u64, little-endian)');
    print('6. Final 1 byte is the bump seed');
    print('');
    print('For example, if you get data that starts with:');
    print('  [153, 248, 23, 39, 83, 45, 68, 128, ...] <- This is the Device discriminator');
    print('Then you know it\'s a Device account and can decode the rest accordingly.');
  }
}

void main() async {
  print('📱 Querying Vapecommander Rewards Contract - Technical Demo');
  print('Deployed Program: ${OnChainQueryDemo.programId}');
  print('Network: Solana Devnet');
  print('');

  // Show account structures first
  OnChainQueryDemo.showAccountStructure();
  
  // Show PDA calculation
  OnChainQueryDemo.showPdaCalculation();
  
  // Demonstrate the query approach
  print('📋 Actual Query Process:');
  print('The following shows how to query the deployed contract:');
  await OnChainQueryDemo.queryAllDevices();
  
  // Show account data decoding
  OnChainQueryDemo.decodeExampleAccountData();
  
  // Show Flutter usage examples
  OnChainQueryDemo.showFlutterUsage();
  
  print('\n✅ Query demonstration completed!');
  print('');
  print('💡 Key Points:');
  print('  - Use getProgramAccounts RPC with discriminator filter to find all devices');
  print('  - Calculate PDAs properly using seeds ["device", device_hash]');
  print('  - Decode account data based on the IDL structure');
  print('  - Handle cases where no accounts exist (no registered devices)');
}