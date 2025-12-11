<!-- src/views/tools/NginxFormatter.vue -->
<template>
  <div>
    <!-- <a-page-header title="Nginx 配置检查 & 格式化" @back="() => this.$router.push('/')" /> -->
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>

    <a-row :gutter="16">
      <div class="button-container">
        <a-space>
          <a-button type="primary" :loading="isLoading" @click="checkSyntax">
            <template #icon><SearchOutlined /></template>
            检查语法
          </a-button>
          <a-button :loading="isLoading" @click="formatConfig">
            <template #icon><ApartmentOutlined /></template>
            格式化配置
          </a-button>
          <a-button danger @click="clearContent">
            <template #icon><ClearOutlined /></template>
            清空内容
          </a-button>
        </a-space>
      </div>

      <!-- 左侧：输入区域 -->
      <a-col :span="12">
        <a-typography-title :level="4">Nginx 配置输入</a-typography-title>
        <a-textarea v-model:value="nginxConfig" placeholder="请在此处粘贴您的 Nginx 配置代码" :rows="25" class="config-textarea" />
        <!-- 操作按钮移到输入框下方 -->
      </a-col>

      <!-- 右侧：结果展示区域 -->
      <a-col :span="12">
        <div class="output-header">
          <a-typography-title :level="4">格式化结果</a-typography-title>
          <a-space>
            <span>语法高亮</span>
            <a-switch v-model:checked="isHighlightingEnabled" />
          </a-space>
        </div>

        <!-- 条件渲染：根据开关显示不同效果 -->
        <div v-if="isHighlightingEnabled">
          <pre class="language-nginx" :class="{ 'prism-container': true }" v-html="highlightedHtml"></pre>
        </div>
        <div v-else>
          <pre class="prism-container plain-text">{{ formattedConfig }}</pre>
        </div>
      </a-col>
    </a-row>

    <!-- 底部结果提示 -->
    <!-- <a-alert
        v-if="validationMessage"
        :message="validationStatus === 'success' ? '操作成功' : '发生错误'"
        :description="validationMessage"
        :type="validationStatus"
        show-icon
        class="result-alert"
        closable
      /> -->
  </div>
</template>

<script>
import { PageHeader, Input, Button, message, Alert, Space, Row, Col, TypographyTitle, Switch } from "ant-design-vue";
import { SearchOutlined, ApartmentOutlined, ClearOutlined } from "@ant-design/icons-vue";
import { NginxConfFile } from "nginx-conf";

// --- Prism.js 集成 ---
// 1. 引入 Prism 核心
import Prism from "prismjs";
// 2. 引入 Nginx 语言定义 (这会自动注册 'nginx' 语言)
import "prismjs/components/prism-nginx";
// 3. 引入一个你喜欢的主题，Okaidia 主题和图片中的效果很像（注释是绿色的）
import "prismjs/themes/prism-okaidia.css";

