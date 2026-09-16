<!-- src/views/Home.vue (New Version with Search & Categories) -->
<template>
  <div class="home-container">
    <div class="header">
      <h1 class="main-title">便捷小工具集</h1>
      <a-typography-paragraph class="subtitle">
        一套精选的高效工具，纯本地执行，保护隐私，提升日常开发与创作效率。
      </a-typography-paragraph>

      <!-- 搜索与分类导航栏 -->
      <div class="filter-toolbar">
        <div class="search-input-wrapper">
          <a-input
            v-model:value="searchQuery"
            placeholder="搜索工具 (如: har, 抓包, 抠图, ico, json, nginx, 超分...)"
            allow-clear
            size="large"
            class="global-search-input"
          >
            <template #prefix>
              <SearchOutlined style="color: #94a3b8" />
            </template>
          </a-input>
        </div>

        <div class="category-pills">
          <div
            v-for="cat in categories"
            :key="cat.key"
            class="cat-pill"
            :class="{ active: currentCategory === cat.key }"
            @click="currentCategory = cat.key"
          >
            <span class="cat-icon">{{ cat.icon }}</span>
            <span class="cat-name">{{ cat.label }}</span>
            <span class="cat-count">({{ getCategoryCount(cat.key) }})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具卡片网格 -->
    <a-row :gutter="[24, 24]" v-if="filteredTools.length > 0">
      <a-col :xs="24" :sm="12" :md="8" v-for="tool in filteredTools" :key="tool.title">
        <ToolCard :title="tool.title" :description="tool.description" :to="tool.to" :icon="tool.icon" />
      </a-col>
    </a-row>

    <!-- 搜索无结果空状态 -->
    <div v-else class="empty-search-box">
      <div class="empty-icon">🔍</div>
      <div class="empty-text">未找到与 "{{ searchQuery }}" 匹配的工具</div>
      <a-button type="link" @click="resetFilter">清除搜索条件</a-button>
    </div>
  </div>
</template>

<script>
import { Row, Col, TypographyParagraph, Input } from "ant-design-vue";
import ToolCard from "../components/ToolCard.vue";

// 引入所有需要的图标
import {
  CodeOutlined,
  ThunderboltOutlined,
  FileMarkdownOutlined,
  FileTextOutlined,
  BugOutlined,
  ShareAltOutlined,
  FormatPainterOutlined,
  HeartOutlined,
  ToolOutlined,
  AppstoreAddOutlined,
  SwapOutlined,
  BuildOutlined,
  CompressOutlined,
  SplitCellsOutlined,
  FileImageOutlined,
  ZoomInOutlined,
  ScissorOutlined,
  SearchOutlined,
  Html5Outlined,
  ApiOutlined,
} from "@ant-design/icons-vue";

