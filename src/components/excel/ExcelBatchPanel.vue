<!-- src/components/excel/ExcelBatchPanel.vue -->
<template>
  <div class="batch-control-panel">
    <!-- 顶部 6 大模式切换 Pills -->
    <div class="panel-mode-tabs">
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'extract' }"
        @click="activeMode = 'extract'"
      >
        🎯 1. 乱文本智能提取
      </button>
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'mergeSplit' }"
        @click="activeMode = 'mergeSplit'"
      >
        🧩 2. 合并 / 拆分列
      </button>
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'cleanDedup' }"
        @click="activeMode = 'cleanDedup'"
      >
        🧹 3. 删空行 / 去重
      </button>
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'type' }"
        @click="activeMode = 'type'"
      >
        🔄 4. 格式与转换 (大写/全角)
      </button>
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'map' }"
        @click="activeMode = 'map'"
      >
        ⚡ 5. Map与运算 (加1/拼后缀)
      </button>
      <button
        class="mode-tab-btn"
        :class="{ active: activeMode === 'search' }"
        @click="activeMode = 'search'"
      >
        🔍 6. 搜索与替换
      </button>
    </div>

    <!-- 模式 1: 乱文本智能提取 -->
    <div v-if="activeMode === 'extract'" class="tool-settings-row">
      <div class="setting-item">
        <label class="setting-label">目标原始列</label>
        <a-select v-model:value="extractTargetCol" style="width: 170px" show-search option-filter-prop="label">
          <a-select-option
            v-for="col in availableColumns"
            :key="col.index"
            :value="col.index"
            :label="col.label"
          >
            {{ col.label }}
          </a-select-option>
        </a-select>
      </div>

      <div class="setting-item">
        <label class="setting-label">提取内容</label>
        <a-select v-model:value="extractType" style="width: 190px">
          <a-select-option value="phone">📱 手机号 (11位大陆号码)</a-select-option>
          <a-select-option value="idcard">🪪 身份证号 (18位带校验位)</a-select-option>
          <a-select-option value="email">📧 电子邮箱 (Email)</a-select-option>
          <a-select-option value="number">🔢 纯数字 / 浮点数</a-select-option>
          <a-select-option value="money">💰 金额数值 (带￥/$)</a-select-option>
          <a-select-option value="url">🔗 网页链接 (URL)</a-select-option>
          <a-select-option value="custom">⚙️ 自定义正则表达式</a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="extractType === 'custom'">
        <label class="setting-label">正则表达式 (如 \d{6})</label>
        <a-input v-model:value="extractCustomRegex" placeholder="输入正则表达式..." style="width: 170px" />
      </div>

      <div class="setting-item">
        <label class="setting-label">输出模式</label>
        <a-radio-group v-model:value="extractOutputMode" button-style="solid">
          <a-radio-button value="newCol">插入为新列</a-radio-button>
          <a-radio-button value="replace">直接覆盖原列</a-radio-button>
        </a-radio-group>
      </div>

      <div class="setting-item" v-if="extractOutputMode === 'newCol'">
        <label class="setting-label">新列标题</label>
        <a-input v-model:value="extractNewColName" placeholder="例如: 手机号" style="width: 140px" />
      </div>

      <div class="setting-actions">
        <a-button type="primary" @click="handleExtractSubmit">
          <template #icon><ThunderboltOutlined /></template>
          一键提取输出
        </a-button>
      </div>
    </div>

    <!-- 模式 2: 合并 / 拆分列 -->
    <div v-if="activeMode === 'mergeSplit'" class="tool-settings-row">
      <div class="setting-item">
        <label class="setting-label">操作类型</label>
        <a-radio-group v-model:value="mergeSplitType" button-style="solid">
          <a-radio-button value="merge">批量合并多列 (拼字段)</a-radio-button>
          <a-radio-button value="split">按符号拆分单列为多列</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 合并设置 -->
      <template v-if="mergeSplitType === 'merge'">
        <div class="setting-item">
          <label class="setting-label">选择要合并的列 (多选)</label>
          <a-select
            v-model:value="mergeSelectedCols"
            mode="multiple"
            placeholder="请选择两列或更多..."
            style="min-width: 240px; max-width: 380px"
          >
            <a-select-option
              v-for="col in availableColumns"
              :key="col.index"
              :value="col.index"
            >
              {{ col.label }}
            </a-select-option>
          </a-select>
        </div>

        <div class="setting-item">
          <label class="setting-label">连接符号</label>
          <a-input v-model:value="mergeDelimiter" placeholder="如 - 或 空格" style="width: 100px" />
        </div>

        <div class="setting-item">
          <label class="setting-label">合并后列名</label>
          <a-input v-model:value="mergeColName" placeholder="例如: 完整地址" style="width: 130px" />
        </div>

        <div class="setting-item checkbox-item">
          <a-checkbox v-model:checked="mergeKeepOriginal">保留原有列</a-checkbox>
        </div>

        <div class="setting-actions">
          <a-button type="primary" @click="handleMergeSubmit" :disabled="mergeSelectedCols.length < 2">
            <template #icon><SwapOutlined /></template>
            立即合并列
          </a-button>
        </div>
      </template>

      <!-- 拆分设置 -->
      <template v-if="mergeSplitType === 'split'">
        <div class="setting-item">
          <label class="setting-label">选择要拆分的列</label>
          <a-select v-model:value="splitTargetCol" style="width: 170px" show-search option-filter-prop="label">
            <a-select-option
              v-for="col in availableColumns"
              :key="col.index"
              :value="col.index"
              :label="col.label"
            >
              {{ col.label }}
            </a-select-option>
          </a-select>
        </div>

        <div class="setting-item">
          <label class="setting-label">拆分分隔符</label>
          <a-input v-model:value="splitDelimiter" placeholder="如 - 或 / 或 ," style="width: 110px" />
        </div>

        <div class="setting-item checkbox-item">
          <a-checkbox v-model:checked="splitKeepOriginal">保留原列</a-checkbox>
        </div>

        <div class="setting-actions">
          <a-button type="primary" @click="handleSplitSubmit">
            <template #icon><SwapOutlined /></template>
            立即拆分列
          </a-button>
        </div>
      </template>
    </div>

    <!-- 模式 3: 删空行 / 空列 / 智能去重 -->
    <div v-if="activeMode === 'cleanDedup'" class="tool-settings-row">
      <div class="setting-item">
        <label class="setting-label">快捷清理功能</label>
        <a-space>
          <a-button @click="$emit('apply-clean-empty', { removeRows: true, removeCols: false })" class="clean-action-btn">
            <template #icon><DeleteOutlined /></template>
            一键剔除纯空白行
          </a-button>
          <a-button @click="$emit('apply-clean-empty', { removeRows: false, removeCols: true })" class="clean-action-btn">
            <template #icon><DeleteOutlined /></template>
            一键剔除纯空白列
          </a-button>
          <a-button @click="$emit('apply-clean-empty', { removeRows: true, removeCols: true })" class="clean-action-btn highlight-btn">
            <template #icon><ClearOutlined /></template>
            同时剔除空行与空列
          </a-button>
        </a-space>
      </div>

      <div class="setting-divider"></div>

      <!-- 智能去重 -->
      <div class="setting-item">
        <label class="setting-label">去重依据范围</label>
        <a-select v-model:value="dedupScope" style="width: 150px">
          <a-select-option value="column">依据指定某一列</a-select-option>
          <a-select-option value="all">整行数据完全相同</a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="dedupScope === 'column'">
        <label class="setting-label">依据列 (如手机号/身份证)</label>
        <a-select v-model:value="dedupTargetCol" style="width: 170px" show-search option-filter-prop="label">
          <a-select-option
            v-for="col in availableColumns"
            :key="col.index"
            :value="col.index"
            :label="col.label"
          >
            {{ col.label }}
          </a-select-option>
        </a-select>
      </div>

      <div class="setting-item checkbox-item">
        <a-checkbox v-model:checked="dedupIgnoreEmpty">保留空值行 (安全保护)</a-checkbox>
      </div>

      <div class="setting-actions">
        <a-button type="primary" @click="handleDedupSubmit">
          <template #icon><CheckOutlined /></template>
          执行一键去重
        </a-button>
      </div>
    </div>

    <!-- 模式 4: 数据格式与类型转换 -->
    <div v-if="activeMode === 'type'" class="tool-settings-row">
      <div class="setting-item">
        <label class="setting-label">目标范围</label>
        <a-select v-model:value="typeScope" style="width: 130px">
          <a-select-option value="column">指定某一列</a-select-option>
          <a-select-option value="all">全工作表</a-select-option>
          <a-select-option value="row">指定某一行</a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="typeScope === 'column'">
        <label class="setting-label">选择列</label>
        <a-select v-model:value="typeTargetCol" style="width: 170px" show-search option-filter-prop="label">
          <a-select-option
            v-for="col in availableColumns"
            :key="col.index"
            :value="col.index"
            :label="col.label"
          >
            {{ col.label }}
          </a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="typeScope === 'row'">
        <label class="setting-label">行号 (从1开始)</label>
        <a-input-number v-model:value="typeTargetRow" :min="1" :max="rowCount" style="width: 90px" />
      </div>

      <div class="setting-item">
        <label class="setting-label">转换操作</label>
        <a-select v-model:value="typeConvertType" style="width: 240px">
          <a-select-option value="toText">🏷️ 长数字 ➔ 纯文本 (防失真/防科学计数)</a-select-option>
          <a-select-option value="toRmb">💰 金额数字 ➔ 中文大写 (壹万贰仟元)</a-select-option>
          <a-select-option value="toHalfWidth">🔤 标点与数字全角 ➔ 半角 (录入救星)</a-select-option>
          <a-select-option value="toNumber">🔢 文本 ➔ 纯数值 (清除逗号/货币)</a-select-option>
          <a-select-option value="trim">✂️ 去除首尾空格 (Trim)</a-select-option>
          <a-select-option value="trimAll">🧹 清除全部空格与换行</a-select-option>
          <a-select-option value="dateFormat">📅 日期标准化</a-select-option>
          <a-select-option value="decimals">🪙 保留小数位数</a-select-option>
          <a-select-option value="thousands">💰 添加千分位逗号</a-select-option>
          <a-select-option value="upper">🔠 转全大写 (UPPERCASE)</a-select-option>
          <a-select-option value="lower">🔡 转全小写 (lowercase)</a-select-option>
          <a-select-option value="titleCase">🔤 转首字母大写</a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="typeConvertType === 'dateFormat'">
        <label class="setting-label">目标格式</label>
        <a-select v-model:value="typeDateFormat" style="width: 170px">
          <a-select-option value="YYYY-MM-DD">YYYY-MM-DD</a-select-option>
          <a-select-option value="YYYY/MM/DD">YYYY/MM/DD</a-select-option>
          <a-select-option value="YYYY-MM-DD HH:mm:ss">YYYY-MM-DD HH:mm:ss</a-select-option>
          <a-select-option value="YYYY年MM月DD日">YYYY年MM月DD日</a-select-option>
          <a-select-option value="YYYYMMDD">YYYYMMDD</a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="typeConvertType === 'decimals'">
        <label class="setting-label">小数位数</label>
        <a-input-number v-model:value="typeDecimals" :min="0" :max="10" style="width: 80px" />
      </div>

      <div class="setting-actions">
        <a-button type="primary" @click="handleTypeSubmit">
          <template #icon><SwapOutlined /></template>
          立即转换
        </a-button>
      </div>
    </div>

    <!-- 模式 5: 数据 Map 与批量计算 -->
    <div v-if="activeMode === 'map'" class="tool-settings-row">
      <div class="setting-item">
        <label class="setting-label">目标列</label>
        <a-select v-model:value="mapTargetCol" style="width: 170px" show-search option-filter-prop="label">
          <a-select-option
            v-for="col in availableColumns"
            :key="col.index"
            :value="col.index"
            :label="col.label"
          >
            {{ col.label }}
          </a-select-option>
        </a-select>
      </div>

      <div class="setting-item">
        <label class="setting-label">运算类型</label>
        <a-radio-group v-model:value="mapSubType" button-style="solid">
          <a-radio-button value="concat">拼接前后缀 (如加数字1)</a-radio-button>
          <a-radio-button value="math">四则运算 (加减乘除)</a-radio-button>
          <a-radio-button value="dict">字典映射</a-radio-button>
          <a-radio-button value="custom">JS 表达式</a-radio-button>
        </a-radio-group>
      </div>

      <!-- 5.1 拼接前后缀 -->
      <template v-if="mapSubType === 'concat'">
        <div class="setting-item">
          <label class="setting-label">添加前缀</label>
          <a-input v-model:value="mapPrefix" placeholder="例如 NO." style="width: 110px" allow-clear />
        </div>
        <div class="setting-item">
          <label class="setting-label">添加后缀</label>
          <a-input v-model:value="mapSuffix" placeholder="例如 1 或 元" style="width: 110px" allow-clear />
        </div>
        <div class="setting-item checkbox-item">
          <a-checkbox v-model:checked="mapSkipEmpty">跳过空单元格</a-checkbox>
        </div>
        <div class="preview-tag-box">
          <span class="preview-text">效果预览: "A10" ➔ <strong>"{{ mapPrefix }}A10{{ mapSuffix }}"</strong></span>
        </div>
      </template>

      <!-- 5.2 四则运算 -->
      <template v-if="mapSubType === 'math'">
        <div class="setting-item">
          <label class="setting-label">运算符</label>
          <a-select v-model:value="mapMathOperator" style="width: 90px">
            <a-select-option value="+">+ (加)</a-select-option>
            <a-select-option value="-">- (减)</a-select-option>
            <a-select-option value="*">× (乘)</a-select-option>
            <a-select-option value="/">÷ (除)</a-select-option>
            <a-select-option value="round">四舍五入</a-select-option>
          </a-select>
        </div>
        <div class="setting-item" v-if="mapMathOperator !== 'round'">
          <label class="setting-label">计算数值</label>
          <a-input-number v-model:value="mapMathOperand" style="width: 90px" />
        </div>
        <div class="setting-item checkbox-item">
          <a-checkbox v-model:checked="mapSkipNonNumeric">跳过非纯数字</a-checkbox>
        </div>
        <div class="preview-tag-box">
          <span class="preview-text">
            预览: 100 ➔ <strong>{{ getMathPreview(100) }}</strong>
          </span>
        </div>
      </template>

      <!-- 5.3 字典映射 -->
      <template v-if="mapSubType === 'dict'">
        <div class="setting-item">
          <label class="setting-label">映射规则 (单行: 原值=>新值)</label>
          <a-button size="small" @click="$emit('open-dict-modal')" class="dict-edit-btn">
            配置规则表 ({{ dictRulesCount }}条)
          </a-button>
        </div>
        <div class="setting-item">
          <label class="setting-label">未匹配项</label>
          <a-select v-model:value="mapDictUnmatched" style="width: 120px">
            <a-select-option value="keep">保持原值</a-select-option>
            <a-select-option value="empty">置为空</a-select-option>
          </a-select>
        </div>
      </template>

      <!-- 5.4 自定义 JS 表达式 -->
      <template v-if="mapSubType === 'custom'">
        <div class="setting-item">
          <label class="setting-label">JS 表达式 (val 为原值)</label>
          <a-input
            v-model:value="mapCustomExpression"
            placeholder="例如: val ? val + '1' : ''"
            style="width: 220px"
          />
        </div>
      </template>

      <div class="setting-actions">
        <a-button type="primary" @click="handleMapSubmit">
          <template #icon><ThunderboltOutlined /></template>
          立即执行
        </a-button>
      </div>
    </div>

    <!-- 模式 6: 搜索与替换 -->
    <div v-if="activeMode === 'search'" class="tool-settings-row">
      <div class="setting-item">
        <label class="setting-label">目标范围</label>
        <a-select v-model:value="searchScope" style="width: 140px">
          <a-select-option value="all">全工作表</a-select-option>
          <a-select-option value="column">指定某一列</a-select-option>
          <a-select-option value="row">指定某一行</a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="searchScope === 'column'">
        <label class="setting-label">选择列</label>
        <a-select v-model:value="searchTargetCol" style="width: 170px" show-search option-filter-prop="label">
          <a-select-option
            v-for="col in availableColumns"
            :key="col.index"
            :value="col.index"
            :label="col.label"
          >
            {{ col.label }}
          </a-select-option>
        </a-select>
      </div>

      <div class="setting-item" v-if="searchScope === 'row'">
        <label class="setting-label">行号 (从1开始)</label>
        <a-input-number v-model:value="searchTargetRow" :min="1" :max="rowCount" style="width: 90px" />
      </div>

      <div class="setting-item">
        <label class="setting-label">查找内容</label>
        <a-input
          v-model:value="searchFindText"
          placeholder="查找文本..."
          allow-clear
          style="width: 170px"
        />
      </div>

      <div class="setting-item">
        <label class="setting-label">替换为</label>
        <a-input
          v-model:value="searchReplaceText"
          placeholder="替换内容 (可留空删除)"
          allow-clear
          style="width: 170px"
        />
      </div>

      <div class="setting-item">
        <label class="setting-label">匹配模式</label>
        <a-select v-model:value="searchMatchMode" style="width: 140px">
          <a-select-option value="contains">包含匹配 (子串)</a-select-option>
          <a-select-option value="exact">完全匹配 (整格)</a-select-option>
          <a-select-option value="regex">正则表达式</a-select-option>
        </a-select>
      </div>

      <div class="setting-item checkbox-item">
        <a-checkbox v-model:checked="searchCaseSensitive">区分大小写</a-checkbox>
      </div>

      <div class="setting-actions">
        <a-button type="primary" @click="handleSearchSubmit" :disabled="!searchFindText && searchMatchMode !== 'exact'">
          <template #icon><SearchOutlined /></template>
          立即替换
        </a-button>
      </div>
    </div>
  </div>
