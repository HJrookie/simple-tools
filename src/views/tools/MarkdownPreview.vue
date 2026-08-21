<!-- src/views/tools/MarkdownPreview.vue (Apple Glassmorphism & Drag-and-Drop File Replacement) -->
<template>
  <div
    class="md-preview-container"
    @dragover.prevent="handleDragOver"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <!-- 拖拽文件时的 Apple 毛玻璃遮罩提示 -->
    <transition name="fade">
      <div v-if="isDraggingFile" class="drag-drop-overlay" aria-hidden="true">
        <div class="drop-zone-card">
          <div class="drop-icon-squircle">
            <CloudUploadOutlined class="drop-icon" />
          </div>
          <h3 class="drop-title">松开鼠标，载入并替换 Markdown 内容</h3>
          <p class="drop-desc">支持 .md、.markdown、.txt 等文本文件</p>
        </div>
      </div>
    </transition>

    <!-- 隐藏的本地文件选择器 -->
    <input
      type="file"
      ref="fileInputRef"
      accept=".md,.markdown,.txt,.json,text/*"
      style="display: none"
      @change="handleFileSelected"
    />

    <!-- 头部 Apple 毛玻璃操作栏 -->
    <div class="glass-action-bar no-print">
      <div class="bar-left">
        <h2 class="tool-heading">Markdown 实时预览 & 导出</h2>
        <span class="tool-tip-pill">
          <FileMarkdownOutlined />
          <span>拖拽文件直接替换 · LaTeX 支持</span>
        </span>
      </div>

      <div class="bar-right" v-if="!$route.query.s">
        <!-- 导入文件 -->
        <a-button @click="triggerFileInput" class="action-btn">
          <template #icon><FolderOpenOutlined /></template>
          导入文件
        </a-button>

        <!-- 导出 PDF / 打印 -->
        <a-button type="primary" @click="exportToPdf" class="action-btn export-btn" :loading="isExporting">
          <template #icon><FilePdfOutlined /></template>
          导出 PDF / 打印
        </a-button>

        <!-- 分享按钮 -->
        <a-button @click="shareDocument" :loading="isSharing" class="action-btn">
          <template #icon><ShareAltOutlined /></template>
          分享
        </a-button>

        <!-- 排版设置 -->
        <a-button @click="showSettings = true" class="action-btn">
          <template #icon><SettingOutlined /></template>
          排版设置
        </a-button>

        <!-- 重置 -->
        <a-button @click="resetToDefault" class="action-btn">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
      </div>
    </div>

    <!-- 主体双栏编辑器与预览工作区 -->
    <div class="editor-layout">
      <!-- 左侧：编辑器区域 -->
      <div class="glass-panel editor-pane no-print">
        <div class="panel-header">
          <div class="header-title-group">
            <span class="panel-title">Markdown 源码</span>
            <span class="tip-text">（拖放外部文件直接替换 · 粘贴图片）</span>
          </div>
          <div class="header-meta">
            <span class="stat-badge">{{ docStats.words }} 词 · {{ docStats.chars }} 字符 · {{ docStats.lines }} 行</span>
          </div>
        </div>

        <div class="code-wrapper">
          <codemirror
            v-model="markdownContent"
            placeholder="# 开始写作，或直接把 .md 文件拖进窗口..."
            :style="{ height: '100%' }"
            :autofocus="true"
            :indent-with-tab="true"
            :tab-size="2"
            :extensions="extensions"
            @change="handleInput"
          />
        </div>
      </div>

      <!-- 右侧：实时预览区域 -->
      <div class="glass-panel preview-pane">
        <div class="panel-header no-print">
          <span class="panel-title">实时渲染视图</span>
          <span class="preview-theme-indicator" :style="{ backgroundColor: config.backgroundColor }">
            {{ currentThemeLabel }}
          </span>
        </div>

        <div
          id="pdf-content"
          class="preview-content markdown-body"
          :style="previewStyle"
          v-html="htmlContent"
          ref="previewRef"
          @click="handlePreviewClick"
        ></div>
      </div>
    </div>

    <!-- 样式设置抽屉 (Apple Glass Drawer) -->
    <a-drawer
      title="阅读与导出排版设置"
      placement="right"
      :open="showSettings"
      @close="showSettings = false"
      :width="360"
    >
      <div class="drawer-section">
        <h4 class="drawer-title">字体风格</h4>
        <div class="font-options-list">
          <div
            v-for="font in fontOptions"
            :key="font.value"
            class="font-option-card"
            :class="{ active: config.fontFamily === font.value }"
            @click="config.fontFamily = font.value"
          >
            <span class="font-sample" :style="{ fontFamily: font.value }">{{ font.label }}</span>
            <CheckOutlined v-if="config.fontFamily === font.value" class="font-check-icon" />
          </div>
        </div>
      </div>

      <a-divider style="margin: 20px 0" />

      <div class="drawer-section">
        <h4 class="drawer-title">预览背景色</h4>
        <div class="color-grid">
          <div
            v-for="color in colorOptions"
            :key="color.value"
            class="color-swatch-card"
            :class="{ active: config.backgroundColor === color.value }"
            :style="{ backgroundColor: color.value }"
            @click="config.backgroundColor = color.value"
          >
            <span class="color-label">{{ color.label }}</span>
            <CheckOutlined v-if="config.backgroundColor === color.value" class="color-check-icon" />
          </div>
        </div>
      </div>

      <a-divider style="margin: 20px 0" />

      <div class="drawer-footer-actions">
        <a-button block @click="resetConfig">
          恢复默认排版
        </a-button>
      </div>
    </a-drawer>

    <div ref="exportContainer" style="position: fixed; left: -10000px; top: 0; width: 800px; z-index: -100"></div>
  </div>
