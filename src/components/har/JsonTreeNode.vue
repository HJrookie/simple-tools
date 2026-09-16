<template>
  <div class="json-tree-node" :class="{ 'is-root': depth === 0 }">
    <!-- 复合类型：对象或数组 -->
    <div v-if="isObjectOrArray" class="node-complex">
      <div class="node-line" :class="{ 'has-search-match': isMatched }">
        <!-- 展开/收起切换箭头 -->
        <span class="toggle-icon" @click="toggleOpen">
          <span class="arrow-symbol" :class="{ 'arrow-expanded': isOpen }">▶</span>
        </span>

        <!-- 键名 (如果不是根节点) -->
        <span v-if="nodeKey !== null && nodeKey !== undefined" class="node-key" @click="toggleOpen">
          <span v-if="isParentArray" class="array-index">[{{ nodeKey }}]:</span>
          <span v-else class="object-key" v-html="highlight(String(nodeKey))"></span>:
        </span>

        <!-- 折叠时的类型与数量提示 -->
        <span class="node-preview" @click="toggleOpen">
          <span class="bracket-symbol">{{ isArray ? "[" : "{" }}</span>
          <span v-if="!isOpen" class="collapsed-summary">
            {{ isArray ? `${childCount} items` : `${childCount} keys` }}
            <span class="bracket-symbol">{{ isArray ? "]" : "}" }}</span>
          </span>
        </span>

        <!-- 悬浮操作按钮 -->
        <div class="node-actions">
          <a-tooltip title="复制此节点 JSON">
            <button class="action-btn" @click.stop="copyNodeValue">
              📋
            </button>
          </a-tooltip>
          <a-tooltip :title="`复制完整路径: ${fullPath}`">
            <button class="action-btn path-btn" @click.stop="copyPath">
              路径
            </button>
          </a-tooltip>
        </div>
      </div>

      <!-- 子节点展开列表 -->
      <div v-if="isOpen" class="node-children">
        <JsonTreeNode
          v-for="item in childItems"
          :key="item.key"
          :nodeKey="item.key"
          :value="item.val"
          :depth="depth + 1"
          :maxAutoExpandDepth="maxAutoExpandDepth"
          :searchQuery="searchQuery"
          :path="getChildPath(item.key)"
          :isParentArray="isArray"
          :expandSignal="expandSignal"
        />
        <!-- 闭合括号 -->
        <div class="close-bracket">
          <span class="bracket-symbol">{{ isArray ? "]" : "}" }}</span>
        </div>
      </div>
    </div>

    <!-- 原始基本类型：String, Number, Boolean, Null -->
    <div v-else class="node-primitive node-line" :class="{ 'has-search-match': isMatched }">
      <span class="spacer-dot">•</span>

      <!-- 键名 -->
      <span v-if="nodeKey !== null && nodeKey !== undefined" class="node-key">
        <span v-if="isParentArray" class="array-index">[{{ nodeKey }}]:</span>
        <span v-else class="object-key" v-html="highlight(String(nodeKey))"></span>:
      </span>

      <!-- 值展示 -->
      <span class="primitive-value" :class="valueTypeClass">
        <template v-if="valueType === 'string'">
          <span class="string-quote">"</span><span v-html="highlight(String(value))"></span><span class="string-quote">"</span>
        </template>
        <template v-else-if="valueType === 'null'">
          <span class="val-null">null</span>
        </template>
        <template v-else>
          <span v-html="highlight(String(value))"></span>
        </template>
      </span>

      <!-- 悬浮操作按钮 -->
      <div class="node-actions">
        <a-tooltip title="复制此值">
          <button class="action-btn" @click.stop="copyPrimitiveValue">
            📋
          </button>
        </a-tooltip>
        <a-tooltip :title="`复制完整路径: ${fullPath}`">
          <button class="action-btn path-btn" @click.stop="copyPath">
            路径
          </button>
        </a-tooltip>
      </div>
    </div>
  </div>
</template>

<script>
import { Tooltip, message } from "ant-design-vue";

