<template>
  <div class="upscaler-container">
    <!-- 页面顶部操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <a-button type="default" @click="$router.push('/')" class="back-btn">
          <template #icon><ArrowLeftOutlined /></template>
          返回工具集
        </a-button>
        <div class="title-group">
          <h1 class="page-title">
            <span class="icon-badge">✨</span> AI & 高保真图片无损放大
          </h1>
          <p class="page-desc">
            纯前端浏览器本地执行，结合深度学习超分辨率与工业级 Lanczos-3 + CAS 自适应边缘锐化算法，告别模糊马赛克。
          </p>
        </div>
      </div>
      <div class="header-right">
        <div class="feature-tag hardware-tag" :title="`底层硬件加速模式: ${hardwareAcceleration}`">
          <ThunderboltOutlined style="color: #faad14" /> {{ hardwareAcceleration }}
        </div>
        <div class="feature-tag" @click="showModelManager = true" style="cursor: pointer" title="点击管理本地离线模型">
          <CloudServerOutlined :style="{ color: isAnyModelCached ? '#52c41a' : '#1890ff' }" />
          {{ isAnyModelCached ? "AI 神经网络已离线就绪" : "模型存储管理" }}
        </div>
      </div>
    </div>

    <!-- 主卡片 -->
    <a-card class="main-card" :bordered="false">
      <a-tabs v-model:activeKey="activeTab" class="custom-tabs" size="large">
        <!-- 标签 1: 单图深度处理与卷帘对比 -->
        <a-tab-pane key="single" tab="🔍 单图高保真放大与细节对比">
          <!-- 上传空状态 -->
          <div v-if="!currentImage" class="upload-section" @paste="handlePaste" tabindex="0">
            <a-upload-dragger
              name="file"
              :multiple="false"
              :showUploadList="false"
              :before-upload="handleSingleUpload"
              accept="image/*"
              class="main-uploader"
            >
              <div class="upload-inner">
                <div class="upload-icon-wrapper">
                  <ZoomInOutlined class="upload-icon" />
                </div>
                <h3 class="upload-title">点击或将需要放大的图片拖拽至此处</h3>
                <p class="upload-hint">
                  支持 JPG、PNG、WebP、BMP 等常用格式，零上传保证绝对隐私
                </p>
                <div class="paste-tip">
                  支持直接按 <span class="kbd">Ctrl</span> + <span class="kbd">V</span> 或 <span class="kbd">⌘</span> + <span class="kbd">V</span> 粘贴截屏
                </div>
              </div>
            </a-upload-dragger>

            <!-- 示例图片体验区 -->
            <div class="sample-section">
              <span class="sample-label">💡 还没有准备图片？点击试试内置精选测试样张：</span>
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

          <!-- 已载入图片操作台 -->
          <div v-else class="upscale-editor-layout">
            <!-- 左侧参数调节面板 -->
            <div class="settings-panel">
              <div class="panel-header">
                <span class="panel-title">⚙️ 算法与参数配置</span>
                <a-button type="link" size="small" danger @click="resetImage">更换图片</a-button>
              </div>

              <!-- 原图信息 -->
              <div class="file-info-badge">
                <span class="f-name" :title="sourceInfo.name">{{ sourceInfo.name }}</span>
                <span class="f-meta">{{ sourceInfo.width }}×{{ sourceInfo.height }} px · {{ formatSize(sourceInfo.size) }}</span>
              </div>

              <!-- 1. 放大倍数选择 -->
              <div class="config-group">
                <div class="group-title">
                  <span>放大倍数：</span>
                  <span class="target-res-pill">
                    目标: {{ Math.round(sourceInfo.width * options.scale) }}×{{ Math.round(sourceInfo.height * options.scale) }} px
                  </span>
                </div>
                <a-radio-group v-model:value="options.scale" button-style="solid" class="full-width-radio">
                  <a-radio-button :value="2">2x (推荐)</a-radio-button>
                  <a-radio-button :value="3">3x</a-radio-button>
                  <a-radio-button :value="4">4x (超清)</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 2. 算法引擎模式 -->
              <div class="config-group">
                <div class="group-title">
                  <span>算法引擎：</span>
                  <a-tooltip title="高保真模式无需下载任何外部权重文件；AI 模式首次使用会下载轻量超分模型并持久缓存在浏览器本地，支持 WebGPU / Wasm SIMD 硬件加速">
                    <QuestionCircleOutlined class="tip-icon" />
                  </a-tooltip>
                </div>
                <div class="engine-cards">
                  <div
                    class="engine-card"
                    :class="{ active: options.mode === 'lanczos_cas' }"
                    @click="options.mode = 'lanczos_cas'"
                  >
                    <div class="engine-card-header">
                      <ThunderboltOutlined class="e-icon text-orange" />
                      <span class="e-name">自适应高保真 (FSR / CAS)</span>
                      <a-tag color="success" class="mini-tag">0等待</a-tag>
                    </div>
                    <p class="e-desc">Lanczos-3 窗口 Sinc 插值 + AMD 对比度自适应锐化，免下载瞬时放大</p>
                  </div>

                  <div
                    class="engine-card"
                    :class="{ active: options.mode === 'neural_ai' }"
                    @click="options.mode = 'neural_ai'"
                  >
                    <div class="engine-card-header">
                      <ExperimentOutlined class="e-icon text-blue" />
                      <span class="e-name">AI 神经网络超分 (WebAssembly / WebGPU)</span>
                      <a-tag color="blue" class="mini-tag">SISR</a-tag>
                    </div>
                    <p class="e-desc">轻量卷积网络重建纹理，带重叠边界平铺切片防接缝，持久化缓存</p>
                  </div>

                  <div
                    class="engine-card"
                    :class="{ active: options.mode === 'anime_art' }"
                    @click="options.mode = 'anime_art'"
                  >
                    <div class="engine-card-header">
                      <SmileOutlined class="e-icon text-purple" />
                      <span class="e-name">Anime4K 动漫 / 矢量线稿专精</span>
                      <a-tag color="purple" class="mini-tag">毫秒级</a-tag>
                    </div>
                    <p class="e-desc">Sobel 梯度矢量场法向线条收缩 (Line Thinning)，还原锋利极细墨线</p>
                  </div>
                </div>
              </div>

              <!-- 3. 自适应对比度锐化 (CAS) -->
              <div class="config-group">
                <div class="group-title">
                  <span>边缘自适应锐度：</span>
                  <span class="val-pill">{{ Math.round(options.sharpness * 100) }}%</span>
                </div>
                <a-slider
                  v-model:value="options.sharpness"
                  :min="0"
                  :max="1"
                  :step="0.05"
                  :tip-formatter="(val) => `${Math.round(val * 100)}%`"
                />
              </div>

              <!-- 4. 保边去噪 (Denoise) -->
              <div class="config-group">
                <div class="group-title">
                  <span>噪点与压缩伪影抑制：</span>
                </div>
                <a-radio-group v-model:value="options.denoise" button-style="solid" class="full-width-radio" size="small">
                  <a-radio-button value="none">关闭</a-radio-button>
                  <a-radio-button value="light">轻度</a-radio-button>
                  <a-radio-button value="medium">中度</a-radio-button>
                  <a-radio-button value="strong">强力</a-radio-button>
                </a-radio-group>
              </div>

              <!-- 执行与中断按钮 -->
              <div class="action-btn-wrapper">
                <div class="action-btn-row">
                  <a-button
                    type="primary"
                    size="large"
                    class="start-upscale-btn"
                    @click="runUpscale"
                    :loading="isProcessing"
                  >
                    <template #icon><PlayCircleOutlined /></template>
                    {{ isProcessing ? `正在计算 (${progressPct}%)...` : "立即执行无损放大" }}
                  </a-button>
                  <a-button
                    v-if="isProcessing"
                    danger
                    size="large"
                    class="cancel-btn"
                    @click="cancelTask"
                  >
                    中断
                  </a-button>
                </div>
              </div>

              <!-- 进度条 -->
              <div v-if="isProcessing" class="process-progress-bar">
                <a-progress :percent="progressPct" status="active" :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }" />
                <span class="status-tip-text">{{ currentStatusText }}</span>
              </div>
            </div>

            <!-- 右侧视觉对比与导出区 -->
            <div class="preview-stage-panel">
              <!-- 顶部工具栏 -->
              <div class="stage-toolbar">
                <div class="tool-left">
                  <span class="toolbar-title">👀 视觉细节对比</span>
                  <a-radio-group v-model:value="viewMode" size="small" button-style="solid">
                    <a-radio-button value="split">
                      <ColumnWidthOutlined /> 左右卷帘对比
                    </a-radio-button>
                    <a-radio-button value="side">
                      <SplitCellsOutlined /> 双栏并排
                    </a-radio-button>
                  </a-radio-group>
                </div>
                <div class="tool-right" v-if="resultImage">
                  <span class="cost-time-badge">
                    <FieldTimeOutlined /> 耗时: {{ processDurationMs }} ms
                  </span>
                </div>
              </div>

              <!-- 视口展示区 -->
              <div class="stage-viewport">
                <!-- 1. 左右卷帘滑动对比模式 (Split Comparison) -->
                <div
                  v-if="viewMode === 'split'"
                  class="split-slider-box"
                  ref="sliderBox"
                  @mousemove="handleSliderMove"
                  @touchmove="handleSliderTouch"
                >
                  <!-- 底层：放大后的高清结果图 (或未处理时展示原图) -->
                  <div class="split-layer after-layer">
                    <img :src="resultImage || sourceInfo.dataUrl" alt="after" class="viewport-img" />
                    <span class="layer-badge after-badge">{{ resultImage ? "无损放大后 (高清)" : "原图" }}</span>
                  </div>

                  <!-- 顶层：原图裁剪层 (通过 clip-path 遮罩切开) -->
                  <div
                    class="split-layer before-layer"
                    :style="{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }"
                  >
                    <img :src="sourceInfo.dataUrl" alt="before" class="viewport-img" />
                    <span class="layer-badge before-badge">原图 (基础尺寸)</span>
                  </div>

                  <!-- 中间可拖拽分割条 -->
                  <div class="slider-handle" :style="{ left: `${sliderPos}%` }">
                    <div class="handle-line"></div>
                    <div class="handle-circle">
                      <span class="handle-arrows">⇄</span>
                    </div>
                  </div>
                </div>

                <!-- 2. 双栏并排模式 (Side by Side) -->
                <div v-else class="side-by-side-box">
                  <div class="side-col">
                    <div class="col-header">原图 ({{ sourceInfo.width }}×{{ sourceInfo.height }})</div>
                    <div class="img-wrapper">
                      <img :src="sourceInfo.dataUrl" alt="original" class="side-img" />
                    </div>
                  </div>
                  <div class="side-col">
                    <div class="col-header">
                      放大后 ({{ resultWidth || Math.round(sourceInfo.width * options.scale) }}×{{ resultHeight || Math.round(sourceInfo.height * options.scale) }})
                    </div>
                    <div class="img-wrapper">
                      <img :src="resultImage || sourceInfo.dataUrl" alt="upscaled" class="side-img" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- 结果状态与导出下载操作栏 -->
              <div class="export-footer-bar">
                <div class="res-info-row">
                  <div class="res-item">
                    <span class="label">分辨率对比：</span>
                    <strong class="val">{{ sourceInfo.width }}×{{ sourceInfo.height }}</strong>
                    <span class="arrow">➔</span>
                    <strong class="val text-blue">
                      {{ resultWidth || Math.round(sourceInfo.width * options.scale) }}×{{ resultHeight || Math.round(sourceInfo.height * options.scale) }} px
                    </strong>
                    <span class="pixel-pill">+{{ (options.scale ** 2 * 100) - 100 }}% 像素增益</span>
                  </div>

                  <div class="res-item" v-if="resultBlob">
                    <span class="label">生成体积：</span>
                    <strong class="val">{{ formatSize(resultBlob.size) }}</strong>
                  </div>
                </div>

                <div class="download-action-row">
                  <a-button
                    type="primary"
                    size="large"
                    class="download-btn"
                    :disabled="!resultImage"
                    @click="downloadResult"
                  >
                    <template #icon><DownloadOutlined /></template>
                    保存并下载放大图片 ({{ resultWidth || Math.round(sourceInfo.width * options.scale) }}×{{ resultHeight || Math.round(sourceInfo.height * options.scale) }})
                  </a-button>

                  <a-select v-model:value="exportFormat" style="width: 120px" size="large">
                    <a-select-option value="image/png">PNG 无损</a-select-option>
                    <a-select-option value="image/jpeg">JPG 高质</a-select-option>
                    <a-select-option value="image/webp">WebP 轻量</a-select-option>
                  </a-select>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- 标签 2: 批量多图排队快速放大 -->
        <a-tab-pane key="batch" tab="⚡ 批量图片极速放大">
          <div class="batch-upscale-container">
            <div class="batch-upload-box">
              <a-upload-dragger
                name="batchFiles"
                :multiple="true"
                :showUploadList="false"
                :before-upload="handleBatchUpload"
                accept="image/*"
              >
                <p class="ant-upload-drag-icon">
                  <InboxOutlined style="color: #1890ff; font-size: 38px" />
                </p>
                <p class="ant-upload-text">拖拽多张图片到这里，自动批量无损放大</p>
                <p class="ant-upload-hint">默认采用 2x 高保真自适应算法秒速并行渲染，支持一键打包下载</p>
              </a-upload-dragger>
            </div>

            <!-- 批量队列列表 -->
            <div v-if="batchList.length > 0" class="batch-list-wrapper">
              <div class="batch-header">
                <span>
                  处理进度: <strong>{{ batchFinishedCount }}</strong> / {{ batchList.length }}
                </span>
                <div>
                  <a-button
                    type="primary"
                    :disabled="batchFinishedCount === 0"
                    @click="downloadBatchZip"
                    :loading="isBatchZipping"
                  >
                    <template #icon><FileZipOutlined /></template>
                    一键打包下载全部高清大图 (ZIP)
                  </a-button>
                  <a-button danger type="text" @click="clearBatchList">清空</a-button>
                </div>
              </div>

              <a-table
                :columns="batchColumns"
                :data-source="batchList"
                row-key="id"
                :pagination="{ pageSize: 6 }"
                size="middle"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'thumb'">
                    <img :src="record.preview" class="batch-thumb-img" alt="thumb" />
                  </template>

                  <template v-if="column.key === 'res'">
                    <span>{{ record.origW }}×{{ record.origH }} ➔ <strong>{{ record.outW }}×{{ record.outH }}</strong></span>
                  </template>

                  <template v-if="column.key === 'status'">
                    <a-tag v-if="record.status === 'processing'" color="processing">
                      <LoadingOutlined /> 正在放大...
                    </a-tag>
                    <a-tag v-else-if="record.status === 'done'" color="success">
                      已完成 ({{ record.durationMs }}ms)
                    </a-tag>
                    <a-tag v-else color="error">失败</a-tag>
                  </template>

                  <template v-if="column.key === 'action'">
                    <a-button
                      type="link"
                      :disabled="record.status !== 'done'"
                      @click="downloadOneBatch(record)"
                    >
                      下载
                    </a-button>
                  </template>
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <!-- 本地模型管理器弹窗 (管理浏览器 IndexedDB 离线缓存) -->
    <a-modal
      v-model:open="showModelManager"
      title="💾 AI 神经网络超分辨率端侧模型与存储管理"
      :footer="null"
      width="680px"
    >
      <div class="model-manager-content">
        <p class="modal-desc">
          本系统集成了全球主流的端侧超分辨率架构，支持通过浏览器的 <strong>IndexedDB</strong> 将模型持久化在本地沙箱中。下载一次后永久断网可用，并调用 <strong>{{ hardwareAcceleration }}</strong> 硬件加速！
        </p>

        <div class="models-list">
          <div
            v-for="(meta, mId) in availableModels"
            :key="mId"
            class="model-item-card"
          >
            <div class="m-info">
              <div class="m-title-row">
                <span class="m-title">{{ meta.name }}</span>
                <a-tag color="blue" class="arch-tag">{{ meta.architecture }}</a-tag>
                <a-tag color="orange" class="arch-tag">{{ meta.sizeStr }}</a-tag>
              </div>
              <p class="m-detail-desc">{{ meta.desc }}</p>
              <span class="m-status-text">
                离线状态:
                <strong :style="{ color: cachedModelsMap[mId] ? '#52c41a' : '#faad14' }">
                  {{ cachedModelsMap[mId] ? "✅ 已持久化保存至本地 (断网即开)" : "⏳ 尚未缓存 (首次使用自动下载)" }}
                </strong>
              </span>
            </div>
            <div class="m-action">
              <a-button
                v-if="!cachedModelsMap[mId]"
                type="primary"
                size="small"
                @click="preloadSpecificModel(mId)"
                :loading="preloadingModelId === mId"
              >
                预载到本地
              </a-button>
              <a-button
                v-else
                danger
                size="small"
                @click="clearSpecificModelCache(mId)"
              >
                清除缓存
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
  ZoomInOutlined,
  CloudServerOutlined,
  QuestionCircleOutlined,
  ExperimentOutlined,
  SmileOutlined,
  PlayCircleOutlined,
  ColumnWidthOutlined,
  SplitCellsOutlined,
  FieldTimeOutlined,
  DownloadOutlined,
  InboxOutlined,
  FileZipOutlined,
  LoadingOutlined,
} from "@ant-design/icons-vue";
import {
  getImageDataFromSource,
  imageDataToDataUrl,
  imageDataToBlob,
  upscaleWithWorker,
  abortUpscaleTask,
  hasModelCached,
  AI_MODELS,
} from "../../utils/upscaler/index.js";
import { downloadAndCacheModel, removeCachedModel } from "../../utils/upscaler/modelStorage.js";
import { detectBestExecutionProvider } from "../../utils/upscaler/onnxEngine.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default {
  name: "ImageUpscaler",
  components: {
    ArrowLeftOutlined,
    ThunderboltOutlined,
    ZoomInOutlined,
    CloudServerOutlined,
    QuestionCircleOutlined,
    ExperimentOutlined,
    SmileOutlined,
    PlayCircleOutlined,
    ColumnWidthOutlined,
    SplitCellsOutlined,
    FieldTimeOutlined,
    DownloadOutlined,
    InboxOutlined,
    FileZipOutlined,
    LoadingOutlined,
  },
  data() {
    return {
      activeTab: "single",
      currentImage: null,
      sourceInfo: {
        name: "",
        size: 0,
        width: 0,
        height: 0,
        dataUrl: "",
      },
      options: {
        scale: 2,
        mode: "lanczos_cas",
        sharpness: 0.5,
        denoise: "light",
      },
      exportFormat: "image/png",
      viewMode: "split", // 'split' | 'side'
      sliderPos: 50, // 0 ~ 100%

      // 处理状态
      isProcessing: false,
      progressPct: 0,
      currentStatusText: "准备就绪",
      processDurationMs: 0,
      resultImage: "",
      resultBlob: null,
      resultWidth: 0,
      resultHeight: 0,

      // 硬件加速与模型状态
      hardwareAcceleration: "Wasm SIMD 加速",
      availableModels: AI_MODELS,
      cachedModelsMap: {},
      showModelManager: false,
      preloadingModelId: null,

      // 预设体验样张 (使用轻量 SVG / DataUrl 极简绘制的高频测试图)
      sampleImages: [
        {
          title: "矢量图标样张 (64×64)",
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' fill='%231890ff'/><circle cx='32' cy='32' r='20' fill='%23ffffff'/><path d='M24 36 L32 20 L40 36 Z' fill='%231890ff'/></svg>",
          name: "sample-icon.png",
        },
        {
          title: "复古像素艺术 (48×48)",
          url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><rect width='48' height='48' fill='%23222'/><rect x='12' y='12' width='8' height='8' fill='%23f5222d'/><rect x='28' y='12' width='8' height='8' fill='%23f5222d'/><rect x='16' y='28' width='16' height='6' fill='%2352c41a'/></svg>",
          name: "sample-pixel.png",
        },
      ],

      // 批量模式
      batchList: [],
      isBatchZipping: false,
      batchColumns: [
        { title: "缩略图", key: "thumb", width: 70, align: "center" },
        { title: "文件名", dataIndex: "name", key: "name", ellipsis: true },
        { title: "分辨率变化", key: "res", width: 170 },
        { title: "状态", key: "status", width: 150 },
        { title: "操作", key: "action", width: 90, align: "center" },
      ],
    };
  },
  computed: {
    batchFinishedCount() {
      return this.batchList.filter((f) => f.status === "done").length;
    },
    isAnyModelCached() {
      return Object.values(this.cachedModelsMap).some(Boolean);
    },
  },
  async mounted() {
    window.addEventListener("paste", this.handlePaste);
    this.detectHardware();
    this.checkAllModelsCache();
  },
  beforeUnmount() {
    abortUpscaleTask();
    window.removeEventListener("paste", this.handlePaste);
  },
  methods: {
    formatSize(bytes) {
      if (!bytes) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
    },

    async detectHardware() {
      try {
        const ep = await detectBestExecutionProvider();
        if (ep === "webgpu") {
          this.hardwareAcceleration = "WebGPU 显卡硬件加速";
        } else {
          this.hardwareAcceleration = "WebAssembly SIMD 多线程加速";
        }
      } catch (e) {
        this.hardwareAcceleration = "Wasm SIMD 加速";
      }
    },

    async checkAllModelsCache() {
      const cacheStatus = {};
      for (const mId in this.availableModels) {
        cacheStatus[mId] = await hasModelCached(mId);
      }
      this.cachedModelsMap = cacheStatus;
    },

    async preloadSpecificModel(mId) {
      this.preloadingModelId = mId;
      try {
        const meta = this.availableModels[mId];
        await downloadAndCacheModel(meta.id, meta.url);
        await this.checkAllModelsCache();
        message.success(`${meta.name} 已成功持久化至浏览器本地沙箱！`);
      } catch (err) {
        message.error("下载缓存模型失败: " + err.message);
      } finally {
        this.preloadingModelId = null;
      }
    },

    async clearSpecificModelCache(mId) {
      await removeCachedModel(mId);
      await this.checkAllModelsCache();
      message.success("已清除该模型的本地缓存！");
    },

    handlePaste(e) {
      if (this.activeTab !== "single") return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            message.success("已读取剪贴板截图！");
            this.handleSingleUpload(file);
            break;
          }
        }
      }
    },

    handleSingleUpload(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.sourceInfo = {
            name: file.name,
            size: file.size,
            width: img.naturalWidth || img.width,
            height: img.naturalHeight || img.height,
            dataUrl,
          };
          this.resultImage = "";
          this.resultBlob = null;
          message.success(`成功载入: ${file.name}`);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      return false;
    },

    loadSample(sample) {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        this.sourceInfo = {
          name: sample.name,
          size: 1024 * 4,
          width: img.naturalWidth,
          height: img.naturalHeight,
          dataUrl: sample.url,
        };
        this.resultImage = "";
        this.resultBlob = null;
        message.success("已加载内置测试样张");
      };
      img.src = sample.url;
    },

    cancelTask() {
      abortUpscaleTask();
      this.isProcessing = false;
      this.currentStatusText = "任务已中断";
      message.info("已停止当前放大任务");
    },

    resetImage() {
      abortUpscaleTask();
      this.currentImage = null;
      this.resultImage = "";
      this.resultBlob = null;
      this.isProcessing = false;
    },

    // 核心无损放大处理执行 (通过 Web Worker 线程零阻塞执行)
    async runUpscale() {
      if (!this.currentImage) return;

      this.isProcessing = true;
      this.progressPct = 5;
      this.currentStatusText = "正在提取原始图像像素数据...";

      try {
        const srcImageData = getImageDataFromSource(this.currentImage);

        const { resultImageData, durationMs } = await upscaleWithWorker(
          srcImageData,
          {
            scale: this.options.scale,
            mode: this.options.mode,
            sharpness: this.options.sharpness,
            denoise: this.options.denoise,
            modelId: "espcn-x2",
          },
          (pct, txt) => {
            this.progressPct = pct;
            if (txt) this.currentStatusText = txt;
          }
        );

        this.currentStatusText = "正在生成高清图像输出...";
        const dataUrl = imageDataToDataUrl(resultImageData, this.exportFormat, 0.95);
        const blob = await imageDataToBlob(resultImageData, this.exportFormat, 0.95);

        this.resultImage = dataUrl;
        this.resultBlob = blob;
        this.resultWidth = resultImageData.width;
        this.resultHeight = resultImageData.height;
        this.processDurationMs = durationMs;

        message.success(`无损放大成功！耗时: ${durationMs} ms`);
        await this.checkAllModelsCache();
      } catch (err) {
        if (err.name === "AbortError" || err.message?.includes("aborted")) {
          // 用户主动中断
          return;
        }
        console.error(err);
        message.error("放大失败: " + (err.message || "内部错误"));
      } finally {
        this.isProcessing = false;
        this.progressPct = 100;
      }
    },

    // 卷帘滑动控制
    handleSliderMove(e) {
      if (!this.$refs.sliderBox) return;
      const rect = this.$refs.sliderBox.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let pos = (x / rect.width) * 100;
      if (pos < 2) pos = 2;
      if (pos > 98) pos = 98;
      this.sliderPos = Math.round(pos);
    },

    handleSliderTouch(e) {
      if (!this.$refs.sliderBox || !e.touches[0]) return;
      const rect = this.$refs.sliderBox.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      let pos = (x / rect.width) * 100;
      if (pos < 2) pos = 2;
      if (pos > 98) pos = 98;
      this.sliderPos = Math.round(pos);
    },

    downloadResult() {
      if (!this.resultBlob) return;
      const ext = this.exportFormat === "image/jpeg" ? "jpg" : this.exportFormat === "image/webp" ? "webp" : "png";
      const baseName = this.sourceInfo.name ? this.sourceInfo.name.replace(/\.[^/.]+$/, "") : "upscaled";
      saveAs(this.resultBlob, `${baseName}-upscaled-${this.options.scale}x.${ext}`);
      message.success("已保存高清图片到本地！");
    },

    // ================= 批量处理 =================
    async handleBatchUpload(file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = async () => {
          const task = {
            id: Date.now() + Math.random().toString(36).substr(2, 6),
            name: file.name,
            origW: img.naturalWidth,
            origH: img.naturalHeight,
            outW: img.naturalWidth * 2,
            outH: img.naturalHeight * 2,
            preview: dataUrl,
            status: "processing",
            durationMs: 0,
            blob: null,
          };
          this.batchList.push(task);

          try {
            const srcImageData = getImageDataFromSource(img);
            const { resultImageData, durationMs } = await upscaleImage(srcImageData, {
              scale: 2,
              mode: "lanczos_cas",
              sharpness: 0.5,
              denoise: "light",
            });
            const blob = await imageDataToBlob(resultImageData, "image/png");
            task.blob = blob;
            task.status = "done";
            task.durationMs = durationMs;
          } catch (err) {
            task.status = "error";
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      return false;
    },

    downloadOneBatch(record) {
      if (!record.blob) return;
      const baseName = record.name.replace(/\.[^/.]+$/, "");
      saveAs(record.blob, `${baseName}-upscaled-2x.png`);
    },

    async downloadBatchZip() {
      const doneItems = this.batchList.filter((item) => item.status === "done" && item.blob);
      if (doneItems.length === 0) return;

      this.isBatchZipping = true;
      try {
        const zip = new JSZip();
        for (const item of doneItems) {
          const baseName = item.name.replace(/\.[^/.]+$/, "");
          zip.file(`${baseName}-upscaled-2x.png`, item.blob);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        saveAs(blob, `batch-upscaled-${Date.now()}.zip`);
        message.success(`已打包导出 ${doneItems.length} 张高清图片！`);
      } catch (err) {
        message.error("打包失败: " + err.message);
      } finally {
        this.isBatchZipping = false;
      }
    },

    clearBatchList() {
      this.batchList = [];
    },
  },
};
</script>

<style scoped>
.upscaler-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 8px 16px 36px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* 顶部 Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
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
  font-size: 22px;
  font-weight: 700;
  color: #1f1f1f;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-badge {
  font-size: 22px;
}

