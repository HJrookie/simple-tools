/**
 * 自适应对比度锐化算法 (Contrast Adaptive Sharpening - CAS)
 * 基于 AMD FidelityFX 开源算法核心原理移植
 * 局部自适应动态权重调整，只在边缘过渡处精细锐化，绝对抑制白边振铃 (Ringing) 和过度光晕 (Halo)
 */

/**
 * 对 ImageData 执行自适应对比度锐化
 * @param {ImageData} imageData 输入图像
 * @param {number} sharpness 锐化强度 (0.0 ~ 1.0)
 * @returns {ImageData}
 */
export function applyCAS(imageData, sharpness = 0.5) {
  if (sharpness <= 0.01) return imageData;

  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;
  const output = new ImageData(w, h);
  const dst = output.data;

  // 将 sharpness 映射到 CAS 参数
  // CAS 算法中负权重峰值：w = -1 / (lerp(8.0, 5.0, sharpness))
  const peak = -1.0 / (8.0 - sharpness * 3.0);

  // 复制四周边界像素
  dst.set(src);

  for (let y = 1; y < h - 1; y++) {
    const rowOffset = y * w * 4;
    const topOffset = (y - 1) * w * 4;
    const btmOffset = (y + 1) * w * 4;

    for (let x = 1; x < w - 1; x++) {
      const idx = rowOffset + x * 4;
      const idxT = topOffset + x * 4;
      const idxB = btmOffset + x * 4;
      const idxL = rowOffset + (x - 1) * 4;
      const idxR = rowOffset + (x + 1) * 4;

      // 对 RGB 三个通道分别计算
      for (let c = 0; c < 3; c++) {
        const e = src[idx + c]; // 中心 (Center)
        const a = src[idxT + c]; // 上 (Top)
        const b = src[idxL + c]; // 左 (Left)
        const d = src[idxR + c]; // 右 (Right)
        const g = src[idxB + c]; // 下 (Bottom)

        // 计算局部极小值与极大值
        let minVal = e;
        if (a < minVal) minVal = a;
        if (b < minVal) minVal = b;
        if (d < minVal) minVal = d;
        if (g < minVal) minVal = g;

        let maxVal = e;
        if (a > maxVal) maxVal = a;
        if (b > maxVal) maxVal = b;
        if (d > maxVal) maxVal = d;
        if (g > maxVal) maxVal = g;

        // 计算自适应对比度权重 (限制在局部对比度范围内)
        const amp = Math.min(minVal, 255 - maxVal) / (maxVal || 1);
        const wCoeff = peak * Math.sqrt(Math.max(0, amp));

        // 滤波： (e + wCoeff * (a + b + d + g)) / (1 + 4 * wCoeff)
        const res = (e + wCoeff * (a + b + d + g)) / (1.0 + 4.0 * wCoeff);

        // 钳位在 [minVal, maxVal] 之间，杜绝光晕超调！
        const clamped = Math.max(minVal, Math.min(maxVal, res));
        dst[idx + c] = (clamped + 0.5) | 0;
      }

      // 保留 Alpha 通道不变
      dst[idx + 3] = src[idx + 3];
    }
  }

  return output;
}
