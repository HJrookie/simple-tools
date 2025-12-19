<template>
  <div class="log-parser">
    <!-- 头部区域 -->
    <div class="parser-header">
      <div class="left">
        <h2>Nginx 日志分析器</h2>
      </div>
      <div class="right">
        <!-- 搜索框 (仅当有数据时显示) -->
        <a-input-search v-if="parsedLogs.length" v-model:value="searchText" placeholder="搜索 IP / 路径 / 状态码..." style="width: 300px; margin-right: 16px" allowClear @change="onSearchChange" />

        <a-space v-if="parsedLogs.length">
          <!-- 动态列配置 -->
          <a-popover trigger="click" placement="bottomRight" overlayClassName="column-config-popover">
            <template #content>
              <a-checkbox-group v-model:value="selectedColumnKeys" style="display: flex; flex-direction: column; gap: 8px">
                <a-checkbox v-for="col in allColumns" :key="col.key" :value="col.key">
                  {{ col.title }}
                </a-checkbox>
              </a-checkbox-group>
            </template>
            <a-button>
              <template #icon><SettingOutlined /></template>
              显示列
            </a-button>
          </a-popover>

          <a-button @click="clearLogs">
            <template #icon><DeleteOutlined /></template>
            清空 / 重传
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 统计看板 (新增功能) -->
    <!-- <div class="stats-dashboard" v-if="parsedLogs.length">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic title="请求总数" :value="filteredLogs.length" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="错误率 (4xx/5xx)" :value="errorRate" suffix="%" :value-style="{ color: errorRate > 5 ? '#cf1322' : '#3f8600' }" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="唯一 IP 数" :value="uniqueIpCount" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="流量总计" :value="totalTraffic" />
        </a-col>
      </a-row>
    </div> -->

    <!-- 内容区域 -->
    <div class="parser-content">
      <!-- 1. 空状态 / 上传区域 (加大尺寸) -->
      <div v-if="parsedLogs.length === 0" class="upload-area">
        <a-upload-dragger name="file" :multiple="false" :showUploadList="false" :beforeUpload="handleBeforeUpload" class="custom-dragger">
          <div class="dragger-content">
            <p class="icon-wrapper">
              <FileTextOutlined />
            </p>
            <p class="main-text">点击或将 access.log 文件拖拽到此处</p>
            <p class="sub-text">
              支持标准 Nginx Combined 日志格式自动解析<br />
              前端本地解析，文件不会上传到服务器
            </p>
          </div>
        </a-upload-dragger>

        <div v-if="parsing" class="parsing-loading">
          <a-spin tip="正在解析日志文件..." size="large" />
        </div>
      </div>

      <!-- 2. 数据表格区域 -->
      <div v-else class="table-area">
        <a-table :dataSource="filteredLogs" :columns="visibleColumns" :pagination="pagination" @change="handleTableChange" rowKey="id" size="small" :scroll="{ x: 1300, y: 'calc(100vh - 280px)' }">
          <!-- 状态码 -->
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ record.status }}
              </a-tag>
            </template>

            <!-- 方法 (修复400乱码问题) -->
            <template v-else-if="column.key === 'method'">
              <a-tag :color="getMethodColor(record.method)">
                {{ record.method }}
              </a-tag>
            </template>

            <!-- 路径 (带 Tooltip + 截断) -->
            <template v-else-if="column.key === 'path'">
              <a-tooltip placement="topLeft" :title="record.path">
                <span class="path-cell">{{ record.path }}</span>
              </a-tooltip>
            </template>

            <!-- User Agent -->
            <template v-else-if="column.key === 'ua'">
              <a-tooltip placement="topLeft" :title="record.ua">
                <span class="text-ellipsis" style="max-width: 200px; color: #999">{{ record.ua }}</span>
              </a-tooltip>
            </template>

            <!-- IP 地址 (点击跳转查询) -->
            <template v-else-if="column.key === 'ip'">
              <a :href="`https://ipinfo.io/${record.ip}`" target="_blank" title="查询 IP">{{ record.ip }}</a>
            </template>

            <!-- 操作列 (简化为按钮) -->
            <template v-else-if="column.key === 'action'">
              <a-space :size="2">
                <a-tooltip title="复制原始行">
                  <a-button type="text" size="small" @click="copyRow(record, 'raw')">
                    <CopyOutlined />
                  </a-button>
                </a-tooltip>
                <a-tooltip title="复制 JSON">
                  <a-button type="text" size="small" @click="copyRow(record, 'json')">
                    <CodeOutlined />
                  </a-button>
                </a-tooltip>
              </a-space>
            </template>
          </template>
        </a-table>
      </div>
    </div>
  </div>
</template>

