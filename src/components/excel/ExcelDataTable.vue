<!-- src/components/excel/ExcelDataTable.vue -->
<template>
  <div class="data-table-wrapper">
    <!-- 表格辅助工具条 -->
    <div class="table-utility-bar">
      <div class="bar-left">
        <div class="header-toggle">
          <span class="toggle-label">首行作为表头:</span>
          <a-switch
            :checked="hasHeaderRow"
            @update:checked="(val) => $emit('update:hasHeaderRow', val)"
          />
        </div>

        <a-input
          v-model:value="tableSearchText"
          placeholder="搜索表格内容..."
          allow-clear
          class="table-search-input"
        >
          <template #prefix>
            <SearchOutlined style="color: #94a3b8" />
          </template>
        </a-input>

        <div class="highlight-toggle">
          <a-checkbox
            :checked="showModifiedHighlight"
            @update:checked="(val) => $emit('update:showModifiedHighlight', val)"
          >
            高亮改动单元格
          </a-checkbox>
        </div>

        <a-button size="small" @click="$emit('clean-empty', { removeRows: true, removeCols: false })" class="quick-header-action-btn">
          🧹 剔除空行
        </a-button>
      </div>

      <div class="bar-right">
        <div class="stats-pills">
          <span class="stat-pill">总行数: <strong>{{ rows.length }}</strong></span>
          <span class="stat-pill">总列数: <strong>{{ displayColumns.length }}</strong></span>
          <span class="stat-pill highlight-pill" v-if="modifiedCells.size > 0">
            已修改: <strong>{{ modifiedCells.size }}</strong> 处
          </span>
        </div>

        <a-select v-model:value="pageSize" size="small" style="width: 105px">
          <a-select-option :value="15">15 条/页</a-select-option>
          <a-select-option :value="30">30 条/页</a-select-option>
          <a-select-option :value="50">50 条/页</a-select-option>
          <a-select-option :value="100">100 条/页</a-select-option>
        </a-select>
      </div>
    </div>

    <!-- 交互数据表格卡片 -->
    <div class="table-card">
      <div class="table-scroll-container">
        <table class="modern-excel-table">
          <thead>
            <tr class="excel-col-header-row">
              <th class="row-num-col">#</th>
              <th
                v-for="(col, cIdx) in displayColumns"
                :key="cIdx"
                class="col-header-th"
                :class="{ 'has-force-text': forceTextCols.has(cIdx) }"
              >
                <div class="th-content">
                  <span class="col-letter">{{ getColName(cIdx) }}</span>
                  <span class="col-header-name" v-if="hasHeaderRow && col.name">
                    {{ col.name }}
                  </span>

                  <!-- 列快捷菜单 (10秒体验核心) -->
                  <a-dropdown trigger="click">
                    <button class="col-menu-btn" title="点击展开该列快速处理菜单">
                      <SettingOutlined />
                    </button>
                    <template #overlay>
                      <a-menu @click="({ key }) => $emit('quick-action', { colIndex: cIdx, actionKey: key })">
                        <a-menu-item key="extractPhone">
                          📱 提取手机号 (插入为新列)
                        </a-menu-item>
                        <a-menu-item key="extractIdCard">
                          🪪 提取身份证 (插入为新列)
                        </a-menu-item>
                        <a-menu-item key="extractEmail">
                          📧 提取邮箱 (插入为新列)
                        </a-menu-item>
                        <a-menu-divider />
                        <a-menu-item key="toRmb">
                          💰 金额转人民币大写 (壹万贰仟元)
                        </a-menu-item>
                        <a-menu-item key="toHalfWidth">
                          🔤 标点与数字全角转半角
                        </a-menu-item>
                        <a-menu-item key="toText">
                          🏷️ 转换为纯文本 (防失真/科学计数)
                        </a-menu-item>
                        <a-menu-item key="toNumber">
                          🔢 转换为纯数值 (去逗号/货币)
                        </a-menu-item>
                        <a-menu-divider />
                        <a-menu-item key="addSuffix1">
                          ➕ 末尾拼接数字 1
                        </a-menu-item>
                        <a-menu-item key="mathPlus1">
                          ➕ 所有数值加 1
                        </a-menu-item>
                        <a-menu-item key="trim">
                          ✂️ 清除首尾空格
                        </a-menu-item>
                        <a-menu-item key="dedupThisCol">
                          ✨ 按此列一键去重 (保留首条)
                        </a-menu-item>
                        <a-menu-item key="copyCol">
                          📋 复制整列内容
                        </a-menu-item>
                      </a-menu>
                    </template>
                  </a-dropdown>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, pIdx) in paginatedRows"
              :key="pIdx"
              class="excel-data-row"
            >
              <td class="row-num-cell">{{ getActualRowIndex(pIdx) + 1 }}</td>

              <td
                v-for="(cell, cIdx) in row"
                :key="cIdx"
                class="data-cell"
                :class="{
                  'modified-cell': showModifiedHighlight && isCellModified(pIdx, cIdx),
                  'text-mode': forceTextCols.has(cIdx),
                }"
                @dblclick="startEditCell(pIdx, cIdx)"
              >
                <!-- 行内编辑模式 -->
                <div v-if="editingCell && editingCell.r === getActualRowIndex(pIdx) && editingCell.c === cIdx" class="cell-editing-wrapper">
                  <input
                    ref="cellInputRef"
                    v-model="editingCell.value"
                    @blur="saveEditCell"
                    @keydown.enter="saveEditCell"
                    @keydown.esc="cancelEditCell"
                    class="cell-inline-input"
                  />
                </div>

                <!-- 常规展示模式 -->
                <div v-else class="cell-content-box">
                  <span class="cell-text" :title="String(cell ?? '')">{{ cell ?? "" }}</span>
                  <span
                    v-if="showModifiedHighlight && isCellModified(pIdx, cIdx)"
                    class="cell-changed-dot"
                    title="已修改"
                  ></span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-footer">
        <div class="footer-left">
          <span>双击单元格可直接行内修改 · 点击列头齿轮图标可 1 秒触发单列快捷转换</span>
        </div>
        <a-pagination
          v-model:current="currentPage"
          :total="filteredRows.length"
          :page-size="pageSize"
          show-quick-jumper
          size="small"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { Switch, Input, Checkbox, Button, Select, Dropdown, Menu, Pagination } from "ant-design-vue";
