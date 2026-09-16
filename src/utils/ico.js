/**
 * 纯客户端纯原生 ICO 图标生成工具
 * 无任何外部网络请求，无 WebAssembly 开销，利用现代浏览器 Canvas 硬件加速与 DataView 二进制无损组装
 */

/**
 * 将多个 PNG 图像二进制数据组合封装为一个合法的 Windows ICO 文件
 * 符合微软 ICONDIR / ICONDIRENTRY 规范与现代浏览器 PNG-in-ICO 标准
 * @param {Array<{ width: number, height: number, buffer: ArrayBuffer | Uint8Array }>} pngItems
 * @returns {Blob}
 */
export function createIcoFromPngBuffers(pngItems) {
  if (!pngItems || pngItems.length === 0) {
    throw new Error("至少需要提供一个尺寸的图像数据");
  }

  const count = pngItems.length;
  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * count;

  // 计算全部数据所需的总字节数
  let totalDataSize = 0;
  for (const item of pngItems) {
    const byteLength = item.buffer.byteLength || item.buffer.length;
    totalDataSize += byteLength;
  }

  const totalFileSize = dirSize + totalDataSize;
  const fileBuffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(fileBuffer);
  const uint8 = new Uint8Array(fileBuffer);

  // 1. 写入 ICONDIR 头部 (6 字节)
  // 0-1: 预留，必须为 0
  view.setUint16(0, 0, true);
  // 2-3: 资源类型，1 表示图标 (ICO), 2 为光标 (CUR)
  view.setUint16(2, 1, true);
  // 4-5: 包含的图像条目数量
  view.setUint16(4, count, true);

  // 2. 依次写入各图像目录条目 ICONDIRENTRY (每个 16 字节)
  let currentOffset = dirSize;

  for (let i = 0; i < count; i++) {
    const item = pngItems[i];
    const entryOffset = headerSize + i * entrySize;
    const imgData = item.buffer instanceof Uint8Array ? item.buffer : new Uint8Array(item.buffer);
    const imgLength = imgData.byteLength;

    // Width (1 byte, 256 存储为 0)
    const w = item.width >= 256 ? 0 : item.width;
    view.setUint8(entryOffset + 0, w);

    // Height (1 byte, 256 存储为 0)
    const h = item.height >= 256 ? 0 : item.height;
    view.setUint8(entryOffset + 1, h);

    // Color count (1 byte, 0 表示 >= 8bpp)
    view.setUint8(entryOffset + 2, 0);

    // Reserved (1 byte, 必须为 0)
    view.setUint8(entryOffset + 3, 0);

    // Color Planes (2 bytes, 通常设为 1)
    view.setUint16(entryOffset + 4, 1, true);

    // Bits per pixel (2 bytes, 32 位 RGBA)
    view.setUint16(entryOffset + 6, 32, true);

    // BytesInRes (4 bytes, 图像数据的字节大小)
    view.setUint32(entryOffset + 8, imgLength, true);

    // ImageOffset (4 bytes, 图像数据相对于文件起点的绝对字节偏移量)
    view.setUint32(entryOffset + 12, currentOffset, true);

    // 3. 将图像 PNG 原始字节紧随其后写入数据区
    uint8.set(imgData, currentOffset);
    currentOffset += imgLength;
  }

  return new Blob([fileBuffer], { type: "image/x-icon" });
}

/**
 * 将 Canvas 转为 PNG 格式 Blob
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Blob>}
 */
export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas 导出 PNG 失败"));
      }
    }, "image/png");
  });
}

/**
 * 将 Blob 转为 ArrayBuffer
 * @param {Blob} blob
 * @returns {Promise<ArrayBuffer>}
 */
