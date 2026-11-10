<template>
  <div class="compress-container">
    <div class="header">
      <h1>全能图片压缩 Pro</h1>
      <p class="subtitle">智能 WebP 引擎 · 突破 100KB 极限压缩 · 画质与体积的完美平衡</p>
    </div>

    <div class="main-card">
      <!-- 顶级模式切换：智能 vs 自定义 -->
      <a-tabs v-model:activeKey="mainMode" type="card" size="large" centered>
        <!-- ================= 模式 1: 智能模式 (一键操作) ================= -->
        <a-tab-pane key="smart" tab="🚀 智能模式">
          <div class="smart-panel">
            <div class="smart-options">
              <a-radio-group v-model:value="smartLevel" button-style="solid" size="large">
                <a-radio-button value="small"> <compress-outlined /> 体积优先 (WebP) </a-radio-button>
                <a-radio-button value="balanced"> <check-outlined /> 平衡模式 (推荐) </a-radio-button>
                <a-radio-button value="high"> <star-outlined /> 画质优先 </a-radio-button>
              </a-radio-group>
            </div>

            <!-- 智能模式的说明文案 -->
            <div class="smart-desc">
              <div v-if="smartLevel === 'small'" class="desc-item">
                <span class="tag tag-blue">极致压缩</span>
                采用现代 WebP 格式，限制长边 1280px，超轻体积 (通常低于 100KB)，适合网络传输与快速加载。
              </div>
              <div v-if="smartLevel === 'balanced'" class="desc-item">
                <span class="tag tag-green">最佳平衡</span>
                采用高效 WebP 编码，限制 1080P (1920px)，肉眼画质与原图无异，体积减少 60% ~ 80%！
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
              <a-radio-group v-model:value="customType" button-style="solid">
                <a-radio-button value="quality">指定清晰度 (%)</a-radio-button>
                <a-radio-button value="size">
                  <thunderbolt-outlined /> 指定目标大小 (如 ≤ 100KB)
                </a-radio-button>
              </a-radio-group>
            </div>

            <a-divider style="margin: 15px 0" />

            <!-- A. 指定清晰度 (不限制大小) -->
            <div v-if="customType === 'quality'" class="config-section">
              <div class="config-row">
                <span class="label">清晰度：</span>
                <a-slider v-model:value="customQuality" :min="1" :max="100" style="flex: 1; max-width: 320px" />
                <a-input-number v-model:value="customQuality" :min="1" :max="100" style="width: 100px; margin-left: 10px">
                  <template #addonAfter>%</template>
                </a-input-number>
              </div>
            </div>

            <!-- B. 指定大小 (限制体积) -->
            <div v-if="customType === 'size'" class="config-section">
              <div class="config-row size-input-row">
                <span class="label">希望大小：</span>
                <a-input-number v-model:value="targetKB" :min="10" :step="10" size="large" style="width: 160px">
                  <template #addonAfter>KB 以内</template>
                </a-input-number>
                <span class="hint">严格控制在指定数值以内，自适应最大化保留画质</span>
              </div>

              <!-- 快捷预设按钮 -->
              <div class="preset-pills-row">
                <span class="preset-label">快捷预设：</span>
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

              <!-- 算法保障提示 Banner -->
              <div class="engine-tip-banner">
                <div class="et-icon"><thunderbolt-outlined /></div>
                <div class="et-content">
                  <div class="et-title">自适应双维度平衡算法已激活</div>
                  <div class="et-desc">
                    通过 WebP 高压缩率协同动态分辨率调节，确保输出必定 <strong>≤ {{ targetKB }} KB</strong>。
                    即便针对原图几兆、几十兆的超大图片，也会智能平衡长宽与色彩码率，<strong>彻底解决 JPG / PNG 压不到 100KB 或严重失真马赛克的问题</strong>！
                  </div>
                </div>
              </div>
            </div>

            <!-- 公共高级选项 -->
            <div class="advanced-options">
              <div class="config-row">
                <span class="label">输出格式：</span>
                <a-radio-group v-model:value="outputFormat" button-style="solid">
                  <a-radio-button value="image/webp">
                    <span class="badge-rec">强烈推荐</span> WebP (体积最小 · 画质最佳)
                  </a-radio-button>
                  <a-radio-button value="original">原格式</a-radio-button>
                  <a-radio-button value="image/jpeg">JPG</a-radio-button>
                  <a-radio-button value="image/png">PNG</a-radio-button>
                </a-radio-group>
              </div>
              <div class="format-hint">
                💡 <b>格式建议</b>：现代浏览器 100% 完整支持 WebP 格式。在相同清晰度下，WebP 比 JPG 节省约 35%、比 PNG 节省约 70% 体积，并原生支持透明通道。若需严格压到 100KB 以下，强烈建议使用 WebP！
              </div>

              <div class="config-row" style="margin-top: 12px">
                <span class="label">分辨率：</span>
                <a-select v-model:value="customResolution" style="width: 220px">
                  <a-select-option value="original">智能自适应 / 保持原分辨率</a-select-option>
                  <a-select-option :value="1920">限制 1920px (1080P 高清)</a-select-option>
                  <a-select-option :value="1440">限制 1440px (适合 100KB 完美画质)</a-select-option>
                  <a-select-option :value="1280">限制 1280px (720P 网页)</a-select-option>
                  <a-select-option :value="800">限制 800px (移动端/徽标)</a-select-option>
                </a-select>
              </div>

              <!-- PNG 智能转码开关 (当指定小大小时) -->
              <div v-if="customType === 'size' && outputFormat === 'original'" class="config-row sub-checkbox-row">
                <a-checkbox v-model:checked="autoWebpForSize">
                  <span>小体积模式下若原图为 PNG，自动采用 WebP 突破压缩瓶颈 (完好保留透明背景)</span>
                </a-checkbox>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 全局底部选项 (无论哪个模式都生效) -->
      <div class="global-footer">
        <a-checkbox v-model:checked="removeWatermark">
          <span class="highlight-option">自动平滑移除右下角水印 (AI生成图专用)</span>
        </a-checkbox>
        <a-tooltip title="采用双向纹理采样无损修复右下角水印或 Logo">
          <question-circle-outlined style="color: #999; margin-left: 5px" />
        </a-tooltip>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="upload-area">
      <a-upload-dragger name="file" :multiple="true" :showUploadList="false" :before-upload="handleUpload" accept="image/*">
        <p class="ant-upload-drag-icon"><inbox-outlined /></p>
        <p class="ant-upload-text">点击或将图片拖拽到这里批量压缩</p>
        <p class="ant-upload-hint">支持 JPG、PNG、WebP、BMP、SVG 等各种格式，100% 浏览器本地高精度处理，零数据泄露</p>
      </a-upload-dragger>
    </div>

    <!-- 结果列表 -->
    <div class="file-list" v-if="fileList.length > 0">
      <div class="list-header">
        <span class="status-text">
          处理进度: {{ finishedCount }} / {{ fileList.length }}
          <span v-if="totalSaved > 0" class="saved-tag">
            累计节省流量: <b>{{ formatSize(totalSaved) }}</b>
          </span>
        </span>
        <div>
          <a-button type="primary" :disabled="finishedCount === 0" @click="downloadAll">
            <template #icon><download-outlined /></template> 打包下载全部 (ZIP)
          </a-button>
          <a-button type="text" danger @click="clearList" style="margin-left: 10px">清空列表</a-button>
        </div>
      </div>

      <a-table :columns="columns" :data-source="fileList" :pagination="false" row-key="id" size="middle" bordered>
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
            <a-tag v-if="record.status === 'processing'" color="blue"><loading-outlined /> 正在平衡压缩...</a-tag>
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
  },
  data() {
    return {
      // 顶级 Tab
      mainMode: "smart", // 'smart' | 'custom'

      // 智能模式参数
      smartLevel: "balanced", // small, balanced, high

      // 自定义模式参数
      customType: "size", // quality, size (默认选大小，契合用户最关注的 100KB 需求)
      customQuality: 85,
      targetKB: 100, // 默认 100KB
      customResolution: "original",
      outputFormat: "image/webp", // 默认推荐 WebP，压缩率与画质巅峰
      autoWebpForSize: true, // 限制小体积时，PNG 自动采用 WebP 突破压缩瓶颈

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

      columns: [
        { title: "缩略图", key: "thumbnail", width: 70, align: "center" },
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
      return false; // 阻止 antd 默认上传行为
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
        // 调用自适应高保真压缩引擎
        const result = await compressImageAdaptive(task.rawFile, task.config);

        task.compressedBlob = markRaw(result.blob);
        task.compressedSize = result.blob.size;
        task.compressedWidth = result.width;
        task.compressedHeight = result.height;
        task.originalWidth = result.originalWidth || task.originalWidth;
        task.originalHeight = result.originalHeight || task.originalHeight;
        task.actualFormat = result.actualFormat;
        task.qualityUsed = result.qualityUsed;

        // 生成压缩后实时预览 DataURL
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
      saveAs(record.compressedBlob, `${baseName}_min.${ext}`);
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
          zip.file(`${baseName}_min.${ext}`, f.compressedBlob);
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
    },
  },
};
</script>

