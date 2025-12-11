<!-- src/views/tools/InteractiveCssGenerator.vue -->
<template>
  <div>
    <div>
      <a-button @click="() => this.$router.push('/')" style="margin-left: 8px"> 返回</a-button>
    </div>
    
    <a-row :gutter="24">
      <!-- 左侧：实时预览和控制 -->
      <a-col :span="10">
        <a-typography-title :level="4">实时预览</a-typography-title>
        <div class="preview-container">
          <div class="preview-box" :style="previewStyle">
            <p>Style Me!</p>
          </div>
        </div>
        <a-space direction="vertical" style="width: 100%; margin-top: 24px">
          <a-button type="dashed" block size="large" @click="isShadowModalVisible = true">编辑阴影 (Box Shadow)</a-button>
          <a-button type="dashed" block size="large" @click="isGradientModalVisible = true">编辑渐变 (Gradient)</a-button>
          <a-button type="dashed" block size="large" @click="isFilterModalVisible = true">编辑滤镜 (Filter)</a-button>
        </a-space>
      </a-col>

      <!-- 右侧：代码输出 -->
      <a-col :span="14">
        <div class="output-header">
          <a-typography-title :level="4">生成的 CSS</a-typography-title>
          <a-button @click="copyResult" :disabled="!generatedCss">
            <template #icon><CopyOutlined /></template>
            复制 CSS
          </a-button>
        </div>
        <pre class="language-css prism-container" v-html="highlightedCss"></pre>
      </a-col>
    </a-row>

    <!-- 弹窗定义区域 -->
    <!-- 1. 阴影生成器弹窗 -->
    <a-modal v-model:open="isShadowModalVisible" title="阴影 (Box Shadow) 生成器" width="600px" @ok="handleShadowOk">
      <a-typography-title :level="5">预设 (Presets)</a-typography-title>
      <a-space wrap>
        <a-button v-for="p in shadowPresets" :key="p.name" @click="applyShadowPreset(p.value)">{{ p.name }}</a-button>
      </a-space>
      <a-divider />
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="X 偏移 (offsetX)"><a-slider v-model:value="shadowConfig.offsetX" :min="-50" :max="50" /></a-form-item>
          <a-form-item label="Y 偏移 (offsetY)"><a-slider v-model:value="shadowConfig.offsetY" :min="-50" :max="50" /></a-form-item>
          <a-form-item label="模糊半径 (blur)"><a-slider v-model:value="shadowConfig.blurRadius" :min="0" :max="100" /></a-form-item>
          <a-form-item label="扩展半径 (spread)"><a-slider v-model:value="shadowConfig.spreadRadius" :min="-50" :max="50" /></a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="颜色 (color)">
            <a-input type="color" v-model:value="shadowConfig.color" style="width: 100%" />
          </a-form-item>
          <a-form-item label="不透明度 (opacity)">
            <a-slider v-model:value="shadowConfig.opacity" :min="0" :max="1" :step="0.01" />
          </a-form-item>
          <a-form-item>
            <a-checkbox v-model:checked="shadowConfig.inset">内部阴影 (inset)</a-checkbox>
          </a-form-item>
        </a-col>
      </a-row>
      <div class="modal-preview" :style="{ boxShadow: generatedShadow }"></div>
    </a-modal>

    <!-- 2. 渐变生成器弹窗 -->
    <a-modal v-model:open="isGradientModalVisible" title="渐变 (Gradient) 生成器" width="600px" @ok="handleGradientOk">
      <a-typography-title :level="5">预设 (Presets)</a-typography-title>
      <a-space wrap>
        <div v-for="p in gradientPresets" :key="p.name" :style="{ background: p.value }" class="preset-swatch" @click="applyGradientPreset(p.value)">{{ p.name }}</div>
      </a-space>
      <a-divider />
      <a-form-item label="角度 (Angle)"><a-slider v-model:value="gradientConfig.angle" :min="0" :max="360" /></a-form-item>
      <a-form-item label="起始颜色"><a-input type="color" v-model:value="gradientConfig.startColor" style="width: 100%" /></a-form-item>
      <a-form-item label="结束颜色"><a-input type="color" v-model:value="gradientConfig.endColor" style="width: 100%" /></a-form-item>
      <div class="modal-preview" :style="{ background: generatedGradient }"></div>
    </a-modal>

    <!-- 3. 滤镜生成器弹窗 -->
    <a-modal v-model:open="isFilterModalVisible" title="滤镜 (Filter) 生成器" width="600px" @ok="handleFilterOk">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="模糊 (blur) px"><a-slider v-model:value="filterConfig.blur" :min="0" :max="20" :step="0.1" /></a-form-item>
          <a-form-item label="亮度 (brightness) %"><a-slider v-model:value="filterConfig.brightness" :min="0" :max="200" /></a-form-item>
          <a-form-item label="对比度 (contrast) %"><a-slider v-model:value="filterConfig.contrast" :min="0" :max="200" /></a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="灰度 (grayscale) %"><a-slider v-model:value="filterConfig.grayscale" :min="0" :max="100" /></a-form-item>
          <a-form-item label="饱和度 (saturate) %"><a-slider v-model:value="filterConfig.saturate" :min="0" :max="200" /></a-form-item>
          <a-form-item label="色相旋转 (hue-rotate) deg"><a-slider v-model:value="filterConfig.hueRotate" :min="0" :max="360" /></a-form-item>
        </a-col>
      </a-row>
      <img src="https://i.pravatar.cc/300?img=3" class="modal-preview" :style="{ filter: generatedFilter }" />
    </a-modal>
  </div>
