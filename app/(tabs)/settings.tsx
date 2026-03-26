import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { getProfile, updateProfile, logoutUser, AuthUser } from "@/api/auth";
import { getCareLinks, linkByCode, LinkedPerson } from "@/api/linking";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ color: "#666", marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: "#222", fontWeight: "700", fontSize: 15 }}>
        {value}
      </Text>
    </View>
  );
}

function ToastBanner({
  message,
  type,
}: {
  message: string;
  type: "success" | "error" | "";
}) {
  if (!message || !type) return null;

  return (
    <View
      style={{
        position: "absolute",
        top: 96,
        left: 20,
        right: 20,
        backgroundColor: type === "success" ? "#26de81" : "#ff4757",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        zIndex: 1000,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
      }}
    >
      <Text
        style={{
          color: "white",
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [myCode, setMyCode] = useState("");
  const [linkedPeople, setLinkedPeople] = useState<LinkedPerson[]>([]);
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkSuccessMessage, setLinkSuccessMessage] = useState("");

  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "">("");

  useEffect(() => {
    const loadAll = async () => {
      try {
        const user = await getProfile();
        setProfile(user);
        setDisplayName(user.displayName);
        setEmergencyContact(user.emergencyContact ?? "");

        const links = await getCareLinks();
        setMyCode(links.code ?? "");
        setLinkedPeople(Array.isArray(links.linked) ? links.linked : []);
      } catch (error) {
        console.error("Failed to load settings data:", error);
        setToastMessage("Failed to load settings.");
        setToastType("error");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, []);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      setToastMessage("");
      setToastType("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleSave = async () => {
    try {
      setSaving(true);

      const updated = await updateProfile({
        displayName: displayName.trim(),
        emergencyContact: emergencyContact.trim(),
      });

      setProfile(updated);
      setToastMessage("Profile updated successfully.");
      setToastType("success");
    } catch (error: any) {
      setToastMessage(error?.message ?? "Unable to update profile.");
      setToastType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleLinkCaregiver = async () => {
    if (!linkCodeInput.trim()) {
      setToastMessage("Please enter a caretaker code.");
      setToastType("error");
      return;
    }

    try {
      setLinking(true);

      const result = await linkByCode(linkCodeInput.trim());
      const normalizedStatus = result.status?.trim().toLowerCase();

      const isSuccess =
        normalizedStatus === "linked" ||
        normalizedStatus === "success" ||
        normalizedStatus === "successful" ||
        normalizedStatus?.includes("success");

      if (!isSuccess) {
        setToastMessage(result.status || "Unable to link caretaker.");
        setToastType("error");
        return;
      }

      const msg = `Caretaker linked successfully!}`;
      setLinkSuccessMessage(msg);
      setToastMessage(msg);
      setToastType("success");

      const links = await getCareLinks();
      setMyCode(links.code ?? "");
      setLinkedPeople(Array.isArray(links.linked) ? links.linked : []);
      setLinkCodeInput("");
    } catch (error: any) {
      setToastMessage(error?.message ?? "Unable to link caretaker.");
      setToastType("error");
    } finally {
      setLinking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace("/login");
    } catch (error: any) {
      setToastMessage(error?.message ?? "Unable to log out.");
      setToastType("error");
    }
  };

  if (loading || !profile) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "white",
        }}
      >
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={{ marginTop: 12, color: "#666" }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ backgroundColor: "#667eea", padding: 20, paddingTop: 48 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>
          Account Settings
        </Text>
        <Text style={{ color: "white", opacity: 0.9, marginTop: 6 }}>
          Manage your profile and preferences
        </Text>
      </View>

      <ToastBanner message={toastMessage} type={toastType} />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View
          style={{
            backgroundColor: "#f8f9fa",
            padding: 18,
            borderRadius: 16,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: "#333",
              marginBottom: 14,
            }}
          >
            Profile
          </Text>

          <InfoRow label="Email" value={profile.email} />
          <InfoRow
            label="Role"
            value={profile.role === "elder" ? "Elderly User" : "Caretaker"}
          />
        </View>

        <View
          style={{
            backgroundColor: "#f8f9fa",
            padding: 18,
            borderRadius: 16,
            marginBottom: 18,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: "#333",
              marginBottom: 14,
            }}
          >
            Editable Details
          </Text>

          <Text style={{ fontWeight: "700", marginBottom: 6 }}>Full Name</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter full name"
            style={{
              borderWidth: 2,
              borderColor: "#e0e0e0",
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              backgroundColor: "white",
              marginBottom: 14,
            }}
          />

          <Text style={{ fontWeight: "700", marginBottom: 6 }}>
            Emergency Contact
          </Text>
          <TextInput
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            placeholder="Enter emergency contact"
            style={{
              borderWidth: 2,
              borderColor: "#e0e0e0",
              borderRadius: 12,
              padding: 14,
              fontSize: 16,
              backgroundColor: "white",
            }}
          />

          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: "#667eea",
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 16,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                Save Changes
              </Text>
            )}
          </Pressable>
        </View>

        {profile.role === "caregiver" && (
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 18,
              borderRadius: 16,
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#333",
                marginBottom: 14,
              }}
            >
              My Caregiver Code
            </Text>

            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 14,
                borderWidth: 2,
                borderColor: "#e0e0e0",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "900", color: "#667eea" }}>
                {myCode || "No code available"}
              </Text>
            </View>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "800",
                color: "#333",
                marginBottom: 10,
              }}
            >
              Linked Patients
            </Text>

            {linkedPeople.length === 0 ? (
              <Text style={{ color: "#666" }}>No linked patients yet.</Text>
            ) : (
              linkedPeople.map((person, index) => (
                <View
                  key={`${person.userId}-${index}`}
                  style={{
                    backgroundColor: "white",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#eaeaea",
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ fontWeight: "800", color: "#333" }}>
                    {person.displayName}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {profile.role === "elder" && (
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 18,
              borderRadius: 16,
              marginBottom: 18,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#333",
                marginBottom: 14,
              }}
            >
              Caretaker Link
            </Text>

            <Text style={{ fontWeight: "700", marginBottom: 6 }}>
              Enter Caretaker Code
            </Text>
            <TextInput
              value={linkCodeInput}
              onChangeText={setLinkCodeInput}
              placeholder="Enter caretaker code"
              style={{
                borderWidth: 2,
                borderColor: "#e0e0e0",
                borderRadius: 12,
                padding: 14,
                fontSize: 16,
                backgroundColor: "white",
                marginBottom: 14,
              }}
            />

            <Pressable
              onPress={handleLinkCaregiver}
              disabled={linking}
              style={{
                backgroundColor: "#667eea",
                paddingVertical: 15,
                borderRadius: 12,
                alignItems: "center",
                opacity: linking ? 0.7 : 1,
              }}
            >
              {linking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
                  Link Caretaker
                </Text>
              )}
            </Pressable>

            {!!linkSuccessMessage && (
              <Text
                style={{
                  marginTop: 12,
                  color: "#26a65b",
                  fontWeight: "700",
                }}
              >
                {linkSuccessMessage}
              </Text>
            )}

            {linkedPeople.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#333",
                    marginBottom: 10,
                  }}
                >
                  Linked Caretaker
                </Text>

                {linkedPeople.map((person, index) => (
                  <View
                    key={`${person.userId}-${index}`}
                    style={{
                      backgroundColor: "white",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#eaeaea",
                      marginBottom: 10,
                    }}
                  >
                    <Text style={{ fontWeight: "800", color: "#333" }}>
                      {person.displayName}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View
          style={{
            backgroundColor: "#fff4f4",
            padding: 18,
            borderRadius: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "900",
              color: "#333",
              marginBottom: 12,
            }}
          >
            Session
          </Text>

          <Pressable
            onPress={handleLogout}
            style={{
              backgroundColor: "#ff4757",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 16 }}>
              Log Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
