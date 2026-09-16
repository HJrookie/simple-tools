/**
 * 双边保边降噪滤波器 (Bilateral Filter)
 * 在平滑图像噪点和压缩伪影的同时，严格保护高频真实边缘不被模糊
 */

/**
 * @param {ImageData} imageData
 * @param {number} radius 滤波半径 (通常 2 ~ 3)
 * @param {number} sigmaSpace 空间高斯标准差
 * @param {number} sigmaColor 像素颜色范围高斯标准差
 * @returns {ImageData}
 */
export function bilateralFilter(imageData, radius = 2, sigmaSpace = 2.0, sigmaColor = 25.0) {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const output = new ImageData(w, h);
  const dst = output.data;

  const spaceWeight = [];
  const twoSigmaSpaceSq = 2 * sigmaSpace * sigmaSpace;
  const twoSigmaColorSq = 2 * sigmaColor * sigmaColor;

  // 预计算空间欧氏距离的高斯权重表
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distSq = dx * dx + dy * dy;
      spaceWeight.push({
        dx,
        dy,
        w: Math.exp(-distSq / twoSigmaSpaceSq),
      });
    }
  }

  const kernelLen = spaceWeight.length;

  for (let y = 0; y < h; y++) {
    const rowOffset = y * w * 4;

    for (let x = 0; x < w; x++) {
      const centerIdx = rowOffset + x * 4;
      const cR = src[centerIdx];
      const cG = src[centerIdx + 1];
      const cB = src[centerIdx + 2];

      let sumR = 0, sumG = 0, sumB = 0;
      let totalW = 0;

      for (let k = 0; k < kernelLen; k++) {
        const item = spaceWeight[k];
        const nx = x + item.dx;
        const ny = y + item.dy;

        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const neighborIdx = (ny * w + nx) * 4;
          const nR = src[neighborIdx];
          const nG = src[neighborIdx + 1];
          const nB = src[neighborIdx + 2];

          // 颜色距离
          const colorDistSq = (cR - nR) ** 2 + (cG - nG) ** 2 + (cB - nB) ** 2;
          const weight = item.w * Math.exp(-colorDistSq / twoSigmaColorSq);

          sumR += nR * weight;
          sumG += nG * weight;
          sumB += nB * weight;
          totalW += weight;
        }
      }

      dst[centerIdx] = (sumR / totalW + 0.5) | 0;
      dst[centerIdx + 1] = (sumG / totalW + 0.5) | 0;
      dst[centerIdx + 2] = (sumB / totalW + 0.5) | 0;
      dst[centerIdx + 3] = src[centerIdx + 3]; // Alpha 保持不变
    }
  }

  return output;
}