<script>
import { FileTextOutlined, DeleteOutlined, SettingOutlined, CopyOutlined, CodeOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";

// Nginx Combined Regex
const LOG_REGEX = /^(\S+) (\S+) (\S+) \[(.*?)\] "(.*?)" (\d+) (\d+) "(.*?)" "(.*?)"/;

export default {
  name: "NginxLogParser",
  components: {
    FileTextOutlined,
    DeleteOutlined,
    SettingOutlined,
    CopyOutlined,
    CodeOutlined,
  },
  data() {
    return {
      parsing: false,
      rawLogs: [], // 原始解析后的全量数据
      searchText: "", // 搜索关键词

      // 分页状态 (修复分页问题)
      pagination: {
        current: 1,
        pageSize: 50,
        total: 0,
        showSizeChanger: true,
        pageSizeOptions: ["50", "100", "500", "1000"],
        showTotal: (total, range) => `显示 ${range[0]}-${range[1]} 条，共 ${total} 条`,
      },

      // 列定义
      allColumns: [
        { title: "状态", dataIndex: "status", key: "status", width: 80, fixed: "left", sorter: (a, b) => a.status - b.status },
        {
          title: "方法",
          dataIndex: "method",
          key: "method",
          width: 90,
          filters: [
            { text: "GET", value: "GET" },
            { text: "POST", value: "POST" },
            { text: "BAD", value: "BAD" },
          ],
          onFilter: (value, record) => record.method.includes(value),
        },
        { title: "请求路径", dataIndex: "path", key: "path", width: 400 }, // 宽度调大
        { title: "IP 地址", dataIndex: "ip", key: "ip", width: 140 },
        { title: "时间", dataIndex: "time", key: "time", width: 180, sorter: (a, b) => new Date(a.time_obj) - new Date(b.time_obj) },
        { title: "大小", dataIndex: "size_str", key: "size", width: 100, sorter: (a, b) => a.size - b.size },
        { title: "User Agent", dataIndex: "ua", key: "ua", width: 200 },
        { title: "操作", key: "action", width: 90, fixed: "right" },
      ],

      selectedColumnKeys: ["status", "method", "path", "ip", "time", "size", "ua", "action"],
    };
  },
  computed: {
    // 1. 搜索过滤逻辑
    filteredLogs() {
      if (!this.searchText) {
        return this.rawLogs;
      }
      const lowerKey = this.searchText.toLowerCase();
      return this.rawLogs.filter((log) => {
        return log.path.toLowerCase().includes(lowerKey) || log.ip.includes(lowerKey) || log.status.toString().includes(lowerKey) || log.ua.toLowerCase().includes(lowerKey);
      });
    },
    // 2. 供表格使用的数据（实际上表格组件自己也会再次处理分页，但这里作为数据源）
    parsedLogs() {
      return this.rawLogs;
    },
    // 3. 动态列
    visibleColumns() {
      return this.allColumns.filter((col) => this.selectedColumnKeys.includes(col.key));
    },
    // --- 统计数据 ---
    errorRate() {
      if (!this.filteredLogs.length) return 0;
      const errors = this.filteredLogs.filter((l) => l.status >= 400).length;
      return ((errors / this.filteredLogs.length) * 100).toFixed(2);
    },
    uniqueIpCount() {
      const ips = new Set(this.filteredLogs.map((l) => l.ip));
      return ips.size;
    },
    totalTraffic() {
      let bytes = this.filteredLogs.reduce((sum, l) => sum + l.size, 0);
      return this.formatBytes(bytes);
    },
  },
  watch: {
    // 当过滤结果变化时，更新分页总数并重置到第一页
    filteredLogs: {
      handler(newVal) {
        this.pagination.total = newVal.length;
        this.pagination.current = 1;
      },
      immediate: true,
    },
  },
  methods: {
    // 处理 Ant Design Table 的分页和排序变化
    handleTableChange(pag, filters, sorter) {
      this.pagination.current = pag.current;
      this.pagination.pageSize = pag.pageSize;
    },

    // 搜索输入变化时 (重置分页已经在 watch 中处理)
    onSearchChange() {
      // 可以在这里加防抖，但前端过滤通常很快
    },

    handleBeforeUpload(file) {
      this.parsing = true;
      const reader = new FileReader();
      reader.onload = (e) => {
        // 给 UI 渲染留一点时间
        requestAnimationFrame(() => {
          this.parseContent(e.target.result);
          this.parsing = false;
        });
      };
      reader.readAsText(file);
      return false;
    },

    parseContent(content) {
      const lines = content.split(/\r?\n/);
      const results = [];
      let errorCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const match = line.match(LOG_REGEX);
        if (match) {
          const requestLine = match[5];

          // --- 核心修复：处理 400 乱码 / 恶意请求 ---
          let method = "UNKNOWN";
          let path = requestLine;
          let protocol = "";

          // 尝试以空格分割
          const parts = requestLine.split(" ");

          if (parts.length >= 2) {
            // 正常情况: GET /index.html HTTP/1.1
            // 或者是: GET /index.html (无协议)
            // 简单的启发式检查：Method 通常是大写字母，长度不超过 10
            if (/^[A-Z]{3,10}$/.test(parts[0])) {
              method = parts[0];
              path = parts[1];
              protocol = parts[2] || "";
            } else {
              // 可能是乱码，例如 \x16\x03...
              method = "BAD";
              path = requestLine; // 把原始内容放到 path 显示
            }
          } else {
            // 无法分割，整个串就是乱码
            method = "BAD";
            path = requestLine;
          }

          // 如果 path 包含不可见字符或太长，再次截断保护 UI
          if (path.length > 500) path = path.substring(0, 500) + "...";

          results.push({
            id: i,
            ip: match[1],
            time: match[4],
            time_obj: this.parseNginxTime(match[4]), // 用于排序
            request_line: requestLine,
            method: method,
            path: path,
            status: parseInt(match[6], 10),
            size: parseInt(match[7], 10),
            size_str: this.formatBytes(parseInt(match[7], 10)), // 格式化后的大小
            referer: match[8],
            ua: match[9],
            raw: line,
          });
        } else {
          errorCount++;
        }
      }

      this.rawLogs = results;

      if (results.length === 0) {
        message.warning("未解析出日志，请确认格式");
      } else {
        message.success(`解析成功: ${results.length} 条 (忽略 ${errorCount} 条)`);
      }
    },

    clearLogs() {
      this.rawLogs = [];
      this.searchText = "";
    },

    copyRow(record, type) {
      let text = type === "raw" ? record.raw : JSON.stringify(record, null, 2);
      navigator.clipboard.writeText(text).then(() => message.success("已复制"));
    },

    // 格式化 Nginx 时间: 19/Dec/2025:10:00:00 +0000 -> Date Object
    parseNginxTime(timeStr) {
      // 简单替换以兼容 Date.parse, 实际生产可能需要更严谨的库如 dayjs
      // 19/Dec/2025:10:00:00 -> 19 Dec 2025 10:00:00
      const s = timeStr.split(" ")[0].replace(/:/, " ");
      return new Date(s);
    },

    formatBytes(bytes, decimals = 2) {
      if (!+bytes) return "0 B";
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },

    getStatusColor(status) {
      if (status >= 200 && status < 300) return "success";
      if (status >= 300 && status < 400) return "processing";
      if (status >= 400 && status < 500) return "warning";
      if (status >= 500) return "error";
      return "default";
    },

    getMethodColor(method) {
      const map = { GET: "blue", POST: "green", PUT: "orange", DELETE: "red", BAD: "purple" };
      return map[method] || "default";
    },
  },
};
</script>

