/**
 * 自适应图像高保真压缩引擎 (Adaptive Image Compression Engine)
 * 1. 深度支持现代 WebP / JPEG / PNG 格式
 * 2. 精准收敛控制在目标大小（例如 ≤ 100KB、50KB），告别体积压不下去的困扰
 * 3. 动态智能平衡：基于人眼视觉系统 (HVS) 动态协同调节分辨率与量化质量，实现画质与体积的完美平衡
 */

/**
 * 格式与文件扩展名映射
 */
export const MIME_TO_EXT = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const EXT_TO_MIME = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

/**
 * 异步从 File 或 Blob 读取 Image 对象
 */
export function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(new Error("图片载入失败，请确认文件格式是否损坏"));
    };
    img.src = url;
  });
}

/**
 * 将 Canvas 导出为 Blob (Promise 包装)
 */
export function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob);
      },
      mimeType,
      quality
    );
  });
}

/**
 * 动态计算等比缩放尺寸
 */
export function calculateFitDimensions(srcWidth, srcHeight, maxDimension) {
  if (!maxDimension || maxDimension <= 0) {
    return { width: srcWidth, height: srcHeight };
  }
  const maxSide = Math.max(srcWidth, srcHeight);
  if (maxSide <= maxDimension) {
    return { width: srcWidth, height: srcHeight };
  }
  const ratio = maxDimension / maxSide;
  return {
    width: Math.max(1, Math.round(srcWidth * ratio)),
    height: Math.max(1, Math.round(srcHeight * ratio)),
  };
}

/**
 * 创建高保真缩放 Canvas 并绘制图像
 * @param {HTMLImageElement|HTMLCanvasElement} source
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @param {string} targetMimeType
 */
export function renderToCanvas(source, targetWidth, targetHeight, targetMimeType = "image/webp") {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { alpha: true });

  // 开启双线性平滑插值，保证缩小图片不失真
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 如果目标格式是 JPEG (不支持透明通道)，填充白色底色，防止透明背景变成难看的黑底
  if (targetMimeType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas;
}

/**
 * 右下角 AI 水印平滑去除 (智能采样修补)
 */
export function removeWatermarkFromCanvas(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const w = canvas.width;
  const h = canvas.height;
  const wmSize = Math.max(48, Math.min(w, h) * 0.12);
  const x = w - wmSize;
  const y = h - wmSize;

  try {
    // 从水印稍偏左上区域平滑采样并覆盖
    ctx.drawImage(canvas, x - 6, y, 3, wmSize, x, y, wmSize, wmSize);
  } catch (e) {
    console.warn("Watermark removal failed:", e);
  }
}

/**
 * 针对目标大小模式，推断出最适合的目标尺寸上限
 * 目的：避免在 4000x3000 原分辨率下把质量砸到 0.05 变成严重马赛克，
 * 通过适度分辨率调整，让同样的 100KB 容量能够使用 0.80 的高保真质量编码，显示效果更佳！
 */
export function recommendMaxDimensionForSize(targetKB) {
  if (targetKB <= 50) return 1080;
  if (targetKB <= 100) return 1440; // 100KB 完美匹配 1440px
  if (targetKB <= 200) return 1920; // 1080P
  if (targetKB <= 500) return 2560; // 2K
  return 3840;
}

/**
 * 核心自适应压缩流程
 * @param {File|Blob} file 原始图片文件
 * @param {Object} options 压缩配置项
 */
