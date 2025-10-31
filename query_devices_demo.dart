import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:convert/convert.dart';

/// Demonstrates how to query registered devices from the vapecommander_rewards contract
class VapecommanderRewardsQuery {
  static const String programId = 'A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq';
  static const String devnetRpcUrl = 'https://api.devnet.solana.com';

  /// Query all device accounts associated with the program
  static Future<List<DeviceAccount>> queryAllDevices() async {
    print('🔍 Querying all device accounts from the program...');
    
    // The program stores devices in PDA accounts with seed "device".
    // We'll use getProgramAccounts RPC call to fetch ALL program accounts,
    // then decode and filter by the Device account discriminator client-side.
    final Map<String, dynamic> requestData = {
      'jsonrpc': '2.0',
      'id': 'getProgramAccounts',
      'method': 'getProgramAccounts',
      'params': [
        programId,
        {
          'encoding': 'base64',
          // No server-side filters; decode client-side using IDL discriminator
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
        if (data['result'] != null) {
          final accounts = data['result'] as List;
          print('Found ${accounts.length} device accounts');
          
          final List<DeviceAccount> devices = [];
          for (final account in accounts) {
            final pubkey = account['pubkey'];
            final accountInfo = account['account'];
            final dataBase64 = accountInfo['data'][0]; // First element is base64 data
            final owner = accountInfo['owner'];
            
            // Decode Device accounts only (skip others)
            final decoded = _decodeDeviceAccount(pubkey, dataBase64);
            if (decoded != null) {
              devices.add(decoded);
            }
          }
          
          return devices;
        } else if (data['error'] != null) {
          print('Error in response: ${data['error']}');
          return [];
        } else {
          print('No results returned from query');
          return [];
        }
      } else {
        print('HTTP Error: ${response.statusCode}');
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
    
    // Without PDA derivation and base58 helpers, fetch all and match by decoded hash
    final all = await queryAllDevices();
    for (final d in all) {
      if (d.deviceHash.toLowerCase() == deviceHashHex.toLowerCase()) {
        return d;
      }
    }
    print('Device not found with hash: $deviceHashHex');
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
    
    // Fetch all program accounts and decode Config accounts; pick the one matching rewardMint
    final Map<String, dynamic> requestData = {
      'jsonrpc': '2.0',
      'id': 'getProgramAccounts',
      'method': 'getProgramAccounts',
      'params': [
        programId,
        {
          'encoding': 'base64'
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
        if (data['result'] != null) {
          final accounts = data['result'] as List;
          for (final account in accounts) {
            final pubkey = account['pubkey'];
            final accountInfo = account['account'];
            final dataBase64 = accountInfo['data'][0];
            final cfg = _decodeConfigAccount(pubkey, dataBase64);
            if (cfg != null && cfg.rewardMint == rewardMint) {
              print('Config account found at: $pubkey');
              return cfg;
            }
          }
          print('Config not found for reward mint: $rewardMint');
          return null;
        } else if (data['error'] != null) {
          print('RPC Error: ${data['error']}');
          return null;
        } else {
          print('No results returned from query');
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
  }

  /// Calculate PDA for config (mock implementation)
  static String calculateConfigPda(String rewardMint) {
    // In a real implementation, this would properly calculate the PDA
    // using the seeds ["config", reward_mint] and the program ID
    return "ConfigPDA_${rewardMint.substring(0, 16)}";
  }

  // =============================
  // Decoders (based on IDL types)
  // =============================

  // Device account discriminator from IDL: [153, 248, 23, 39, 83, 45, 68, 128]
  static const List<int> _deviceDisc = [153, 248, 23, 39, 83, 45, 68, 128];
  // Config account discriminator from IDL: [155, 12, 170, 224, 30, 250, 204, 130]
  static const List<int> _configDisc = [155, 12, 170, 224, 30, 250, 204, 130];

  static DeviceAccount? _decodeDeviceAccount(String pubkey, String dataBase64) {
    try {
      final raw = base64.decode(dataBase64);
      if (raw.length < 8 + 32 + 32 + 8 + 8 + 1) return null;
      // Check discriminator
      for (int i = 0; i < 8; i++) {
        if (raw[i] != _deviceDisc[i]) return null;
      }
      int o = 8;
      final devicePubkeyBytes = raw.sublist(o, o + 32); o += 32;
      final deviceHashBytes = raw.sublist(o, o + 32); o += 32;
      final lifetimeMinutes = _readU64LE(raw, o); o += 8;
      final reportCounter = _readU64LE(raw, o); o += 8;
      final bump = raw[o];

      return DeviceAccount(
        publicKey: pubkey,
        // Represent pubkey and hash as hex for simplicity (no base58 dependency)
        devicePubkey: hex.encode(devicePubkeyBytes),
        deviceHash: hex.encode(deviceHashBytes),
        lifetimeMinutes: lifetimeMinutes,
        reportCounter: reportCounter,
      );
    } catch (e) {
      return null;
    }
  }

  static ConfigAccount? _decodeConfigAccount(String pubkey, String dataBase64) {
    try {
      final raw = base64.decode(dataBase64);
      if (raw.length < 8 + 32 + 32 + 8 + 1) return null;
      for (int i = 0; i < 8; i++) {
        if (raw[i] != _configDisc[i]) return null;
      }
      int o = 8;
      final authorityBytes = raw.sublist(o, o + 32); o += 32;
      final rewardMintBytes = raw.sublist(o, o + 32); o += 32;
      final baseRate = _readU64LE(raw, o); o += 8;
      final bump = raw[o];

      return ConfigAccount(
        publicKey: pubkey,
        authority: hex.encode(authorityBytes),
        rewardMint: _toBase58Placeholder(rewardMintBytes),
        baseRatePerMinute: baseRate,
      );
    } catch (e) {
      return null;
    }
  }

  static int _readU64LE(Uint8List raw, int offset) {
    final bd = ByteData.sublistView(raw, offset, offset + 8);
    // Dart int is 64-bit signed; account values fit within positive range
    final lo = bd.getUint32(0, Endian.little);
    final hi = bd.getUint32(4, Endian.little);
    return (hi << 32) | lo;
  }

  // Placeholder: we keep rewardMint as base58 string if provided externally.
  // For decoded accounts we don't have a base58 encoder here, so mark clearly.
  static String _toBase58Placeholder(List<int> bytes) {
    return '0x' + hex.encode(bytes);
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
  print('Note: Querying ALL devices requires the proper account discriminator');
  print('which is derived from the IDL. For demo, showing how it would work:');
  final allDevices = await VapecommanderRewardsQuery.queryAllDevices();
  print('Found ${allDevices.length} devices (mock results)');
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