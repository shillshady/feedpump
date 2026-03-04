import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "@/lib/solana/connection";

const PUMP_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);
const FEE_PROGRAM_ID = new PublicKey(
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ"
);

// Constant from IDL for fee_config PDA second seed (pump program ID bytes)
const FEE_CONFIG_SEED_CONSTANT = Buffer.from([
  1, 86, 224, 246, 147, 102, 90, 207, 68, 219, 21, 104, 191, 23, 91, 170,
  81, 137, 203, 151, 245, 210, 255, 59, 101, 93, 43, 182, 253, 109, 24, 176,
]);

const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

// Pump.fun initial bonding curve constants
const INITIAL_VIRTUAL_SOL_RESERVES = BigInt(30) * BigInt(LAMPORTS_PER_SOL);
const INITIAL_VIRTUAL_TOKEN_RESERVES = BigInt("1073000000000000");

interface BuyParams {
  buyerPublicKey: PublicKey;
  mintPublicKey: PublicKey;
  creatorPublicKey: PublicKey;
  amountSol: number;
  slippageBps: number;
}

function deriveGlobal(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveBondingCurve(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveAssociatedTokenAddress(
  owner: PublicKey,
  mint: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return pda;
}

function deriveCreatorVault(creator: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator-vault"), creator.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveEventAuthority(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("__event_authority")],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveGlobalVolumeAccumulator(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global_volume_accumulator")],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveUserVolumeAccumulator(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), user.toBuffer()],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveFeeConfig(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), FEE_CONFIG_SEED_CONSTANT],
    FEE_PROGRAM_ID
  );
  return pda;
}

async function fetchFeeRecipient(): Promise<PublicKey> {
  const connection = getConnection();
  const globalPda = deriveGlobal();
  const accountInfo = await connection.getAccountInfo(globalPda);
  if (!accountInfo) throw new Error("Global account not found");
  // Borsh layout: discriminator(8) + initialized(1) + authority(32) + feeRecipient(32)
  const feeRecipient = new PublicKey(accountInfo.data.subarray(41, 73));
  return feeRecipient;
}

function calculateTokensOut(solAmountLamports: bigint): bigint {
  const numerator = INITIAL_VIRTUAL_TOKEN_RESERVES * solAmountLamports;
  const denominator = INITIAL_VIRTUAL_SOL_RESERVES + solAmountLamports;
  return numerator / denominator;
}

function buildBuyInstructionData(
  tokenAmount: bigint,
  maxSolCost: bigint
): Buffer {
  // discriminator(8) + amount(u64) + maxSolCost(u64) + trackVolume(OptionBool: None=0x00)
  const buf = Buffer.alloc(8 + 8 + 8 + 1);
  BUY_DISCRIMINATOR.copy(buf, 0);
  buf.writeBigUInt64LE(tokenAmount, 8);
  buf.writeBigUInt64LE(maxSolCost, 16);
  buf[24] = 0; // OptionBool::None
  return buf;
}

export async function buildBuyTransaction(
  params: BuyParams
): Promise<Uint8Array> {
  const { buyerPublicKey, mintPublicKey, creatorPublicKey, amountSol, slippageBps } =
    params;

  const solLamports = BigInt(Math.ceil(amountSol * LAMPORTS_PER_SOL));
  const expectedTokens = calculateTokensOut(solLamports);
  const minTokens =
    (expectedTokens * BigInt(10_000 - slippageBps)) / BigInt(10_000);
  const maxSolCost =
    (solLamports * BigInt(10_000 + slippageBps)) / BigInt(10_000);

  const [feeRecipient] = await Promise.all([fetchFeeRecipient()]);

  const bondingCurve = deriveBondingCurve(mintPublicKey);
  const associatedBondingCurve = deriveAssociatedTokenAddress(bondingCurve, mintPublicKey);
  const buyerAta = deriveAssociatedTokenAddress(buyerPublicKey, mintPublicKey);
  const creatorVault = deriveCreatorVault(creatorPublicKey);
  const eventAuthority = deriveEventAuthority();
  const globalVolumeAccumulator = deriveGlobalVolumeAccumulator();
  const userVolumeAccumulator = deriveUserVolumeAccumulator(buyerPublicKey);
  const feeConfig = deriveFeeConfig();
  const global = deriveGlobal();

  const data = buildBuyInstructionData(minTokens, maxSolCost);

  // 16 accounts matching the on-chain IDL order exactly
  const buyInstruction = new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: global, isSigner: false, isWritable: false },
      { pubkey: feeRecipient, isSigner: false, isWritable: true },
      { pubkey: mintPublicKey, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: buyerPublicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: globalVolumeAccumulator, isSigner: false, isWritable: false },
      { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
      { pubkey: feeConfig, isSigner: false, isWritable: false },
      { pubkey: FEE_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: buyerPublicKey,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
      buyInstruction,
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  return tx.serialize();
}
