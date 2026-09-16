/**
 * Web Worker 线程通信客户端
 * 提供主线程与 Worker 间的 Promise 异步抽象、AbortController 中断与错误恢复
 */

import { upscaleImage } from "./index.js";

let workerInstance = null;
let activeTaskId = 0;
let activeReject = null;

function getWorker() {
  if (!workerInstance && typeof Worker !== "undefined") {
    try {
      workerInstance = new Worker(new URL("./upscaler.worker.js", import.meta.url), {
        type: "module",
      });
    } catch (e) {
      console.warn("无法初始化 Web Worker，将平滑降级至主线程执行", e);
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * 主动中断当前正在运行的 Worker 任务
 */
export function abortUpscaleTask() {
  if (workerInstance && activeTaskId) {
    workerInstance.postMessage({ type: "ABORT", id: activeTaskId });
    if (activeReject) {
      activeReject(new DOMException("Task aborted by user", "AbortError"));
      activeReject = null;
    }
    activeTaskId = 0;
  }
}

/**
 * 在 Worker 线程中执行超分放大 (零阻塞 UI)
 * @param {ImageData} srcImageData
 * @param {object} options
 * @param {(pct: number, text: string) => void} onProgress
 * @returns {Promise<{ resultImageData: ImageData, durationMs: number }>}
 */
export function upscaleWithWorker(srcImageData, options = {}, onProgress = null) {
  const worker = getWorker();

  // 若环境不支持 Worker，回退到主线程
  if (!worker) {
    return upscaleImage(srcImageData, { ...options, onProgress });
  }

  // 中断之前可能还在进行的任务
  abortUpscaleTask();

  const taskId = ++activeTaskId;

  return new Promise((resolve, reject) => {
    activeReject = reject;

    const messageHandler = (e) => {
      const { type, id, resultImageData, durationMs, pct, text, error } = e.data;
      if (id !== taskId) return;

      if (type === "PROGRESS") {
        if (onProgress) onProgress(pct, text);
      } else if (type === "SUCCESS") {
        worker.removeEventListener("message", messageHandler);
        if (activeTaskId === taskId) {
          activeTaskId = 0;
          activeReject = null;
        }
        resolve({ resultImageData, durationMs });
      } else if (type === "ABORTED") {
        worker.removeEventListener("message", messageHandler);
        reject(new DOMException("Task aborted by user", "AbortError"));
      } else if (type === "ERROR") {
        worker.removeEventListener("message", messageHandler);
        reject(new Error(error || "Worker 执行异常"));
      }
    };

    worker.addEventListener("message", messageHandler);

    // 将 srcImageData 传递给 Worker (可零拷贝转移)
    worker.postMessage(
      {
        type: "UPSCALE",
        id: taskId,
        srcImageData,
        options,
      }
    );
  });
}
