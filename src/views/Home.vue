<!-- src/views/Home.vue (New Version) -->
<template>
  <div class="home-container">
    <div class="header">
      <a-typography-title>便捷小工具集</a-typography-title>
      <a-typography-paragraph class="subtitle"> 一套精选的小工具，旨在提升你的日常开发效率和乐趣。 </a-typography-paragraph>
    </div>
    <a-row :gutter="[24, 24]">
      <a-col :xs="24" :sm="12" :md="8" v-for="tool in tools" :key="tool.title">
        <ToolCard :title="tool.title" :description="tool.description" :to="tool.to" :icon="tool.icon" />
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { Row, Col, TypographyTitle, TypographyParagraph } from "ant-design-vue";
import ToolCard from "../components/ToolCard.vue";

// 引入所有需要的图标
import { CodeOutlined, ThunderboltOutlined, BugOutlined, ShareAltOutlined, FormatPainterOutlined, ToolOutlined, AppstoreAddOutlined, SwapOutlined, BuildOutlined } from "@ant-design/icons-vue";
import { Html5Outlined } from "@ant-design/icons-vue";

// todo 增加我的那个文件上传的应用.
export default {
  name: "Home",
  components: {
    ToolCard,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-typography-paragraph": TypographyParagraph,
  },
  data() {
    return {
      tools: [
        {
          title: "字符串转JSON",
          description: "将 key=value 格式的字符串快速转换为标准 JSON 对象。",
          to: "/tools/string-to-json",
          icon: CodeOutlined,
        },
        {
          title: "Nginx 配置检查 & 格式化",
          description: "在线检查并美化 Nginx 配置文件，发现潜在的语法错误。",
          to: "/tools/nginx-formatter",
          icon: BuildOutlined,
        },
        {
          title: "React/Next.js 渲染器",
          description: "实时预览 AI 生成的 React/JSX 代码片段，即时查看 UI 效果。",
          to: "/tools/react-renderer",
          icon: ThunderboltOutlined,
        },
        {
          title: "JSON 转类型定义",
          description: "将 JSON 数据快速转换为 TypeScript 接口或 JSDoc 类型。",
          to: "/tools/json-to-type",
          icon: AppstoreAddOutlined,
        },
        {
          title: "Mock 数据生成器",
          description: "根据 JSON 模板，快速生成大量结构相似但内容随机的模拟数据。",
          to: "/tools/mock-data-generator",
          icon: BugOutlined,
        },
        {
          title: "CSS ↔ Tailwind 转换器",
          description: "在标准 CSS 写法和 Tailwind 原子类之间进行智能双向转换。",
          to: "/tools/css-tailwind-converter",
          icon: SwapOutlined,
        },
        {
          title: "智能 JSON 修复器",
          description: "自动修复带有注释、末尾逗号或无引号键的非标准 JSON。",
          to: "/tools/json-fixer",
          icon: ToolOutlined,
        },
        {
          title: "交互式 CSS 生成器",
          description: "通过可视化面板快速生成精美的阴影、渐变和滤镜效果。",
          to: "/tools/css-generator",
          icon: FormatPainterOutlined,
        },
        {
          title: "HTML 实时渲染器",
          description: "粘贴 HTML 代码片段，即时查看渲染后的页面效果，支持内联样式和脚本。",
          to: "/tools/html-renderer",
          icon: Html5Outlined,
        },
        // [新增] 添加 F2FF 文件快传工具的卡片
        {
          title: "局域网文件快传 (F2FF)",
          description: "基于WebRTC的局域网文件互传工具，并支持通过Cloudflare R2进行文件中转。",
          to: "https://f2ff.netlify.app/", // 使用完整的外部链接
          // https://26f5849c.file-transfer-3fc.pages.dev/
          // https://file.24992345.xyz/ 
          icon: ShareAltOutlined,
        },
      ],
    };
  },
};
</script>

<style scoped>
.home-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

.header {
  text-align: center;
  margin-bottom: 48px;
}

.subtitle {
  font-size: 16px;
  color: #888;
  max-width: 600px;
  margin: 12px auto 0;
}

/* 响应式调整列数 */
.ant-row {
  justify-content: center;
}
</style>