export default {
  name: "JsonTreeNode",
  components: {
    "a-tooltip": Tooltip,
  },
  props: {
    nodeKey: {
      type: [String, Number],
      default: null,
    },
    value: {
      type: [Object, Array, String, Number, Boolean, null, undefined],
      default: null,
    },
    depth: {
      type: Number,
      default: 0,
    },
    maxAutoExpandDepth: {
      type: Number,
      default: 2,
    },
    searchQuery: {
      type: String,
      default: "",
    },
    path: {
      type: String,
      default: "$",
    },
    isParentArray: {
      type: Boolean,
      default: false,
    },
    expandSignal: {
      type: Number,
      default: 0, // 0: 保持状态, 1: 全部展开, -1: 全部折叠
    },
  },
  data() {
    return {
      isOpen: this.depth < this.maxAutoExpandDepth,
    };
  },
  computed: {
    isObjectOrArray() {
      return this.value !== null && typeof this.value === "object";
    },
    isArray() {
      return Array.isArray(this.value);
    },
    childCount() {
      if (!this.isObjectOrArray) return 0;
      return this.isArray ? this.value.length : Object.keys(this.value).length;
    },
    childItems() {
      if (!this.isObjectOrArray) return [];
      if (this.isArray) {
        return this.value.map((val, idx) => ({ key: idx, val }));
      }
      return Object.keys(this.value).map((key) => ({ key, val: this.value[key] }));
    },
    valueType() {
      if (this.value === null) return "null";
      if (this.value === undefined) return "undefined";
      return typeof this.value;
    },
    valueTypeClass() {
      return `type-${this.valueType}`;
    },
    fullPath() {
      return this.path;
    },
    isMatched() {
      if (!this.searchQuery) return false;
      const q = this.searchQuery.toLowerCase();
      const keyStr = String(this.nodeKey || "").toLowerCase();
      const valStr = String(this.value || "").toLowerCase();
      return keyStr.includes(q) || valStr.includes(q);
    },
  },
  watch: {
    expandSignal(newVal) {
      if (newVal === 1) {
        this.isOpen = true;
      } else if (newVal === -1) {
        this.isOpen = this.depth === 0;
      }
    },
    searchQuery(newVal) {
      // 若包含搜索词则自动展开以供可见
      if (newVal && this.isObjectOrArray) {
        const str = JSON.stringify(this.value).toLowerCase();
        if (str.includes(newVal.toLowerCase())) {
          this.isOpen = true;
        }
      }
    },
  },
  methods: {
    toggleOpen() {
      this.isOpen = !this.isOpen;
    },
    getChildPath(subKey) {
      if (this.isArray) {
        return `${this.path}[${subKey}]`;
      }
      return this.path === "$" ? `$.${subKey}` : `${this.path}.${subKey}`;
    },
    highlight(text) {
      if (!this.searchQuery) return this.escapeHtml(text);
      const q = this.searchQuery.trim();
      if (!q) return this.escapeHtml(text);

      const regex = new RegExp(`(${this.escapeRegExp(q)})`, "gi");
      const safe = this.escapeHtml(text);
      return safe.replace(regex, '<mark class="json-search-hit">$1</mark>');
    },
    escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },
    escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    },
    copyNodeValue() {
      try {
        const text = JSON.stringify(this.value, null, 2);
        navigator.clipboard.writeText(text);
        message.success("已复制该节点 JSON");
      } catch (e) {
        message.error("复制失败");
      }
    },
    copyPrimitiveValue() {
      try {
        const text = typeof this.value === "string" ? this.value : String(this.value);
        navigator.clipboard.writeText(text);
        message.success(`已复制: ${text.length > 25 ? text.substring(0, 25) + "..." : text}`);
      } catch (e) {
        message.error("复制失败");
      }
    },
    copyPath() {
      try {
        navigator.clipboard.writeText(this.fullPath);
        message.success(`已复制路径: ${this.fullPath}`);
      } catch (e) {
        message.error("复制失败");
      }
    },
  },
};
</script>

<style scoped>
.json-tree-node {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #334155;
}

.node-line {
  display: flex;
  align-items: baseline;
  padding: 2px 4px;
  border-radius: 4px;
  position: relative;
  transition: background 0.15s;
}

.node-line:hover {
  background-color: #f1f5f9;
}

.node-line:hover .node-actions {
  opacity: 1;
  pointer-events: auto;
}

.toggle-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  cursor: pointer;
  user-select: none;
}

.arrow-symbol {
  font-size: 9px;
  color: #64748b;
  display: inline-block;
  transform-origin: center;
  transition: transform 0.15s ease-out;
}

.arrow-symbol.arrow-expanded {
  transform: rotate(90deg);
}

.spacer-dot {
  display: inline-block;
  width: 16px;
  text-align: center;
  color: #cbd5e1;
  font-size: 12px;
  margin-right: 4px;
}

.node-key {
  margin-right: 6px;
  cursor: pointer;
}

.object-key {
  color: #0369a1;
  font-weight: 600;
}

.array-index {
  color: #94a3b8;
  font-size: 11px;
}

.bracket-symbol {
  color: #475569;
  font-weight: bold;
}

.collapsed-summary {
  color: #64748b;
  font-size: 12px;
  background: #e2e8f0;
  padding: 1px 6px;
  border-radius: 4px;
  margin: 0 4px;
  cursor: pointer;
}

.node-children {
  padding-left: 18px;
  border-left: 1.5px dashed #e2e8f0;
  margin-left: 7px;
}

.close-bracket {
  padding: 1px 4px;
}

/* 基本类型样式 */
.primitive-value {
  word-break: break-all;
}

.type-string {
  color: #15803d; /* 绿色 */
}

.string-quote {
  color: #16a34a;
  opacity: 0.7;
}

.type-number {
  color: #b45309; /* 琥珀色 */
  font-weight: 500;
}

.type-boolean {
  color: #7c3aed; /* 紫色 */
  font-weight: 600;
}

.type-null,
.val-null {
  color: #94a3b8;
  font-style: italic;
  font-weight: 500;
}

/* 浮动操作按钮 */
.node-actions {
  display: inline-flex;
  gap: 4px;
  margin-left: 12px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s;
}

.action-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  color: #475569;
  padding: 0 6px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.15s;
}

.action-btn:hover {
  background: #f8fafc;
  color: #2563eb;
  border-color: #93c5fd;
}

.path-btn {
  font-family: sans-serif;
  font-size: 10px;
}

.has-search-match {
  background-color: #fef08a !important;
}

:deep(.json-search-hit) {
  background-color: #fde047;
  color: #854d0e;
  padding: 0 2px;
  border-radius: 2px;
  font-weight: bold;
}
</style>
