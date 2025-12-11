<!-- src/views/tools/JsonFixer.vue (Corrected) -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    <a-row :gutter="16" justify="center" align="middle">
      <div class="button-container">
        <a-button type="primary" @click="processInput">
          <template #icon><ToolOutlined /></template>
          校验 & 修复
        </a-button>
      </div>
      <div v-if="statusMessage" style="display: flex">
        <a-button @click="copyResult" :disabled="!resultJson" class="copy-button">
          <template #icon><CopyOutlined /></template>
          复制修复后的JSON
        </a-button>
        <a-alert :message="statusMessage" :type="statusType" show-icon class="status-alert" />
      </div>
    </a-row>

    <a-row :gutter="16">
      <!-- 左侧：输入 -->
      <a-col :span="12">
        <a-typography-title :level="4">粘贴不规范的 JSON 或 JS 对象</a-typography-title>
        <a-textarea v-model:value="jsonInput" placeholder="例如: { a: 1, b: 'hello', // 注释 }" :rows="25" class="code-input" />
      </a-col>

      <!-- 右侧：输出和差异对比 -->
      <a-col :span="12">
        <div class="output-header">
          <a-typography-title :level="4">处理结果</a-typography-title>
        </div>
        <pre class="prism-container" v-html="diffHtml"></pre>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { PageHeader, Row, Col, TypographyTitle, Button, Textarea, Alert, message } from "ant-design-vue";
import { ToolOutlined, CopyOutlined } from "@ant-design/icons-vue";
// [修正 1] 正确地从 'diff' 包导入 'diffChars'
import { diffChars } from "diff";

const defaultInput = `{
    // AI 生成的代码经常省略 key 的引号
    id: 1,
    // 也可能包含注释
    name: "这是一个示例",
    tags: [
      'tag1',
      'tag2', // 数组末尾可能有多余的逗号
    ],
    'valid-key': "这种带连字符的 key 必须有引号",
  }`;

export default {
  name: "JsonFixer",
  components: {
    "a-page-header": PageHeader,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-button": Button,
    "a-textarea": Textarea,
    "a-alert": Alert,
    ToolOutlined,
    CopyOutlined,
  },
  data() {
    return {
      jsonInput: defaultInput,
      diffHtml: "结果和差异对比将显示在这里...",
      resultJson: "",
      statusType: "info",
      statusMessage: "等待处理...",
    };
  },
  mounted() {
    this.processInput();
  },
  methods: {
    escapeHtml(text) {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    },

    formatJson(input) {
      const obj = typeof input === "string" ? JSON.parse(input) : input;
      return JSON.stringify(obj, null, 2);
    },

    processInput() {
      const originalText = this.jsonInput.trim();
      if (!originalText) {
        // ... (省略了部分重复代码)
        this.statusType = "warning";
        this.statusMessage = "请输入内容！";
        return;
      }

      // 1. 检测是否是正确的JSON
      try {
        const formatted = this.formatJson(originalText);
        this.statusType = "success";
        this.statusMessage = "输入内容是标准的 JSON 格式！";
        this.resultJson = formatted;
        this.diffHtml = this.escapeHtml(formatted);
        return;
      } catch (e) {
        // 不是标准JSON，继续尝试修复
      }

      // 2. 尝试修复并展示不同
      try {
        const repairedObject = new Function(`return (${originalText})`)();
        if (typeof repairedObject !== "object" || repairedObject === null) {
          throw new Error("输入内容未返回一个有效的对象或数组。");
        }
        const repairedJsonString = this.formatJson(repairedObject);

        this.statusType = "warning";
        this.statusMessage = "修复成功！已将输入作为 JavaScript 对象成功解析。";
        this.resultJson = repairedJsonString;

        // [修正 2] 使用 diffChars 进行字符级对比，这才是正确的策略
        const diff = diffChars(originalText, repairedJsonString);
        let html = "";
        diff.forEach((part) => {
          const colorClass = part.added ? "diff-added" : part.removed ? "diff-removed" : "diff-same";
          html += `<span class="${colorClass}">${this.escapeHtml(part.value)}</span>`;
        });
        this.diffHtml = html;
      } catch (e) {
        this.statusType = "error";
        this.statusMessage = `修复失败：无法将输入解析为有效的 JSON 或 JavaScript 对象。错误: ${e.message}`;
        this.resultJson = "";
        this.diffHtml = `<span class="error-text">${this.escapeHtml(this.statusMessage)}</span>`;
      }
    },

    copyResult() {
      navigator.clipboard.writeText(this.resultJson).then(() => {
        message.success("已复制修复后的JSON到剪贴板！");
      });
    },
  },
};
</script>

<style>
/* 非 scoped 样式，用于 v-html 内容 */
/* [修正 3] 样式改为 inline，以适应字符级对比 */
.prism-container .diff-added {
  background-color: rgba(46, 160, 67, 0.2);
  display: inline;
}
.prism-container .diff-removed {
  background-color: rgba(217, 30, 24, 0.2);
  text-decoration: line-through;
  display: inline;
}
.prism-container .diff-same {
  display: inline;
  opacity: 0.7;
}
</style>

<style scoped>
.code-input {
  font-family: "Courier New", Courier, monospace;
}
.button-container {
  display: flex;
  justify-content: center;
  /* margin-top: 16px; */
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.status-alert {
  /* margin-bottom: 16px; */
  height: 32px;
}
.copy-button {
  margin: 0 4px;
}
.prism-container {
  height: 520px;
  overflow: auto;
  border-radius: 6px;
  background-color: #272222;
  color: #f8f8f2;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  margin: 0;
  padding: 1em;
  white-space: pre-wrap;
}
.prism-container .error-text {
  color: #ff7b72;
}
</style>
