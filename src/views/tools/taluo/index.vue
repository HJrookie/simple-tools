<template>
  <div class="tarot-container">
    <div class="header">
      <h5>✨ 塔罗在线占卜</h5>
      <div class="controls">
        <a-radio-group v-model:value="mode" button-style="solid" @change="resetAll" class="custom-radio">
          <a-radio-button value="three">三张牌阵</a-radio-button>
          <a-radio-button value="single">单张启示</a-radio-button>
        </a-radio-group>
        <a-button type="primary" class="btn-warm" @click="initDeck" :loading="isShuffling"> 重新洗牌 </a-button>
      </div>
    </div>

    <!-- 阶段一：选择 -->
    <div v-if="!showResult" class="draw-area">
      <div class="status-bar">
        <span>请凭直觉抽取</span>
        <div class="count-badge">已选: {{ selectedIndices.length }} / {{ mode === "single" ? 1 : 3 }}</div>
      </div>

      <div class="deck-container">
        <!-- 温暖的光晕背景 -->
        <div class="warm-glow" :class="{ 'active': isShuffling }"></div>

        <div class="deck-grid" :class="{ 'is-shuffling': isShuffling }">
          <TarotCard
            v-for="(card, index) in shuffledCards"
            :key="card.tempId"
            size="small"
            :card="card"
            :is-selected="selectedIndices.includes(index)"
            :style="{ '--delay': `${index * 15}ms` }"
            @click="toggleSelect(index)"
          />
        </div>
      </div>

      <div class="footer-bar">
        <a-button size="large" :disabled="!canReveal" @click="revealResults" class="reveal-btn btn-warm" :class="{ 'btn-ready': canReveal }"> ✨ 揭晓启示 ✨ </a-button>
      </div>
    </div>

    <!-- 阶段二：展示结果 -->
    <div v-else class="result-area">
      <transition-group name="fade-up" tag="div" class="result-display">
        <div v-for="(card, idx) in resultCards" :key="idx" class="result-item">
          <div class="time-tag" v-if="mode === 'three'">{{ timeLabels[idx] }}</div>
          <TarotCard :card="card" size="large" :is-flipped="true" :is-reversed="card.isReversed" />
        </div>
      </transition-group>

      <div class="back-action">
        <a-button @click="resetAll" size="large" class="btn-warm ghost">感谢指引 / 再次占卜</a-button>
      </div>
    </div>
  </div>
</template>

<script>
import TarotCard from "./Card.vue";
import { tarotCards } from "./data.js";

export default {
  components: { TarotCard },
  data() {
    return {
      mode: "three",
      shuffledCards: [],
      selectedIndices: [],
      showResult: false,
      isShuffling: false,
      timeLabels: ["过去", "现在", "未来"],
      allData: tarotCards,
    };
  },
  computed: {
    canReveal() {
      const target = this.mode === "single" ? 1 : 3;
      return this.selectedIndices.length === target;
    },
    resultCards() {
      return this.selectedIndices.map((idx) => this.shuffledCards[idx]);
    },
  },
  created() {
    this.initDeck();
  },
  methods: {
    async initDeck() {
      if (this.isShuffling) return;

      this.isShuffling = true;
      this.selectedIndices = [];
      this.showResult = false;

      // 洗牌算法
      let deck = [...this.allData];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      this.shuffledCards = deck.map((c) => ({
        ...c,
        tempId: Math.random(),
        isReversed: Math.random() > 0.5,
      }));

      // 动画时间调整为 1.8s，让展开更丝滑
      setTimeout(() => {
        this.isShuffling = false;
      }, 1800);
    },

    toggleSelect(index) {
      if (this.isShuffling) return;
      const pos = this.selectedIndices.indexOf(index);
      if (pos > -1) {
        this.selectedIndices.splice(pos, 1);
      } else {
        const limit = this.mode === "single" ? 1 : 3;
        if (this.selectedIndices.length < limit) {
          this.selectedIndices.push(index);
        }
      }
    },

    revealResults() {
      this.showResult = true;
    },

    resetAll() {
      this.initDeck();
    },
  },
};
</script>

<style scoped>
/* 护眼温馨背景 */
.tarot-container {
  background-color: #fcf9f2;
  background-image: radial-gradient(circle at top, #fffdf8 0%, #f4eee1 100%);
  color: #5c4b41; /* 暖棕色文字 */
  overflow-x: hidden;
  overflow-y: auto;
  height: calc(100vh - 40px);
  padding-bottom: 80px;
  font-family: "Georgia", "Times New Roman", serif;
}

.header {
  padding: 20px 10px;
  text-align: center;
}

.header h5 {
  color: #b58d56;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 15px;
  text-shadow: 0 2px 4px rgba(181, 141, 86, 0.2);
}

.controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
}

