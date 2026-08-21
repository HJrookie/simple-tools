<!-- src/views/tools/TextCompare.vue (Apple Glassmorphism Text Diff & Auto-Format JSON Edition) -->
<template>
  <div class="text-diff-page">
    <!-- 头部 Apple 毛玻璃操作栏 -->
    <div class="glass-action-bar">
      <div class="bar-left">
        <h2 class="tool-heading">文本差异对比</h2>
        <!-- 差异统计徽标 -->
        <div class="diff-summary-badges">
          <span class="stat-pill unchanged" v-if="diffStats.totalChanges === 0 && (leftText || rightText)">
            <CheckCircleOutlined /> 两侧内容完全一致
          </span>
          <template v-else-if="leftText || rightText">
            <span class="stat-pill added" v-if="diffStats.additions > 0">
              +{{ diffStats.additions }} 处新增
            </span>
            <span class="stat-pill removed" v-if="diffStats.deletions > 0">
              -{{ diffStats.deletions }} 处删除
            </span>
            <span class="stat-pill modified" v-if="diffStats.modifications > 0">
              ~{{ diffStats.modifications }} 处修改
            </span>
          </template>
          <span class="stat-pill empty" v-else>
            等待输入或粘贴文本 / JSON...
          </span>
        </div>
      </div>

      <div class="bar-right">
        <!-- 视图模式切换：双栏并排 / 单栏合并 -->
        <div class="view-mode-toggle">
          <button
            class="mode-btn"
            :class="{ active: viewMode === 'split' }"
            @click="viewMode = 'split'"
            title="左右双栏分屏对比"
          >
            <SplitCellsOutlined /> 双栏并排
          </button>
          <button
            class="mode-btn"
            :class="{ active: viewMode === 'unified' }"
            @click="viewMode = 'unified'"
            title="单栏合并逐行对比"
          >
            <BarsOutlined /> 单栏合并
          </button>
        </div>

        <!-- 差异粒度切换：按行 / 按词 / 按字符 -->
        <div class="view-mode-toggle">
          <button
            class="mode-btn"
            :class="{ active: diffGranularity === 'lines' }"
            @click="diffGranularity = 'lines'"
            title="按行对比并精细高亮修改词"
          >
            行级
          </button>
          <button
            class="mode-btn"
            :class="{ active: diffGranularity === 'words' }"
            @click="diffGranularity = 'words'"
            title="按词语粒度对比"
          >
            词级
          </button>
          <button
            class="mode-btn"
            :class="{ active: diffGranularity === 'chars' }"
            @click="diffGranularity = 'chars'"
            title="按字符逐字对比"
          >
            字符级
          </button>
        </div>

        <!-- 格式化两端 JSON 按钮 -->
        <a-button @click="formatBothSidesIfJson" class="action-btn" title="检测并格式化两侧的 JSON 内容">
          <template #icon><CodeOutlined /></template>
          格式化 JSON
        </a-button>

        <!-- 快捷操作按钮 -->
        <a-button @click="swapContent" class="action-btn" title="交换原文本与新文本">
          <template #icon><SwapOutlined /></template>
          交换
        </a-button>
        <a-button @click="loadSample" class="action-btn">
          示例
        </a-button>
        <a-button @click="clearAll" class="action-btn">
          清空
        </a-button>

        <!-- 差异设置下拉 -->
        <a-popover placement="bottomRight" trigger="click">
          <template #content>
            <div class="settings-popover">
              <div class="setting-item">
                <a-switch v-model:checked="autoFormatJson" size="small" />
                <span class="setting-label">粘贴 / 载入时自动格式化 JSON</span>
              </div>
              <div class="setting-item">
                <a-switch v-model:checked="ignoreWhitespace" size="small" />
                <span class="setting-label">忽略首尾空格 / 空白变化</span>
              </div>
              <div class="setting-item">
                <a-switch v-model:checked="ignoreCase" size="small" />
                <span class="setting-label">忽略大小写差异</span>
              </div>
              <div class="setting-item">
                <a-switch v-model:checked="syncScroll" size="small" />
                <span class="setting-label">双栏同步滚动</span>
              </div>
            </div>
          </template>
          <a-button class="action-btn">
            <template #icon><SettingOutlined /></template>
            设置
          </a-button>
        </a-popover>
      </div>
    </div>

    <!-- 主体对比工作区 -->
    <div class="diff-main-container">
      <!-- 视图 A: 双栏并排对比模式 (Split View) -->
      <div v-if="viewMode === 'split'" class="split-view-grid">
        <!-- 左侧：原文本 (Original) -->
        <div
          class="glass-panel text-pane left-pane"
          @dragover.prevent="leftDragging = true"
          @dragleave.prevent="leftDragging = false"
          @drop.prevent="handleLeftDrop"
        >
          <div class="pane-header">
            <div class="header-left">
              <span class="window-dot red"></span>
              <span class="pane-title">原始文本 (Original)</span>
              <span v-if="isLeftJson" class="json-indicator-badge">JSON</span>
            </div>
            <div class="header-actions">
              <span class="meta-tag">{{ leftStats.lines }} 行 · {{ leftStats.chars }} 字符</span>
              <input type="file" ref="leftFileInput" style="display: none" @change="handleLeftFileInput" />
              <button
                v-if="isLeftJson"
                class="mini-format-btn"
                @click="formatSide('left')"
                title="一键格式化此侧 JSON"
              >
                格式化
              </button>
              <button class="icon-tool-btn" @click="$refs.leftFileInput.click()" title="从本地导入文件">
                <FolderOpenOutlined />
              </button>
              <button class="icon-tool-btn" @click="copyText(leftText)" title="复制原文本">
                <CopyOutlined />
              </button>
            </div>
          </div>

          <!-- 双层结构：底层高亮差异背景，顶层透明同步输入编辑 -->
          <div class="editor-diff-wrapper">
            <!-- 拖拽覆盖层 -->
            <div v-if="leftDragging" class="drag-drop-hint">
              <CloudUploadOutlined class="drag-icon" />
              <span>松开载入原文本</span>
            </div>

            <!-- 可编辑文本框 -->
            <textarea
              ref="leftEditorRef"
              v-model="leftText"
              @paste="handleLeftPaste"
              @scroll="handleLeftScroll"
              placeholder="请在此粘贴或输入【原始文本 / JSON】，支持拖入文件，JSON 将自动格式化..."
              class="diff-textarea"
              spellcheck="false"
            ></textarea>

            <!-- 高亮展示层 (非空且有差异时可直观查看) -->
            <div
              ref="leftHighlightRef"
              class="diff-highlight-view"
              aria-hidden="true"
            >
              <div
                v-for="(line, idx) in splitDiffResult.leftLines"
                :key="idx"
                class="diff-line-row"
                :class="line.type"
              >
                <span class="line-gutter">{{ line.lineNum || '' }}</span>
                <span class="line-content" v-html="line.html || '&nbsp;'"></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：修改后文本 (Modified) -->
        <div
          class="glass-panel text-pane right-pane"
          @dragover.prevent="rightDragging = true"
          @dragleave.prevent="rightDragging = false"
          @drop.prevent="handleRightDrop"
        >
          <div class="pane-header">
            <div class="header-left">
              <span class="window-dot green"></span>
              <span class="pane-title">修改后文本 (Modified)</span>
              <span v-if="isRightJson" class="json-indicator-badge">JSON</span>
            </div>
            <div class="header-actions">
              <span class="meta-tag">{{ rightStats.lines }} 行 · {{ rightStats.chars }} 字符</span>
              <input type="file" ref="rightFileInput" style="display: none" @change="handleRightFileInput" />
              <button
                v-if="isRightJson"
                class="mini-format-btn"
                @click="formatSide('right')"
                title="一键格式化此侧 JSON"
              >
                格式化
              </button>
              <button class="icon-tool-btn" @click="$refs.rightFileInput.click()" title="从本地导入文件">
                <FolderOpenOutlined />
              </button>
              <button class="icon-tool-btn" @click="copyText(rightText)" title="复制新文本">
                <CopyOutlined />
              </button>
            </div>
          </div>

          <div class="editor-diff-wrapper">
            <div v-if="rightDragging" class="drag-drop-hint">
              <CloudUploadOutlined class="drag-icon" />
              <span>松开载入修改后文本</span>
            </div>

            <textarea
              ref="rightEditorRef"
              v-model="rightText"
              @paste="handleRightPaste"
              @scroll="handleRightScroll"
              placeholder="请在此粘贴或输入【修改后文本 / JSON】，支持拖入文件，JSON 将自动格式化..."
              class="diff-textarea"
              spellcheck="false"
            ></textarea>

            <div
              ref="rightHighlightRef"
              class="diff-highlight-view"
              aria-hidden="true"
            >
              <div
                v-for="(line, idx) in splitDiffResult.rightLines"
                :key="idx"
                class="diff-line-row"
                :class="line.type"
              >
                <span class="line-gutter">{{ line.lineNum || '' }}</span>
                <span class="line-content" v-html="line.html || '&nbsp;'"></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 视图 B: 单栏逐行合并对比模式 (Unified View) -->
      <div v-else class="glass-panel unified-view-panel">
        <div class="pane-header">
          <div class="header-left">
            <span class="window-dot red"></span>
            <span class="window-dot yellow"></span>
            <span class="window-dot green"></span>
            <span class="pane-title">逐行合并差异对比 (Unified Git Diff)</span>
          </div>
          <div class="header-actions">
            <button class="icon-tool-btn" @click="copyUnifiedDiff" title="复制对比补丁">
              <CopyOutlined /> 复制 Diff
            </button>
          </div>
        </div>

        <div class="unified-diff-body">
          <div v-if="!leftText && !rightText" class="empty-diff-hint">
            请在上方切换为双栏模式输入文本，或使用示例进行对比
          </div>
          <div v-else class="unified-lines-list">
            <div
              v-for="(item, idx) in unifiedDiffResult"
              :key="idx"
              class="unified-line-row"
              :class="item.type"
            >
              <span class="line-num old-num">{{ item.oldLine || '' }}</span>
              <span class="line-num new-num">{{ item.newLine || '' }}</span>
              <span class="line-prefix">{{ item.prefix }}</span>
              <span class="line-code" v-html="item.html || '&nbsp;'"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { message } from "ant-design-vue";
