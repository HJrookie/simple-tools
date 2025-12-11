<!-- src/views/tools/JsonToType.vue -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    <a-row :gutter="16" type="flex" justify="center" align="middle">
      <div>
        <a-input v-model:value="rootInterfaceName" placeholder="例如: User, Product" />
      </div>
      <div class="button-container">
        <a-button type="primary" size="middle" @click="generateTypes">
          <template #icon><CodeOutlined /></template>
          生成类型定义
        </a-button>
      </div>
    </a-row>
    <a-row :gutter="16">
      <!-- 左侧：输入和配置 -->
      <a-col :span="12">
        <a-typography-title :level="5">JSON 输入</a-typography-title>

        <a-textarea v-model:value="jsonInput" placeholder="在此处粘贴 JSON 数据" :rows="23" class="code-input" />
      </a-col>

      <!-- 右侧：输出结果 -->
      <a-col :span="12">
        <div class="output-header">
          <a-typography-title :level="5">生成的类型</a-typography-title>
          <a-button @click="copyResult" :disabled="!typeOutput">
            <template #icon><CopyOutlined /></template>
            复制结果
          </a-button>
        </div>
        <!-- 使用 Prism.js 进行语法高亮 -->
        <pre :class="prismContainerClasses" v-html="highlightedOutput"></pre>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { PageHeader, Row, Col, TypographyTitle, Input, Button, Textarea, Radio, Form, message } from "ant-design-vue";
import { CodeOutlined, CopyOutlined } from "@ant-design/icons-vue";

// 引入 Prism.js 及其相关语言和主题
import Prism from "prismjs";
import "prismjs/components/prism-javascript.js"; // <-- [修正] 新增这一行，作为 JSDoc 的依赖
import "prismjs/components/prism-typescript.js";
// import 'prismjs/components/prism-jsdoc.js'; // 必须在 javascript 之后导入
import "prismjs/themes/prism-okaidia.css";

// 默认的示例 JSON，展示了多种数据类型
const defaultJsonInput = JSON.stringify(
  {
    id: 101,
    name: "王小明",
    email: "xiaoming.w@example.com",
    isActive: true,
    roles: ["admin", "editor"],
    profile: {
      age: 30,
      title: "前端架构师",
      address: null,
    },
    posts: [
      {
        postId: 2001,
        title: "深入理解 Vue 3",
        tags: ["vue", "frontend"],
      },
    ],
  },
  null,
  2
);

export default {
  name: "JsonToType",
  components: {
    "a-page-header": PageHeader,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-input": Input,
    "a-button": Button,
    "a-textarea": Textarea,
    "a-radio-group": Radio.Group,
    "a-radio-button": Radio.Button,
    "a-form": Form,
    "a-form-item": Form.Item,
    CodeOutlined,
    CopyOutlined,
  },
  data() {
    return {
      jsonInput: defaultJsonInput,
      typeOutput: "",
      highlightedOutput: "类型定义将显示在这里...",
      outputFormat: "typescript", // 'typescript' or 'jsdoc'
      rootInterfaceName: "RootObject",
    };
  },
  computed: {
    prismLanguage() {
      return this.outputFormat === "typescript" ? "typescript" : "jsdoc";
    },
    prismContainerClasses() {
      return ["prism-container", `language-${this.prismLanguage}`];
    },
  },
  watch: {
    typeOutput() {
      this.updateHighlighting();
    },
    outputFormat() {
      // 切换格式时，如果已有内容，则重新生成和高亮
      if (this.typeOutput) {
        this.generateTypes();
      }
    },
  },
  methods: {
    // --- 核心转换逻辑 ---
    jsonToTypes(obj, typeName) {
      const tsInterfaces = new Map();
      const jsDocTypeDefs = new Map();

      const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

      const inferType = (value, keyName = "Item") => {
        if (value === null) return "null";
        const type = typeof value;
        if (type === "string") return "string";
        if (type === "number") return "number";
        if (type === "boolean") return "boolean";
        if (Array.isArray(value)) {
          if (value.length === 0) return "unknown[]";
          // 为数组中的对象创建新类型
          if (typeof value[0] === "object" && value[0] !== null) {
            const singularKeyName = keyName.endsWith("s") ? keyName.slice(0, -1) : keyName;
            const arrayItemTypeName = toPascalCase(singularKeyName);
            processObject(value[0], arrayItemTypeName);
            return `${arrayItemTypeName}[]`;
          }
          const unionTypes = [...new Set(value.map((v) => inferType(v)))];
          return `(${unionTypes.join(" | ")})[]`;
        }
        if (type === "object") {
          const nestedTypeName = toPascalCase(keyName);
          processObject(value, nestedTypeName);
          return nestedTypeName;
        }
        return "unknown";
      };

      const processObject = (currentObj, name) => {
        if (tsInterfaces.has(name)) return; // 防止重复处理

        let tsProps = "";
        let jsDocProps = "";
        for (const key in currentObj) {
          const value = currentObj[key];
          const type = inferType(value, key);
          tsProps += `  ${key}: ${type};\n`;
          jsDocProps += ` * @property {${type}} ${key}\n`;
        }
        tsInterfaces.set(name, `interface ${name} {\n${tsProps}}`);
        jsDocTypeDefs.set(name, `/**\n * @typedef {object} ${name}\n${jsDocProps} */`);
      };

      processObject(obj, typeName);

      const tsResult = Array.from(tsInterfaces.values()).join("\n\n");
      const jsDocResult = Array.from(jsDocTypeDefs.values()).join("\n\n");

      return { tsResult, jsDocResult };
    },

    generateTypes() {
      if (!this.jsonInput.trim()) {
        message.warning("请输入 JSON 数据！");
        return;
      }
      try {
        const jsonObj = JSON.parse(this.jsonInput);
        const name = this.rootInterfaceName || "RootObject";
        const { tsResult, jsDocResult } = this.jsonToTypes(jsonObj, name);

        this.typeOutput = this.outputFormat === "typescript" ? tsResult : jsDocResult;
        message.success("类型生成成功！");
      } catch (e) {
        this.typeOutput = "";
        this.highlightedOutput = `<span class="error-text">JSON 解析错误：${e.message}</span>`;
        message.error("无效的 JSON 格式！");
      }
    },

    updateHighlighting() {
      if (!this.typeOutput) {
        this.highlightedOutput = "类型定义将显示在这里...";
        return;
      }
      this.highlightedOutput = Prism.highlight(this.typeOutput, Prism.languages[this.prismLanguage], this.prismLanguage);
    },

    copyResult() {
      if (!this.typeOutput) return;
      navigator.clipboard
        .writeText(this.typeOutput)
        .then(() => {
          message.success("已复制到剪贴板！");
        })
        .catch((err) => {
          message.error("复制失败: ", err);
        });
    },
  },
  mounted() {
    this.generateTypes();
  },
};
</script>

<style scoped>
.code-input {
  font-family: "Courier New", Courier, monospace;
}
.button-container {
  /* display: flex; */
  justify-content: center;
  margin-left: 12px;
  /* margin-top: 16px; */
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* margin-bottom: 16px; */
}
.prism-container {
  height: 520px;
  overflow: auto;
  border-radius: 6px;
  background-color: #272822;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  margin: 0;
  padding: 1em;
  white-space: pre-wrap;
}
.prism-container:deep(.error-text) {
  color: #ff7b72;
}
pre[class*="language-"] {
  margin: 0;
}
</style>
