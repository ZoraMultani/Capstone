import React from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#667eea",
        padding: 24,
        justifyContent: "center",
      }}
    >
      <View
        style={{
          alignSelf: "center",
          width: 120,
          height: 120,
          borderRadius: 30,
          backgroundColor: "rgba(255,255,255,0.2)",
          marginBottom: 28,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 46 }}>👤</Text>
      </View>

      <Text
        style={{
          color: "white",
          fontSize: 32,
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        Elderly Fall{"\n"}Detection
      </Text>

      <Text
        style={{
          color: "white",
          opacity: 0.92,
          fontSize: 16,
          lineHeight: 22,
          textAlign: "center",
          marginTop: 14,
          marginBottom: 36,
        }}
      >
        Stay safe and connected with real-time fall detection and instant
        emergency alerts
      </Text>

      <Pressable
        onPress={() => router.push("/register")}
        style={{
          backgroundColor: "white",
          paddingVertical: 16,
          borderRadius: 30,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ color: "#667eea", fontWeight: "800", fontSize: 18 }}>
          Get Started
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/login")}
        style={{
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: "white",
          paddingVertical: 14,
          borderRadius: 30,
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white", fontWeight: "800", fontSize: 18 }}>
          Sign In
        </Text>
      </Pressable>

      <View style={{ alignItems: "center", marginTop: 18 }}>
        <View
          style={{
            backgroundColor: "#ff4757",
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderRadius: 20,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800", fontSize: 12 }}>
            24/7 Emergency Monitoring
          </Text>
        </View>
      </View>
    </View>
  );
}
