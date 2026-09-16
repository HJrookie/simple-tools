<template>
  <div class="matting-container">
    <!-- 顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <a-button type="default" @click="$router.push('/')" class="back-btn">
          <template #icon><ArrowLeftOutlined /></template>
          返回工具集
        </a-button>
        <div class="title-group">
          <h1 class="page-title">
            <span class="icon-badge">✂️</span> 纯本地 AI 智能一键抠图 / 背景消除
          </h1>
          <p class="page-desc">
            纯浏览器端侧 WebGPU 硬件加速推理，发丝级透明背景生成，零上传绝对保护隐私安全。
          </p>
        </div>
      </div>
      <div class="header-right">
        <div class="feature-tag hardware-tag" :title="`底层硬件加速模式: ${hardwareAcceleration}`">
          <ThunderboltOutlined style="color: #faad14" /> {{ hardwareAcceleration }}
        </div>
        <div
          class="feature-tag"
          @click="showModelManager = true"
          style="cursor: pointer"
          title="点击管理本地离线模型"
        >
          <CloudServerOutlined :style="{ color: isAnyModelCached ? '#52c41a' : '#1890ff' }" />
          {{ isAnyModelCached ? "AI 抠图模型已离线就绪" : "模型离线存储" }}
        </div>
      </div>
    </div>

    <!-- 主操作卡片 -->
    <a-card class="main-card" :bordered="false">
      <!-- 1. 上传空状态 -->
      <div v-if="!currentImage" class="upload-section" @paste="handlePaste" tabindex="0">
        <a-upload-dragger
          name="file"
          :multiple="false"
          :showUploadList="false"
          :before-upload="handleUpload"
          accept="image/*"
          class="main-uploader"
        >
          <div class="upload-inner">
            <div class="upload-icon-wrapper">
              <ScissorOutlined class="upload-icon" />
            </div>
            <h3 class="upload-title">点击或将需要消除背景的图片拖拽至此处</h3>
            <p class="upload-hint">
              支持人像发丝、毛绒宠物、电商商品、动漫立绘等，100% 纯本地计算
            </p>
            <div class="paste-tip">
              支持直接按 <span class="kbd">Ctrl</span> + <span class="kbd">V</span> 或 <span class="kbd">⌘</span> + <span class="kbd">V</span> 粘贴截屏
            </div>
          </div>
        </a-upload-dragger>

        <!-- 体验样张 -->
        <div class="sample-section">
          <span class="sample-label">💡 没有准备图片？试试内置高频测试样张：</span>
          <div class="sample-cards">
            <div
              v-for="(sample, idx) in sampleImages"
              :key="idx"
              class="sample-card"
              @click="loadSample(sample)"
            >
              <img :src="sample.url" class="sample-thumb" alt="sample" />
              <span class="sample-name">{{ sample.title }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 已载入图片操作台 -->
      <div v-else class="matting-workspace">
        <!-- 左侧参数调节面板 -->
        <div class="settings-panel">
          <div class="panel-header">
            <span class="panel-title">⚙️ 抠图与背景设置</span>
            <a-button type="link" size="small" danger @click="resetImage">更换图片</a-button>
          </div>

          <!-- 原图信息徽章 -->
          <div class="file-info-badge">
            <span class="f-name" :title="sourceInfo.name">{{ sourceInfo.name }}</span>
            <span class="f-meta">{{ sourceInfo.width }}×{{ sourceInfo.height }} px · {{ formatSize(sourceInfo.size) }}</span>
          </div>

          <!-- 算法引擎选择 -->
          <div class="config-group">
            <div class="group-title">
              <span>抠图算法引擎：</span>
              <a-tooltip title="MODNet 极小仅 6.6MB 秒级出图；RMBG-1.4 约 44MB 体积较大，首次使用请耐心等待流式下载，持久化后即可离线秒开；魔棒模式 0MB 免下载 1ms 瞬间去白底">
                <QuestionCircleOutlined class="tip-icon" />
              </a-tooltip>
            </div>
            <div class="engine-cards">
              <div
                class="engine-card"
                :class="{ active: options.mode === 'modnet' }"
                @click="switchEngine('modnet')"
              >
                <div class="engine-card-header">
                  <ThunderboltOutlined class="e-icon text-orange" />
                  <span class="e-name">MODNet 发丝人像 (推荐)</span>
                  <a-tag color="success" class="mini-tag">6.6MB</a-tag>
                </div>
                <p class="e-desc">针对人像自拍、发丝边缘极限优化，毫秒级推理</p>
              </div>

              <div
                class="engine-card"
                :class="{ active: options.mode === 'rmbg' }"
                @click="switchEngine('rmbg')"
              >
                <div class="engine-card-header">
                  <ExperimentOutlined class="e-icon text-blue" />
                  <span class="e-name">BRIA RMBG-1.4 (SOTA 通用)</span>
                  <a-tag color="warning" class="mini-tag">约 44MB 大模型</a-tag>
                </div>
                <p class="e-desc">1024 超清解析，复杂电商商品、毛绒宠物绝佳分割 (首次需下载 44MB)</p>
              </div>

              <div
                class="engine-card"
                :class="{ active: options.mode === 'chroma' }"
                @click="switchEngine('chroma')"
              >
                <div class="engine-card-header">
                  <HighlightOutlined class="e-icon text-purple" />
                  <span class="e-name">纯色/白底/绿幕魔棒</span>
                  <a-tag color="purple" class="mini-tag">0MB 秒出</a-tag>
                </div>
                <p class="e-desc">连通域洪泛纯算法，1ms 瞬间去白底，免下载模型</p>
              </div>
            </div>
          </div>

          <!-- 背景替换面板 -->
          <div class="config-group">
            <div class="group-title">
              <span>背景替换模式：</span>
            </div>
            <a-radio-group v-model:value="bgConfig.type" button-style="solid" class="full-width-radio" @change="recompose">
              <a-radio-button value="transparent">🏁 透明底 (PNG)</a-radio-button>
              <a-radio-button value="solid">🎨 经典纯色</a-radio-button>
              <a-radio-button value="gradient">🌈 时尚渐变</a-radio-button>
              <a-radio-button value="blur">📷 景深虚化</a-radio-button>
            </a-radio-group>

            <!-- 纯色快捷选色板 (证件照经典红蓝白底) -->
            <div v-if="bgConfig.type === 'solid'" class="sub-palette">
              <span class="sub-label">快捷预设：</span>
              <div class="color-chips">
                <div
                  v-for="c in solidPresets"
                  :key="c.value"
                  class="color-chip"
                  :class="{ active: bgConfig.color === c.value }"
                  :style="{ backgroundColor: c.value }"
                  :title="c.label"
                  @click="setSolidColor(c.value)"
                >
                  <CheckOutlined v-if="bgConfig.color === c.value" class="chip-check" />
                </div>
                <!-- 自定义色选择器 -->
                <input
                  type="color"
                  v-model="bgConfig.color"
                  class="custom-color-input"
                  title="自定义取色"
                  @input="recompose"
                />
              </div>
            </div>

            <!-- 渐变预设 -->
            <div v-if="bgConfig.type === 'gradient'" class="sub-palette">
              <span class="sub-label">渐变风格：</span>
              <div class="gradient-chips">
                <div
                  v-for="(g, idx) in gradientPresets"
                  :key="idx"
                  class="gradient-chip"
                  :class="{ active: selectedGradientIdx === idx }"
                  :style="{ background: `linear-gradient(${g.angle}deg, ${g.stops.join(', ')})` }"
                  :title="g.name"
                  @click="setGradient(idx)"
                >
                  <CheckOutlined v-if="selectedGradientIdx === idx" class="chip-check" />
                </div>
              </div>
            </div>

            <!-- 景深虚化滑块 -->
            <div v-if="bgConfig.type === 'blur'" class="sub-palette blur-palette">
              <div class="slider-row">
                <span class="sub-label">虚化强度：</span>
                <span class="val-pill">{{ bgConfig.blur }}px</span>
              </div>
              <a-slider v-model:value="bgConfig.blur" :min="4" :max="40" :step="2" @change="recompose" />
            </div>
          </div>

          <!-- 边缘细节精修折叠面板 -->
          <div class="config-group">
            <div class="group-title" @click="showEdgeTuning = !showEdgeTuning" style="cursor: pointer">
              <span>🛠️ 边缘与色溢微调：</span>
              <span class="toggle-text">{{ showEdgeTuning ? "收起 ▲" : "展开高级调节 ▼" }}</span>
            </div>

            <div v-if="showEdgeTuning" class="edge-tuning-box">
              <div class="slider-row">
                <span class="param-name">边缘收缩 (消除白边溢色)：</span>
                <span class="val-pill">{{ options.edgeShift }} px</span>
              </div>
              <a-slider
                v-model:value="options.edgeShift"
                :min="-4"
                :max="3"
                :step="0.5"
                :marks="{ '-4': '-4px', '-1': '-1px(推荐)', '0': '0', '3': '+3px' }"
              />

              <div class="slider-row" style="margin-top: 14px">
                <span class="param-name">边缘抗锯齿羽化：</span>
                <span class="val-pill">{{ options.feather }} px</span>
              </div>
              <a-slider v-model:value="options.feather" :min="0" :max="6" :step="0.5" />

              <div class="slider-row" style="margin-top: 14px">
                <span class="param-name">抠图灵敏度阈值：</span>
                <span class="val-pill">{{ Math.round(options.threshold * 100) }}%</span>
              </div>
              <a-slider v-model:value="options.threshold" :min="0.1" :max="0.9" :step="0.05" />
            </div>
          </div>

          <!-- 执行按钮区 -->
          <div class="action-btn-group">
            <a-button
              v-if="!isProcessing"
              type="primary"
              size="large"
              block
              class="glow-primary-btn"
              @click="startMatting"
            >
              <template #icon><ScissorOutlined /></template>
              {{ hasResult ? "重新应用抠图" : "⚡ 立即一键消除背景" }}
            </a-button>

            <a-button
              v-else
              type="primary"
              danger
              size="large"
              block
              @click="handleCancel"
            >
              <template #icon><CloseCircleOutlined /></template>
              终止计算任务
            </a-button>

            <!-- 进度显示条 -->
            <div v-if="isProcessing" class="progress-box">
              <a-progress :percent="progressPercent" status="active" :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }" />
              <div class="progress-text">{{ progressText }}</div>
            </div>
          </div>
        </div>

        <!-- 右侧交互画布与对比视口 -->
        <div class="viewport-panel">
          <!-- 顶部视图切换控制 -->
          <div class="viewport-toolbar">
            <div class="view-modes">
              <a-radio-group v-model:value="viewMode" size="small" button-style="solid">
                <a-radio-button value="split">
                  <SplitCellsOutlined /> 卷帘对比
                </a-radio-button>
                <a-radio-button value="result">
                  <EyeOutlined /> 抠图效果
                </a-radio-button>
                <a-radio-button value="mask">
                  <FileImageOutlined /> 黑白蒙版 (Alpha)
                </a-radio-button>
              </a-radio-group>
            </div>

            <div class="toolbar-stats" v-if="durationMs > 0">
              <span class="duration-badge">
                <CheckCircleFilled style="color: #52c41a" /> 耗时: {{ durationMs }}ms · 纯本地硬件加速
              </span>
            </div>
          </div>

          <!-- 核心画布展示区 -->
          <div class="canvas-viewport" ref="viewportEl" @mousemove="handleSplitMouseMove" @touchmove="handleSplitTouchMove">
            <!-- 卷帘对比视图 -->
            <div v-if="viewMode === 'split'" class="split-wrapper">
              <!-- 底层：合成/透明抠图图层 -->
              <div class="split-layer result-layer" :class="{ 'checker-bg': bgConfig.type === 'transparent' }">
                <canvas ref="resultCanvasEl" class="preview-canvas"></canvas>
              </div>

              <!-- 顶层：原始图像 (根据滑动条裁切) -->
              <div
                class="split-layer original-layer"
                :style="{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }"
              >
                <canvas ref="origCanvasEl" class="preview-canvas"></canvas>
              </div>

              <!-- 卷帘分割中线 -->
              <div
                class="split-divider"
                :style="{ left: `${splitPos}%` }"
                @mousedown="startDragging"
                @touchstart="startDragging"
              >
                <div class="divider-handle">
                  <span class="handle-arrow">◀</span>
                  <span class="handle-arrow">▶</span>
                </div>
              </div>

              <!-- 标签指示 -->
              <span class="layer-pill pill-left" :style="{ opacity: splitPos > 15 ? 1 : 0 }">原图</span>
              <span class="layer-pill pill-right" :style="{ opacity: splitPos < 85 ? 1 : 0 }">
                {{ bgConfig.type === 'transparent' ? '透明抠图' : '换底效果' }}
              </span>
            </div>

            <!-- 纯抠图结果视图 -->
            <div v-else-if="viewMode === 'result'" class="single-wrapper" :class="{ 'checker-bg': bgConfig.type === 'transparent' }">
              <canvas ref="standaloneCanvasEl" class="preview-canvas"></canvas>
            </div>

            <!-- 纯黑白蒙版视图 (适合查看发丝精细度) -->
            <div v-else-if="viewMode === 'mask'" class="single-wrapper mask-wrapper">
              <canvas ref="maskCanvasEl" class="preview-canvas"></canvas>
            </div>
          </div>

          <!-- 底部工具流水线联动与导出操作栏 -->
          <div class="result-footer-bar" v-if="hasResult">
            <div class="footer-left">
              <span class="chain-title">🚀 快捷流水线联动：</span>
              <a-button size="middle" class="chain-btn" @click="sendToIco">
                <template #icon><FileImageOutlined /></template>
                发送到 Favicon / ICO 生成器
              </a-button>
              <a-button size="middle" class="chain-btn" @click="sendToUpscaler">
                <template #icon><ZoomInOutlined /></template>
                发送到 AI 无损放大
              </a-button>
              <a-button size="middle" class="chain-btn" @click="sendToCompress">
                <template #icon><CompressOutlined /></template>
                发送到图片压缩
              </a-button>
            </div>

            <div class="footer-right">
              <a-button size="large" class="copy-btn" @click="handleCopyClipboard">
                <template #icon><CopyOutlined /></template>
                复制透明图像
              </a-button>
              <a-button type="primary" size="large" class="download-btn" @click="handleDownload">
                <template #icon><DownloadOutlined /></template>
                下载高清结果 ({{ bgConfig.type === 'transparent' ? 'PNG' : 'JPG' }})
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 离线模型管理弹窗 -->
    <a-modal
      v-model:open="showModelManager"
      title="💾 端侧 AI 抠图模型存储管理 (OPFS / IndexedDB)"
      :footer="null"
      width="640px"
    >
      <div class="model-manager-content">
        <a-alert
          message="纯浏览器离线执行"
          description="模型首次使用时下载并持久保存在浏览器源私有文件系统 (OPFS) 中，无任何服务端流量，下一次开启即刻秒开。"
          type="info"
          show-icon
          style="margin-bottom: 16px"
        />

        <div class="model-list">
          <div
            v-for="model in availableModels"
            :key="model.id"
            class="model-item-card"
          >
            <div class="model-item-header">
              <div class="m-title-row">
                <span class="m-name">{{ model.name }}</span>
                <a-tag :color="cachedModelsMap[model.id] ? 'success' : 'default'">
                  {{ cachedModelsMap[model.id] ? "已在本地就绪" : "未缓存" }}
                </a-tag>
              </div>
              <span class="m-meta">{{ model.architecture }} · {{ model.sizeStr }}</span>
            </div>
            <p class="m-desc">{{ model.desc }}</p>
            <div class="model-item-footer">
              <a-button
                v-if="!cachedModelsMap[model.id]"
                type="primary"
                size="small"
                :loading="preloadingModelId === model.id"
                @click="preloadModel(model.id)"
              >
                立即预载至本地
              </a-button>
              <a-button
                v-else
                danger
                size="small"
                @click="clearModelCache(model.id)"
              >
                清理本地缓存
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import { message } from "ant-design-vue";
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  ScissorOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
  HighlightOutlined,
  CloseCircleOutlined,
  SplitCellsOutlined,
  EyeOutlined,
  FileImageOutlined,
  CheckCircleFilled,
  CopyOutlined,
  DownloadOutlined,
  ZoomInOutlined,
  CompressOutlined,
  CheckOutlined,
} from "@ant-design/icons-vue";

