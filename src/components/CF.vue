<template>
  <div class="cloud-transfer-app">
    <a-card class="main-card" :bordered="false">
      <template #title>
        <div class="header">
          <h1>☁️ 云端中转快传 <a-tag color="orange">公网版</a-tag></h1>
          <p class="subtitle">基于 Cloudflare R2 • 24小时临时存储</p>
        </div>
      </template>

      <!-- 顶部标签页切换 -->
      <a-tabs v-model:activeKey="activeTab" centered size="large" class="custom-tabs">
        <!-- Tab 1: 发送 -->
        <a-tab-pane key="send" tab="我要发送">
          <div class="tab-content animate-fade-in">
            <!-- 上传前：选择区域 -->
            <div v-if="uploadStatus === 'idle'" class="upload-trigger">
              <input type="file" ref="fileInput" style="display: none" @change="handleFileSelect" />
              <div class="upload-box" @click="triggerFileSelect">
                <cloud-upload-outlined class="icon" />
                <div class="text">点击选择文件上传</div>
                <div class="sub-text">支持任意文件类型，最大 10GB</div>
              </div>
            </div>

            <!-- 上传中：进度条 -->
            <div v-else-if="uploadStatus === 'uploading'" class="progress-section">
              <div class="file-info"><file-outlined /> {{ currentFile.name }}</div>
              <a-progress :percent="uploadProgress" :status="uploadProgress === 100 ? 'success' : 'active'" :stroke-color="{ '0%': '#fa8c16', '100%': '#ffd591' }" />
              <div class="status-text">
                正在上传... {{ uploadProgress }}%
                <a-tag color="processing">{{ speed }}</a-tag>
              </div>
            </div>

            <!-- 上传后：结果展示 -->
            <div v-else-if="uploadStatus === 'success'" class="result-section">
              <a-result status="success" title="上传成功！" sub-title="请将取件码或二维码分享给对方" class="result-box">
                <template #extra>
                  <div class="code-box">
                    <div class="label">取件码</div>
                    <div class="code">{{ shareCode }}</div>
                  </div>

                  <div class="qr-box">
                    <canvas ref="qrcodeCanvas"></canvas>
                  </div>

                  <div class="actions">
                    <a-button type="primary" shape="round" @click="copyLink"> <copy-outlined /> 复制下载链接 </a-button>
                    <a-button shape="round" @click="resetUpload"> 继续发送 </a-button>
                  </div>
                </template>
              </a-result>
            </div>
          </div>
        </a-tab-pane>

        <!-- Tab 2: 接收 -->
        <a-tab-pane key="receive" tab="我要接收">
          <div class="tab-content animate-fade-in receive-mode">
            <div class="input-wrapper">
              <a-input-search v-model:value="inputCode" placeholder="请输入 6 位取件码" enter-button="立即下载" size="large" @search="handleDownload">
                <template #prefix>
                  <number-outlined />
                </template>
              </a-input-search>
            </div>

            <div class="tips">
              <p>💡 提示：文件有效期为 24 小时</p>
              <p>如果使用微信扫码，请点击右上角选择“在浏览器打开”</p>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 配置提示 (如果用户忘改 URL) -->
      <a-alert v-if="workerUrl.includes('你的worker域名')" message="配置错误" description="请在代码中修改 WORKER_URL 为你的 Cloudflare Worker 地址" type="error" show-icon style="margin-top: 20px" />
    </a-card>
  </div>
</template>

<script>
import QRCode from "qrcode";
import { message, Modal, notification } from "ant-design-vue";
import { CloudUploadOutlined, FileOutlined, CopyOutlined, NumberOutlined } from "@ant-design/icons-vue";
// fix 上传失败: Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from 'RequestInit': String contains non ISO-8859-1 code point.
import axios from "axios"; // 引入 axios
// --- 配置 ---
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB 分片
const CONCURRENCY = 6; // 并发数：同时上传 6 个分片

