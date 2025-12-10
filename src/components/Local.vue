<template>
  <div class="app-container">
    <a-card class="main-card" :bordered="false">
      <!-- 标题栏 -->
      <template #title>
        <div class="header">
          <h1>⚡️ 极速直连</h1>

          <div class="status-bar">
            <!-- 连接状态浮层 (连上后自动消失) -->
            <a-tag :color="mqttConnected ? 'success' : 'error'" class="status-tag">
              <div v-if="!mqttConnected" class="status-pill connecting"><loading-outlined /> 信令连接中...</div>
              <div v-else class="status-pill connected"><check-circle-filled /> 就绪</div>
            </a-tag>

            <a-tag v-if="isConnected" color="blue" class="status-tag">
              <template #icon><link-outlined /></template>
              P2P 已连接
            </a-tag>
          </div>
        </div>
      </template>

      <!-- 1. 身份展示区 -->
      <div v-if="!isConnected" class="identity-section animate-fade-in">
        <div class="qr-wrapper">
          <div class="ambient-glow"></div>

          <div class="glass-content">
            <!-- 直接使用 img 标签，瞬开 -->
            <img v-if="qrCodeImg" :src="qrCodeImg" class="qr-image" />
          </div>
        </div>

        <div class="id-display">
          <span class="label">本机 ID</span>
          <span class="code">{{ myId }}</span>
          <div class="copy-btn" @click="copyId"><link-outlined /></div>
        </div>
        <p class="hint">利用国内 MQTT 加速握手，请确保两台设备在同一 WiFi</p>
      </div>

      <!-- ... 下面的连接控制区、传输区、日志区代码完全保持不变 ... -->
      <!-- 2. 连接控制区 -->
      <div v-if="!isConnected" class="connect-section animate-fade-in">
        <a-input-search v-model:value="targetId" placeholder="输入对方 ID" enter-button="连接" size="large" type="number" :loading="isConnecting" @search="connectToPeer" />
      </div>

      <!-- 3. 传输控制区 (已连接) -->
      <div v-else class="transfer-section animate-fade-in">
        <a-alert message="P2P 通道已建立" :description="`对方 ID: ${targetId} | 延迟极低`" type="success" show-icon class="status-alert" />

        <div class="action-area">
          <input type="file" ref="fileInput" style="display: none" accept="*/*" @change="handleFileSelect" />
          <a-button type="primary" size="large" block @click="triggerFileSelect">
            <template #icon><cloud-upload-outlined /></template>
            选择文件发送
          </a-button>
        </div>

        <!-- 进度卡片 -->
        <div v-if="transfer.isActive" class="progress-card">
          <div class="file-info">
            <span class="name text-ellipsis"> <file-text-outlined /> {{ transfer.fileName }} </span>
            <span class="speed">{{ transfer.speed }}</span>
          </div>

          <a-progress :percent="Number(transfer.percent)" :status="transfer.status" :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }" />

          <div class="meta-info">
            <span>{{ transfer.transferred }} / {{ transfer.total }}</span>
            <a-tag :color="transfer.type === 'sending' ? 'blue' : 'orange'">
              {{ transfer.type === "sending" ? "发送中" : "接收中" }}
            </a-tag>
          </div>
        </div>
      </div>

      <!-- 4. 日志区域 -->
      <div class="log-section">
        <div class="log-header" @click="showLogs = !showLogs">
          <span>通信日志</span>
          <down-outlined :rotate="showLogs ? 180 : 0" />
        </div>
        <div v-show="showLogs" class="log-content" ref="logContainer">
          <div v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
            <span class="time">[{{ log.time }}]</span> {{ log.msg }}
          </div>
        </div>
      </div>
    </a-card>
  </div>
</template>

<script>
import mqtt from "mqtt";
import QRCode from "qrcode";
import { message, Modal } from "ant-design-vue";
import {
  ThunderboltOutlined,
  LoadingOutlined,
  LinkOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  DownOutlined,
  CopyOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled, // 新增图标
} from "@ant-design/icons-vue";

// 常量配置
const MQTT_BROKER = "wss://broker-cn.emqx.io:8084/mqtt";
const CHUNK_SIZE = 64 * 1024;
const BUFFER_THRESHOLD = 1 * 1024 * 1024;
// 修改 Topic 前缀，防止跟别人的测试代码冲突
const TOPIC_PREFIX = "speed_share_public/";

