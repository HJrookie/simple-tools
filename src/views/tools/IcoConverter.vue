<template>
  <div class="ico-converter-container">
    <!-- 顶部导航栏与标题 -->
    <div class="page-header">
      <div class="header-left">
        <a-button type="default" @click="$router.push('/')" class="back-btn">
          <template #icon><ArrowLeftOutlined /></template>
          返回工具集
        </a-button>
        <div class="title-group">
          <h1 class="page-title">
            <span class="icon-badge">🎯</span> Favicon & ICO 图标极速生成器
          </h1>
          <p class="page-desc">
            把任意图片（PNG、JPG、SVG、WebP 等）在本地极速转为高质量浏览器图标，支持多尺寸合一与实时仿真。
          </p>
        </div>
      </div>
      <div class="header-right">
        <div class="feature-tag">
          <ThunderboltOutlined style="color: #faad14" /> 纯本地 GPU 加速
        </div>
        <div class="feature-tag">
          <SafetyCertificateOutlined style="color: #52c41a" /> 零网络请求 · 100% 隐私安全
        </div>
      </div>
    </div>

    <!-- 主体内容卡片 -->
    <a-card class="main-card" :bordered="false">
      <!-- 顶级模式切换：单图精细定制 / 多图批量极速转换 -->
      <a-tabs v-model:activeKey="activeTab" class="custom-tabs" size="large">
        <a-tab-pane key="single" tab="🎨 单图精细定制与实时仿真">
          <div class="single-mode-wrapper">
            <!-- 尚未上传图片时的上传区域 -->
            <div
              v-if="!currentImage"
              class="upload-box-wrapper"
              @paste="handlePaste"
              tabindex="0"
            >
              <a-upload-dragger
                name="file"
                :multiple="false"
                :showUploadList="false"
                :before-upload="handleSingleUpload"
                accept="image/*,.svg,.ico,.webp,.bmp"
                class="main-uploader"
              >
                <div class="upload-inner">
                  <div class="upload-icon-wrapper">
                    <CloudUploadOutlined class="upload-icon" />
                  </div>
                  <h3 class="upload-title">点击或将图片拖拽至此处</h3>
                  <p class="upload-hint">
                    支持 <strong>PNG、JPG、JPEG、SVG 矢量图、WebP、GIF、BMP、ICO</strong> 等任意格式
                  </p>
                  <div class="paste-tip">
                    <span class="kbd">Ctrl</span> + <span class="kbd">V</span> 或 <span class="kbd">⌘</span> + <span class="kbd">V</span> 可直接粘贴剪贴板截图
                  </div>
                </div>
              </a-upload-dragger>
            </div>

            <!-- 已上传图片：左侧控制面板 + 右侧实时预览与导出 -->
            <div v-else class="editor-layout">
              <!-- 左侧控制面板 -->
              <div class="control-panel">
                <div class="panel-section-title">
                  <span>📐 图标构图与微调</span>
                  <a-button type="link" size="small" @click="resetImage" danger>更换图片</a-button>
                </div>

                <!-- 图像信息 -->
                <div class="source-info-bar">
                  <span class="file-name" :title="sourceInfo.name">{{ sourceInfo.name }}</span>
                  <span class="file-meta">{{ sourceInfo.width }}×{{ sourceInfo.height }} px · {{ formatSize(sourceInfo.size) }}</span>
                </div>

                <!-- 1. 缩放与适应模式 -->
                <div class="control-item">
                  <div class="item-label">
                    <span>缩放填充方式：</span>
                    <a-tooltip title="Contain：等比留空（最适合非正方形Logo）；Cover：铺满裁切；Fill：拉伸变正方形">
                      <QuestionCircleOutlined class="tip-icon" />
                    </a-tooltip>
                  </div>
                  <a-radio-group v-model:value="options.fit" button-style="solid" size="small" class="full-width-radio" @change="updatePreviews">
                    <a-radio-button value="contain">等比居中</a-radio-button>
                    <a-radio-button value="cover">裁剪铺满</a-radio-button>
                    <a-radio-button value="fill">强制拉伸</a-radio-button>
                  </a-radio-group>
                </div>

                <!-- 2. 内边距调节 (Padding) -->
                <div class="control-item">
                  <div class="item-label">
                    <span>内缩留白边距：</span>
                    <span class="val-text">{{ Math.round(options.padding * 100) }}%</span>
                  </div>
                  <a-slider
                    v-model:value="options.padding"
                    :min="0"
                    :max="0.35"
                    :step="0.01"
                    :tip-formatter="(val) => `${Math.round(val * 100)}%`"
                    @change="updatePreviews"
                  />
                </div>

                <!-- 3. 外观外形遮罩 -->
                <div class="control-item">
                  <div class="item-label">
                    <span>图标轮廓形状：</span>
                  </div>
                  <a-radio-group v-model:value="options.shape" button-style="solid" size="small" class="full-width-radio" @change="updatePreviews">
                    <a-radio-button value="square">原始直角</a-radio-button>
                    <a-radio-button value="rounded">iOS 圆角</a-radio-button>
                    <a-radio-button value="circle">圆形</a-radio-button>
                  </a-radio-group>
                </div>

                <!-- 4. 背景色填充 -->
                <div class="control-item">
                  <div class="item-label">
                    <span>底色填充：</span>
                    <a-tooltip title="透明图在深色标签页可能看不清，可根据需要填补白色或自定义主题色">
                      <QuestionCircleOutlined class="tip-icon" />
                    </a-tooltip>
                  </div>
                  <div class="bg-picker-row">
                    <button
                      class="color-preset-btn transparent-btn"
                      :class="{ active: options.backgroundColor === 'transparent' }"
                      @click="setColor('transparent')"
                      title="透明背景"
                    >
                      透明
                    </button>
                    <button
                      class="color-preset-btn white-btn"
                      :class="{ active: options.backgroundColor === '#ffffff' }"
                      @click="setColor('#ffffff')"
                      title="纯白底色"
                    >
                      纯白
                    </button>
                    <button
                      class="color-preset-btn black-btn"
                      :class="{ active: options.backgroundColor === '#000000' }"
                      @click="setColor('#000000')"
                      title="纯黑底色"
                    >
                      纯黑
                    </button>
                    <input
                      type="color"
                      v-model="customColor"
                      @input="handleCustomColorChange"
                      class="color-input"
                      title="自定义取色"
                    />
                  </div>
                </div>

                <a-divider style="margin: 14px 0;" />

                <!-- 5. 包含的尺寸打包设置 (优雅 3 列网格，杜绝溢出) -->
                <div class="control-item no-margin-bottom">
                  <div class="item-label">
                    <span>打包封装分辨率（多尺寸合一）：</span>
                  </div>
                  
                  <div class="size-shortcuts">
                    <button class="shortcut-pill" @click="selectStandardSizes">推荐 16+32+48</button>
                    <button class="shortcut-pill" @click="selectAllSizes">全选所有</button>
                    <button class="shortcut-pill" @click="selectOnly16">仅 16px</button>
                    <button class="shortcut-pill" @click="selectOnly32">仅 32px</button>
                  </div>

                  <!-- 实时预估小结条 -->
                  <div class="selected-summary-bar">
                    <span>已选 <strong>{{ selectedSizes.length }}</strong> 个尺寸</span>
                    <span class="est-inline-pill">
                      预计 ICO 体积: <strong>{{ estimatedIcoSizeStr }}</strong>
                    </span>
                  </div>

                  <!-- 3 列精致卡片网格，不依赖可能撑大宽度的 AntD Checkbox 容器 -->
                  <div class="size-chip-grid">
                    <div
                      v-for="item in availableSizes"
                      :key="item.value"
                      class="size-chip-card"
                      :class="{ selected: selectedSizes.includes(item.value) }"
                      @click="toggleSize(item.value)"
                    >
                      <div class="chip-top">
                        <span class="chip-size-title">{{ item.value }}×{{ item.value }}</span>
                        <span class="chip-check-icon">
                          <CheckCircleFilled v-if="selectedSizes.includes(item.value)" />
                          <span class="uncheck-circle" v-else></span>
                        </span>
                      </div>
                      <div class="chip-bottom">
                        <span class="chip-byte-val" v-if="sizeBytesMap[item.value]">
                          {{ formatSize(sizeBytesMap[item.value]) }}
                        </span>
                        <span class="chip-byte-val placeholder" v-else>-</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 右侧实时预览与导出区 -->
              <div class="preview-panel">
                <!-- 真实浏览器标签仿真 -->
                <div class="browser-mockup-wrapper">
                  <div class="mockup-header">
                    <span class="mockup-title">
                      <LaptopOutlined /> 浏览器标签页真实仿真体验
                    </span>
                    <div class="mockup-controls">
                      <span class="mode-label">标签栏外观:</span>
                      <a-radio-group v-model:value="browserTheme" size="small">
                        <a-radio-button value="light">浅色模式</a-radio-button>
                        <a-radio-button value="dark">深色模式</a-radio-button>
                      </a-radio-group>
                      <a-button
                        size="small"
                        type="primary"
                        ghost
                        @click="testInCurrentTab"
                        style="margin-left: 8px"
                      >
                        <EyeOutlined /> 实时替换本页面图标
                      </a-button>
                    </div>
                  </div>

                  <!-- 模拟 Chrome 标签页外壳 -->
                  <div class="chrome-window" :class="browserTheme">
                    <div class="chrome-tabbar">
                      <!-- 标签页 -->
                      <div class="chrome-tab active">
                        <div class="tab-favicon">
                          <img :src="previews[16] || previews[32]" alt="favicon preview" />
                        </div>
                        <span class="tab-title" contenteditable="true" spellcheck="false" title="点击可修改预览标题">
                          {{ sampleTabTitle }}
                        </span>
                        <span class="tab-close">×</span>
                      </div>
                      <div class="chrome-tab inactive">
                        <span class="tab-favicon-placeholder"></span>
                        <span class="tab-title">Google Search</span>
                      </div>
                    </div>
                    <!-- 模拟地址栏 -->
                    <div class="chrome-address-bar">
                      <span class="lock-icon">🔒</span>
                      <span class="site-url">https://mysite.com</span>
                    </div>
                  </div>
                </div>

                <!-- 各尺寸高清渲染网格 (包含各尺寸大小显示) -->
                <div class="sizes-grid-wrapper">
                  <div class="grid-header">
                    <span>🔍 各分辨率即时渲染细节 (点击可单张下载)</span>
                    <span class="hint-tip">透明棋盘底色方便检查边缘抗锯齿</span>
                  </div>
                  <div class="sizes-cards">
                    <div
                      v-for="s in selectedSizesSorted"
                      :key="s"
                      class="size-card"
                    >
                      <div class="card-thumb-bg">
                        <img
                          :src="previews[s]"
                          :style="{ width: s > 64 ? '64px' : s + 'px', height: s > 64 ? '64px' : s + 'px' }"
                          class="thumb-img"
                        />
                      </div>
                      <div class="card-footer">
                        <div class="s-meta">
                          <span class="s-name">{{ s }}×{{ s }}</span>
                          <span class="s-bytes" v-if="sizeBytesMap[s]">
                            {{ formatSize(sizeBytesMap[s]) }}
                          </span>
                        </div>
                        <a-button
                          type="link"
                          size="small"
                          @click="downloadSinglePng(s)"
                          title="下载单张 PNG"
                        >
                          PNG
                        </a-button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 📊 文件大小预估与分析看板 (File Size Breakdown) -->
                <div class="size-estimator-card">
                  <div class="estimator-header">
                    <div class="est-title-group">
                      <span class="est-title">
                        <PieChartOutlined /> 文件体积预估与规格分析
                      </span>
                      <span class="est-note">（基于 Canvas 真实二进制渲染与 ICO 封装精确计算）</span>
                    </div>
                    <a-tag :color="sizeHealthCategory.color" class="health-tag">
                      {{ sizeHealthCategory.label }}
                    </a-tag>
                  </div>

                  <div class="est-metrics-grid">
                    <!-- 指标 1：预估最终 ICO 文件大小 -->
                    <div class="metric-item highlight">
                      <span class="metric-label">预估生成 favicon.ico 体积</span>
                      <div class="metric-val-row">
                        <span class="metric-val text-primary">{{ estimatedIcoSizeStr }}</span>
                        <span class="metric-badge" v-if="savingsPercentage > 0">
                          节省 {{ savingsPercentage }}%
                        </span>
                      </div>
                      <span class="metric-sub">{{ sizeHealthCategory.tip }}</span>
                    </div>

                    <!-- 指标 2：原图大小参考 -->
                    <div class="metric-item">
                      <span class="metric-label">输入源图片大小</span>
                      <div class="metric-val-row">
                        <span class="metric-val">{{ formatSize(sourceInfo.size) }}</span>
                      </div>
                      <span class="metric-sub">{{ sourceInfo.width }}×{{ sourceInfo.height }} 原始像素</span>
                    </div>

                    <!-- 指标 3：全套 Web 站长包预估大小 -->
                    <div class="metric-item">
                      <span class="metric-label">预计全套 Web 包 (.zip)</span>
                      <div class="metric-val-row">
                        <span class="metric-val">~{{ estimatedZipSizeStr }}</span>
                      </div>
                      <span class="metric-sub">包含 6 种 PNG + ICO + Manifest</span>
                    </div>
                  </div>

                  <!-- 各尺寸体积分布比例条 -->
                  <div class="size-breakdown-bar-wrapper" v-if="selectedSizes.length > 0">
                    <div class="breakdown-label">
                      <span>已选尺寸体积分布占比：</span>
                      <div class="detail-tags-wrapper">
                        <span
                          v-for="s in selectedSizesSorted"
                          :key="s"
                          class="detail-tag"
                        >
                          <span class="dot" :style="{ backgroundColor: getSizeColor(s) }"></span>
                          {{ s }}px: <strong>{{ formatSize(sizeBytesMap[s]) }}</strong>
                        </span>
                      </div>
                    </div>
                    <div class="bar-track">
                      <div
                        v-for="s in selectedSizesSorted"
                        :key="s"
                        class="bar-segment"
                        :style="{
                          width: ((sizeBytesMap[s] || 0) / (totalPngDataBytes || 1)) * 100 + '%',
                          backgroundColor: getSizeColor(s)
                        }"
                        :title="`${s}×${s}: ${formatSize(sizeBytesMap[s])}`"
                      ></div>
                    </div>
                  </div>
                </div>

                <!-- 导出与代码生成操作栏 (动态显示大小) -->
                <div class="export-actions-bar">
                  <div class="buttons-row">
                    <a-button
                      type="primary"
                      size="large"
                      class="main-download-btn"
                      @click="downloadIco"
                      :loading="isExporting"
                    >
                      <template #icon><DownloadOutlined /></template>
                      下载 favicon.ico (包含已选 {{ selectedSizes.length }} 种尺寸 · 预估 {{ estimatedIcoSizeStr }})
                    </a-button>

                    <a-button
                      size="large"
                      class="zip-download-btn"
                      @click="downloadWebPackZip"
                      :loading="isZipping"
                    >
                      <template #icon><FileZipOutlined /></template>
                      打包全套 Web 站长资源包 (.zip · 约 {{ estimatedZipSizeStr }})
                    </a-button>
                  </div>

                  <div class="code-snippet-box">
                    <div class="snippet-header">
                      <span>💻 网页 HTML &lt;head&gt; 引入标准代码：</span>
                      <a-button size="small" type="link" @click="copyHtmlCode">
                        <CopyOutlined /> 一键复制
                      </a-button>
                    </div>
                    <pre class="code-pre"><code>{{ htmlSnippet }}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- Tab 2: 批量极速转换模式 -->
        <a-tab-pane key="batch" tab="⚡ 批量图片极速批量转 ICO">
          <div class="batch-mode-wrapper">
            <div class="batch-upload-area">
              <a-upload-dragger
                name="batchFiles"
                :multiple="true"
                :showUploadList="false"
                :before-upload="handleBatchUpload"
                accept="image/*,.svg,.ico,.webp,.bmp"
              >
                <p class="ant-upload-drag-icon">
                  <FolderAddOutlined style="color: #1890ff; font-size: 40px" />
                </p>
                <p class="ant-upload-text">点击或一次拖拽多张图片到这里</p>
                <p class="ant-upload-hint">支持数十张图片瞬时在本地并行转换，自动适配为标准多合一 ICO，实时显示前后体积对比</p>
              </a-upload-dragger>
            </div>

            <!-- 批量结果列表 -->
            <div v-if="batchList.length > 0" class="batch-list-wrapper">
              <div class="batch-list-header">
                <span class="batch-stat">
                  已完成: <strong>{{ batchFinishedCount }}</strong> / {{ batchList.length }}
                  <span v-if="batchSavedTotal > 0" class="batch-saved-text">
                    (累计节省: {{ formatSize(batchSavedTotal) }})
                  </span>
                </span>
                <div class="batch-btns">
                  <a-button
                    type="primary"
                    :disabled="batchFinishedCount === 0"
                    @click="downloadBatchZip"
                    :loading="isBatchZipping"
                  >
                    <template #icon><FileZipOutlined /></template>
                    一键打包下载全部 ICO (ZIP)
                  </a-button>
                  <a-button danger type="text" @click="clearBatchList">清空列表</a-button>
                </div>
              </div>

              <a-table
                :columns="batchColumns"
                :data-source="batchList"
                row-key="id"
                :pagination="{ pageSize: 8 }"
                size="middle"
                bordered
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'thumb'">
                    <div class="batch-thumb-cell">
                      <img :src="record.preview" alt="preview" />
                    </div>
                  </template>
                  <template v-if="column.key === 'status'">
                    <a-tag v-if="record.status === 'processing'" color="processing">
                      <LoadingOutlined /> 转换中
                    </a-tag>
                    <a-tag v-else-if="record.status === 'done'" color="success">
                      完成 ({{ formatSize(record.icoSize) }})
                    </a-tag>
                    <a-tag v-else color="error">失败</a-tag>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <a-button
                      type="link"
                      :disabled="record.status !== 'done'"
                      @click="downloadOneBatchIco(record)"
                    >
                      下载 .ico
                    </a-button>
                  </template>
                </template>
              </a-table>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<script>
