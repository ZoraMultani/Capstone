import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { getHistoryData, HistoryData, EventSeverity } from "@/api/history";

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f8f9fa",
        padding: 16,
        borderRadius: 14,
        alignItems: "center",
        gap: 8,
      }}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          backgroundColor: "#667eea",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 18 }}>✓</Text>
      </View>

      <Text style={{ fontSize: 26, fontWeight: "900", color: "#333" }}>
        {value}
      </Text>

      <Text style={{ fontSize: 13, color: "#666", textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function getSeverityColor(severity: EventSeverity) {
  if (severity === "Fall") return "#ff4757";
  if (severity === "Unstable") return "#ffa502";
  return "#26de81";
}

function getSeverityIcon(severity: EventSeverity) {
  if (severity === "Fall") return "⚠️";
  if (severity === "Unstable") return "🟠";
  return "✅";
}

function formatEventTime(isoString: string) {
  if (!isoString) return "Unknown time";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  const now = new Date();

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  const timeText = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (sameDay) return `Today at ${timeText}`;
  if (isYesterday) return `Yesterday at ${timeText}`;

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AverageStateCard({ state }: { state: EventSeverity }) {
  const color = getSeverityColor(state);

  return (
    <View
      style={{
        backgroundColor: "#f8f9fa",
        padding: 20,
        borderRadius: 16,
        marginBottom: 18,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "800", color: "#333" }}>
        Average State
      </Text>

      <View
        style={{
          marginTop: 14,
          paddingVertical: 10,
          paddingHorizontal: 22,
          borderRadius: 30,
          backgroundColor: color,
        }}
      >
        <Text style={{ color: "white", fontSize: 20, fontWeight: "900" }}>
          {state}
        </Text>
      </View>

      <Text
        style={{
          marginTop: 12,
          color: "#666",
          textAlign: "center",
          lineHeight: 20,
        }}
      >
        General fall status based on recent detected events
      </Text>
    </View>
  );
}

function EventRow({
  severity,
  time,
}: {
  severity: EventSeverity;
  time: string;
}) {
  const bg = getSeverityColor(severity);
  const icon = getSeverityIcon(severity);

  return (
    <View
      style={{
        backgroundColor: "#f8f9fa",
        padding: 14,
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: 50,
          height: 50,
          borderRadius: 12,
          backgroundColor: "white",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: "#eee",
        }}
      >
        <Text style={{ fontSize: 18 }}>{icon}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", color: "#333" }}>{severity}</Text>
        <Text style={{ color: "#666", marginTop: 2 }}>
          {formatEventTime(time)}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: bg,
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: 20,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900", fontSize: 12 }}>
          {severity}
        </Text>
      </View>
    </View>
  );
}

export default function HistoryScreen() {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistoryData = useCallback(async () => {
    try {
      const data = await getHistoryData();
      setHistoryData(data);
    } catch (error) {
      console.error("Failed to load history data:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        try {
          setLoading(true);
          const data = await getHistoryData();
          if (isActive) {
            setHistoryData(data);
          }
        } catch (error) {
          console.error("Failed to load history data:", error);
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      };

      run();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadHistoryData();
    } finally {
      setRefreshing(false);
    }
  }, [loadHistoryData]);

  if (loading && !historyData) {
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
        <Text style={{ marginTop: 12, color: "#666" }}>
          Loading fall history...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <View style={{ backgroundColor: "#667eea", padding: 20, paddingTop: 48 }}>
        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>
          Fall History
        </Text>
        <Text style={{ color: "white", opacity: 0.9, marginTop: 6 }}>
          Last 30 days overview
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
          <StatCard value={String(historyData?.totalFalls ?? 0)} label="Total Falls" />
          <StatCard
            value={String(historyData?.highRiskCount ?? 0)}
            label="High Risk"
          />
        </View>

        <AverageStateCard state={historyData?.averageState ?? "Stable"} />

        <Text
          style={{
            fontSize: 18,
            fontWeight: "900",
            color: "#333",
            marginBottom: 12,
          }}
        >
          Recent Events
        </Text>

        {(historyData?.events ?? []).length === 0 ? (
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 18,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#666", textAlign: "center" }}>
              No recent events found.
            </Text>
          </View>
        ) : (
          (historyData?.events ?? []).map((event) => (
            <EventRow
              key={event.id}
              severity={event.severity}
              time={event.time}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
