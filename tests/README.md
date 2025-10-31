# Vapecommander Rewards - Test Suite

Comprehensive test suite for the device-signed attestation rewards program.

## Test Coverage

### 1. **Config Initialization**
- Creates config PDA with base rate per minute
- Transfers mint authority to config PDA
- Verifies config account state

### 2. **Device Registration**
- Registers device with Ed25519 public key and device hash
- Initializes monotonic counters (lifetime_minutes, report_counter)
- Verifies device PDA state

### 3. **Reward Claims**
- **First Claim**: Tests initial reward claim with Ed25519 signature
  - Creates Ed25519 verify pre-instruction
  - Signs message with device keypair
  - Mints tokens based on lifetime_minutes
  - Updates device state

- **Delta Claim**: Tests incremental rewards
  - Calculates delta from previous claim
  - Applies multiplier (basis points)
  - Verifies correct token amount minted

### 4. **Security Tests**
- **Non-Monotonic lifetime_minutes**: Rejects claims with decreasing lifetime
- **Non-Monotonic report_counter**: Rejects claims with decreasing counter
- **Missing Ed25519 Instruction**: Rejects claims without signature verification

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure Solana test validator is installed
solana --version  # Should be 2.3.13+

# Ensure Anchor is installed
anchor --version  # Should be 0.32.1
```

### Run All Tests

```bash
# Start local validator and run tests
anchor test

# Or manually:
# Terminal 1: Start validator
solana-test-validator -r

# Terminal 2: Run tests
anchor test --skip-local-validator
```

### Run Specific Tests

```bash
# Run only the test file
npm run test:unit

# With verbose output
anchor test -- --verbose
```

## Test Flow

```
1. Setup
   ├─ Airdrop SOL to test accounts
   ├─ Create reward mint (SPL Token)
   └─ Derive PDAs (config, device)

2. Initialize Config
   ├─ Create config PDA
   └─ Transfer mint authority to config

3. Register Device
   ├─ Generate device keypair
   ├─ Calculate device hash (SHA256 of MAC)
   └─ Create device PDA

4. Create User Token Account
   └─ Create ATA for reward mint

5. Claim Rewards (First)
   ├─ Hash message (CRAFTY_V1 || device_hash || user || lifetime || counter || time)
   ├─ Sign with device Ed25519 keypair
   ├─ Create Ed25519 verify instruction
   ├─ Execute claim instruction
   └─ Verify tokens minted

6. Claim Rewards (Delta)
   ├─ Increase lifetime_minutes and report_counter
   ├─ Sign new message
   ├─ Execute claim
   └─ Verify delta tokens minted with multiplier

7. Security Tests
   ├─ Test non-monotonic counters (should fail)
   └─ Test missing Ed25519 instruction (should fail)
```

## Message Format

The device signs the SHA-256 hash of:

```
DOMAIN: "CRAFTY_V1" (9 bytes)
device_hash: [u8; 32]
user_pubkey: Pubkey (32 bytes)
lifetime_minutes: u64 (8 bytes, little-endian)
report_counter: u64 (8 bytes, little-endian)
unix_time: i64 (8 bytes, little-endian)
```

Total: 97 bytes → SHA-256 → 32 bytes message hash

## Ed25519 Instruction Format

The Ed25519 verify instruction data layout:

```
Header (16 bytes):
  - 1 byte: number of signatures (1)
  - 1 byte: padding
  - 2 bytes: signature offset (LE)
  - 2 bytes: signature instruction index (0xFFFF)
  - 2 bytes: public key offset (LE)
  - 2 bytes: public key instruction index (0xFFFF)
  - 2 bytes: message data offset (LE)
  - 2 bytes: message data size (LE)
  - 2 bytes: message instruction index (0xFFFF)

Data:
  - 64 bytes: Ed25519 signature
  - 32 bytes: Ed25519 public key
  - N bytes: message (32 bytes for SHA-256 hash)
```

## Test Accounts

- **Authority**: Program authority (wallet from `~/.config/solana/id.json`)
- **User**: Test user receiving rewards (generated keypair)
- **Device**: Device Ed25519 keypair (generated)
- **Reward Mint**: SPL Token mint (created in test)

## Expected Results

### First Claim (100 minutes, 100% multiplier)
```
Base rate: 1,000,000 tokens/minute
Lifetime: 100 minutes
Reward: 100 * 1,000,000 = 100,000,000 tokens
```

### Second Claim (150 minutes total, 120% multiplier)
```
Delta: 150 - 100 = 50 minutes
Base reward: 50 * 1,000,000 = 50,000,000
Multiplied: 50,000,000 * 1.2 = 60,000,000 tokens
Total balance: 100,000,000 + 60,000,000 = 160,000,000 tokens
```

## Debugging

### Enable Logs

```bash
# Set log level
export RUST_LOG=solana_runtime::system_instruction_processor=trace,solana_runtime::message_processor=debug,solana_bpf_loader=debug,solana_rbpf=debug

# Run with logs
anchor test -- --show-logs
```

### Common Issues

**1. "Transaction simulation failed"**
- Check that Ed25519 instruction is first in transaction
- Verify message hash matches signed data
- Ensure device public key matches registered key

**2. "InvalidLifetimeMinutes" or "InvalidReportCounter"**
- Counters must be strictly increasing
- Check device PDA state before claiming

**3. "Account not found"**
- Ensure config and device PDAs are initialized
- Check PDA derivation seeds match

**4. "Insufficient funds"**
- Airdrop more SOL to test accounts
- Check token account exists

## Integration with Flutter App

The test demonstrates the exact flow the Flutter app should follow:

1. **Get device data via BLE**
   - MAC address → device_hash
   - lifetime_minutes, report_counter

2. **Build message**
   - Hash: `CRAFTY_V1 || device_hash || user_pubkey || lifetime || counter || time`

3. **Request device signature**
   - Device signs message hash with its Ed25519 key

4. **Build transaction**
   - Ed25519 verify instruction (index 0)
   - Claim instruction (index 1)

5. **Submit transaction**
   - User signs with wallet
   - Submit to Solana network

## Next Steps

1. **Add more test cases**:
   - Multiple devices
   - Different multipliers
   - Edge cases (overflow, max values)

2. **Performance tests**:
   - Batch claims
   - Concurrent users

3. **Integration tests**:
   - Real device signatures
   - Flutter client integration

4. **Fuzz testing**:
   - Random inputs
   - Malformed signatures

## References

- [Anchor Testing](https://www.anchor-lang.com/docs/testing)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token](https://spl.solana.com/token)
- [Ed25519 Program](https://docs.solana.com/developing/runtime-facilities/programs#ed25519-program)
