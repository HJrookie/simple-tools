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
        // 在这里可以继续添加更多的小工具
        // {
        //   title: '工具2',
        //   description: '这是工具2的描述。',
        //   to: '/tools/tool-2',
        // },
      ],
    };
  },
};
</script>
