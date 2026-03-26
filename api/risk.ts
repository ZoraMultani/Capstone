/**
 * api/risk.ts
 *
 * Provides getRiskAssessment(), which optionally runs the ONNX model when a
 * live session is passed in. Falls back to mock data gracefully so the UI
 * always has something to display.
 *
 * The session is created once in useOnnxSession and passed here — this file
 * never loads or manages the model itself.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RiskFactor = {
  title: string;
  subtitle: string;
  pct: number;
};

export type RiskAssessmentData = {
  overallScore: number;
  riskLevel: string;
  lastAssessment: string;
  previousScore: string;
  currentState: string;
  factors: RiskFactor[];
};

// ─── Mock / fallback data ─────────────────────────────────────────────────────

const MOCK_DATA: RiskAssessmentData = {
  overallScore: 0,
  riskLevel: "Low Risk",
  lastAssessment: "Not available",
  previousScore: "First assessment",
  currentState: "Stable",
  factors: [
    {
      title: "Instability",
      subtitle: "Recent unstable movement detected",
      pct: 0,
    },
    {
      title: "Fall Events",
      subtitle: "Detected fall-related events",
      pct: 0,
    },
    {
      title: "Stability",
      subtitle: "Higher stable activity lowers risk",
      pct: 100,
    },
  ],
};

// ─── Model input helpers ──────────────────────────────────────────────────────

/**
 * Returns a Float32Array of shape [1, 20, 6] to feed to the model.
 *
 * Replace this with real sensor data once your sensor pipeline is ready.
 * The values below are the same stable-standing sample used in ModelTest.js.
 */
function buildModelInput(): Float32Array {
  return new Float32Array([
    -0.750755, -1.026891, 2.161671, -0.003056, 0.022895, -0.005043,
    -0.738766, -1.022814, 2.175250, -0.008763, 0.019746, -0.001094,
    -0.742883, -1.026304, 2.161242, -0.014975, 0.017244, -0.003885,
    -0.744676, -1.030707, 2.153256, -0.013717, 0.023032, -0.007396,
    -0.732886, -1.032778, 2.162596, -0.006454, 0.023755, -0.005211,
    -0.731889, -1.028831, 2.162249, -0.003189, 0.022939, -0.003797,
    -0.743141, -1.030694, 2.161605, -0.007155, 0.020624, -0.002177,
    -0.739946, -1.029205, 2.173649, -0.009946, 0.020078, -0.003872,
    -0.744942, -1.027911, 2.167660, -0.009610, 0.022359, -0.004344,
    -0.737755, -1.032402, 2.166634, -0.010737, 0.018298, -0.006883,
    -0.748756, -1.029311, 2.161221, -0.010690, 0.021495, -0.001534,
    -0.748095, -1.029469, 2.165248, -0.008446, 0.019930, -0.001449,
    -0.746384, -1.029609, 2.159134, -0.006729, 0.021307, -0.001542,
    -0.740684, -1.027660, 2.157528, -0.010889, 0.018210, -0.002728,
    -0.735935, -1.031971, 2.165108, -0.007961, 0.019213, -0.005130,
    -0.744902, -1.027310, 2.163696, -0.009610, 0.022462, -0.004122,
    -0.741607, -1.034096, 2.158785, -0.010617, 0.021242, -0.003393,
    -0.742121, -1.031168, 2.162559, -0.008490, 0.020564, -0.003146,
    -0.745996, -1.028363, 2.161157, -0.007929, 0.021283, -0.003313,
    -0.742491, -1.029451, 2.163046, -0.009593, 0.020989, -0.003816,
  ]);
}

// ─── Inference → RiskAssessmentData ──────────────────────────────────────────

/**
 * Converts raw model output logits into a human-readable RiskAssessmentData.
 *
 * The model outputs probabilities for three classes:
 *   index 0 → Stable
 *   index 1 → Unstable
 *   index 2 → Fall
 *
 * Adjust class indices/labels to match your actual model's output spec.
 */
function interpretModelOutput(outputData: number[]): RiskAssessmentData {
  // Softmax (model may already do this, but it's safe to normalise again)
  const exp = outputData.map((v) => Math.exp(v));
  const sum = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map((v) => v / sum);

  const stablePct = Math.round((probs[0] ?? 0) * 100);
  const unstablePct = Math.round((probs[1] ?? 0) * 100);
  const fallPct = Math.round((probs[2] ?? 0) * 100);

  // Overall risk score: weighted sum favouring fall > unstable
  const overallScore = Math.round(fallPct * 0.7 + unstablePct * 0.3);

  const riskLevel =
    fallPct >= 50
      ? "High Risk"
      : unstablePct >= 40
      ? "Moderate Risk"
      : "Low Risk";

  const currentState =
    fallPct >= 50 ? "Fall" : unstablePct >= 40 ? "Unstable" : "Stable";

  const now = new Date();
  const lastAssessment = now.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    overallScore,
    riskLevel,
    lastAssessment,
    previousScore: "—",
    currentState,
    factors: [
      {
        title: "Fall Probability",
        subtitle: "Likelihood of a fall event based on movement",
        pct: fallPct,
      },
      {
        title: "Instability",
        subtitle: "Degree of detected unstable motion",
        pct: unstablePct,
      },
      {
        title: "Stability",
        subtitle: "Higher stable activity lowers overall risk",
        pct: stablePct,
      },
    ],
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * getRiskAssessment(session?)
 *
 * - Pass a live ORT InferenceSession to get real model output.
 * - Pass null / undefined to get mock/fallback data (e.g. while model loads).
 */
export async function getRiskAssessment(
  session?: any | null
): Promise<RiskAssessmentData> {
  if (!session) {
    return MOCK_DATA;
  }

  try {
    const ort = await import("onnxruntime-react-native");

    const inputData = buildModelInput();
    const feeds = {
      imu: new ort.Tensor("float32", inputData, [1, 20, 6]),
    };

    const results = await session.run(feeds);

    // Grab the first output tensor — adjust key if your model uses a named output
    const outputKey = Object.keys(results)[0];
    const outputData: number[] = Array.from(results[outputKey].data as Float32Array);

    return interpretModelOutput(outputData);
  } catch (e) {
    console.error("[getRiskAssessment] Inference failed, using mock data:", e);
    return MOCK_DATA;
  }
}
