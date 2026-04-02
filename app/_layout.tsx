// app/_layout.tsx
import { setupPushNotifications, attachPushListeners } from "@/api/push";
import { ensureSessionLoaded } from "@/hooks/useOnnxSession";
import { handleAndroidPermissions } from "@/utils/blePerms";
import { Stack } from "expo-router";
import { useEffect } from "react";
import BleManager from "react-native-ble-manager";

export default function RootLayout() {
  useEffect(() => {
    let cleanupPushListeners: (() => void) | undefined;

    BleManager.start({ showAlert: false })
      .then(() => {
        console.log("BLE started!");
      })
      .catch(() => {
        console.error("BLE failed to start ☹️");
      });

    handleAndroidPermissions();
    ensureSessionLoaded();

    setupPushNotifications()
      .then(() => {
        cleanupPushListeners = attachPushListeners();
      })
      .catch((error) => {
        console.error("[RootLayout] Push setup error:", error);
      });

    return () => {
      cleanupPushListeners?.();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}