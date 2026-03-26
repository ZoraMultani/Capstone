import React, { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { NativeModules } from "react-native";

/**
 * Ensures a bundled asset is copied to a real writable path
 * required by onnxruntime-react-native.
 */
async function ensureLocalFile(moduleId, filename) {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();

  if (!asset.localUri) {
    throw new Error(`${filename} asset has no localUri`);
  }

  const dir = FileSystem.cacheDirectory + "onnx/";

  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const target = dir + filename;

  // Copy only if missing
  const fileInfo = await FileSystem.getInfoAsync(target);
  if (!fileInfo.exists) {
    await FileSystem.copyAsync({
      from: asset.localUri,
      to: target,
    });
  }

  return target;
}

export default function ModelTest() {
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Idle");
  const [outputInfo, setOutputInfo] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        console.log(
          "NativeModules.Onnxruntime:",
          NativeModules.Onnxruntime
        );

        if (!NativeModules.Onnxruntime) {
          throw new Error(
            "Onnxruntime native module is missing.\n" +
              "NativeModules.Onnxruntime is null.\n" +
              "Fix Gradle linking + rebuild dev client."
          );
        }

        setStatus("Preparing model files...");

        // Copy BOTH files (CRITICAL)
        const onnxPath = await ensureLocalFile(
          require("../assets/model/limu_mobile.onnx"),
          "limu_mobile.onnx"
        );

        await ensureLocalFile(
          require("../assets/model/limu_mobile.onnx.data"),
          "limu_mobile.onnx.data"
        );

        setStatus("Creating ORT session...");

        const ort = await import("onnxruntime-react-native");

        const s = await ort.InferenceSession.create(onnxPath);

        if (!mounted) return;

        setSession(s);
        setStatus("Model loaded ✅");
      } catch (e) {
        console.error("LOAD ERROR:", e);
        if (!mounted) return;
        setStatus(`Load failed ❌: ${String(e?.message || e)}`);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const run = async () => {
  if (!session) return;

  try {
    setStatus("Running inference...");

    const ort = await import("onnxruntime-react-native");

    const inputName = "imu";
    const inputShape = [1, 20, 6];

    const inputData = new Float32Array([
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
      -0.742491, -1.029451, 2.163046, -0.009593, 0.020989, -0.003816
    ]);
    // const inputData = new Float32Array([
    //   -2.251031115, 9.473334866, -1.703013075, 0.11362094,  -0.12950343,  0.08155051,
    //   -2.219257516, 9.46466946,  -1.755006266, 0.10598512,  -0.08582657,  0.051618114,
    //   -2.186869812, 9.455836572, -1.808004359, 0.111177474, -0.011301007, 0.024129177,
    //   -2.12099167,  9.441720084, -1.842405969, 0.12644911,   0.06994407,  0.01740966,
    //   -2.03396508,  9.424314421, -1.864162593, 0.14569137,   0.14049901,  0.027794369,
    //   -1.933435391, 9.411961022, -1.866853357, 0.17745635,   0.204029,    0.03176499,
    //   -1.818374392, 9.407167218, -1.842882336, 0.22235495,   0.24312437,  0.05009095,
    //   -1.7402094,   9.408540271, -1.802419979, 0.26419923,   0.25350907,  0.07544186,
    //   -1.711507317, 9.418107332, -1.740232082, 0.30695978,   0.23090707,  0.08368854,
    //   -1.717934903, 9.423578,    -1.702595229, 0.34330627,   0.20066923,  0.1001819,
    //   -1.760506419, 9.423578,    -1.698725095, 0.3735441,    0.17867808,  0.11178834,
    //   -1.808396166, 9.42315923,  -1.686300808, 0.3912592,    0.1731803,   0.11881329,
    //   -1.870872365, 9.419870942, -1.617248136, 0.38240165,   0.1853976,   0.1432479,
    //   -1.932569003, 9.416623685, -1.549057084, 0.3659083,    0.19333886,  0.14019357,
    //   -1.966792259, 9.426322104, -1.476732254, 0.36377025,   0.15302174,  0.13500121,
    //   -1.885959432, 9.490137459, -1.387390757, 0.35246924,   0.11178834,  0.124311075,
    //   -1.796011898, 9.560604869, -1.293323133, 0.34972036,   0.04795292,  0.10476339,
    //   -1.691212943, 9.630470857, -1.304071738, 0.33536503,  -0.005192355, 0.08552113,
    //   -1.57645717,  9.706974727, -1.315841555, 0.321926,    -0.03359759,  0.07269296,
    //   -1.462687902, 9.782820926, -1.327510192, 0.2959642,   -0.0580322,   0.07696902
    // ]);

    const feeds = {
      [inputName]: new ort.Tensor("float32", inputData, inputShape),
    };

    const results = await session.run(feeds);

    const keys = Object.keys(results);
    const first = results[keys[0]];

    setOutputInfo({
      keys,
      firstKey: keys[0],
      firstDims: first.dims,
      firstData: Array.from(first.data),
    });

    setStatus("Inference done ✅");
  } catch (e) {
    console.error("INFERENCE ERROR:", e);
    setStatus(`Inference failed ❌: ${String(e?.message || e)}`);
  }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 18, marginBottom: 8 }}>
        ONNX (React Native) Model Test
      </Text>

      <Text
        style={{
          marginBottom: 16,
          textAlign: "center",
        }}
      >
        {status}
      </Text>

      <Button
        title="Run Inference"
        onPress={run}
        disabled={!session}
      />

      {outputInfo ? (
        <Text
          style={{
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Outputs: {outputInfo.keys.join(", ")}
          {"\n"}
          First: {outputInfo.firstKey}
          {"\n"}
          Dims: {JSON.stringify(outputInfo.firstDims)}
          {"\n"}
          Data: {JSON.stringify(outputInfo.firstData)}
        </Text>
      ) : null}
    </View>
  );
}
