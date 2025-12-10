<template>
  <div class="home-container">
    <!-- 场景1: 也就是用户刚打开，或者没有扫码进来，显示选择菜单 -->
    <div v-if="!currentComponent" class="menu-container animate-fade-in">
      <div class="logo-area">
        <h1>⚡️ 极速快传</h1>
        <p>请选择传输方式</p>
      </div>

      <div class="selection-cards">
        <!-- 卡片1: 局域网 -->
        <div class="card local" @click="selectMode('Local')">
          <div class="icon">📡</div>
          <h3>局域网直连</h3>
          <p>速度极快 • 不耗流量 • 需同一WiFi</p>
        </div>

        <!-- 卡片2: 公网 -->
        <div class="card cloud" @click="selectMode('Cloudflare')">
          <div class="icon">☁️</div>
          <h3>公网中转</h3>
          <p>跨网络 • 需互联网 • 24小时有效</p>
        </div>
      </div>
    </div>

    <!-- 场景2: 已经选择了模式，或者扫码自动跳转进来了 -->
    <div v-else class="component-wrapper">
      <!-- 加一个返回按钮，方便用户切回首页 -->
      <div class="back-bar">
        <a-button type="primary" @click="goBack"> <ArrowLeftOutlined /> 返回 </a-button>
      </div>

      <!-- 动态组件渲染 -->
      <component :is="currentComponent" />
    </div>
  </div>
</template>

<script lang="jsx">
import Local from "./components/Local.vue";
import Cloudflare from "./components/CF.vue";
import { Modal } from "ant-design-vue";
import { ArrowLeftOutlined } from "@ant-design/icons-vue";
export default {
  name: "App",
  components: {
    Local,
    Cloudflare,
    ArrowLeftOutlined,
  },
  data() {
    return {
      // 默认为空，表示显示“选择菜单”
      currentComponent: null,
    };
  },
  mounted() {
    this.handleAutoRoute();
    // this.checkDisclaimer();
  },
  methods: {
    // 核心逻辑：解析 URL 参数实现自动跳转
    handleAutoRoute() {
      const params = new URLSearchParams(window.location.search);
      const type = params.get("type"); // 我们约定用 type 参数区分

      // 1. 如果 URL 里明确带了 type=local 或 包含 connect 参数(P2P连接ID)
      if (type === "local" || params.has("connect")) {
        this.currentComponent = "Local";
      }
      // 2. 如果 URL 里明确带了 type=cf 或 包含 down 参数(CF下载码)
      else if (type === "cf" || params.has("down")) {
        this.currentComponent = "Cloudflare";
      }
      // 3. 否则保持 null，显示选择菜单
    },

    selectMode(componentName) {
      this.currentComponent = componentName;
    },

    goBack() {
      this.currentComponent = null;
      // 清除 URL 里的参数，防止刷新又跳回去了 (可选)
      const url = new URL(window.location.href);
      url.search = "";
      window.history.pushState({}, "", url);
    },
    checkDisclaimer() {
      const hasAgreed = localStorage.getItem("agreed_disclaimer");
      if (!hasAgreed) {
        Modal.info({
          title: "用户使用协议与免责声明",
          content: (
            <div>
              <p>1. 本工具仅用于技术研究与个人设备间文件传输。</p>
              <p>
                2. <b>严禁传输涉黄、涉政、暴力等违法违规文件。</b>
              </p>
              <p>3. 局域网模式基于 P2P 技术，文件不经过第三方服务器。</p>
              <p>4. 作者不对用户传输的内容承担任何法律责任。</p>
            </div>
          ),
          okText: "我已知晓并同意",
          centered: true,
          onOk: () => {
            localStorage.setItem("agreed_disclaimer", "true");
          },
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.home-container {
  height: 100%;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.menu-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;

  .logo-area {
    text-align: center;
    margin-bottom: 40px;
    h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #333;
    }
    p {
      color: #888;
    }
  }

  .selection-cards {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    justify-content: center;

    .card {
      background: #fff;
      width: 340px;
      padding: 30px 0;
      border-radius: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.4s ease-in-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      border: 2px solid transparent;

      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      }

      .icon {
        font-size: 40px;
        margin-bottom: 15px;
      }
      h3 {
        margin-bottom: 5px;
        color: #333;
      }
      p {
        font-size: 12px;
        color: #999;
        margin: 0;
      }

      &.local:hover {
        border: 2px solid #00bf8f;
      }
      &.cloud:hover {
        border: 2px solid #fa8c16;
      }
    }
  }
}

.component-wrapper {
  padding-bottom: 20px;
  height: 100%;

  .back-bar {
    padding: 10px 20px;
    max-width: 480px;
    margin: 0 auto;
    background-color: #88888811;
  }
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
</style>
