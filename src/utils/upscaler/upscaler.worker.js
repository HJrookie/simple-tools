/**
 * 图片超分辨率独立 Web Worker 线程
 * 彻底将重计算、分块切片、ONNX 模型推理移出 UI 主线程，保障 120 FPS 流畅交互与零拷贝数据转移
 */

import { upscaleImage } from "./index.js";

let currentAbortController = null;
let currentTaskId = null;

self.onmessage = async function (e) {
  const { type, id, srcImageData, options } = e.data;

  if (type === "ABORT") {
    if (currentAbortController && currentTaskId === id) {
      currentAbortController.abort();
      currentAbortController = null;
      self.postMessage({ type: "ABORTED", id });
    }
    return;
  }

  if (type === "UPSCALE") {
    // 若上一任务尚未结束，先行中断
    if (currentAbortController) {
      currentAbortController.abort();
    }

    currentAbortController = new AbortController();
    currentTaskId = id;

    try {
      const { resultImageData, durationMs } = await upscaleImage(srcImageData, {
        ...options,
        abortSignal: currentAbortController.signal,
        onProgress: (pct, text) => {
          self.postMessage({
            type: "PROGRESS",
            id,
            pct,
            text,
          });
        },
      });

      // 零拷贝 Transferable 转移 ArrayBuffer
      self.postMessage(
        {
          type: "SUCCESS",
          id,
          resultImageData,
          durationMs,
        },
        [resultImageData.data.buffer]
      );
    } catch (err) {
      if (err.name === "AbortError" || currentAbortController?.signal.aborted) {
        self.postMessage({ type: "ABORTED", id });
      } else {
        self.postMessage({
          type: "ERROR",
          id,
          error: err.message || "Worker 处理失败",
        });
      }
    } finally {
      if (currentTaskId === id) {
        currentAbortController = null;
      }
    }
  }
};
