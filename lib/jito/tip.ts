import { PublicKey, SystemProgram, TransactionInstruction, LAMPORTS_PER_SOL } from "@solana/web3.js";

const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4bVqkfRtQ7NmXwkiYoANABi",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSLGAuLRtmS9MKYdo2C",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

const DEFAULT_TIP_SOL = 0.0001;

function getRandomTipAccount(): PublicKey {
  const idx = Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length);
  return new PublicKey(JITO_TIP_ACCOUNTS[idx]);
}

export function buildJitoTipInstruction(
  payer: PublicKey,
  tipSol: number = DEFAULT_TIP_SOL
): TransactionInstruction {
  const lamports = Math.ceil(tipSol * LAMPORTS_PER_SOL);
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: getRandomTipAccount(),
    lamports,
  });
}
