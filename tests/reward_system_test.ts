import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { VapecommanderRewards } from "../target/types/vapecommander_rewards";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { assert } from "chai";

describe("vapecommander-rewards", () => {
  // Configure the client to use the devnet cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.VapecommanderRewards as Program<VapecommanderRewards>;
  const programId = new PublicKey("FjfxjdGpEFD1Qg4Vz8tdNpQVZh7RLXQZwY1cU79u7zo7");
  
  // PDAs from our initialization
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('config2')],
    programId
  );
  
  const [rewardMintPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_mint')],
    programId
  );
  
  const [mintAuthPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('reward_mint_auth')],
    programId
  );

  it("Initializes the reward system", async () => {
    // Check if config is already initialized
    const configAccount = await provider.connection.getAccountInfo(configPda);
    
    if (!configAccount) {
      // Initialize config
      console.log('Initializing config...');
      await program.methods.initializeConfig()
        .accounts({
          authority: provider.wallet.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      
      // Initialize reward mint
      console.log('Initializing reward mint...');
      await program.methods.initializeRewardMint(6) // 6 decimals
        .accounts({
          payer: provider.wallet.publicKey,
          config: configPda,
          rewardMint: rewardMintPda,
          mintAuthPda: mintAuthPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      
      console.log('Reward system initialized successfully!');
    } else {
      console.log('Reward system already initialized');
    }
    
    // Verify config
    const config = await program.account.config.fetch(configPda);
    assert.ok(config.authority.equals(provider.wallet.publicKey));
    assert.ok(config.rewardMint.equals(rewardMintPda));
    assert.equal(config.decimals, 6);
  });

  it("Mints rewards to a user", async () => {
    // Generate a test user
    const user = Keypair.generate();
    console.log(`Test user: ${user.publicKey.toString()}`);
    
    // Airdrop SOL to the test user
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 1 * LAMPORTS_PER_SOL),
      'confirmed'
    );
    
    // Get user's associated token account
    const userTokenAccount = await getAssociatedTokenAddress(
      rewardMintPda, // mint
      user.publicKey, // owner
    );
    
    // Get token account info (might not exist yet)
    let tokenAccountInfo;
    try {
      tokenAccountInfo = await provider.connection.getTokenAccountBalance(userTokenAccount);
      console.log('User token balance:', tokenAccountInfo.value.amount);
    } catch (e) {
      console.log('User token account does not exist yet');
    }
    
    // Here you would add the actual minting logic once you implement it in your program
    // For now, we'll just verify we can interact with the reward mint
    const mintInfo = await provider.connection.getAccountInfo(rewardMintPda);
    assert.ok(mintInfo, 'Reward mint account exists');
    
    console.log('Reward mint:', rewardMintPda.toString());
    console.log('Mint authority:', mintAuthPda.toString());
    
    // In a real test, you would now call your program's mint function here
    // and verify the user received the expected tokens
  });
});
