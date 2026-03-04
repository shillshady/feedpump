const HELIUS_API = "https://api.helius.xyz/v0";

function getApiKey(): string {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new Error("HELIUS_API_KEY is required");
  return key;
}

function getWebhookUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) throw new Error("NEXT_PUBLIC_APP_URL is required");
  return `${appUrl}/api/webhooks/helius`;
}

interface CreateWebhookResult {
  webhookID: string;
}

export async function createWebhook(
  accountAddresses: string[]
): Promise<CreateWebhookResult> {
  const response = await fetch(
    `${HELIUS_API}/webhooks?api-key=${getApiKey()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookURL: getWebhookUrl(),
        transactionTypes: ["TRANSFER"],
        accountAddresses,
        webhookType: "enhanced",
        authHeader: process.env.WEBHOOK_AUTH_SECRET,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Helius create webhook failed: ${body}`);
  }

  return response.json();
}

export async function addAddressToWebhook(
  webhookId: string,
  newAddresses: string[]
): Promise<void> {
  // First get existing webhook to preserve addresses
  const getRes = await fetch(
    `${HELIUS_API}/webhooks/${webhookId}?api-key=${getApiKey()}`
  );

  if (!getRes.ok) throw new Error("Failed to fetch webhook");

  const existing = await getRes.json();
  const allAddresses = [
    ...new Set([...existing.accountAddresses, ...newAddresses]),
  ];

  const response = await fetch(
    `${HELIUS_API}/webhooks/${webhookId}?api-key=${getApiKey()}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webhookURL: getWebhookUrl(),
        transactionTypes: ["TRANSFER"],
        accountAddresses: allAddresses,
        webhookType: "enhanced",
        authHeader: process.env.WEBHOOK_AUTH_SECRET,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Helius update webhook failed: ${body}`);
  }
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  const response = await fetch(
    `${HELIUS_API}/webhooks/${webhookId}?api-key=${getApiKey()}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(`Helius delete webhook failed: ${response.statusText}`);
  }
}
