import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import { Program } from "@project-serum/anchor";
import { VapecommanderRewards } from "../target/types/vapecommander_rewards";

async function findConfig() {
  // Configure the client to use the devnet cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  const programId = new PublicKey("A6Zzg393uGkKCn1hmtjWGa69swCYxHopy9gemyPmiHPq");
  
  // Find the config PDA
  const [configPDA] = await PublicKey.findProgramAddressSync(
    [Buffer.from("config2")],
    programId
  );
  
  console.log("Config PDA:", configPDA.toString());
  
  try {
    // Try to fetch the config account
    const program = new Program<VapecommanderRewards>(
      {} as any,
      programId,
      provider
    );
    
    const config = await program.account.config.fetch(configPDA);
    console.log("Config account found:", {
      authority: config.authority.toString(),
      rewardMint: config.rewardMint.toString(),
      totalUsers: config.totalUsers.toString(),
      decimals: config.decimals
    });
    
    return config.rewardMint;
  } catch (error) {
    console.log("Error fetching config account:", error);
    console.log("The config account might not be initialized yet.");
    return null;
  }
}

findConfig().catch(console.error);