</template>

<script>
import { message, Modal } from "ant-design-vue";
import {
  FilePdfOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckOutlined,
  ShareAltOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
  FileMarkdownOutlined,
} from "@ant-design/icons-vue";
import { Codemirror } from "vue-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { ViewPlugin } from "@codemirror/view";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "github-markdown-css/github-markdown.css";
import katex from "katex";
import "katex/dist/katex.min.css";
import markedKatex from "marked-katex-extension";
import Prism from "prismjs";
import "prismjs/themes/prism-okaidia.css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-java";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-go";
import "prismjs/components/prism-sql";
import html2pdf from "html2pdf.js";
import axios from "axios";

marked.use(markedKatex({ throwOnError: false, output: "html" }));
const renderer = new marked.Renderer();

// 自定义代码渲染逻辑：包裹一个带有复制按钮和语言标识的头部
renderer.code = ({ text, lang }) => {
  const language = Prism.languages[lang] || Prism.languages.plaintext;
  const highlighted = Prism.highlight(text, language, lang || "plaintext");
  const langText = lang ? lang.toLowerCase() : "text";

  const copySvg = `<svg viewBox="0 0 1024 1024" width="14" height="14" fill="currentColor" style="vertical-align: middle; margin-right: 4px;"><path d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32z"></path><path d="M704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c6 6 14.1 9.4 22.6 9.4H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM352 811.3V736c0-4.4-3.6-8-8-8h-75.3l83.3 83.3zM664 888H416V712c0-17.7-14.3-32-32-32H232V264h432v624z"></path></svg>`;

  return `<div class="code-block-container">
    <div class="code-header no-print">
      <span class="lang-label">${langText}</span>
      <button class="copy-btn">${copySvg}<span class="copy-text">复制</span></button>
    </div>
    <pre class="language-${lang || "plaintext"}"><code class="language-${lang || "plaintext"}">${highlighted}</code></pre>
  </div>`;
};
marked.use({ renderer });

const STORAGE_KEY = "md_preview_config_v1";

const defaultSampleMarkdown = `# 全能 Markdown 实时写作器

✨ 支持 **外部文件直接拖入替换**、**LaTeX 公式** 与 **高清矢量 PDF 导出**。

---

## 1. 代码一键复制测试

\`\`\`typescript
interface UserProfile {
  id: number;
  name: string;
  role: 'admin' | 'creator';
  isVerified: boolean;
}

const welcomeUser = (user: UserProfile): string => {
  return \`Welcome, \${user.name} (\${user.role})!\`;
};
\`\`\`

\`\`\`bash
# 快速启动
pnpm install
pnpm run dev
\`\`\`

---

## 2. 数学公式 (LaTeX)

行内质能方程公式： $E = mc^2$

正态分布概率密度函数：

$$
f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\left( -\\frac{(x-\\mu)^2}{2\\sigma^2} \\right)
$$

---

## 3. 拖拽与导入支持

> 💡 **提示**：直接把本地任意 \`.md\` 或 \`.txt\` 文档拖进此窗口，即可瞬间载入并实时渲染！
`;

