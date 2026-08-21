<!-- src/views/tools/JsonFixer.vue (Apple Glassmorphism & Auto-Format on Paste Edition) -->
<template>
  <div class="json-fixer-container">
    <!-- 头部 Apple 毛玻璃操作栏 -->
    <div class="glass-action-bar">
      <div class="bar-left">
        <h2 class="tool-heading">智能 JSON 修复与格式化</h2>
        <!-- 状态指示徽标 -->
        <span class="status-pill" :class="statusType">
          <span class="status-dot"></span>
          <span>{{ statusMessage }}</span>
        </span>
      </div>

      <div class="bar-right">
        <!-- 视图切换：高亮 JSON / 差异对比 -->
        <div class="view-mode-toggle" v-if="resultJson && !parseError">
          <button
            class="mode-btn"
            :class="{ active: activeTab === 'formatted' }"
            @click="activeTab = 'formatted'"
          >
            高亮 JSON
          </button>
          <button
            class="mode-btn"
            :class="{ active: activeTab === 'diff' }"
            @click="activeTab = 'diff'"
          >
            差异对比
          </button>
        </div>

        <!-- 缩进设置 -->
        <div class="indent-toggle" v-if="activeTab === 'formatted' && resultJson && !parseError">
          <button
            class="indent-btn"
            :class="{ active: indentSize === 2 && !isMinified }"
            @click="setIndent(2)"
          >
            2 空格
          </button>
          <button
            class="indent-btn"
            :class="{ active: indentSize === 4 && !isMinified }"
            @click="setIndent(4)"
          >
            4 空格
          </button>
          <button
            class="indent-btn"
            :class="{ active: isMinified }"
            @click="toggleMinify"
          >
            压缩
          </button>
        </div>

        <a-button @click="formatInputBox" :disabled="!parsedObject" class="action-btn">
          格式化输入
        </a-button>

        <a-button @click="loadSample" class="action-btn">
          填入示例
        </a-button>

        <a-button @click="clearAll" class="action-btn">
          清空
        </a-button>

        <a-button
          type="primary"
          @click="copyResult"
          :disabled="!resultJson"
          class="action-btn copy-action-btn"
        >
          <template #icon><CopyOutlined v-if="!copied" /><CheckOutlined v-else /></template>
          {{ copied ? "已复制" : "复制结果" }}
        </a-button>
      </div>
    </div>

    <!-- 双栏工作区 -->
    <div class="workspace-grid">
      <!-- 左侧：输入面板 -->
      <div class="glass-panel">
        <div class="panel-header">
          <div class="header-title-group">
            <span class="panel-title">JSON / JS 对象输入</span>
            <span class="tip-text">（粘贴自动格式化 · 支持非规范格式修复）</span>
          </div>
          <span class="panel-count">{{ jsonInput ? jsonInput.length + ' 字符' : '等待粘贴' }}</span>
        </div>
        <div class="panel-body">
          <textarea
            v-model="jsonInput"
            @paste="handlePaste"
            placeholder="请在此粘贴任意 JSON 或 JS 对象代码，粘贴后将自动完成校验、修复并格式化..."
            class="glass-textarea"
          ></textarea>
        </div>
      </div>

      <!-- 右侧：现代高亮 / 差异展示面板 -->
      <div class="glass-panel output-panel">
        <!-- 头部标题栏 -->
        <div class="output-panel-header">
          <div class="header-left">
            <span class="window-dot red"></span>
            <span class="window-dot yellow"></span>
            <span class="window-dot green"></span>
            <span class="output-title">{{ activeTab === 'formatted' ? '修复后标准 JSON' : '字符级修复差异对比' }}</span>
          </div>
          <div class="header-right" v-if="resultJson && !parseError">
            <span class="stats-badge">{{ lineCount }} 行 · {{ byteSize }}</span>
          </div>
        </div>

        <!-- 主体显示区 -->
        <div class="output-body">
          <!-- 错误提示 -->
          <div v-if="parseError" class="error-container">
            <div class="error-badge">修复失败</div>
            <pre class="error-text">{{ parseError }}</pre>
          </div>

          <!-- 空状态 -->
          <div v-else-if="!resultJson" class="empty-container">
            <span class="empty-hint">等待在左侧输入或粘贴内容...</span>
          </div>

          <!-- 视图 1: 现代多彩高亮 JSON -->
          <div v-else-if="activeTab === 'formatted'" class="json-code-wrapper">
            <!-- 行号 -->
            <div v-if="!isMinified" class="line-numbers" aria-hidden="true">
              <span v-for="n in lineCount" :key="n" class="line-num">{{ n }}</span>
            </div>
            <!-- 高亮代码 -->
            <pre class="code-pre" v-html="highlightedJsonHtml"></pre>
          </div>

          <!-- 视图 2: 差异对比视图 (Diff) -->
          <div v-else class="diff-wrapper">
            <div class="diff-legend">
              <span class="legend-item"><span class="legend-box green"></span> 自动添加/规范化</span>
              <span class="legend-item"><span class="legend-box red"></span> 移除错误/注释</span>
            </div>
            <pre class="diff-pre" v-html="diffHtml"></pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { message } from "ant-design-vue";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons-vue";
