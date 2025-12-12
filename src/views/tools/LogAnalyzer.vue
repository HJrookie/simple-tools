<!-- src/views/tools/LogAnalyzer.vue (New & Improved Version) -->
<template>
  <div class="analyzer-container">
    <!-- 状态一：等待上传 -->
    <div v-if="!hasLogs" class="upload-zone-wrapper">
      <div style="height: 90%; width: 100%">
        <div style="margin-bottom: 8px">
          <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
        </div>

        <a-upload-dragger name="file" :multiple="false" :show-upload-list="false" :before-upload="handleFileSelect" class="upload-dragger">
          <p class="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p class="ant-upload-text">点击或将日志文件拖拽到此区域</p>
          <p class="ant-upload-hint">支持大文件，所有处理均在您的浏览器本地完成，不会上传到任何服务器。</p>
        </a-upload-dragger>
      </div>
    </div>

    <!-- 状态二：显示日志 -->
    <div v-else class="log-viewer-wrapper">
      <div class="toolbar">
        <div>
          <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
        </div>
        <a-space>
          <!-- 这个 Upload 组件包裹了按钮，让按钮拥有了点击选择文件的能力 -->
          <a-upload :before-upload="handleFileSelect" :show-upload-list="false">
            <a-button>
              <template #icon><UploadOutlined /></template>
              上传新文件
            </a-button>
          </a-upload>
          <a-button @click="clearLogs">
            <template #icon><ClearOutlined /></template>
            清空
          </a-button>
        </a-space>
        <div class="filter-controls">
          <a-input v-model:value="keywordFilter" placeholder="输入关键词进一步过滤..." allow-clear style="width: 300px" />
          <span class="total-lines"> 总行数: {{ originalLineCount.toLocaleString() }} / 过滤后: {{ filteredLines.length.toLocaleString() }} </span>
        </div>
      </div>

      <div class="log-viewer-container">
        <div v-if="filteredLines.length > 0" class="log-content">
          <div v-for="(line, index) in filteredLines" :key="index" class="log-line" :class="getLineClass(line)">
            <span class="line-number">{{ (index + 1).toString().padStart(5, " ") }}</span>
            <span class="line-text" v-html="highlightKeywords(line)"></span>
          </div>
        </div>
        <a-empty v-else description="没有找到符合条件的结果" class="empty-state" />
      </div>
    </div>
    <a-spin :spinning="isLoading" tip="正在加载和解析文件..." size="large" class="global-spinner" v-if="isLoading" />
  </div>
</template>

<script>
import { PageHeader, Upload, Button, Input, Spin, Empty, message, Space } from "ant-design-vue";
import { UploadOutlined, ClearOutlined, InboxOutlined } from "@ant-design/icons-vue";

