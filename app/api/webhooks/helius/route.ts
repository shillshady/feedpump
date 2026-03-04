import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  // Verify auth header
  const authHeader = request.headers.get("authorization");
  if (authHeader !== process.env.WEBHOOK_AUTH_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await request.json();

    if (!Array.isArray(events)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Find tokens that match the account addresses in events
    for (const event of events) {
      const nativeTransfers = event.nativeTransfers ?? [];

      for (const transfer of nativeTransfers) {
        // Look for SOL transfers TO one of our tracked vaults
        const token = await prisma.token.findFirst({
          where: {
            OR: [
              { vaultPda: transfer.toUserAccount },
              { swapVaultPda: transfer.toUserAccount },
            ],
          },
        });

        if (token) {
          await prisma.webhookEvent.create({
            data: {
              tokenId: token.id,
              payload: event,
              processed: false,
            },
          });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