import { diffChars } from "diff";

const defaultSample = `{
  // AI 生成的代码经常省略 key 的引号
  id: 1001,
  title: 'Apple 玻璃拟态设计',
  // 带有单引号或未加引号的键
  active: true,
  tags: [
    'UI',
    'Glassmorphism', // 数组末尾多余逗号
  ],
  'system-version': "macOS Sequoia",
}`;

export default {
  name: "JsonFixer",
  components: {
    CopyOutlined,
    CheckOutlined,
  },
  data() {
    return {
      jsonInput: defaultSample,
      parsedObject: null,
      resultJson: "",
      diffHtml: "",
      parseError: "",
      statusType: "success",
      statusMessage: "自动修复已开启 · 粘贴即格式化",
      activeTab: "formatted", // 'formatted' | 'diff'
      indentSize: 2,
      isMinified: false,
      copied: false,
      copyTimer: null,
      debounceTimer: null,
    };
  },
  computed: {
    lineCount() {
      if (!this.resultJson || this.isMinified) return 1;
      return this.resultJson.split("\n").length;
    },
    byteSize() {
      if (!this.resultJson) return "0 B";
      const bytes = new Blob([this.resultJson]).size;
      return bytes > 1024 ? (bytes / 1024).toFixed(1) + " KB" : bytes + " B";
    },
    highlightedJsonHtml() {
      if (!this.resultJson) return "";
      return this.syntaxHighlight(this.resultJson);
    },
  },
  watch: {
    jsonInput() {
      this.debouncedProcess();
    },
  },
  mounted() {
    this.processInput();
  },
  methods: {
    // 核心：当用户粘贴内容时，立即自动修复并格式化
    handlePaste(event) {
      // 稍作延时确保 textarea 内容已填入
      setTimeout(() => {
        this.processInput();
        if (this.parsedObject) {
          try {
            // 自动将左侧输入框内容替换为格式化后的标准 JSON
            const formatted = JSON.stringify(this.parsedObject, null, this.indentSize || 2);
            this.jsonInput = formatted;
            message.success("已自动完成校验、修复与格式化！", 1.2);
          } catch (e) {}
        }
      }, 50);
    },

    formatInputBox() {
      if (!this.parsedObject) return;
      try {
        this.jsonInput = JSON.stringify(this.parsedObject, null, this.indentSize || 2);
        message.success("输入框已格式化", 1);
      } catch (e) {}
    },

    debouncedProcess() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.processInput();
      }, 150);
    },

    setIndent(size) {
      this.isMinified = false;
      this.indentSize = size;
      this.updateFormattedJson();
    },

    toggleMinify() {
      this.isMinified = !this.isMinified;
      this.updateFormattedJson();
    },

    updateFormattedJson() {
      if (!this.parsedObject) return;
      try {
        if (this.isMinified) {
          this.resultJson = JSON.stringify(this.parsedObject);
        } else {
          this.resultJson = JSON.stringify(this.parsedObject, null, this.indentSize);
        }
      } catch (e) {
        console.error(e);
      }
    },

    loadSample() {
      this.jsonInput = defaultSample;
      this.processInput();
    },

    clearAll() {
      this.jsonInput = "";
      this.parsedObject = null;
      this.resultJson = "";
      this.diffHtml = "";
      this.parseError = "";
      this.statusType = "info";
      this.statusMessage = "等待输入...";
    },

    escapeHtml(str) {
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    },

    syntaxHighlight(jsonStr) {
      const json = this.escapeHtml(jsonStr);
      return json.replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = "token-number";
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "token-key";
            } else {
              cls = "token-string";
            }
          } else if (/true|false/.test(match)) {
            cls = "token-boolean";
          } else if (/null/.test(match)) {
            cls = "token-null";
          }
          return `<span class="${cls}">${match}</span>`;
        }
      );
    },

    processInput() {
      const raw = this.jsonInput.trim();
      if (!raw) {
        this.parsedObject = null;
        this.resultJson = "";
        this.diffHtml = "";
        this.parseError = "";
        this.statusType = "info";
        this.statusMessage = "等待输入...";
        return;
      }

      // 1. 标准 JSON 验证
      try {
        const parsed = JSON.parse(raw);
        this.parsedObject = parsed;
        this.parseError = "";
        this.statusType = "success";
        this.statusMessage = "✓ 已经是标准合法的 JSON 格式";
        this.updateFormattedJson();
        this.generateDiff(raw, this.resultJson);
        return;
      } catch (e) {
        // 非标准 JSON，继续尝试智能修复
      }

      // 2. 尝试修复 JavaScript Object / 包含注释或单引号的 JSON
      try {
        const repaired = new Function(`return (${raw})`)();
        if (typeof repaired !== "object" || repaired === null) {
          throw new Error("输入内容未能解析为有效的对象或数组。");
        }

        this.parsedObject = repaired;
        this.parseError = "";
        this.statusType = "warning";
        this.statusMessage = "✨ 智能修复成功！已规范化为标准 JSON";
        this.updateFormattedJson();
        this.generateDiff(raw, this.resultJson);
      } catch (e) {
        this.parsedObject = null;
        this.resultJson = "";
        this.diffHtml = "";
        this.parseError = `无法解析或修复该格式：${e.message}`;
        this.statusType = "error";
        this.statusMessage = "❌ 语法格式错误，无法解析";
      }
    },

    generateDiff(original, repaired) {
      const diff = diffChars(original, repaired);
      let html = "";
      diff.forEach((part) => {
        const colorClass = part.added ? "diff-added" : part.removed ? "diff-removed" : "diff-same";
        html += `<span class="${colorClass}">${this.escapeHtml(part.value)}</span>`;
      });
      this.diffHtml = html;
    },

    copyResult() {
      if (!this.resultJson) return;
      navigator.clipboard
        .writeText(this.resultJson)
        .then(() => {
          this.copied = true;
          message.success("修复后的 JSON 已成功复制！", 1);
          clearTimeout(this.copyTimer);
          this.copyTimer = setTimeout(() => {
            this.copied = false;
          }, 2000);
        })
        .catch((err) => {
          message.error("复制失败: " + err);
        });
    },
  },
};
</script>