import {
  SwapOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
  SplitCellsOutlined,
  BarsOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CodeOutlined,
} from "@ant-design/icons-vue";
import { diffLines, diffWordsWithSpace, diffChars } from "diff";

const sampleOriginal = `{
  "name": "simple-tools",
  "version": "1.0.0",
  "description": "精选开发工具集",
  "settings": {
    "theme": "dark",
    "timeout": 3000,
    "debug": false
  },
  "tags": [
    "utility",
    "formatter"
  ]
}`;

const sampleModified = `{
  "name": "simple-tools-pro",
  "version": "2.0.0",
  "description": "精选开发与设计工具箱",
  "settings": {
    "theme": "apple-glassmorphism",
    "timeout": 5000,
    "debug": true,
    "autoSave": true
  },
  "tags": [
    "utility",
    "formatter",
    "diff-tool"
  ]
}`;

export default {
  name: "TextCompare",
  components: {
    SwapOutlined,
    CopyOutlined,
    FolderOpenOutlined,
    CloudUploadOutlined,
    SplitCellsOutlined,
    BarsOutlined,
    SettingOutlined,
    CheckCircleOutlined,
    CodeOutlined,
  },
  data() {
    return {
      leftText: sampleOriginal,
      rightText: sampleModified,
      viewMode: "split", // 'split' | 'unified'
      diffGranularity: "lines", // 'lines' | 'words' | 'chars'
      autoFormatJson: true, // 默认开启 JSON 自动格式化
      ignoreWhitespace: false,
      ignoreCase: false,
      syncScroll: true,
      leftDragging: false,
      rightDragging: false,
      isScrolling: false,
    };
  },
  computed: {
    leftStats() {
      const text = this.leftText || "";
      const lines = text ? text.split("\n").length : 0;
      return { lines, chars: text.length };
    },
    rightStats() {
      const text = this.rightText || "";
      const lines = text ? text.split("\n").length : 0;
      return { lines, chars: text.length };
    },
    isLeftJson() {
      return this.isJsonLike(this.leftText);
    },
    isRightJson() {
      return this.isJsonLike(this.rightText);
    },
    diffOptions() {
      return {
        ignoreWhitespace: this.ignoreWhitespace,
        ignoreCase: this.ignoreCase,
      };
    },
    // 差异统计计算
    diffStats() {
      if (!this.leftText && !this.rightText) {
        return { additions: 0, deletions: 0, modifications: 0, totalChanges: 0 };
      }

      const diff = diffLines(this.leftText, this.rightText, this.diffOptions);
      let additions = 0;
      let deletions = 0;
      let modifications = 0;

      for (let i = 0; i < diff.length; i++) {
        const curr = diff[i];
        const next = diff[i + 1];

        if (curr.removed && next && next.added) {
          modifications += Math.max(curr.count || 1, next.count || 1);
          i++;
        } else if (curr.added) {
          additions += curr.count || 1;
        } else if (curr.removed) {
          deletions += curr.count || 1;
        }
      }

      return {
        additions,
        deletions,
        modifications,
        totalChanges: additions + deletions + modifications,
      };
    },

    // 双栏并排 Diff 数据计算 (含词级精细高亮)
    splitDiffResult() {
      const leftRaw = this.leftText || "";
      const rightRaw = this.rightText || "";

      if (this.diffGranularity === "chars") {
        return this.computeCharSplitDiff(leftRaw, rightRaw);
      } else if (this.diffGranularity === "words") {
        return this.computeWordSplitDiff(leftRaw, rightRaw);
      }

      return this.computeLineSplitDiff(leftRaw, rightRaw);
    },

    // 单栏逐行合并 Diff 数据计算
    unifiedDiffResult() {
      const leftRaw = this.leftText || "";
      const rightRaw = this.rightText || "";
      const diff = diffLines(leftRaw, rightRaw, this.diffOptions);

      const result = [];
      let oldLineNum = 1;
      let newLineNum = 1;

      diff.forEach((part) => {
        const lines = part.value.replace(/\n$/, "").split("\n");
        lines.forEach((line) => {
          if (part.added) {
            result.push({
              type: "unified-added",
              prefix: "+",
              oldLine: null,
              newLine: newLineNum++,
              html: this.escapeHtml(line),
            });
          } else if (part.removed) {
            result.push({
              type: "unified-removed",
              prefix: "-",
              oldLine: oldLineNum++,
              newLine: null,
              html: this.escapeHtml(line),
            });
          } else {
            result.push({
              type: "unified-same",
              prefix: " ",
              oldLine: oldLineNum++,
              newLine: newLineNum++,
              html: this.escapeHtml(line),
            });
          }
        });
      });

      return result;
    },
  },
  methods: {
    // 判断内容是否疑似 JSON
    isJsonLike(str) {
      if (!str || typeof str !== "string") return false;
      const trimmed = str.trim();
      if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        return true;
      }
      return false;
    },

    // 智能解析并格式化 JSON（支持标准 JSON 与 Relaxed JS 对象）
    tryFormatJson(str) {
      if (!str || typeof str !== "string") return null;
      const trimmed = str.trim();
      if (!this.isJsonLike(trimmed)) return null;

      // 1. 标准 JSON 解析
      try {
        const parsed = JSON.parse(trimmed);
        return JSON.stringify(parsed, null, 2);
      } catch (e) {}

      // 2. 尝试解析 JS 对象（如无引号 key、单引号等）
      try {
        const parsed = new Function(`return (${trimmed})`)();
        if (typeof parsed === "object" && parsed !== null) {
          return JSON.stringify(parsed, null, 2);
        }
      } catch (e) {}

      return null;
    },

    // 粘贴事件监听 (自动格式化 JSON)
    handleLeftPaste() {
      if (!this.autoFormatJson) return;
      setTimeout(() => {
        const formatted = this.tryFormatJson(this.leftText);
        if (formatted) {
          this.leftText = formatted;
          message.success("已自动格式化左侧 JSON 内容！", 1);
        }
      }, 50);
    },

    handleRightPaste() {
      if (!this.autoFormatJson) return;
      setTimeout(() => {
        const formatted = this.tryFormatJson(this.rightText);
        if (formatted) {
          this.rightText = formatted;
          message.success("已自动格式化右侧 JSON 内容！", 1);
        }
      }, 50);
    },

    formatSide(side) {
      if (side === "left") {
        const formatted = this.tryFormatJson(this.leftText);
        if (formatted) {
          this.leftText = formatted;
          message.success("左侧 JSON 格式化成功");
        } else {
          message.warning("左侧非有效 JSON 格式");
        }
      } else {
        const formatted = this.tryFormatJson(this.rightText);
        if (formatted) {
          this.rightText = formatted;
          message.success("右侧 JSON 格式化成功");
        } else {
          message.warning("右侧非有效 JSON 格式");
        }
      }
    },

    formatBothSidesIfJson() {
      let formattedCount = 0;
      const leftFormatted = this.tryFormatJson(this.leftText);
      if (leftFormatted) {
        this.leftText = leftFormatted;
        formattedCount++;
      }

      const rightFormatted = this.tryFormatJson(this.rightText);
      if (rightFormatted) {
        this.rightText = rightFormatted;
        formattedCount++;
      }

      if (formattedCount > 0) {
        message.success(`已完成 ${formattedCount} 处 JSON 自动格式化！`);
      } else {
        message.info("未检测到可格式化的有效 JSON 内容");
      }
    },

    escapeHtml(str) {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    // 行级对比 + 行内词级精细高亮
    computeLineSplitDiff(leftRaw, rightRaw) {
      const diff = diffLines(leftRaw, rightRaw, this.diffOptions);
      const leftLines = [];
      const rightLines = [];

      let leftLineNum = 1;
      let rightLineNum = 1;

      for (let i = 0; i < diff.length; i++) {
        const curr = diff[i];
        const next = diff[i + 1];

        // 识别替换修改行 (一行或多行被直接替换)
        if (curr.removed && next && next.added) {
          const removedLines = curr.value.replace(/\n$/, "").split("\n");
          const addedLines = next.value.replace(/\n$/, "").split("\n");

          const maxLen = Math.max(removedLines.length, addedLines.length);

          for (let k = 0; k < maxLen; k++) {
            const rLine = removedLines[k];
            const aLine = addedLines[k];

            if (rLine !== undefined && aLine !== undefined) {
              const wordDiff = diffWordsWithSpace(rLine, aLine, this.diffOptions);
              let rHtml = "";
              let aHtml = "";

              wordDiff.forEach((w) => {
                if (w.removed) {
                  rHtml += `<mark class="diff-word-removed">${this.escapeHtml(w.value)}</mark>`;
                } else if (w.added) {
                  aHtml += `<mark class="diff-word-added">${this.escapeHtml(w.value)}</mark>`;
                } else {
                  rHtml += this.escapeHtml(w.value);
                  aHtml += this.escapeHtml(w.value);
                }
              });

              leftLines.push({ type: "diff-removed-line", lineNum: leftLineNum++, html: rHtml });
              rightLines.push({ type: "diff-added-line", lineNum: rightLineNum++, html: aHtml });
            } else if (rLine !== undefined) {
              leftLines.push({
                type: "diff-removed-line",
                lineNum: leftLineNum++,
                html: `<mark class="diff-word-removed">${this.escapeHtml(rLine)}</mark>`,
              });
              rightLines.push({ type: "diff-empty-slot", lineNum: "", html: "" });
            } else {
              leftLines.push({ type: "diff-empty-slot", lineNum: "", html: "" });
              rightLines.push({
                type: "diff-added-line",
                lineNum: rightLineNum++,
                html: `<mark class="diff-word-added">${this.escapeHtml(aLine)}</mark>`,
              });
            }
          }

          i++;
        } else if (curr.removed) {
          const lines = curr.value.replace(/\n$/, "").split("\n");
          lines.forEach((line) => {
            leftLines.push({
              type: "diff-removed-line",
              lineNum: leftLineNum++,
              html: `<mark class="diff-word-removed">${this.escapeHtml(line)}</mark>`,
            });
            rightLines.push({ type: "diff-empty-slot", lineNum: "", html: "" });
          });
        } else if (curr.added) {
          const lines = curr.value.replace(/\n$/, "").split("\n");
          lines.forEach((line) => {
            leftLines.push({ type: "diff-empty-slot", lineNum: "", html: "" });
            rightLines.push({
              type: "diff-added-line",
              lineNum: rightLineNum++,
              html: `<mark class="diff-word-added">${this.escapeHtml(line)}</mark>`,
            });
          });
        } else {
          const lines = curr.value.replace(/\n$/, "").split("\n");
          lines.forEach((line) => {
            leftLines.push({ type: "diff-same-line", lineNum: leftLineNum++, html: this.escapeHtml(line) });
            rightLines.push({ type: "diff-same-line", lineNum: rightLineNum++, html: this.escapeHtml(line) });
          });
        }
      }

      return { leftLines, rightLines };
    },

    // 词级细致对比
    computeWordSplitDiff(leftRaw, rightRaw) {
      const leftLines = leftRaw.split("\n").map((line, idx) => ({
        type: "diff-same-line",
        lineNum: idx + 1,
        html: this.escapeHtml(line),
      }));
      const rightLines = rightRaw.split("\n").map((line, idx) => ({
        type: "diff-same-line",
        lineNum: idx + 1,
        html: this.escapeHtml(line),
      }));

      return { leftLines, rightLines };
    },

    // 字符级对比
    computeCharSplitDiff(leftRaw, rightRaw) {
      const diff = diffChars(leftRaw, rightRaw, this.diffOptions);
      let leftHtml = "";
      let rightHtml = "";

      diff.forEach((part) => {
        if (part.removed) {
          leftHtml += `<mark class="diff-word-removed">${this.escapeHtml(part.value)}</mark>`;
        } else if (part.added) {
          rightHtml += `<mark class="diff-word-added">${this.escapeHtml(part.value)}</mark>`;
        } else {
          leftHtml += this.escapeHtml(part.value);
          rightHtml += this.escapeHtml(part.value);
        }
      });

      const leftLines = leftHtml.split("\n").map((html, idx) => ({
        type: html.includes("diff-word-removed") ? "diff-removed-line" : "diff-same-line",
        lineNum: idx + 1,
        html,
      }));

      const rightLines = rightHtml.split("\n").map((html, idx) => ({
        type: html.includes("diff-word-added") ? "diff-added-line" : "diff-same-line",
        lineNum: idx + 1,
        html,
      }));

      return { leftLines, rightLines };
    },

    // 同步滚动处理
    handleLeftScroll(e) {
      if (!this.syncScroll || this.isScrolling) return;
      this.isScrolling = true;
      const { scrollTop, scrollLeft } = e.target;
      if (this.$refs.rightEditorRef) {
        this.$refs.rightEditorRef.scrollTop = scrollTop;
        this.$refs.rightEditorRef.scrollLeft = scrollLeft;
      }
      if (this.$refs.leftHighlightRef) {
        this.$refs.leftHighlightRef.scrollTop = scrollTop;
        this.$refs.leftHighlightRef.scrollLeft = scrollLeft;
      }
      if (this.$refs.rightHighlightRef) {
        this.$refs.rightHighlightRef.scrollTop = scrollTop;
        this.$refs.rightHighlightRef.scrollLeft = scrollLeft;
      }
      requestAnimationFrame(() => {
        this.isScrolling = false;
      });
    },

    handleRightScroll(e) {
      if (!this.syncScroll || this.isScrolling) return;
      this.isScrolling = true;
      const { scrollTop, scrollLeft } = e.target;
      if (this.$refs.leftEditorRef) {
        this.$refs.leftEditorRef.scrollTop = scrollTop;
        this.$refs.leftEditorRef.scrollLeft = scrollLeft;
      }
      if (this.$refs.leftHighlightRef) {
        this.$refs.leftHighlightRef.scrollTop = scrollTop;
        this.$refs.leftHighlightRef.scrollLeft = scrollLeft;
      }
      if (this.$refs.rightHighlightRef) {
        this.$refs.rightHighlightRef.scrollTop = scrollTop;
        this.$refs.rightHighlightRef.scrollLeft = scrollLeft;
      }
      requestAnimationFrame(() => {
        this.isScrolling = false;
      });
    },

    // 左右交换
    swapContent() {
      const temp = this.leftText;
      this.leftText = this.rightText;
      this.rightText = temp;
      message.success("已交换两侧文本内容");
    },

    loadSample() {
      this.leftText = sampleOriginal;
      this.rightText = sampleModified;
      message.success("已载入 JSON 对比示例");
    },

    clearAll() {
      this.leftText = "";
      this.rightText = "";
      message.info("已清空文本");
    },

    copyText(text) {
      if (!text) {
        message.warning("内容为空！");
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        message.success("已复制到剪贴板！");
      });
    },

    copyUnifiedDiff() {
      if (!this.leftText && !this.rightText) return;
      const diff = diffLines(this.leftText, this.rightText, this.diffOptions);
      let patch = `--- Original\n+++ Modified\n`;
      diff.forEach((part) => {
        const prefix = part.added ? "+" : part.removed ? "-" : " ";
        const lines = part.value.replace(/\n$/, "").split("\n");
        lines.forEach((l) => {
          patch += `${prefix}${l}\n`;
        });
      });

      navigator.clipboard.writeText(patch).then(() => {
        message.success("已复制 Unified Diff 补丁内容！");
      });
    },

    // 文件导入与拖拽
    handleLeftDrop(e) {
      this.leftDragging = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) this.readFile(file, "left");
    },
    handleRightDrop(e) {
      this.rightDragging = false;
      const file = e.dataTransfer?.files?.[0];
      if (file) this.readFile(file, "right");
    },
    handleLeftFileInput(e) {
      const file = e.target.files?.[0];
      if (file) {
        this.readFile(file, "left");
        e.target.value = "";
      }
    },
    handleRightFileInput(e) {
      const file = e.target.files?.[0];
      if (file) {
        this.readFile(file, "right");
        e.target.value = "";
      }
    },
    readFile(file, side) {
      const reader = new FileReader();
      reader.onload = (event) => {
        let content = event.target.result;
        if (this.autoFormatJson) {
          const formatted = this.tryFormatJson(content);
          if (formatted) content = formatted;
        }

        if (side === "left") {
          this.leftText = content;
          message.success(`原文本已载入: ${file.name}`);
        } else {
          this.rightText = content;
          message.success(`修改文本已载入: ${file.name}`);
        }
      };
      reader.onerror = () => {
        message.error("读取文本文件失败！");
      };
      reader.readAsText(file, "UTF-8");
    },
  },
};
</script>

