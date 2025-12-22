<template>
  <div class="business-card-container">
    <div class="personal-header">
      <h2 class="personal-title">关于开发者</h2>
      <p class="personal-subtitle">Made by YanChenXiang ❤️</p>
    </div>

    <div class="business-card-wrapper" 
         @click="flipCard"
         @mousemove="handleMouseMove"
         @mouseleave="handleMouseLeave"
         :style="cardTransformStyle">
      <div class="business-card" :class="{ 'flipped': isCardFlipped }">
        <div class="card-face card-front">
          <img src="/imgs/名片 - 正面.png" alt="名片正面" class="card-image" />
          <div class="card-overlay">
            <span class="flip-hint">点击翻转</span>
          </div>
        </div>
        <div class="card-face card-back">
          <img src="/imgs/名片 - 背面.png" alt="名片背面" class="card-image" />
          <div class="card-overlay">
            <span class="flip-hint">点击翻转</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useBusinessCard } from '../../composables/useBusinessCard'

const {
  isCardFlipped,
  cardTransformStyle,
  flipCard,
  handleMouseMove,
  handleMouseLeave
} = useBusinessCard()
</script>

<style scoped>
.business-card-container {
  max-width: 900px;
  margin: 60px auto 40px;
  padding: 0 20px;
}

.personal-header {
  text-align: center;
  margin-bottom: 50px;
}

.personal-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 10px 0;
  letter-spacing: 1px;
}

.personal-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin: 0;
  font-style: italic;
}

.business-card-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  margin: 40px 0;
  perspective: 1200px;
  cursor: pointer;
  transition: transform 0.1s ease-out;
}

.business-card {
  position: relative;
  width: 500px;
  height: 750px;
  transform-style: preserve-3d;
  transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.business-card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.3s ease;
}

.business-card-wrapper:hover .card-face {
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.card-front {
  transform: rotateY(0deg);
}

.card-back {
  transform: rotateY(180deg) scaleX(-1);
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.card-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 20px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.business-card-wrapper:hover .card-overlay {
  opacity: 1;
}

.flip-hint {
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 16px;
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .personal-title {
    font-size: 2rem;
  }

  .business-card {
    width: 400px;
    height: 240px;
  }
}
</style>

