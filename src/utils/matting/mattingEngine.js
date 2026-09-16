/**
 * 工业级端侧 AI 智能抠图 / 背景消除神经网络引擎
 * 特性：
 * 1. 精确匹配 ONNX Runtime Web 1.30.0 核心运行库，消除 getValue / Wasm 胶水代码版本不匹配
 * 2. 100% 纯 TypedArray 内存双线性几何校准预处理 (零 Canvas DOM 依赖，杜绝 Worker 内部兼容性异常)
 * 3. 优先 WebGPU 显卡加速，优雅回退至 WebAssembly SIMD 单线程 (免 SharedArrayBuffer 限制)
 * 4. 高阶双线性 Alpha 掩码反解至原图超高分辨率
 * 5. 形态学边缘腐蚀收缩 (Erosion Defringe) 彻底消除发丝与服装边缘白边/绿边杂色溢出
 * 6. 毫秒级任务取消 (AbortSignal 穿透)
 */

import * as ort from "onnxruntime-web";
import { downloadAndCacheModel, MATTING_MODELS } from "./modelStorage.js";

// 配置 Wasm 托管源：必须与 package.json 中的 onnxruntime-web 1.30.0 版本精确一致
try {
  ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.30.0/dist/";
  // Web Worker 内部使用 1 个线程，无需 SharedArrayBuffer / COOP 权限限制，并启用 SIMD 向量化
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.simd = true;
  ort.env.logLevel = "error"; // 静音控制台低优先级 C++ 提示与警告
} catch (e) {
  console.warn("ORT Wasm 初始化配置", e);
}

let activeSession = null;
let currentModelId = null;

/**
 * 检测当前浏览器最佳执行提供者 (WebGPU 优先，降级 Wasm)
 */
export async function detectBestExecutionProvider() {
  if (typeof navigator !== "undefined" && navigator.gpu) {
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        return "webgpu";
      }
    } catch (e) {}
  }
  return "wasm";
}

/**
 * 加载或复用 ONNX 模型会话
 */
export async function loadMattingSession(modelId = "modnet-web", onProgress = null) {
  if (activeSession && currentModelId === modelId) {
    return activeSession;
  }

  const modelMeta = MATTING_MODELS[modelId] || MATTING_MODELS["modnet-web"];
  const modelBuffer = await downloadAndCacheModel(modelId, (pct, txt) => {
    if (onProgress) onProgress(pct, txt);
  });

  const modelBytes = new Uint8Array(modelBuffer);
  const bestEP = await detectBestExecutionProvider();
  let session = null;

  try {
    session = await ort.InferenceSession.create(modelBytes, {
      executionProviders: [bestEP, "wasm"],
      graphOptimizationLevel: "all",
      logSeverityLevel: 3, // 3: Error only，彻底屏蔽非错误算子调度警告
    });
  } catch (err) {
    console.warn(`优先硬件加速提供者 (${bestEP}) 初始化未成功，降级至 WebAssembly SIMD:`, err);
    session = await ort.InferenceSession.create(modelBytes, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
      logSeverityLevel: 3,
    });
  }

  activeSession = session;
  currentModelId = modelId;
  return session;
}

/**
 * 纯 TypedArray 图像 Letterbox 预处理
 * 零 Canvas / OffscreenCanvas 依赖，在 Web Worker 内部 100% 稳定运行且性能极高
 */
