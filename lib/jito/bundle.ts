import bs58 from "bs58";
import {
  VersionedTransaction,
  TransactionMessage,
  Keypair,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import { getConnection } from "@/lib/solana/connection";
import { buildJitoTipInstruction } from "./tip";

const JITO_ENDPOINTS = [
  "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
  "https://slc.mainnet.block-engine.jito.wtf/api/v1/bundles",
];

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 800;
const JITO_TIP_SOL = 0.001;
const STATUS_POLL_ATTEMPTS = 8;
const STATUS_POLL_INTERVAL_MS = 2000;

interface BundleResult {
  bundleId: string;
  status: string;
  landedSlot?: number;
}

interface BundleOptions {
  tipPayer: Keypair;
}

function getRandomEndpoint(): string {
  return JITO_ENDPOINTS[Math.floor(Math.random() * JITO_ENDPOINTS.length)];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

async function buildTipTransaction(tipPayer: Keypair): Promise<Uint8Array> {
  const connection = getConnection();
  const { blockhash } = await connection.getLatestBlockhash("confirmed");

  const message = new TransactionMessage({
    payerKey: tipPayer.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 5_000 }),
      buildJitoTipInstruction(tipPayer.publicKey, JITO_TIP_SOL),
    ],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([tipPayer]);
  return tx.serialize();
}

async function attemptSend(
  encoded: string[],
  endpoint: string
): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [encoded],
    }),
  });

  if (response.status === 429) {
    throw new RateLimitError("HTTP 429 rate limited");
  }

  const text = await response.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Jito ${response.status}: ${text}`);
  }

  if (!response.ok) {
    const errMsg = (data.error as { message?: string })?.message || text;
    throw new Error(`Jito ${response.status}: ${errMsg}`);
  }

  const error = data.error as { code?: number; message?: string } | undefined;
  if (error) {
    const isRateLimit = error.code === -32097 || error.code === -32429;
    if (isRateLimit) {
      throw new RateLimitError(error.message || "rate limited");
    }
    throw new Error(`Jito error: ${error.message || JSON.stringify(error)}`);
  }

  return data.result as string;
}

async function pollBundleStatus(
  bundleId: string
): Promise<{ status: string; landedSlot?: number }> {
  for (let i = 0; i < STATUS_POLL_ATTEMPTS; i++) {
    await sleep(STATUS_POLL_INTERVAL_MS);

    try {
      const endpoint = getRandomEndpoint();
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBundleStatuses",
          params: [[bundleId]],
        }),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const statuses = data?.result?.value;
      if (!statuses || statuses.length === 0) {
        console.log(`[jito] Status poll ${i + 1}/${STATUS_POLL_ATTEMPTS}: not found yet`);
        continue;
      }

      const bundleStatus = statuses[0];
      const status = bundleStatus.confirmation_status || "unknown";
      const slot = bundleStatus.slot;
      const err = bundleStatus.err;

      console.log(
        `[jito] Status poll ${i + 1}: ${status}${slot ? ` (slot ${slot})` : ""}${err ? ` err: ${JSON.stringify(err)}` : ""}`
      );

      if (err) {
        throw new Error(
          `Bundle failed on-chain: ${JSON.stringify(err)}`
        );
      }

      if (status === "confirmed" || status === "finalized") {
        return { status, landedSlot: slot };
      }
    } catch (pollErr) {
      if (pollErr instanceof Error && pollErr.message.startsWith("Bundle failed")) {
        throw pollErr;
      }
      console.warn(`[jito] Status poll ${i + 1} error:`, pollErr);
    }
  }

  return { status: "unknown" };
}

export async function sendJitoBundle(
  signedTransactions: Uint8Array[],
  options: BundleOptions
): Promise<BundleResult> {
  // Log TX signatures for debugging
  for (let i = 0; i < signedTransactions.length; i++) {
    try {
      const tx = VersionedTransaction.deserialize(signedTransactions[i]);
      const sig = bs58.encode(tx.signatures[0]);
      const label = ["funding", "create", "buy"][i] || `tx-${i}`;
      console.log(`[jito] ${label} TX sig: ${sig}`);
    } catch {
      // skip
    }
  }

  const tipTx = await buildTipTransaction(options.tipPayer);
  const allTxs = [...signedTransactions, tipTx];
  const encoded = allTxs.map((tx) => bs58.encode(tx));

  console.log(`[jito] Sending bundle with ${allTxs.length} TXs (${signedTransactions.length} + tip)`);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const endpoint = getRandomEndpoint();
    try {
      const bundleId = await attemptSend(encoded, endpoint);
      console.log(
        `[jito] Bundle ${bundleId} accepted on attempt ${attempt + 1} via ${new URL(endpoint).hostname}`
      );

      // Poll for landing confirmation
      const { status, landedSlot } = await pollBundleStatus(bundleId);
      console.log(`[jito] Bundle ${bundleId} final status: ${status}`);

      return { bundleId, status, landedSlot };
    } catch (error) {
      lastError = error as Error;
      const isRateLimit = error instanceof RateLimitError;

      if (lastError.message.startsWith("Bundle failed")) {
        throw lastError;
      }

      console.warn(
        `[jito] Attempt ${attempt + 1}/${MAX_RETRIES} failed (${isRateLimit ? "rate limited" : "error"}): ${lastError.message}`
      );

      if (!isRateLimit) throw lastError;

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error("Jito bundle failed after all retries");
}
