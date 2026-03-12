<template>
  <div class="tarot-container">
    <div class="header">
      <h5>🔮 塔罗在线占卜</h5>
      <div class="controls">
        <a-radio-group v-model:value="mode" button-style="solid" @change="resetAll">
          <a-radio-button value="three">三张牌阵</a-radio-button>
          <a-radio-button value="single">单张启示</a-radio-button>
        </a-radio-group>
        <a-button type="primary" ghost @click="initDeck" :loading="isShuffling"> 重新洗牌 </a-button>
      </div>
    </div>

    <!-- 阶段一：选择 -->
    <div v-if="!showResult" class="draw-area">
      <div class="status-bar">
        已选择: <span class="count">{{ selectedIndices.length }} / {{ mode === "single" ? 1 : 3 }}</span>
      </div>

      <div class="deck-container">
        <!-- 魔法阵背景 -->
        <div class="magic-circle" :class="{ 'active': isShuffling }"></div>
        <!-- 牌堆：增加洗牌时的动画 class -->
        <div class="deck-grid" :class="{ 'is-shuffling': isShuffling }">
          <TarotCard v-for="(card, index) in shuffledCards" :key="card.tempId" size="small" :card="card" :is-selected="selectedIndices.includes(index)" @click="toggleSelect(index)" />
        </div>
      </div>

      <div class="footer-bar">
        <a-button type="primary" size="" :disabled="!canReveal" @click="revealResults" class="reveal-btn"> 查看结果 </a-button>
      </div>
    </div>

    <!-- 阶段二：展示结果 -->
    <div v-else class="result-area">
      <transition-group name="fade-up" tag="div" class="result-display">
        <div v-for="(card, idx) in resultCards" :key="idx" class="result-item">
          <div class="time-tag" v-if="mode === 'three'">{{ timeLabels[idx] }}</div>
          <!-- 传值给子组件 -->
          <TarotCard :card="card" size="large" :is-flipped="true" :is-reversed="card.isReversed" />
        </div>
      </transition-group>
      <div class="back-action">
        <a-button @click="resetAll" size="">重选模式/洗牌</a-button>
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
      isShuffling: false, // 洗牌动画状态
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

      // 1. 开始洗牌：牌组乱序
      // 乱序算法保持不变...
      let deck = [...this.allData];
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      // 2. 为每张牌赋予随机属性（用于动画）
      this.shuffledCards = deck.map((c) => ({
        ...c,
        tempId: Math.random(),
        isReversed: Math.random() > 0.5,
        // 随机旋转角度
        randomRotate: (Math.random() * 10 - 5).toFixed(2),
        // 洗牌时的随机偏移量（用于散射效果）
        tx: Math.random() * 200 - 100,
        ty: Math.random() * 200 - 100,
      }));

      // 3. 模拟动画流程：汇聚 -> 混沌 -> 散开
      // 动画时间延长到 1.5s 更有仪式感
      setTimeout(() => {
        this.isShuffling = false;
      }, 1600);
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
/* 修改 tarot-container 的背景 */
.tarot-container {
  background-color: #0f1215;
  /* 深色背景 */
  /* 或者使用带一点点纹理的深色 */
  background-image: radial-gradient(circle at center, #1a1e23 0%, #0a0a0c 100%);
  overflow: auto;
  height: calc(100vh - 40px);
}
.header h1 {
  color: #d4af37;
  text-align: center;
}
.controls {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin: 20px 0;
}

.status-bar {
  text-align: center;
  margin-bottom: 8px;
  font-size: 16px;
}
.count {
  color: #722ed1;
  font-weight: bold;
  font-size: 20px;
}

/* 牌堆网格：缩小后的排布 */
.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
  gap: 12px;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  transition: all 0.5s ease;
}

.deck-grid:hover .tarot-card-wrapper:not(:hover) {
  opacity: 0.6;
  filter: grayscale(0.3);
  transition: all 0.3s ease;
}

.tarot-card-wrapper:hover {
  opacity: 1 !important;
  filter: brightness(1.2) !important;
  z-index: 100;
}

/* 洗牌动画 */
.is-shuffling {
  transform: scale(0.8);
  filter: blur(2px);
  pointer-events: none;
}
.is-shuffling .tarot-card-wrapper {
  /* 让所有牌向中心随机偏移并抖动 */
  transform: translate(calc(var(--x, 0px)), calc(var(--y, 0px))) rotate(calc(var(--r, 0deg)));
  animation: shake 0.5s infinite;
}

@keyframes shake {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(5px, -5px) rotate(5deg);
  }
  50% {
    transform: translate(-5px, 5px) rotate(-5deg);
  }
  100% {
    transform: translate(0, 0);
  }
}

.footer-bar {
  /* position: fixed; */
  bottom: 40px;
  left: 0;
  right: 0;
  padding: 20px;
  color: white;
  /* background: rgba(0, 0, 0, 0.8); */
  display: flex;
  justify-content: center;
  z-index: 100;
}
.reveal-btn {
  color: #d4af37;
}

/* 结果页 */
.result-display {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
  margin-top: 50px;
}
.time-tag {
  background: gold;
  color: #2a1919;
  padding: 2px 15px;
  text-align: center;
  border-radius: 10px;
  margin-bottom: 10px;
  font-weight: bold;
}
.back-action {
  text-align: center;
  margin-top: 50px;
}

/* 进场动画 */
.fade-up-enter-active {
  transition: all 0.6s ease;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

/* 容器 */
.deck-container {
  position: relative;
  min-height: 500px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 魔法阵效果 */
.magic-circle {
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(114, 46, 209, 0.4) 0%, transparent 70%);
  border: 2px solid rgba(212, 175, 55, 0.2);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0.5) rotate(0deg);
  transition: all 0.8s ease;
  pointer-events: none;
}
.magic-circle.active {
  opacity: 1;
  transform: scale(1.5) rotate(360deg);
  border: 2px dashed rgba(212, 175, 55, 0.5);
  box-shadow: 0 0 50px rgba(114, 46, 209, 0.5);
}

/* 牌堆网格 */
.deck-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 15px;
  max-width: 1000px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 洗牌中的核心动画 */
.is-shuffling .tarot-card-wrapper {
  /* 让所有牌飞向中心点 */
  position: relative;
  /* 计算每张牌飞往中心所需的抵消值，这里简单处理为向中心聚拢 */
  animation: vortex 1.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
  /* 利用变量实现交错飞入 */
  animation-delay: calc(var(--index) * 2ms);
  z-index: 100;
}

@keyframes vortex {
  0% {
    transform: rotate(0deg);
  }
  30% {
    /* 汇聚阶段：所有牌向中心聚拢并缩小 */
    transform: translate(calc(500px - 50vw), /* 动态计算中心点需配合JS，这里演示效果使用大致偏移 */ calc(300px - 50vh)) rotate(720deg) scale(0.2);
    opacity: 0.8;
  }
  60% {
    /* 混沌阶段：高频震动 */
    transform: translate(calc(500px - 50vw + 5px), calc(300px - 50vh + 5px)) rotate(1080deg) scale(0.3);
    filter: brightness(2) blur(1px);
  }
  100% {
    /* 散开阶段：回到原位 */
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
}

/* 鼠标悬停时的发光效果 */
.tarot-card-wrapper:hover {
  filter: brightness(1.3) drop-shadow(0 0 10px rgba(212, 175, 55, 0.8));
  transition: all 0.3s ease;
}
</style>