export default {
  name: "MarkdownPreview",
  components: {
    FilePdfOutlined,
    ReloadOutlined,
    SettingOutlined,
    CheckOutlined,
    ShareAltOutlined,
    FolderOpenOutlined,
    CloudUploadOutlined,
    FileMarkdownOutlined,
    Codemirror,
  },
  data() {
    return {
      markdownContent: "",
      htmlContent: "",
      extensions: [
        markdown(),
        oneDark,
        ViewPlugin.fromClass(class {}, { eventHandlers: { paste: this.handlePasteEvent } }),
      ],
      debounceTimer: null,
      isExporting: false,
      isSharing: false,
      showSettings: false,
      isDraggingFile: false,
      dragCounter: 0,
      apiBase: "https://notes.24992345.xyz/api",
      config: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif',
        backgroundColor: "#ffffff",
      },
      fontOptions: [
        { label: "Apple SF / 系统默认", value: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif' },
        { label: "微软雅黑 (现代无衬线)", value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
        { label: "宋体 / 衬线 (纸质阅读)", value: '"Songti SC", "SimSun", "Times New Roman", Times, serif' },
        { label: "等宽字体 (技术文档)", value: '"SF Mono", Menlo, Monaco, "Courier New", monospace' },
      ],
      colorOptions: [
        { label: "纯净白", value: "#ffffff" },
        { label: "极客灰", value: "#f8f9fa" },
        { label: "羊皮纸", value: "#fcf8ee" },
        { label: "护眼绿", value: "#eef7f0" },
      ],
    };
  },
  computed: {
    previewStyle() {
      return {
        fontFamily: this.config.fontFamily,
        backgroundColor: this.config.backgroundColor,
      };
    },
    currentThemeLabel() {
      const match = this.colorOptions.find((c) => c.value === this.config.backgroundColor);
      return match ? match.label : "纯净白";
    },
    docStats() {
      const text = this.markdownContent || "";
      const chars = text.length;
      const lines = text ? text.split("\n").length : 0;
      const words = (text.match(/[\u4e00-\u9fa5]|\b\w+\b/g) || []).length;
      return { chars, lines, words };
    },
    documentTitle() {
      const match = this.markdownContent.match(/^#\s+(.+)$/m);
      if (match && match[1]) {
        return match[1].trim().replace(/[\\/:*?"<>|]/g, "_");
      }
      return `Markdown_${Date.now()}`;
    },
  },
  watch: {
    config: {
      deep: true,
      handler(newVal) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newVal));
      },
    },
  },
  mounted() {
    this.loadConfig();
    this.initContent();
  },
  methods: {
    // --- 核心：拖拽外部文件载入并直接替换内容 ---
    handleDragEnter(e) {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        this.dragCounter++;
        this.isDraggingFile = true;
      }
    },
    handleDragOver(e) {
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      this.isDraggingFile = true;
    },
    handleDragLeave() {
      this.dragCounter--;
      if (this.dragCounter <= 0) {
        this.dragCounter = 0;
        this.isDraggingFile = false;
      }
    },
    handleDrop(e) {
      this.dragCounter = 0;
      this.isDraggingFile = false;

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const file = files[0];
      this.readFileContent(file);
    },

    triggerFileInput() {
      this.$refs.fileInputRef.click();
    },
    handleFileSelected(e) {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      this.readFileContent(files[0]);
      e.target.value = "";
    },

    readFileContent(file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        this.markdownContent = content;
        this.renderHtml();
        message.success(`已载入并替换内容: ${file.name}`);
      };
      reader.onerror = () => {
        message.error("读取文件失败，请确保文件是文本格式！");
      };
      reader.readAsText(file, "UTF-8");
    },

    async initContent() {
      const urlParams = new URLSearchParams(window.location.search);
      const shareId = urlParams.get("s");

      if (shareId) {
        const hide = message.loading("正在获取分享内容...", 0);
        try {
          const res = await axios.get(`${this.apiBase}/share/${shareId}`);
          const data = res.data;
          this.markdownContent = data.content;
          if (data.config) this.config = data.config;
          this.renderHtml();
          hide();
        } catch (e) {
          hide();
          message.error("分享失效");
          this.markdownContent = "# 链接已失效";
          this.renderHtml();
        }
      } else {
        this.markdownContent = defaultSampleMarkdown;
        this.renderHtml();
      }
    },

    resetToDefault() {
      this.markdownContent = defaultSampleMarkdown;
      this.renderHtml();
      message.success("已重置为默认示例内容");
    },

    async shareDocument() {
      let savedPass = sessionStorage.getItem("notes_session_key");

      if (!savedPass) {
        const pass = prompt("此操作需要输入访问密码：");
        if (!pass) return;
        savedPass = pass;
      }

      this.isSharing = true;
      try {
        const shareData = {
          content: this.markdownContent,
          config: this.config,
        };

        const res = await axios.post(`${this.apiBase}/share`, JSON.stringify(shareData), {
          headers: { "x-notes-auth": encodeURIComponent(savedPass) },
        });

        sessionStorage.setItem("notes_session_key", savedPass);

        const shareId = res.data;
        const shareUrl = `${window.location.origin}${window.location.pathname}?s=${shareId}`;

        Modal.success({
          title: "分享链接已生成 (有效期 30 天)",
          content: shareUrl,
          okText: "复制链接",
          onOk: () => {
            navigator.clipboard.writeText(shareUrl);
            message.success("链接已复制到剪贴板");
          },
        });
      } catch (e) {
        if (e.response && e.response.status === 401) {
          message.error("密码错误，无法创建分享");
          sessionStorage.removeItem("notes_session_key");
        } else {
          message.error("分享失败");
        }
      } finally {
        this.isSharing = false;
      }
    },

    handlePreviewClick(e) {
      const btn = e.target.closest(".copy-btn");
      if (btn) {
        const container = btn.closest(".code-block-container");
        if (!container) return;
        const pre = container.querySelector("pre");
        if (pre) {
          const code = pre.textContent;
          navigator.clipboard
            .writeText(code)
            .then(() => {
              const textSpan = btn.querySelector(".copy-text");
              if (textSpan) {
                textSpan.innerText = "已复制";
                btn.classList.add("copied");
                setTimeout(() => {
                  textSpan.innerText = "复制";
                  btn.classList.remove("copied");
                }, 2000);
              }
            })
            .catch(() => {
              message.error("复制失败");
            });
        }
      }
    },

    handleInput() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.renderHtml();
      }, 250);
    },

    renderHtml() {
      const rawHtml = marked.parse(this.markdownContent || "");
      this.htmlContent = DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: ["math", "annotation", "semantics", "mtext", "mn", "mo", "mi", "msup", "msub", "mfrac", "mrow", "msqrt", "table", "tr", "td", "th", "button", "svg", "path", "span"],
        ADD_ATTR: ["xmlns", "display", "mathvariant", "class", "style", "viewBox", "width", "height", "fill", "d"],
      });
    },

    loadConfig() {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          this.config = JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    },

    resetConfig() {
      this.config = {
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif',
        backgroundColor: "#ffffff",
      };
      message.success("排版样式已恢复默认");
    },

    // ==========================================
    // 高清矢量 PDF 导出 (通过隔离 iframe 唤起打印/保存为 PDF)
    // ==========================================
    async exportToPdf() {
      this.isExporting = true;
      const originalElement = this.$refs.previewRef;
      const clone = originalElement.cloneNode(true);

      // --- 关键修改：剔除克隆中的复制按钮，以免污染 PDF 导出版面 ---
      const copyBtns = clone.querySelectorAll(".copy-btn");
      copyBtns.forEach((btn) => btn.remove());

      clone.style.height = "auto";
      clone.style.width = "100%";
      clone.style.overflow = "visible";
      clone.style.padding = "0";
      clone.style.margin = "0";
      clone.style.backgroundColor = this.config.backgroundColor || "#fff";
      const container = this.$refs.exportContainer;
      container.innerHTML = "";
      container.appendChild(clone);

      const images = Array.from(clone.querySelectorAll("img"));
      if (images.length > 0) {
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = resolve;
              img.onerror = resolve;
            });
          })
        );
        await new Promise((r) => setTimeout(r, 200));
      }

      const opt = {
        margin: [15, 15, 15, 15],
        filename: `markdown_export_${new Date().getTime()}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowWidth: 800 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      html2pdf()
        .set(opt)
        .from(clone)
        .save()
        .then(() => {
          this.isExporting = false;
          container.innerHTML = "";
          message.success("PDF 导出成功！");
        })
        .catch((err) => {
          this.isExporting = false;
          message.error("导出失败");
        });
    },

    handlePasteEvent(event, view) {
      const items = event.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          event.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            this.convertFileToBase64(file).then((base64) => {
              const imageMarkdown = `\n![图片](${base64})\n`;
              const range = view.state.selection.main;
              const transaction = view.state.update({
                changes: { from: range.from, to: range.to, insert: imageMarkdown },
                selection: { anchor: range.from + imageMarkdown.length },
              });
              view.dispatch(transaction);
              message.success("已粘贴图片");
            });
          }
          return;
        }
      }
    },
    convertFileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
      });
    },
  },
};
</script>

<style scoped>
.md-preview-container {
  position: relative;
  height: calc(100vh - 24px);
  padding: 12px 18px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  font-family: var(--font-apple, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif);
}

/* 拖拽文件时的 Apple 毛玻璃遮罩 */
.drag-drop-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.drop-zone-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 64px;
  background: rgba(255, 255, 255, 0.85);
  border: 2px dashed #0071e3;
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(0, 113, 227, 0.15);
  transform: scale(1.02);
  animation: pulseCard 2s infinite ease-in-out;
}

@keyframes pulseCard {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
}

.drop-icon-squircle {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: linear-gradient(135deg, #0071e3 0%, #6366f1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 32px;
  margin-bottom: 18px;
  box-shadow: 0 8px 20px rgba(0, 113, 227, 0.3);
}

.drop-title {
  font-size: 20px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 8px;
}

.drop-desc {
  font-size: 14px;
  color: #6e6e73;
  margin: 0;
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
  margin-bottom: 14px;
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

.tool-tip-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 9999px;
  background: rgba(0, 113, 227, 0.1);
  color: #0071e3;
  font-size: 12px;
  font-weight: 500;
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.action-btn {
  border-radius: 9999px;
  font-weight: 500;
}

.export-btn {
  background: linear-gradient(180deg, #0077ed 0%, #0071e3 100%) !important;
  border: none !important;
}

/* 双栏编辑器与预览 */
.editor-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  overflow: hidden;
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

.stat-badge {
  font-size: 11.5px;
  color: #86868b;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 8px;
  border-radius: 9999px;
}

.preview-theme-indicator {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: #48484a;
}

.code-wrapper {
  flex: 1;
  overflow: hidden;
  background: #282c34;
}

.code-wrapper :deep(.cm-editor) {
  height: 100%;
  font-family: var(--font-mono, monospace);
  font-size: 14px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px;
  transition: background-color 0.3s, color 0.3s;
}

.preview-content :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.preview-content :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
}

/* 代码块高亮与一键复制 */
.preview-content :deep(.code-block-container) {
  position: relative;
  margin: 1.4em 0;
  background: #272822;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.preview-content :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  background: #1e1e1e;
  color: #9cdcfe;
  font-size: 12px;
  font-family: var(--font-mono, monospace);
  user-select: none;
}

.preview-content :deep(.copy-btn) {
  display: flex;
  align-items: center;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #d4d4d4;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-content :deep(.copy-btn:hover) {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.preview-content :deep(.copy-btn.copied) {
  color: #34d399;
  border-color: #34d399;
}

.preview-content :deep(pre[class*="language-"]) {
  background: transparent !important;
  margin: 0 !important;
  border-radius: 0;
  padding: 14px 16px;
}

/* 抽屉设置选项 */
.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.drawer-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
}

.font-options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.font-option-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.font-option-card:hover {
  background: rgba(0, 113, 227, 0.06);
}

.font-option-card.active {
  background: rgba(0, 113, 227, 0.1);
  border-color: #0071e3;
}

.font-sample {
  font-size: 13.5px;
  color: #1d1d1f;
}

.font-check-icon {
  color: #0071e3;
  font-size: 14px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.color-swatch-card {
  height: 60px;
  border-radius: 12px;
  border: 2px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, border-color 0.2s;
}

.color-swatch-card:hover {
  transform: translateY(-2px);
}

.color-swatch-card.active {
  border-color: #0071e3;
  box-shadow: 0 4px 12px rgba(0, 113, 227, 0.2);
}

.color-label {
  font-size: 12px;
  color: #48484a;
  background: rgba(255, 255, 255, 0.85);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.color-check-icon {
  position: absolute;
  top: 6px;
  right: 6px;
  color: #0071e3;
  font-size: 13px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .editor-layout {
    grid-template-columns: 1fr;
    height: auto;
  }
  .glass-panel {
    height: 480px;
  }
}
</style>