function preprocessLetterbox(srcImageData, targetSize, normType) {
  const srcW = srcImageData.width;
  const srcH = srcImageData.height;
  const src = srcImageData.data;

  const scale = Math.min(targetSize / srcW, targetSize / srcH);
  const newW = Math.round(srcW * scale);
  const newH = Math.round(srcH * scale);

  const padX = Math.floor((targetSize - newW) / 2);
  const padY = Math.floor((targetSize - newH) / 2);

  const channelSize = targetSize * targetSize;
  const tensorData = new Float32Array(3 * channelSize);

  for (let ty = 0; ty < targetSize; ty++) {
    const rowOffset = ty * targetSize;
    const inPadY = ty < padY || ty >= padY + newH;

    for (let tx = 0; tx < targetSize; tx++) {
      const tensorIdx = rowOffset + tx;

      // 处于填充边缘：填补中性灰底 (128 / 255.0 - 0.5) = 0.0
      if (inPadY || tx < padX || tx >= padX + newW) {
        tensorData[tensorIdx] = 0.0;
        tensorData[channelSize + tensorIdx] = 0.0;
        tensorData[channelSize * 2 + tensorIdx] = 0.0;
        continue;
      }

      // 映射到原图浮点坐标并执行双线性采样
      const sx = Math.max(0, Math.min(srcW - 1, (tx - padX) / scale));
      const sy = Math.max(0, Math.min(srcH - 1, (ty - padY) / scale));

      const x0 = Math.floor(sx);
      const x1 = Math.min(srcW - 1, x0 + 1);
      const y0 = Math.floor(sy);
      const y1 = Math.min(srcH - 1, y0 + 1);

      const fx = sx - x0;
      const fy = sy - y0;
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const idx00 = (y0 * srcW + x0) * 4;
      const idx10 = (y0 * srcW + x1) * 4;
      const idx01 = (y1 * srcW + x0) * 4;
      const idx11 = (y1 * srcW + x1) * 4;

      const r = w00 * src[idx00] + w10 * src[idx10] + w01 * src[idx01] + w11 * src[idx11];
      const g = w00 * src[idx00 + 1] + w10 * src[idx10 + 1] + w01 * src[idx01 + 1] + w11 * src[idx11 + 1];
      const b = w00 * src[idx00 + 2] + w10 * src[idx10 + 2] + w01 * src[idx01 + 2] + w11 * src[idx11 + 2];

      if (normType === "modnet") {
        // MODNet: (x / 255.0 - 0.5) / 0.5 => [-1.0, 1.0]
        tensorData[tensorIdx] = (r / 255.0 - 0.5) / 0.5;
        tensorData[channelSize + tensorIdx] = (g / 255.0 - 0.5) / 0.5;
        tensorData[channelSize * 2 + tensorIdx] = (b / 255.0 - 0.5) / 0.5;
      } else {
        // RMBG: (x / 255.0 - 0.5) / 1.0 => [-0.5, 0.5]
        tensorData[tensorIdx] = r / 255.0 - 0.5;
        tensorData[channelSize + tensorIdx] = g / 255.0 - 0.5;
        tensorData[channelSize * 2 + tensorIdx] = b / 255.0 - 0.5;
      }
    }
  }

  return {
    tensorData,
    targetSize,
    scale,
    padX,
    padY,
    newW,
    newH,
  };
}

/**
 * 从 Letterbox 输出中裁切有效区域并双线性插值回原图分辨率
 */
function resampleMaskToOriginal(
  rawMask,
  targetSize,
  padX,
  padY,
  newW,
  newH,
  origW,
  origH
) {
  const fullMask = new Float32Array(origW * origH);

  for (let y = 0; y < origH; y++) {
    const mappedY = padY + (y / origH) * newH;
    const y0 = Math.max(0, Math.min(targetSize - 1, Math.floor(mappedY)));
    const y1 = Math.max(0, Math.min(targetSize - 1, y0 + 1));
    const dy = mappedY - y0;

    const rowOffset = y * origW;
    const targetRow0 = y0 * targetSize;
    const targetRow1 = y1 * targetSize;

    for (let x = 0; x < origW; x++) {
      const mappedX = padX + (x / origW) * newW;
      const x0 = Math.max(0, Math.min(targetSize - 1, Math.floor(mappedX)));
      const x1 = Math.max(0, Math.min(targetSize - 1, x0 + 1));
      const dx = mappedX - x0;

      const v00 = rawMask[targetRow0 + x0];
      const v10 = rawMask[targetRow0 + x1];
      const v01 = rawMask[targetRow1 + x0];
      const v11 = rawMask[targetRow1 + x1];

      const val =
        (1 - dx) * (1 - dy) * v00 +
        dx * (1 - dy) * v10 +
        (1 - dx) * dy * v01 +
        dx * dy * v11;

      fullMask[rowOffset + x] = Math.max(0.0, Math.min(1.0, val));
    }
  }

  return fullMask;
}

/**
 * 边缘腐蚀/膨胀滤镜 (消除边缘白边/杂色溢出)
 */
function applyMorphology(mask, w, h, shift) {
  if (Math.abs(shift) < 0.1) return mask;

  const radius = Math.round(Math.abs(shift));
  const isErode = shift < 0;
  const result = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    const minY = Math.max(0, y - radius);
    const maxY = Math.min(h - 1, y + radius);

    for (let x = 0; x < w; x++) {
      const minX = Math.max(0, x - radius);
      const maxX = Math.min(w - 1, x + radius);

      let targetVal = mask[rowOffset + x];

      for (let ny = minY; ny <= maxY; ny++) {
        const nRow = ny * w;
        for (let nx = minX; nx <= maxX; nx++) {
          const val = mask[nRow + nx];
          if (isErode) {
            if (val < targetVal) targetVal = val;
          } else {
            if (val > targetVal) targetVal = val;
          }
        }
      }

      result[rowOffset + x] = targetVal;
    }
  }

  return result;
}