</template>

<script>
import { Select, Input, InputNumber, Radio, Checkbox, Button, Space } from "ant-design-vue";
import {
  ThunderboltOutlined,
  SwapOutlined,
  SearchOutlined,
  DeleteOutlined,
  ClearOutlined,
  CheckOutlined,
} from "@ant-design/icons-vue";
import { fixFloatPrecision } from "../../utils/excelTransformer.js";

export default {
  name: "ExcelBatchPanel",
  components: {
    "a-select": Select,
    "a-select-option": Select.Option,
    "a-input": Input,
    "a-input-number": InputNumber,
    "a-radio-group": Radio.Group,
    "a-radio-button": Radio.Button,
    "a-checkbox": Checkbox,
    "a-button": Button,
    "a-space": Space,
    ThunderboltOutlined,
    SwapOutlined,
    SearchOutlined,
    DeleteOutlined,
    ClearOutlined,
    CheckOutlined,
  },
  props: {
    availableColumns: {
      type: Array,
      default: () => [],
    },
    rowCount: {
      type: Number,
      default: 0,
    },
    dictRulesCount: {
      type: Number,
      default: 0,
    },
  },
  emits: [
    "apply-extract",
    "apply-merge",
    "apply-split",
    "apply-clean-empty",
    "apply-dedup",
    "apply-type",
    "apply-map",
    "apply-search",
    "open-dict-modal",
  ],
  data() {
    return {
      activeMode: "extract",

      // 1. 提取配置
      extractTargetCol: 1,
      extractType: "phone",
      extractCustomRegex: "",
      extractOutputMode: "newCol",
      extractNewColName: "提取手机号",

      // 2. 合并 / 拆分
      mergeSplitType: "merge",
      mergeSelectedCols: [],
      mergeDelimiter: "-",
      mergeColName: "完整地址",
      mergeKeepOriginal: true,
      splitTargetCol: 0,
      splitDelimiter: "-",
      splitKeepOriginal: false,

      // 3. 去重
      dedupScope: "column",
      dedupTargetCol: 0,
      dedupIgnoreEmpty: true,

      // 4. 类型转换
      typeScope: "column",
      typeTargetCol: 2,
      typeTargetRow: 1,
      typeConvertType: "toRmb",
      typeDateFormat: "YYYY-MM-DD",
      typeDecimals: 2,

      // 5. Map与运算
      mapTargetCol: 0,
      mapSubType: "concat",
      mapPrefix: "",
      mapSuffix: "1",
      mapSkipEmpty: true,
      mapMathOperator: "+",
      mapMathOperand: 1,
      mapSkipNonNumeric: true,
      mapDictUnmatched: "keep",
      mapCustomExpression: "val ? val + '1' : ''",

      // 6. 搜索替换
      searchScope: "all",
      searchTargetCol: 0,
      searchTargetRow: 1,
      searchFindText: "",
      searchReplaceText: "",
      searchMatchMode: "contains",
      searchCaseSensitive: false,
    };
  },
  watch: {
    availableColumns: {
      immediate: true,
      handler(cols) {
        if (cols && cols.length > 0) {
          if (this.extractTargetCol >= cols.length) this.extractTargetCol = 0;
          if (this.typeTargetCol >= cols.length) this.typeTargetCol = 0;
          if (this.mapTargetCol >= cols.length) this.mapTargetCol = 0;
          if (this.searchTargetCol >= cols.length) this.searchTargetCol = 0;
          if (this.splitTargetCol >= cols.length) this.splitTargetCol = 0;
          if (this.dedupTargetCol >= cols.length) this.dedupTargetCol = 0;
        }
      },
    },
  },
  methods: {
    handleExtractSubmit() {
      this.$emit("apply-extract", {
        colIndex: this.extractTargetCol,
        extractType: this.extractType,
        customRegex: this.extractCustomRegex,
        outputMode: this.extractOutputMode,
        newColName: this.extractNewColName || "提取结果",
      });
    },
    handleMergeSubmit() {
      this.$emit("apply-merge", {
        colIndices: this.mergeSelectedCols,
        delimiter: this.mergeDelimiter,
        newColName: this.mergeColName || "合并列",
        keepOriginalCols: this.mergeKeepOriginal,
      });
    },
    handleSplitSubmit() {
      this.$emit("apply-split", {
        colIndex: this.splitTargetCol,
        delimiter: this.splitDelimiter,
        keepOriginalCol: this.splitKeepOriginal,
      });
    },
    handleDedupSubmit() {
      this.$emit("apply-dedup", {
        scope: this.dedupScope,
        colIndex: this.dedupTargetCol,
        ignoreEmpty: this.dedupIgnoreEmpty,
      });
    },
    handleTypeSubmit() {
      this.$emit("apply-type", {
        scopeType: this.typeScope,
        targetCol: this.typeTargetCol,
        targetRow: this.typeTargetRow,
        convertType: this.typeConvertType,
        dateFormat: this.typeDateFormat,
        decimals: this.typeDecimals,
      });
    },
    handleMapSubmit() {
      this.$emit("apply-map", {
        targetCol: this.mapTargetCol,
        mapSubType: this.mapSubType,
        prefix: this.mapPrefix,
        suffix: this.mapSuffix,
        skipEmpty: this.mapSkipEmpty,
        mathOperator: this.mapMathOperator,
        mathOperand: this.mapMathOperand,
        skipNonNumeric: this.mapSkipNonNumeric,
        dictUnmatched: this.mapDictUnmatched,
        customExpression: this.mapCustomExpression,
      });
    },
    handleSearchSubmit() {
      this.$emit("apply-search", {
        scopeType: this.searchScope,
        targetCol: this.searchTargetCol,
        targetRow: this.searchTargetRow,
        searchVal: this.searchFindText,
        replaceVal: this.searchReplaceText,
        matchMode: this.searchMatchMode,
        caseSensitive: this.searchCaseSensitive,
      });
    },
    getMathPreview(val) {
      const op = this.mapMathOperator;
      const num = Number(this.mapMathOperand) || 0;
      switch (op) {
        case "+":
          return fixFloatPrecision(val + num);
        case "-":
          return fixFloatPrecision(val - num);
        case "*":
          return fixFloatPrecision(val * num);
        case "/":
          return num !== 0 ? fixFloatPrecision(val / num) : "除零错误";
        case "round":
          return Math.round(val);
      }
      return val;
    },
  },
};
</script>