export default {
  name: "LocalTransferNative",
  components: {
    ThunderboltOutlined,
    LoadingOutlined,
    LinkOutlined,
    CloudUploadOutlined,
    CopyOutlined,
    FileTextOutlined,
    DownOutlined,
    CheckCircleFilled,
    ExclamationCircleFilled,
  },
  data() {
    return {
      myId: Math.floor(Math.random() * 900000000) + 100000000 + "",
      targetId: "",
      mqttConnected: false,
      isConnecting: false,
      qrCodeImg: "",
      isConnected: false,
      showLogs: true,
      transfer: { isActive: false, fileName: "", percent: 0, speed: "0 KB/s", transferred: "0 B", total: "0 B", type: "sending", status: "active" },
      mqttClient: null,
      pc: null,
      dataChannel: null,
      incomingChunks: [],
      incomingMeta: null,
      receivedSize: 0,
      lastTime: 0,
      lastLoaded: 0,
      logs: [],
    };
  },
  created() {
    this.generateQRCodeBase64();
  },
  mounted() {
    this.initMQTT();
    // ⚠️ 修复点：必须调用这个函数，否则接收端扫码后不会自动连接
    this.checkUrlParams();
  },
  beforeUnmount() {
    this.destroyPeer();
  },
  methods: {
    // --- 极速生成二维码 (不依赖 DOM) ---
    async generateQRCodeBase64() {
      const url = window.location.href.split("?")[0] + "?type=local&connect=" + this.myId;
      try {
        // 使用 toDataURL 直接生成 Base64 图片字符串
        // errorCorrectionLevel: 'L' (Low) -> 码点最少，生成最快，识别最快
        this.qrCodeImg = await QRCode.toDataURL(url, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: "L",
          color: { dark: "#000000", light: "#ffffff00" }, // 背景透明
        });
      } catch (err) {
        console.error(err);
      }
    },
    // --- 1. MQTT 信令连接 ---
    initMQTT() {
      this.addLog("正在连接国内 MQTT 节点...", "info");

      this.mqttClient = mqtt.connect(MQTT_BROKER, {
        clientId: "fc_" + this.myId + "_" + Math.random().toString(16).substr(2, 4),
        keepalive: 60,
        clean: true,
        reconnectPeriod: 1000,
      });

      this.mqttClient.on("connect", () => {
        this.mqttConnected = true;
        this.addLog(`信令通道已连接 (EMQX CN)`, "success");
        // 订阅自己的频道
        this.mqttClient.subscribe(`${TOPIC_PREFIX}signal/${this.myId}`);
      });

      this.mqttClient.on("message", (topic, message) => {
        try {
          const signal = JSON.parse(message.toString());
          this.handleSignal(signal);
        } catch (e) {
          console.error("信令解析失败", e);
        }
      });

      this.mqttClient.on("error", (err) => {
        this.addLog(`MQTT 错误: ${err.message}`, "error");
        this.mqttConnected = false;
      });
    },
    // 补全 destroyPeer
    destroyPeer() {
      if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
      if (this.mqttClient) this.mqttClient.end();
      if (this.pc) this.pc.close();
      if (this.dataChannel) this.dataChannel.close();
    },
    // --- 2. 原生 WebRTC 核心逻辑 ---
    createPeerConnection() {
      if (this.pc) return;

      const config = {
        iceServers: [{ urls: "stun:stun.miwifi.com:3478" }, { urls: "stun:stun.qq.com:3478" }],
      };

      this.pc = new RTCPeerConnection(config);

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal("candidate", event.candidate);
        }
      };

      this.pc.onconnectionstatechange = () => {
        const state = this.pc.connectionState;
        this.addLog(`P2P 连接状态: ${state}`, state === "connected" ? "success" : "info");

        if (state === "connected") {
          this.isConnected = true;
          this.isConnecting = false;
          message.success("直连通道建立成功！");
        } else if (state === "disconnected" || state === "failed") {
          this.handleDisconnect();
        }
      };
    },

    async connectToPeer() {
      if (!this.targetId || !this.mqttConnected) return;
      if (this.targetId === this.myId) return message.warning("不能连接自己");

      this.isConnecting = true;
      this.addLog(`开始呼叫: ${this.targetId}...`, "info");

      this.createPeerConnection();
      this.dataChannel = this.pc.createDataChannel("fileTransfer", { ordered: true });
      this.setupDataChannelEvents();

      try {
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        this.sendSignal("offer", offer);
        this.addLog("已发送连接邀请 (Offer)", "info");
      } catch (e) {
        this.addLog(`创建 Offer 失败: ${e.message}`, "error");
        this.isConnecting = false;
      }
    },

    async handleSignal(data) {
      if (!this.pc) this.createPeerConnection();

      if (data.type === "offer") {
        this.targetId = data.from;
        this.addLog(`收到 ${data.from} 的连接请求`, "info");

        this.pc.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannelEvents();
        };

        await this.pc.setRemoteDescription(new RTCSessionDescription(data.payload));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignal("answer", answer);
      } else if (data.type === "answer") {
        this.addLog("对方已接受连接 (Answer)", "info");
        await this.pc.setRemoteDescription(new RTCSessionDescription(data.payload));
      } else if (data.type === "candidate") {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(data.payload));
        } catch (e) {}
      }
    },

    sendSignal(type, payload) {
      const msg = JSON.stringify({ from: this.myId, type, payload });
      this.mqttClient.publish(`${TOPIC_PREFIX}signal/${this.targetId}`, msg);
    },

    setupDataChannelEvents() {
      if (!this.dataChannel) return;
      this.dataChannel.binaryType = "arraybuffer";
      this.dataChannel.onopen = () => this.addLog("数据通道 Ready!", "success");

      this.dataChannel.onmessage = (event) => {
        const data = event.data;
        if (typeof data === "string") {
          const msg = JSON.parse(data);
          if (msg.type === "meta") this.handleIncomingMeta(msg);
          else if (msg.type === "end") this.handleIncomingEnd();
        } else if (data instanceof ArrayBuffer) {
          this.handleIncomingChunk(data);
        }
      };

      this.dataChannel.onerror = (err) => this.addLog(`通道错误: ${err.message}`, "error");
    },

    // --- 文件处理 ---
    triggerFileSelect() {
      this.$refs.fileInput.click();
    },

    async handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      e.target.value = "";
      this.initTransferState(file.name, file.size, "sending");
      this.addLog(`开始发送: ${file.name.slice(0, 20)}...`, "info");

      this.dataChannel.send(JSON.stringify({ type: "meta", name: file.name, size: file.size, mime: file.type }));

      let offset = 0;
      const total = file.size;

      while (offset < total) {
        if (!this.isConnected) break;
        if (this.dataChannel.bufferedAmount > BUFFER_THRESHOLD) {
          await new Promise((r) => setTimeout(r, 10));
          continue;
        }
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const buffer = await chunk.arrayBuffer();
        try {
          this.dataChannel.send(buffer);
        } catch (err) {
          break;
        }
        offset += buffer.byteLength;
        this.updateProgress(offset, total);
        if (offset % (CHUNK_SIZE * 5) === 0) await new Promise((r) => setTimeout(r, 0));
      }
      this.dataChannel.send(JSON.stringify({ type: "end" }));
      message.success("发送完成");
      setTimeout(() => (this.transfer.isActive = false), 3000);
    },

    handleIncomingMeta(meta) {
      this.incomingMeta = meta;
      this.incomingChunks = [];
      this.receivedSize = 0;
      this.initTransferState(meta.name, meta.size, "receiving");
    },

    handleIncomingChunk(buffer) {
      this.incomingChunks.push(buffer);
      this.receivedSize += buffer.byteLength;
      this.updateProgress(this.receivedSize, this.incomingMeta.size);
    },

    handleIncomingEnd() {
      this.addLog("接收完毕，合成文件中...", "success");
      const blob = new Blob(this.incomingChunks, { type: this.incomingMeta.mime });
      this.downloadBlob(blob, this.incomingMeta.name);
      this.incomingChunks = [];
      this.incomingMeta = null;
      message.success("接收完成");
      setTimeout(() => (this.transfer.isActive = false), 3000);
    },

    // --- 辅助方法 ---
    initTransferState(name, size, type) {
      this.transfer = { isActive: true, fileName: name, percent: 0, speed: "0 KB/s", transferred: "0 B", total: this.formatSize(size), type: type, status: "active" };
      this.lastTime = Date.now();
      this.lastLoaded = 0;
    },
    updateProgress(loaded, total) {
      const now = Date.now();
      if (now - this.lastTime >= 500 || loaded >= total) {
        const diffSize = loaded - this.lastLoaded;
        const diffTime = (now - this.lastTime) / 1000;
        const speedBytes = diffSize / diffTime;
        this.transfer.percent = ((loaded / total) * 100).toFixed(1);
        this.transfer.transferred = this.formatSize(loaded);
        this.transfer.speed = this.formatSize(speedBytes) + "/s";
        this.lastTime = now;
        this.lastLoaded = loaded;
      }
    },
    handleDisconnect() {
      this.addLog("连接中断", "error");
      this.isConnected = false;
      this.isConnecting = false;
      this.transfer.isActive = false;
      if (this.pc) {
        this.pc.close();
        this.pc = null;
      }
      Modal.warning({ title: "连接断开", content: "P2P 连接已断开，请重新连接。" });
    },
    cleanup() {
      if (this.mqttClient) this.mqttClient.end();
      if (this.pc) this.pc.close();
      if (this.dataChannel) this.dataChannel.close();
    },
    renderQRCode() {
      // 这里的 URL 加上了 type=local，确保 App.vue 能正确路由
      const url = window.location.href.split("?")[0] + "?type=local&connect=" + this.myId;
      this.$nextTick(() => {
        if (this.$refs.qrcodeCanvas) QRCode.toCanvas(this.$refs.qrcodeCanvas, url, { width: 180, margin: 1 });
      });
    },

    // --- 修复点：自动连接逻辑 ---
    checkUrlParams() {
      const urlParams = new URLSearchParams(window.location.search);
      const target = urlParams.get("connect");
      if (target && target !== this.myId) {
        this.targetId = target;
        this.addLog(`检测到目标 ID: ${target}，等待信令通道...`, "info");

        // 使用轮询等待 MQTT 连接成功
        const waitMqtt = setInterval(() => {
          if (this.mqttConnected) {
            clearInterval(waitMqtt);
            this.addLog("信令就绪，开始呼叫对方...", "info");
            this.connectToPeer();
          }
        }, 500); // 每0.5秒检查一次
      }
    },
    copyId() {
      // navigator.clipboard.writeText(this.myId).then(() => message.success("ID 已复制"));
      const link = `${window.location.origin}/?type=local&connect=${this.myId}`;
      navigator.clipboard
        .writeText(link)
        .then(() => {
          message.success("链接已复制，发给对方点开即可连接！");
        })
        .catch(() => {
          message.error("复制失败，请手动复制浏览器地址栏");
        });
    },
    addLog(msg, type = "info") {
      this.logs.unshift({ time: new Date().toLocaleTimeString(), msg, type });
      if (this.logs.length > 50) this.logs.pop();
    },
    formatSize(bytes) {
      if (bytes === 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },
    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
  },
};
</script>

