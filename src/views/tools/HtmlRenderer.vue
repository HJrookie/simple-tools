<!-- src/views/tools/HtmlRenderer.vue (Upgraded with CodeMirror) -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    <div class="toolbar">
      <a-space>
        <a-button type="primary" @click="renderPreview">
          <template #icon><PlayCircleOutlined /></template>
          运行
        </a-button>
        <!-- <a-checkbox v-model:checked="autoRun">自动运行</a-checkbox> -->
        <a-button danger @click="clearInput">
          <template #icon><ClearOutlined /></template>
          清空
        </a-button>
      </a-space>
    </div>

    <a-row :gutter="16" class="renderer-main-panel">
      <!-- 左侧：代码输入 (升级为 CodeMirror) -->
      <a-col :span="12">
        <a-typography-title :level="5" class="panel-title">HTML 代码</a-typography-title>
        <div class="code-editor-wrapper">
          <codemirror v-model="htmlCode" placeholder="在此处粘贴你的 HTML 代码..." :style="{ height: '100%' }" :autofocus="true" :indent-with-tab="true" :tab-size="2" :extensions="extensions" />
        </div>
      </a-col>

      <!-- 右侧：渲染结果 -->
      <a-col :span="12">
        <a-typography-title :level="5" class="panel-title">实时预览</a-typography-title>
        <div class="preview-container">
          <iframe :srcdoc="iframeContent" class="preview-iframe"></iframe>
        </div>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { PageHeader, Row, Col, TypographyTitle, Button, Checkbox, Space } from "ant-design-vue";
import { PlayCircleOutlined, ClearOutlined } from "@ant-design/icons-vue";

// --- CodeMirror 集成 ---
import { Codemirror } from "vue-codemirror";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark"; // 引入主题

const defaultHtmlTemplate = `
  <!DOCTYPE html>
  <html lang="zh">
  <head>
      <meta charset="UTF-8">
      <title>预览</title>
      <style>
          body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f0f2f5;
              padding: 20px;
              color: #333;
          }
          .card {
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 20px auto;
              overflow: hidden;
          }
          .card-image {
              width: 100%;
              height: 360px;
              object-fit: cover;
          }
          .card-content {
              padding: 20px;
          }
          h2 {
              margin-top: 0;
              color: #1a202c;
          }
          button {
              background-color: #4299e1;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 5px;
              cursor: pointer;
          }
      </style>
  </head>
  <body>
      <div class="card">
          <img class="card-image" src="https://img1.baidu.com/it/u=4294652046,3858550305&fm=253&fmt=auto&app=120&f=JPEG?w=500&h=667" alt="风景图">
          <div class="card-content">
              <h2>欢迎使用 HTML 渲染器</h2>
              <p>你可以在左侧的编辑器中输入任何 HTML 代码，包括内联的 <code>&lt;style&gt;</code> 和 <code>&lt;script&gt;</code> 标签，右侧将实时为您渲染出结果。</p>
              <button onclick="alert('Hello from the sandbox!')">点击我</button>
          </div>
      </div>
  </body>
  </html>
  `;

export default {
  name: "HtmlRenderer",
  components: {
    "a-page-header": PageHeader,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-button": Button,
    "a-checkbox": Checkbox,
    "a-space": Space,
    PlayCircleOutlined,
    ClearOutlined,
    Codemirror, // 注册 Codemirror 组件
  },
  data() {
    return {
      htmlCode: defaultHtmlTemplate,
      iframeContent: "",
      autoRun: true,
      debounceTimer: null,
      // CodeMirror 配置
      extensions: [html(), oneDark], // 使用 html 语言包和 oneDark 主题
    };
  },
  watch: {
    htmlCode() {
      if (this.autoRun) {
        this.debouncedRender();
      }
    },
  },
  mounted() {
    this.renderPreview();
  },
  methods: {
    renderPreview() {
      this.iframeContent = this.htmlCode;
    },
    debouncedRender() {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.renderPreview();
      }, 400);
    },
    clearInput() {
      this.htmlCode = "";
    },
  },
};
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 24px;
  background-color: #fff;
  border-bottom: 1px solid #f0f0f0;
  /* margin-bottom: 16px; */
}
.renderer-main-panel {
  height: calc(100vh - 200px);
}
.panel-title {
  padding-left: 12px;
  margin-bottom: 8px !important;
  color: #555;
}
.code-editor-wrapper,
.preview-container {
  /* height: 100%; */
  height: 640px;
  width: 100%;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  overflow: auto;
}
.preview-container {
  background-color: white;
}
.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

/* 覆盖 CodeMirror 的一些默认样式，使其更好地融入布局 */
.code-editor-wrapper :deep(.cm-editor) {
  height: 100%;
  font-size: 14px;
}
</style>