export function blobToArrayBuffer(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 将 Canvas 转为 DataURL (Base64)
 * @param {HTMLCanvasElement} canvas
 * @returns {string}
 */
export function canvasToDataUrl(canvas) {
  return canvas.toDataURL("image/png");
}

/**
 * 高质量缩放与构图绘制到指定分辨率的 Canvas
 * @param {HTMLImageElement | ImageBitmap} img
 * @param {number} size 目标像素大小（正方形 size x size）
 * @param {object} options 绘图配置项
 * @returns {HTMLCanvasElement}
 */
export function renderImageToCanvas(img, size, options = {}) {
  const {
    fit = "contain", // 'contain' | 'cover' | 'fill'
    padding = 0, // 0 ~ 0.4 (内缩百分比)
    shape = "square", // 'square' | 'rounded' | 'circle'
    borderRadiusRatio = 0.2, // 0 ~ 0.5 (圆角占尺寸比例)
    backgroundColor = "transparent", // 'transparent' 或 CSS 颜色
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // 开启高品质图像平滑插值算法 (双三次 / Lanczos)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. 如果有形状裁剪（圆角或圆形），创建裁剪路径
  if (shape === "circle") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (shape === "rounded") {
    const radius = size * Math.min(Math.max(borderRadiusRatio, 0.05), 0.5);
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.arcTo(size, 0, size, size, radius);
    ctx.arcTo(size, size, 0, size, radius);
    ctx.arcTo(0, size, 0, 0, radius);
    ctx.arcTo(0, 0, size, 0, radius);
    ctx.closePath();
    ctx.clip();
  }

  // 2. 绘制背景颜色
  if (backgroundColor && backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, size, size);
  }

  // 3. 计算绘制区域与缩放比例
  const padPixels = size * Math.min(Math.max(padding, 0), 0.45);
  const drawAreaSize = size - padPixels * 2;
  const originW = img.naturalWidth || img.width;
  const originH = img.naturalHeight || img.height;

  let dw = drawAreaSize;
  let dh = drawAreaSize;
  let dx = padPixels;
  let dy = padPixels;

  if (fit === "fill") {
    // 强制拉伸
    ctx.drawImage(img, dx, dy, dw, dh);
  } else if (fit === "contain") {
    // 等比缩放居中留空
    const scale = Math.min(drawAreaSize / originW, drawAreaSize / originH);
    dw = originW * scale;
    dh = originH * scale;
    dx = padPixels + (drawAreaSize - dw) / 2;
    dy = padPixels + (drawAreaSize - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
  } else if (fit === "cover") {
    // 等比居中裁剪铺满
    const scale = Math.max(drawAreaSize / originW, drawAreaSize / originH);
    const sw = drawAreaSize / scale;
    const sh = drawAreaSize / scale;
    const sx = (originW - sw) / 2;
    const sy = (originH - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  return canvas;
}

/**
 * 快速根据源图像生成各指定分辨率的 PNG Buffers 并打包为 ICO
 * @param {HTMLImageElement | ImageBitmap} img
 * @param {number[]} sizes 需要包含的尺寸列表，例如 [16, 32, 48, 64]
 * @param {object} options
 * @returns {Promise<{ icoBlob: Blob, previews: Record<number, string>, pngBlobs: Record<number, Blob> }>}
 */
export async function generateIcoFromImage(img, sizes = [16, 32, 48], options = {}) {
  // 确保尺寸去重且升序
  const sortedSizes = Array.from(new Set(sizes)).sort((a, b) => a - b);
  const pngItems = [];
  const previews = {};
  const pngBlobs = {};

  for (const size of sortedSizes) {
    const canvas = renderImageToCanvas(img, size, options);
    const dataUrl = canvasToDataUrl(canvas);
    previews[size] = dataUrl;

    const blob = await canvasToPngBlob(canvas);
    pngBlobs[size] = blob;
    const buffer = await blobToArrayBuffer(blob);

    pngItems.push({
      width: size,
      height: size,
      buffer,
    });
  }

  const icoBlob = createIcoFromPngBuffers(pngItems);

  return {
    icoBlob,
    previews,
    pngBlobs,
  };
}

/**
 * 从任何 File 对象加载为 HTMLImageElement (支持 PNG, JPG, WebP, SVG, GIF, BMP 等)
 * @param {File | Blob} file
 * @returns {Promise<{ img: HTMLImageElement, objectUrl: string, width: number, height: number, name: string, size: number }>}
 */
export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      resolve({
        img,
        objectUrl,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        name: file.name || "icon",
        size: file.size,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("图片格式解析失败或损坏，请尝试其他图片"));
    };

    img.src = objectUrl;
  });
}

/**
 * 生成现代 Web 标准全套 Favicon 资源包内容清单
 * 包含：favicon.ico (16,32,48多尺寸), 各尺寸 PNG, apple-touch-icon, manifest 及 HTML 代码
 */
export const WEB_FAVICON_PRESET = [
  { size: 16, filename: "favicon-16x16.png", desc: "标准标签页图标" },
  { size: 32, filename: "favicon-32x32.png", desc: "Retina 高清标签页" },
  { size: 48, filename: "favicon-48x48.png", desc: "Windows 桌面与书签" },
  { size: 180, filename: "apple-touch-icon.png", desc: "iOS Safari 桌面图标" },
  { size: 192, filename: "android-chrome-192x192.png", desc: "Android PWA 图标" },
  { size: 512, filename: "android-chrome-512x512.png", desc: "高清启动开屏图" },
];

/**
 * 生成配套的标准 HTML head 代码
 * @param {string} siteName
 * @returns {string}
 */
export function generateHtmlHeadSnippet(siteName = "My Website") {
  return `<!-- Favicon & Touch Icons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#ffffff">`;
}

/**
 * 生成配套的标准 site.webmanifest 内容
 * @param {string} siteName
 * @returns {string}
 */
export function generateWebManifestContent(siteName = "My Website") {
  return JSON.stringify(
    {
      name: siteName,
      short_name: siteName,
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      theme_color: "#ffffff",
      background_color: "#ffffff",
      display: "standalone",
    },
    null,
    2
  );
}
