import { PublicKey } from "@solana/web3.js";

const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);

const PUMPSWAP_PROGRAM_ID = new PublicKey(
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"
);

export function deriveBondingCurveVault(mintAddress: string): string {
  const mint = new PublicKey(mintAddress);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return vaultPda.toBase58();
}

export function derivePumpSwapVault(
  mintAddress: string,
  poolId: string
): string {
  const mint = new PublicKey(mintAddress);
  const pool = new PublicKey(poolId);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool_sol_vault"), pool.toBuffer()],
    PUMPSWAP_PROGRAM_ID
  );
  return vaultPda.toBase58();
}

export function deriveCreatorVault(mintAddress: string): string {
  const mint = new PublicKey(mintAddress);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator-vault"), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return vaultPda.toBase58();
}
