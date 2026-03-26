import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { registerUser, UserRole } from "@/api/auth";

export default function RegisterScreen() {
  const router = useRouter();

  const [role, setRole] = useState<UserRole>("elder");
  const [displayName, setdisplayName] = useState("");
  const [email, setemail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (
      !displayName.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      Alert.alert("Missing information", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    if (password.length < 8) {
        Alert.alert("Password must be at least 8 characters");
        return;
    }

    try {
      setLoading(true);

      const response = await registerUser({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role,
      });

      Alert.alert(
        "Account created",
        `${response.user.displayName} registered successfully as ${response.user.role}.`
      );

      router.replace("/settings");
    } catch (error: any) {
      Alert.alert("Registration failed", error?.message ?? "Unable to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "white" }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ backgroundColor: "#667eea", padding: 24, paddingTop: 52 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 14 }}>
          <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>← Back</Text>
        </Pressable>

        <View
          style={{
            alignSelf: "center",
            width: 68,
            height: 68,
            borderRadius: 18,
            backgroundColor: "rgba(255,255,255,0.2)",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 28 }}>📝</Text>
        </View>

        <Text style={{ color: "white", fontSize: 26, fontWeight: "800", textAlign: "center" }}>
          Create Account
        </Text>
        <Text style={{ color: "white", opacity: 0.92, textAlign: "center", marginTop: 6 }}>
          Register as an elderly user or caretaker
        </Text>
      </View>

      <View style={{ padding: 20, gap: 14 }}>
        <View>
          <Text style={{ fontWeight: "700", marginBottom: 10 }}>Select Role</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={() => setRole("elder")}
              style={{
                flex: 1,
                backgroundColor: role === "elder" ? "#667eea" : "#f2f4f8",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: role === "elder" ? "white" : "#333",
                  fontWeight: "800",
                }}
              >
                Elderly
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setRole("caregiver")}
              style={{
                flex: 1,
                backgroundColor: role === "caregiver" ? "#667eea" : "#f2f4f8",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: role === "caregiver" ? "white" : "#333",
                  fontWeight: "800",
                }}
              >
                Caretaker
              </Text>
            </Pressable>
          </View>
        </View>

        <View>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Full Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setdisplayName}
            placeholder="Enter your full name"
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
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Email or Phone</Text>
          <TextInput
            value={email}
            onChangeText={setemail}
            placeholder="Enter your email or phone"
            autoCapitalize="none"
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
            placeholder="Create a password"
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

        <View>
          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Confirm Password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
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

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          style={{
            backgroundColor: "#667eea",
            paddingVertical: 16,
            borderRadius: 12,
            alignItems: "center",
            marginTop: 10,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
              Create Account
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
