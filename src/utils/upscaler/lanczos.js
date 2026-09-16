/**
 * 高性能分离式 Lanczos-3 重采样内核 (Separable Lanczos-3 Resampling)
 * 数字信号处理中最高保真度的图像插值重采样算法之一，有效保留边缘结构并抑制伪影
 */

const a = 3; // 滤波器半宽度 (Lanczos-3)

function sinc(x) {
  x = Math.abs(x);
  if (x === 0) return 1.0;
  const pix = Math.PI * x;
  return Math.sin(pix) / pix;
}

function lanczosKernel(x) {
  x = Math.abs(x);
  if (x === 0) return 1.0;
  if (x >= a) return 0.0;
  return sinc(x) * sinc(x / a);
}

/**
 * 预计算一维重采样权重矩阵
 * @param {number} srcLen 原尺寸
 * @param {number} dstLen 目标尺寸
 * @returns {Array<{ left: number, right: number, weights: Float32Array }>}
 */
function buildLanczosContribs(srcLen, dstLen) {
  const scale = dstLen / srcLen;
  const filterScale = scale < 1.0 ? scale : 1.0;
  const radius = a / filterScale;
  const contribs = new Array(dstLen);

  for (let dst = 0; dst < dstLen; dst++) {
    const center = (dst + 0.5) / scale - 0.5;
    let left = Math.floor(center - radius);
    let right = Math.ceil(center + radius);

    if (left < 0) left = 0;
    if (right >= srcLen) right = srcLen - 1;

    const count = right - left + 1;
    const weights = new Float32Array(count);
    let weightSum = 0;

    for (let i = 0; i < count; i++) {
      const src = left + i;
      const dist = (center - src) * filterScale;
      const w = lanczosKernel(dist);
      weights[i] = w;
      weightSum += w;
    }

    // 归一化权重以防能量增减
    if (weightSum !== 0) {
      for (let i = 0; i < count; i++) {
        weights[i] /= weightSum;
      }
    }

    contribs[dst] = { left, count, weights };
  }

  return contribs;
}

/**
 * 使用 Lanczos-3 对 ImageData 进行无损高质量放大
 * @param {ImageData} srcImageData 源图像数据
 * @param {number} scale 放大倍率 (如 2, 3, 4)
 * @returns {ImageData}
 */
export function lanczosResample(srcImageData, scale = 2) {
  const srcW = srcImageData.width;
  const srcH = srcImageData.height;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const srcData = srcImageData.data;

  // 1. 预构建水平与垂直方向的贡献权重
  const contribX = buildLanczosContribs(srcW, dstW);
  const contribY = buildLanczosContribs(srcH, dstH);

  // 2. 第一阶段：水平方向插值 (中间缓冲：dstW × srcH × 4 Float32)
  const tmpBuffer = new Float32Array(dstW * srcH * 4);

  for (let y = 0; y < srcH; y++) {
    const srcRowOffset = y * srcW * 4;
    const tmpRowOffset = y * dstW * 4;

    for (let x = 0; x < dstW; x++) {
      const { left, count, weights } = contribX[x];
      let r = 0, g = 0, b = 0, aVal = 0;

      for (let i = 0; i < count; i++) {
        const srcX = left + i;
        const w = weights[i];
        const srcOffset = srcRowOffset + srcX * 4;

        r += srcData[srcOffset] * w;
        g += srcData[srcOffset + 1] * w;
        b += srcData[srcOffset + 2] * w;
        aVal += srcData[srcOffset + 3] * w;
      }

      const tmpOffset = tmpRowOffset + x * 4;
      tmpBuffer[tmpOffset] = r;
      tmpBuffer[tmpOffset + 1] = g;
      tmpBuffer[tmpOffset + 2] = b;
      tmpBuffer[tmpOffset + 3] = aVal;
    }
  }

  // 3. 第二阶段：垂直方向插值 (从 tmpBuffer 到目标 Uint8ClampedArray)
  const dstImageData = new ImageData(dstW, dstH);
  const dstData = dstImageData.data;

  for (let y = 0; y < dstH; y++) {
    const { left, count, weights } = contribY[y];
    const dstRowOffset = y * dstW * 4;

    for (let x = 0; x < dstW; x++) {
      let r = 0, g = 0, b = 0, aVal = 0;

      for (let i = 0; i < count; i++) {
        const srcY = left + i;
        const w = weights[i];
        const tmpOffset = (srcY * dstW + x) * 4;

        r += tmpBuffer[tmpOffset] * w;
        g += tmpBuffer[tmpOffset + 1] * w;
        b += tmpBuffer[tmpOffset + 2] * w;
        aVal += tmpBuffer[tmpOffset + 3] * w;
      }

      const dstOffset = dstRowOffset + x * 4;
      // 快速数值钳位到 0~255
      dstData[dstOffset] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;
      dstData[dstOffset + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;
      dstData[dstOffset + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;
      dstData[dstOffset + 3] = aVal < 0 ? 0 : aVal > 255 ? 255 : (aVal + 0.5) | 0;
    }
  }

  return dstImageData;
}