export default {
  name: "LogAnalyzer",
  components: {
    "a-page-header": PageHeader,
    "a-upload": Upload,
    "a-upload-dragger": Upload.Dragger,
    "a-button": Button,
    "a-input": Input,
    "a-spin": Spin,
    "a-empty": Empty,
    "a-space": Space,
    UploadOutlined,
    ClearOutlined,
    InboxOutlined,
  },
  data() {
    return {
      hasLogs: false, // 控制UI状态的核心
      primaryFilteredLines: [],
      filteredLines: [],
      isLoading: false,
      keywordFilter: "",
      originalLineCount: 0,
    };
  },
  watch: {
    keywordFilter(newValue) {
      this.applyKeywordFilter(newValue);
    },
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
        // [修正] 将结构化的结果存入 primaryFilteredEntries
        this.primaryFilteredEntries = this.applyPrimaryFilter(allLines);
        this.applyKeywordFilter("");

        this.hasLogs = true;
        this.isLoading = false;
        message.success(`文件 "${file.name}" 加载并分析完成！`);
      };
      reader.onerror = () => {
        /* ... */
      };
      reader.readAsText(file, "UTF-8");

      return false;
    },

    // [修正] 主过滤器现在返回结构化数组
    applyPrimaryFilter(allLines) {
      const entries = []; // 改名为 entries
      const javaClassRegex = /\s*\[.*?\]\s+(?:INFO|DEBUG|WARN|ERROR)\s+[\w\.]+\s+\[[\w\.]+:\s*\d+\]\s*/;

      for (let i = 0; i < allLines.length; i++) {
        const currentLine = allLines[i];

        if (currentLine.includes("执行了拦截器的postHandle方法")) {
          const nextLine = allLines[i + 1];
          if (nextLine && nextLine.includes("XFTEventBody(eventId=XFT00")) {
            const block = [];
            for (let j = 0; j <= 3 && i + j < allLines.length; j++) {
              block.push(allLines[i + j].replace(javaClassRegex, " "));
            }
            // 将整个块作为一个数组推入
            entries.push(block);
            i += 3; // 跳过已处理的行
            continue; // 继续下一次循环
          }
        }
        // 对于不满足块条件的行，作为单个字符串推入
        entries.push(currentLine.replace(javaClassRegex, " "));
      }
      return entries;
    },

    // [修正] 关键词过滤器现在处理结构化数组
    applyKeywordFilter(keyword) {
      let keywordFilteredEntries = [];

      if (!keyword) {
        keywordFilteredEntries = this.primaryFilteredEntries;
      } else {
        const lowerCaseKeyword = keyword.toLowerCase();
        keywordFilteredEntries = this.primaryFilteredEntries.filter((entry) => {
          if (typeof entry === "string") {
            // 如果是单行，直接判断
            return entry.toLowerCase().includes(lowerCaseKeyword);
          } else if (Array.isArray(entry)) {
            // 如果是块，判断块内是否有任何一行满足条件
            return entry.some((line) => line.toLowerCase().includes(lowerCaseKeyword));
          }
          return false;
        });
      }

      // [修正] 将过滤后的结构化数组“压平”以供渲染
      this.filteredLines = keywordFilteredEntries.flat();
    },

    clearLogs(showMessage = true) {
      this.hasLogs = false;
      this.primaryFilteredEntries = []; // 清空结构化数据
      this.filteredLines = [];
      this.originalLineCount = 0;
      this.keywordFilter = "";
      if (showMessage) {
        message.info("已清空，请上传新文件");
      }
    },

    // --- 视觉增强方法 (保持不变) ---
    getLineClass(line) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes("error")) return "level-error";
      if (lowerLine.includes("warn")) return "level-warn";
      if (lowerLine.includes("debug")) return "level-debug";
      return ""; // INFO 是默认色，无需特殊类
    },
    highlightKeywords(line) {
      return line
        .replace(/(==>|Preparing:)/g, '<span class="sql-preparing">$&</span>')
        .replace(/(<==|Total:|Updates:)/g, '<span class="sql-result">$&</span>')
        .replace(/(Parameters:)/g, '<span class="sql-params">$&</span>');
    },
  },
};
</script>
<style>
/* --- 非 Scoped 样式 --- */
/* 1. VS Code 风格的文本选中样式 */
::selection {
  background: #264f78;
}
/* 2. v-html 内容的关键词高亮 */
.line-text .sql-preparing {
  color: #f97583;
}
.line-text .sql-result {
  color: #56d364;
}
.line-text .sql-params {
  color: #79c0ff;
}
/* 3. VS Code 风格的滚动条 */
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
/* --- Scoped 样式 --- */
.analyzer-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 30px);
}
/* 上传区域样式 (保持不变) */
.upload-zone-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 48px;
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
  padding: 0px 24px 8px 24px;
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

/* 核心：VS Code 编辑器风格容器 */
.log-viewer-container {
  flex-grow: 1;
  overflow-y: auto;
  background-color: #1e1e1e; /* VS Code 默认暗色 */
  padding: 8px 0;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
}
.log-content {
  /* 移除内边距，让行内容撑满容器 */
}
.empty-state {
  padding-top: 100px;
  background-color: #1e1e1e;
}

.log-line {
  display: flex;
  align-items: baseline; /* 文本基线对齐 */
  line-height: 1.2;
  font-size: 8px;
  transition: background-color 0.15s;
  padding: 0 16px 0 0; /* 右侧增加一点内边距 */
}
/* 当前行高亮效果 */
.log-line:hover {
  background-color: #2a2d2e;
}
.line-number {
  flex-shrink: 0;
  width: 40px;
  color: #858585;
  text-align: center;
  /* padding-right: 4px; */
  user-select: none;
  font-size: 10px;
}
.line-text {
  white-space: pre-wrap;
  word-break: break-all;
  color: #d4d4d4;
}

/* 日志级别高亮 */
.log-line.level-debug {
  opacity: 0.7;
}
.log-line.level-warn .line-text {
  color: #cca700;
}
.log-line.level-error .line-text {
  color: #f44747;
}
.log-line.level-error {
  background-color: rgba(244, 71, 71, 0.08);
}

.global-spinner {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.5);
  z-index: 1000;
  align-items: center;
  justify-content: center;
  display: flex;
  gap: 20px;
}
</style>