export default {
  name: "CloudTransfer",
  components: {
    CloudUploadOutlined,
    FileOutlined,
    CopyOutlined,
    NumberOutlined,
  },
  data() {
    return {
      workerUrl: import.meta.env.VITE_WORKER_URL, // 从环境变量获取 Worker URL
      activeTab: "send",
      uploadStatus: "idle",
      uploadProgress: 0,
      currentFile: null,
      shareCode: "",
      inputCode: "",
      // 新增：用于计算实时速度
      lastLoaded: 0,
      lastTime: 0,
      speed: "0 KB/s",
    };
  },
  mounted() {
    this.checkAutoDownload();

    if (!this.workerUrl) {
      notification.warning({
        message: "未配置后端地址",
        description: "请在代码或 .env 文件中配置 VITE_WORKER_URL，否则无法使用公网传输。",
        duration: 0,
      });
    }
  },
  methods: {
    triggerFileSelect() {
      this.$refs.fileInput.click();
    },

    handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = "";
      this.currentFile = file;
      this.startUpload(file);
    },

    // --- 核心修改：并行分片上传 ---
    async startUpload(file) {
      this.uploadStatus = "uploading";
      this.uploadProgress = 0;
      this.lastLoaded = 0;
      this.lastTime = Date.now();

      const code = Math.floor(Math.random() * 900000) + 100000 + "";
      this.shareCode = code;

      // 1. 初始化 Axios 实例
      const request = axios.create({ baseURL: this.workerUrl, timeout: 0 });

      let uploadId;
      try {
        // 2. 获取 uploadId
        const { data: startData } = await request.post(`/start-upload?key=${code}`, null, {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-File-Name": encodeURIComponent(file.name),
          },
        });
        uploadId = startData.uploadId;
      } catch (e) {
        return this.handleError("初始化失败，请检查网络");
      }

      // 3. 准备分片
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const chunkUploadTasks = [];
      const chunksProgress = new Array(totalChunks).fill(0); // 记录每个分片进度

      // 辅助函数：带重试机制的上传
      const uploadChunkWithRetry = async (url, chunk, index, retries = 3) => {
        try {
          const { data } = await request.put(url, chunk, {
            headers: { "Content-Type": "application/octet-stream" },
            onUploadProgress: (evt) => {
              if (evt.total) {
                chunksProgress[index] = evt.loaded;
                this.updateTotalProgress(file.size, chunksProgress);
              }
            },
          });
          // 确保返回的数据里有 etag
          if (!data.etag) throw new Error("No ETag in response");
          return data;
        } catch (error) {
          if (retries > 0) {
            console.warn(`分片 ${index + 1} 失败，重试中... (剩余 ${retries} 次)`);
            await new Promise((r) => setTimeout(r, 1000)); // 等待1秒后重试
            return uploadChunkWithRetry(url, chunk, index, retries - 1);
          }
          throw error;
        }
      };

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partNumber = i + 1;

        // 封装任务：返回 { partNumber, etag }
        const task = () => uploadChunkWithRetry(`/upload-part?key=${code}&uploadId=${uploadId}&partNumber=${partNumber}`, chunk, i).then((data) => ({ partNumber, etag: data.etag }));

        chunkUploadTasks.push(task);
      }

      // 4. 并发执行
      let uploadedParts = [];
      try {
        // 使用并发池执行
        const results = [];
        let currentIndex = 0;
        const execute = async () => {
          while (currentIndex < chunkUploadTasks.length) {
            const taskIndex = currentIndex++;
            const task = chunkUploadTasks[taskIndex];
            results[taskIndex] = await task();
          }
        };

        const workers = Array(Math.min(CONCURRENCY, chunkUploadTasks.length))
          .fill(null)
          .map(() => execute());

        await Promise.all(workers);
        uploadedParts = results;
      } catch (error) {
        console.error(error);
        return this.handleError("网络不稳定，分片上传失败");
      }

      // 5. 核心修复：合并前强制排序
      // R2/S3 要求必须按 partNumber 升序排列，否则报 500 错误
      uploadedParts.sort((a, b) => a.partNumber - b.partNumber);

      // 防御性检查：确保所有分片都存在且有 ETag
      if (uploadedParts.some((p) => !p || !p.etag)) {
        return this.handleError("分片数据完整性校验失败");
      }

      // 6. 发送合并请求
      try {
        await request.post(`/complete-upload?key=${code}&uploadId=${uploadId}`, uploadedParts);

        this.uploadStatus = "success";
        this.$nextTick(() => this.renderQRCode());
        message.success("上传成功");
      } catch (e) {
        // 如果合并失败，打印具体错误以便调试
        console.error("合并失败详情:", e.response?.data || e.message);
        return this.handleError("文件合并失败，请重试");
      }
    },
    // 核心优化：计算总进度和速度
    updateTotalProgress(totalSize, chunksProgress) {
      // 累加所有分片已上传的字节数
      const totalLoaded = chunksProgress.reduce((acc, curr) => acc + curr, 0);
      const percent = Math.min(Math.round((totalLoaded / totalSize) * 100), 99); // 留1%给合并

      this.uploadProgress = percent;

      // 计算速度 (每500ms更新一次显示，防止跳动太快)
      const now = Date.now();
      if (now - this.lastTime >= 500) {
        const diffLoaded = totalLoaded - this.lastLoaded;
        const diffTime = (now - this.lastTime) / 1000;
        const speedBytes = diffLoaded / diffTime;

        this.speed = this.formatSize(speedBytes) + "/s";

        this.lastTime = now;
        this.lastLoaded = totalLoaded;
      }
    },
  
    formatSize(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
    },

    handleError(msg) {
      this.uploadStatus = "idle";
      message.error(msg);
      console.error(msg);
    },
    resetUpload() {
      this.uploadStatus = "idle";
      this.uploadProgress = 0;
      this.currentFile = null;
      this.shareCode = "";
      this.speed = "0 KB/s";
    },

    renderQRCode() {
      const downloadUrl = window.location.href.split("?")[0] + "?type=cf&down=" + this.shareCode;

      QRCode.toCanvas(
        this.$refs.qrcodeCanvas,
        downloadUrl,
        {
          width: 160,
          margin: 1,
          color: { dark: "#333", light: "#fff" },
        },
        (error) => {
          if (error) console.error(error);
        }
      );
    },

    copyLink() {
      const downloadUrl = `${window.location.href.split("?")[0]}?type=cf&down=${this.shareCode}`;

      navigator.clipboard.writeText(downloadUrl).then(() => {
        message.success("链接已复制到剪贴板");
      });
    },

    handleDownload() {
      const code = this.inputCode.trim();
      if (!code || code.length !== 6 || isNaN(code)) {
        return message.warning("请输入正确的 6 位数字取件码");
      }
      message.loading({ content: "正在请求下载...", key: "dl" });

      const link = document.createElement("a");
      link.href = `${this.workerUrl}/${code}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        message.success({ content: "已开始下载", key: "dl", duration: 2 });
      }, 1000);
    },

    checkAutoDownload() {
      const that = this;
      const params = new URLSearchParams(window.location.search);
      const downCode = params.get("down");
      if (downCode) {
        that.activeTab = "receive";
        that.inputCode = downCode;
        // 稍微延迟一下自动下载，给用户反应时间
        setTimeout(() => {
          Modal.confirm({
            title: "接收文件",
            centered: true,
            cancelText: "取消",
            okText: "立即下载",
            content: `检测到取件码 ${downCode}，是否立即下载？`,
            onOk: () => {
              that.handleDownload();
            },
          });
        }, 300);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
// 全局背景设定
body {
  background-color: #fff7e675; // 浅橙色背景，配合 CF 的橙色风格
  margin: 0;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cloud-transfer-app {
  display: flex;
  justify-content: center;
  align-items: center;
  height: calc(100% - 52px);
  padding: 20px;

  .main-card {
    width: 100%;
    max-width: 480px;
    border-radius: 16px;
    box-shadow: 0 8px 30px rgba(246, 130, 31, 0.1); // CF Orange shadow
    overflow: hidden;

    .header {
      text-align: center;
      margin: 10px 0;
      margin-bottom: 10px;

      h1 {
        font-size: 24px;
        color: #333;
        margin-bottom: 5px;
      }
      .subtitle {
        font-size: 10px;
        color: #999;
        font-weight: normal;
      }
    }

    // 自定义 Tabs 样式
    .custom-tabs {
      .ant-tabs-nav::before {
        border-bottom: 1px solid #f0f0f0;
      }
    }

    .tab-content {
      padding: 20px 10px;
      min-height: 300px;
      display: flex;
      flex-direction: column;
      justify-content: center;

      // 1. 上传触发区
      .upload-trigger {
        .upload-box {
          border: 2px dashed #ffd591;
          background: #fffaf0;
          border-radius: 12px;
          height: 240px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease-in-out;
          color: #fa8c16;

          &:hover {
            border-color: #fa8c16;
            background: #fff1dd;
            transform: scale(1.02);
          }

          .icon {
            font-size: 48px;
            margin-bottom: 15px;
          }
          .text {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .sub-text {
            font-size: 12px;
            color: #ffbb96;
          }
        }
      }

      // 2. 进度条区域
      .progress-section {
        text-align: center;
        padding: 20px;

        .file-info {
          font-size: 16px;
          color: #555;
          margin-bottom: 20px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .status-text {
          margin-top: 10px;
          color: #888;
        }
      }

      // 3. 结果区域
      .result-section {
        .result-box {
          //   :deep(&.ant-result) {
          padding: 0px;
          .ant-result-icon > .anticon {
            font-size: 36px;
          }
          //   }
        }
        .code-box {
          text-align: center;
          background: #f5f5f5;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 15px;

          .label {
            font-size: 10px;
            color: #999;
          }
          .code {
            font-family: monospace;
            font-size: 32px;
            font-weight: bold;
            color: #333;
            letter-spacing: 4px;
          }
        }

        .qr-box {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;

          canvas {
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          }
        }

        .actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
      }

      // 4. 接收区域
      &.receive-mode {
        justify-content: flex-start;
        padding-top: 40px;

        .input-wrapper {
          margin-bottom: 40px;
        }

        .tips {
          text-align: center;
          color: #aaa;
          font-size: 13px;
          line-height: 1.8;
          background: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
      }
    }
  }
}
</style>
