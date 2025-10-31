import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { VapecommanderRewards } from "./target/types/vapecommander_rewards";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("vapecommander-rewards", () => {
  // Configure the client to use the devnet cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  
  const program = anchor.workspace.VapecommanderRewards as Program<VapecommanderRewards>;
  const programId = new PublicKey("FjfxjdGpEFD1Qg4Vz8tdNpQVZh7RLXQZwY1cU79u7zo7");

  it("Performs subscription test", async () => {
    // Generate a new keypair for testing
    const userWallet = Keypair.generate();
    
    console.log(`User wallet public key: ${userWallet.publicKey.toString()}`);
    
    // Airdrop SOL to the test wallet
    const connection = anchor.getProvider().connection;
    const airdropSignature = await connection.requestAirdrop(
      userWallet.publicKey,
      1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);
    console.log('Airdrop confirmed');

    // Find the user data PDA
    const [userDataPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user_data"), userWallet.publicKey.toBuffer()],
      programId
    );

    console.log("Attempting to subscribe minutes...");
    
    // Subscribe initial minutes
    const minutes = new anchor.BN(120); // 2 hours
    const timestamp = new anchor.BN(Date.now()); // Current timestamp
    
    try {
      const tx1 = await program.methods
        .subscribeMinutes(minutes, timestamp)
        .accounts({
          user: userWallet.publicKey,
          userData: userDataPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([userWallet])
        .rpc();
      
      console.log("Minutes subscribed successfully:", tx1);

      // Add more minutes
      console.log("Attempting to add more minutes...");
      
      const moreMinutes = new anchor.BN(60); // 1 more hour
      const newTimestamp = new anchor.BN(Date.now() + 30000); // 30 seconds later
      
      const tx2 = await program.methods
        .addMinutes(moreMinutes, newTimestamp)
        .accounts({
          user: userWallet.publicKey,
          userData: userDataPDA,
          systemProgram: SystemProgram.programId,
        })
        .signers([userWallet])
        .rpc();
      
      console.log("Additional minutes added successfully:", tx2);

      // Fetch the user data to verify
      const userData = await program.account.userData.fetch(userDataPDA);
      console.log("Final user data:", {
        user: userData.user.toString(),
        lifetimeMinutes: userData.lifetimeMinutes.toString(),
        lastUpdated: new Date(Number(userData.lastUpdated) * 1000).toISOString(),
      });

      // Verify that the lifetime minutes is the sum of both transactions
      const expectedMinutes = minutes.add(moreMinutes);
      assert.ok(userData.lifetimeMinutes.eq(expectedMinutes));
      
      console.log("Test completed successfully!");
    } catch (error) {
      console.error("Error during test:", error);
      throw error;
    }
  });
});