<style scoped>
.json-fixer-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 18px 48px;
  font-family: var(--font-apple, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif);
}

/* 顶部 Apple 毛玻璃操作栏 */
.glass-action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 18px;
  padding: 10px 18px;
  margin-bottom: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  flex-wrap: wrap;
  gap: 12px;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tool-heading {
  font-size: 17px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0;
  letter-spacing: -0.02em;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.25s ease;
}

.status-pill.success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #059669;
}

.status-pill.warning {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #d97706;
}

.status-pill.error {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #dc2626;
}

.status-pill.info {
  background: rgba(100, 116, 139, 0.12);
  border: 1px solid rgba(100, 116, 139, 0.25);
  color: #475569;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.view-mode-toggle,
.indent-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 9999px;
  padding: 2px;
}

.mode-btn,
.indent-btn {
  border: none;
  background: none;
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: 9999px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover,
.indent-btn:hover {
  color: #1d1d1f;
}

.mode-btn.active,
.indent-btn.active {
  background: #ffffff;
  color: #0071e3;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.action-btn {
  border-radius: 9999px;
  font-weight: 500;
}

.copy-action-btn {
  background: linear-gradient(180deg, #0077ed 0%, #0071e3 100%) !important;
  border: none !important;
}

/* 双栏工作区 */
.workspace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: calc(100vh - 120px);
  min-height: 560px;
}

.glass-panel {
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.45);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.header-title-group {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
}

.tip-text {
  font-size: 11.5px;
  color: #86868b;
}

.panel-count {
  font-size: 12px;
  color: #86868b;
}

.panel-body {
  flex: 1;
  display: flex;
  padding: 14px;
}

.glass-textarea {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-mono, monospace);
  font-size: 13.5px;
  line-height: 1.6;
  color: #1d1d1f;
  resize: none;
}

