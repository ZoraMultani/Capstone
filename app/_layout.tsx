// app/_layout.tsx
import { attachPushListeners, setupPushNotifications } from "@/api/push";
import { ensureSessionLoaded } from "@/hooks/useOnnxSession";
import { handleAndroidPermissions } from "@/utils/blePerms";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { DeviceEventEmitter } from "react-native";
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

    const sub = DeviceEventEmitter.addListener("LoginSuccess", () => {
      setupPushNotifications()
      .then(() => {
        cleanupPushListeners = attachPushListeners();
      })
      .catch((error) => {
        console.error("[RootLayout] Push setup error:", error);
      });
    })

    return () => {
      cleanupPushListeners?.();
      sub.remove();
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