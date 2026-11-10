<template>
  <div class="compress-container">
    <div class="header">
      <div class="title-row">
        <h1>全能图片压缩 Pro</h1>
        <span class="safe-badge"><safety-certificate-outlined /> 100% 纯本地高精度压缩 · 敏感图片绝不上云</span>
      </div>
      <p class="subtitle">智能 WebP 引擎 · 突破 100KB 极限压缩 · 画质与体积的完美平衡</p>
    </div>

    <!-- 顶部紧凑配置面板 -->
    <div class="main-card">
      <!-- 顶级模式切换：智能 vs 自定义 -->
      <a-tabs v-model:activeKey="mainMode" type="card" centered class="compact-tabs">
        <!-- ================= 模式 1: 智能模式 (一键操作) ================= -->
        <a-tab-pane key="smart" tab="🚀 智能模式">
          <div class="smart-panel">
            <div class="smart-options">
              <a-radio-group v-model:value="smartLevel" button-style="solid">
                <a-radio-button value="small"> <compress-outlined /> 体积优先 (WebP) </a-radio-button>
                <a-radio-button value="balanced"> <check-outlined /> 平衡模式 (推荐) </a-radio-button>
                <a-radio-button value="high"> <star-outlined /> 画质优先 </a-radio-button>
              </a-radio-group>
            </div>

            <!-- 智能模式的说明文案 (紧凑小字) -->
            <div class="smart-desc">
              <div v-if="smartLevel === 'small'" class="desc-item">
                <span class="tag tag-blue">极致压缩</span>
                限制长边 1280px，采用高压缩 WebP，体积超轻 (普遍低于 100KB)，适合网络传输与快速加载。
              </div>
              <div v-if="smartLevel === 'balanced'" class="desc-item">
                <span class="tag tag-green">最佳平衡</span>
                限制 1080P (1920px)，采用高效 WebP 编码，肉眼画质与原图无异，体积减少 60% ~ 80%！
              </div>
              <div v-if="smartLevel === 'high'" class="desc-item">
                <span class="tag tag-purple">原画质</span>
                保持原分辨率，高码率无损精细量化，移除冗余元数据，适合设计打印与高清存档。
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- ================= 模式 2: 自定义模式 (专业微调) ================= -->
        <a-tab-pane key="custom" tab="🛠 自定义模式">
          <div class="custom-panel">
            <!-- 二级切换：按清晰度 vs 按大小 -->
            <div class="sub-mode-switch">
              <span class="label">压缩目标：</span>
              <a-radio-group v-model:value="customType" button-style="solid" size="small">
                <a-radio-button value="size">
                  <thunderbolt-outlined /> 指定目标大小 (如 ≤ 100KB)
                </a-radio-button>
                <a-radio-button value="quality">指定清晰度 (%)</a-radio-button>
              </a-radio-group>
            </div>

            <!-- A. 指定大小 (限制体积) -->
            <div v-if="customType === 'size'" class="config-section">
              <div class="config-row size-input-row">
                <span class="label">目标大小：</span>
                <a-input-number v-model:value="targetKB" :min="10" :step="10" style="width: 140px">
                  <template #addonAfter>KB 以内</template>
                </a-input-number>

                <!-- 快捷预设按钮 -->
                <div class="preset-pills-row">
                  <span class="preset-label">快捷：</span>
                  <span
                    v-for="item in presetSizes"
                    :key="item.value"
                    class="preset-pill"
                    :class="{ active: targetKB === item.value, highlight: item.highlight }"
                    @click="targetKB = item.value"
                  >
                    {{ item.label }}
                  </span>
                </div>
              </div>
            </div>

            <!-- B. 指定清晰度 (不限制大小) -->
            <div v-if="customType === 'quality'" class="config-section">
              <div class="config-row">
                <span class="label">清晰度：</span>
                <a-slider v-model:value="customQuality" :min="1" :max="100" style="flex: 1; max-width: 260px" />
                <a-input-number v-model:value="customQuality" :min="1" :max="100" size="small" style="width: 80px; margin-left: 8px">
                  <template #addonAfter>%</template>
                </a-input-number>
              </div>
            </div>

            <!-- 公共高级选项 (紧凑排布) -->
            <div class="advanced-options">
              <div class="config-row">
                <span class="label">输出格式：</span>
                <a-radio-group v-model:value="outputFormat" button-style="solid" size="small">
                  <a-radio-button value="image/webp">
                    <span class="badge-rec">推荐</span> WebP (体积最小 · 画质最佳)
                  </a-radio-button>
                  <a-radio-button value="original">原格式</a-radio-button>
                  <a-radio-button value="image/jpeg">JPG</a-radio-button>
                  <a-radio-button value="image/png">PNG</a-radio-button>
                </a-radio-group>
                <span class="format-inline-hint">
                  💡 WebP 比 JPG 节省约 35%、比 PNG 节省约 70% 且支持透明度。压到 100KB 以下强烈建议选 WebP！
                </span>
              </div>

              <div class="config-row inline-row">
                <div class="inline-item">
                  <span class="label">分辨率：</span>
                  <a-select v-model:value="customResolution" size="small" style="width: 200px">
                    <a-select-option value="original">智能自适应 / 保持原分辨率</a-select-option>
                    <a-select-option :value="1920">限制 1920px (1080P 高清)</a-select-option>
                    <a-select-option :value="1440">限制 1440px (100KB 完美平衡)</a-select-option>
                    <a-select-option :value="1280">限制 1280px (720P 网页)</a-select-option>
                    <a-select-option :value="800">限制 800px (移动端/徽标)</a-select-option>
                  </a-select>
                </div>

                <!-- PNG 智能转码开关 (当指定小大小时) -->
                <div v-if="customType === 'size' && outputFormat === 'original'" class="inline-item">
                  <a-checkbox v-model:checked="autoWebpForSize">
                    <span class="sub-check-text">原图为 PNG 时自动转 WebP (完好保留透明背景并突破 100KB 瓶颈)</span>
                  </a-checkbox>
                </div>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 全局底部选项 (紧凑排布) -->
      <div class="global-footer">
        <a-checkbox v-model:checked="removeWatermark">
          <span class="highlight-option">自动平滑移除右下角水印 (AI生成图专用)</span>
        </a-checkbox>
        <a-tooltip title="采用双向纹理采样无损修复右下角水印或 Logo">
          <question-circle-outlined style="color: #999; margin-left: 4px" />
        </a-tooltip>
      </div>
    </div>

    <!-- 超大拖拽上传区域 -->
    <div class="upload-area" :class="{ 'upload-area-compact': fileList.length > 0 }">
      <a-upload-dragger
        name="file"
        :multiple="true"
        :showUploadList="false"
        :before-upload="handleUpload"
        accept="image/*"
        class="custom-dragger"
      >
        <!-- 状态 1：尚未添加图片 -->
        <template v-if="fileList.length === 0">
          <div class="dragger-full-box">
            <p class="ant-upload-drag-icon"><inbox-outlined /></p>
            <p class="ant-upload-text">点击或将单张 / 批量图片拖拽至此区域</p>
            <p class="ant-upload-hint">
              全屏宽幅超大感应 · 支持 JPG、PNG、WebP、BMP、SVG 等 · 100% 本地浏览器高精处理 · 绝不上云泄露隐私
            </p>
            <div class="upload-pills-row">
              <span class="u-pill">⚡ 多核并发高精处理</span>
              <span class="u-pill">💎 突破 100KB 极限体积</span>
              <span class="u-pill">🌈 原画级色彩还原</span>
              <span class="u-pill">📦 一键打包 ZIP 下载</span>
            </div>
          </div>
        </template>

        <!-- 状态 2：已有图片，转为宽幅扁平追加栏 -->
        <template v-else>
          <div class="dragger-compact-box">
            <inbox-outlined class="compact-icon" />
            <span class="compact-title">拖入更多图片或点击继续追加批量压缩</span>
            <span class="compact-count">(已成功导入 {{ fileList.length }} 张图片)</span>
          </div>
        </template>
      </a-upload-dragger>
    </div>

    <!-- 结果列表 -->
    <div class="file-list" v-if="fileList.length > 0">
      <!-- 吸顶控制栏 -->
      <div class="list-header">
        <div class="lh-left">
          <span class="status-text">
            处理进度: <b>{{ finishedCount }}</b> / {{ fileList.length }}
          </span>
          <span v-if="totalSaved > 0" class="saved-tag">
            累计节省流量: <b>{{ formatSize(totalSaved) }}</b>
          </span>
          <span v-if="processingCount > 0" class="processing-hint">
            <loading-outlined /> {{ processingCount }} 个任务并发压缩中...
          </span>
        </div>
        <div class="lh-right">
          <a-button type="primary" :disabled="finishedCount === 0" @click="downloadAll" class="download-all-btn">
            <template #icon><download-outlined /></template> 打包下载全部 (ZIP)
          </a-button>
          <a-button type="text" danger @click="clearList" style="margin-left: 8px">清空列表</a-button>
        </div>
      </div>

      <!-- 表格：固定表头，限制纵向滚动高度 -->
      <div class="table-scroll-wrapper">
        <a-table
          :columns="columns"
          :data-source="fileList"
          :pagination="paginationConfig"
          :scroll="{ x: 860, y: 520 }"
          row-key="id"
          size="small"
          bordered
          class="compress-table"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'thumbnail'">
              <img :src="record.preview" class="table-thumb" @click="openCompareModal(record)" title="点击查看画质对比" />
            </template>

            <template v-if="column.key === 'originalInfo'">
              <div class="info-cell">
                <span class="size-text">{{ record.originalSizeStr }}</span>
                <span class="dim-text" v-if="record.originalWidth">
                  {{ record.originalWidth }} × {{ record.originalHeight }}
                </span>
              </div>
            </template>

            <template v-if="column.key === 'status'">
              <a-tag v-if="record.status === 'processing'" color="blue"><loading-outlined /> 平衡压缩中...</a-tag>
              <a-tag v-else-if="record.status === 'done'" color="success">压缩完成</a-tag>
              <a-tag v-else-if="record.status === 'error'" color="error">处理失败</a-tag>
              <a-tag v-else color="default">排队等待中</a-tag>
            </template>

            <template v-if="column.key === 'compressedInfo'">
              <div v-if="record.status === 'done'" class="info-cell">
                <div class="result-size-line">
                  <span class="compressed-size-val">{{ formatSize(record.compressedSize) }}</span>
                  <a-tag color="cyan" class="format-tag">{{ formatMimeName(record.actualFormat) }}</a-tag>
                </div>
                <span class="dim-text" v-if="record.compressedWidth">
                  {{ record.compressedWidth }} × {{ record.compressedHeight }}
                </span>
              </div>
              <span v-else>-</span>
            </template>

            <template v-if="column.key === 'compressRate'">
              <div v-if="record.status === 'done'">
                <div :class="record.compressRate > 0 ? 'green-text' : 'red-text'">
                  {{ record.compressRate > 0 ? "-" : "+" }}{{ Math.abs(record.compressRate) }}%
                </div>
              </div>
              <span v-else>-</span>
            </template>

            <template v-if="column.key === 'action'">
              <a-space size="small">
                <a-button
                  type="link"
                  size="small"
                  :disabled="record.status !== 'done'"
                  @click="openCompareModal(record)"
                >
                  <eye-outlined /> 画质对比
                </a-button>
                <a-button
                  type="primary"
                  size="small"
                  ghost
                  :disabled="record.status !== 'done'"
                  @click="downloadOne(record)"
                >
                  <download-outlined /> 下载
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <!-- 画质细节与显示效果对比弹窗 -->
    <a-modal
      v-model:open="compareModalVisible"
      title="🔍 画质细节与显示效果对比"
      width="960px"
      :footer="null"
      centered
      class="compare-modal"
    >
      <div v-if="currentCompareItem" class="compare-container">
        <!-- 顶部指标数据对比栏 -->
        <div class="metrics-comparison-bar">
          <div class="metric-card original-card">
            <div class="m-tag">原图 (Original)</div>
            <div class="m-size">{{ currentCompareItem.originalSizeStr }}</div>
            <div class="m-sub">{{ currentCompareItem.originalWidth }} × {{ currentCompareItem.originalHeight }} px</div>
          </div>

          <div class="metric-arrow">
            <span class="rate-badge">
              节省 {{ currentCompareItem.compressRate }}% 体积
            </span>
            <arrow-right-outlined style="font-size: 22px; color: #1677ff" />
          </div>

          <div class="metric-card compressed-card">
            <div class="m-tag m-tag-success">
              压缩后 ({{ formatMimeName(currentCompareItem.actualFormat) }})
            </div>
            <div class="m-size success-text">{{ formatSize(currentCompareItem.compressedSize) }}</div>
            <div class="m-sub">{{ currentCompareItem.compressedWidth }} × {{ currentCompareItem.compressedHeight }} px</div>
          </div>
        </div>

        <!-- 图像视觉对比区 (并排展示) -->
        <div class="views-grid">
          <div class="view-panel">
            <div class="panel-header">
              <span>【原图】{{ currentCompareItem.name }}</span>
              <span class="panel-meta">{{ currentCompareItem.originalSizeStr }}</span>
            </div>
            <div class="image-viewport checkerboard">
              <img :src="currentCompareItem.preview" alt="原图" class="preview-img" />
            </div>
          </div>

          <div class="view-panel">
            <div class="panel-header">
              <span>【压缩效果】显示效果无损呈现</span>
              <span class="panel-meta highlight">{{ formatSize(currentCompareItem.compressedSize) }} ({{ formatMimeName(currentCompareItem.actualFormat) }})</span>
            </div>
            <div class="image-viewport checkerboard">
              <img :src="currentCompareItem.compressedPreview" alt="压缩后" class="preview-img" />
            </div>
          </div>
        </div>

        <!-- 底部说明与操作 -->
        <div class="compare-footer">
          <div class="cf-hint">
            💡 <b>显示效果保障</b>：背景采用棋盘格透明指示；WebP 在 ≤ {{ targetKB }}KB 预算下完美兼顾了边缘清晰度与平滑色彩，无惧局部放大！
          </div>
          <a-button type="primary" size="large" @click="downloadOne(currentCompareItem)">
            <template #icon><download-outlined /></template> 下载压缩文件
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script>
import {
  InboxOutlined,
  LoadingOutlined,
  CompressOutlined,
  CheckOutlined,
  StarOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons-vue";
import { markRaw } from "vue";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { compressImageAdaptive } from "../../utils/image/adaptiveCompressor.js";

export default {
  name: "FullFeatureCompressor",
  components: {
    InboxOutlined,
    LoadingOutlined,
    CompressOutlined,
    CheckOutlined,
    StarOutlined,
    QuestionCircleOutlined,
    DownloadOutlined,
    EyeOutlined,
    ArrowRightOutlined,
    ThunderboltOutlined,
    SafetyCertificateOutlined,
  },
  data() {
    return {
      // 顶级 Tab
      mainMode: "smart", // 'smart' | 'custom'

      // 智能模式参数
      smartLevel: "balanced", // small, balanced, high

      // 自定义模式参数
      customType: "size", // quality, size
      customQuality: 85,
      targetKB: 100, // 默认 100KB
      customResolution: "original",
      outputFormat: "image/webp",
      autoWebpForSize: true,

      // 快捷预设目标大小
      presetSizes: [
        { label: "30 KB (小头像)", value: 30 },
        { label: "50 KB (网络图标)", value: 50 },
        { label: "100 KB (★ 推荐)", value: 100, highlight: true },
        { label: "200 KB (高清社交)", value: 200 },
        { label: "500 KB (保真大图)", value: 500 },
        { label: "1 MB (微损原画)", value: 1024 },
      ],

      // 全局参数
      removeWatermark: false,

      // 对比弹窗状态
      compareModalVisible: false,
      currentCompareItem: null,

      // 队列与数据
      queue: [],
      fileList: [],
      processingCount: 0,
      maxConcurrent: 4,

      // 表格分页配置
      paginationConfig: {
        current: 1,
        pageSize: 20,
        showSizeChanger: true,
        pageSizeOptions: ["10", "20", "50", "100"],
        showTotal: (total) => `共 ${total} 张图片`,
        size: "small",
        onChange: (page, pageSize) => {
          this.paginationConfig.current = page;
          this.paginationConfig.pageSize = pageSize;
        },
      },

      columns: [
        { title: "缩略图", key: "thumbnail", width: 68, align: "center" },
        { title: "文件名", dataIndex: "name", key: "name", ellipsis: true },
        { title: "原始参数", key: "originalInfo", width: 140 },
        { title: "状态", key: "status", width: 120 },
        { title: "压缩结果", key: "compressedInfo", width: 160 },
        { title: "体积压缩率", key: "compressRate", width: 100, align: "center" },
        { title: "操作", key: "action", width: 160, align: "center" },
      ],
    };
  },
  computed: {
    finishedCount() {
      return this.fileList.filter((f) => f.status === "done").length;
    },
    totalSaved() {
      return this.fileList.reduce((acc, cur) => {
        return cur.status === "done" ? acc + (cur.originalSize - cur.compressedSize) : acc;
      }, 0);
    },
  },
  methods: {
    formatSize(bytes) {
      if (!bytes || bytes <= 0) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    formatMimeName(mime) {
      if (!mime) return "WEBP";
      if (mime.includes("webp")) return "WEBP";
      if (mime.includes("png")) return "PNG";
      if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
      return mime.toUpperCase();
    },

    handleUpload(file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const previewUrl = e.target.result;
        const configSnapshot = this.generateConfig();

        // 异步预先读取原图自然尺寸
        const probeImg = new Image();
        probeImg.src = previewUrl;
        probeImg.onload = () => {
          const task = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            rawFile: markRaw(file),
            name: file.name,
            originalSize: file.size,
            originalSizeStr: this.formatSize(file.size),
            originalWidth: probeImg.naturalWidth,
            originalHeight: probeImg.naturalHeight,
            preview: previewUrl,
            status: "pending",
            compressedBlob: null,
            compressedPreview: "",
            compressedSize: 0,
            compressedWidth: 0,
            compressedHeight: 0,
            compressRate: 0,
            actualFormat: "",
            qualityUsed: 0,
            config: configSnapshot,
          };

          this.fileList.push(task);
          this.queue.push(task.id);
          this.processQueue();
        };
      };
      return false;
    },

    generateConfig() {
      return {
        mainMode: this.mainMode,
        smartLevel: this.smartLevel,
        customType: this.customType,
        customQuality: this.customQuality,
        targetKB: this.targetKB,
        customResolution: this.customResolution,
        outputFormat: this.outputFormat,
        removeWatermark: this.removeWatermark,
        autoWebpForSize: this.autoWebpForSize,
      };
    },

    async processQueue() {
      if (this.processingCount >= this.maxConcurrent || this.queue.length === 0) return;

      const taskId = this.queue.shift();
      const task = this.fileList.find((t) => t.id === taskId);
      if (!task) return this.processQueue();

      this.processingCount++;
      task.status = "processing";

      try {
        const result = await compressImageAdaptive(task.rawFile, task.config);

        task.compressedBlob = markRaw(result.blob);
        task.compressedSize = result.blob.size;
        task.compressedWidth = result.width;
        task.compressedHeight = result.height;
        task.originalWidth = result.originalWidth || task.originalWidth;
        task.originalHeight = result.originalHeight || task.originalHeight;
        task.actualFormat = result.actualFormat;
        task.qualityUsed = result.qualityUsed;

        task.compressedPreview = URL.createObjectURL(result.blob);

        const rate = ((task.originalSize - result.blob.size) / task.originalSize) * 100;
        task.compressRate = rate.toFixed(1);
        task.status = "done";
      } catch (err) {
        console.error("Image compression error:", err);
        task.status = "error";
      } finally {
        this.processingCount--;
        this.$nextTick(() => this.processQueue());
      }
    },

    openCompareModal(record) {
      if (record.status !== "done") return;
      this.currentCompareItem = record;
      this.compareModalVisible = true;
    },

    downloadOne(record) {
      let ext = "webp";
      const type = record.actualFormat || record.compressedBlob?.type;
      if (type === "image/jpeg") ext = "jpg";
      else if (type === "image/png") ext = "png";
      else if (type === "image/webp") ext = "webp";

      const baseName = record.name.replace(/\.[^/.]+$/, "");
      saveAs(record.compressedBlob, `${baseName}.${ext}`);
    },

    async downloadAll() {
      const zip = new JSZip();
      this.fileList.forEach((f) => {
        if (f.status === "done" && f.compressedBlob) {
          let ext = "webp";
          const type = f.actualFormat || f.compressedBlob?.type;
          if (type === "image/jpeg") ext = "jpg";
          else if (type === "image/png") ext = "png";
          else if (type === "image/webp") ext = "webp";

          const baseName = f.name.replace(/\.[^/.]+$/, "");
          zip.file(`${baseName}.${ext}`, f.compressedBlob);
        }
      });
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "compressed_images.zip");
    },

    clearList() {
      this.fileList.forEach((f) => {
        if (f.compressedPreview) {
          URL.revokeObjectURL(f.compressedPreview);
        }
      });
      this.fileList = [];
      this.queue = [];
      this.processingCount = 0;
      this.paginationConfig.current = 1;
    },
  },
};
</script>

