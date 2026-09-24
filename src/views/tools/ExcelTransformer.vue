<!-- src/views/tools/ExcelTransformer.vue (Modular Options API Edition) -->
<template>
  <div class="excel-transformer-container">
    <!-- 1. 顶部 Header (组件化) -->
    <ExcelHeader
      :has-data="hasData"
      :history-index="historyIndex"
      :history-length="history.length"
      :copied="copied"
      @undo="undo"
      @redo="redo"
      @upload-file="handleFileUpload"
      @open-paste="showPasteModal = true"
      @clear-data="clearAllData"
      @copy-table="copyTableToClipboard"
      @export-data="handleExport"
      @load-demo="loadDemoData"
    />

    <!-- 2. 空状态：拖拽大屏与 6 大杀手级功能卡片 -->
    <div v-if="!hasData" class="empty-upload-view">
      <div class="upload-box-wrapper">
        <a-upload-dragger
          name="excelfile"
          :multiple="false"
          :show-upload-list="false"
          :before-upload="handleFileUpload"
          accept=".xlsx,.xls,.csv"
          class="excel-dragger"
        >
          <div class="dragger-body">
            <div class="dragger-icon-circle">
              <FileExcelOutlined />
            </div>
            <h2 class="dragger-title">拖拽 Excel 或 CSV 文件至此处，或点击上传</h2>
            <p class="dragger-desc">
              支持 <code>.xlsx</code>、<code>.xls</code>、<code>.csv</code> 格式 · 本地闪电内存处理 · 保护数据隐私
            </p>
            <div class="dragger-actions">
              <a-button type="primary" size="large" class="primary-upload-btn">
                <template #icon><UploadOutlined /></template>
                选择电脑中的文件
              </a-button>
              <a-button size="large" @click.stop="showPasteModal = true" class="secondary-btn">
                <template #icon><CopyOutlined /></template>
                直接粘贴表格数据 (Ctrl+V)
              </a-button>
              <a href="/测试表格_全面功能体验.xlsx" download="测试表格_全面功能体验.xlsx" @click.stop>
                <a-button size="large" class="secondary-btn">
                  <template #icon><DownloadOutlined /></template>
                  下载实测 Excel 样表
                </a-button>
              </a>
            </div>
          </div>
        </a-upload-dragger>

        <!-- 6 大解决真实生活痛点的神器卡片 -->
        <div class="feature-cards-grid">
          <div class="feature-card" @click="loadDemoData">
            <div class="card-icon">🎯</div>
            <div class="card-content">
              <h3>乱文本一键提取 (正则)</h3>
              <p>从整段客服留言/收件信息中，1 秒提取手机号、身份证、邮箱为新列。</p>
            </div>
          </div>

          <div class="feature-card" @click="loadDemoData">
            <div class="card-icon">🧩</div>
            <div class="card-content">
              <h3>批量合并与拆分</h3>
              <p>“省+市+区”多列一键合并拼字段；或单列按“-”或“/”拆成多列。</p>
            </div>
          </div>

          <div class="feature-card" @click="loadDemoData">
            <div class="card-icon">🧹</div>
            <div class="card-content">
              <h3>剔除所有纯空行 / 空列</h3>
              <p>一键自动清除表格各处夹杂的空白行与空列，无需烦琐筛选删除。</p>
            </div>
          </div>

          <div class="feature-card" @click="loadDemoData">
            <div class="card-icon">✨</div>
            <div class="card-content">
              <h3>智能一键去重</h3>
              <p>按指定列（如依据手机号、身份证号）或全行重复项，秒级过滤重复。</p>
            </div>
          </div>

          <div class="feature-card" @click="loadDemoData">
            <div class="card-icon">🔤</div>
            <div class="card-content">
              <h3>全角标点/数字转半角</h3>
              <p>清洗中文逗号（，）、全角括号（）、全角数字，避免系统导入报错。</p>
            </div>
          </div>

          <div class="feature-card" @click="loadDemoData">
            <div class="card-icon">💰</div>
            <div class="card-content">
              <h3>金额一键转人民币大写</h3>
              <p>12500.50 ➔ 壹万贰仟伍佰元伍角整，财务报销、合同制单刚需神器。</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. 数据工作区 -->
    <div v-else class="workspace-layout">
      <!-- 3.1 多 Sheet 标签页切换 -->
      <div class="sheet-tabs-bar" v-if="sheetNames.length > 1">
        <span class="sheet-label">工作表 (Sheets):</span>
        <div class="sheet-pills">
          <button
            v-for="sName in sheetNames"
            :key="sName"
            class="sheet-pill"
            :class="{ active: currentSheet === sName }"
            @click="switchSheet(sName)"
          >
            {{ sName }}
          </button>
        </div>
      </div>

      <!-- 3.2 批处理控制台 (组件化) -->
      <ExcelBatchPanel
        :available-columns="availableColumns"
        :row-count="currentRows.length"
        :dict-rules-count="parsedDictRules.length"
        @apply-extract="onApplyExtract"
        @apply-merge="onApplyMerge"
        @apply-split="onApplySplit"
        @apply-clean-empty="onApplyCleanEmpty"
        @apply-dedup="onApplyDedup"
        @apply-type="onApplyType"
        @apply-map="onApplyMap"
        @apply-search="onApplySearch"
        @open-dict-modal="showDictModal = true"
      />

      <!-- 3.3 数据表格与工具栏 (组件化) -->
      <ExcelDataTable
        :rows="currentRows"
        :display-columns="displayColumns"
        :force-text-cols="forceTextCols"
        :modified-cells="currentModifiedCells"
        v-model:has-header-row="hasHeaderRow"
        v-model:show-modified-highlight="showModifiedHighlight"
        @quick-action="onColumnQuickAction"
        @cell-edit="onCellEdit"
        @clean-empty="onApplyCleanEmpty"
      />
    </div>

    <!-- 4. 模态框组件 (剪贴板粘贴与字典规则) -->
    <ExcelPasteModal
      v-model:open="showPasteModal"
      @confirm-paste="parseAndLoadText"
    />

    <ExcelDictModal
      v-model:open="showDictModal"
      v-model:raw-input="dictRawInput"
    />
  </div>
