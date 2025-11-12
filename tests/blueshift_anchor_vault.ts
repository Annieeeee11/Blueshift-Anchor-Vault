import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BlueshiftAnchorVault } from "../target/types/blueshift_anchor_vault";

describe("blueshift_anchor_vault", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.blueshiftAnchorVault as Program<BlueshiftAnchorVault>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.deposit(new anchor.BN(1000000000)).rpc();
    console.log("Deposit transaction signature", tx);
    const tx2 = await program.methods.withdraw().rpc();
    console.log("Withdraw transaction signature", tx2);
  });
});
