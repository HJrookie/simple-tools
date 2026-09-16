/**
 * 工业级端侧模型存储引擎：OPFS (Origin Private File System) 优先 + IndexedDB 双轨兼容
 * OPFS 提供极低延迟、零结构化克隆序列化损耗的本地私有文件系统存储
 * 若浏览器不支持 OPFS，自动无缝降级到 IndexedDB
 */

const DB_NAME = "SuperResolutionModelsDB";
const STORE_NAME = "models";
const DB_VERSION = 1;
const OPFS_DIR_NAME = "sr_models";

/**
 * 检测当前环境是否支持 OPFS
 * @returns {Promise<boolean>}
 */
export async function isOPFSSupported() {
  return typeof navigator !== "undefined" && !!navigator.storage && typeof navigator.storage.getDirectory === "function";
}

/**
 * 获取 OPFS 根目录
 */
async function getOPFSDir() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(OPFS_DIR_NAME, { create: true });
}

// ================= IndexedDB 降级实现 =================
function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 检查模型是否已缓存 (优先检测 OPFS，其次检测 IDB)
 * @param {string} modelId
 * @returns {Promise<boolean>}
 */
export async function hasModelCached(modelId) {
  // 1. 尝试 OPFS
  if (await isOPFSSupported()) {
    try {
      const dir = await getOPFSDir();
      await dir.getFileHandle(`${modelId}.onnx`, { create: false });
      return true;
    } catch (e) {
      // 未找到，继续尝试检查 IDB
    }
  }

  // 2. 尝试 IndexedDB
  try {
    const db = await openIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(modelId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

/**
 * 获取已缓存模型的 ArrayBuffer (优先 OPFS 零拷贝流)
 * @param {string} modelId
 * @returns {Promise<ArrayBuffer | null>}
 */
export async function getCachedModelBuffer(modelId) {
  // 1. OPFS
  if (await isOPFSSupported()) {
    try {
      const dir = await getOPFSDir();
      const fileHandle = await dir.getFileHandle(`${modelId}.onnx`, { create: false });
      const file = await fileHandle.getFile();
      return await file.arrayBuffer();
    } catch (e) {
      // OPFS 中不存在，降级检查 IDB
    }
  }

  // 2. IndexedDB
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(modelId);
      req.onsuccess = () => {
        if (req.result && req.result.buffer) {
          resolve(req.result.buffer);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

/**
 * 保存模型 ArrayBuffer 到本地 (优先使用 OPFS 流式写入)
 * @param {string} modelId
 * @param {ArrayBuffer} buffer
 * @returns {Promise<void>}
 */
export async function saveModelBuffer(modelId, buffer) {
  // 1. 优先存入 OPFS
  if (await isOPFSSupported()) {
    try {
      const dir = await getOPFSDir();
      const fileHandle = await dir.getFileHandle(`${modelId}.onnx`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(buffer);
      await writable.close();
      return;
    } catch (e) {
      console.warn("写入 OPFS 失败，降级使用 IndexedDB", e);
    }
  }

  // 2. 降级存入 IndexedDB
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: modelId,
        buffer,
        size: buffer.byteLength,
        savedAt: Date.now(),
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("保存到 IndexedDB 失败", err);
  }
}

/**
 * 清除指定模型的本地缓存
 * @param {string} modelId
 * @returns {Promise<void>}
 */
export async function removeCachedModel(modelId) {
  if (await isOPFSSupported()) {
    try {
      const dir = await getOPFSDir();
      await dir.removeEntry(`${modelId}.onnx`);
    } catch (e) {}
  }

  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(modelId);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (err) {}
}

/**
 * 流式下载并持久化模型，提供精准下载进度
 * @param {string} modelId
 * @param {string} url
 * @param {(progress: number) => void} onProgress
 * @returns {Promise<ArrayBuffer>}
 */
export async function downloadAndCacheModel(modelId, url, onProgress = null) {
  const cached = await getCachedModelBuffer(modelId);
  if (cached) {
    if (onProgress) onProgress(100);
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`模型下载失败，HTTP 状态码: ${response.status}`);
  }

  const contentLength = response.headers.get("content-length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;

  if (!response.body || total === 0) {
    const buf = await response.arrayBuffer();
    await saveModelBuffer(modelId, buf);
    if (onProgress) onProgress(100);
    return buf;
  }

  const reader = response.body.getReader();
  let received = 0;
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (onProgress) {
      onProgress(Math.round((received / total) * 100));
    }
  }

  const allChunks = new Uint8Array(received);
  let position = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, position);
    position += chunk.length;
  }

  const finalBuffer = allChunks.buffer;
  await saveModelBuffer(modelId, finalBuffer);
  return finalBuffer;
}