<style lang="scss" scoped>
.app-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  height: calc(100% - 52px);
  width: 100%;
}

.main-card {
  width: 100%;
  max-width: 450px;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);

  .header {
    margin: 10px 0;
    text-align: center;
    h1 {
      margin-bottom: 8px;
      font-size: 22px;
      color: #333;
    }
    .status-bar {
      display: flex;
      justify-content: center;
      gap: 8px;
    }
  }

  .identity-section {
    text-align: center;
    margin-bottom: 16px;

    .id-display {
      font-size: 16px;
      color: #666;
      .code {
        font-family: monospace;
        font-size: 24px;
        font-weight: bold;
        color: #722ed1; // MQTT版用紫色区分
        letter-spacing: 2px;
        margin: 0 8px;
      }
    }
    .hint {
      font-size: 12px;
      color: #999;
      margin-top: 8px;
    }
  }

  .connect-section {
    margin-bottom: 24px;
  }

  .transfer-section {
    .status-alert {
      margin-bottom: 20px;
    }
    .action-area {
      margin-bottom: 24px;
    }

    .progress-card {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 16px;

      .file-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-weight: 500;
        .name {
          max-width: 70%;
          color: #333;
        }
        .speed {
          color: #108ee9;
        }
      }
      .meta-info {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
        font-size: 12px;
        color: #888;
      }
    }
  }

  .log-section {
    margin-top: 30px;
    border-top: 1px solid #eee;
    padding-top: 10px;
    .log-header {
      font-size: 12px;
      color: #999;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
    }
    .log-content {
      height: 120px;
      overflow-y: auto;
      background: #282c34;
      border-radius: 6px;
      padding: 8px;
      font-family: monospace;
      font-size: 11px;
      .log-item {
        margin-bottom: 2px;
        color: #abb2bf;
        &.info {
          color: #61afef;
        }
        &.success {
          color: #98c379;
        }
        &.error {
          color: #e06c75;
        }
      }
    }
  }
}

