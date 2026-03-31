//app/_layout.tsx
import { ensureSessionLoaded } from "@/hooks/useOnnxSession";
import { handleAndroidPermissions } from "@/utils/blePerms";
import { Stack } from "expo-router";
import { useEffect } from "react";
import BleManager from 'react-native-ble-manager';

export default function RootLayout() {

  useEffect(() => {
    BleManager.start({showAlert: false}).then(() => {
      console.log("BLE started!");
    }).catch(() => {
      console.error("BLE failed to start ☹️");
    })
    handleAndroidPermissions();

    ensureSessionLoaded();

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