import { SearchOutlined, SettingOutlined } from "@ant-design/icons-vue";
import { getExcelColName } from "../../utils/excelTransformer.js";

export default {
  name: "ExcelDataTable",
  components: {
    "a-switch": Switch,
    "a-input": Input,
    "a-checkbox": Checkbox,
    "a-button": Button,
    "a-select": Select,
    "a-select-option": Select.Option,
    "a-dropdown": Dropdown,
    "a-menu": Menu,
    "a-menu-item": Menu.Item,
    "a-menu-divider": Menu.Divider,
    "a-pagination": Pagination,
    SearchOutlined,
    SettingOutlined,
  },
  props: {
    rows: {
      type: Array,
      default: () => [],
    },
    displayColumns: {
      type: Array,
      default: () => [],
    },
    forceTextCols: {
      type: Set,
      default: () => new Set(),
    },
    modifiedCells: {
      type: Set,
      default: () => new Set(),
    },
    showModifiedHighlight: {
      type: Boolean,
      default: true,
    },
    hasHeaderRow: {
      type: Boolean,
      default: true,
    },
  },
  emits: [
    "update:hasHeaderRow",
    "update:showModifiedHighlight",
    "quick-action",
    "cell-edit",
    "clean-empty",
  ],
  data() {
    return {
      tableSearchText: "",
      currentPage: 1,
      pageSize: 30,
      editingCell: null,
    };
  },
  computed: {
    filteredRows() {
      const allRows = this.rows;
      if (!allRows || !allRows.length) return [];
      const dataRows = this.hasHeaderRow ? allRows.slice(1) : allRows;

      if (!this.tableSearchText) return dataRows;

      const q = this.tableSearchText.toLowerCase();
      return dataRows.filter((row) =>
        row && row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
      );
    },
    paginatedRows() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.filteredRows.slice(start, start + this.pageSize);
    },
  },
  watch: {
    hasHeaderRow() {
      this.currentPage = 1;
    },
  },
  methods: {
    getColName(cIdx) {
      return getExcelColName(cIdx);
    },
    getActualRowIndex(paginatedIdx) {
      const offset = (this.currentPage - 1) * this.pageSize;
      const filteredIdx = offset + paginatedIdx;
      return this.hasHeaderRow ? filteredIdx + 1 : filteredIdx;
    },
    isCellModified(paginatedIdx, cIdx) {
      const actualRow = this.getActualRowIndex(paginatedIdx);
      return this.modifiedCells.has(`${actualRow}_${cIdx}`);
    },
    startEditCell(paginatedIdx, cIdx) {
      const actualRow = this.getActualRowIndex(paginatedIdx);
      const val = this.rows[actualRow] ? this.rows[actualRow][cIdx] : "";
      this.editingCell = {
        r: actualRow,
        c: cIdx,
        value: val ?? "",
      };
      this.$nextTick(() => {
        if (this.$refs.cellInputRef && this.$refs.cellInputRef[0]) {
          this.$refs.cellInputRef[0].focus();
        }
      });
    },
    saveEditCell() {
      if (!this.editingCell) return;
      const { r, c, value } = this.editingCell;
      this.$emit("cell-edit", { r, c, value });
      this.editingCell = null;
    },
    cancelEditCell() {
      this.editingCell = null;
    },
  },
};
</script>

