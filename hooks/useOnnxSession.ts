import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { useEffect, useState } from "react";
import { NativeModules } from "react-native";

// ─── Asset refs at module level so Metro registers them at bundle time ────────
const ONNX_MODEL_FILE_NAME = "limu_final_V2_L1_noise_mobile.onnx";
const ONNX_DATA_FILE_NAME = "limu_final_V2_L1_noise_mobile.onnx.data"
const ONNX_MODEL_FILE_PATH = `../assets/model/${ONNX_MODEL_FILE_NAME}`;
const ONNX_DATA_FILE_PATH = `../assets/model/${ONNX_DATA_FILE_NAME}`;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ONNX_MODEL = require(ONNX_MODEL_FILE_PATH);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ONNX_DATA  = require(ONNX_DATA_FILE_PATH);

// ─── Singleton state ──────────────────────────────────────────────────────────

type SessionStatus = "idle" | "loading" | "ready" | "error";

let _session: any = null;
let _status: SessionStatus = "idle";
let _error: string | null = null;
let _loadPromise: Promise<void> | null = null;

const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((fn) => fn());
}

// ─── File helper ──────────────────────────────────────────────────────────────

async function ensureLocalFile(moduleId: number, filename: string): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error(`Asset ${filename} has no localUri after download`);
  }

  const dir = FileSystem.cacheDirectory + "onnx/";
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const target = dir + filename;
  const fileInfo = await FileSystem.getInfoAsync(target);
  if (!fileInfo.exists) {
    await FileSystem.copyAsync({ from: asset.localUri, to: target });
  }

  return target;
}

// ─── Core loader ──────────────────────────────────────────────────────────────

async function loadSession(): Promise<void> {
  _status = "loading";
  _error = null;
  notifyListeners();

  try {
    if (!NativeModules.Onnxruntime) {
      throw new Error("Onnxruntime native module not linked — rebuild dev client.");
    }

    const onnxPath = await ensureLocalFile(ONNX_MODEL, ONNX_MODEL_FILE_NAME);
    await ensureLocalFile(ONNX_DATA, ONNX_DATA_FILE_NAME);

    const ort = await import("onnxruntime-react-native");
    _session = await ort.InferenceSession.create(onnxPath);
    console.log({
      "loaded model": ONNX_DATA_FILE_NAME,
      "loaded data": ONNX_MODEL_FILE_NAME
    });
    _status = "ready";
  } catch (e: any) {
    console.error("[useOnnxSession] load failed:", e);
    _status = "error";
    _error = e?.message ?? String(e);
  }

  notifyListeners();
}

// ─── Public loader (callable outside the hook) ───────────────────────────────

export function ensureSessionLoaded() {
  if (_status === "idle") {
    _loadPromise = loadSession();
  }
  return _loadPromise;
}

export async function getOnnxSessionAsync() {
  // If it's already loaded, return immediately
  if (_status === "ready") {
    return _session;
  }

  // If it failed previously, throw the error
  if (_status === "error") {
    throw new Error(`Cannot retrieve ONNX session. Previous load failed: ${_error}`);
  }

  // If it's currently idle or loading, ensure the load is triggered and wait for it
  const loadReq = ensureSessionLoaded();
  if (loadReq) {
    await loadReq;
  }

  // Check status one more time after waiting
  if (_status === "ready") {
    return _session;
  } else {
    throw new Error(`ONNX session failed to load. Current status: ${_status}`);
  }
}

// ─── The hook ─────────────────────────────────────────────────────────────────

export function useOnnxSession() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const listener = () => rerender((n) => n + 1);
    _listeners.add(listener);

    if (_status === "idle") {
      // First ever mount — kick off the load
      _loadPromise = loadSession();
    } else if (_status === "ready" || _status === "error") {
      // Session already resolved before this component mounted
      // (navigating to tab after model loaded, or Fast Refresh re-mount).
      // Notify immediately so the component receives the current state.
      rerender((n) => n + 1);
    }
    // If "loading": loadSession() will call notifyListeners() when done,
    // which triggers this listener automatically.

    return () => {
      _listeners.delete(listener);
    };
  }, []);

  return {
    session: _session as any | null,
    status: _status,
    error: _error,
  };
}