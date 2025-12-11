<!-- src/views/tools/CssTailwindConverter.vue -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    <a-spin :spinning="isLoading" tip="编译器正在处理...">
      <div class="converter-board">
        <!-- 中央控制区域 -->
        <div class="controls">
          <a-radio-group v-model:value="conversionMode" button-style="solid" @change="switchMode">
            <a-radio-button value="css-to-tw">CSS → Tailwind</a-radio-button>
            <a-radio-button value="tw-to-css">Tailwind → CSS</a-radio-button>
          </a-radio-group>
          <a-button type="primary" size="" @click="convert" class="convert-button">
            <template #icon><SwapOutlined /></template>
            转换
          </a-button>
        </div>

        <!-- Tailwind → CSS (高精度): 我们将利用 Tailwind 官方的 Play CDN -->
        <!-- CSS → Tailwind (尽力而为): -->

        <a-row :gutter="16">
          <!-- 左侧：输入 -->
          <a-col :span="12">
            <a-typography-title :level="4">{{ inputLabel }}</a-typography-title>
            <a-textarea v-model:value="inputCode" :placeholder="inputPlaceholder" :rows="22" class="code-input" />
          </a-col>

          <!-- 右侧：输出 -->
          <a-col :span="12">
            <div class="output-header">
              <a-typography-title :level="4">{{ outputLabel }}</a-typography-title>
              <a-button @click="copyResult" :disabled="!outputCode">
                <template #icon><CopyOutlined /></template>
                复制结果
              </a-button>
            </div>
            <pre :class="prismContainerClasses" v-html="highlightedOutput"></pre>
          </a-col>
        </a-row>
      </div>
    </a-spin>
    <!-- 隐藏的 iframe 用于 Tailwind -> CSS 转换 -->
    <iframe ref="tailwindCompilerFrame" style="display: none"></iframe>
  </div>
</template>

<script>
import { PageHeader, Row, Col, TypographyTitle, Button, Textarea, Radio, Spin, message } from "ant-design-vue";
import { SwapOutlined, CopyOutlined } from "@ant-design/icons-vue";

import Prism from "prismjs";
import "prismjs/components/prism-css.js";
import "prismjs/components/prism-scss.js"; // SCSS is similar to CSS for highlighting
import "prismjs/themes/prism-okaidia.css";

// 导入核心转换逻辑
import { convertCssToTailwind, TW_TO_CSS_IFRAME_CONTENT } from "./CssConverterLogic";

const defaultCss = `.card {
    display: flex;
    padding: 16px;
    border-radius: 8px;
    background-color: #ffffff;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-size: 14px;
    color: #1f2937;
  }`;

const defaultTailwind = "flex p-4 rounded-lg bg-white shadow-md text-sm text-gray-800";

export default {
  name: "CssTailwindConverter",
  components: {
    "a-page-header": PageHeader,
    "a-row": Row,
    "a-col": Col,
    "a-spin": Spin,
    "a-typography-title": TypographyTitle,
    "a-button": Button,
    "a-textarea": Textarea,
    "a-radio-group": Radio.Group,
    "a-radio-button": Radio.Button,
    SwapOutlined,
    CopyOutlined,
  },
  data() {
    return {
      inputCode: defaultCss,
      outputCode: "",
      highlightedOutput: "转换结果将显示在这里...",
      conversionMode: "css-to-tw", // 'css-to-tw' or 'tw-to-css'
      isLoading: false,
    };
  },
  computed: {
    inputLabel() {
      return this.conversionMode === "css-to-tw" ? "CSS / SCSS 输入" : "Tailwind Classes 输入";
    },
    outputLabel() {
      return this.conversionMode === "css-to-tw" ? "Tailwind Classes 输出" : "CSS 输出";
    },
    inputPlaceholder() {
      return this.conversionMode === "css-to-tw" ? "粘贴 CSS 代码, 例如: .my-class { color: red; }" : "粘贴 Tailwind 类名, 例如: text-red-500 font-bold";
    },
    prismContainerClasses() {
      const lang = this.conversionMode === "css-to-tw" ? "css" : "css";
      return ["prism-container", `language-${lang}`];
    },
  },
  methods: {
    switchMode() {
      // 切换模式时，交换输入和输出的内容，并清空另一个
      const oldInput = this.inputCode;
      this.inputCode = this.outputCode || (this.conversionMode === "css-to-tw" ? defaultCss : defaultTailwind);
      this.outputCode = oldInput;
      this.updateHighlighting();
    },

    convert() {
      if (!this.inputCode.trim()) {
        message.warning("请输入要转换的内容！");
        return;
      }
      this.isLoading = true;
      // 使用 setTimeout 给予 UI 渲染 loading 状态的时间
      setTimeout(() => {
        try {
          if (this.conversionMode === "css-to-tw") {
            this.outputCode = convertCssToTailwind(this.inputCode);
            message.success("CSS 已成功转换为 Tailwind！");
          } else {
            this.convertTailwindToCss();
          }
        } catch (e) {
          message.error(`转换失败: ${e.message}`);
          this.outputCode = `/* 转换出错: ${e.message} */`;
        } finally {
          if (this.conversionMode === "css-to-tw") {
            this.isLoading = false;
          }
          this.updateHighlighting();
        }
      }, 50);
    },

    // Tailwind -> CSS 的转换逻辑 (使用 iframe)
    convertTailwindToCss() {
      const iframe = this.$refs.tailwindCompilerFrame;
      // 1. 设置 iframe 的 srcdoc 内容
      iframe.srcdoc = TW_TO_CSS_IFRAME_CONTENT;

      // 2. 监听 iframe 加载完成事件
      iframe.onload = () => {
        // 3. 向 iframe 发送要转换的 Tailwind 类名
        iframe.contentWindow.postMessage(this.inputCode, "*");
      };

      // 4. 设置监听器，接收来自 iframe 的结果
      const messageListener = (event) => {
        // 确保消息来自我们的 iframe
        if (event.source !== iframe.contentWindow) return;

        this.outputCode = event.data;
        this.isLoading = false;
        this.updateHighlighting();
        message.success("Tailwind 已成功转换为 CSS！");

        // 移除监听器，避免内存泄漏
        window.removeEventListener("message", messageListener);
      };

      window.addEventListener("message", messageListener);
    },

    updateHighlighting() {
      if (!this.outputCode) {
        this.highlightedOutput = "转换结果将显示在这里...";
        return;
      }
      this.highlightedOutput = Prism.highlight(this.outputCode, Prism.languages.css, "css");
    },

    copyResult() {
      navigator.clipboard.writeText(this.outputCode).then(() => message.success("已复制到剪贴板！"));
    },
  },
};
</script>

<style scoped>
.converter-board {
  padding: 24px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
}
.controls {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 24px;
}
.convert-button {
  margin-left: 24px;
}
.code-input {
  font-family: "Courier New", Courier, monospace;
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.prism-container {
  height: 490px;
  overflow: auto;
  border-radius: 6px;
  background-color: #272822;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  margin: 0;
  padding: 1em;
  white-space: pre-wrap;
}
pre[class*="language-"] {
  margin: 0;
}
</style>
