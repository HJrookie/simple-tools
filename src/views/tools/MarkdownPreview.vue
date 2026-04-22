<!-- src/views/tools/MarkdownPreview.vue -->
<template>
  <div class="md-page-container">
    <a-page-header class="no-print" title="Markdown 实时预览 & PDF 导出" @back="() => this.$router.push('/')" style="padding: 0px 10px">
      <template #extra>
        <a-space>
          <!-- 分享按钮 -->
          <a-button @click="shareDocument" :loading="isSharing">
            <template #icon><ShareAltOutlined /></template>
            分享
          </a-button>
          <a-button @click="showSettings = true">
            <template #icon><SettingOutlined /></template>
            设置
          </a-button>
          <a-button @click="resetContent">
            <template #icon><ReloadOutlined /></template>
            重置
          </a-button>
          <!-- <a-button type="primary" :loading="isExporting" @click="exportToPdf">
            <template #icon><FilePdfOutlined /></template>
            {{ isExporting ? "生成中..." : "导出 PDF" }}
          </a-button> -->
        </a-space>
      </template>
    </a-page-header>

    <div class="editor-layout">
      <!-- 左侧：编辑器区域 -->
      <div class="editor-pane no-print">
        <div class="pane-header">
          <span>Markdown 编辑器</span>
          <span class="tip-text">（支持 LaTeX、高亮、粘贴图片）</span>
        </div>
        <div class="code-wrapper">
          <codemirror v-model="markdownContent" placeholder="# 开始写作..." :style="{ height: '100%' }" :autofocus="true" :indent-with-tab="true" :tab-size="2" :extensions="extensions" @change="handleInput" />
        </div>
      </div>

      <!-- 右侧：预览区域 -->
      <div class="preview-pane">
        <div class="pane-header no-print">实时预览</div>
        <!-- 增加 @click 事件监听，用于事件委托捕获复制按钮点击 -->
        <div id="pdf-content" class="preview-content markdown-body" :style="previewStyle" v-html="htmlContent" ref="previewRef" @click="handlePreviewClick"></div>
      </div>
    </div>

    <!-- 样式设置抽屉 -->
    <a-drawer title="阅读与导出设置" placement="right" :open="showSettings" @close="showSettings = false">
      <a-typography-title :level="5">字体风格</a-typography-title>
      <a-radio-group v-model:value="config.fontFamily" class="style-radio-group">
        <a-radio class="style-radio" v-for="font in fontOptions" :key="font.value" :value="font.value">
          <div :style="{ fontFamily: font.value }">{{ font.label }}</div>
        </a-radio>
      </a-radio-group>
      <a-divider />
      <a-typography-title :level="5">背景颜色</a-typography-title>
      <div class="color-grid">
        <div
          v-for="color in colorOptions"
          :key="color.value"
          class="color-swatch"
          :class="{ active: config.backgroundColor === color.value }"
          :style="{ backgroundColor: color.value }"
          @click="config.backgroundColor = color.value"
        >
          <div class="color-label">{{ color.label }}</div>
          <CheckOutlined v-if="config.backgroundColor === color.value" class="check-icon" />
        </div>
      </div>
      <a-divider />
      <a-button block @click="resetConfig">恢复默认样式</a-button>
    </a-drawer>

    <div ref="exportContainer" style="position: fixed; left: -10000px; top: 0; width: 800px; z-index: -100"></div>
  </div>
</template>

<script>
import { PageHeader, Button, Space, message, Drawer, Radio, TypographyTitle, Divider, Modal } from "ant-design-vue";
import { FilePdfOutlined, ReloadOutlined, SettingOutlined, CheckOutlined, ShareAltOutlined, CopyOutlined } from "@ant-design/icons-vue";
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
import "prismjs/components/prism-json"; // 额外的高亮支持 json
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

  // 复制按钮使用的 SVG 图标
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