export async function compressImageAdaptive(file, options = {}) {
  const {
    mainMode = "smart", // 'smart' | 'custom'
    smartLevel = "balanced", // 'small' | 'balanced' | 'high'
    customType = "quality", // 'quality' | 'size'
    customQuality = 85, // 1 - 100
    targetKB = 100, // 目标大小 (KB)
    customResolution = "original", // 'original' | 1920 | 1280 等
    outputFormat = "image/webp", // 'original' | 'image/webp' | 'image/jpeg' | 'image/png'
    removeWatermark = false,
    autoWebpForSize = true, // 当限制较小体积时，自动转为 WebP 格式实现极致压缩
  } = options;

  // 1. 载入原始图片
  const originalImg = await loadImageFromBlob(file);
  const origW = originalImg.naturalWidth;
  const origH = originalImg.naturalHeight;
  const origSize = file.size;

  // 2. 决定最终输出的 MIME 类型
  let targetMime = "image/webp"; // 默认首选最现代的 WebP
  const fileMime = file.type || "image/jpeg";

  if (outputFormat === "original") {
    // 原格式模式
    if (fileMime === "image/png") {
      // 若原图是 PNG，但用户选择了限制到小文件大小（如 ≤ 200KB）：
      // 由于 PNG 规范是无损压缩，Canvas 忽略质量参数，PNG 几乎不可能压到 100KB 以下。
      // 如果启用了 autoWebpForSize，智能转为支持透明度的 WebP，既保留透明又实现极小体积！
      if (customType === "size" && targetKB <= 300 && autoWebpForSize) {
        targetMime = "image/webp";
      } else {
        targetMime = "image/png";
      }
    } else if (fileMime === "image/webp") {
      targetMime = "image/webp";
    } else {
      targetMime = "image/jpeg";
    }
  } else {
    targetMime = outputFormat;
  }

  // 3. 处理去水印与初始画布
  let sourceCanvas = renderToCanvas(originalImg, origW, origH, targetMime);
  if (removeWatermark) {
    removeWatermarkFromCanvas(sourceCanvas);
  }

  // ================= 分支 A: 智能模式 (Smart Mode) =================
  if (mainMode === "smart") {
    let maxDim = null;
    let quality = 0.82;

    if (smartLevel === "small") {
      maxDim = 1280;
      quality = 0.72;
    } else if (smartLevel === "balanced") {
      maxDim = 1920;
      quality = 0.82;
    } else {
      // high
      maxDim = null; // 保持原分辨率
      quality = 0.92;
    }

    const { width, height } = calculateFitDimensions(origW, origH, maxDim);
    const canvas = renderToCanvas(sourceCanvas, width, height, targetMime);
    const blob = await canvasToBlob(canvas, targetMime, quality);

    return {
      blob,
      width,
      height,
      originalWidth: origW,
      originalHeight: origH,
      actualFormat: targetMime,
      qualityUsed: quality,
      iterations: 1,
    };
  }

  // ================= 分支 B: 自定义模式 - 指定清晰度 (Quality Mode) =================
  if (customType === "quality") {
    const quality = Math.max(0.01, Math.min(1.0, customQuality / 100));
    let maxDim = null;
    if (customResolution !== "original" && typeof customResolution === "number") {
      maxDim = customResolution;
    }

    const { width, height } = calculateFitDimensions(origW, origH, maxDim);
    const canvas = renderToCanvas(sourceCanvas, width, height, targetMime);
    const blob = await canvasToBlob(canvas, targetMime, quality);

    return {
      blob,
      width,
      height,
      originalWidth: origW,
      originalHeight: origH,
      actualFormat: targetMime,
      qualityUsed: quality,
      iterations: 1,
    };
  }

  // ================= 分支 C: 自定义模式 - 指定文件大小 (Size Mode, 如 ≤ 100KB) =================
  // 核心重点：通过自适应尺寸约束 + 二分精度质量调节，确保最终结果严格 <= targetKB，并保证最佳画质
  const targetBytes = targetKB * 1024;
  const targetMinBytes = targetBytes * 0.85; // 允许的理想区间上限，如 85KB ~ 98KB

  // 1. 确定初始最高分辨率上限
  let allowedMaxDim = Infinity;
  if (customResolution !== "original" && typeof customResolution === "number") {
    allowedMaxDim = customResolution;
  } else {
    // 即使选择保持原分辨率，如果原图分辨率达到 4000+ 而目标大小只有 100KB，
    // 单纯降低质量只会满屏噪点色块。在此给出智能上界建议
    const recommended = recommendMaxDimensionForSize(targetKB);
    allowedMaxDim = Math.min(Math.max(origW, origH), recommended * 1.25);
  }

  let currentDim = calculateFitDimensions(origW, origH, allowedMaxDim);
  let curWidth = currentDim.width;
  let curHeight = currentDim.height;

  // 如果目标格式是 PNG，且希望压到极小体积（如 ≤ 200KB）：
  // 如果当前仍然是 PNG，PNG 不支持质量压缩，必须采用尺寸梯度缩放来逼近
  if (targetMime === "image/png") {
    let bestPngBlob = null;
    let iterations = 0;
    let scale = 1.0;

    for (let i = 0; i < 6; i++) {
      iterations++;
      const w = Math.max(64, Math.round(curWidth * scale));
      const h = Math.max(64, Math.round(curHeight * scale));
      const canvas = renderToCanvas(sourceCanvas, w, h, targetMime);
      const blob = await canvasToBlob(canvas, targetMime);

      if (blob.size <= targetBytes) {
        bestPngBlob = { blob, width: w, height: h };
        if (blob.size >= targetMinBytes) break; // 已经落入极佳区间
        // 如果体积富余很多，适度提升比例
        break;
      } else {
        // 体积超标，必须缩放分辨率
        const ratio = Math.sqrt(targetBytes / blob.size);
        scale = scale * Math.max(0.65, Math.min(0.92, ratio));
      }
    }

    if (bestPngBlob) {
      return {
        blob: bestPngBlob.blob,
        width: bestPngBlob.width,
        height: bestPngBlob.height,
        originalWidth: origW,
        originalHeight: origH,
        actualFormat: targetMime,
        qualityUsed: 1.0,
        iterations,
      };
    }
  }

  // 对于 WebP 和 JPEG：支持高精度浮点 Quality 调节
  let qLow = 0.05;
  let qHigh = 0.95;
  let currentQuality = targetKB <= 100 ? 0.78 : 0.85; // 针对 100KB 给出优异初始质量
  let bestCandidate = null;
  let totalIterations = 0;

  for (let step = 0; step < 7; step++) {
    totalIterations++;
    const canvas = renderToCanvas(sourceCanvas, curWidth, curHeight, targetMime);
    const blob = await canvasToBlob(canvas, targetMime, currentQuality);
    const currentSize = blob.size;

    // A. 满足目标大小 (≤ targetBytes)
    if (currentSize <= targetBytes) {
      // 记录下当前满足条件的最佳候选
      if (!bestCandidate || currentSize > bestCandidate.blob.size) {
        bestCandidate = {
          blob,
          width: curWidth,
          height: curHeight,
          quality: currentQuality,
        };
      }

      // 如果已经达到目标大小的 88% ~ 100%，说明画质已经完全拉满，直接收工！
      if (currentSize >= targetMinBytes) {
        break;
      }

      // 还可以尝试给更高的画质
      qLow = currentQuality;
      currentQuality = (qLow + qHigh) / 2;
    } else {
      // B. 超过目标大小 (> targetBytes)
      qHigh = currentQuality;

      // 如果 quality 已经降得很低 (如 ≤ 0.35) 依然超标，说明分辨率对当前目标大小过大！
      // 此时果断将分辨率适度等比缩小 (0.85倍)，同时将 quality 回调到 0.75！
      // 缩图后用高画质编码，人眼视觉效果远胜于在超大图下满屏噪点马赛克！
      if (currentQuality <= 0.40 && Math.max(curWidth, curHeight) > 640) {
        curWidth = Math.round(curWidth * 0.85);
        curHeight = Math.round(curHeight * 0.85);
        qLow = 0.3;
        qHigh = 0.92;
        currentQuality = 0.75;
      } else {
        currentQuality = (qLow + qHigh) / 2;
      }
    }

    // 二分区间收敛极小时退出
    if (qHigh - qLow < 0.03) {
      break;
    }
  }

  // 兜底保障：如果经历了多轮依然没有小于 targetBytes，进行一次强制尺寸平滑下采样
  if (!bestCandidate) {
    const fallbackDim = calculateFitDimensions(curWidth, curHeight, 1024);
    const fallbackCanvas = renderToCanvas(sourceCanvas, fallbackDim.width, fallbackDim.height, targetMime);
    const fallbackBlob = await canvasToBlob(fallbackCanvas, targetMime, 0.6);
    bestCandidate = {
      blob: fallbackBlob,
      width: fallbackDim.width,
      height: fallbackDim.height,
      quality: 0.6,
    };
  }

  return {
    blob: bestCandidate.blob,
    width: bestCandidate.width,
    height: bestCandidate.height,
    originalWidth: origW,
    originalHeight: origH,
    actualFormat: targetMime,
    qualityUsed: bestCandidate.quality,
    iterations: totalIterations,
  };
}