</template>

<script>
import { Upload, Button, message } from "ant-design-vue";
import {
  FileExcelOutlined,
  UploadOutlined,
  CopyOutlined,
  DownloadOutlined,
} from "@ant-design/icons-vue";
import * as XLSX from "xlsx";

// 引入模块化子组件 (Options API)
import ExcelHeader from "../../components/excel/ExcelHeader.vue";
import ExcelBatchPanel from "../../components/excel/ExcelBatchPanel.vue";
import ExcelDataTable from "../../components/excel/ExcelDataTable.vue";
import ExcelPasteModal from "../../components/excel/ExcelPasteModal.vue";
import ExcelDictModal from "../../components/excel/ExcelDictModal.vue";

// 引入底层纯函数式 (Pure FP) 算法引擎
import {
  getExcelColName,
  executeSearchAndReplace,
  executeTypeConversion,
  executeDataMapping,
  extractInfoFromColumn,
  mergeMultipleColumns,
  splitSingleColumn,
  cleanEmptyRowsAndCols,
  deduplicateDataRows,
  exportToXlsxFile,
  exportToCsvFile,
  getSampleExcelData,
} from "../../utils/excelTransformer.js";

export default {
  name: "ExcelTransformer",
  components: {
    ExcelHeader,
    ExcelBatchPanel,
    ExcelDataTable,
    ExcelPasteModal,
    ExcelDictModal,
    "a-upload-dragger": Upload.Dragger,
    "a-button": Button,
    FileExcelOutlined,
    UploadOutlined,
    CopyOutlined,
    DownloadOutlined,
  },
  data() {
    return {
      // 工作表数据：纯不可变二维数组映射 { [sheetName]: Array<Array<any>> }
      workbookData: {},
      sheetNames: [],
      currentSheet: "Sheet1",
      // 标记指定列在导出为 Excel 时强制作为纯文本写入 (杜绝科学计数法与尾数丢失)
      forceTextCols: new Set(),

      // 操作历史栈 (纯快照管理，用于 Undo / Redo)
      history: [],
      historyIndex: -1,
      // 记录已修改过的单元格坐标："r_c"
      currentModifiedCells: new Set(),

      // 表格基础开关
      hasHeaderRow: true,
      showModifiedHighlight: true,

      // 弹窗状态
      showPasteModal: false,
      showDictModal: false,
      dictRawInput: "1 => 待支付\n2 => 已发货\n3 => 已完成",

      // 复制状态
      copied: false,
      copyTimer: null,
    };
  },
  computed: {
    hasData() {
      return (
        this.sheetNames.length > 0 &&
        this.workbookData[this.currentSheet] &&
        this.workbookData[this.currentSheet].length > 0
      );
    },
    currentRows() {
      if (!this.hasData) return [];
      return this.workbookData[this.currentSheet] || [];
    },
    columnCount() {
      if (!this.currentRows.length) return 0;
      let maxCols = 0;
      for (const row of this.currentRows) {
        if (row && row.length > maxCols) maxCols = row.length;
      }
      return maxCols;
    },
    availableColumns() {
      const cols = [];
      const headerRow = this.hasHeaderRow && this.currentRows.length > 0 ? this.currentRows[0] : null;
      for (let i = 0; i < this.columnCount; i++) {
        const letter = getExcelColName(i);
        const name = headerRow && headerRow[i] ? String(headerRow[i]) : "";
        cols.push({
          index: i,
          letter,
          name,
          label: name ? `${letter}列 - ${name}` : `${letter}列`,
        });
      }
      return cols;
    },
    displayColumns() {
      const cols = [];
      const headerRow = this.hasHeaderRow && this.currentRows.length > 0 ? this.currentRows[0] : null;
      for (let i = 0; i < this.columnCount; i++) {
        cols.push({
          index: i,
          name: headerRow && headerRow[i] ? String(headerRow[i]) : "",
        });
      }
      return cols;
    },
    parsedDictRules() {
      if (!this.dictRawInput) return [];
      const lines = this.dictRawInput.split("\n");
      const rules = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) continue;
        const parts = trimmed.split(/=>|->|=|:/);
        if (parts.length >= 2) {
          rules.push({
            from: parts[0].trim(),
            to: parts.slice(1).join("=>").trim(),
          });
        }
      }
      return rules;
    },
  },
  mounted() {
    window.addEventListener("paste", this.handleGlobalPaste);
    window.addEventListener("keydown", this.handleGlobalKeydown);
  },
  beforeUnmount() {
    window.removeEventListener("paste", this.handleGlobalPaste);
    window.removeEventListener("keydown", this.handleGlobalKeydown);
  },
  methods: {
    // 历史管理：保存快照
    pushHistoryState(description = "修改数据") {
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      const snapshot = JSON.parse(JSON.stringify(this.workbookData));
      const modifiedCellsCopy = new Set(this.currentModifiedCells);

      this.history.push({
        data: snapshot,
        modifiedCells: modifiedCellsCopy,
        description,
      });

      if (this.history.length > 25) {
        this.history.shift();
      } else {
        this.historyIndex++;
      }
    },

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        const state = this.history[this.historyIndex];
        this.workbookData = JSON.parse(JSON.stringify(state.data));
        this.currentModifiedCells = new Set(state.modifiedCells);
        message.info(`已撤销: ${state.description || ""}`);
      }
    },

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        const state = this.history[this.historyIndex];
        this.workbookData = JSON.parse(JSON.stringify(state.data));
        this.currentModifiedCells = new Set(state.modifiedCells);
        message.info(`已重做: ${state.description || ""}`);
      }
    },

    handleGlobalKeydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        this.redo();
      }
    },

    handleGlobalPaste(e) {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "textarea") return;

      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const text = clipboardData.getData("text");
      if (text && (text.includes("\t") || text.includes("\n"))) {
        e.preventDefault();
        this.parseAndLoadText(text, "剪贴板表格");
      }
    },

    loadDemoData() {
      const sample = getSampleExcelData();
      this.workbookData = {
        Sheet1: sample,
      };
      this.sheetNames = ["Sheet1"];
      this.currentSheet = "Sheet1";
      this.forceTextCols = new Set([0, 7]);
      this.currentModifiedCells = new Set();
      this.history = [];
      this.historyIndex = -1;
      this.pushHistoryState("载入演示数据");
      message.success("已载入含收件人混杂文本、全角标点、金额数字的演示数据！", 1.5);
    },

    handleFileUpload(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            type: "array",
            cellDates: true,
            raw: false,
          });

          const wbData = {};
          workbook.SheetNames.forEach((name) => {
            const ws = workbook.Sheets[name];
            const sheetRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
            wbData[name] = sheetRows;
          });

          this.workbookData = wbData;
          this.sheetNames = workbook.SheetNames;
          this.currentSheet = workbook.SheetNames[0] || "Sheet1";
          this.forceTextCols.clear();
          this.currentModifiedCells.clear();
          this.history = [];
          this.historyIndex = -1;
          this.pushHistoryState(`导入文件: ${file.name}`);
          message.success(`成功导入表格：${file.name}，包含 ${this.sheetNames.length} 个工作表`);
        } catch (err) {
          message.error("解析文件失败，请确保是合法的 Excel 或 CSV 文件！");
        }
      };
      reader.readAsArrayBuffer(file);
      return false;
    },

    parseAndLoadText(text, sourceDesc = "粘贴数据") {
      try {
        const rows = text
          .trim()
          .split(/\r\n|\r|\n/)
          .map((line) => line.split("\t"));

        this.workbookData = {
          Sheet1: rows,
        };
        this.sheetNames = ["Sheet1"];
        this.currentSheet = "Sheet1";
        this.forceTextCols.clear();
        this.currentModifiedCells.clear();
        this.history = [];
        this.historyIndex = -1;
        this.pushHistoryState(sourceDesc);
        message.success(`已成功载入 ${rows.length} 行数据！`);
      } catch (e) {
        message.error("解析粘贴内容失败！");
      }
    },

    clearAllData() {
      this.workbookData = {};
      this.sheetNames = [];
      this.currentModifiedCells.clear();
      this.history = [];
      this.historyIndex = -1;
      message.info("已清空当前所有数据");
    },

    switchSheet(sheetName) {
      this.currentSheet = sheetName;
    },

    // 纯 FP 事件回调 1: 智能提取
    onApplyExtract(payload) {
      const res = extractInfoFromColumn(this.currentRows, {
        ...payload,
        hasHeaderRow: this.hasHeaderRow,
      });

      if (payload.extractType === "phone" || payload.extractType === "idcard") {
        this.forceTextCols.add(res.newColIndex);
      }

      this.workbookData[this.currentSheet] = res.newRows;
      this.pushHistoryState(`智能提取 [${payload.extractType}]: ${res.count} 项`);
      message.success(`提取完成！共提取出 ${res.count} 项数据`);
    },

    // 纯 FP 事件回调 2: 合并多列
    onApplyMerge(payload) {
      const res = mergeMultipleColumns(this.currentRows, {
        ...payload,
        hasHeaderRow: this.hasHeaderRow,
      });

      this.workbookData[this.currentSheet] = res.newRows;
      this.pushHistoryState(`合并多列: ${payload.newColName}`);
      message.success(`合并成功！共合并处理 ${res.count} 行数据`);
    },

    // 纯 FP 事件回调 2: 拆分列
    onApplySplit(payload) {
      const res = splitSingleColumn(this.currentRows, {
        ...payload,
        hasHeaderRow: this.hasHeaderRow,
      });

      if (res.maxParts <= 1) {
        message.warning(`该列数据中未找到指定分隔符 "${payload.delimiter}"，无需拆分！`);
        return;
      }

      this.workbookData[this.currentSheet] = res.newRows;
      this.pushHistoryState(`拆分列: 拆为 ${res.maxParts} 列`);
      message.success(`拆分完成！已成功拆分为 ${res.maxParts} 列`);
    },

    // 纯 FP 事件回调 3: 清除空行/空列
    onApplyCleanEmpty({ removeRows = true, removeCols = true }) {
      const res = cleanEmptyRowsAndCols(this.currentRows, {
        removeRows,
        removeCols,
        hasHeaderRow: this.hasHeaderRow,
      });

      if (res.removedRowsCount === 0 && res.removedColsCount === 0) {
        message.info("表格非常干净，没有发现多余的纯空白行或空白列！");
        return;
      }

      this.workbookData[this.currentSheet] = res.newRows;
      this.pushHistoryState(`清除空白: 移除了 ${res.removedRowsCount} 个空行，${res.removedColsCount} 个空列`);
      message.success(`清理完成！已移除 ${res.removedRowsCount} 个纯空行，${res.removedColsCount} 个纯空列`);
    },

    // 纯 FP 事件回调 3: 智能去重
    onApplyDedup(payload) {
      const res = deduplicateDataRows(this.currentRows, {
        ...payload,
        hasHeaderRow: this.hasHeaderRow,
      });

      if (res.duplicateCount === 0) {
        message.info("未发现任何重复行！");
        return;
      }

      this.workbookData[this.currentSheet] = res.newRows;
      this.pushHistoryState(`一键去重: 移除了 ${res.duplicateCount} 条重复数据`);
      message.success(`去重成功！已自动剔除 ${res.duplicateCount} 条重复记录`);
    },

    // 纯 FP 事件回调 4: 类型转换
    onApplyType(payload) {
      const targetRow = this.hasHeaderRow ? payload.targetRow : payload.targetRow - 1;
      const res = executeTypeConversion(this.currentRows, {
        scopeType: payload.scopeType,
        targetIndex: payload.scopeType === "column" ? payload.targetCol : targetRow,
        convertType: payload.convertType,
        dateFormat: payload.dateFormat,
        decimals: payload.decimals,
      });

      if (payload.scopeType === "column" && (payload.convertType === "toText" || payload.convertType === "toRmb")) {
        this.forceTextCols.add(payload.targetCol);
      }

      this.workbookData[this.currentSheet] = res.newRows;
      res.modifiedCells.forEach((c) => this.currentModifiedCells.add(c));
      this.pushHistoryState(`类型转换: ${payload.convertType} (${res.count}处)`);
      message.success(`转换完成！共处理 ${res.count} 个单元格`);
    },

    // 纯 FP 事件回调 5: Map与运算
    onApplyMap(payload) {
      const res = executeDataMapping(this.currentRows, {
        scopeType: "column",
        targetIndex: payload.targetCol,
        mapType: payload.mapSubType,
        prefix: payload.prefix,
        suffix: payload.suffix,
        skipEmpty: payload.skipEmpty,
        mathOperator: payload.mathOperator,
        mathOperand: payload.mathOperand,
        skipNonNumeric: payload.skipNonNumeric,
        dictRules: this.parsedDictRules,
        dictUnmatched: payload.dictUnmatched,
        customExpression: payload.customExpression,
      });

      this.workbookData[this.currentSheet] = res.newRows;
      res.modifiedCells.forEach((c) => this.currentModifiedCells.add(c));

      let desc = `Map转换: ${payload.mapSubType}`;
      if (payload.mapSubType === "concat") {
        desc = `拼接后缀: +${payload.suffix || ""}`;
      } else if (payload.mapSubType === "math") {
        desc = `四则运算: ${payload.mathOperator}${payload.mathOperand}`;
      }

      this.pushHistoryState(desc);
      message.success(`映射/计算完成！共修改 ${res.count} 个单元格`);
    },

    // 纯 FP 事件回调 6: 搜索与替换
    onApplySearch(payload) {
      const targetRow = this.hasHeaderRow ? payload.targetRow : payload.targetRow - 1;
      const res = executeSearchAndReplace(this.currentRows, {
        scopeType: payload.scopeType,
        targetIndex: payload.scopeType === "column" ? payload.targetCol : targetRow,
        searchVal: payload.searchVal,
        replaceVal: payload.replaceVal,
        matchMode: payload.matchMode,
        caseSensitive: payload.caseSensitive,
      });

      if (res.count === 0) {
        message.info("未找到匹配的内容");
        return;
      }

      this.workbookData[this.currentSheet] = res.newRows;
      res.modifiedCells.forEach((c) => this.currentModifiedCells.add(c));
      this.pushHistoryState(`搜索替换: "${payload.searchVal}" ➔ "${payload.replaceVal}" (${res.count}处)`);
      message.success(`替换成功！共修改了 ${res.count} 处单元格`);
    },

    // 表头齿轮快捷操作
    onColumnQuickAction({ colIndex, actionKey }) {
      const rows = this.currentRows;
      const colLetter = getExcelColName(colIndex);

      if (actionKey === "extractPhone") {
        this.onApplyExtract({
          colIndex,
          extractType: "phone",
          newColName: "提取手机号",
          outputMode: "newCol",
        });
        return;
      }
      if (actionKey === "extractIdCard") {
        this.onApplyExtract({
          colIndex,
          extractType: "idcard",
          newColName: "提取身份证",
          outputMode: "newCol",
        });
        return;
      }
      if (actionKey === "extractEmail") {
        this.onApplyExtract({
          colIndex,
          extractType: "email",
          newColName: "提取邮箱",
          outputMode: "newCol",
        });
        return;
      }
      if (actionKey === "dedupThisCol") {
        this.onApplyDedup({
          scope: "column",
          colIndex,
          ignoreEmpty: true,
        });
        return;
      }
      if (actionKey === "copyCol") {
        const colValues = rows.map((r) => r[colIndex] ?? "").join("\n");
        navigator.clipboard.writeText(colValues).then(() => {
          message.success(`已复制 ${colLetter} 列的所有数据到剪贴板！`);
        });
        return;
      }

      let res = null;
      switch (actionKey) {
        case "toRmb":
          res = executeTypeConversion(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            convertType: "toRmb",
          });
          this.forceTextCols.add(colIndex);
          break;
        case "toHalfWidth":
          res = executeTypeConversion(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            convertType: "toHalfWidth",
          });
          break;
        case "toText":
          res = executeTypeConversion(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            convertType: "toText",
          });
          this.forceTextCols.add(colIndex);
          break;
        case "toNumber":
          res = executeTypeConversion(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            convertType: "toNumber",
          });
          this.forceTextCols.delete(colIndex);
          break;
        case "addSuffix1":
          res = executeDataMapping(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            mapType: "concat",
            suffix: "1",
            skipEmpty: true,
          });
          break;
        case "mathPlus1":
          res = executeDataMapping(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            mapType: "math",
            mathOperator: "+",
            mathOperand: 1,
            skipNonNumeric: true,
          });
          break;
        case "trim":
          res = executeTypeConversion(rows, {
            scopeType: "column",
            targetIndex: colIndex,
            convertType: "trim",
          });
          break;
      }

      if (res) {
        this.workbookData[this.currentSheet] = res.newRows;
        res.modifiedCells.forEach((c) => this.currentModifiedCells.add(c));
        this.pushHistoryState(`列快捷操作: ${actionKey}`);
        message.success(`已完成快速操作！处理了 ${res.count} 处`);
      }
    },

    // 单元格行内编辑
    onCellEdit({ r, c, value }) {
      const rows = this.currentRows;
      if (rows[r] && rows[r][c] !== value) {
        const newRows = rows.map((row, rowIdx) => {
          if (rowIdx !== r) return row;
          const nextRow = [...row];
          nextRow[c] = value;
          return nextRow;
        });
        this.workbookData[this.currentSheet] = newRows;
        this.currentModifiedCells.add(`${r}_${c}`);
        this.pushHistoryState(`手工编辑单元格 [${r + 1}, ${getExcelColName(c)}]`);
      }
    },

    copyTableToClipboard() {
      if (!this.hasData) return;
      const rows = this.currentRows;
      const tsv = rows.map((r) => r.join("\t")).join("\n");
      navigator.clipboard.writeText(tsv).then(() => {
        this.copied = true;
        message.success("已复制完整表格到剪贴板，可直接在本地 Excel 中按 Ctrl+V 粘贴！");
        clearTimeout(this.copyTimer);
        this.copyTimer = setTimeout(() => {
          this.copied = false;
        }, 2000);
      });
    },

    handleExport(key) {
      if (!this.hasData) return;
      if (key === "xlsx") {
        const textColsMap = {};
        this.sheetNames.forEach((s) => {
          textColsMap[s] = this.forceTextCols;
        });
        exportToXlsxFile(this.workbookData, "转换后数据.xlsx", textColsMap);
        message.success("已成功生成并下载 Excel (.xlsx) 文件！");
      } else if (key === "csv") {
        exportToCsvFile(this.currentRows, `${this.currentSheet}.csv`);
        message.success("已成功生成并下载 CSV 文件！");
      }
    },
  },
};
</script>

