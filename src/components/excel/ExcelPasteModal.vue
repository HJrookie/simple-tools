<!-- src/components/excel/ExcelPasteModal.vue -->
<template>
  <a-modal
    :open="open"
    title="从剪贴板粘贴表格数据"
    ok-text="确认载入"
    cancel-text="取消"
    @ok="handleConfirm"
    @cancel="$emit('update:open', false)"
    width="680px"
  >
    <div class="paste-modal-content">
      <p class="paste-tip">
        提示：可在本地 Excel、WPS 或 Google Sheets 复制整块区域，直接在下方输入框内按 <code>Ctrl+V</code>（或 <code>Cmd+V</code>）粘贴。
      </p>
      <textarea
        v-model="rawText"
        placeholder="在此处粘贴表格内容（支持 Tab、逗号、分号分隔数据）..."
        rows="10"
        class="paste-textarea"
      ></textarea>
    </div>
  </a-modal>
</template>

<script>
import { Modal, message } from "ant-design-vue";

export default {
  name: "ExcelPasteModal",
  components: {
    "a-modal": Modal,
  },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["update:open", "confirm-paste"],
  data() {
    return {
      rawText: "",
    };
  },
  watch: {
    open(val) {
      if (val) this.rawText = "";
    },
  },
  methods: {
    handleConfirm() {
      if (!this.rawText.trim()) {
        message.warning("请输入或粘贴数据！");
        return;
      }
      this.$emit("confirm-paste", this.rawText);
      this.$emit("update:open", false);
    },
  },
};
</script>

<style scoped lang="scss">
.paste-modal-content {
  .paste-tip {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;

    code {
      background: #f1f5f9;
      padding: 2px 4px;
      border-radius: 4px;
      font-weight: 600;
      color: #0f172a;
    }
  }

  .paste-textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    outline: none;
    resize: vertical;

    &:focus {
      border-color: #10b981;
    }
  }
}
</style>
