const IPFS_ENDPOINT = "https://pump.fun/api/ipfs";

interface TokenMetadataInput {
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  imageFile: File;
}

interface MetadataResult {
  metadataUri: string;
}

export async function uploadMetadata(
  input: TokenMetadataInput
): Promise<MetadataResult> {
  // Convert File to Blob with explicit type to ensure compatibility
  const arrayBuffer = await input.imageFile.arrayBuffer();
  const blob = new Blob([arrayBuffer], {
    type: input.imageFile.type || "image/png",
  });

  const formData = new FormData();
  formData.append("file", blob, input.imageFile.name || "image.png");
  formData.append("name", input.name);
  formData.append("symbol", input.symbol);
  formData.append("description", input.description);
  formData.append("showName", "true");

  if (input.twitter) formData.append("twitter", input.twitter);
  if (input.telegram) formData.append("telegram", input.telegram);
  if (input.website) formData.append("website", input.website);

  const response = await fetch(IPFS_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Metadata upload failed (${response.status}): ${body}`);
  }

  const result = await response.json();

  if (!result.metadataUri) {
    throw new Error(`Metadata upload returned no URI: ${JSON.stringify(result)}`);
  }

  return result;
}