<style lang="scss" scoped>
.compress-container {
  max-width: 900px;
  margin: 30px auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

  .header {
    text-align: center;
    margin-bottom: 30px;
    h1 {
      color: #1f2937;
      margin-bottom: 5px;
      font-weight: 700;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
    }
  }

  .main-card {
    background: #fff;
    padding: 25px;
    border-radius: 16px;
    box-shadow: 0 4px 25px rgba(0, 0, 0, 0.05);
    margin-bottom: 25px;

    // 智能模式样式
    .smart-panel {
      padding: 10px 0;
      text-align: center;
      .smart-options {
        margin-bottom: 20px;
      }
      .smart-desc {
        background: #f9fafb;
        padding: 15px;
        border-radius: 8px;
        display: inline-block;
        text-align: left;
        min-width: 300px;

        .desc-item {
          color: #4b5563;
          font-size: 14px;
          line-height: 1.6;
          .tag {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
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
      padding: 10px;
      .sub-mode-switch {
        display: flex;
        align-items: center;
        gap: 15px;
        .label {
          font-weight: 600;
          color: #374151;
        }
      }

      .config-section {
        margin: 20px 0;
        .config-row {
          display: flex;
          align-items: center;
          gap: 10px;
          .label {
            width: 80px;
            text-align: right;
            font-weight: 500;
            color: #555;
          }
          .hint {
            font-size: 12px;
            color: #64748b;
          }
        }

        .size-input-row {
          margin-bottom: 12px;
        }

        // 预设大小胶囊
        .preset-pills-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-left: 90px;
          margin-bottom: 16px;

          .preset-label {
            font-size: 12px;
            color: #64748b;
            font-weight: 500;
          }

          .preset-pill {
            font-size: 12px;
            padding: 3px 10px;
            border-radius: 14px;
            background: #f1f5f9;
            color: #475569;
            cursor: pointer;
            border: 1px solid #e2e8f0;
            user-select: none;
            transition: all 0.15s ease;

            &:hover {
              background: #e2e8f0;
              color: #1e293b;
            }

            &.active {
              background: #1677ff;
              color: #ffffff;
              border-color: #1677ff;
              font-weight: 600;
            }

            &.highlight {
              border-color: #93c5fd;
              background: #eff6ff;
              color: #1d4ed8;
              font-weight: 600;

              &.active {
                background: #1677ff;
                color: #ffffff;
              }
            }
          }
        }

        // 算法保障卡片
        .engine-tip-banner {
          display: flex;
          gap: 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          padding: 12px 16px;
          border-radius: 8px;
          margin-left: 90px;
          margin-top: 10px;

          .et-icon {
            font-size: 20px;
            color: #16a34a;
            line-height: 1;
            margin-top: 2px;
          }

          .et-content {
            flex: 1;
            .et-title {
              font-size: 13px;
              font-weight: 700;
              color: #15803d;
              margin-bottom: 4px;
            }
            .et-desc {
              font-size: 12px;
              color: #4b5563;
              line-height: 1.5;
              strong {
                color: #15803d;
              }
            }
          }
        }
      }

      .advanced-options {
        background: #f8fafc;
        padding: 16px 20px;
        border-radius: 10px;
        margin-top: 15px;
        border: 1px solid #e2e8f0;

        .config-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
          &:last-child {
            margin-bottom: 0;
          }
          .label {
            width: 80px;
            text-align: right;
            font-weight: 600;
            color: #475569;
          }
        }

        .badge-rec {
          background: #fee2e2;
          color: #dc2626;
          font-size: 10px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 3px;
          margin-right: 4px;
        }

        .format-hint {
          font-size: 12px;
          color: #64748b;
          margin-left: 92px;
          margin-bottom: 8px;
          line-height: 1.5;
        }

        .sub-checkbox-row {
          margin-left: 92px;
          margin-top: 10px;
          font-size: 12px;
          color: #475569;
        }
      }
    }

    // 全局底部
    .global-footer {
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px dashed #e5e7eb;
      display: flex;
      justify-content: center;
      align-items: center;

      .highlight-option {
        font-weight: 500;
        color: #1677ff;
      }
    }
  }

  .upload-area {
    margin-bottom: 25px;
    :deep(.ant-upload-drag) {
      border-radius: 12px;
      background: #fafafa;
      border: 2px dashed #d1d5db;
      &:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }
    }
  }

  .file-list {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
    overflow: hidden;

    .list-header {
      padding: 12px 20px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      .status-text {
        font-weight: 600;
        color: #475569;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .saved-tag {
        color: #16a34a;
        background: #ecfdf5;
        padding: 2px 10px;
        border-radius: 12px;
        border: 1px solid #a7f3d0;
        font-size: 12px;
      }
    }

    .table-thumb {
      width: 48px;
      height: 48px;
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
      gap: 2px;
      .size-text {
        font-weight: 600;
        color: #1e293b;
        font-size: 13px;
      }
      .dim-text {
        font-size: 11px;
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
        font-size: 14px;
        font-family: ui-monospace, monospace;
      }
      .format-tag {
        font-size: 10px;
        padding: 0 4px;
        line-height: 18px;
        margin: 0;
        font-weight: bold;
      }
    }

    .green-text {
      color: #16a34a;
      font-weight: 700;
      font-size: 13px;
    }
    .red-text {
      color: #dc2626;
      font-size: 12px;
    }
  }
}

// 画质对比弹窗样式
.compare-modal {
  :deep(.ant-modal-content) {
    border-radius: 14px;
    padding: 20px 24px;
  }

  .compare-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .metrics-comparison-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px 20px;

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
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
        font-family: ui-monospace, monospace;
      }
      .success-text {
        color: #16a34a;
      }
      .m-sub {
        font-size: 11px;
        color: #94a3b8;
        font-family: ui-monospace, monospace;
      }
    }

    .metric-arrow {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;

      .rate-badge {
        font-size: 12px;
        font-weight: 700;
        color: #16a34a;
        background: #ecfdf5;
        border: 1px solid #a7f3d0;
        padding: 2px 10px;
        border-radius: 12px;
      }
    }
  }

  .views-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;

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
        padding: 8px 12px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        font-size: 12px;
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
        height: 340px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
        padding: 10px;

        .preview-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-radius: 4px;
        }
      }
    }
  }

  // 棋盘格透明指示底纹
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
    padding-top: 12px;
    border-top: 1px solid #f1f5f9;

    .cf-hint {
      font-size: 12px;
      color: #64748b;
      max-width: 650px;
      line-height: 1.5;
    }
  }
}
</style>
