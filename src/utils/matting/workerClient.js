/**
 * 抠图 Web Worker 客户端代理
 * 提供与 Worker 的 Promise 异步封装、任务中断与回退机制
 */

import { runAIMatting } from "./mattingEngine.js";
import { runChromaMatting } from "./chromaMatting.js";

let workerInstance = null;
let activeTaskId = 0;
let activeReject = null;

function getWorker() {
  if (!workerInstance && typeof Worker !== "undefined") {
    try {
      workerInstance = new Worker(new URL("./matting.worker.js", import.meta.url), {
        type: "module",
      });
    } catch (e) {
      console.warn("无法启动抠图 Web Worker，平滑降级至主线程执行", e);
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * 毫秒级中断当前抠图计算
 */
export function abortMattingTask() {
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
 * 在独立 Worker 线程执行抠图 (保障 UI 120 FPS 响应)
 * @param {ImageData} srcImageData
 * @param {object} options
 * @param {(pct: number, text: string) => void} onProgress
 * @returns {Promise<{ resultImageData: ImageData, durationMs: number }>}
 */
export function removeBackgroundWithWorker(srcImageData, options = {}, onProgress = null) {
  const worker = getWorker();

  // 若环境不支持 Worker，回退至主线程
  if (!worker) {
    const startTime = performance.now();
    const runner =
      options.mode === "chroma"
        ? Promise.resolve(runChromaMatting(srcImageData, options))
        : runAIMatting(srcImageData, { ...options, onProgress });

    return runner.then((resultImageData) => ({
      resultImageData,
      durationMs: Math.round(performance.now() - startTime),
    }));
  }

  abortMattingTask();

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
        reject(new Error(error || "抠图处理异常"));
      }
    };

    worker.addEventListener("message", messageHandler);

    worker.postMessage({
      type: "MATTING",
      id: taskId,
      srcImageData,
      options,
    });
  });
}
