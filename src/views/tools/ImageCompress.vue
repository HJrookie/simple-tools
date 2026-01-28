<template>
  <div class="compress-container">
    <div class="header">
      <h1>全能图片压缩 Pro</h1>
    </div>

    <div class="main-card">
      <!-- 顶级模式切换：智能 vs 自定义 -->
      <a-tabs v-model:activeKey="mainMode" type="card" size="large" centered>
        <!-- ================= 模式 1: 智能模式 (一键操作) ================= -->
        <a-tab-pane key="smart" tab="🚀 智能模式">
          <div class="smart-panel">
            <div class="smart-options">
              <a-radio-group v-model:value="smartLevel" button-style="solid" size="large">
                <a-radio-button value="small"> <compress-outlined /> 体积优先 </a-radio-button>
                <a-radio-button value="balanced"> <check-outlined /> 平衡模式 (推荐) </a-radio-button>
                <a-radio-button value="high"> <star-outlined /> 画质优先 </a-radio-button>
              </a-radio-group>
            </div>

            <!-- 智能模式的说明文案 -->
            <div class="smart-desc">
              <div v-if="smartLevel === 'small'" class="desc-item"><span class="tag">极致压缩</span> 限制分辨率 (1280px)，画质一般，适合网页加载或传输。</div>
              <div v-if="smartLevel === 'balanced'" class="desc-item"><span class="tag">最佳平衡</span> 限制分辨率 (1920px)，肉眼几乎无损，体积减少 50% 以上。</div>
              <div v-if="smartLevel === 'high'" class="desc-item"><span class="tag">原画质</span> 保持原分辨率，仅移除冗余数据，适合打印或存档。</div>
            </div>
          </div>
        </a-tab-pane>

        <!-- ================= 模式 2: 自定义模式 (专业微调) ================= -->
        <a-tab-pane key="custom" tab="🛠 自定义模式">
          <div class="custom-panel">
            <!-- 二级切换：按清晰度 vs 按大小 -->
            <div class="sub-mode-switch">
              <span class="label">压缩目标：</span>
              <a-radio-group v-model:value="customType">
                <a-radio value="quality">指定清晰度</a-radio>
                <a-radio value="size">指定文件大小</a-radio>
              </a-radio-group>
            </div>

            <a-divider style="margin: 15px 0" />

            <!-- A. 指定清晰度 (不限制大小) -->
            <div v-if="customType === 'quality'" class="config-section">
              <div class="config-row">
                <span class="label">清晰度：</span>
                <a-slider v-model:value="customQuality" :min="1" :max="100" style="flex: 1; max-width: 300px" />
                <a-input-number v-model:value="customQuality" :min="1" :max="100" style="width: 100px; margin-left: 10px">
                  <template #addonAfter>%</template>
                </a-input-number>
              </div>
            </div>

            <!-- B. 指定大小 (限制体积) -->
            <div v-if="customType === 'size'" class="config-section">
              <div class="config-row">
                <span class="label">希望大小：</span>
                <a-input-number v-model:value="targetKB" :min="10" :step="10" size="large" style="width: 150px">
                  <template #addonAfter>KB</template>
                </a-input-number>
                <span class="hint"> (将自动降低画质以接近此大小)</span>
              </div>
            </div>

            <!-- 公共高级选项 -->
            <div class="advanced-options">
              <div class="config-row">
                <span class="label">分辨率：</span>
                <a-select v-model:value="customResolution" style="width: 200px">
                  <a-select-option value="original">保持原分辨率</a-select-option>
                  <a-select-option :value="1920">限制 1920px (1080P)</a-select-option>
                  <a-select-option :value="1280">限制 1280px (720P)</a-select-option>
                </a-select>
              </div>
              <div class="config-row">
                <span class="label">输出格式：</span>
                <a-radio-group v-model:value="outputFormat">
                  <a-radio value="original">原格式</a-radio>
                  <a-radio value="image/jpeg">JPG</a-radio>
                  <a-radio value="image/png">PNG</a-radio>
                </a-radio-group>
              </div>
            </div>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- 全局底部选项 (无论哪个模式都生效) -->
      <div class="global-footer">
        <a-checkbox v-model:checked="removeWatermark">
          <span class="highlight-option">自动移除右下角水印 (AI生成图专用)</span>
        </a-checkbox>
        <a-tooltip title="无损去除 Gemini/Midjourney 等右下角 Logo">
          <question-circle-outlined style="color: #999; margin-left: 5px" />
        </a-tooltip>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="upload-area">
      <a-upload-dragger name="file" :multiple="true" :showUploadList="false" :before-upload="handleUpload" accept="image/*">
        <p class="ant-upload-drag-icon"><inbox-outlined /></p>
        <p class="ant-upload-text">点击或拖拽图片到这里</p>
        <p class="ant-upload-hint">支持批量处理，队列自动优化</p>
      </a-upload-dragger>
    </div>

    <!-- 结果列表 -->
    <div class="file-list" v-if="fileList.length > 0">
      <div class="list-header">
        <span class="status-text">
          进度: {{ finishedCount }} / {{ fileList.length }}
          <span v-if="totalSaved > 0" style="margin-left: 15px; color: #52c41a"> 累计节省: {{ formatSize(totalSaved) }} </span>
        </span>
        <div>
          <a-button type="primary" :disabled="finishedCount === 0" @click="downloadAll">
            <template #icon><download-outlined /></template> 打包下载
          </a-button>
          <a-button type="text" danger @click="clearList" style="margin-left: 10px">清空</a-button>
        </div>
      </div>

      <a-table :columns="columns" :data-source="fileList" :pagination="false" row-key="id" size="middle" bordered>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'thumbnail'">
            <img :src="record.preview" class="table-thumb" />
          </template>

          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === 'processing'" color="blue"><loading-outlined /> 处理中</a-tag>
            <a-tag v-else-if="record.status === 'done'" color="success">完成</a-tag>
            <a-tag v-else-if="record.status === 'error'" color="error">失败</a-tag>
            <a-tag v-else>排队中</a-tag>
          </template>

          <template v-if="column.key === 'compressedSize'">
            <div v-if="record.status === 'done'">
              <div style="font-weight: bold">{{ formatSize(record.compressedSize) }}</div>
              <div :class="record.compressRate > 0 ? 'green-text' : 'red-text'">{{ record.compressRate > 0 ? "-" : "+" }}{{ Math.abs(record.compressRate) }}%</div>
            </div>
            <span v-else>-</span>
          </template>

          <template v-if="column.key === 'action'">
            <a-button type="link" :disabled="record.status !== 'done'" @click="downloadOne(record)">下载</a-button>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script>
