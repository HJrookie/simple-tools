<!-- src/components/ToolCard.vue (New Version) -->
<template>
  <div class="tool-card" @click="goToTool">
    <div class="card-content">
      <!-- Icon Wrapper -->
      <div class="icon-wrapper">
        <component :is="icon" class="tool-icon" />
      </div>
      <!-- Text Content -->
      <div class="text-content">
        <h3 class="card-title">{{ title }}</h3>
        <p class="card-description">{{ description }}</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "ToolCard",
  props: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    to: { type: String, required: true },
    // 新增：接收一个图标组件作为 prop
    icon: { type: Object, required: true },
  },
  methods: {
    goToTool() {
      this.$router.push(this.to);
    },
  },
};
</script>

<style scoped>
.tool-card {
  /* height: 140px; */
   /* 增加高度以容纳图标和更好的间距 */
  background-color: #ffffff;
  border-radius: 12px; /* 更圆润的边角 */
  border: 1px solid #f0f0f0;
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  /* 平滑的过渡动画 */
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.06);
}

.tool-card:hover {
  /* 悬浮时“上浮”效果 */
  transform: translateY(-5px);
  /* 更明显的阴影 */
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.08),
    0 4px 8px rgba(0, 0, 0, 0.06);
}

.card-content {
  display: flex;
  align-items: flex-start; /* 图标和文字顶部对齐 */
  height: 100%;
}

.icon-wrapper {
  margin-right: 18px;
}

.tool-icon {
  font-size: 32px; /* 增大图标尺寸 */
  color: #1677ff; /* Ant Design 主题色 */
  margin-top: 4px; /* 微调图标位置 */
}

.text-content {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 16px;
  font-weight: 600; /* 标题加粗 */
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.card-description {
  font-size: 14px;
  color: #6b7280; /* 描述文字颜色变浅 */
  line-height: 1.5;
  margin: 0;
  /* 最多显示两行，超出部分显示省略号 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
