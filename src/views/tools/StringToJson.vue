<!-- src/views/tools/StringToJson.vue -->
<template>
  <div class="json-container">
    <a-row :gutter="16" type="flex" justify="center">
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>

      <a-button type="primary" @click="convert" style="margin-left: 8px; margin-bottom: 4px">转换</a-button>
      <a-button @click="copyResult" style="margin-left: 8px">复制结果</a-button>
    </a-row>
    <a-row :gutter="16" style="height: 100%">
      <a-col :span="12">
        <a-typography-title :level="5">输入内容</a-typography-title>
        <a-textarea class="left-box" v-model:value="inputText" placeholder="请粘贴形如 'key1=value1, key2=value2' 的字符串" :rows="20" />
      </a-col>
      <a-col :span="12">
        <a-typography-title :level="5">转换结果</a-typography-title>

        <pre class="result-box">{{ resultText }}</pre>
      </a-col>
    </a-row>
  </div>
</template>

<script>
import { Row, Col, Input, Button, message, TypographyTitle, PageHeader } from "ant-design-vue";

export default {
  name: "StringToJson",
  components: {
    "a-row": Row,
    "a-col": Col,
    "a-textarea": Input.TextArea,
    "a-button": Button,
    "a-typography-title": TypographyTitle,
    "a-page-header": PageHeader,
  },
  data() {
    return {
      inputText: `eventId=100011, eventRcdInf=9baea44eea559ae`,
      resultText: "",
    };
  },
  methods: {
    convert() {
      if (!this.inputText.trim()) {
        message.warning("请输入内容后再转换！");
        return;
      }
      try {
        // 代表直接把所有的日志都粘贴进去
        const keyStr = `params:XFTEventBody(`;
        if (this.inputText.includes(keyStr)) {
          const jsonStr = this.inputText.split(keyStr)?.[1]?.split(")")?.[0];
          const resultObject = this.parseEqualStr(jsonStr);
          this.resultText = JSON.stringify(resultObject, null, 2);
          return;
        } else if (this.inputText.startsWith("eventId=")) {
          const resultObject = this.parseEqualStr(this.inputText);
          this.resultText = JSON.stringify(resultObject, null, 2);
        } else {
        }
        message.success("转换成功！", 0.2);
      } catch (error) {
        message.error("转换失败，请检查输入格式是否正确！", 0.2);
        this.resultText = "转换出错：\n" + error.message;
      }
    },
    parseEqualStr(strInfo) {
      const data = strInfo.split(",").map((v) => {
        const parts = v.split("=");
        // 处理值中可能也包含'='的情况
        const key = parts.shift().trim();
        const value = parts.join("=").trim();
        return [key, value];
      });

      const resultObject = data.reduce((prev, cur) => {
        if (cur[0]) {
          prev[cur[0]] = cur[1];
        }
        return prev;
      }, {});

      return resultObject;
    },
    copyResult() {
      if (!this.resultText) {
        message.warning("没有可复制的结果！", 0.2);
        return;
      }
      navigator.clipboard
        .writeText(this.resultText)
        .then(() => {
          message.success("结果已成功复制到剪贴板！", 0.2);
        })
        .catch((err) => {
          message.error("复制失败: ", err);
        });
    },
  },
};
</script>

<style scoped>
.json-container {
  height: calc(100vh - 60px);
}
.left-box {
  /* height: 480px; */
  height: calc(100% - 40px);
  border: 1px solid #d9d9d9;
  background-color: #f5f5f5;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.result-box {
  background-color: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 10px;
  /* height: 480px; */
  height: calc(100% - 40px);
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
