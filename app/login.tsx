import { loginUser } from "@/api/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Alert, DeviceEventEmitter, Pressable, Text, TextInput, View } from "react-native";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  if (!email.trim() || !password.trim()) {
    Alert.alert("Missing information", "Please enter your email and password.");
    return;
  }

  try {
    setLoading(true);

    const response = await loginUser({
      email: email.trim(),
      password,
      remember,
    });

    console.log("LOGIN SUCCESS RESPONSE:", response);

    DeviceEventEmitter.emit("LoginSuccess", "FUCK");
    
    Alert.alert(
      "Signed in",
      `Welcome back, ${response.user.displayName}!`,
      [
        {
          text: "OK",
          onPress: () => {
            console.log("Redirecting to /settings");
            router.replace("/settings");
          },
        },
      ]
    );
  } catch (error: any) {
    console.error("LOGIN SCREEN ERROR:", error);
    Alert.alert("Login failed", error?.message ?? "Invalid credentials");
  } finally {
    setLoading(false);
  }
};


  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ backgroundColor: "#667eea", padding: 24, paddingTop: 48 }}>
        <View
          style={{
            alignSelf: "center",
            width: 60,
            height: 60,
            borderRadius: 15,
            backgroundColor: "rgba(255,255,255,0.2)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 26 }}>👤</Text>
        </View>

        <Text style={{ color: "white", fontSize: 24, fontWeight: "800", textAlign: "center" }}>
          Welcome Back
        </Text>
        <Text style={{ color: "white", opacity: 0.9, textAlign: "center", marginTop: 6 }}>
          Sign in to your account
        </Text>
      </View>

      <View style={{ padding: 20, gap: 14 }}>
        <View>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Email or Phone</Text>
          <TextInput
            value={email}
            onChangeText={setemail}
            placeholder="Enter your email or phone"
            autoCapitalize="none"
            keyboardType="email-address"
            style={{
              borderWidth: 2,
              borderColor: "#e0e0e0",
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
            }}
          />
        </View>

        <View>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry
            style={{
              borderWidth: 2,
              borderColor: "#e0e0e0",
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
            }}
          />
        </View>

        <Pressable style={{ alignSelf: "flex-end" }}>
          <Text style={{ color: "#667eea", fontWeight: "600" }}>Forgot Password?</Text>
        </Pressable>

        <Pressable
          onPress={() => setRemember((v) => !v)}
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              borderWidth: 2,
              borderColor: remember ? "#667eea" : "#ccc",
              backgroundColor: remember ? "#667eea" : "transparent",
            }}
          />
          <Text style={{ color: "#666" }}>Remember me</Text>
        </Pressable>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={{
            backgroundColor: "#667eea",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 6,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>Sign In</Text>
          )}
        </Pressable>

        <Text style={{ textAlign: "center", color: "#999", marginTop: 6 }}>or</Text>

        <Text style={{ textAlign: "center", color: "#666" }}>
          Don’t have an account?{" "}
          <Text
            style={{ color: "#667eea", fontWeight: "800" }}
            onPress={() => router.push("/register")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}
