/**
 * app/(tabs)/risk.tsx
 *
 * Risk Assessment screen.
 *
 * Architecture:
 *  - useOnnxSession()    → singleton hook, model loads once for the whole app
 *  - getRiskAssessment() → runs inference when session is ready, mock otherwise
 *  - useFocusEffect      → re-runs inference each time the tab is focused
 *
 * The model is NEVER re-loaded on refresh — only inference is re-run.
 */

import { processLiveModelOutput } from "@/api/liveRiskProcessor";
import { getRiskAssessment, interpretModelOutput, RiskAssessmentData, RiskFactor } from "@/api/risk";
import { useOnnxSession } from "@/hooks/useOnnxSession";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

// ─── Colour helpers ───────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 70) return "#ff4757";
  if (score >= 40) return "#ffa502";
  return "#26de81";
}

function factorColor(pct: number) {
  if (pct >= 70) return "#ff4757";
  if (pct >= 40) return "#ffa502";
  return "#26de81";
}

function stateColor(state: string) {
  if (state === "Fall") return "#ff4757";
  if (state === "Unstable") return "#ffa502";
  return "#26de81";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModelStatusBadge({ status, error }: { status: string; error: string | null }) {
  if (status === "ready") return null; // no badge when all is well

  const configs: Record<string, { bg: string; text: string; label: string }> = {
    idle:    { bg: "#e9ecef", text: "#555",    label: "Model initialising…" },
    loading: { bg: "#e8f4fd", text: "#1565c0", label: "Loading AI model…" },
    error:   { bg: "#fff5f5", text: "#b42318", label: `Model unavailable — showing estimates` },
  };

  const cfg = configs[status] ?? configs.idle;

  return (
    <View
      style={{
        backgroundColor: cfg.bg,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginBottom: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {status === "loading" && (
        <ActivityIndicator size="small" color={cfg.text} />
      )}
      <Text style={{ color: cfg.text, fontSize: 13, fontWeight: "600", flex: 1 }}>
        {cfg.label}
      </Text>
    </View>
  );
}

function ScoreCard({ data }: { data: RiskAssessmentData }) {
  const color = scoreColor(data.overallScore);

  return (
    <View
      style={{
        backgroundColor: "#f8f9fa",
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#eef1f4",
      }}
    >
      {/* Score row */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: "#666", fontSize: 13, marginBottom: 4 }}>
            Overall Risk Score
          </Text>
          <Text style={{ fontSize: 42, fontWeight: "900", color }}>
            {data.overallScore}
          </Text>
        </View>

        {/* Current state pill */}
        <View
          style={{
            backgroundColor: stateColor(data.currentState),
            paddingVertical: 8,
            paddingHorizontal: 18,
            borderRadius: 30,
          }}
        >
          <Text style={{ color: "white", fontWeight: "900", fontSize: 15 }}>
            {data.currentState}
          </Text>
        </View>
      </View>

      <View style={{ marginTop: 14, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#222" }}>
          {data.riskLevel}
        </Text>
        <Text style={{ color: "#666", fontSize: 13 }}>
          Last assessment: {data.lastAssessment}
        </Text>
        <Text style={{ color: "#666", fontSize: 13 }}>
          Previous score: {data.previousScore}
        </Text>
      </View>
    </View>
  );
}

function RiskFactorCard({ title, subtitle, pct }: RiskFactor) {
  const color = factorColor(pct);

  return (
    <View
      style={{
        backgroundColor: "#f8f9fa",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#eef1f4",
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#222", flex: 1 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: "900", color }}>
          {pct}%
        </Text>
      </View>

      <Text style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
        {subtitle}
      </Text>

      {/* Progress bar */}
      <View
        style={{
          marginTop: 10,
          height: 8,
          backgroundColor: "#e9ecef",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RiskScreen() {
  const { session, status: modelStatus, error: modelError } = useOnnxSession();

  const [data, setData] = useState<RiskAssessmentData | null>(null);
  const [inferenceLoading, setInferenceLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Track whether this screen is currently focused so the session-ready
  // effect below only fires inference when the user is actually on this tab.
  const isFocused = useRef(false);

  /**
   * Core inference runner — always uses the current session value.
   * Passing `withLoadingSpinner` shows the full-screen spinner on first run.
   */
  const runInference = useCallback(
    async (withLoadingSpinner = false) => {
      if (withLoadingSpinner) setInferenceLoading(true);
      try {
        const result = await getRiskAssessment(session);
        setData(result);
      } catch (e) {
        console.error("[RiskScreen] getRiskAssessment error:", e);
      } finally {
        if (withLoadingSpinner) setInferenceLoading(false);
      }
    },
    [session]
  );

  // 1️⃣  Run inference each time the tab is focused.
  //     Uses `isFocused` ref so the session-ready effect below
  //     knows whether it should also fire.
  useFocusEffect(
    useCallback(() => {
      isFocused.current = true;
      runInference(true);

      return () => {
        isFocused.current = false;
      };
    }, [runInference])
  );

  // 2️⃣  Re-run inference when the session transitions to ready WHILE the
  //     tab is already focused (the common case on first load).
  //     This is the fix for the timing race: useFocusEffect won't re-fire
  //     mid-focus when a dependency changes, so we need a separate useEffect.
  useEffect(() => {
    if (session && isFocused.current) {
      runInference(false); // data already showing, no need for full spinner
    }
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ intentionally omitting runInference — we only want this to fire when
  //   session itself changes (null → InferenceSession), not on every render.

  // 3️⃣  Live Inference Background Listener (Proof of Concept)
  //     Listens for emitted ONNX results from the BLE background service
  //     and reactively updates the screen without triggering loading spinners.
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'onNewIMUSequence', // Ensure this string matches your bleForegroundService emit!
      (predictionResults: number[]) => {
        try {
          console.log("[RiskScreen] Live background inference received!");
          
          // Format the raw number array into the RiskAssessmentData object
          const liveAssessment = interpretModelOutput(predictionResults);

          // Run background app logic
          void processLiveModelOutput(predictionResults).then(
            ()=> {
              console.log("test");
            }
          );
          
          // Push it directly to the UI state
          setData(liveAssessment);
          
        } catch (error) {
          console.error("[RiskScreen] Failed to process live inference:", error);
        }
      }
    );

    // Clean up the listener when the component unmounts
    return () => {
      subscription.remove();
    };
  }, []);



  // Pull-to-refresh — only re-runs inference, model is not reloaded
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await runInference(false);
    setRefreshing(false);
  }, [runInference]);

  // ── Loading state (first paint) ────────────────────────────────────────────
  if (inferenceLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: "white" }}>
        {/* Header */}
        <View style={{ backgroundColor: "#667eea", padding: 20, paddingTop: 48 }}>
          <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>
            Risk Assessment
          </Text>
          <Text style={{ color: "white", opacity: 0.9, marginTop: 6 }}>
            AI-powered fall risk analysis
          </Text>
        </View>

        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={{ marginTop: 12, color: "#666" }}>
            {modelStatus === "loading"
              ? "Loading AI model…"
              : "Running risk assessment…"}
          </Text>
        </View>
      </View>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#667eea",
          padding: 20,
          paddingTop: 48,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <View>
          <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }}>
            Risk Assessment
          </Text>
          <Text style={{ color: "white", opacity: 0.9, marginTop: 6 }}>
            AI-powered fall risk analysis
          </Text>
        </View>

        <Pressable
          onPress={onRefresh}
          disabled={refreshing || inferenceLoading}
          style={{
            backgroundColor: "rgba(255,255,255,0.2)",
            paddingVertical: 8,
            paddingHorizontal: 14,
            borderRadius: 12,
            opacity: refreshing ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 13 }}>
            {refreshing ? "Running…" : "Re-run"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Model status banner (hidden when model is ready) */}
        <ModelStatusBadge status={modelStatus} error={modelError} />

        {data ? (
          <>
            <ScoreCard data={data} />

            <Text
              style={{
                fontSize: 18,
                fontWeight: "900",
                color: "#333",
                marginBottom: 12,
              }}
            >
              Risk Factors
            </Text>

            {data.factors.map((factor, i) => (
              <RiskFactorCard key={`${factor.title}-${i}`} {...factor} />
            ))}
          </>
        ) : (
          <View
            style={{
              backgroundColor: "#f8f9fa",
              padding: 20,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#666", textAlign: "center" }}>
              No assessment data available. Pull down to retry.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
