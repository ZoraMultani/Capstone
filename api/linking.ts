import { buildAuthHeaders, getAuthToken } from "@/api/auth";

export type LinkedPerson = {
  userId: string;
  displayName: string;
  role: string;
};

export type CareLinksResponse = {
  code: string;
  linked: LinkedPerson[];
};

export type LinkByCodeResponse = {
  status: string;
  caregiverUserId?: string;
  displayName?: string;
};

export async function getCareLinks(): Promise<CareLinksResponse> {
  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const API_URL = BASE_URL ? `${BASE_URL}/care-links/my-code` : null;
  const token = getAuthToken();

  if (!API_URL) {
    throw new Error("API base URL is missing.");
  }

  const response = await fetch(API_URL, {
    method: "GET",
    headers: buildAuthHeaders(token ?? undefined),
  });

  const rawText = await response.text();

  let data: any = null;
  const looksLikeJson =
    rawText.trim().startsWith("{") || rawText.trim().startsWith("[");

  if (looksLikeJson) {
    data = JSON.parse(rawText);
  }

  if (!response.ok) {
    throw new Error(data?.message || rawText || "Failed to load care links.");
  }

  return {
    code: data?.code ?? "",
    linked: Array.isArray(data?.linked)
      ? data.linked.map((person: any) => ({
          userId: person?.userId ?? "",
          displayName: person?.displayName ?? "",
          role: person?.role ?? "",
        }))
      : [],
  };
}

export async function linkByCode(code: string): Promise<LinkByCodeResponse> {
  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const API_URL = BASE_URL ? `${BASE_URL}/care-links/link-by-code` : null;
  const token = getAuthToken();

  if (!API_URL) {
    throw new Error("API base URL is missing.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: buildAuthHeaders(token ?? undefined),
    body: JSON.stringify({ code }),
  });

  const rawText = await response.text();

  let data: any = null;
  const looksLikeJson =
    rawText.trim().startsWith("{") || rawText.trim().startsWith("[");

  if (looksLikeJson) {
    data = JSON.parse(rawText);
  }

  if (!response.ok) {
    throw new Error(data?.message || rawText || "Failed to link caretaker.");
  }

  return {
    status: data?.status ?? "",
    caregiverUserId: data?.caregiverUserId,
    displayName: data?.displayName,
  };
}
