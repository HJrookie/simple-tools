/**
 * 工业级端侧智能抠图 / 背景消除统一门面模块
 */

import { removeBackgroundWithWorker, abortMattingTask } from "./workerClient.js";
import { MATTING_MODELS, hasModelCached, removeCachedModel } from "./modelStorage.js";
import { autoDetectBackgroundColor } from "./chromaMatting.js";

/**
 * 将 HTMLImageElement 或 Canvas 转换为 ImageData
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
 */
export function imageDataToDataUrl(imageData, format = "image/png", quality = 0.95) {
  const canvas = imageDataToCanvas(imageData);
  return canvas.toDataURL(format, quality);
}

/**
 * 将 ImageData 导出为 Blob
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
 * 将 Canvas 内容直接写入系统剪贴板 (复制透明 PNG)
 */
export async function copyCanvasToClipboard(canvas) {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    throw new Error("当前浏览器不支持直接写入剪贴板图片");
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return reject(new Error("生成图片 Blob 失败"));
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ]);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, "image/png");
  });
}

/**
 * 背景替换与合成渲染器
 * @param {ImageData} fgImageData 抠出的透明前景图
 * @param {object} bgConfig 背景配置
 * @param {ImageData} origImageData 原始图片 (用于虚化背景模式)
 * @returns {HTMLCanvasElement} 合成后的 Canvas 结果
 */
export function compositeBackground(fgImageData, bgConfig = {}, origImageData = null) {
  const w = fgImageData.width;
  const h = fgImageData.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const { type = "transparent", color = "#438EDB", gradient = null, blur = 16 } = bgConfig;

  if (type === "transparent") {
    // 纯透明前景
    ctx.putImageData(fgImageData, 0, 0);
    return canvas;
  }

  if (type === "solid") {
    // 纯色背景 (如证件照经典蓝红白底)
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  } else if (type === "gradient" && gradient) {
    // 现代时尚渐变背景
    const { angle = 135, stops = ["#667eea", "#764ba2"] } = gradient;
    const rad = (angle * Math.PI) / 180;
    const x1 = Math.round(w / 2 - (Math.cos(rad) * w) / 2);
    const y1 = Math.round(h / 2 - (Math.sin(rad) * h) / 2);
    const x2 = Math.round(w / 2 + (Math.cos(rad) * w) / 2);
    const y2 = Math.round(h / 2 + (Math.sin(rad) * h) / 2);

    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    const step = 1 / Math.max(1, stops.length - 1);
    stops.forEach((c, idx) => grad.addColorStop(idx * step, c));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (type === "blur" && origImageData) {
    // 景深虚化模式 (大光圈肖像虚化)
    const bgCanvas = imageDataToCanvas(origImageData);
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    // 稍微向外放大 5% 避免模糊边缘向内缩透黑
    ctx.drawImage(bgCanvas, -w * 0.025, -h * 0.025, w * 1.05, h * 1.05);
    ctx.restore();
  }

  // 在背景之上绘制透明主体
  const fgCanvas = imageDataToCanvas(fgImageData);
  ctx.drawImage(fgCanvas, 0, 0);

  return canvas;
}

export {
  removeBackgroundWithWorker as removeBackground,
  abortMattingTask,
  MATTING_MODELS,
  hasModelCached,
  removeCachedModel,
  autoDetectBackgroundColor,
};
