import { buildAuthHeaders, getAuthToken } from "@/api/auth";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

let hasConfiguredNotificationHandler = false;
let pushSetupPromise: Promise<string | null> | null = null;

function ensureNotificationHandlerConfigured() {
  if (hasConfiguredNotificationHandler) return;

    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }), 
    });

  hasConfiguredNotificationHandler = true;
}

async function registerDevice(pushToken: string) {
  const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL is missing.");
  }

  const token = getAuthToken();
  const installationId =
    Application.getAndroidId?.() ||
    Application.applicationId ||
    `install-${Date.now()}`;

  const response = await fetch(`${baseUrl}/devices/register`, {
    method: "POST",
    headers: buildAuthHeaders(token ?? undefined),
    body: JSON.stringify({
      installationId,
      platform: Platform.OS,
      pushChannel: pushToken,
    }),
  });

  const rawText = await response.text().catch(() => "");
  if (!response.ok) {
    throw new Error(`Device register failed: ${response.status} ${rawText}`);
  }

  return rawText;
}

export async function setupPushNotifications(): Promise<string | null> {
  if (pushSetupPromise) {
    return pushSetupPromise;
  }

  pushSetupPromise = (async () => {
    ensureNotificationHandlerConfigured();

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      console.warn("[push] Notification permission not granted.");
      return null;
    }

    const pushToken = (await Notifications.getDevicePushTokenAsync()).data;
    console.log("[push] Device push token:", pushToken);

    await registerDevice(pushToken);
    console.log("[push] Device registered with backend.");

    return pushToken;
  })().catch((error) => {
    pushSetupPromise = null;
    console.error("[push] Setup failed:", error);
    throw error;
  });

  return pushSetupPromise;
}

export function attachPushListeners() {
  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    console.log("[push] Notification received:", notification);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("[push] Notification tapped:", response);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}