import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
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
const METAPLEX_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const CREATE_DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);

interface CreateParams {
  creatorPublicKey: PublicKey;
  mintPublicKey: PublicKey;
  tokenMetadata: {
    name: string;
    symbol: string;
    uri: string;
  };
  priorityFee: number;
}

function deriveMintAuthority(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint-authority")],
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

function deriveGlobal(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global")],
    PUMP_PROGRAM_ID
  );
  return pda;
}

function deriveMetadata(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    METAPLEX_METADATA_PROGRAM_ID
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

function serializeBorshString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf-8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function buildInstructionData(
  name: string,
  symbol: string,
  uri: string,
  creator: PublicKey
): Buffer {
  return Buffer.concat([
    CREATE_DISCRIMINATOR,
    serializeBorshString(name),
    serializeBorshString(symbol),
    serializeBorshString(uri),
    creator.toBuffer(),
  ]);
}

export async function buildCreateTransaction(
  params: CreateParams
): Promise<Uint8Array> {
  const { creatorPublicKey, mintPublicKey, tokenMetadata, priorityFee } =
    params;

  const mintAuthority = deriveMintAuthority();
  const bondingCurve = deriveBondingCurve(mintPublicKey);
  const associatedBondingCurve = deriveAssociatedTokenAddress(
    bondingCurve,
    mintPublicKey
  );
  const global = deriveGlobal();
  const metadata = deriveMetadata(mintPublicKey);
  const eventAuthority = deriveEventAuthority();

  const data = buildInstructionData(
    tokenMetadata.name,
    tokenMetadata.symbol,
    tokenMetadata.uri,
    creatorPublicKey
  );

  // 14 accounts matching the on-chain IDL order exactly
  const createInstruction = new TransactionInstruction({
    programId: PUMP_PROGRAM_ID,
    keys: [
      { pubkey: mintPublicKey, isSigner: true, isWritable: true },
      { pubkey: mintAuthority, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: global, isSigner: false, isWritable: false },
      { pubkey: METAPLEX_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: creatorPublicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: eventAuthority, isSigner: false, isWritable: false },
      { pubkey: PUMP_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: creatorPublicKey,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
      createInstruction,
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  return tx.serialize();
}
