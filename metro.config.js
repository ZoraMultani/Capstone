const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// 🚫 Block onnxruntime-web completely
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /node_modules\/onnxruntime-web\/.*/,
];

// ✅ Tell Metro to treat .onnx and .data as assets
config.resolver.assetExts = [
  ...config.resolver.assetExts,
  "onnx",
  "data",
];

module.exports = config;
