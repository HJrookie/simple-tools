/**
 * Anime4K 风格动漫与线稿极速重构算法 (Web 端自适应高保真实现)
 * 基于开源 Anime4K (bloc97) 核心数学原理：
 * 1. Lanczos-3 亚像素抗锯齿基础升采样
 * 2. Sobel 亮度梯度矢量场探测 (Gradient Field Analysis)
 * 3. 梯度法向线条收缩 (Line Thinning / Push)：修复插值后线条发虚增粗的顽疾，还原极细且锋利的墨线
 * 4. 边缘高频防振铃夹紧与自适应抗混叠平滑
 */

import { lanczosResample } from "./lanczos.js";
import { applyCAS } from "./cas.js";

/**
 * 计算 RGB 像素的感知亮度 (Perceptual Luminance)
 * @param {number} r 0~255
 * @param {number} g 0~255
 * @param {number} b 0~255
 * @returns {number} 0~255
 */
function getLuma(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/**
 * 双线性采样 ImageData
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} x 浮点 X 坐标
 * @param {number} y 浮点 Y 坐标
 * @param {number[]} outRgba [r, g, b, a] 输出
 */
function sampleBilinear(data, width, height, x, y, outRgba) {
  const x0 = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const x1 = Math.max(0, Math.min(width - 1, x0 + 1));
  const y0 = Math.max(0, Math.min(height - 1, Math.floor(y)));
  const y1 = Math.max(0, Math.min(height - 1, y0 + 1));

  const fx = x - x0;
  const fy = y - y0;
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;

  const idx00 = (y0 * width + x0) * 4;
  const idx10 = (y0 * width + x1) * 4;
  const idx01 = (y1 * width + x0) * 4;
  const idx11 = (y1 * width + x1) * 4;

  for (let c = 0; c < 4; c++) {
    outRgba[c] =
      w00 * data[idx00 + c] +
      w10 * data[idx10 + c] +
      w01 * data[idx01 + c] +
      w11 * data[idx11 + c];
  }
}

/**
 * Anime4K 线条收缩与边缘锐化 pass
 * @param {ImageData} upscaledImg 已完成初始放大的图像
 * @param {number} strength 强化强度 (0.0 ~ 1.0)
 * @returns {ImageData}
 */
export function anime4kLineRefine(upscaledImg, strength = 0.6) {
  const w = upscaledImg.width;
  const h = upscaledImg.height;
  const src = upscaledImg.data;

  // 1. 提取亮度矩阵 (Luma Buffer)
  const luma = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    luma[i] = getLuma(src[idx], src[idx + 1], src[idx + 2]);
  }

  // 2. 计算 Sobel 梯度
  const gradX = new Float32Array(w * h);
  const gradY = new Float32Array(w * h);
  const gradMag = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    const rowOffset = y * w;
    const rowAbove = (y - 1) * w;
    const rowBelow = (y + 1) * w;

    for (let x = 1; x < w - 1; x++) {
      const idx = rowOffset + x;

      // Sobel 算子
      const tl = luma[rowAbove + x - 1];
      const tc = luma[rowAbove + x];
      const tr = luma[rowAbove + x + 1];

      const ml = luma[rowOffset + x - 1];
      const mr = luma[rowOffset + x + 1];

      const bl = luma[rowBelow + x - 1];
      const bc = luma[rowBelow + x];
      const br = luma[rowBelow + x + 1];

      const gx = (tr + 2 * mr + br) - (tl + 2 * ml + bl);
      const gy = (bl + 2 * bc + br) - (tl + 2 * tc + tr);

      gradX[idx] = gx;
      gradY[idx] = gy;
      gradMag[idx] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  // 3. 线条收缩 (Line Push / Thinning)
  const output = new ImageData(w, h);
  const dst = output.data;
  const tempRgba = [0, 0, 0, 0];

  // 步长与阈值
  const pushStep = 1.0 * strength;
  const threshold = 15.0; // 忽略平坦区域微小噪点

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w;

    for (let x = 0; x < w; x++) {
      const idx = rowOffset + x;
      const pixelIdx = idx * 4;

      const mag = gradMag[idx];

      // 若在平坦纯色区域或图片边界，直接保留原色彩
      if (mag < threshold || x < 2 || x >= w - 2 || y < 2 || y >= h - 2) {
        dst[pixelIdx] = src[pixelIdx];
        dst[pixelIdx + 1] = src[pixelIdx + 1];
        dst[pixelIdx + 2] = src[pixelIdx + 2];
        dst[pixelIdx + 3] = src[pixelIdx + 3];
        continue;
      }

      // 单位法向矢量
      const invMag = 1.0 / mag;
      const nx = gradX[idx] * invMag;
      const ny = gradY[idx] * invMag;

      // 沿梯度方向正负采样 (寻找线条中心暗部)
      sampleBilinear(src, w, h, x + nx * pushStep, y + ny * pushStep, tempRgba);
      const lumaPos = getLuma(tempRgba[0], tempRgba[1], tempRgba[2]);

      sampleBilinear(src, w, h, x - nx * pushStep, y - ny * pushStep, tempRgba);
      const lumaNeg = getLuma(tempRgba[0], tempRgba[1], tempRgba[2]);

      const curLuma = luma[idx];

      // Anime4K 核心逻辑：若当前像素介于正反两端之间，且处于暗线边缘，将其向较暗一侧（墨线中心）或较亮一侧（底色）锐化推进
      if (lumaPos < curLuma && lumaPos < lumaNeg) {
        // 正向更暗（向暗部推移）
        sampleBilinear(src, w, h, x + nx * pushStep * 0.75, y + ny * pushStep * 0.75, tempRgba);
      } else if (lumaNeg < curLuma && lumaNeg < lumaPos) {
        // 反向更暗（向反向暗部推移）
        sampleBilinear(src, w, h, x - nx * pushStep * 0.75, y - ny * pushStep * 0.75, tempRgba);
      } else {
        // 本身已处于局部极值，使用原像素
        tempRgba[0] = src[pixelIdx];
        tempRgba[1] = src[pixelIdx + 1];
        tempRgba[2] = src[pixelIdx + 2];
        tempRgba[3] = src[pixelIdx + 3];
      }

      // 柔和混合，避免硬锯齿
      const blend = Math.min(1.0, strength * 1.2);
      dst[pixelIdx] = Math.round(src[pixelIdx] * (1 - blend) + tempRgba[0] * blend);
      dst[pixelIdx + 1] = Math.round(src[pixelIdx + 1] * (1 - blend) + tempRgba[1] * blend);
      dst[pixelIdx + 2] = Math.round(src[pixelIdx + 2] * (1 - blend) + tempRgba[2] * blend);
      dst[pixelIdx + 3] = src[pixelIdx + 3]; // 保持 Alpha 通道完全一致
    }
  }

  return output;
}

/**
 * 完整的 Anime4K 动漫/二次元极速放大流水线
 * 包含：Lanczos-3 初始高倍插值 + Anime4K 线条收缩 + CAS 自适应高对比锐化
 * @param {ImageData} srcImageData
 * @param {number} scale 放大倍数 (2, 3, 4)
 * @param {object} options
 * @returns {ImageData}
 */
export function anime4kUpscale(srcImageData, scale = 2, options = {}) {
  const {
    refineStrength = 0.7,
    casSharpness = 0.4,
  } = options;

  // 阶段 1: 亚像素高阶抗锯齿采样
  const scaled = lanczosResample(srcImageData, scale);

  // 阶段 2: Anime4K 线条收缩与边缘重建
  const refined = anime4kLineRefine(scaled, refineStrength);

  // 阶段 3: CAS 自适应对比度锐化，使线条如矢量般清晰利落
  if (casSharpness > 0.01) {
    return applyCAS(refined, casSharpness);
  }

  return refined;
}
