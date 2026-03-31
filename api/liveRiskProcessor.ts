import { createAlert } from "@/api/alerts";
import { postHistoryData } from "@/api/history";
import {
  getPredictedState,
  getRiskProbabilities,
  mapProbabilitiesToHistorySample,
  type HistorySample,
} from "@/api/risk";

const HISTORY_BATCH_SIZE = 10;

let historyBuffer: HistorySample[] = [];
let isPostingHistory = false;

export function getHistoryBufferCount() {
  return historyBuffer.length;
}

export function clearHistoryBuffer() {
  historyBuffer = [];
}

export async function processLiveModelOutput(outputData: number[]) {
  try {
    const predictedState = getPredictedState(outputData);
    const probabilities = getRiskProbabilities(outputData);
    const historySample = mapProbabilitiesToHistorySample(probabilities);

    // 1) Immediate alert on Fall
    if (predictedState === "Fall") {
      await createAlert({
        severity: "high",
        message: "Fall detected by AI model.",
        metaJson: JSON.stringify({
          predictedState,
          probabilities,
          detectedAt: new Date().toISOString(),
        }),
      });
    }

    // 2) Accumulate for history
    historyBuffer.push(historySample);

    // 3) Flush at 10 samples
    if (historyBuffer.length >= HISTORY_BATCH_SIZE && !isPostingHistory) {
      isPostingHistory = true;

      const payload = {
        data: [...historyBuffer],
        datetime: new Date().toISOString(),
      };

      try {
        await postHistoryData(payload);
        historyBuffer = [];
      } finally {
        isPostingHistory = false;
      }
    }
  } catch (error) {
    console.error("[liveRiskProcessor] Failed to process live model output:", error);
  }
}