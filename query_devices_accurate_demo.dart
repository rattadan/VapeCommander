import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:convert/convert.dart';

/// Demonstrates how to query registered devices from the vapecommander_rewards contract
class VapecommanderRewardsQuery {
  static const String programId = 'A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq';
  static const String devnetRpcUrl = 'https://api.devnet.solana.com';

  // The discriminator for the Device account (from the IDL)
  static const List<int> deviceDiscriminator = [153, 248, 23, 39, 83, 45, 68, 128];

  /// Query all device accounts associated with the program
  static Future<List<DeviceAccount>> queryAllDevices() async {
    print('🔍 Querying all device accounts from the program...');
    print('Program ID: $programId');
    
    // The program stores devices in PDA accounts with the Device struct discriminator
    // Convert the discriminator to base58 for the filter
    String discriminatorBase58 = base64Encode(Uint8List.fromList(deviceDiscriminator));
    
    // We'll use getProgramAccounts RPC call to find all device accounts
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
              // Filter for accounts that start with the proper discriminator
              'memcmp': {
                'offset': 0,
                'bytes': discriminatorBase58,
              }
            }
          ],
        }
      ]
    };

    try {
      final response = await http.post(
        Uri.parse(devnetRpcUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestData),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['result'] != null && data['result']['value'] != null) {
          final accounts = data['result']['value'] as List;
          print('Found ${accounts.length} device accounts');
          
          final List<DeviceAccount> devices = [];
          for (final account in accounts) {
            final pubkey = account['pubkey'];
            final accountInfo = account['account'];
            final dataBase64 = accountInfo['data'][0]; // First element is base64 data
            final owner = accountInfo['owner'];
            
            // Decode the base64 data to get the account content
            final rawData = base64Decode(dataBase64);
            
            // In a real implementation, you'd decode this based on the IDL
            // For now, we'll return a mock device
            devices.add(DeviceAccount(
              publicKey: pubkey,
              devicePubkey: 'DecodedDevicePubkey_${pubkey.substring(0, 8)}',
              deviceHash: 'DecodedHash_${pubkey.substring(0, 16)}',
              lifetimeMinutes: 0,
              reportCounter: 0,
            ));
          }
          
          return devices;
        } else if (data['error'] != null) {
          print('RPC Error: ${data['error']}');
          return [];
        } else {
          print('No results returned from query');
          return [];
        }
      } else {
        print('HTTP Error: ${response.statusCode}');
        print('Response: ${response.body}');
        return [];
      }
    } catch (e) {
      print('Error querying devices: $e');
      return [];
    }
  }

  /// Query a specific device by its PDA (derived from device hash)
  static Future<DeviceAccount?> queryDeviceByHash(String deviceHashHex) async {
    print('🔍 Querying specific device with hash: $deviceHashHex');
    
    // In a real implementation, we'd calculate the PDA from the device hash
    // seeds = ["device", device_hash]
    final devicePda = calculateDevicePda(deviceHashHex);
    
    print('Calculated Device PDA: $devicePda');
    
    // Query the specific account
    final Map<String, dynamic> requestData = {
      'jsonrpc': '2.0',
      'id': 'getAccountInfo',
      'method': 'getAccountInfo',
      'params': [
        devicePda,
        {'encoding': 'base64'}
      ]
    };

    try {
      final response = await http.post(
        Uri.parse(devnetRpcUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestData),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['result'] != null && data['result']['value'] != null) {
          print('Device account found at: $devicePda');
          
          // Decode the account data
          final accountValue = data['result']['value'];
          if (accountValue != null) {
            final dataBase64 = accountValue['data'][0];
            final rawData = base64Decode(dataBase64);
            
            // In a real implementation, decode the account data based on the IDL
            // For now, return a mock device
            return DeviceAccount(
              publicKey: devicePda,
              devicePubkey: 'DecodedDevicePubkey_${devicePda.substring(0, 8)}',
              deviceHash: deviceHashHex,
              lifetimeMinutes: 120, // Mock data
              reportCounter: 5,     // Mock data
            );
          }
        } else if (data['error'] != null) {
          print('RPC Error: ${data['error']}');
          return null;
        } else {
          print('Device not found with hash: $deviceHashHex');
          return null;
        }
      } else {
        print('HTTP Error: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Error querying specific device: $e');
      return null;
    }
    
    print('Device not found with hash: $deviceHashHex (or account is empty)');
    return null;
  }

  /// Calculate PDA for device (mock implementation)
  static String calculateDevicePda(String deviceHashHex) {
    // In a real implementation, this would properly calculate the PDA
    // using the seeds ["device", device_hash] and the program ID
    return "DevicePDA_${deviceHashHex.substring(0, 16)}";
  }

  /// Query the config account
  static Future<ConfigAccount?> queryConfig(String rewardMint) async {
    print('🔍 Querying config account for reward mint: $rewardMint');
    
    // Calculate the config PDA from the reward mint
    // seeds = ["config", reward_mint]
    final configPda = calculateConfigPda(rewardMint);
    
    print('Calculated Config PDA: $configPda');
    
    // Query the specific account
    final Map<String, dynamic> requestData = {
      'jsonrpc': '2.0',
      'id': 'getAccountInfo',
      'method': 'getAccountInfo',
      'params': [
        configPda,
        {'encoding': 'base64'}
      ]
    };

    try {
      final response = await http.post(
        Uri.parse(devnetRpcUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestData),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['result'] != null && data['result']['value'] != null) {
          print('Config account found at: $configPda');
          
          // Decode the account data
          final accountValue = data['result']['value'];
          if (accountValue != null) {
            final dataBase64 = accountValue['data'][0];
            final rawData = base64Decode(dataBase64);
            
            // In a real implementation, decode the account data based on the IDL
            // For now, return a mock config
            return ConfigAccount(
              publicKey: configPda,
              authority: 'DecodedAuthority_${configPda.substring(0, 8)}',
              rewardMint: rewardMint,
              baseRatePerMinute: 1000000,
            );
          }
        } else if (data['error'] != null) {
          print('RPC Error: ${data['error']}');
          return null;
        } else {
          print('Config not found for reward mint: $rewardMint');
          return null;
        }
      } else {
        print('HTTP Error: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      print('Error querying config: $e');
      return null;
    }
    
    print('Config not found for reward mint: $rewardMint (or account is empty)');
    return null;
  }

  /// Calculate PDA for config (mock implementation)
  static String calculateConfigPda(String rewardMint) {
    // In a real implementation, this would properly calculate the PDA
    // using the seeds ["config", reward_mint] and the program ID
    return "ConfigPDA_${rewardMint.substring(0, 16)}";
  }
}