import { message } from "ant-design-vue";
import {
  ArrowLeftOutlined,
  CloudUploadOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  DownloadOutlined,
  FileZipOutlined,
  QuestionCircleOutlined,
  LaptopOutlined,
  EyeOutlined,
  CopyOutlined,
  FolderAddOutlined,
  LoadingOutlined,
  PieChartOutlined,
  CheckCircleFilled,
} from "@ant-design/icons-vue";
import {
  generateIcoFromImage,
  loadImageFromFile,
  renderImageToCanvas,
  canvasToPngBlob,
  WEB_FAVICON_PRESET,
  generateHtmlHeadSnippet,
  generateWebManifestContent,
} from "../../utils/ico.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";

export default {
  name: "IcoConverter",
  components: {
    ArrowLeftOutlined,
    CloudUploadOutlined,
    ThunderboltOutlined,
    SafetyCertificateOutlined,
    DownloadOutlined,
    FileZipOutlined,
    QuestionCircleOutlined,
    LaptopOutlined,
    EyeOutlined,
    CopyOutlined,
    FolderAddOutlined,
    LoadingOutlined,
    PieChartOutlined,
    CheckCircleFilled,
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
      },
      options: {
        fit: "contain",
        padding: 0,
        shape: "square",
        borderRadiusRatio: 0.22,
        backgroundColor: "transparent",
      },
      customColor: "#ffffff",
      availableSizes: [
        { value: 16, label: "标准标签页" },
        { value: 32, label: "Retina 高清" },
        { value: 48, label: "桌面/书签" },
        { value: 64, label: "应用小图标" },
        { value: 128, label: "高清系统" },
        { value: 256, label: "超清大图" },
      ],
      selectedSizes: [16, 32, 48],
      previews: {},
      pngBlobs: {},
      sizeBytesMap: {}, // 各尺寸真实/预估字节数缓存
      browserTheme: "light",
      sampleTabTitle: "我的炫酷网站 - My Awesome Site",
      isExporting: false,
      isZipping: false,

      // 批量处理相关
      batchList: [],
      isBatchZipping: false,
      batchColumns: [
        { title: "预览", key: "thumb", width: 70, align: "center" },
        { title: "原始文件名", dataIndex: "name", key: "name", ellipsis: true },
        { title: "原大小", dataIndex: "origSizeStr", width: 100 },
        { title: "转换状态", key: "status", width: 140 },
        { title: "操作", key: "actions", width: 110, align: "center" },
      ],
    };
  },
  computed: {
    selectedSizesSorted() {
      return [...this.selectedSizes].sort((a, b) => a - b);
    },

    // 选中的所有 PNG 数据总字节
    totalPngDataBytes() {
      return this.selectedSizes.reduce((acc, s) => acc + (this.sizeBytesMap[s] || 0), 0);
    },

    // 预估最终生成的 .ico 文件真实大小 (字节)
    // 算法公式：6 (ICONDIR) + 16 * N (ICONDIRENTRY) + 所有 PNG 数据字节总和
    estimatedIcoSizeBytes() {
      if (this.selectedSizes.length === 0) return 0;
      const headerBytes = 6;
      const entryBytes = 16 * this.selectedSizes.length;
      return headerBytes + entryBytes + this.totalPngDataBytes;
    },

    estimatedIcoSizeStr() {
      return this.formatSize(this.estimatedIcoSizeBytes);
    },

    // 相比原图节省比例
    savingsPercentage() {
      if (!this.sourceInfo.size || !this.estimatedIcoSizeBytes) return 0;
      if (this.sourceInfo.size <= this.estimatedIcoSizeBytes) return 0;
      return Math.round(((this.sourceInfo.size - this.estimatedIcoSizeBytes) / this.sourceInfo.size) * 100);
    },

    // 预估全套 Web 站长包 ZIP 文件大小
    estimatedZipSizeStr() {
      let estTotal = this.estimatedIcoSizeBytes || 4096;
      estTotal += (this.sizeBytesMap[16] || 400) + (this.sizeBytesMap[32] || 800) + (this.sizeBytesMap[48] || 1500);
      estTotal += 8 * 1024 + 10 * 1024 + 32 * 1024; // 180, 192, 512
      estTotal += 2048; // manifest + html
      return this.formatSize(estTotal);
    },

    // 体积规格与评级
    sizeHealthCategory() {
      const bytes = this.estimatedIcoSizeBytes;
      if (bytes === 0) return { label: "未选择", color: "default", tip: "请至少选择一个尺寸" };
      if (bytes <= 8 * 1024) {
        return {
          level: "optimal",
          label: "⚡ 极速轻量 (推荐网页首屏)",
          color: "success",
          tip: "小于 8KB，极速首屏加载，无任何性能瓶颈",
        };
      }
      if (bytes <= 30 * 1024) {
        return {
          level: "good",
          label: "⚖️ 标准高清 (推荐)",
          color: "blue",
          tip: "兼顾高分辨率显示（Windows 桌面/Retina屏）与加载性能",
        };
      }
      return {
        level: "large",
        label: "📦 包含超大图标",
        color: "warning",
        tip: "包含 128px 或 256px 超大尺寸，适合桌面应用或离线安装",
      };
    },

    htmlSnippet() {
      return generateHtmlHeadSnippet(this.sourceInfo.name ? this.sourceInfo.name.replace(/\.[^/.]+$/, "") : "My Website");
    },

    batchFinishedCount() {
      return this.batchList.filter((item) => item.status === "done").length;
    },

    batchSavedTotal() {
      return this.batchList.reduce((acc, cur) => {
        if (cur.status === "done" && cur.origSize && cur.icoSize) {
          return acc + Math.max(0, cur.origSize - cur.icoSize);
        }
        return acc;
      }, 0);
    },
  },
  mounted() {
    window.addEventListener("paste", this.handlePaste);
  },
  beforeUnmount() {
    window.removeEventListener("paste", this.handlePaste);
  },
  methods: {
    formatSize(bytes) {
      if (!bytes || bytes === 0) return "0 B";
      if (bytes < 1024) return bytes + " B";
      const k = 1024;
      const sizes = ["B", "KB", "MB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(1) + " " + sizes[i];
    },

    // 颜色配置
    getSizeColor(s) {
      const colorMap = {
        16: "#52c41a",
        32: "#1890ff",
        48: "#722ed1",
        64: "#fa8c16",
        128: "#13c2c2",
        256: "#f5222d",
      };
      return colorMap[s] || "#1890ff";
    },

    // 切换单项尺寸选中
    toggleSize(val) {
      const idx = this.selectedSizes.indexOf(val);
      if (idx > -1) {
        if (this.selectedSizes.length === 1) {
          message.warning("请至少保留一个生成尺寸！");
          return;
        }
        this.selectedSizes.splice(idx, 1);
      } else {
        this.selectedSizes.push(val);
        this.selectedSizes.sort((a, b) => a - b);
      }
      this.updatePreviews();
    },

    // 快捷选中尺寸
    selectAllSizes() {
      this.selectedSizes = [16, 32, 48, 64, 128, 256];
      this.updatePreviews();
    },
    selectStandardSizes() {
      this.selectedSizes = [16, 32, 48];
      this.updatePreviews();
    },
    selectOnly16() {
      this.selectedSizes = [16];
      this.updatePreviews();
    },
    selectOnly32() {
      this.selectedSizes = [32];
      this.updatePreviews();
    },

    // 颜色设置
    setColor(color) {
      this.options.backgroundColor = color;
      this.updatePreviews();
    },
    handleCustomColorChange(e) {
      this.options.backgroundColor = e.target.value;
      this.updatePreviews();
    },

    // 剪贴板监听
    handlePaste(e) {
      if (this.activeTab !== "single") return;
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            message.success("已识别剪贴板图片并载入！");
            this.handleSingleUpload(file);
            break;
          }
        }
      }
    },

    // 单图模式上传
    async handleSingleUpload(file) {
      try {
        const loaded = await loadImageFromFile(file);
        this.currentImage = loaded.img;
        this.sourceInfo = {
          name: loaded.name,
          size: loaded.size,
          width: loaded.width,
          height: loaded.height,
        };
        await this.updatePreviews();
        message.success(`成功载入图片: ${loaded.name}`);
      } catch (err) {
        message.error(err.message || "加载图片失败");
      }
      return false; // 阻止默认上传行为
    },

    resetImage() {
      this.currentImage = null;
      this.previews = {};
      this.pngBlobs = {};
      this.sizeBytesMap = {};
    },

    // 重新计算各个尺寸渲染及精确体积
    async updatePreviews() {
      if (!this.currentImage) return;

      try {
        // 计算所有预设分辨率建立体积图谱
        const allSizes = [16, 32, 48, 64, 128, 256];
        const result = await generateIcoFromImage(this.currentImage, allSizes, this.options);
        this.previews = result.previews;
        this.pngBlobs = result.pngBlobs;

        // 记录每一个尺寸的精确 PNG 字节数
        const bytesMap = {};
        for (const s of allSizes) {
          if (result.pngBlobs[s]) {
            bytesMap[s] = result.pngBlobs[s].size;
          }
        }
        this.sizeBytesMap = bytesMap;
      } catch (err) {
        console.error("生成预览或预估大小失败", err);
      }
    },

    // 在当前网页中直接动态替换测试
    testInCurrentTab() {
      const p16 = this.previews[16] || this.previews[32];
      if (!p16) return;

      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = p16;
      message.success("已将当前网页 Favicon 动态替换为您生成的图标，请查看浏览器左上角！");
    },

    // 下载合并打包的 .ico
    async downloadIco() {
      if (!this.currentImage) return;
      if (this.selectedSizes.length === 0) {
        message.warning("请至少勾选一个分辨率尺寸！");
        return;
      }

      this.isExporting = true;
      try {
        const result = await generateIcoFromImage(this.currentImage, this.selectedSizes, this.options);
        const filename = "favicon.ico";
        saveAs(result.icoBlob, filename);
        message.success(`已生成并导出 ${filename} (${this.formatSize(result.icoBlob.size)})`);
      } catch (err) {
        message.error("生成 ICO 文件失败: " + err.message);
      } finally {
        this.isExporting = false;
      }
    },

    // 单独下载某个尺寸的 PNG
    async downloadSinglePng(size) {
      if (!this.currentImage) return;
      try {
        const canvas = renderImageToCanvas(this.currentImage, size, this.options);
        const blob = await canvasToPngBlob(canvas);
        saveAs(blob, `favicon-${size}x${size}.png`);
        message.success(`已导出 favicon-${size}x${size}.png (${this.formatSize(blob.size)})`);
      } catch (err) {
        message.error("下载单张 PNG 失败: " + err.message);
      }
    },

    // 打包全套站长 Web 资源包 (.zip)
    async downloadWebPackZip() {
      if (!this.currentImage) return;

      this.isZipping = true;
      try {
        const zip = new JSZip();
        const baseName = this.sourceInfo.name ? this.sourceInfo.name.replace(/\.[^/.]+$/, "") : "website";

        // 1. 生成并添加多合一 favicon.ico
        const icoResult = await generateIcoFromImage(this.currentImage, [16, 32, 48], this.options);
        zip.file("favicon.ico", icoResult.icoBlob);

        // 2. 生成并添加 Web 套餐中各个尺寸 PNG
        for (const preset of WEB_FAVICON_PRESET) {
          const canvas = renderImageToCanvas(this.currentImage, preset.size, this.options);
          const blob = await canvasToPngBlob(canvas);
          zip.file(preset.filename, blob);
        }

        // 3. 生成并添加 site.webmanifest
        const manifestContent = generateWebManifestContent(baseName);
        zip.file("site.webmanifest", manifestContent);

        // 4. 生成配套的 HTML 引入代码
        const htmlSnippet = generateHtmlHeadSnippet(baseName);
        zip.file("html_head_tags.html", htmlSnippet);

        // 打包并触发浏览器下载
        const zipBlob = await zip.generateAsync({ type: "blob" });
        saveAs(zipBlob, `favicon-package-${baseName}.zip`);
        message.success(`全套 Web Favicon 资源包打包完成并已下载 (${this.formatSize(zipBlob.size)})！`);
      } catch (err) {
        message.error("打包 ZIP 失败: " + err.message);
      } finally {
        this.isZipping = false;
      }
    },

    // 复制 HTML 代码
    async copyHtmlCode() {
      try {
        await navigator.clipboard.writeText(this.htmlSnippet);
        message.success("HTML 代码已成功复制到剪贴板！");
      } catch (err) {
        message.info("复制失败，请手动选取复制");
      }
    },

    // ================= 批量模式逻辑 =================
    async handleBatchUpload(file) {
      const task = {
        id: Date.now() + Math.random().toString(36).substr(2, 6),
        file,
        name: file.name,
        origSize: file.size,
        origSizeStr: this.formatSize(file.size),
        preview: "",
        status: "processing",
        icoBlob: null,
        icoSize: 0,
      };
      this.batchList.push(task);

      // 异步执行处理
      try {
        const loaded = await loadImageFromFile(file);
        task.preview = loaded.objectUrl;

        // 批量默认转换为标准的 16+32+48 多分辨率 ICO
        const result = await generateIcoFromImage(loaded.img, [16, 32, 48], {
          fit: "contain",
          padding: 0,
          shape: "square",
          backgroundColor: "transparent",
        });

        task.icoBlob = result.icoBlob;
        task.icoSize = result.icoBlob.size;
        task.status = "done";
      } catch (err) {
        console.error(err);
        task.status = "error";
      }

      return false;
    },

    downloadOneBatchIco(record) {
      if (!record.icoBlob) return;
      const baseName = record.name.replace(/\.[^/.]+$/, "");
      saveAs(record.icoBlob, `${baseName}-favicon.ico`);
    },

    async downloadBatchZip() {
      const doneItems = this.batchList.filter((item) => item.status === "done" && item.icoBlob);
      if (doneItems.length === 0) return;

      this.isBatchZipping = true;
      try {
        const zip = new JSZip();
        for (const item of doneItems) {
          const baseName = item.name.replace(/\.[^/.]+$/, "");
          zip.file(`${baseName}-favicon.ico`, item.icoBlob);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        saveAs(blob, `batch-favicons-${Date.now()}.zip`);
        message.success(`已打包导出 ${doneItems.length} 个 ICO 图标文件！`);
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
.ico-converter-container {
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
}

/* 主卡片 */
.main-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  padding: 8px 12px 24px;
}

/* 单图上传空状态 */
.upload-box-wrapper {
  padding: 30px 0;
  outline: none;
}

.main-uploader {
  background: #fafafa;
  border: 2px dashed #d9d9d9;
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-uploader:hover {
  border-color: #1677ff;
  background: #f0f7ff;
}

.upload-inner {
  padding: 50px 20px;
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
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}

/* 编辑器双栏布局：严谨定义左列固定 370px，右列自适应且 minmax(0, 1fr) 防止撑大 */
.editor-layout {
  display: grid;
  grid-template-columns: 370px minmax(0, 1fr);
  gap: 24px;
  margin-top: 12px;
  align-items: start;
}

@media (max-width: 992px) {
  .editor-layout {
    grid-template-columns: 1fr;
  }
}

/* 控制面板 */
.control-panel {
  background: #fbfbfb;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 18px;
  min-width: 0;
  box-sizing: border-box;
}

.panel-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 12px;
}

.source-info-bar {
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 14px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.source-info-bar .file-name {
  color: #1d39c4;
  font-weight: 500;
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-info-bar .file-meta {
  color: #597ef7;
}

.control-item {
  margin-bottom: 16px;
}

.control-item.no-margin-bottom {
  margin-bottom: 0;
}

.item-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 500;
  color: #595959;
  margin-bottom: 8px;
}

.tip-icon {
  color: #bfbfbf;
  margin-left: 4px;
  cursor: help;
}

.val-text {
  color: #1677ff;
  font-weight: 600;
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

/* 背景色选择器 */
.bg-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-preset-btn {
  flex: 1;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.color-preset-btn.active {
  border-color: #1677ff;
  color: #1677ff;
  background: #e6f4ff;
  font-weight: 600;
}

.color-input {
  width: 32px;
  height: 28px;
  padding: 0;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  background: none;
}

/* 分辨率快捷键与摘要 */
.size-shortcuts {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.shortcut-pill {
  flex: 1;
  background: #ffffff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 3px 2px;
  font-size: 11px;
  color: #595959;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.shortcut-pill:hover {
  border-color: #1677ff;
  color: #1677ff;
  background: #f0f7ff;
}

.selected-summary-bar {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  color: #389e0d;
}

.est-inline-pill strong {
  color: #1677ff;
}

/* 优雅 3 列网格卡片 (彻底解决宽度溢出) */
.size-chip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
}

.size-chip-card {
  background: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 8px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 52px;
  box-sizing: border-box;
}

.size-chip-card:hover {
  border-color: #91caff;
  background: #fafafa;
}

.size-chip-card.selected {
  border-color: #1677ff;
  background: #f0f7ff;
  box-shadow: 0 0 0 1px #1677ff inset;
}

.chip-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chip-size-title {
  font-size: 13px;
  font-weight: 700;
  color: #262626;
  font-family: SFMono-Regular, Consolas, monospace;
}

.chip-check-icon {
  font-size: 14px;
  line-height: 1;
  color: #1677ff;
  display: flex;
  align-items: center;
}

.uncheck-circle {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid #d9d9d9;
}

.chip-bottom {
  display: flex;
  justify-content: flex-start;
  margin-top: 4px;
}

.chip-byte-val {
  font-size: 11px;
  color: #1677ff;
  font-weight: 600;
  font-family: SFMono-Regular, Consolas, monospace;
}

.chip-byte-val.placeholder {
  color: #bfbfbf;
}

/* 右侧预览区 */
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  box-sizing: border-box;
}

/* 浏览器标签页仿真 */
.browser-mockup-wrapper {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.mockup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.mockup-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  display: flex;
  align-items: center;
  gap: 6px;
}

.mockup-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-label {
  font-size: 12px;
  color: #8c8c8c;
}

/* Chrome 外壳 */
.chrome-window {
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #d0d0d0;
  transition: all 0.3s;
}

.chrome-window.light {
  background: #dee1e6;
}

.chrome-window.dark {
  background: #202124;
  border-color: #3c4043;
}

.chrome-tabbar {
  display: flex;
  padding: 8px 10px 0;
  gap: 6px;
}

.chrome-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  border-radius: 8px 8px 0 0;
  max-width: 220px;
  font-size: 12px;
  user-select: none;
  position: relative;
}

.chrome-window.light .chrome-tab.active {
  background: #ffffff;
  color: #3c4043;
  box-shadow: 0 -1px 4px rgba(0, 0, 0, 0.05);
}

.chrome-window.light .chrome-tab.inactive {
  background: transparent;
  color: #5f6368;
}

.chrome-window.dark .chrome-tab.active {
  background: #292a2d;
  color: #e8eaed;
}

.chrome-window.dark .chrome-tab.inactive {
  background: transparent;
  color: #9aa0a6;
}

.tab-favicon img {
  width: 16px;
  height: 16px;
  display: block;
  object-fit: contain;
}

.tab-favicon-placeholder {
  width: 14px;
  height: 14px;
  background: #999;
  border-radius: 50%;
  display: inline-block;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  outline: none;
}

.tab-close {
  font-size: 14px;
  line-height: 1;
  color: #888;
  border-radius: 50%;
  padding: 1px 3px;
}

.chrome-address-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  font-size: 12px;
}

.chrome-window.light .chrome-address-bar {
  background: #ffffff;
  color: #5f6368;
  border-top: 1px solid #f1f3f4;
}

.chrome-window.dark .chrome-address-bar {
  background: #292a2d;
  color: #9aa0a6;
  border-top: 1px solid #3c4043;
}

.site-url {
  font-family: monospace;
}

/* 多尺寸展示卡片 */
.sizes-grid-wrapper {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
  box-sizing: border-box;
}

.grid-header {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 14px;
}

.hint-tip {
  font-size: 12px;
  color: #8c8c8c;
  font-weight: normal;
}

.sizes-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.size-card {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  background: #fafafa;
  width: 104px;
  display: flex;
  flex-direction: column;
}

.card-thumb-bg {
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(45deg, #eee 25%, transparent 25%),
    linear-gradient(-45deg, #eee 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #eee 75%),
    linear-gradient(-45deg, transparent 75%, #eee 75%);
  background-size: 12px 12px;
  background-position: 0 0, 0 6px, 6px -6px, -6px 0px;
}

.thumb-img {
  image-rendering: -webkit-optimize-contrast;
  display: block;
}

.card-footer {
  padding: 6px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
}

.s-meta {
  display: flex;
  flex-direction: column;
}

.s-name {
  font-size: 11px;
  font-weight: 600;
  color: #262626;
}

.s-bytes {
  font-size: 10px;
  color: #8c8c8c;
  font-family: monospace;
}

/* 📊 文件体积预估看板 */
.size-estimator-card {
  background: linear-gradient(135deg, #f9fbff 0%, #f6faff 100%);
  border: 1px solid #d6e4ff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.04);
  box-sizing: border-box;
}

.estimator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 8px;
}

.est-title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.est-title {
  font-size: 14px;
  font-weight: 700;
  color: #1d39c4;
  display: flex;
  align-items: center;
  gap: 6px;
}

.est-note {
  font-size: 12px;
  color: #8c8c8c;
}

.health-tag {
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}

.est-metrics-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 12px;
  margin-bottom: 14px;
}

@media (max-width: 768px) {
  .est-metrics-grid {
    grid-template-columns: 1fr;
  }
}

.metric-item {
  background: #ffffff;
  border: 1px solid #e6f4ff;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
}

.metric-item.highlight {
  border-color: #91caff;
  background: #f0f7ff;
}

.metric-label {
  font-size: 12px;
  color: #595959;
  margin-bottom: 4px;
}

.metric-val-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.metric-val {
  font-size: 18px;
  font-weight: 700;
  color: #262626;
  font-family: SFMono-Regular, Consolas, monospace;
}

.metric-val.text-primary {
  color: #1677ff;
}

.metric-badge {
  font-size: 11px;
  background: #f6ffed;
  color: #52c41a;
  border: 1px solid #b7eb8f;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 600;
}

.metric-sub {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 4px;
}

/* 体积分布比例条 */
.size-breakdown-bar-wrapper {
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1px dashed #d6e4ff;
}

.breakdown-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #595959;
  margin-bottom: 6px;
  flex-wrap: wrap;
  gap: 6px;
}

.detail-tags-wrapper {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.detail-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #595959;
}

.detail-tag .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.bar-track {
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #e8e8e8;
  display: flex;
  width: 100%;
}

.bar-segment {
  height: 100%;
  transition: width 0.3s ease;
}

/* 导出操作区 */
.export-actions-bar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.buttons-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.main-download-btn {
  flex: 1.2;
  min-width: 280px;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  background: #1677ff;
}

.zip-download-btn {
  flex: 1;
  min-width: 240px;
  height: 48px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  border-color: #52c41a;
  color: #52c41a;
}

.zip-download-btn:hover {
  border-color: #73d13d;
  color: #73d13d;
}

/* 代码段容器 */
.code-snippet-box {
  background: #282c34;
  border-radius: 10px;
  overflow: hidden;
}

.snippet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #21252b;
  padding: 8px 14px;
  color: #abb2bf;
  font-size: 12px;
}

.code-pre {
  margin: 0;
  padding: 12px 14px;
  color: #98c379;
  font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 12px;
  line-height: 1.5;
  overflow-x: auto;
}

/* 批量模式 */
.batch-mode-wrapper {
  padding: 16px 0;
}

.batch-upload-area {
  margin-bottom: 20px;
}

.batch-list-wrapper {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 16px;
}

.batch-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.batch-stat {
  font-size: 14px;
  color: #595959;
}

.batch-saved-text {
  margin-left: 10px;
  color: #52c41a;
  font-weight: 600;
}

.batch-thumb-cell img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid #f0f0f0;
}
</style>
