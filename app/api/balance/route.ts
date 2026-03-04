import { NextRequest, NextResponse } from "next/server";

const RPC_URL = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet) {
    return NextResponse.json({ error: "missing wallet" }, { status: 400 });
  }

  try {
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet, { commitment: "confirmed" }],
      }),
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 502 });
    }

    return NextResponse.json({ lamports: data.result.value });
  } catch {
    return NextResponse.json({ error: "rpc failed" }, { status: 502 });
  }
}