.page-desc {
  font-size: 13px;
  color: #8c8c8c;
  margin: 4px 0 0 0;
}

.header-right {
  display: flex;
  gap: 10px;
}

.feature-tag {
  background: #ffffff;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #595959;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s;
}

.hardware-tag {
  color: #1d39c4;
  background: #f0f5ff;
  border-color: #d6e4ff;
  font-weight: 600;
}

.feature-tag:hover {
  border-color: #91caff;
}

/* 主卡片 */
.main-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  padding: 8px 12px 24px;
}

/* 上传空状态 */
.upload-section {
  padding: 24px 0;
  outline: none;
}

.main-uploader {
  background: #fafafa;
  border: 2px dashed #d9d9d9;
  border-radius: 16px;
  transition: all 0.3s;
}

.main-uploader:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.upload-inner {
  padding: 48px 20px;
  text-align: center;
}

.upload-icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background: #e6f4ff;
  color: #1677ff;
  border-radius: 50%;
  margin-bottom: 16px;
}

.upload-icon {
  font-size: 36px;
}

.upload-title {
  font-size: 18px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 14px;
  color: #8c8c8c;
  margin-bottom: 16px;
}

.paste-tip {
  font-size: 12px;
  color: #bfbfbf;
}

.kbd {
  display: inline-block;
  padding: 2px 6px;
  font-size: 11px;
  font-family: monospace;
  background: #f5f5f5;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

/* 样张体验区 */
.sample-section {
  margin-top: 24px;
  padding: 16px 20px;
  background: #fafafa;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
}

.sample-label {
  font-size: 13px;
  color: #595959;
  display: block;
  margin-bottom: 12px;
}

.sample-cards {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.sample-card {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.sample-card:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.sample-thumb {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  object-fit: cover;
}

.sample-name {
  font-size: 12px;
  color: #262626;
  font-weight: 500;
}

/* 双栏排版 */
.upscale-editor-layout {
  display: grid;
  grid-template-columns: 360px minmax(0, 1fr);
  gap: 24px;
  margin-top: 12px;
  align-items: start;
}

@media (max-width: 992px) {
  .upscale-editor-layout {
    grid-template-columns: 1fr;
  }
}

/* 设置面板 */
.settings-panel {
  background: #fbfbfb;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 18px;
  min-width: 0;
  box-sizing: border-box;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 12px;
}

.file-info-badge {
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.file-info-badge .f-name {
  color: #1d39c4;
  font-weight: 500;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-info-badge .f-meta {
  color: #597ef7;
}

.config-group {
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #595959;
  margin-bottom: 8px;
}

.target-res-pill {
  font-size: 11px;
  color: #1677ff;
  background: #e6f4ff;
  padding: 1px 6px;
  border-radius: 10px;
  font-family: monospace;
}

.val-pill {
  font-weight: 600;
  color: #1677ff;
  font-size: 12px;
}

.full-width-radio {
  display: flex;
  width: 100%;
}

.full-width-radio :deep(.ant-radio-button-wrapper) {
  flex: 1;
  text-align: center;
  padding: 0 4px;
}

/* 算法卡片 */
.engine-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.engine-card {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.engine-card:hover {
  border-color: #91caff;
}

.engine-card.active {
  border-color: #1677ff;
  background: #f0f7ff;
  box-shadow: 0 0 0 1px #1677ff inset;
}

.engine-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.e-icon {
  font-size: 14px;
}

.text-orange {
  color: #fa8c16;
}

.text-blue {
  color: #1890ff;
}

.text-purple {
  color: #722ed1;
}

.e-name {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  flex: 1;
}

.mini-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}

.e-desc {
  font-size: 11px;
  color: #8c8c8c;
  margin: 0;
  line-height: 1.4;
}

.action-btn-wrapper {
  margin-top: 20px;
}

.action-btn-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.start-upscale-btn {
  flex: 1;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
}

.cancel-btn {
  height: 46px;
  border-radius: 8px;
  font-weight: 600;
  padding: 0 16px;
}

.process-progress-bar {
  margin-top: 14px;
}

.status-tip-text {
  font-size: 12px;
  color: #8c8c8c;
  display: block;
  margin-top: 4px;
  text-align: center;
}

/* 右侧预览区 */
.preview-stage-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  box-sizing: border-box;
}

.stage-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 8px 14px;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  margin-right: 12px;
}

.cost-time-badge {
  font-size: 12px;
  color: #52c41a;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

/* 视口 */
.stage-viewport {
  background: #202124;
  border: 1px solid #333;
  border-radius: 12px;
  height: 480px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 卷帘滑动器 */
.split-slider-box {
  width: 100%;
  height: 100%;
  position: relative;
  user-select: none;
  cursor: ew-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(45deg, #18191a 25%, transparent 25%),
    linear-gradient(-45deg, #18191a 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #18191a 75%),
    linear-gradient(-45deg, transparent 75%, #18191a 75%);
  background-size: 16px 16px;
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

.viewport-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  display: block;
  image-rendering: -webkit-optimize-contrast;
}

.layer-badge {
  position: absolute;
  top: 14px;
  padding: 4px 10px;
  font-size: 11px;
  border-radius: 20px;
  font-weight: 600;
  backdrop-filter: blur(8px);
}

.before-badge {
  left: 14px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.after-badge {
  right: 14px;
  background: rgba(22, 119, 255, 0.85);
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 卷帘中轴线 */
.slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  pointer-events: none;
  z-index: 10;
  transform: translateX(-50%);
}

.handle-line {
  width: 2px;
  height: 100%;
  background: #ffffff;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.5);
}

.handle-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 34px;
  height: 34px;
  background: #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.handle-arrows {
  color: #1677ff;
  font-size: 16px;
  font-weight: bold;
}

/* 双栏对比 */
.side-by-side-box {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  height: 100%;
  gap: 1px;
  background: #333;
}

.side-col {
  background: #1e1e1e;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.col-header {
  padding: 8px 12px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.4);
  color: #aaa;
  text-align: center;
}

.side-col .img-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px;
}

.side-img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* 导出栏 */
.export-footer-bar {
  background: #fbfbfb;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.res-info-row {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.res-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.res-item .label {
  color: #8c8c8c;
}

.res-item .arrow {
  color: #bfbfbf;
}

.text-blue {
  color: #1677ff;
}

.pixel-pill {
  font-size: 11px;
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.download-action-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.download-btn {
  height: 44px;
  padding: 0 24px;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
}

/* 批量模式 */
.batch-upscale-container {
  padding: 12px 0;
}

.batch-upload-box {
  margin-bottom: 20px;
}

.batch-list-wrapper {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
}

.batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-thumb-img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  border-radius: 4px;
}

/* 弹窗样式 */
.model-manager-content {
  padding: 8px 0;
}

.modal-desc {
  font-size: 13px;
  color: #595959;
  line-height: 1.6;
  margin-bottom: 16px;
}

.models-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.model-item-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f9f9f9;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  padding: 14px 16px;
  gap: 16px;
}

.m-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.m-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.m-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
}

.arch-tag {
  font-size: 10px;
  line-height: 1.4;
  margin: 0;
}

.m-detail-desc {
  font-size: 12px;
  color: #8c8c8c;
  margin: 2px 0;
  line-height: 1.4;
}

.m-status-text {
  font-size: 12px;
  color: #595959;
  margin-top: 2px;
}
</style>
