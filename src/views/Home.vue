<!-- src/views/Home.vue -->
<template>
  <div>
    <a-typography-title style="text-align: center">便捷小工具集</a-typography-title>
    <a-row :gutter="[16, 16]">
      <a-col :span="8" v-for="tool in tools" :key="tool.name">
        <ToolCard :title="tool.title" :description="tool.description" :to="tool.to" />
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { Row, Col, TypographyTitle } from "ant-design-vue";
import ToolCard from "../components/ToolCard.vue";

export default {
  name: "Home",
  components: {
    ToolCard,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
  },
  data() {
    return {
      tools: [
        {
          title: "字符串转JSON",
          description: "将 eventId=xxx,prjCod=yyy 格式的字符串转换为JSON对象。",
          to: "/tools/string-to-json",
        },
        {
          title: "Nginx 配置检查 & 格式化",
          description: "在线检查Nginx配置文件的语法并进行美化格式。",
          to: "/tools/nginx-formatter",
        },
        {
          title: "React/Next.js 渲染器",
          description: "粘贴AI生成的React或Next.js组件代码，实时预览渲染效果。",
          to: "/tools/react-renderer",
        },
        {
          title: "JSON 转类型定义",
          description: "将 JSON 数据快速转换为 TypeScript 接口或 JSDoc 类型，提升代码质量。",
          to: "/tools/json-to-type",
        },
        {
          title: "Mock 数据生成器",
          description: "根据一个 JSON 模板，快速生成大量结构相似但内容随机的模拟数据。",
          to: "/tools/mock-data-generator",
        },
        {
          title: "CSS ↔ Tailwind 转换器",
          description: "在标准 CSS/SCSS 写法和 Tailwind 原子类之间进行双向转换。",
          to: "/tools/css-tailwind-converter",
        },
        {
          title: "智能 JSON 修复器",
          description: "自动修复格式错误的 JSON，支持移除注释、末尾逗号，或将其作为 JS 对象解析。",
          to: "/tools/json-fixer",
        },
        {
          title: "交互式 CSS 生成器",
          description: "通过可视化操作面板快速生成精美的阴影、渐变和滤镜效果。",
          to: "/tools/css-generator",
        },
      ],
    };
  },
};
</script>