import {
  removeBackground,
  abortMattingTask,
  MATTING_MODELS,
  hasModelCached,
  removeCachedModel,
  compositeBackground,
  copyCanvasToClipboard,
  imageDataToCanvas,
} from "../../utils/matting/index.js";
import { downloadAndCacheModel } from "../../utils/matting/modelStorage.js";
import { detectBestExecutionProvider } from "../../utils/matting/mattingEngine.js";

export default {
  name: "BackgroundRemoval",
  components: {
    ArrowLeftOutlined,
    ThunderboltOutlined,
    CloudServerOutlined,
    ScissorOutlined,
    QuestionCircleOutlined,
    ExperimentOutlined,
    HighlightOutlined,
    CloseCircleOutlined,
    SplitCellsOutlined,
    EyeOutlined,
    FileImageOutlined,
    CheckCircleFilled,
    CopyOutlined,
    DownloadOutlined,
    ZoomInOutlined,
    CompressOutlined,
    CheckOutlined,
  },
  data() {
    return {
      currentImage: null,
      sourceInfo: {
        name: "",
        width: 0,
        height: 0,
        size: 0,
      },
      rawSourceImageData: null, // 原图 ImageData
      rawMattedImageData: null, // 抠出的透明前景 ImageData

      // 算法配置
      options: {
        mode: "modnet", // 'modnet' | 'rmbg' | 'chroma'
        edgeShift: -1.0, // 边缘收缩消除色溢
        feather: 1.0, // 羽化过渡
        threshold: 0.5, // 截断灵敏度
      },
      showEdgeTuning: false,

      // 背景替换配置
      bgConfig: {
        type: "transparent", // 'transparent' | 'solid' | 'gradient' | 'blur'
        color: "#438EDB", // 证件照蓝底
        gradient: null,
        blur: 16,
      },
      solidPresets: [
        { label: "经典证件蓝", value: "#438EDB" },
        { label: "庄重红底", value: "#C00000" },
        { label: "纯洁白底", value: "#FFFFFF" },
        { label: "高级商务黑", value: "#1A1A1A" },
        { label: "优雅灰", value: "#F0F2F5" },
        { label: "马卡龙粉", value: "#FFB6C1" },
        { label: "薄荷绿", value: "#00E676" },
      ],
      selectedGradientIdx: 0,
      gradientPresets: [
        { name: "极光紫罗兰", angle: 135, stops: ["#667eea", "#764ba2"] },
        { name: "暖阳晨曦", angle: 135, stops: ["#ff9a9e", "#fecfef"] },
        { name: "赛博霓虹", angle: 135, stops: ["#00c6ff", "#0072ff"] },
        { name: "落日余晖", angle: 135, stops: ["#f857a6", "#ff5858"] },
      ],

      // 视图控制
      viewMode: "split", // 'split' | 'result' | 'mask'
      splitPos: 50,
      isDraggingSplit: false,

      // 执行状态
      isProcessing: false,
      progressPercent: 0,
      progressText: "",
      durationMs: 0,
      hasResult: false,

      // 硬件加速探测
      hardwareAcceleration: "探测中...",
      showModelManager: false,
      cachedModelsMap: {},
      preloadingModelId: null,

      // 预设体验样张
      sampleImages: [
        {
          title: "人像发丝精细测试",
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23e0e7ff'/><circle cx='128' cy='100' r='50' fill='%23fcd34d'/><path d='M78 220 C78 160 178 160 178 220 Z' fill='%233b82f6'/><circle cx='110' cy='95' r='6' fill='%231f2937'/><circle cx='146' cy='95' r='6' fill='%231f2937'/><path d='M118 120 Q128 132 138 120' stroke='%23ef4444' stroke-width='4' fill='none'/><path d='M70 90 Q80 40 128 40 Q176 40 186 90 Q170 60 128 60 Q86 60 70 90' fill='%23451a03'/></svg>",
          name: "sample-portrait.png",
        },
        {
          title: "绿幕摄影头像",
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%2300ff00'/><circle cx='128' cy='110' r='55' fill='%23fed7aa'/><path d='M68 230 C68 170 188 170 188 230 Z' fill='%236366f1'/><circle cx='110' cy='105' r='6' fill='%23111'/><circle cx='146' cy='105' r='6' fill='%23111'/><path d='M120 130 Q128 140 136 130' stroke='%23f43f5e' stroke-width='4' fill='none'/></svg>",
          name: "sample-greenscreen.png",
        },
        {
          title: "电商潮流球鞋",
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'><rect width='256' height='256' fill='%23f1f5f9'/><path d='M40 160 Q80 120 140 130 Q180 110 210 130 L220 170 L40 170 Z' fill='%23ef4444'/><rect x='30' y='170' width='196' height='20' rx='10' fill='%23ffffff' stroke='%23cbd5e1' stroke-width='3'/><path d='M110 135 L140 160' stroke='%23ffffff' stroke-width='6'/></svg>",
          name: "sample-sneaker.png",
        },
      ],
    };
  },
  computed: {
    availableModels() {
      return Object.values(MATTING_MODELS);
    },
    isAnyModelCached() {
      return Object.values(this.cachedModelsMap).some(Boolean);
    },
  },
  watch: {
    viewMode() {
      this.$nextTick(() => {
        this.renderOriginalCanvas();
        this.recompose();
        this.renderMaskCanvas();
      });
    },
  },
  async mounted() {
    window.addEventListener("paste", this.handlePaste);
    window.addEventListener("mouseup", this.stopDragging);
    window.addEventListener("touchend", this.stopDragging);

    // 探测硬件加速
    const ep = await detectBestExecutionProvider();
    this.hardwareAcceleration = ep === "webgpu" ? "WebGPU 显卡加速" : "WebAssembly SIMD";

    // 检查模型缓存
    await this.checkAllModelsCached();

    // 检查是否有跨工具流水线传递过来的图片
    const sharedImg = sessionStorage.getItem("shared_image_data");
    if (sharedImg) {
      sessionStorage.removeItem("shared_image_data");
      this.loadImageFromDataUrl(sharedImg, "shared_input.png");
    }
  },
  beforeUnmount() {
    window.removeEventListener("paste", this.handlePaste);
    window.removeEventListener("mouseup", this.stopDragging);
    window.removeEventListener("touchend", this.stopDragging);
    abortMattingTask();
  },
  methods: {
    formatSize(bytes) {
      if (!bytes) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
    },

    async checkAllModelsCached() {
      const map = {};
      for (const m of this.availableModels) {
        map[m.id] = await hasModelCached(m.id);
      }
      this.cachedModelsMap = map;
    },

    switchEngine(mode) {
      this.options.mode = mode;
      if (this.currentImage && this.hasResult) {
        this.startMatting();
      }
    },

    setSolidColor(color) {
      this.bgConfig.color = color;
      this.recompose();
    },

    setGradient(idx) {
      this.selectedGradientIdx = idx;
      this.bgConfig.gradient = this.gradientPresets[idx];
      this.recompose();
    },

    handleUpload(file) {
      if (!file.type.startsWith("image/")) {
        message.error("请上传有效的图片文件");
        return false;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.loadImageFromDataUrl(e.target.result, file.name, file.size);
      };
      reader.readAsDataURL(file);
      return false;
    },

    handlePaste(e) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            this.handleUpload(file);
            message.success("已成功从剪贴板载入图片");
            break;
          }
        }
      }
    },

    loadSample(sample) {
      this.loadImageFromDataUrl(sample.url, sample.name, 1024 * 150);
    },

    loadImageFromDataUrl(dataUrl, name = "image.png", size = 0) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.currentImage = img;
        this.sourceInfo = {
          name,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          size: size || Math.round(dataUrl.length * 0.75),
        };

        // 提取原图 ImageData
        const canvas = document.createElement("canvas");
        canvas.width = this.sourceInfo.width;
        canvas.height = this.sourceInfo.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        this.rawSourceImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        this.rawMattedImageData = null;
        this.hasResult = false;
        this.durationMs = 0;

        // 绘制原图到底图画布
        this.$nextTick(() => {
          this.renderOriginalCanvas();
          // 自动启动抠图
          this.startMatting();
        });
      };
      img.src = dataUrl;
    },

    resetImage() {
      abortMattingTask();
      this.currentImage = null;
      this.rawSourceImageData = null;
      this.rawMattedImageData = null;
      this.hasResult = false;
      this.isProcessing = false;
    },

    renderOriginalCanvas() {
      if (!this.rawSourceImageData) return;
      const c = this.$refs.origCanvasEl;
      if (c) {
        c.width = this.sourceInfo.width;
        c.height = this.sourceInfo.height;
        const ctx = c.getContext("2d");
        ctx.putImageData(this.rawSourceImageData, 0, 0);
      }
    },

    async startMatting() {
      if (!this.rawSourceImageData || this.isProcessing) return;

      this.isProcessing = true;
      this.progressPercent = 10;
      this.progressText = "准备执行端侧抠图...";

      try {
        const modelId =
          this.options.mode === "rmbg" ? "rmbg-1.4" : "modnet-web";

        const { resultImageData, durationMs } = await removeBackground(
          this.rawSourceImageData,
          {
            mode: this.options.mode,
            modelId,
            edgeShift: this.options.edgeShift,
            feather: this.options.feather,
            threshold: this.options.threshold,
          },
          (pct, txt) => {
            this.progressPercent = pct;
            this.progressText = txt;
          }
        );

        this.rawMattedImageData = resultImageData;
        this.durationMs = durationMs;
        this.hasResult = true;
        this.progressPercent = 100;
        this.progressText = "处理完成！";

        // 更新离线缓存状态
        this.checkAllModelsCached();

        // 重新渲染合成画布
        this.$nextTick(() => {
          this.recompose();
          this.renderMaskCanvas();
        });
      } catch (err) {
        if (err.name === "AbortError") {
          message.info("已取消抠图任务");
        } else {
          console.error("抠图异常:", err);
          message.error("抠图执行异常: " + (err.message || "请稍后重试"));
        }
      } finally {
        this.isProcessing = false;
      }
    },

    handleCancel() {
      abortMattingTask();
      this.isProcessing = false;
      this.progressText = "已中断";
    },

    recompose() {
      if (!this.rawMattedImageData) return;

      const compCanvas = compositeBackground(
        this.rawMattedImageData,
        this.bgConfig,
        this.rawSourceImageData
      );

      // 渲染到 split 视图底图
      const splitResCanvas = this.$refs.resultCanvasEl;
      if (splitResCanvas) {
        splitResCanvas.width = compCanvas.width;
        splitResCanvas.height = compCanvas.height;
        const ctx = splitResCanvas.getContext("2d");
        ctx.drawImage(compCanvas, 0, 0);
      }

      // 渲染到独立视图
      const standCanvas = this.$refs.standaloneCanvasEl;
      if (standCanvas) {
        standCanvas.width = compCanvas.width;
        standCanvas.height = compCanvas.height;
        const ctx = standCanvas.getContext("2d");
        ctx.drawImage(compCanvas, 0, 0);
      }
    },

    renderMaskCanvas() {
      if (!this.rawMattedImageData || !this.$refs.maskCanvasEl) return;
      const maskCanvas = this.$refs.maskCanvasEl;
      const w = this.rawMattedImageData.width;
      const h = this.rawMattedImageData.height;
      maskCanvas.width = w;
      maskCanvas.height = h;

      const ctx = maskCanvas.getContext("2d");
      const maskImgData = new ImageData(w, h);
      const src = this.rawMattedImageData.data;
      const dst = maskImgData.data;

      for (let i = 0; i < w * h; i++) {
        const a = src[i * 4 + 3];
        dst[i * 4] = a;
        dst[i * 4 + 1] = a;
        dst[i * 4 + 2] = a;
        dst[i * 4 + 3] = 255;
      }

      ctx.putImageData(maskImgData, 0, 0);
    },

    // 卷帘拖拽交互
    startDragging(e) {
      this.isDraggingSplit = true;
      e.preventDefault();
    },
    stopDragging() {
      this.isDraggingSplit = false;
    },
    handleSplitMouseMove(e) {
      if (!this.isDraggingSplit || !this.$refs.viewportEl) return;
      const rect = this.$refs.viewportEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      this.splitPos = Math.max(2, Math.min(98, (x / rect.width) * 100));
    },
    handleSplitTouchMove(e) {
      if (!this.isDraggingSplit || !this.$refs.viewportEl || !e.touches[0]) return;
      const rect = this.$refs.viewportEl.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      this.splitPos = Math.max(2, Math.min(98, (x / rect.width) * 100));
    },

    // 导出与操作
    getCurrentOutputCanvas() {
      if (!this.rawMattedImageData) return null;
      return compositeBackground(
        this.rawMattedImageData,
        this.bgConfig,
        this.rawSourceImageData
      );
    },

    async handleCopyClipboard() {
      if (!this.rawMattedImageData) return;
      // 复制时无论当前背景如何，复制最纯粹的高清透明 PNG
      const transCanvas = imageDataToCanvas(this.rawMattedImageData);
      try {
        await copyCanvasToClipboard(transCanvas);
        message.success("✨ 透明 PNG 已成功复制到剪贴板！可直接粘贴至 PPT / PS / 聊天软件");
      } catch (err) {
        message.warning("复制到剪贴板失败: " + err.message);
      }
    },

    handleDownload() {
      const canvas = this.getCurrentOutputCanvas();
      if (!canvas) return;

      const isPng = this.bgConfig.type === "transparent";
      const mime = isPng ? "image/png" : "image/jpeg";
      const ext = isPng ? "png" : "jpg";

      const link = document.createElement("a");
      const baseName = this.sourceInfo.name.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_cutout.${ext}`;
      link.href = canvas.toDataURL(mime, 0.95);
      link.click();
      message.success("已成功开始下载高清图像");
    },

    // 流水线联动
    sendToIco() {
      if (!this.rawMattedImageData) return;
      // 传递透明 PNG
      const transCanvas = imageDataToCanvas(this.rawMattedImageData);
      const dataUrl = transCanvas.toDataURL("image/png");
      sessionStorage.setItem("shared_image_data", dataUrl);
      message.loading("正在前往 Favicon / ICO 生成器...", 0.5);
      setTimeout(() => {
        this.$router.push("/tools/ico-converter");
      }, 300);
    },

    sendToUpscaler() {
      if (!this.rawMattedImageData) return;
      const transCanvas = imageDataToCanvas(this.rawMattedImageData);
      const dataUrl = transCanvas.toDataURL("image/png");
      sessionStorage.setItem("shared_image_data", dataUrl);
      message.loading("正在前往 AI 图片无损放大...", 0.5);
      setTimeout(() => {
        this.$router.push("/tools/image-upscaler");
      }, 300);
    },

    sendToCompress() {
      const canvas = this.getCurrentOutputCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      sessionStorage.setItem("shared_image_data", dataUrl);
      message.loading("正在前往图片压缩工具...", 0.5);
      setTimeout(() => {
        this.$router.push("/tools/image-compress");
      }, 300);
    },

    // 模型管理
    async preloadModel(modelId) {
      this.preloadingModelId = modelId;
      try {
        message.loading("正在从全球高速源预载模型到本地私有文件系统...", 0);
        await downloadAndCacheModel(modelId, (pct, txt) => {
          console.log(`Preloading ${modelId}: ${pct}%`);
        });
        message.destroy();
        message.success("模型预载完成，今后离线即可极速运行！");
        await this.checkAllModelsCached();
      } catch (err) {
        message.destroy();
        message.error("预载失败: " + err.message);
      } finally {
        this.preloadingModelId = null;
      }
    },

    async clearModelCache(modelId) {
      await removeCachedModel(modelId);
      message.success("已成功释放本地离线模型存储空间");
      await this.checkAllModelsCached();
    },
  },
};
</script>

<style scoped>
.matting-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 16px 24px;
  min-height: calc(100vh - 64px);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 顶部操作栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  border-radius: 8px;
}

.title-group {
  display: flex;
  flex-direction: column;
}

.page-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-badge {
  font-size: 24px;
}

.page-desc {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #6b7280;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  transition: all 0.2s;
}

.feature-tag:hover {
  background: #e5e7eb;
}

.hardware-tag {
  background: #fffbe6;
  border-color: #ffe58f;
  color: #d48806;
}

/* 主卡片 */
.main-card {
  border-radius: 16px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
  background: #ffffff;
}

/* 上传空状态 */
.upload-section {
  padding: 30px 10px;
  outline: none;
}

.main-uploader :deep(.ant-upload-drag) {
  border: 2px dashed #cbd5e1;
  border-radius: 16px;
  background: #f8fafc;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-uploader :deep(.ant-upload-drag:hover) {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-inner {
  padding: 50px 20px;
}

.upload-icon-wrapper {
  margin-bottom: 16px;
}

.upload-icon {
  font-size: 52px;
  color: #3b82f6;
  filter: drop-shadow(0 4px 6px rgba(59, 130, 246, 0.2));
}

.upload-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

.paste-tip {
  display: inline-block;
  background: #e2e8f0;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #475569;
}

.kbd {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 2px 6px;
  font-weight: 600;
  font-size: 11px;
}

/* 体验样张 */
.sample-section {
  margin-top: 32px;
  text-align: center;
}

.sample-label {
  font-size: 13px;
  color: #64748b;
  display: block;
  margin-bottom: 14px;
}

.sample-cards {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.sample-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.sample-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.sample-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  background: #f1f5f9;
}

.sample-name {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
}

/* 工作台主布局 */
.matting-workspace {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 24px;
  min-height: 600px;
}

@media (max-width: 1024px) {
  .matting-workspace {
    grid-template-columns: 1fr;
  }
}

/* 左侧配置面板 */
.settings-panel {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.file-info-badge {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
}

.f-name {
  font-weight: 600;
  color: #334155;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.f-meta {
  color: #64748b;
}

.config-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.tip-icon {
  color: #94a3b8;
  cursor: help;
}

.toggle-text {
  font-size: 12px;
  color: #2563eb;
  font-weight: 500;
}

/* 引擎卡片 */
.engine-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.engine-card {
  background: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.engine-card:hover {
  border-color: #93c5fd;
}

.engine-card.active {
  border-color: #3b82f6;
  background: #eff6ff;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}

.engine-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.e-icon {
  font-size: 16px;
}

.text-orange {
  color: #f97316;
}
.text-blue {
  color: #2563eb;
}
.text-purple {
  color: #8b5cf6;
}

.e-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
}

.mini-tag {
  margin-left: auto;
  font-size: 11px;
  padding: 0 6px;
  border-radius: 4px;
}

.e-desc {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

/* 背景选色板 */
.full-width-radio {
  display: flex;
  width: 100%;
}

.full-width-radio :deep(.ant-radio-button-wrapper) {
  flex: 1;
  text-align: center;
  padding: 0 4px;
  font-size: 12px;
}

.sub-palette {
  margin-top: 8px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
}

.sub-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 6px;
  display: block;
}

.color-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.color-chip {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.color-chip.active {
  border-color: #2563eb;
  transform: scale(1.1);
}

.chip-check {
  color: #ffffff;
  font-size: 12px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.custom-color-input {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
}

.gradient-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.gradient-chip {
  width: 44px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
}

.gradient-chip.active {
  border-color: #2563eb;
  transform: scale(1.05);
}

.blur-palette {
  display: flex;
  flex-direction: column;
}

/* 边缘细节调节 */
.edge-tuning-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
}

.slider-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.param-name {
  color: #475569;
}

.val-pill {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  color: #2563eb;
  font-size: 11px;
}

/* 操作按钮 */
.action-btn-group {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.glow-primary-btn {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  border: none;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
  transition: all 0.2s;
}

.glow-primary-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
}

.progress-box {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
}

.progress-text {
  font-size: 12px;
  color: #64748b;
  margin-top: 4px;
  text-align: center;
}

/* 右侧视口面板 */
.viewport-panel {
  display: flex;
  flex-direction: column;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  gap: 14px;
}

.viewport-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.duration-badge {
  font-size: 12px;
  color: #15803d;
  font-weight: 500;
  background: #dcfce7;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* 画布视口核心 */
.canvas-viewport {
  position: relative;
  flex: 1;
  min-height: 480px;
  background: #0f172a;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

/* 棋盘格透明背景 */
.checker-bg {
  background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(-45deg, #e2e8f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #e2e8f0 75%),
    linear-gradient(-45deg, transparent 75%, #e2e8f0 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  background-color: #ffffff;
}

.split-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.split-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-canvas {
  max-width: 95%;
  max-height: 95%;
  object-fit: contain;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.split-divider {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #ffffff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: ew-resize;
  z-index: 20;
}

.divider-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 9px;
  color: #1e293b;
  font-weight: 700;
}

.layer-pill {
  position: absolute;
  bottom: 16px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(4px);
  color: #ffffff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  z-index: 10;
  pointer-events: none;
  transition: opacity 0.2s;
}

.pill-left {
  left: 16px;
}
.pill-right {
  right: 16px;
}

.single-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mask-wrapper {
  background: #000000;
}

/* 底部操作流水线 */
.result-footer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  padding: 12px 16px;
  border-radius: 10px;
  flex-wrap: wrap;
  gap: 12px;
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.chain-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.chain-btn {
  border-radius: 6px;
  font-size: 12px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.copy-btn {
  border-radius: 8px;
}

.download-btn {
  border-radius: 8px;
  font-weight: 600;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.download-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

/* 离线模型弹窗 */
.model-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
}

.m-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.m-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.m-meta {
  font-size: 12px;
  color: #64748b;
}

.m-desc {
  margin: 6px 0 10px 0;
  font-size: 12px;
  color: #475569;
}

.model-item-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
