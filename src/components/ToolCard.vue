<!-- src/components/ToolCard.vue (Apple Glassmorphism Version) -->
<template>
  <div class="tool-card" @click="goToTool">
    <!-- 装饰性背景光晕，增加层次感 -->
    <div class="glow-effect"></div>

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
      if (this.to.startsWith("http")) {
        window.open(this.to, "_blank", "noopener noreferrer");
      } else {
        this.$router.push(this.to);
      }
    },
  },
};
</script>

<style scoped>
/* 核心：玻璃质感容器 */
.tool-card {
  position: relative;
  /* 使用半透明白色，模拟玻璃基底 */
  background: rgba(255, 255, 255, 0.65);
  /* 关键：毛玻璃模糊 */
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);

  border-radius: 20px; /* 更圆润的角，符合苹果美学 */
  padding: 16px 24px;
  cursor: pointer;
  overflow: hidden;

  /* 极细的浅色边框，模拟边缘光亮 */
  border: 1px solid rgba(255, 255, 255, 0.4);

  /* 极其轻微的阴影 */
  box-shadow:
    0 4px 24px -1px rgba(0, 0, 0, 0.04),
    0 2px 8px -1px rgba(0, 0, 0, 0.02);

  transition: all 0.4s cubic-bezier(0.25, 1, 0.3, 1);
  user-select: none;
}

/* 悬浮状态：模拟玻璃升起并聚焦 */
.tool-card:hover {
  transform: translateY(-6px) scale(1.01);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.7);
}

/* 点击反馈 */
.tool-card:active {
  transform: translateY(-2px) scale(0.98);
  transition: all 0.1s;
}

.card-content {
  display: flex;
  align-items: center; /* 居中对齐看起来更自然 */
  position: relative;
  z-index: 1;
}

.icon-wrapper {
  margin-right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 给图标一个微弱的背景，增加精致感 */
  background: linear-gradient(135deg, rgba(22, 119, 255, 0.1), rgba(22, 119, 255, 0.05));
  padding: 12px;
  border-radius: 14px;
}

.tool-icon {
  font-size: 28px;
  /* 苹果风格图标颜色通常稍微深一点，更护眼 */
  color: #0066cc;
  filter: drop-shadow(0 2px 4px rgba(0, 102, 204, 0.15));
}

.text-content {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 17px;
  font-weight: 600;
  /* 使用苹果系统的字体颜色层级：San Francisco 风格 */
  color: #1d1d1f;
  margin: 0 0 4px 0;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: 13.5px;
  /* 降低对比度，使用二级文本色，更护眼 */
  color: #86868b;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-weight: 400;
}

/* 装饰性光晕：在卡片角落增加一点点色彩呼吸感 */
.glow-effect {
  position: absolute;
  top: -20%;
  left: -20%;
  width: 140%;
  height: 140%;
  background: radial-gradient(circle at center, rgba(22, 119, 255, 0.03) 0%, transparent 70%);
  pointer-events: none;
  transition: opacity 0.5s;
  opacity: 0;
}

.tool-card:hover .glow-effect {
  opacity: 1;
}
</style>