<style scoped>
.text-diff-page {
  max-width: 1440px;
  margin: 0 auto;
  padding: 12px 18px 40px;
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
  gap: 14px;
  flex-wrap: wrap;
}

.tool-heading {
  font-size: 17px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0;
  letter-spacing: -0.02em;
}

.diff-summary-badges {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 11.5px;
  font-weight: 600;
}

.stat-pill.added {
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.stat-pill.removed {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.stat-pill.modified {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.stat-pill.unchanged {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.stat-pill.empty {
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
  font-weight: normal;
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.view-mode-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 9999px;
  padding: 2px;
}

.mode-btn {
  border: none;
  background: none;
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: 9999px;
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  color: #1d1d1f;
}

.mode-btn.active {
  background: #ffffff;
  color: #0071e3;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.action-btn {
  border-radius: 9999px;
  font-weight: 500;
}

.settings-popover {
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-label {
  font-size: 12.5px;
  color: #1d1d1f;
}

/* 主体对比容器 */
.diff-main-container {
  height: calc(100vh - 120px);
  min-height: 560px;
}

.split-view-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 100%;
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

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.45);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
  user-select: none;
}

.header-left {
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

.pane-title {
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
}

.json-indicator-badge {
  font-size: 10.5px;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.12);
  color: #6366f1;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-tag {
  font-size: 11.5px;
  color: #86868b;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 9999px;
}

.mini-format-btn {
  border: 1px solid rgba(99, 102, 241, 0.3);
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  border-radius: 9999px;
  padding: 1px 8px;
  font-size: 11px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.mini-format-btn:hover {
  background: rgba(99, 102, 241, 0.18);
}

.icon-tool-btn {
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #48484a;
  border-radius: 6px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.icon-tool-btn:hover {
  background: rgba(0, 113, 227, 0.1);
  color: #0071e3;
}

/* 编辑器与高亮双层联动 */
.editor-diff-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #ffffff;
}

.drag-drop-hint {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #0071e3;
  font-size: 14px;
  font-weight: 600;
  border: 2px dashed #0071e3;
  border-radius: 12px;
  margin: 8px;
}

.drag-icon {
  font-size: 32px;
}

.diff-textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 10px 14px 10px 48px;
  font-family: var(--font-mono, "SF Mono", Menlo, Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 22px;
  border: none;
  outline: none;
  resize: none;
  white-space: pre;
  overflow: auto;
  z-index: 2;
  background: transparent;
  color: #1d1d1f;
  tab-size: 2;
}

.diff-highlight-view {
  position: absolute;
  inset: 0;
  padding: 10px 0;
  font-family: var(--font-mono, "SF Mono", Menlo, Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 22px;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
  user-select: none;
}

.diff-line-row {
  display: flex;
  min-height: 22px;
  white-space: pre;
}

.line-gutter {
  width: 42px;
  min-width: 42px;
  text-align: right;
  padding-right: 10px;
  color: #94a3b8;
  font-size: 11px;
  user-select: none;
  background: rgba(0, 0, 0, 0.02);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.line-content {
  flex: 1;
  padding-left: 6px;
  color: transparent;
}

/* 行级颜色 */
.diff-removed-line {
  background: rgba(239, 68, 68, 0.08);
}

.diff-removed-line .line-gutter {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.diff-added-line {
  background: rgba(34, 197, 94, 0.08);
}

.diff-added-line .line-gutter {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.diff-empty-slot {
  background: repeating-linear-gradient(
    -45deg,
    rgba(0, 0, 0, 0.02),
    rgba(0, 0, 0, 0.02) 6px,
    rgba(0, 0, 0, 0.04) 6px,
    rgba(0, 0, 0, 0.04) 12px
  );
}

/* 词级精细高亮 */
:deep(.diff-word-removed) {
  background: rgba(239, 68, 68, 0.28);
  border-radius: 3px;
  padding: 1px 2px;
  color: transparent;
}

:deep(.diff-word-added) {
  background: rgba(34, 197, 94, 0.28);
  border-radius: 3px;
  padding: 1px 2px;
  color: transparent;
}

/* 视图 B: Unified 合并视图 */
.unified-view-panel {
  background: #1e1e24;
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.unified-view-panel .pane-header {
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.unified-view-panel .pane-title {
  color: #cbd5e1;
}

.unified-view-panel .icon-tool-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  width: auto;
  padding: 0 10px;
  gap: 6px;
}

.unified-diff-body {
  flex: 1;
  overflow: auto;
  padding: 12px 0;
  font-family: var(--font-mono, "SF Mono", Menlo, Monaco, Consolas, monospace);
  font-size: 13px;
  line-height: 22px;
}

.empty-diff-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #64748b;
  font-size: 14px;
}

.unified-line-row {
  display: flex;
  align-items: center;
  min-height: 22px;
  white-space: pre;
}

.unified-line-row.unified-added {
  background: rgba(34, 197, 94, 0.15);
}

.unified-line-row.unified-removed {
  background: rgba(239, 68, 68, 0.15);
}

.unified-line-row .line-num {
  width: 44px;
  min-width: 44px;
  text-align: right;
  padding-right: 8px;
  color: #64748b;
  font-size: 11px;
  user-select: none;
}

.unified-line-row.unified-added .new-num {
  color: #4ade80;
}

.unified-line-row.unified-removed .old-num {
  color: #f87171;
}

.line-prefix {
  width: 22px;
  text-align: center;
  font-weight: 700;
  user-select: none;
}

.unified-added .line-prefix { color: #4ade80; }
.unified-removed .line-prefix { color: #f87171; }
.unified-same .line-prefix { color: #64748b; }

.line-code {
  flex: 1;
  padding-left: 4px;
  color: #f8fafc;
}

.unified-added .line-code { color: #bbf7d0; }
.unified-removed .line-code { color: #fecaca; }

@media (max-width: 900px) {
  .split-view-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
  .glass-panel {
    height: 480px;
  }
}
</style>
