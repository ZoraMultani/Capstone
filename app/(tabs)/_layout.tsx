//app/(tabs)/_layout.tsx
import { Tabs, Redirect } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAuthToken, getCurrentUser } from "@/api/auth";
import { useEffect } from "react";
import { ensureSessionLoaded } from "@/hooks/useOnnxSession";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const token = getAuthToken();
  const user = getCurrentUser();
  const isAuthenticated = !!token && !!user?.id;

  useEffect(() => {
    ensureSessionLoaded();
  }, []);

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="clock.fill" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="risk"
        options={{
          title: "Risk",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="exclamationmark.triangle.fill" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="model"
        options={{
          title: "Model",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="cpu.fill" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <IconSymbol name="gearshape.fill" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
