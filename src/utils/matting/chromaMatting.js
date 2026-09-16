/**
 * 极速纯色 / 绿幕 / 白底魔棒抠图算法 (Chroma Key & Flood-Fill Magic Wand)
 * 0 外部依赖，0MB 体积，1ms 纯本地执行
 * 特性：
 * 1. 自动边缘四角采样（智能识别背景主色，无需手动吸取）
 * 2. 边缘连通域填充 (Flood Fill)，杜绝把人像内部的白色衣服或同色配饰误抠穿
 * 3. 双容差自适应边缘柔化与抗羽化过渡
 */

/**
 * 计算两个 RGB 颜色的欧几里得距离
 */
function colorDistance(r1, g1, b1, r2, g2, b2) {
  // 加权感知距离 (人眼对绿色更敏感)
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
}

/**
 * 自动从图像四角采样推测背景颜色
 * @param {ImageData} imageData
 * @returns {[number, number, number]} [r, g, b]
 */
export function autoDetectBackgroundColor(imageData) {
  const { width: w, height: h, data } = imageData;
  const samples = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
  ];

  let sumR = 0,
    sumG = 0,
    sumB = 0;
  for (const [x, y] of samples) {
    const idx = (y * w + x) * 4;
    sumR += data[idx];
    sumG += data[idx + 1];
    sumB += data[idx + 2];
  }

  return [
    Math.round(sumR / samples.length),
    Math.round(sumG / samples.length),
    Math.round(sumB / samples.length),
  ];
}

/**
 * 纯色/绿幕抠图执行器
 * @param {ImageData} srcImageData 输入图像
 * @param {object} options 参数配置
 * @returns {ImageData}
 */
export function runChromaMatting(srcImageData, options = {}) {
  const {
    targetColor = null, // [r, g, b]，未传则自动采样四角
    tolerance = 28, // 容差 (0 ~ 100)
    smoothness = 12, // 羽化柔和度 (0 ~ 50)
    onlyConnected = true, // 仅清除与边界连通的背景 (保护主体同色区域)
  } = options;

  const w = srcImageData.width;
  const h = srcImageData.height;
  const src = srcImageData.data;

  const output = new ImageData(new Uint8ClampedArray(src), w, h);
  const dst = output.data;

  // 1. 确定目标被消除的背景基准色
  const [tr, tg, tb] = targetColor || autoDetectBackgroundColor(srcImageData);

  const innerTol = tolerance;
  const outerTol = tolerance + smoothness;

  if (onlyConnected) {
    // 2. 连通域 BFS 洪泛填充 (仅清除从图像外边缘渗入的背景)
    const visited = new Uint8Array(w * h);
    const queue = [];

    // 将四条边缘符合背景容差的像素加入队列
    for (let x = 0; x < w; x++) {
      queue.push((0 * w + x));
      queue.push(((h - 1) * w + x));
    }
    for (let y = 1; y < h - 1; y++) {
      queue.push((y * w + 0));
      queue.push((y * w + (w - 1)));
    }

    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      if (visited[idx]) continue;
      visited[idx] = 1;

      const px = idx % w;
      const py = Math.floor(idx / w);
      const dataIdx = idx * 4;

      const dist = colorDistance(
        src[dataIdx],
        src[dataIdx + 1],
        src[dataIdx + 2],
        tr,
        tg,
        tb
      );

      // 若在容差范围内，则设置透明或渐变透明，并向四周扩散
      if (dist <= outerTol) {
        let alpha = 0;
        if (dist > innerTol) {
          // 边缘柔和半透明
          alpha = Math.round(((dist - innerTol) / (outerTol - innerTol)) * 255);
        }
        dst[dataIdx + 3] = Math.min(dst[dataIdx + 3], alpha);

        // 向 4-邻域邻居像素探索
        if (px > 0 && !visited[idx - 1]) queue.push(idx - 1);
        if (px < w - 1 && !visited[idx + 1]) queue.push(idx + 1);
        if (py > 0 && !visited[idx - w]) queue.push(idx - w);
        if (py < h - 1 && !visited[idx + w]) queue.push(idx + w);
      }
    }
  } else {
    // 全图范围直接根据颜色容差置换
    const totalPixels = w * h;
    for (let i = 0; i < totalPixels; i++) {
      const dataIdx = i * 4;
      const dist = colorDistance(
        src[dataIdx],
        src[dataIdx + 1],
        src[dataIdx + 2],
        tr,
        tg,
        tb
      );

      if (dist <= innerTol) {
        dst[dataIdx + 3] = 0;
      } else if (dist <= outerTol) {
        const factor = (dist - innerTol) / (outerTol - innerTol);
        dst[dataIdx + 3] = Math.round(src[dataIdx + 3] * factor);
      }
    }
  }

  return output;
}
