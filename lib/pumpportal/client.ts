const PUMPPORTAL_API = "https://pumpportal.fun/api/trade-local";

interface BuyTokenParams {
  publicKey: string;
  mintAddress: string;
  amountSol: number;
  slippage: number;
  priorityFee: number;
}

interface CollectFeeParams {
  publicKey: string;
  priorityFee?: number;
}

async function assertTxResponse(response: Response, label: string): Promise<Uint8Array> {
  if (!response.ok) {
    let body: string;
    try {
      body = await response.text();
    } catch {
      body = response.statusText;
    }
    throw new Error(`${label}: ${response.status} — ${body}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = await response.text();
    throw new Error(`${label}: got JSON instead of TX — ${json}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength < 100) {
    throw new Error(`${label}: response too small (${buffer.byteLength} bytes)`);
  }

  return new Uint8Array(buffer);
}

export async function buildBuyTransaction(
  params: BuyTokenParams
): Promise<Uint8Array> {
  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: params.publicKey,
      action: "buy",
      mint: params.mintAddress,
      amount: params.amountSol,
      denominatedInSol: "true",
      slippage: params.slippage,
      priorityFee: params.priorityFee,
      pool: "auto",
    }),
  });

  return assertTxResponse(response, "PumpPortal buy");
}

export async function buildCollectFeeTransaction(
  params: CollectFeeParams
): Promise<Uint8Array> {
  const response = await fetch(PUMPPORTAL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      publicKey: params.publicKey,
      action: "collectCreatorFee",
      priorityFee: params.priorityFee ?? 0.000001,
    }),
  });

  return assertTxResponse(response, "PumpPortal collectFee");
}
