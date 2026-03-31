import { buildAuthHeaders, getAuthToken } from "@/api/auth";

export type EventSeverity = "Fall" | "Unstable" | "Stable";

export type FallEvent = {
  id: string;
  severity: EventSeverity;
  time: string;
};

export type HistoryData = {
  totalFalls: number;
  highRiskCount: number;
  averageState: EventSeverity;
  events: FallEvent[];
};

type HistoryApiResponse = {
  summary?: {
    totalFalls?: number;
    highRiskEvents?: number;
  };
  averageState?: {
    level?: string;
  };
  recentEvents?: Array<{
    id?: string;
    severity?: string;
    time?: string;
  }>;
};

export type HistorySample = {
  nor: number;
  preFall: number;
  fall: number;
};

export type CreateHistoryPayload = {
  data: HistorySample[];
  datetime: string;
};

function normalizeSeverity(value?: string): EventSeverity {
  if (value === "Fall" || value === "Unstable" || value === "Stable") {
    return value;
  }
  return "Stable";
}

export async function getHistoryData(): Promise<HistoryData> {
  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

  const API_URL = BASE_URL ? `${BASE_URL}/history` : null;

  const token = await getAuthToken();

  if (!API_URL) {
    throw new Error("API base URL is missing.");
  }

  const response = await fetch(API_URL, {
    method: "GET",
    headers: buildAuthHeaders(token ?? undefined),
  });

  if (!response.ok) {
    throw new Error(`History request failed: ${response.status}`);
  }

  const data: HistoryApiResponse = await response.json();

  return {
    totalFalls: data.summary?.totalFalls ?? 0,
    highRiskCount: data.summary?.highRiskEvents ?? 0,
    averageState: normalizeSeverity(data.averageState?.level),
    events: Array.isArray(data.recentEvents)
      ? data.recentEvents.map((event, index) => ({
          id: event.id ?? `event-${index}`,
          severity: normalizeSeverity(event.severity),
          time: event.time ?? "",
        }))
      : [],
  };
}

export async function postHistoryData(payload: CreateHistoryPayload) {
  const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
  const API_URL = BASE_URL ? `${BASE_URL}/history` : null;
  const token = await getAuthToken();

  if (!API_URL) {
    throw new Error("API base URL is missing.");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: buildAuthHeaders(token ?? undefined),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    throw new Error(`History POST failed: ${response.status} ${rawText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}