</template>

<script>
import { PageHeader, Row, Col, TypographyTitle, Button, Space, Modal, Slider, Input, Checkbox, Form, Divider, message } from "ant-design-vue";
import { CopyOutlined } from "@ant-design/icons-vue";

import Prism from "prismjs";
import "prismjs/components/prism-css.js";
import "prismjs/themes/prism-okaidia.css";

// 16进制颜色转 RGBA
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default {
  name: "InteractiveCssGenerator",
  components: {
    "a-page-header": PageHeader,
    "a-row": Row,
    "a-col": Col,
    "a-typography-title": TypographyTitle,
    "a-button": Button,
    "a-space": Space,
    "a-modal": Modal,
    "a-slider": Slider,
    "a-input": Input,
    "a-checkbox": Checkbox,
    "a-form": Form,
    "a-form-item": Form.Item,
    "a-divider": Divider,
    CopyOutlined,
  },
  data() {
    return {
      // 最终应用的样式
      finalBoxShadow: "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px",
      finalGradient: "linear-gradient(90deg, #667eea 0%, #764ba2 100%)",
      finalFilter: "none",

      // 弹窗可见性
      isShadowModalVisible: false,
      isGradientModalVisible: false,
      isFilterModalVisible: false,

      // 各个生成器的配置项 (临时状态)
      shadowConfig: { offsetX: 0, offsetY: 10, blurRadius: 15, spreadRadius: -3, color: "#000000", opacity: 0.1, inset: false },
      gradientConfig: { angle: 90, startColor: "#667eea", endColor: "#764ba2" },
      filterConfig: { blur: 0, brightness: 100, contrast: 100, grayscale: 0, saturate: 100, hueRotate: 0 },

      // 预设数据
      shadowPresets: [
        { name: "基础", value: "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.06)" },
        { name: "中等", value: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)" },
        { name: "较大", value: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)" },
        { name: "内阴影", value: "inset 0 2px 4px 0 rgba(0,0,0,0.06)" },
      ],
      gradientPresets: [
        { name: "日落", value: "linear-gradient(to right, #ff7e5f, #feb47b)" },
        { name: "海洋", value: "linear-gradient(to right, #2193b0, #6dd5ed)" },
        { name: "葡萄", value: "linear-gradient(to right, #de6262, #ffb88c)" },
        { name: "星空", value: "linear-gradient(to right, #243949, #517fa4)" },
      ],
    };
  },
  computed: {
    previewStyle() {
      return {
        boxShadow: this.finalBoxShadow,
        backgroundImage: this.finalGradient,
        filter: this.finalFilter,
      };
    },
    // --- 实时生成的CSS字符串 (用于弹窗内预览) ---
    generatedShadow() {
      const color = hexToRgba(this.shadowConfig.color, this.shadowConfig.opacity);
      const inset = this.shadowConfig.inset ? "inset " : "";
      return `${inset}${this.shadowConfig.offsetX}px ${this.shadowConfig.offsetY}px ${this.shadowConfig.blurRadius}px ${this.shadowConfig.spreadRadius}px ${color}`;
    },
    generatedGradient() {
      return `linear-gradient(${this.gradientConfig.angle}deg, ${this.gradientConfig.startColor}, ${this.gradientConfig.endColor})`;
    },
    generatedFilter() {
      // 过滤掉值为默认值的滤镜，使其更简洁
      const filters = [
        this.filterConfig.blur > 0 && `blur(${this.filterConfig.blur}px)`,
        this.filterConfig.brightness !== 100 && `brightness(${this.filterConfig.brightness}%)`,
        this.filterConfig.contrast !== 100 && `contrast(${this.filterConfig.contrast}%)`,
        this.filterConfig.grayscale > 0 && `grayscale(${this.filterConfig.grayscale}%)`,
        this.filterConfig.saturate !== 100 && `saturate(${this.filterConfig.saturate}%)`,
        this.filterConfig.hueRotate > 0 && `hue-rotate(${this.filterConfig.hueRotate}deg)`,
      ].filter(Boolean);
      return filters.length ? filters.join(" ") : "none";
    },
    // --- 最终的CSS代码 (用于右侧展示) ---
    generatedCss() {
      const styles = [
        this.finalBoxShadow !== "none" && `  box-shadow: ${this.finalBoxShadow};`,
        `  background-image: ${this.finalGradient};`,
        this.finalFilter !== "none" && `  filter: ${this.finalFilter};`,
      ].filter(Boolean);
      return `.styled-element {\n${styles.join("\n")}\n}`;
    },
    highlightedCss() {
      return Prism.highlight(this.generatedCss, Prism.languages.css, "css");
    },
  },
  methods: {
    // 弹窗确认按钮事件
    handleShadowOk() {
      this.finalBoxShadow = this.generatedShadow;
      this.isShadowModalVisible = false;
    },
    handleGradientOk() {
      this.finalGradient = this.generatedGradient;
      this.isGradientModalVisible = false;
    },
    handleFilterOk() {
      this.finalFilter = this.generatedFilter;
      this.isFilterModalVisible = false;
    },
    // 预设应用
    applyShadowPreset(value) {
      // 这是一个简化的解析，仅用于演示。生产级应用需要更复杂的解析器。
      message.info("预设已应用，请微调！");
      this.finalBoxShadow = value; // 直接应用到主预览
    },
    applyGradientPreset(value) {
      message.info("预设已应用，请微调！");
      this.finalGradient = value;
    },
    // 复制结果
    copyResult() {
      navigator.clipboard.writeText(this.generatedCss).then(() => {
        message.success("CSS 代码已复制到剪贴板！");
      });
    },
  },
};
</script>

<style scoped>
.preview-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 350px;
  background-color: #f0f2f5;
  border-radius: 8px;
  padding: 24px;
}
.preview-box {
  width: 400px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 12px;
  color: white;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.prism-container {
  height: 480px;
  overflow: auto;
  border-radius: 6px;
  background-color: #272822;
  font-family: "Courier New", Courier, monospace;
  font-size: 14px;
  margin: 0;
  padding: 1em;
  white-space: pre-wrap;
}
.modal-preview {
  height: 120px;
  margin-top: 24px;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
}
.preset-swatch {
  width: 80px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  color: white;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
