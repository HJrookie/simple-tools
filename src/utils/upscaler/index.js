/**
 * 超分辨率图像无损放大核心门面接口
 * 整合 AI 神经网络模式、Lanczos-3 高保真重采样、自适应对比度锐化 (CAS) 与双边滤波
 */

import { lanczosResample } from "./lanczos.js";
import { applyCAS } from "./cas.js";
import { bilateralFilter } from "./bilateral.js";
import { anime4kUpscale } from "./anime4k.js";
import { runNeuralUpscale, AI_MODELS } from "./onnxEngine.js";
import { hasModelCached } from "./modelStorage.js";

/**
 * 将 HTMLImageElement 或 ImageBitmap 转换为 ImageData
 * @param {HTMLImageElement | HTMLCanvasElement} imgSource
 * @returns {ImageData}
 */
export function getImageDataFromSource(imgSource) {
  const w = imgSource.naturalWidth || imgSource.width;
  const h = imgSource.naturalHeight || imgSource.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgSource, 0, 0);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * 将 ImageData 转换为 Canvas
 * @param {ImageData} imageData
 * @returns {HTMLCanvasElement}
 */
export function imageDataToCanvas(imageData) {
  const canvas = document.createElement("canvas");
  canvas.width = imageData.width;
  canvas.height = imageData.height;
  const ctx = canvas.getContext("2d");
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/**
 * 将 ImageData 导出为 DataURL (Base64)
 * @param {ImageData} imageData
 * @param {string} format
 * @param {number} quality
 * @returns {string}
 */
export function imageDataToDataUrl(imageData, format = "image/png", quality = 0.95) {
  const canvas = imageDataToCanvas(imageData);
  return canvas.toDataURL(format, quality);
}

/**
 * 将 ImageData 导出为 Blob
 * @param {ImageData} imageData
 * @param {string} format
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
export function imageDataToBlob(imageData, format = "image/png", quality = 0.95) {
  const canvas = imageDataToCanvas(imageData);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("导出 Blob 失败"));
      },
      format,
      quality
    );
  });
}

/**
 * 核心放大执行器
 * @param {ImageData} srcImageData 输入图像数据
 * @param {object} options 参数配置
 * @returns {Promise<{ resultImageData: ImageData, durationMs: number }>}
 */
export async function upscaleImage(srcImageData, options = {}) {
  const {
    scale = 2, // 放大倍数 (2, 3, 4)
    mode = "lanczos_cas", // 'neural_ai' | 'lanczos_cas' | 'anime_art'
    sharpness = 0.5, // 锐化强度 (0.0 ~ 1.0)
    denoise = "none", // 'none' | 'light' | 'medium' | 'strong'
    modelId = "espcn-x2",
    onProgress = null, // 进度回调 (0~100, stepText)
  } = options;

  const startTime = performance.now();
  let current = srcImageData;
  let skipCas = false;

  // 1. 前置去噪处理 (如果用户指定了降噪程度)
  if (denoise !== "none") {
    if (onProgress) onProgress(10, "执行智能保边降噪平滑...");
    const denoiseConfig = {
      light: { r: 1, sSpace: 1.5, sColor: 15 },
      medium: { r: 2, sSpace: 2.0, sColor: 25 },
      strong: { r: 3, sSpace: 3.0, sColor: 40 },
    };
    const cfg = denoiseConfig[denoise] || denoiseConfig.light;
    current = bilateralFilter(current, cfg.r, cfg.sSpace, cfg.sColor);
  }

  // 2. 核心放大阶段
  if (mode === "neural_ai") {
    // A. 神经网络模式 (WebAssembly / WebGPU + ONNX)
    try {
      current = await runNeuralUpscale(current, {
        modelId,
        abortSignal: options.abortSignal,
        onProgress: (pct, txt) => {
          if (onProgress) onProgress(pct, txt);
        },
      });

      // 如果目标倍率是 4x，再通过高保真插值平滑升阶
      if (scale === 4) {
        if (onProgress) onProgress(80, "执行 4x 高阶保真重采样...");
        current = lanczosResample(current, 2);
      } else if (scale === 3) {
        if (onProgress) onProgress(80, "执行 3x 高阶保真重采样...");
        current = lanczosResample(current, 1.5);
      }
    } catch (err) {
      if (err.name === "AbortError" || options.abortSignal?.aborted) {
        throw err;
      }
      console.warn("AI 神经网络推理未成功或网络受限，自动平滑回退至高保真自适应算法", err);
      if (onProgress) onProgress(40, "回退至自适应高保真重采样...");
      current = lanczosResample(srcImageData, scale);
    }
  } else if (mode === "anime_art") {
    // B. Anime4K 动漫 / 插画 / 矢量图标专精模式 (毫秒级即刻重构)
    if (onProgress) onProgress(25, "执行 Lanczos-3 亚像素抗锯齿基础升采样...");
    if (onProgress) onProgress(60, "执行 Anime4K 梯度场法向线条收缩 (Line Thinning)...");
    current = anime4kUpscale(current, scale, {
      refineStrength: 0.7,
      casSharpness: sharpness * 0.75,
    });
    // 该模式内部已集成自适应锐化
    skipCas = true;
  } else {
    // C. 经典高保真自适应模式 (Lanczos-3 + CAS，极速免下载)
    if (onProgress) onProgress(40, "执行 Lanczos-3 窗口 Sinc 高保真重采样...");
    current = lanczosResample(current, scale);
  }

  // 3. 后置自适应对比度锐化 (CAS)
  if (!skipCas && sharpness > 0.01) {
    if (onProgress) onProgress(85, "执行 AMD FidelityFX CAS 自适应对比度边缘锐化...");
    current = applyCAS(current, sharpness);
  }

  if (onProgress) onProgress(100, "处理完成！");
  const durationMs = Math.round(performance.now() - startTime);

  return {
    resultImageData: current,
    durationMs,
  };
}

export { upscaleWithWorker, abortUpscaleTask } from "./workerClient.js";
export { AI_MODELS, hasModelCached };