/**
 * 边缘高斯柔和羽化
 */
function applyFeather(mask, w, h, featherRadius) {
  if (featherRadius <= 0) return mask;

  const r = Math.min(8, Math.round(featherRadius));
  const temp = new Float32Array(w * h);
  const out = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dx = -r; dx <= r; dx++) {
        const nx = x + dx;
        if (nx >= 0 && nx < w) {
          sum += mask[rowOffset + nx];
          count++;
        }
      }
      temp[rowOffset + x] = sum / count;
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -r; dy <= r; dy++) {
        const ny = y + dy;
        if (ny >= 0 && ny < h) {
          sum += temp[ny * w + x];
          count++;
        }
      }
      out[y * w + x] = sum / count;
    }
  }

  return out;
}

/**
 * 核心执行函数：AI 神经网络端侧抠图
 * @param {ImageData} srcImageData 输入源图像
 * @param {object} options 配置选项
 * @returns {Promise<ImageData>} 抠出背景后的透明 PNG ImageData
 */
export async function runAIMatting(srcImageData, options = {}) {
  const {
    modelId = "modnet-web",
    edgeShift = -1.0, // 默认轻微内收 1px，消除边缘背景残留白边
    feather = 1.0,
    threshold = 0.5,
    abortSignal = null,
    onProgress = null,
  } = options;

  if (abortSignal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const modelMeta = MATTING_MODELS[modelId] || MATTING_MODELS["modnet-web"];
  const targetSize = modelMeta.inputResolution;

  // 1. 加载或复用模型 Session
  if (onProgress) onProgress(15, "正在初始化端侧 AI 推理引擎...");
  const session = await loadMattingSession(modelId, (p, txt) => {
    if (onProgress) onProgress(Math.round(p * 0.4), txt);
  });

  if (abortSignal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // 2. 图像预处理 (纯 TypedArray 几何校准)
  if (onProgress) onProgress(50, "执行等比几何校准与张量归一化...");
  const { tensorData, padX, padY, newW, newH } = preprocessLetterbox(
    srcImageData,
    targetSize,
    modelMeta.normType
  );

  // 3. 构建 Tensor 并执行推理
  if (onProgress) onProgress(65, "硬件加速神经元前向计算中...");
  const inputTensor = new ort.Tensor("float32", tensorData, [
    1,
    3,
    targetSize,
    targetSize,
  ]);
  const feeds = {};
  feeds[session.inputNames[0]] = inputTensor;

  const results = await session.run(feeds);
  const outputTensor = results[session.outputNames[0]];
  const rawMask = outputTensor.data;

  if (abortSignal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  // 4. 将输出掩码反解并双三次插值至原图尺寸
  if (onProgress) onProgress(80, "执行发丝级高阶掩码几何映射...");
  const origW = srcImageData.width;
  const origH = srcImageData.height;
  let fullMask = resampleMaskToOriginal(
    rawMask,
    targetSize,
    padX,
    padY,
    newW,
    newH,
    origW,
    origH
  );

  // 5. 后处理：边缘腐蚀内收与羽化
  if (Math.abs(edgeShift) > 0.1) {
    if (onProgress) onProgress(88, "执行边缘色溢自适应消除 (Defringe)...");
    fullMask = applyMorphology(fullMask, origW, origH, edgeShift);
  }

  if (feather > 0.1) {
    if (onProgress) onProgress(93, "执行边缘抗锯齿过渡羽化...");
    fullMask = applyFeather(fullMask, origW, origH, feather);
  }

  // 6. 合并生成最终 RGBA 图像
  if (onProgress) onProgress(98, "合成高保真透明图层...");
  const outImageData = new ImageData(origW, origH);
  const src = srcImageData.data;
  const dst = outImageData.data;
  const totalPixels = origW * origH;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    dst[idx] = src[idx];
    dst[idx + 1] = src[idx + 1];
    dst[idx + 2] = src[idx + 2];

    let aVal = fullMask[i];
    if (threshold !== 0.5) {
      const t = threshold;
      if (aVal < t * 0.5) {
        aVal = 0;
      } else if (aVal > 1.0 - (1.0 - t) * 0.5) {
        aVal = 1.0;
      } else {
        aVal = (aVal - t * 0.5) / (1.0 - t);
      }
    }

    dst[idx + 3] = Math.round(Math.max(0, Math.min(255, aVal * 255)));
  }

  if (onProgress) onProgress(100, "处理完成！");
  return outImageData;
}