import { InboxOutlined, LoadingOutlined, CompressOutlined, CheckOutlined, StarOutlined, QuestionCircleOutlined, DownloadOutlined } from "@ant-design/icons-vue";
import { markRaw } from "vue";
import imageCompression from "browser-image-compression";
import JSZip from "jszip";
import { saveAs } from "file-saver";

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
  },
  data() {
    return {
      // 顶级 Tab
      mainMode: "smart", // 'smart' | 'custom'

      // 智能模式参数
      smartLevel: "balanced", // small, balanced, high

      // 自定义模式参数
      customType: "quality", // quality, size
      customQuality: 90,
      targetKB: 500,
      customResolution: "original",
      outputFormat: "original",

      // 全局参数
      removeWatermark: false,

      // 队列与数据
      queue: [],
      fileList: [],
      processingCount: 0,
      maxConcurrent: 5, // M4 性能优化的并发数

      columns: [
        { title: "缩略图", key: "thumbnail", width: 70, align: "center" },
        { title: "文件名", dataIndex: "name", key: "name", ellipsis: true },
        { title: "原大小", dataIndex: "originalSizeStr", width: 110 },
        { title: "状态", key: "status", width: 110 },
        { title: "结果", key: "compressedSize", width: 140 },
        { title: "操作", key: "action", width: 80, align: "center" },
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
      if (!bytes) return "0 B";
      const k = 1024;
      const sizes = ["B", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    handleUpload(file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        // 1. 在任务生成瞬间，捕捉当前的配置快照
        const configSnapshot = this.generateConfig();

        const task = {
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          rawFile: markRaw(file),
          name: file.name,
          originalSize: file.size,
          originalSizeStr: this.formatSize(file.size),
          preview: e.target.result,
          status: "pending",
          compressedBlob: null,
          compressedSize: 0,
          compressRate: 0,
          config: configSnapshot, // 绑定配置
        };

        this.fileList.push(task);
        this.queue.push(task.id);
        this.processQueue();
      };
      return false;
    },

    // 核心：根据当前模式生成配置对象
    generateConfig() {
      const options = {
        useWebWorker: true,
        preserveExif: true,
      };

      // 逻辑分支：智能模式 vs 自定义模式
      if (this.mainMode === "smart") {
        // === 智能模式配置 ===
        if (this.smartLevel === "small") {
          options.maxSizeMB = 0.5; // 限制 500KB
          options.maxWidthOrHeight = 1280; // 限制分辨率
          options.initialQuality = 0.6;
        } else if (this.smartLevel === "balanced") {
          options.maxSizeMB = 2; // 限制 2MB
          options.maxWidthOrHeight = 1920; // 限制 1080P
          options.initialQuality = 0.8;
        } else {
          // high
          options.maxSizeMB = 50; // 不限制大小
          options.initialQuality = 1.0; // 最高画质
          options.alwaysKeepResolution = true; // 强制保持原分辨率
        }
      } else {
        // === 自定义模式配置 ===

        // 1. 目标设定
        if (this.customType === "quality") {
          options.maxSizeMB = 50; // 不限制大小，由质量控制
          options.initialQuality = this.customQuality / 100;
          options.maxIteration = 0; // 不循环压缩，防止画质下降
        } else {
          options.maxSizeMB = this.targetKB / 1024;
          options.maxIteration = 10; // 允许循环尝试压缩到目标大小
        }

        // 2. 分辨率设定
        if (this.customResolution === "original") {
          options.alwaysKeepResolution = true;
        } else {
          options.maxWidthOrHeight = this.customResolution;
        }

        // 3. 格式设定
        if (this.outputFormat !== "original") {
          options.fileType = this.outputFormat;
        }
      }

      return {
        libOptions: options,
        removeWm: this.removeWatermark,
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
        let inputFile = task.rawFile;

        // 步骤 1: 去水印 (中间层强制使用 PNG 保持无损)
        if (task.config.removeWm) {
          const cleanBlob = await this.removeWatermarkProcess(inputFile);
          // 将 Blob 伪装成 PNG 文件传入库
          inputFile = new File([cleanBlob], task.name, { type: "image/png" });
        }

        // 步骤 2: 压缩
        const compressedBlob = await imageCompression(inputFile, task.config.libOptions);

        task.compressedBlob = markRaw(compressedBlob);
        task.compressedSize = compressedBlob.size;
        task.compressRate = (((task.originalSize - compressedBlob.size) / task.originalSize) * 100).toFixed(1);
        task.status = "done";
      } catch (err) {
        console.error(err);
        task.status = "error";
      } finally {
        this.processingCount--;
        this.$nextTick(() => this.processQueue());
      }
    },

    // 高速 Canvas 去水印
    removeWatermarkProcess(file) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d", { alpha: true });

          ctx.drawImage(img, 0, 0);

          // 动态计算水印区域 (约 12% 边长)
          const wmSize = Math.max(50, Math.min(img.width, img.height) * 0.12);
          const x = img.width - wmSize;
          const y = img.height - wmSize;

          try {
            // 像素克隆覆盖
            ctx.drawImage(canvas, x - 5, y, 2, wmSize, x, y, wmSize, wmSize);
          } catch (e) {}

          // 强制输出 PNG 以防画质损失
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(img.src);
            resolve(blob);
          }, "image/png");
        };
        img.onerror = reject;
      });
    },

    downloadOne(record) {
      let ext = record.name.split(".").pop();
      const type = record.compressedBlob.type;
      if (type === "image/jpeg") ext = "jpg";
      else if (type === "image/png") ext = "png";
      else if (type === "image/webp") ext = "webp";

      saveAs(record.compressedBlob, `min_${record.name.replace(/\.[^/.]+$/, "")}.${ext}`);
    },

    async downloadAll() {
      const zip = new JSZip();
      this.fileList.forEach((f) => {
        if (f.status === "done") {
          let ext = f.name.split(".").pop();
          const type = f.compressedBlob.type;
          if (type === "image/jpeg") ext = "jpg";
          else if (type === "image/png") ext = "png";
          else if (type === "image/webp") ext = "webp";

          zip.file(`min_${f.name.replace(/\.[^/.]+$/, "")}.${ext}`, f.compressedBlob);
        }
      });
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "processed_images.zip");
    },

    clearList() {
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
          .tag {
            background: #e0f2fe;
            color: #0284c7;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
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
            color: #999;
          }
        }
      }

      .advanced-options {
        background: #f8fafc;
        padding: 15px;
        border-radius: 8px;
        margin-top: 15px;
        .config-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          &:last-child {
            margin-bottom: 0;
          }
          .label {
            width: 80px;
            text-align: right;
            font-weight: 500;
            color: #64748b;
          }
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
      }
    }

    .table-thumb {
      width: 44px;
      height: 44px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .green-text {
      color: #16a34a;
      font-weight: 600;
      font-size: 12px;
    }
    .red-text {
      color: #dc2626;
      font-size: 12px;
    }
  }
}
</style>