<style lang="scss" scoped>
.log-parser {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;

  .parser-header {
    flex-shrink: 0;
    height: 56px;
    background: #fff;
    // padding: 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #e8e8e8;
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }
  }

  .stats-dashboard {
    flex-shrink: 0;
    padding: 16px 24px 0 24px;

    :deep(.ant-card) {
      border-radius: 8px;
    }
    :deep(.ant-statistic-title) {
      font-size: 13px;
      color: #888;
      margin-bottom: 4px;
    }
    :deep(.ant-statistic-content-value) {
      font-size: 20px;
      font-weight: 500;
    }
  }

  .parser-content {
    flex: 1;
    padding: 10px 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    .upload-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #fff;
      border-radius: 8px;
      border: 1px dashed #d9d9d9;
      margin: 20px;

      .custom-dragger {
        width: 100%;
        height: 100%;
        display: flex; /* 让 Ant Dragger 撑满 */

        :deep(.ant-upload) {
          width: 100%;
          height: 100%;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
        }

        .dragger-content {
          text-align: center;
          padding: 40px;
          .icon-wrapper {
            font-size: 64px;
            color: #40a9ff;
            margin-bottom: 24px;
          }
          .main-text {
            font-size: 20px;
            color: #333;
            margin-bottom: 12px;
            font-weight: 500;
          }
          .sub-text {
            font-size: 14px;
            color: #999;
            line-height: 1.6;
          }
        }
      }
      .parsing-loading {
        margin-top: 20px;
      }
    }

    .table-area {
      flex: 1;
      background: #fff;
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      overflow: hidden;

      :deep(.ant-table-wrapper) {
        height: 100%;
      }
    }
  }
}

/* 路径单元格样式优化 */
.path-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: "Menlo", monospace;
  font-size: 13px;
  color: #333;
}

.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}
</style>
