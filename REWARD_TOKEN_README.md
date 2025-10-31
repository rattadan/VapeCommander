# VapeCommander Reward Token Initialization and Minting

This document describes how to initialize the on-chain reward mint and how reward distribution works in the `vapecommander_rewards` program.

## Overview

- The program can create the reward mint itself via CPI and attach Metaplex metadata.
- Minutes submission mints the delta (new_total - previous_total) minutes as tokens to the submitter’s Associated Token Account (ATA).
- Reward rate: 1 token per minute, scaled by the mint `decimals` (e.g., 6 decimals => 1 minute = 1_000_000 base units).
- No freeze authority is set.

## Program Accounts and PDAs

- `Config` PDA: seeds = `['config']`
  - Stores `reward_mint`, `mint_bump`, `mint_auth_bump`, `decimals`.
- `Reward Mint` PDA: seeds = `['reward_mint']`
- `Mint Authority PDA`: seeds = `['reward_mint_auth']`
- `UserData` PDA per user: seeds = `['user_data', userPubkey]`
- `UserProfile` PDA per user: seeds = `['user_profile', userPubkey]`

## Initialize Config

Call once to create the `Config` PDA and set the admin authority.

```ts
await program.methods.initializeConfig().accounts({
  authority: payer.publicKey,
  config: configPda,
  systemProgram: SystemProgram.programId,
}).rpc();
```

Derive `configPda` via Anchor (seeds `['config']`).

## Initialize Reward Mint and Metadata

Provide the token parameters:
- name: "VapeCommander Smoke"
- symbol: "Smoke"
- uri: "<Your-Metaplex-Metadata-JSON-URL>"
- decimals: 6

```ts
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';

const [configPda] = PublicKey.findProgramAddressSync([
  Buffer.from('config')
], program.programId);

const [rewardMintPda, mintBump] = PublicKey.findProgramAddressSync([
  Buffer.from('reward_mint')
], program.programId);

const [mintAuthPda, mintAuthBump] = PublicKey.findProgramAddressSync([
  Buffer.from('reward_mint_auth')
], program.programId);

const [metadataPda] = PublicKey.findProgramAddressSync([
  Buffer.from('metadata'),
  TOKEN_METADATA_PROGRAM_ID.toBuffer(),
  rewardMintPda.toBuffer(),
], TOKEN_METADATA_PROGRAM_ID);

await program.methods.initializeRewardMint(
  'VapeCommander Smoke',
  'Smoke',
  '<YOUR_METADATA_URI>',
  6,
).accounts({
  payer: payer.publicKey,
  config: configPda,
  rewardMint: rewardMintPda,
  mintAuthPda,
  metadata: metadataPda,
  tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  rent: SYSVAR_RENT_PUBKEY,
  systemProgram: SystemProgram.programId,
  tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
}).signers([payer]).rpc();
```

Note: The instruction creates the mint account (owned by SPL Token) and sets the mint authority to the `mintAuthPda`. Metadata is created and update authority set to `mintAuthPda` as well.

## Submitting Minutes and Minting Rewards

- First call initializes `UserData` for the signer and mints the full submitted minutes.
- Subsequent calls require strictly increasing total minutes, minting only the delta.

```ts
// Subscribe / initialize (idempotent)
await program.methods.subscribeMinutes(new anchor.BN(totalMinutes), new anchor.BN(timestamp))
  .accounts({
    user: user.publicKey,
    userData: userDataPda,
    config: configPda,
    rewardMint: rewardMintPda,
    mintAuthPda,
    userTokenAccount: getAssociatedTokenAddressSync(rewardMintPda, user.publicKey),
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([user])
  .rpc();

// Update
await program.methods.addMinutes(new anchor.BN(newTotalMinutes), new anchor.BN(timestamp))
  .accounts({
    user: user.publicKey,
    userData: userDataPda,
    config: configPda,
    rewardMint: rewardMintPda,
    mintAuthPda,
    userTokenAccount: getAssociatedTokenAddressSync(rewardMintPda, user.publicKey),
    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([user])
  .rpc();
```

Each call mints `delta_minutes * 10^decimals` base units to the user's ATA.

## Metaplex Metadata

The URI points to a standard Metaplex JSON (image + attributes). Host the JSON on Arweave/IPFS or any public CDN. You can update metadata later via Token Metadata program using the `mintAuthPda` as the update authority.
