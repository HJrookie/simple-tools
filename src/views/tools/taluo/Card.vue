<template>
  <div class="tarot-card-wrapper" :class="[{ 'is-selected': isSelected, 'is-flipped': isFlipped }, size === 'small' ? 'size-small' : 'size-large']">
    <!-- 正面 (结果面) -->
    <div v-if="isFlipped" class="card-face face-front">
      <a-card hoverable class="warm-card">
        <template #cover>
          <div class="img-wrapper">
            <img :src="card.image" :alt="card.name" class="card-img" :class="{ 'reversed-img': isReversed }" />
          </div>
        </template>

        <a-card-meta v-if="size === 'large'">
          <template #title>
            <div class="card-title">
              <span :class="isReversed ? 'status-rev' : 'status-up'">
                {{ isReversed ? "逆" : "正" }}
              </span>
              {{ card.name }}
            </div>
          </template>
          <template #description>
            <div class="meaning-text">
              <div class="meaning-label">{{ isReversed ? "【逆位含义】" : "【正位含义】" }}</div>
              {{ isReversed ? card.revMeaning : card.meaning }}
            </div>
          </template>
        </a-card-meta>
        <div v-else class="small-name">{{ card.name }}</div>
      </a-card>
    </div>

    <!-- 背面 (抽牌面) 更改为温暖色调 -->
    <div v-else class="card-face face-back">
      <div class="back-pattern">
        <span class="center-icon">✦</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    card: Object,
    isFlipped: Boolean,
    isSelected: Boolean,
    isReversed: Boolean,
    size: { type: String, default: "small" },
  },
};
</script>

<style scoped>
.tarot-card-wrapper {
  position: relative;
  transition:
    transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
    box-shadow 0.3s;
  cursor: pointer;
  user-select: none;
  will-change: transform;
}

/* 移动端适配后的尺寸控制 */
.size-small {
  width: 100%;
  aspect-ratio: 1 / 1.5; /* 保证比例而不是死抠像素高度 */
}
.size-large {
  width: 100%; /* 由父容器控制具体宽度 */
}

/* 翻转 */
.reversed-img {
  transform: rotate(180deg);
}

/* 卡片选中效果 (温柔上浮) */
.is-selected {
  transform: translateY(-15px);
  filter: drop-shadow(0 10px 15px rgba(212, 163, 115, 0.6));
  z-index: 10;
}

.tarot-card-wrapper:hover:not(.is-selected):not(.is-flipped) {
  transform: translateY(-5px);
  filter: brightness(1.05);
}

/* 面板通用 */
.card-face {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(139, 115, 85, 0.15);
}

/* ==================== 
   卡牌背面 - 温馨护眼版
   ==================== */
.face-back {
  /* 暖陶土/玫瑰金 渐变 */
  background: linear-gradient(135deg, #e3cda4 0%, #c58e58 100%);
  border: 2px solid rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

/* 内部纹理框 */
.back-pattern {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255, 255, 255, 0.05) 5px, rgba(255, 255, 255, 0.05) 10px);
}

.center-icon {
  font-size: 20px;
  color: #fff9f0;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.8));
}

/* ==================== 
   卡牌正面 (结果展示)
   ==================== */
.warm-card {
  border: none !important;
  background-color: #fffdf9;
}

.img-wrapper {
  padding: 10px 10px 0 10px;
  background: #fffdf9;
}

.card-img {
  width: 100%;
  aspect-ratio: 2/3;
  object-fit: cover;
  border-radius: 4px;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

/* 文字排版 */
.card-title {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #5c4b41;
  font-weight: bold;
}

.status-up,
.status-rev {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 6px;
  color: white;
}
.status-up {
  background-color: #9cb380;
} /* 柔和的鼠尾草绿 */
.status-rev {
  background-color: #d88c8c;
} /* 柔和的豆沙红 */

.meaning-text {
  font-size: 12px;
  line-height: 1.5;
  color: #7b6d63;
  text-align: justify;
}
.meaning-label {
  font-weight: bold;
  color: #b58d56;
  margin-bottom: 4px;
  text-align: center;
}

.small-name {
  text-align: center;
  font-weight: bold;
  padding: 4px;
  font-size: 12px;
}

/* 针对手机端进一步微调卡片内容 */
@media (max-width: 768px) {
  .meaning-text {
    font-size: 12px;
  }
  .card-title {
    font-size: 14px;
  }
  ::v-deep .ant-card-body {
    padding: 12px 8px; /* 减小默认padding */
  }
}
</style>