export default {
  name: "MarkdownPreview",
  components: {
    "a-page-header": PageHeader,
    "a-button": Button,
    "a-space": Space,
    "a-drawer": Drawer,
    "a-radio-group": Radio.Group,
    "a-radio": Radio,
    "a-typography-title": TypographyTitle,
    "a-divider": Divider,
    FilePdfOutlined,
    ReloadOutlined,
    SettingOutlined,
    CheckOutlined,
    ShareAltOutlined,
    Codemirror,
  },
  data() {
    return {
      markdownContent: "",
      htmlContent: "",
      extensions: [markdown(), oneDark, ViewPlugin.fromClass(class {}, { eventHandlers: { paste: this.handlePasteEvent } })],
      debounceTimer: null,
      isExporting: false,
      isSharing: false,
      showSettings: false,
      apiBase: "https://notes.24992345.xyz/api",
      config: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        backgroundColor: "#ffffff",
      },
      fontOptions: [
        { label: "标准黑体 (系统默认)", value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' },
        { label: "微软雅黑 (经典)", value: '"Microsoft YaHei", "微软雅黑", "PingFang SC", sans-serif' },
        { label: "优雅宋体 (适合阅读)", value: '"Songti SC", "SimSun", "Times New Roman", Times, serif' },
        { label: "等宽代码 (技术文档)", value: '"Courier New", Courier, monospace' },
      ],
      colorOptions: [
        { label: "纯净白", value: "#ffffff" },
        { label: "护眼绿", value: "#cce8cf" },
        { label: "羊皮纸", value: "#f8f1e1" },
        { label: "极客灰", value: "#f5f5f5" },
      ],
    };
  },
  computed: {
    previewStyle() {
      return { fontFamily: this.config.fontFamily, backgroundColor: this.config.backgroundColor };
    },
  },
  mounted() {
    this.loadConfig();
    this.initContent();
  },
  methods: {
    getAuthHeader(pass) {
      const token = pass || sessionStorage.getItem("notes_session_key");
      return token ? { "x-notes-auth": encodeURIComponent(token) } : {};
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
        this.markdownContent = `# 全能 Markdown 编辑器

支持 **LaTeX 公式** 与 **多语言代码一键复制**。

## 1. 代码一键复制测试

**JSON:**
\`\`\`json
{
  "name": "simple-tools",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "vite"
  }
}
\`\`\`

**Shell:**
\`\`\`bash
npm install ant-design-vue@next
npm run dev
\`\`\`

## 2. 数学公式 (LaTeX)

行内公式： $E = mc^2$

块级公式：
$$
\\frac{1}{\\sigma\\sqrt{2\\pi}} \\exp\\left( -\\frac{(x-\\mu)^2}{2\\sigma^2} \\right)
$$
`;
        this.renderHtml();
      }
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
          title: "分享链接已生成 (有效期30天)",
          content: shareUrl,
          okText: "复制链接",
          onOk: () => {
            navigator.clipboard.writeText(shareUrl);
            message.success("已复制");
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

    // 处理代码块复制事件 (事件委托)
    handlePreviewClick(e) {
      const btn = e.target.closest(".copy-btn");
      if (btn) {
        const container = btn.closest(".code-block-container");
        if (!container) return;
        const pre = container.querySelector("pre");
        if (pre) {
          // textContent 提取纯文本(自带换行)，不受 DOM 高亮 span 的干扰
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
      }, 300);
    },

    renderHtml() {
      const rawHtml = marked.parse(this.markdownContent);
      this.htmlContent = DOMPurify.sanitize(rawHtml, {
        // 白名单添加 button, svg 相关的标签支持复制按钮的显示
        ADD_TAGS: ["math", "annotation", "semantics", "mtext", "mn", "mo", "mi", "msup", "msub", "mfrac", "mrow", "msqrt", "table", "tr", "td", "th", "button", "svg", "path", "span"],
        ADD_ATTR: ["xmlns", "display", "mathvariant", "class", "style", "viewBox", "width", "height", "fill", "d"],
      });
    },

    resetContent() {
      window.location.href = window.location.pathname;
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
      this.config = { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif', backgroundColor: "#ffffff" };
      message.success("样式已恢复默认");
    },

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
              const imageMarkdown = `\n![粘贴的图片](${base64})\n`;
              const range = view.state.selection.main;
              const transaction = view.state.update({
                changes: { from: range.from, to: range.to, insert: imageMarkdown },
                selection: { anchor: range.from + imageMarkdown.length },
              });
              view.dispatch(transaction);
              message.success("图片已粘贴");
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
.md-page-container {
  height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
}
.editor-layout {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
}
.editor-pane,
.preview-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #f0f0f0;
  overflow: hidden;
}
.pane-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: 600;
  background-color: #fafafa;
  color: #555;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
}
.tip-text {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}
.code-wrapper {
  flex: 1;
  overflow: hidden;
}
.code-wrapper :deep(.cm-editor) {
  height: 100%;
}
.preview-pane {
  background-color: #ffffff;
}
.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px;
  background-color: white;
  transition:
    background-color 0.3s,
    color 0.3s;
}
.preview-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  page-break-inside: avoid;
  break-inside: avoid;
}
.preview-content::-webkit-scrollbar {
  width: 8px;
}
.preview-content::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 4px;
}
.preview-content::-webkit-scrollbar-thumb:hover {
  background: #ccc;
}
.preview-content :deep(.katex-display) {
  overflow-x: auto;
  overflow-y: hidden;
  page-break-inside: avoid;
}

/* =======================================
   代码块专属样式 (支持头部和一键复制)
======================================= */
.preview-content :deep(.code-block-container) {
  position: relative;
  margin: 1.2em 0;
  background: #272822; /* 匹配 Prism Okaidia 黑色主题 */
  border-radius: 6px;
  overflow: hidden;
  page-break-inside: avoid;
}

.preview-content :deep(.code-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: #1e1e1e; /* 稍暗的顶部背景，区分代码内容区 */
  color: #9cdcfe;
  font-size: 13px;
  font-family: Consolas, Monaco, "Andale Mono", monospace;
  user-select: none;
}

.preview-content :deep(.copy-btn) {
  display: flex;
  align-items: center;
  background: transparent;
  border: 1px solid #4d4d4d;
  color: #d4d4d4;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1.2;
}

.preview-content :deep(.copy-btn:hover) {
  background: #4d4d4d;
  color: #fff;
}

.preview-content :deep(.copy-btn.copied) {
  color: #4caf50;
  border-color: #4caf50;
}

.preview-content :deep(pre[class*="language-"]) {
  background: transparent !important;
  margin: 0 !important;
  border-radius: 0;
  padding: 12px 16px;
}

.preview-content :deep(code[class*="language-"]) {
  text-shadow: none !important;
  font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace;
}

/* 抽屉样式等无关逻辑 */
.style-radio-group {
  width: 100%;
}
.style-radio {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 8px;
  border-radius: 6px;
}
.style-radio:hover {
  background-color: #f5f5f5;
}
.color-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.color-swatch {
  height: 60px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}
.color-swatch:hover {
  transform: scale(1.02);
}
.color-swatch.active {
  border-color: #1890ff;
}
.color-label {
  font-size: 12px;
  color: #555;
  background: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
}
.check-icon {
  position: absolute;
  top: 4px;
  right: 4px;
  color: #1890ff;
}
</style>