.text-ellipsis {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
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
.identity-section {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;

  .qr-wrapper {
    margin: 8px auto;
    width: 200px; // 稍微加大一点
    height: 200px;
    position: relative;
    border-radius: 32px; // 更大的圆角

    // --- 核心：Vision Pro 玻璃材质 ---
    background: rgba(255, 255, 255, 0.4); // 极低透明度的白
    backdrop-filter: blur(20px) saturate(180%); // 强模糊 + 增加饱和度
    -webkit-backdrop-filter: blur(20px) saturate(180%);

    // 玻璃边缘的高光 (模拟厚度)
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.1),
      // 柔和的投影
      inset 0 0 0 1px rgba(255, 255, 255, 0.5); // 内发光

    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

    .qr-image {
      width: 90%; // 稍微留点边距
      height: 90%;
      object-fit: contain;
      opacity: 0.9;
      display: block;
    }

    // 状态小药丸 (显示在二维码中间或底部)
    .status-pill {
      position: absolute;
      bottom: 16px;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;

      &.connecting {
        background: rgba(255, 255, 255, 0.9);
        color: #666;
        border: 1px solid rgba(0, 0, 0, 0.05);
      }

      &.connected {
        background: rgba(246, 255, 237, 0.95);
        color: #52c41a;
        border: 1px solid #b7eb8f;
        animation: fadeOut 3s forwards; // 3秒后自动消失，不挡视线
      }
    }

    @keyframes fadeOut {
      0% {
        opacity: 1;
      }
      70% {
        opacity: 1;
      }
      100% {
        opacity: 0;
        visibility: hidden;
      }
    }

    // --- 新增：流动的环境光晕 ---
    .ambient-glow {
      position: absolute;
      width: 150%;
      height: 150%;
      top: -25%;
      left: -25%;
      background: conic-gradient(
        from 0deg,
        transparent 0deg,
        rgba(138, 43, 226, 0.05) 60deg,
        // 极淡的紫
        rgba(0, 191, 143, 0.05) 120deg,
        // 极淡的绿
        transparent 180deg,
        rgba(138, 43, 226, 0.05) 240deg,
        rgba(0, 191, 143, 0.05) 300deg,
        transparent 360deg
      );
      filter: blur(40px); // 极度模糊，形成光晕
      animation: rotateGlow 10s linear infinite; // 缓慢旋转
      z-index: 0;
    }

    // 内容层需要设置 z-index 在光晕之上
    .glass-content {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    // --- iOS Spinner 保持不变 ---
    .ios-loading-state {
      gap: 24px;
      .spinner {
        position: relative;
        width: 36px;
        height: 36px;
        .bar {
          width: 8%;
          height: 26%;
          background: #333; // 加深一点颜色，因为玻璃有透明度
          position: absolute;
          left: 46%;
          top: 37%;
          opacity: 0;
          border-radius: 50px;
          animation: fade 1s linear infinite;
        }
        @for $i from 1 through 12 {
          .bar:nth-child(#{$i}) {
            animation-delay: -#{1 - ($i - 1) * 0.0833}s;
          }
        }
      }
      .status-text {
        font-family: -apple-system, sans-serif;
        font-size: 13px;
        color: #666;
        font-weight: 500;
        letter-spacing: 0.5px;
      }
    }

    // --- 二维码微调 ---
    .qr-content {
      padding: 24px;
      canvas {
        width: 100% !important;
        height: 100% !important;
        display: block;
        // 稍微降低一点透明度，让它看起来是印在玻璃上的
        opacity: 0.85;
        mix-blend-mode: multiply; // 正片叠底，去白边
      }
    }
  }

  // --- 优化 ID 显示 (更像验证码) ---
  .id-display {
    display: inline-flex;
    align-items: center;
    background: #f5f5f7; // iOS 浅灰背景
    padding: 4px 12px 4px 20px;
    border-radius: 10px;
    gap: 12px;
    margin-bottom: 12px;
    border: 1px solid rgba(0, 0, 0, 0.03);

    .label {
      font-size: 12px;
      color: #86868b;
      font-weight: 600;
      text-transform: uppercase;
    }

    .code {
      font-family: "SF Mono", "Menlo", monospace; // 等宽字体
      font-size: 24px;
      font-weight: 700;
      color: #1d1d1f; // Apple 黑
      letter-spacing: 2px;
    }

    .copy-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #007aff; // iOS 蓝
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      transition: all 0.2s;

      &:hover {
        transform: scale(1.05);
        background: #007aff;
        color: #fff;
      }
      &:active {
        transform: scale(0.95);
      }
    }
  }

  .hint {
    font-size: 12px;
    color: #86868b;
    margin-top: 8px;
  }
}

// 动画定义
@keyframes rotateGlow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInSlow {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fade {
  from {
    opacity: 1;
  }
  to {
    opacity: 0.25;
  }
}
</style>
