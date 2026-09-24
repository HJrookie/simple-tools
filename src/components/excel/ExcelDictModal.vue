<!-- src/components/excel/ExcelDictModal.vue -->
<template>
  <a-modal
    :open="open"
    title="配置字典键值映射规则"
    ok-text="保存规则"
    cancel-text="关闭"
    @ok="handleSave"
    @cancel="$emit('update:open', false)"
    width="560px"
  >
    <div class="dict-modal-content">
      <p class="dict-hint">
        每行一条映射规则，格式：<code>原值 => 新值</code>（例如：<code>男 => M</code> 或 <code>1 => 待支付</code>）
      </p>
      <textarea
        v-model="localInput"
        placeholder="男 => M&#10;女 => F&#10;1 => 待支付&#10;2 => 已发货"
        rows="8"
        class="dict-textarea"
      ></textarea>
      <div class="quick-dict-presets">
        <span class="preset-label">快捷预设模板：</span>
        <a-button size="small" @click="setPreset('gender')">性别映射 (男女=>MF)</a-button>
        <a-button size="small" @click="setPreset('status')">状态码 (123=>状态)</a-button>
        <a-button size="small" @click="setPreset('boolean')">布尔 (01=>是否)</a-button>
      </div>
    </div>
  </a-modal>
</template>

<script>
import { Modal, Button } from "ant-design-vue";

export default {
  name: "ExcelDictModal",
  components: {
    "a-modal": Modal,
    "a-button": Button,
  },
  props: {
    open: {
      type: Boolean,
      default: false,
    },
    rawInput: {
      type: String,
      default: "",
    },
  },
  emits: ["update:open", "update:rawInput"],
  data() {
    return {
      localInput: this.rawInput,
    };
  },
  watch: {
    rawInput(val) {
      this.localInput = val;
    },
  },
  methods: {
    handleSave() {
      this.$emit("update:rawInput", this.localInput);
      this.$emit("update:open", false);
    },
    setPreset(type) {
      if (type === "gender") {
        this.localInput = "男 => M\n女 => F\n0 => 女\n1 => 男";
      } else if (type === "status") {
        this.localInput = "1 => 待支付\n2 => 已发货\n3 => 已完成\n4 => 已退款";
      } else if (type === "boolean") {
        this.localInput = "1 => 是\n0 => 否\ntrue => 是\nfalse => 否";
      }
    },
  },
};
</script>

<style scoped lang="scss">
.dict-modal-content {
  .dict-hint {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 12px;

    code {
      background: #f1f5f9;
      padding: 2px 4px;
      border-radius: 4px;
      color: #0f172a;
      font-weight: 600;
    }
  }

  .dict-textarea {
    width: 100%;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13px;
    outline: none;
    resize: vertical;

    &:focus {
      border-color: #10b981;
    }
  }

  .quick-dict-presets {
    margin-top: 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    .preset-label {
      font-size: 12px;
      color: #64748b;
    }
  }
}
</style>
