<!-- src/components/ToolCard.vue (Upgraded Version) -->
<template>
  <div class="tool-card" @click="goToTool">
    <div class="card-content">
      <div class="icon-wrapper">
        <component :is="icon" class="tool-icon" />
      </div>
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
    icon: { type: Object, required: true },
  },
  methods: {
    goToTool() {
      // [关键改动] 判断链接类型
      // 如果链接以 'http' 开头，则判定为外部链接
      if (this.to.startsWith("http")) {
        // 在新标签页中打开外部链接，更安全
        window.open(this.to, "_blank", "noopener noreferrer");
      } else {
        // 否则，使用 vue-router进行内部路由跳转
        this.$router.push(this.to);
      }
    },
  },
};
</script>

<style scoped>
.tool-card {
  /* height: 140px; */
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  padding: 16px 24px;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.06);
}

.tool-card:hover {
  transform: translateY(-5px);
  box-shadow:
    0 10px 20px rgba(0, 0, 0, 0.08),
    0 4px 8px rgba(0, 0, 0, 0.06);
}

.card-content {
  display: flex;
  align-items: flex-start;
  height: 100%;
}

.icon-wrapper {
  margin-right: 18px;
}

.tool-icon {
  font-size: 32px;
  color: #1677ff;
  margin-top: 4px;
}

.text-content {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.card-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
