<!-- src/components/ToolCard.vue -->
<template>
    <a-card hoverable @click="goToTool">
      <a-card-meta :title="title" :description="description"></a-card-meta>
    </a-card>
  </template>
  
  <script>
  import { Card, CardMeta } from 'ant-design-vue';
  
  export default {
    name: 'ToolCard',
    components: {
        'a-card': Card,
        'a-card-meta': CardMeta,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
      to: {
        type: String,
        required: true,
      },
    },
    methods: {
      goToTool() {
        this.$router.push(this.to);
      },
    },
  };
  </script>