export default {
  name: "Home",
  components: {
    ToolCard,
    "a-row": Row,
    "a-col": Col,
    "a-typography-paragraph": TypographyParagraph,
    "a-input": Input,
    SearchOutlined,
  },
  data() {
    return {
      searchQuery: "",
      currentCategory: "all",
      categories: [
        { key: "all", label: "全部", icon: "✨" },
        { key: "dev", label: "前端与研发", icon: "💻" },
        { key: "media", label: "图像与多媒体", icon: "🖼️" },
        { key: "ops", label: "运维与配置", icon: "⚙️" },
        { key: "text", label: "文本与转换", icon: "📝" },
      ],
      tools: [
        {
          title: "超大 HAR 网络流深度全景诊断器",
          description: "浏览器抓包 HAR 纯本地秒级解析，结构化列式表格、各请求头/响应头深度透视、美观折叠 JSON 树、Cookie 与 Authorization Token 便捷复制。",
          to: "/tools/har-analyzer",
          icon: ApiOutlined,
          category: "dev",
        },
        {
          title: "AI 智能一键抠图 (背景消除)",
          description: "纯本地 WebGPU 显卡加速推理，发丝级透明背景生成，支持一键换底与全能流水线联动。",
          to: "/tools/background-removal",
          icon: ScissorOutlined,
          category: "media",
        },
        {
          title: "图片无损放大 (超分辨率)",
          description: "纯前端本地执行，结合 AI 神经网络与 Lanczos-3+CAS 边缘自适应锐化，支持 2x~4x 几乎无损放大。",
          to: "/tools/image-upscaler",
          icon: ZoomInOutlined,
          category: "media",
        },
        {
          title: "Favicon / ICO 极速生成器",
          description: "纯本地将各类图片转为浏览器左上角 ICO 图标，支持 16~256px 多尺寸合一及全套 Web 图标包。",
          to: "/tools/ico-converter",
          icon: FileImageOutlined,
          category: "media",
        },
        {
          title: "图片压缩工具",
          description: "可以支持上传图片，压缩后下载，支持批量处理。",
          to: "/tools/image-compress",
          icon: CompressOutlined,
          category: "media",
        },
        {
          title: "字符串转JSON",
          description: "将 key=value 格式的字符串快速转换为标准 JSON 对象。",
          to: "/tools/string-to-json",
          icon: CodeOutlined,
          category: "text",
        },
        {
          title: "智能日志分析器",
          description: "上传并分析日志文件，根据上下文规则智能过滤和高亮关键信息。",
          to: "/tools/log-analyzer",
          icon: FileTextOutlined,
          category: "ops",
        },
        {
          title: "React/Next.js 渲染器",
          description: "实时预览 AI 生成的 React/JSX 代码片段，即时查看 UI 效果。",
          to: "/tools/react-renderer",
          icon: ThunderboltOutlined,
          category: "dev",
        },
        {
          title: "Nginx 配置检查 & 格式化",
          description: "在线检查并美化 Nginx 配置文件，发现潜在的语法错误。",
          to: "/tools/nginx-formatter",
          icon: BuildOutlined,
          category: "ops",
        },
        {
          title: "Nginx 配置示例",
          description: "查看常用 Nginx 配置场景和示例，快速上手。",
          to: "/tools/nginx-example",
          icon: CodeOutlined,
          category: "ops",
        },
        {
          title: "Nginx 日志解析器",
          description: "上传 Nginx 日志文件，快速解析并可视化分析日志内容。",
          to: "/tools/nginx-log-parser",
          icon: CodeOutlined,
          category: "ops",
        },
        {
          title: "JSON 转类型定义",
          description: "将 JSON 数据快速转换为 TypeScript 接口或 JSDoc 类型。",
          to: "/tools/json-to-type",
          icon: AppstoreAddOutlined,
          category: "dev",
        },
        {
          title: "Mock 数据生成器",
          description: "根据 JSON 模板，快速生成大量结构相似但内容随机的模拟数据。",
          to: "/tools/mock-data-generator",
          icon: BugOutlined,
          category: "dev",
        },
        {
          title: "CSS ↔ Tailwind 转换器",
          description: "在标准 CSS 写法和 Tailwind 原子类之间进行智能双向转换。",
          to: "/tools/css-tailwind-converter",
          icon: SwapOutlined,
          category: "dev",
        },
        {
          title: "智能 JSON 修复器",
          description: "自动修复带有注释、末尾逗号或无引号键的非标准 JSON。",
          to: "/tools/json-fixer",
          icon: ToolOutlined,
          category: "dev",
        },
        {
          title: "交互式 CSS 生成器",
          description: "通过可视化面板快速生成精美的阴影、渐变和滤镜效果。",
          to: "/tools/css-generator",
          icon: FormatPainterOutlined,
          category: "dev",
        },
        {
          title: "HTML 实时渲染器",
          description: "粘贴 HTML 代码片段，即时查看渲染后的页面效果，支持内联样式和脚本。",
          to: "/tools/html-renderer",
          icon: Html5Outlined,
          category: "dev",
        },
        {
          title: "局域网文件快传 (F2FF)",
          description: "基于WebRTC的局域网文件互传工具，并支持通过Cloudflare R2进行文件中转。",
          to: "https://f2ff.netlify.app/",
          icon: ShareAltOutlined,
          category: "ops",
        },
        {
          title: "文本对比工具",
          description: "本地多模式文本差异对比，双栏分屏与词级精细颜色高亮。",
          to: "/tools/text-compare",
          icon: SplitCellsOutlined,
          category: "text",
        },
        {
          title: "base64 编码/解码工具",
          description: "在线编码和解码 base64 数据，支持批量处理。",
          to: "https://base64.us/",
          icon: ToolOutlined,
          category: "text",
        },
        {
          title: "Let's Encrypt 证书申请工具",
          description: "使用 Certbot 申请和管理 Let's Encrypt 证书，支持自动续签。",
          to: "/tools/letencrypt-certbot",
          icon: CodeOutlined,
          category: "ops",
        },
        {
          title: "Markdown 预览 & 导出",
          description: "优雅的 Markdown 实时预览工具，支持一键导出为高清 PDF 文档。",
          to: "/tools/markdown-preview",
          icon: FileMarkdownOutlined,
          category: "text",
        },
        {
          title: "图片处理工具",
          description: "在线处理图片，支持批量处理。",
          to: "https://www.iloveimg.com/zh-cn/",
          icon: HeartOutlined,
          category: "media",
        },
      ],
    };
  },
  computed: {
    filteredTools() {
      const q = this.searchQuery.trim().toLowerCase();
      return this.tools.filter((t) => {
        // 分类过滤
        if (this.currentCategory !== "all" && t.category !== this.currentCategory) {
          return false;
        }
        // 搜索关键词过滤
        if (q) {
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchDesc = t.description.toLowerCase().includes(q);
          const matchTo = t.to.toLowerCase().includes(q);
          return matchTitle || matchDesc || matchTo;
        }
        return true;
      });
    },
  },
  methods: {
    getCategoryCount(catKey) {
      if (catKey === "all") return this.tools.length;
      return this.tools.filter((t) => t.category === catKey).length;
    },
    resetFilter() {
      this.searchQuery = "";
      this.currentCategory = "all";
    },
  },
};
</script>

<style scoped>
.home-container {
  max-width: 1240px;
  margin: 0 auto;
  padding: 12px 24px 48px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.main-title {
  font-size: 28px;
  font-weight: 800;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.5px;
}

.subtitle {
  font-size: 15px;
  color: #64748b;
  max-width: 620px;
  margin: 8px auto 20px;
}

/* 搜索与分类导航 */
.filter-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  max-width: 680px;
  margin: 0 auto 12px;
}

.search-input-wrapper {
  width: 100%;
}

.global-search-input {
  border-radius: 24px;
  box-shadow: 0 4px 16px -2px rgba(0, 0, 0, 0.06);
  border: 1.5px solid #e2e8f0;
  padding: 8px 16px;
  transition: all 0.2s;
}

.global-search-input:hover,
.global-search-input:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 4px 20px -2px rgba(59, 130, 246, 0.15);
}

.category-pills {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.cat-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.cat-pill:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.cat-pill.active {
  background: #3b82f6;
  border-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
}

.cat-count {
  font-size: 11px;
  opacity: 0.8;
}

/* 响应式调整列数 */
.ant-row {
  justify-content: flex-start;
}

/* 空状态 */
.empty-search-box {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 16px;
  color: #64748b;
  margin-bottom: 8px;
}
</style>