/// Represents a device account from the program
class DeviceAccount {
  final String publicKey;
  final String devicePubkey;
  final String deviceHash;
  final int lifetimeMinutes;
  final int reportCounter;

  DeviceAccount({
    required this.publicKey,
    required this.devicePubkey,
    required this.deviceHash,
    required this.lifetimeMinutes,
    required this.reportCounter,
  });

  @override
  String toString() {
    return '''
Device Account:
  - PDA: $publicKey
  - Device Public Key: $devicePubkey
  - Device Hash: $deviceHash
  - Lifetime Minutes: $lifetimeMinutes
  - Report Counter: $reportCounter
''';
  }
}

/// Represents a config account from the program
class ConfigAccount {
  final String publicKey;
  final String authority;
  final String rewardMint;
  final int baseRatePerMinute;

  ConfigAccount({
    required this.publicKey,
    required this.authority,
    required this.rewardMint,
    required this.baseRatePerMinute,
  });

  @override
  String toString() {
    return '''
Config Account:
  - PDA: $publicKey
  - Authority: $authority
  - Reward Mint: $rewardMint
  - Base Rate Per Minute: $baseRatePerMinute
''';
  }
}

void main() async {
  print('📱 Querying Vapecommander Rewards Contract');
  print('Program: vapecommander_rewards');
  print('Address: ${VapecommanderRewardsQuery.programId}');
  print('RPC: ${VapecommanderRewardsQuery.devnetRpcUrl}');
  print('');

  print('📋 Query Options:');
  print('  1. Query all registered devices');
  print('  2. Query specific device by hash');
  print('  3. Query program configuration');
  print('');

  // Example 1: Query config account
  print('=== Querying Config Account ===');
  final mockRewardMint = 'DemoRewardMint1234567890123456789012345678';
  final config = await VapecommanderRewardsQuery.queryConfig(mockRewardMint);
  if (config != null) {
    print(config.toString());
  } else {
    print('No config found or error occurred');
  }
  print('');

  // Example 2: Query a specific device
  print('=== Querying Specific Device ===');
  final deviceHash = 'c1582e87c802221899199e286ead9a7ed13eb3b5e3827be6cc149fb82a9e04f7';
  final device = await VapecommanderRewardsQuery.queryDeviceByHash(deviceHash);
  if (device != null) {
    print(device.toString());
  } else {
    print('No device found with that hash or error occurred');
  }
  print('');

  // Example 3: Query all devices (would require the proper discriminator)
  print('=== Querying All Devices ===');
  print('Note: Querying ALL devices using the proper discriminator:');
  final allDevices = await VapecommanderRewardsQuery.queryAllDevices();
  print('Found ${allDevices.length} devices');
  if (allDevices.isNotEmpty) {
    for (final device in allDevices) {
      print('  - ${device.deviceHash.substring(0, 16)}...');
    }
  }
  print('');

  print('💡 In your Flutter app, you could:');
  print('  1. Query to see if a device with a specific MAC hash is already registered');
  print('  2. Check device usage stats (lifetime minutes, report counter)');
  print('  3. Verify the program configuration (reward rates, mint)');
  print('  4. List all registered devices for admin purposes');
  print('');
  
  print('🔐 Note: Actual data decoding would require parsing the account data');
  print('    using the program IDL to understand the binary layout.');
  print('');
  
  print('✅ Query demo completed!');
}