/* 按钮样式客制化 */
.btn-warm {
  background: #d4a373;
  border-color: #d4a373;
  color: white;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(212, 163, 115, 0.3);
  transition: all 0.3s;
}
.btn-warm:hover,
.btn-ready {
  background: #c58e58 !important;
  border-color: #c58e58 !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(197, 142, 88, 0.4);
}
.btn-warm.ghost {
  background: transparent;
  color: #d4a373;
  border: 1px solid #d4a373;
}

.status-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 15px;
  font-size: 16px;
  color: #8c7b70;
}
.count-badge {
  background: #e9dec9;
  padding: 4px 16px;
  border-radius: 20px;
  color: #c58e58;
  font-weight: bold;
  margin-top: 8px;
  font-size: 14px;
}

/* 容器与暖色光晕 */
.deck-container {
  position: relative;
  min-height: 40vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.warm-glow {
  position: absolute;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(212, 163, 115, 0.2) 0%, transparent 70%);
  border-radius: 50%;
  opacity: 1;
  transition: all 1.5s ease;
  pointer-events: none;
}
.warm-glow.active {
  transform: scale(2);
  opacity: 0.5;
  background: radial-gradient(circle, rgba(212, 163, 115, 0.4) 0%, transparent 70%);
}

/* 移动端友好的牌堆网格 */
.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 12px;
  max-width: 900px;
  width: 95%;
  margin: 0 auto;
  padding: 10px;
  transition: all 0.5s ease;
  perspective: 1000px; /* 增加3D透视 */
}

/* 悬停非焦点牌变淡（护眼版） */
.deck-grid:hover .tarot-card-wrapper:not(:hover) {
  opacity: 0.7;
  filter: sepia(0.3);
}

/* ==================== 
   全新的洗牌动画：波浪展开
   ==================== */
.is-shuffling .tarot-card-wrapper {
  animation: warmShuffle 1.8s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
  /* 使用模板中传进来的变量设置延迟，产生洗牌的瀑布流/波浪效果 */
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes warmShuffle {
  0% {
    transform: translateY(100px) rotateY(90deg) scale(0.6);
    opacity: 0;
  }
  50% {
    transform: translateY(-20px) rotateY(0deg) scale(1.05);
    opacity: 1;
  }
  100% {
    transform: translateY(0) rotateY(0deg) scale(1);
    opacity: 1;
  }
}

/* 底部按钮栏 - 移动端悬浮 */
.footer-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 15px;
  background: linear-gradient(to top, #f4eee1 80%, transparent);
  display: flex;
  justify-content: center;
  z-index: 100;
}

/* 结果页布局 */
.result-display {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap; /* 关键：允许在手机上换行 */
  margin-top: 30px;
  padding: 0 15px;
}
.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%; /* 移动端默认宽度 */
  max-width: 240px; /* 限制最大宽度 */
}
.time-tag {
  background: #e3cca4;
  color: #7b5e43;
  padding: 4px 20px;
  border-radius: 15px;
  margin-bottom: 15px;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.back-action {
  text-align: center;
  margin-top: 40px;
  padding-bottom: 30px;
}

/* 进场动画 */
.fade-up-enter-active {
  transition: all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(40px) scale(0.9);
}

/* ==================== 
   移动端 (手机) 适配
   ==================== */
@media (max-width: 768px) {
  .deck-grid {
    grid-template-columns: repeat(auto-fill, minmax(35px, 1fr)); /* 缩小牌宽 */
    gap: 8px; /* 缩小间距，避免屏幕拉太长 */
  }

  .result-display {
    gap: 15px;
  }

  .result-item {
    max-width: 160px; /* 手机上缩小翻开的牌，让3张牌可以2排显示或缩小并排 */
    width: calc(50% - 10px); /* 手机端每行排两张 */
  }
  /* 第一张占满全宽（过去），下面两张并排（现在、未来），或者直接平铺 */
  .result-item:first-child:nth-last-child(3) {
    width: 100%;
    max-width: 200px;
  }

  .header h5 {
    font-size: 20px;
  }

  .tarot-container {
    padding-bottom: 100px;
  }
}
</style>
