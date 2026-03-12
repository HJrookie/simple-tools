<template>
  <div class="tarot-card-wrapper" :class="[{ 'is-selected': isSelected, 'is-flipped': isFlipped }, size === 'small' ? 'size-small' : 'size-large']">
    <!-- 正面 -->
    <div v-if="isFlipped" class="card-face face-front">
      <a-card hoverable>
        <template #cover>
          <!-- 关键：增加 class 处理旋转 -->
          <img :src="card.image" :alt="card.name" class="card-img" :class="{ 'reversed-img': isReversed }" />
        </template>

        <a-card-meta v-if="size === 'large'">
          <template #title>
            <!-- 显示正逆位状态 -->
            <span :class="isReversed ? 'status-rev' : 'status-up'">
              {{ isReversed ? "[逆位] " : "[正位] " }}
            </span>
            {{ card.name }}
          </template>
          <template #description>
            <!-- 实际开发中，逆位通常有不同的解释，这里简单处理 -->
            <div class="meaning-text">{{ isReversed ? "【逆位含义】" : "【正位含义】" }}
                {{ isReversed ? card.revMeaning : card.meaning }}</div>
          </template>
        </a-card-meta>
        <div v-else class="small-name">{{ card.name }}</div>
      </a-card>
    </div>

    <!-- 背面逻辑保持不变 -->
    <div v-else class="card-face face-back"></div>
  </div>
</template>

<script>
export default {
  props: {
    card: Object,
    isFlipped: Boolean,
    isSelected: Boolean,
    isReversed: Boolean, // 接收正逆位状态
    size: { type: String, default: "small" },
  },
};
</script>

<style scoped>
.tarot-card-wrapper {
  position: relative;
  /* transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); */
  transition:
    transform 0.6s cubic-bezier(0.23, 1, 0.32, 1),
    box-shadow 0.3s;

  cursor: pointer;
  user-select: none;
  will-change: transform;
}

/* 尺寸控制 */
.size-small {
  width: 50px;
  height: 70px;
}
.size-large {
  width: 240px;
  /* height: 300px; */
}

.reversed-img {
  transform: rotate(180deg);
}

.status-up {
  color: #52c41a; /* 绿色代表正位 */
  font-size: 14px;
}

.status-rev {
  color: #f5222d; /* 红色代表逆位 */
  font-size: 14px;
}

.is-selected {
  transform: translateY(-20px) scale(1.1);
  filter: drop-shadow(0 0 15px #722ed1);
  z-index: 10;
}

.card-face {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

/* 渐变背面 */
.face-back {
  /* 深宝石绿到黑森林色 */
  /* 减小渐变的跳跃度，使用更暗的绿色 */
  background: linear-gradient(135deg, #042a2b 0%, #001a1a 100%);
  border: 1.5px solid rgba(212, 175, 55, 0.6); /* 边框变细且带透明度 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 增加一个“噪点”纹理层，让渐变更有纸质质感 */
/* .face-back::after {
  content: '';
  position: absolute;
  top: -50%; left: -50%;
  width: 200%; height: 200%;
  background: linear-gradient(45deg, transparent 45%, rgba(212, 175, 55, 0.1) 50%, transparent 55%);
  animation: shine 3s infinite;
} */
@keyframes shine {
  0% {
    transform: translateX(-100%) translateY(-100%);
  }
  100% {
    transform: translateX(100%) translateY(100%);
  }
}
/* 优化中间的✨图标 */
.center-icon {
  font-size: 28px;
  color: #d4af37;
  text-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
  filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.5));
}

.back-pattern {
  width: 85%;
  height: 90%;
  border: 1px solid rgba(212, 175, 55, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.center-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 5px gold);
}

.card-img {
  width: 100%;
  aspect-ratio: 2/3; /* 保持统一比例 */
  object-fit: cover;
  transition: transform 0.3s ease;
}
.small-name {
  text-align: center;
  font-weight: bold;
  padding: 4px;
  font-size: 12px;
}
.meaning-text {
  font-size: 12px;
  line-height: 1.2;
}
</style>
