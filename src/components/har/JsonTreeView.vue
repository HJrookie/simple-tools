<template>
  <div class="json-tree-container">
    <!-- 顶部控制栏 -->
    <div class="tree-toolbar">
      <div class="toolbar-left">
        <a-input
          v-model:value="searchQuery"
          placeholder="在 JSON 中搜索键或值..."
          allow-clear
          size="small"
          class="tree-search-input"
        >
          <template #prefix>
            <SearchOutlined style="color: #94a3b8" />
          </template>
        </a-input>

        <span class="type-badge" :class="rootTypeBadgeClass">
          {{ rootTypeLabel }}
        </span>
      </div>

      <div class="toolbar-right">
        <a-space size="small">
          <a-tooltip title="展开所有层级">
            <a-button size="small" @click="expandAll">
              <template #icon><FolderOpenOutlined /></template>
              展开全部
            </a-button>
          </a-tooltip>

          <a-tooltip title="折叠至根层级">
            <a-button size="small" @click="collapseAll">
              <template #icon><FolderOutlined /></template>
              折叠全部
            </a-button>
          </a-tooltip>

          <a-tooltip title="复制完整格式化 JSON">
            <a-button size="small" type="primary" ghost @click="copyFullJson">
              <template #icon><CopyOutlined /></template>
              复制 JSON
            </a-button>
          </a-tooltip>
        </a-space>
      </div>
    </div>

    <!-- 树状内容区 -->
    <div class="tree-content-scroll">
      <div v-if="isValidJson" class="tree-viewport">
        <JsonTreeNode
          :nodeKey="null"
          :value="data"
          :depth="0"
          :maxAutoExpandDepth="2"
          :searchQuery="searchQuery"
          path="$"
          :isParentArray="false"
          :expandSignal="expandSignal"
        />
      </div>
      <div v-else class="tree-empty">
        <span class="empty-tip">数据为空或非有效 JSON 对象</span>
      </div>
    </div>
  </div>
</template>

<script>
import { Input, Button, Space, Tooltip, message } from "ant-design-vue";
import {
  SearchOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  CopyOutlined,
} from "@ant-design/icons-vue";
import JsonTreeNode from "./JsonTreeNode.vue";

export default {
  name: "JsonTreeView",
  components: {
    JsonTreeNode,
    "a-input": Input,
    "a-button": Button,
    "a-space": Space,
    "a-tooltip": Tooltip,
    SearchOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    CopyOutlined,
  },
  props: {
    data: {
      type: [Object, Array, null],
      default: () => ({}),
    },
  },
  data() {
    return {
      searchQuery: "",
      expandSignal: 0,
    };
  },
  computed: {
    isValidJson() {
      return this.data !== null && typeof this.data === "object";
    },
    isRootArray() {
      return Array.isArray(this.data);
    },
    rootLength() {
      if (!this.isValidJson) return 0;
      return this.isRootArray ? this.data.length : Object.keys(this.data).length;
    },
    rootTypeBadgeClass() {
      return this.isRootArray ? "badge-array" : "badge-object";
    },
    rootTypeLabel() {
      if (!this.isValidJson) return "Empty";
      return this.isRootArray ? `Array [${this.rootLength}]` : `Object {${this.rootLength}}`;
    },
  },
  methods: {
    expandAll() {
      this.expandSignal = 1;
      this.$nextTick(() => {
        this.expandSignal = 0;
      });
      message.info("已展开所有节点");
    },
    collapseAll() {
      this.expandSignal = -1;
      this.$nextTick(() => {
        this.expandSignal = 0;
      });
      message.info("已折叠所有子节点");
    },
    copyFullJson() {
      try {
        const text = JSON.stringify(this.data, null, 2);
        navigator.clipboard.writeText(text);
        message.success("已复制完整 JSON 数据");
      } catch (e) {
        message.error("复制失败");
      }
    },
  },
};
</script>

<style scoped>
.json-tree-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 240px;
}

.tree-search-input {
  max-width: 260px;
  border-radius: 4px;
}

.type-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-object {
  background: #e0f2fe;
  color: #0284c7;
}

.badge-array {
  background: #fef3c7;
  color: #d97706;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.tree-content-scroll {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  background: #ffffff;
  min-height: 200px;
}

.tree-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 160px;
  color: #94a3b8;
  font-size: 13px;
}
</style>