<style lang="scss" scoped>
.compress-container {
  max-width: 1360px;
  width: 95%;
  margin: 16px auto 36px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  .header {
    text-align: center;
    margin-bottom: 16px;

    .title-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 4px;

      h1 {
        color: #0f172a;
        margin: 0;
        font-size: 21px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .safe-badge {
        font-size: 11px;
        color: #059669;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
    }

    .subtitle {
      color: #64748b;
      font-size: 12px;
      margin: 0;
    }
  }

  // 顶部配置面板
  .main-card {
    background: #ffffff;
    padding: 12px 18px;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
    border: 1px solid #e2e8f0;
    margin-bottom: 14px;

    .compact-tabs :deep(.ant-tabs-nav) {
      margin-bottom: 8px;
    }

    .compact-tabs :deep(.ant-tabs-tab) {
      padding: 6px 14px;
      font-size: 13px;
    }

    // 智能模式样式
    .smart-panel {
      padding: 4px 0;
      text-align: center;

      .smart-options {
        margin-bottom: 8px;
      }

      .smart-desc {
        background: #f8fafc;
        padding: 8px 14px;
        border-radius: 6px;
        display: inline-block;
        text-align: left;
        max-width: 680px;
        border: 1px solid #f1f5f9;

        .desc-item {
          color: #475569;
          font-size: 12px;
          line-height: 1.5;

          .tag {
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-right: 6px;
          }
          .tag-blue {
            background: #e0f2fe;
            color: #0284c7;
          }
          .tag-green {
            background: #dcfce7;
            color: #15803d;
          }
          .tag-purple {
            background: #f3e8ff;
            color: #7e22ce;
          }
        }
      }
    }

    // 自定义模式样式
    .custom-panel {
      padding: 2px 4px;

      .sub-mode-switch {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;

        .label {
          font-weight: 600;
          color: #334155;
          font-size: 12px;
        }
      }

      .config-section {
        margin: 8px 0;

        .config-row {
          display: flex;
          align-items: center;
          gap: 8px;

          .label {
            width: 72px;
            text-align: right;
            font-weight: 600;
            color: #475569;
            font-size: 12px;
          }

          .hint {
            font-size: 11px;
            color: #64748b;
          }
        }

        .size-input-row {
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .preset-pills-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          margin-left: 10px;

          .preset-label {
            font-size: 11px;
            color: #64748b;
            font-weight: 500;
          }

          .preset-pill {
            font-size: 11px;
            padding: 2px 8px;
            border-radius: 12px;
            background: #f1f5f9;
            color: #475569;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            user-select: none;
            transition: all 0.15s ease;

            &:hover {
              background: #e2e8f0;
              color: #0f172a;
            }

            &.active {
              background: #2563eb;
              color: #ffffff;
              border-color: #2563eb;
              font-weight: 600;
            }

            &.highlight {
              border-color: #bfdbfe;
              background: #eff6ff;
              color: #1d4ed8;
              font-weight: 600;

              &.active {
                background: #2563eb;
                color: #ffffff;
              }
            }
          }
        }

        .engine-tip-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 6px 12px;
          border-radius: 6px;
          margin-left: 80px;
          margin-top: 6px;
          font-size: 11px;
          color: #166534;
          line-height: 1.4;

          .et-icon {
            font-size: 15px;
            color: #16a34a;
            flex-shrink: 0;
          }

          .et-content {
            flex: 1;
            strong {
              color: #15803d;
            }
          }
        }
      }

      .advanced-options {
        background: #f8fafc;
        padding: 10px 14px;
        border-radius: 8px;
        margin-top: 8px;
        border: 1px solid #e2e8f0;

        .config-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;

          &:last-child {
            margin-bottom: 0;
          }

          .label {
            width: 72px;
            text-align: right;
            font-weight: 600;
            color: #475569;
            font-size: 12px;
          }
        }

        .inline-row {
          flex-wrap: wrap;
          gap: 16px;

          .inline-item {
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
        }

        .badge-rec {
          background: #fee2e2;
          color: #dc2626;
          font-size: 9px;
          font-weight: 700;
          padding: 0 4px;
          border-radius: 2px;
          margin-right: 3px;
        }

        .format-inline-hint {
          font-size: 11px;
          color: #64748b;
          margin-left: 8px;
        }

        .sub-check-text {
          font-size: 11px;
          color: #475569;
        }
      }
    }

    // 全局底部
    .global-footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #e2e8f0;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 12px;

      .highlight-option {
        font-weight: 500;
        color: #2563eb;
      }
    }
  }

  // 超大宽幅拖拽上传区域
  .upload-area {
    margin-bottom: 16px;
    transition: all 0.25s ease;

    .custom-dragger {
      background: #ffffff !important;
      border-radius: 14px !important;
      transition: all 0.2s ease-in-out;

      &:hover {
        border-color: #2563eb !important;
        background: #f0f7ff !important;
      }
    }

    :deep(.ant-upload-btn) {
      padding: 0 !important;
    }

    // 状态 1：空状态超大拖拽感应大屏
    .dragger-full-box {
      padding: 36px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      .ant-upload-drag-icon {
        font-size: 52px;
        color: #2563eb;
        margin-bottom: 12px;
        transition: transform 0.2s;
      }

      .ant-upload-text {
        font-size: 17px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 6px;
      }

      .ant-upload-hint {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 16px;
        max-width: 680px;
        line-height: 1.5;
      }

      .upload-pills-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: center;

        .u-pill {
          font-size: 11px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: 500;
        }
      }

      &:hover .ant-upload-drag-icon {
        transform: translateY(-3px) scale(1.05);
      }
    }

    // 状态 2：已有图片时的紧凑宽幅追加栏
    &.upload-area-compact {
      margin-bottom: 12px;

      .custom-dragger {
        border-width: 1.5px !important;
        border-style: dashed !important;
        border-color: #cbd5e1 !important;
        background: #f8fafc !important;

        &:hover {
          background: #eff6ff !important;
          border-color: #2563eb !important;
        }
      }

      .dragger-compact-box {
        padding: 14px 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;

        .compact-icon {
          font-size: 22px;
          color: #2563eb;
        }

        .compact-title {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        .compact-count {
          font-size: 12px;
          color: #64748b;
        }
      }
    }
  }

  // 结果列表卡片
  .file-list {
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    overflow: hidden;

    .list-header {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 10px 18px;
      background: rgba(248, 250, 252, 0.96);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;

      .lh-left {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }

      .status-text {
        font-weight: 600;
        color: #334155;
        font-size: 13px;

        b {
          color: #2563eb;
        }
      }

      .saved-tag {
        color: #15803d;
        background: #ecfdf5;
        padding: 2px 8px;
        border-radius: 10px;
        border: 1px solid #a7f3d0;
        font-size: 11px;
      }

      .processing-hint {
        font-size: 12px;
        color: #2563eb;
      }

      .download-all-btn {
        background: #2563eb;
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
      }
    }

    .table-scroll-wrapper {
      :deep(.ant-table-header) {
        background: #f8fafc;
        th {
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          background: #f8fafc !important;
          padding: 8px 12px;
        }
      }

      :deep(.ant-table-body) {
        &::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        &::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
          &:hover {
            background: #94a3b8;
          }
        }
        &::-webkit-scrollbar-track {
          background: #f8fafc;
        }
      }

      :deep(.ant-table-tbody > tr > td) {
        padding: 8px 12px;
        font-size: 12px;
      }

      :deep(.ant-pagination) {
        margin: 10px 16px;
        font-size: 12px;
      }
    }

    .table-thumb {
      width: 44px;
      height: 44px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
      cursor: pointer;
      transition: transform 0.15s ease;
      &:hover {
        transform: scale(1.08);
      }
    }

    .info-cell {
      display: flex;
      flex-direction: column;
      gap: 1px;

      .size-text {
        font-weight: 600;
        color: #0f172a;
        font-size: 12px;
      }

      .dim-text {
        font-size: 10px;
        color: #94a3b8;
        font-family: ui-monospace, monospace;
      }
    }

    .result-size-line {
      display: flex;
      align-items: center;
      gap: 6px;

      .compressed-size-val {
        font-weight: 700;
        color: #15803d;
        font-size: 13px;
        font-family: ui-monospace, monospace;
      }

      .format-tag {
        font-size: 9px;
        padding: 0 4px;
        line-height: 16px;
        margin: 0;
        font-weight: bold;
      }
    }

    .green-text {
      color: #16a34a;
      font-weight: 700;
      font-size: 12px;
    }

    .red-text {
      color: #dc2626;
      font-size: 11px;
    }
  }
}

