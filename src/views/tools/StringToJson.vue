<!-- src/views/tools/StringToJson.vue -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    <a-row :gutter="16" type="flex" justify="center">
      <a-button type="primary" @click="convert" style="margin-bottom: 16px">转换</a-button>
      <a-button @click="copyResult" style="margin-left: 8px">复制结果</a-button>
    </a-row>
    <a-row :gutter="16">
      <a-col :span="12">
        <a-typography-title :level="4">输入内容</a-typography-title>
        <a-textarea class="left-box" v-model:value="inputText" placeholder="请粘贴形如 'key1=value1, key2=value2' 的字符串" :rows="20" />
      </a-col>
      <a-col :span="12">
        <a-typography-title :level="4">转换结果</a-typography-title>

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
      inputText: `eventId=XFT00011, eventRcdInf=9baea44eea5509ae8a100e15d0b3cb7c45f7d311a39a08be19f2c9414ff44ac03e4e43312c2cc131bfe2ec5323e8c750281819363ef15b3d40b1957f01242b1b4c85a2836b6987bad042935eee58addc602044beaf9fa236259ed7c701207c05a24a812dcd2c202e6bf24037dcedd165fb82ceafc25e11a9bb30051a93365702e54cd55cdc24a7241dff749e4c7f6eac0b9494069e349761bf7e4b816d77e2d44b3b8ee4baa76d72067f270d885e21e7e794e6b424920f225324220988793400f75d06ac919587e4a56eafc45b9aab5764c643f52e9326bdcdede56be4200cb41784be857fda46086afbe31665c1b40d2f92ef5fb9077c5f706439bd22700b88526eb64a4e8bfb99e15c5acd225a5b320d17ea49db0be4733211a33cf641c81be943d952056b54a768daafa292e571dc15bce609c6a49a3130cd124d8f5a74dee74c60d755a6e4dddf566a58226b6bd6f39482e66da036977d3389103bea37c1f7ee7844a89e5ec5e7d99bff00b17d48b67d00820401d3905a563ca89cc7fc315991952b61d01f10ef294e1e5700bc823cfe70350435c53ca8c092dba472e8756a4791c2011643ea8b41b1817e6fc91bc6c1118e44ee43412419cf4804dae799ecbe544e99b65abc155c41b327a8a69ffe47e69ac68643b2bc3862519a99c8432a7e85967e57a58d3ed290cea73cc7b7503d3ecc147d6b5420a97a2b6bcc708fda1809c6ffa712a0fcc2b838a66d543f018da43cffdbeb763f350651f63b193cee10b772d4beb8ef37bad491efd5c5af5b75325b30006f78606177e914392e17e6775d745da68a5f336ecba16b2b346c57df0f0c04d852fb67eeef23a66e3c9f04fbc88a958bf22d5c1a422f0170bce5b9afc9f4360da08037618cc3c68b126ef52f8f74219fbfb44af7bcd6683b0f50a9ec61262647d258b3f030472e12635630359767232b9948be84575ff03b47bc6d7c134f86caf0b30f8b3426887e578d1ae19bfc082538f75a82f4c330de150a74c03807f7848c8113f8ff8b9d0277c3682be683e9df0c8807032a0d164c3572a0a7135a076dded989fd0c6555682c289adafd7e525a7a068e019c3b56bf0ee2bd17f457f975ec63d7aacd64888518fc, prjCod=AAA25848, eventTime=2025-12-10T15:29:31, eventCd=165431623, businessKey=XFT00011:AAA25848:04A55DAD800A0005, appId=d6ad73d8-6526-43a3-a904-3f4d7c70de4e, signature=caa297e9559e10bcdb3c12b91891e7304635eaf2392d777387f5d66b33a33b2d9b165487d2ab19559eba340c59dbd08150bf0efdcff9aa417308a347f0f0b0a7`,
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
        const data = this.inputText.split(",").map((v) => {
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

        this.resultText = JSON.stringify(resultObject, null, 2);
        message.success("转换成功！");
      } catch (error) {
        message.error("转换失败，请检查输入格式是否正确！");
        this.resultText = "转换出错：\n" + error.message;
      }
    },
    copyResult() {
      if (!this.resultText) {
        message.warning("没有可复制的结果！");
        return;
      }
      navigator.clipboard
        .writeText(this.resultText)
        .then(() => {
          message.success("结果已成功复制到剪贴板！");
        })
        .catch((err) => {
          message.error("复制失败: ", err);
        });
    },
  },
};
</script>

<style scoped>
.left-box {
  height: 480px;
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
  height: 480px;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
