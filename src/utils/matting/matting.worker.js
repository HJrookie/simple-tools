/**
 * 端侧抠图独立 Web Worker 线程
 * 彻底消除 AI 推理、张量归一化与掩码高阶插值对 UI 主线程的性能开销，保障 120 FPS 交互
 */

import { runAIMatting } from "./mattingEngine.js";
import { runChromaMatting } from "./chromaMatting.js";

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

  if (type === "MATTING") {
    if (currentAbortController) {
      currentAbortController.abort();
    }

    currentAbortController = new AbortController();
    currentTaskId = id;
    const startTime = performance.now();

    try {
      let resultImageData = null;

      if (options.mode === "chroma") {
        // 纯色 / 绿幕 / 白底极速魔棒
        resultImageData = runChromaMatting(srcImageData, options);
      } else {
        // AI 神经网络模式 (MODNet / RMBG-1.4)
        resultImageData = await runAIMatting(srcImageData, {
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
      }

      const durationMs = Math.round(performance.now() - startTime);

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
        console.error("Matting Worker Error:", err);
        self.postMessage({
          type: "ERROR",
          id,
          error: err.message || "抠图计算异常",
        });
      }
    } finally {
      if (currentTaskId === id) {
        currentAbortController = null;
      }
    }
  }
};