<style scoped lang="scss">
.data-table-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 表格辅助工具条 */
.table-utility-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;

  .bar-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-toggle {
      display: flex;
      align-items: center;
      gap: 8px;

      .toggle-label {
        font-size: 13px;
        font-weight: 600;
        color: #475569;
      }
    }

    .table-search-input {
      width: 200px;
      border-radius: 8px;
    }

    .highlight-toggle {
      font-size: 13px;
      color: #475569;
    }

    .quick-header-action-btn {
      border-radius: 6px;
    }
  }

  .bar-right {
    display: flex;
    align-items: center;
    gap: 14px;

    .stats-pills {
      display: flex;
      gap: 8px;

      .stat-pill {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        color: #64748b;

        strong {
          color: #0f172a;
        }

        &.highlight-pill {
          background: #ecfdf5;
          border-color: #a7f3d0;
          color: #059669;

          strong {
            color: #047857;
          }
        }
      }
    }
  }
}

/* 表格卡片 */
.table-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  display: flex;
  flex-direction: column;

  .table-scroll-container {
    overflow-x: auto;
    max-height: calc(100vh - 350px);
    overflow-y: auto;
  }

  .modern-excel-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    text-align: left;

    thead {
      position: sticky;
      top: 0;
      z-index: 10;
      background: #f8fafc;
    }

    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      white-space: nowrap;
    }

    .excel-col-header-row {
      th {
        background: #f1f5f9;
        color: #334155;
        font-weight: 700;
        user-select: none;

        &.has-force-text {
          background: #eff6ff;
          border-top: 2px solid #3b82f6;
        }
      }

      .row-num-col {
        width: 50px;
        min-width: 50px;
        text-align: center;
        background: #e2e8f0;
        color: #64748b;
      }

      .col-header-th {
        min-width: 120px;

        .th-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;

          .col-letter {
            font-size: 11px;
            color: #94a3b8;
            font-weight: 700;
          }

          .col-header-name {
            font-size: 13px;
            color: #0f172a;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .col-menu-btn {
            background: transparent;
            border: none;
            padding: 3px 5px;
            border-radius: 4px;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.15s ease;

            &:hover {
              color: #10b981;
              background: rgba(0, 0, 0, 0.05);
            }
          }
        }
      }
    }

    .excel-data-row {
      &:hover {
        background: #f8fafc;
      }

      .row-num-cell {
        background: #f8fafc;
        color: #94a3b8;
        font-size: 11px;
        text-align: center;
        font-weight: 600;
        user-select: none;
      }

      .data-cell {
        color: #1e293b;
        transition: background 0.15s ease;

        &.text-mode {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        &.modified-cell {
          background: #ecfdf5 !important;
          color: #065f46;
          font-weight: 600;
        }

        .cell-content-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 22px;

          .cell-text {
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 340px;
          }

          .cell-changed-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #10b981;
            margin-left: 6px;
            flex-shrink: 0;
          }
        }

        .cell-inline-input {
          width: 100%;
          border: 1px solid #10b981;
          outline: none;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
          background: #ffffff;
        }
      }
    }
  }

  .pagination-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 20px;
    background: #ffffff;
    border-top: 1px solid #f1f5f9;

    .footer-left {
      font-size: 12px;
      color: #94a3b8;
    }
  }
}
</style>
