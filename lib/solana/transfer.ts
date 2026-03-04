import {
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { getConnection } from "./connection";

const CREATE_GAS_BUFFER_SOL = 0.03;

export function calculateCreateFundingSol(): number {
  return CREATE_GAS_BUFFER_SOL;
}

export async function buildFundingTransaction(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  amountSol: number
): Promise<VersionedTransaction> {
  const connection = getConnection();
  const lamports = Math.ceil(amountSol * LAMPORTS_PER_SOL);

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const instruction = SystemProgram.transfer({
    fromPubkey,
    toPubkey,
    lamports,
  });

  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    recentBlockhash: blockhash,
    instructions: [instruction],
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}
