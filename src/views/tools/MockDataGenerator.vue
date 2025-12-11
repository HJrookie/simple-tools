<!-- src/views/tools/MockDataGenerator.vue -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    <a-row :gutter="16" justify="center" style="margin-bottom: 12px">
      <a-button type="primary" size="" @click="generateMockData">
        <template #icon><ThunderboltOutlined /></template>
        生成数据
      </a-button>
      <a-input-number v-model:value="count" :min="1" :max="1000" style="width: 200px; margin-left: 12px" />
    </a-row>

    <a-row :gutter="16" style="margin-bottom: 8px">
      <!-- 左侧：输入和配置 -->
      <a-col :span="10">
        <a-typography-title :level="5">JSON 模板</a-typography-title>

        <a-textarea v-model:value="jsonTemplate" placeholder="在此处粘贴单个 JSON 对象作为模板" :rows="22" class="code-input" />
        <!-- <div class="button-container">
   
        </div> -->
      </a-col>

      <!-- 右侧：输出结果 -->
      <a-col :span="14">
        <div class="output-header">
          <a-typography-title :level="5">生成的 Mock 数据 (数组)</a-typography-title>
          <a-button @click="copyResult" :disabled="!mockOutput">
            <template #icon><CopyOutlined /></template>
            复制结果
          </a-button>
        </div>
        <pre class="language-json prism-container" v-html="highlightedOutput"></pre>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { PageHeader, Row, Col, TypographyTitle, InputNumber, Button, Textarea, Form, message } from "ant-design-vue";
import { ThunderboltOutlined, CopyOutlined } from "@ant-design/icons-vue";

import Prism from "prismjs";
import "prismjs/components/prism-json.js";
import "prismjs/themes/prism-tomorrow.css";

// 默认的模板，展示了多种可被智能识别的 key
const defaultJsonTemplate = JSON.stringify(
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    age: 30,
    isAdmin: false,
    avatarUrl: "https://i.pravatar.cc/150",
    createdAt: "2025-12-10T15:29:31Z",
    tags: ["vue", "react"],
  },
  null,
  2
);

// --- 简单的随机数据源 ---
const firstNames = ["张", "李", "王", "赵", "刘", "陈", "杨"];
const lastNames = ["伟", "芳", "娜", "秀英", "敏", "静", "强"];
const domains = ["qq.com", "163.com", "gmail.com", "outlook.com"];

export default {
  name: "MockDataGenerator",
  components: {
    "a-page-header": PageHeader,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-input-number": InputNumber,
    "a-button": Button,
    "a-textarea": Textarea,
    "a-form": Form,
    "a-form-item": Form.Item,
    ThunderboltOutlined,
    CopyOutlined,
  },
  data() {
    return {
      jsonTemplate: defaultJsonTemplate,
      count: 10,
      mockOutput: "",
      highlightedOutput: "Mock 数据将显示在这里...",
    };
  },
  methods: {
    // --- 核心随机化逻辑 ---
    _randomizeValue(key, value, index) {
      const keyLower = key.toLowerCase();

      // 1. 根据 key 名进行智能判断
      if (keyLower.includes("id") && typeof value === "number") {
        return value + index;
      }
      if (keyLower.includes("name") && typeof value === "string") {
        return firstNames[Math.floor(Math.random() * firstNames.length)] + lastNames[Math.floor(Math.random() * lastNames.length)];
      }
      if (keyLower.includes("email") && typeof value === "string") {
        return Math.random().toString(36).substring(2, 10) + "@" + domains[Math.floor(Math.random() * domains.length)];
      }
      if ((keyLower.includes("avatar") || keyLower.includes("url") || keyLower.includes("image")) && typeof value === "string") {
        return `https://i.pravatar.cc/150?img=${index + 1}`;
      }
      if (keyLower.includes("date") || keyLower.includes("time") || keyLower.endsWith("at")) {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(Math.random() * 365));
        return d.toISOString();
      }

      // 2. 根据值的类型进行通用判断
      switch (typeof value) {
        case "string":
          return Math.random().toString(36).substring(2, 10);
        case "number":
          return Math.floor(Math.random() * (value * 2 || 100));
        case "boolean":
          return Math.random() > 0.5;
        case "object":
          if (value === null) return null;
          if (Array.isArray(value)) {
            // 返回一个长度随机，内容随机的数组
            return value.slice(0, Math.floor(Math.random() * value.length) + 1);
          }
          // 递归处理嵌套对象
          return this._createMockObject(value, index);
        default:
          return value;
      }
    },

    _createMockObject(template, index) {
      const mockObj = {};
      for (const key in template) {
        mockObj[key] = this._randomizeValue(key, template[key], index);
      }
      return mockObj;
    },

    generateMockData() {
      try {
        const template = JSON.parse(this.jsonTemplate);
        const results = [];
        for (let i = 0; i < this.count; i++) {
          results.push(this._createMockObject(template, i));
        }
        this.mockOutput = JSON.stringify(results, null, 2);
        this.updateHighlighting();
        message.success(`成功生成 ${this.count} 条数据！`);
      } catch (e) {
        this.mockOutput = "";
        this.highlightedOutput = `<span class="error-text">JSON 模板解析错误：${e.message}</span>`;
        message.error("无效的 JSON 模板！");
      }
    },

    updateHighlighting() {
      if (!this.mockOutput) {
        this.highlightedOutput = "Mock 数据将显示在这里...";
        return;
      }
      this.highlightedOutput = Prism.highlight(this.mockOutput, Prism.languages.json, "json");
    },

    copyResult() {
      if (!this.mockOutput) return;
      navigator.clipboard.writeText(this.mockOutput).then(() => {
        message.success("已复制到剪贴板！");
      });
    },
  },
  mounted() {
    this.generateMockData();
  },
};
</script>

<style scoped>
.code-input {
  font-family: "Courier New", Courier, monospace;
  height: 570px;
}
.button-container {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* margin-bottom: 16px; */
}
.prism-container {
  height: 570px;
  overflow: auto;
  border-radius: 6px;
  background-color: #272822;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  margin: 0;
  padding: 1em;
  white-space: pre-wrap;
}
.prism-container:deep(.error-text) {
  color: #ff7b72;
}
pre[class*="language-"] {
  margin: 0;
}
</style>