<style scoped lang="scss">
.batch-control-panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 14px 18px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);

  .panel-mode-tabs {
    display: flex;
    gap: 6px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 10px;
    margin-bottom: 12px;
    overflow-x: auto;

    .mode-tab-btn {
      background: transparent;
      border: none;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover {
        color: #0f172a;
        background: #f8fafc;
      }

      &.active {
        color: #10b981;
        background: #ecfdf5;
      }
    }
  }

  .tool-settings-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;

    .setting-item {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .setting-label {
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      &.checkbox-item {
        flex-direction: row;
        align-items: center;
        margin-top: 18px;
      }
    }

    .setting-divider {
      width: 1px;
      height: 36px;
      background: #e2e8f0;
      margin: 0 4px;
    }

    .clean-action-btn {
      border-radius: 8px;
      &.highlight-btn {
        border-color: #10b981;
        color: #059669;
        font-weight: 600;
      }
    }

    .preview-tag-box {
      margin-top: 18px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;

      strong {
        color: #10b981;
      }
    }

    .setting-actions {
      margin-left: auto;
      margin-top: 12px;

      .ant-btn {
        border-radius: 8px;
        background: #10b981;
        border-color: #10b981;
        font-weight: 600;
        &:hover {
          background: #059669;
          border-color: #059669;
        }
      }
    }
  }
}
</style>