export default {
  name: "NginxFormatter",
  components: {
    "a-page-header": PageHeader,
    "a-textarea": Input.TextArea,
    "a-button": Button,
    "a-alert": Alert,
    "a-space": Space,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-switch": Switch,
    SearchOutlined,
    ApartmentOutlined,
    ClearOutlined,
  },
  data() {
    return {
      nginxConfig: `# 在此粘贴 Nginx 配置进行测试
  user www www;
  # worker_processes 2; # This is a comment
  error_log /var/log/nginx-error.log info;
  
  events {
      worker_connections 1024;
  }
  
  http {
      include mime.types;
      server {
          listen 80;
          server_name example.com;
          # 这是应该被正确缩进的注释
          location / {
              root /var/www/html;
              index index.html; #行内注释
          }
      }
  }`,
      formattedConfig: "格式化结果将显示在这里...", // 存储纯文本格式化结果
      highlightedHtml: "", // 存储高亮后的HTML
      isHighlightingEnabled: true, // 控制高亮开关
      isLoading: false,
      validationStatus: "",
      validationMessage: "",
    };
  },
  watch: {
    // 监听开关的变化，立即更新高亮效果
    isHighlightingEnabled() {
      this.updateHighlighting();
    },
    // 监听格式化文本的变化，自动更新高亮
    formattedConfig() {
      this.updateHighlighting();
    },
  },
  mounted() {
    // 页面加载时，对默认内容执行一次格式化和高亮
    this.formatConfig();
  },
  methods: {
    // 新增：更新高亮HTML的核心方法
    updateHighlighting() {
      if (this.isHighlightingEnabled && this.formattedConfig) {
        // 使用 Prism API 进行高亮
        this.highlightedHtml = Prism.highlight(this.formattedConfig, Prism.languages.nginx, "nginx");
      } else {
        // 如果关闭高亮，则清空HTML内容
        this.highlightedHtml = "";
      }
    },

    reformatNginxComments(configString) {
      const lines = configString.split("\n");
      const correctedLines = [];
      let lastSeenIndent = "";

      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const trimmedLine = line.trim();

        if (trimmedLine === "" && i === lines.length - 1) continue;
        if (trimmedLine === "") {
          correctedLines.unshift(line);
          continue;
        }

        if (trimmedLine.startsWith("#")) {
          correctedLines.unshift(lastSeenIndent + trimmedLine);
        } else {
          const indentMatch = line.match(/^\s*/);
          lastSeenIndent = indentMatch ? indentMatch[0] : "";
          correctedLines.unshift(line);
        }
      }
      return correctedLines.join("\n");
    },

    _parseConfig(callback) {
      if (!this.nginxConfig.trim()) {
        message.warning("配置内容不能为空！");
        return;
      }
      this.isLoading = true;
      this.validationMessage = "";
      this.validationStatus = "";

      setTimeout(() => {
        try {
          NginxConfFile.createFromSource(this.nginxConfig, (err, conf) => {
            this.isLoading = false;
            if (err) {
              throw err;
            }
            callback(conf);
          });
        } catch (error) {
          this.isLoading = false;
          this.validationStatus = "error";
          this.validationMessage = `解析失败：${error.message}。请检查您的配置。`;
          this.formattedConfig = "解析配置时出错！";
        }
      }, 100);
    },

    checkSyntax() {
      this._parseConfig(() => {
        this.validationStatus = "success";
        this.validationMessage = "恭喜！Nginx 配置语法正确无误。";
        message.success("语法检查通过！");
      });
    },

    formatConfig() {
      this._parseConfig((conf) => {
        const rawFormatted = conf.toString();
        // 格式化结果存到 formattedConfig，watch会自动触发高亮更新
        this.formattedConfig = this.reformatNginxComments(rawFormatted);
        this.validationStatus = "success";
        this.validationMessage = "配置已成功格式化！";
        message.success("格式化成功！");
      });
    },

    clearContent() {
      this.nginxConfig = "";
      this.formattedConfig = "格式化结果将显示在这里...";
      this.validationMessage = "";
      this.validationStatus = "";
      message.info("内容已清空");
    },
  },
};
</script>

<style scoped>
.config-textarea {
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
}

.button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin-top: 16px; /* 与上方输入框的间距 */
}

.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

/* Prism.js 容器统一样式 */
.prism-container {
  height: 524px; /* 与左侧输入框大致等高 */
  overflow: auto;
  border-radius: 6px;
  /* Okaidia 主题的背景色，保持一致性 */
  background-color: #272822;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  margin: 0; /* pre 标签默认有 margin，需要重置 */
  padding: 1em; /* 增加内边距，更美观 */
}
.plain-text {
  color: #f8f8f2;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.result-alert {
  margin-top: 24px;
  white-space: pre-wrap;
}

/* 这个是必须的，因为 Prism 会给 <pre> 标签添加 language-xxx 的 class */
/* 我们需要确保即使在高亮时，容器的基本样式也能应用上 */
pre[class*="language-"] {
  margin: 0;
}
.prism-container :deep(.token.comment) {
  color: #6a9955 !important;
  font-size: 12px !important;
}
</style>