.glass-textarea::placeholder {
  color: #a1a1a6;
}

/* 右侧输出面板 (Dark Glass 现代风格) */
.output-panel {
  background: #141419;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 36px -6px rgba(0, 0, 0, 0.12);
}

.output-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  user-select: none;
}

.output-panel-header .header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.window-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.window-dot.red { background: #ff5f56; }
.window-dot.yellow { background: #ffbd2e; }
.window-dot.green { background: #27c93f; }

.output-title {
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  margin-left: 4px;
}

.stats-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.output-body {
  flex: 1;
  overflow: auto;
  background: #0d0e12;
  position: relative;
}

/* 错误状态 */
.error-container {
  padding: 24px;
}

.error-badge {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  margin-bottom: 12px;
}

.error-text {
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  color: #fca5a5;
  white-space: pre-wrap;
  margin: 0;
}

/* 空状态 */
.empty-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}

/* 代码与高亮 */
.json-code-wrapper {
  display: flex;
  min-height: 100%;
  padding: 14px 0;
  font-family: var(--font-mono, monospace);
  font-size: 13.5px;
  line-height: 1.6;
}

.line-numbers {
  display: flex;
  flex-direction: column;
  padding: 0 12px;
  text-align: right;
  color: #475569;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  user-select: none;
  min-width: 44px;
}

.line-num {
  height: 21.6px;
}

.code-pre {
  flex: 1;
  margin: 0;
  padding: 0 16px;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: inherit;
  color: #f1f5f9;
  overflow-x: auto;
}

/* 现代 JSON 语法高亮色彩 */
:deep(.token-key) {
  color: #a78bfa;
  font-weight: 500;
}

:deep(.token-string) {
  color: #34d399;
}

:deep(.token-number) {
  color: #fbbf24;
}

:deep(.token-boolean) {
  color: #f472b6;
  font-weight: 600;
}

:deep(.token-null) {
  color: #94a3b8;
  font-style: italic;
}

/* 差异对比 (Diff) 视图 */
.diff-wrapper {
  padding: 14px 18px;
  font-family: var(--font-mono, monospace);
  font-size: 13.5px;
  line-height: 1.6;
}

.diff-legend {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11.5px;
  color: #94a3b8;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-box {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.legend-box.green { background: #22c55e; }
.legend-box.red { background: #ef4444; }

.diff-pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  color: #cbd5e1;
}

:deep(.diff-added) {
  background-color: rgba(34, 197, 94, 0.25);
  color: #4ade80;
  border-radius: 2px;
  padding: 1px 3px;
}

:deep(.diff-removed) {
  background-color: rgba(239, 68, 68, 0.25);
  color: #f87171;
  text-decoration: line-through;
  border-radius: 2px;
  padding: 1px 3px;
}

:deep(.diff-same) {
  color: #cbd5e1;
}

@media (max-width: 900px) {
  .workspace-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
  .glass-panel {
    height: 480px;
  }
}
</style>