// 对比弹窗样式
.compare-modal {
  :deep(.ant-modal-content) {
    border-radius: 14px;
    padding: 18px 22px;
  }

  .compare-container {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .metrics-comparison-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 18px;

    .metric-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 140px;

      .m-tag {
        font-size: 11px;
        color: #64748b;
        font-weight: 600;
        margin-bottom: 2px;
      }
      .m-tag-success {
        color: #15803d;
      }
      .m-size {
        font-size: 17px;
        font-weight: 800;
        color: #0f172a;
        font-family: ui-monospace, monospace;
      }
      .success-text {
        color: #16a34a;
      }
      .m-sub {
        font-size: 10px;
        color: #94a3b8;
        font-family: ui-monospace, monospace;
      }
    }

    .metric-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;

      .rate-badge {
        font-size: 11px;
        font-weight: 700;
        color: #16a34a;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        padding: 1px 8px;
        border-radius: 10px;
      }
    }
  }

  .views-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;

    .view-panel {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      flex-direction: column;

      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 12px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        font-size: 11px;
        font-weight: 600;
        color: #334155;

        .panel-meta {
          font-family: ui-monospace, monospace;
          color: #64748b;
          &.highlight {
            color: #16a34a;
            font-weight: bold;
          }
        }
      }

      .image-viewport {
        height: 320px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
        padding: 8px;

        .preview-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
          border-radius: 4px;
        }
      }
    }
  }

  .checkerboard {
    background-color: #ffffff;
    background-image: linear-gradient(45deg, #f1f5f9 25%, transparent 25%),
      linear-gradient(-45deg, #f1f5f9 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f1f5f9 75%),
      linear-gradient(-45deg, transparent 75%, #f1f5f9 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
  }

  .compare-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 10px;
    border-top: 1px solid #f1f5f9;

    .cf-hint {
      font-size: 11px;
      color: #64748b;
      max-width: 650px;
      line-height: 1.4;
    }
  }
}
</style>