<style scoped lang="scss">
.excel-transformer-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #f8fafc;
  color: #1e293b;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* 空状态页面样式 */
.empty-upload-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px 24px;

  .upload-box-wrapper {
    max-width: 980px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .excel-dragger {
    background: #ffffff;
    border: 2px dashed #cbd5e1;
    border-radius: 18px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);

    &:hover {
      border-color: #10b981;
      background: #f0fdf4;
      transform: translateY(-2px);
    }

    .dragger-body {
      padding: 40px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .dragger-icon-circle {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      background: #ecfdf5;
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 34px;
      margin-bottom: 16px;
    }

    .dragger-title {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin: 0 0 8px 0;
    }

    .dragger-desc {
      font-size: 14px;
      color: #64748b;
      margin: 0 0 24px 0;

      code {
        background: #f1f5f9;
        padding: 2px 6px;
        border-radius: 4px;
        color: #0f172a;
        font-weight: 600;
      }
    }

    .dragger-actions {
      display: flex;
      gap: 16px;

      .primary-upload-btn {
        background: #10b981;
        border-color: #10b981;
        border-radius: 10px;
        &:hover {
          background: #059669;
          border-color: #059669;
        }
      }

      .secondary-btn {
        border-radius: 10px;
      }
    }
  }

  .feature-cards-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    .feature-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      display: flex;
      gap: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);

      &:hover {
        border-color: #10b981;
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(16, 185, 129, 0.12);
      }

      .card-icon {
        font-size: 26px;
        line-height: 1;
      }

      .card-content {
        h3 {
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px 0;
        }

        p {
          font-size: 12px;
          color: #64748b;
          line-height: 1.45;
          margin: 0;
        }
      }
    }
  }
}

/* 工作区容器 */
.workspace-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 14px 24px 32px 24px;
  gap: 14px;
}

/* Sheet Tabs */
.sheet-tabs-bar {
  display: flex;
  align-items: center;
  gap: 12px;

  .sheet-label {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
  }

  .sheet-pills {
    display: flex;
    gap: 8px;

    .sheet-pill {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #475569;
      padding: 5px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &.active {
        background: #10b981;
        border-color: #10b981;
        color: #ffffff;
      }

      &:hover:not(.active) {
        border-color: #94a3b8;
        background: #f1f5f9;
      }
    }
  }
}
</style>
