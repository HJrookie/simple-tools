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
      ],
    };
  },
};
</script>
