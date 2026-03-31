import { buildAuthHeaders, getAuthToken } from "@/api/auth";

export type CreateAlertPayload = {
  severity: string;
  message: string;
  metaJson: string;
};

export async function createAlert(payload: CreateAlertPayload) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
  }

  const apiUrl = `${baseUrl}/alerts`;
  const token = await getAuthToken();

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: buildAuthHeaders(token ?? undefined),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    throw new Error(`Alert request failed: ${response.status} ${rawText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}