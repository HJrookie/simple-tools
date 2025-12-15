<!-- src/views/tools/LogAnalyzer.vue (New Logic) -->
<template>
  <div class="analyzer-container">
    <!-- 初始上传界面 -->
    <div v-if="!hasLogs" class="upload-zone-wrapper">
      <div style="height: 90%; width: 100%">
        <div style="margin-bottom: 8px">
          <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
        </div>

        <a-upload-dragger name="file" :multiple="false" :show-upload-list="false" :before-upload="handleFileSelect" class="upload-dragger">
          <p class="ant-upload-drag-icon"><InboxOutlined /></p>
          <p class="ant-upload-text">点击或将日志文件拖拽到此区域</p>
          <p class="ant-upload-hint">将自动清理并提取关键 Event 日志信息。</p>
        </a-upload-dragger>
      </div>
    </div>

    <!-- 日志分析界面 -->
    <div v-else class="log-viewer-wrapper">
      <div class="toolbar">
        <div style="margin-bottom: 8px">
          <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
        </div>
        <a-space>
          <a-upload :before-upload="handleFileSelect" :show-upload-list="false">
            <a-button
              ><template #icon><UploadOutlined /></template>上传新文件</a-button
            >
          </a-upload>
          <a-button @click="clearLogs"
            ><template #icon><ClearOutlined /></template>清空</a-button
          >
        </a-space>
        <div class="filter-controls">
          <span class="total-lines"> 原始行数: {{ originalLineCount.toLocaleString() }} / 提取后: {{ filteredLines.length.toLocaleString() }} </span>
        </div>
      </div>

      <div class="log-viewer-container">
        <div v-if="filteredLines.length > 0" class="log-content">
          <div v-for="(line, index) in filteredLines" :key="index" class="log-line">
            <span class="line-number">{{ (index + 1).toString() }}</span>
            <span class="line-text" v-html="highlightKeywords(line)"></span>
          </div>
        </div>
        <a-empty v-else description="文件中未找到指定的 Event 日志" class="empty-state" />
      </div>
    </div>
    <a-spin :spinning="isLoading" tip="正在加载和解析文件..." size="large" class="global-spinner" />
  </div>
</template>

<script>
import { PageHeader, Upload, Button, Spin, Empty, message, Space } from "ant-design-vue";
import { UploadOutlined, ClearOutlined, InboxOutlined } from "@ant-design/icons-vue";

export default {
  name: "LogAnalyzer",
  components: {
    "a-page-header": PageHeader,
    "a-upload": Upload,
    "a-upload-dragger": Upload.Dragger,
    "a-button": Button,
    "a-spin": Spin,
    "a-empty": Empty,
    "a-space": Space,
    UploadOutlined,
    ClearOutlined,
    InboxOutlined,
  },
  data() {
    return {
      hasLogs: false,
      filteredLines: [],
      isLoading: false,
      originalLineCount: 0,
    };
  },
  methods: {
    handleFileSelect(file) {
      this.clearLogs(false);
      this.isLoading = true;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const allLines = content.split(/\r?\n/);

        this.originalLineCount = allLines.length;
        this.filteredLines = this.processLogs(allLines);

        this.hasLogs = true;
        this.isLoading = false;
        message.success(`文件 "${file.name}" 处理完成！`);
      };
      reader.onerror = () => {
        /* ... */
      };
      reader.readAsText(file, "UTF-8");

      return false;
    },

    // [核心] 全新的日志处理逻辑
    processLogs(allLines) {
      // 1. 定义用于清理的正则表达式
      // 匹配 [thread] LEVEL com.package... [File.java:line] -
      const uselessInfoRegex = /\s*\[.*?\]\s+(?:INFO|DEBUG|WARN|ERROR)\s+[\w\.]+\s+\[[\w\.]*:\s*\d*\]\s*-\s*/;

      // 2. 遍历所有行，进行清理和初步筛选
      const cleanedAndFiltered = allLines
        .map((line) => {
          // 对每一行，先移除无用信息
          return line.replace(uselessInfoRegex, " ");
        })
        .filter((line) => {
          // 然后，只保留包含我们关心的两种关键词的行
          return line.includes("========xftEventBody params:") || line.includes("=====eventRcdInf:");
        });

      return cleanedAndFiltered;
    },

    clearLogs(showMessage = true) {
      this.hasLogs = false;
      this.filteredLines = [];
      this.originalLineCount = 0;
      if (showMessage) {
        message.info("已清空，请上传新文件");
      }
    },

    // 视觉增强：高亮关键词
    highlightKeywords(line) {
      // 使用 v-html 来渲染带样式的 span 标签
      return line.replace(/(========xftEventBody params:)/g, '<span class="keyword-xftEventBody">$&</span>').replace(/(=====eventRcdInf:)/g, '<span class="keyword-eventRcdInf">$&</span>');
    },
  },
};
</script>

<style>
/* 非 Scoped 样式，用于 v-html 内容 */
.line-text .keyword-xftEventBody {
  color: #c586c0; /* VS Code 紫色，用于函数/重要标识 */
  font-weight: bold;
}
.line-text .keyword-eventRcdInf {
  color: #9cdcfe; /* VS Code 蓝色，用于变量/属性 */
  font-weight: bold;
}

/* 滚动条和文本选中样式 (保持不变) */
::selection {
  background: #264f78;
}
.log-viewer-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}
.log-viewer-container::-webkit-scrollbar-track {
  background: #1e1e1e;
}
.log-viewer-container::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 10px;
}
.log-viewer-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>

<style scoped>
/* Scoped 样式 (布局和基础样式基本保持不变) */
.analyzer-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 30px);
}
.upload-zone-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  flex-grow: 1;
}
.upload-dragger {
  background: #fafafa;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}
.log-viewer-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0px 24px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.filter-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}
.total-lines {
  color: #888;
  font-size: 14px;
  white-space: nowrap;
}
.log-viewer-container {
  flex-grow: 1;
  overflow-y: auto;
  background-color: #1e1e1e;
  padding: 8px 0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
}
.log-content {
  /* ... */
}
.empty-state {
  padding-top: 100px;
  background-color: #1e1e1e;
}
.log-line {
  display: flex;
  align-items: baseline;
  line-height: 1.7;
  font-size: 8px;
  padding: 0 16px 0 0;
}
.line-number {
  flex-shrink: 0;
  width: 40px;
  color: #858585;
  text-align: right;
  padding-right: 4px;
  user-select: none;
}
.line-text {
  white-space: pre-wrap;
  word-break: break-all;
  color: #d4d4d4;
}
.global-spinner {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 1000;
}
</style>
