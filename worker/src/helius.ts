const HELIUS_API = "https://api.helius.xyz/v0";

function getApiKey(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error("HELIUS_API_KEY required");
  return key;
}

export async function addAddressToWebhook(
  webhookId: string,
  newAddresses: string[]
): Promise<void> {
  const getRes = await fetch(
    `${HELIUS_API}/webhooks/${webhookId}?api-key=${getApiKey()}`
  );
  if (!getRes.ok) throw new Error("Failed to fetch webhook");

  const existing = await getRes.json();
  const allAddresses = [
    ...new Set([...existing.accountAddresses, ...newAddresses]),
  ];

  const webhookUrl = process.env.WEBHOOK_URL;
  if (!webhookUrl) throw new Error("WEBHOOK_URL required");

  const response = await fetch(
    `${HELIUS_API}/webhooks/${webhookId}?api-key=${getApiKey()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookURL: webhookUrl,
        transactionTypes: ["TRANSFER"],
        accountAddresses: allAddresses,
        webhookType: "enhanced",
        authHeader: process.env.WEBHOOK_AUTH_SECRET,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Helius webhook update failed: ${await response.text()}`);
  }
}
