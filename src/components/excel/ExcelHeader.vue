<!-- src/components/excel/ExcelHeader.vue -->
<template>
  <header class="glass-header">
    <div class="header-left">
      <a-button @click="$router.push('/')" class="back-btn">
        <template #icon><ArrowLeftOutlined /></template>
        返回首页
      </a-button>
      <div class="title-group">
        <h1 class="page-title">
          <FileExcelOutlined class="title-icon" /> Excel 极速数据转换器
        </h1>
        <span class="safe-badge">
          <SafetyCertificateOutlined /> 100% 纯本地内存处理 · 数据绝不上云 · 10秒批处理神器
        </span>
      </div>
    </div>

    <div class="header-right">
      <template v-if="hasData">
        <a-space :size="8">
          <a-button-group>
            <a-button :disabled="historyIndex <= 0" @click="$emit('undo')" title="撤销 (Ctrl+Z)">
              <template #icon><UndoOutlined /></template>
              撤销
            </a-button>
            <a-button :disabled="historyIndex >= historyLength - 1" @click="$emit('redo')" title="重做 (Ctrl+Y)">
              <template #icon><RedoOutlined /></template>
              重做
            </a-button>
          </a-button-group>

          <a-upload :before-upload="handleFileUpload" :show-upload-list="false" accept=".xlsx,.xls,.csv">
            <a-button class="action-btn">
              <template #icon><UploadOutlined /></template>
              更换表格
            </a-button>
          </a-upload>

          <a-button class="action-btn" @click="$emit('open-paste')">
            <template #icon><CopyOutlined /></template>
            粘贴数据
          </a-button>

          <a-button danger ghost class="action-btn" @click="$emit('clear-data')">
            <template #icon><DeleteOutlined /></template>
            清空
          </a-button>

          <a-button class="action-btn copy-btn" @click="$emit('copy-table')">
            <template #icon><CheckOutlined v-if="copied" /><CopyOutlined v-else /></template>
            {{ copied ? "已复制" : "复制为表格" }}
          </a-button>

          <a-dropdown>
            <template #overlay>
              <a-menu @click="({ key }) => $emit('export-data', key)">
                <a-menu-item key="xlsx">
                  <FileExcelOutlined style="color: #10b981; margin-right: 6px;" /> 导出 Excel 工作簿 (.xlsx)
                  <span class="menu-sub-tip">（文本列锁定格式防失真）</span>
                </a-menu-item>
                <a-menu-item key="csv">
                  <FileTextOutlined style="color: #3b82f6; margin-right: 6px;" /> 导出 CSV 文件 (.csv)
                </a-menu-item>
              </a-menu>
            </template>
            <a-button type="primary" class="export-main-btn">
              <template #icon><DownloadOutlined /></template>
              导出数据
            </a-button>
          </a-dropdown>
        </a-space>
      </template>

      <template v-else>
        <a-space>
          <a href="/测试表格_全面功能体验.xlsx" download="测试表格_全面功能体验.xlsx">
            <a-button class="action-btn">
              <template #icon><DownloadOutlined /></template>
              下载测试表格 (.xlsx)
            </a-button>
          </a>
          <a-button @click="$emit('open-paste')" class="action-btn">
            <template #icon><CopyOutlined /></template>
            粘贴剪贴板表格
          </a-button>
          <a-button type="primary" @click="$emit('load-demo')" class="action-btn">
            <template #icon><ThunderboltOutlined /></template>
            载入演示数据 (Demo)
          </a-button>
        </a-space>
      </template>
    </div>
  </header>
</template>

<script>
import { Button, ButtonGroup, Space, Upload, Dropdown, Menu } from "ant-design-vue";
import {
  UploadOutlined,
  DownloadOutlined,
  CopyOutlined,
  CheckOutlined,
  UndoOutlined,
  RedoOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ArrowLeftOutlined,
  SafetyCertificateOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons-vue";

export default {
  name: "ExcelHeader",
  components: {
    "a-button": Button,
    "a-button-group": ButtonGroup,
    "a-space": Space,
    "a-upload": Upload,
    "a-dropdown": Dropdown,
    "a-menu": Menu,
    "a-menu-item": Menu.Item,
    UploadOutlined,
    DownloadOutlined,
    CopyOutlined,
    CheckOutlined,
    UndoOutlined,
    RedoOutlined,
    FileExcelOutlined,
    FileTextOutlined,
    ArrowLeftOutlined,
    SafetyCertificateOutlined,
    DeleteOutlined,
    ThunderboltOutlined,
  },
  props: {
    hasData: {
      type: Boolean,
      default: false,
    },
    historyIndex: {
      type: Number,
      default: -1,
    },
    historyLength: {
      type: Number,
      default: 0,
    },
    copied: {
      type: Boolean,
      default: false,
    },
  },
  emits: [
    "undo",
    "redo",
    "upload-file",
    "open-paste",
    "clear-data",
    "copy-table",
    "export-data",
    "load-demo",
  ],
  methods: {
    handleFileUpload(file) {
      this.$emit("upload-file", file);
      return false; // 阻止 antd 自动发 HTTP 请求
    },
  },
};
</script>

<style scoped lang="scss">
.glass-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .back-btn {
      border-radius: 8px;
    }

    .title-group {
      display: flex;
      flex-direction: column;

      .page-title {
        margin: 0;
        font-size: 19px;
        font-weight: 700;
        color: #0f172a;
        display: flex;
        align-items: center;
        gap: 8px;

        .title-icon {
          color: #10b981;
          font-size: 21px;
        }
      }

      .safe-badge {
        font-size: 11px;
        color: #64748b;
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;

    .action-btn {
      border-radius: 8px;
    }

    .copy-btn {
      border-color: #10b981;
      color: #059669;
      &:hover {
        border-color: #059669;
        color: #047857;
      }
    }

    .export-main-btn {
      border-radius: 8px;
      background: #10b981;
      border-color: #10b981;
      &:hover {
        background: #059669;
        border-color: #059669;
      }
    }
  }
}

.menu-sub-tip {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 4px;
}
</style>
