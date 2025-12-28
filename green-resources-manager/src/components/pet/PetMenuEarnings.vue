<template>
  <div class="menu-earnings">
    <div class="earnings-header">
      <h3 class="earnings-title">收益</h3>
      <p class="earnings-subtitle">资源收益统计</p>
    </div>
    
    <!-- 收益内容区域 -->
    <div class="earnings-content">
      <div class="earnings-section">
        <div class="earnings-blocks">
          <EarningsResourceItem
            icon="🎮"
            label="游戏数量"
            :count="gameCount"
            :is-loading="isLoading"
            :last-earnings-time="props.lastEarningsTime ?? null"
            :current-time="currentTime"
            :hourly-earnings="gameHourlyEarnings"
          />
          
          <EarningsResourceItem
            icon="📚"
            label="小说数量"
            :count="novelCount"
            :is-loading="isLoading"
            :last-earnings-time="props.lastEarningsTime ?? null"
            :current-time="currentTime"
            :hourly-earnings="novelHourlyEarnings"
          />
          
          <EarningsResourceItem
            icon="🎬"
            label="视频数量"
            :count="videoCount"
            :is-loading="isLoading"
            :last-earnings-time="props.lastEarningsTime ?? null"
            :current-time="currentTime"
            :hourly-earnings="videoHourlyEarnings"
          />
          
          <EarningsResourceItem
            icon="🖼️"
            label="图片数量"
            :count="imageCount"
            :is-loading="isLoading"
            :last-earnings-time="props.lastEarningsTime ?? null"
            :current-time="currentTime"
            :hourly-earnings="imageHourlyEarnings"
          />
          
          <EarningsResourceItem
            icon="🎵"
            label="音频数量"
            :count="audioCount"
            :is-loading="isLoading"
            :last-earnings-time="props.lastEarningsTime ?? null"
            :current-time="currentTime"
            :hourly-earnings="audioHourlyEarnings"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import saveManager from '../../utils/SaveManager'
import EarningsResourceItem from './EarningsResourceItem.vue'

const props = defineProps<{
  lastEarningsTime?: string | null
}>()

// 资源数量
const gameCount = ref(0)
const novelCount = ref(0)
const videoCount = ref(0)
const imageCount = ref(0)
const audioCount = ref(0)
const isLoading = ref(false)
const currentTime = ref(Date.now())
let updateTimer: number | null = null

// 使用 prop 的 lastEarningsTime
// 注意：lastEarningsTime 应该由收益系统管理，这里直接使用 prop 的值

// 总资源数量（用于收益计算系统，不在本组件中显示）
const totalResourceCount = computed(() => gameCount.value + novelCount.value + videoCount.value + imageCount.value + audioCount.value)

// 各资源的每小时收益（目前等于资源数量，后续可扩展计算逻辑）
const gameHourlyEarnings = computed(() => gameCount.value)
const novelHourlyEarnings = computed(() => novelCount.value)
const videoHourlyEarnings = computed(() => videoCount.value)
const imageHourlyEarnings = computed(() => imageCount.value)
const audioHourlyEarnings = computed(() => audioCount.value)

// 加载数据
async function loadData() {
  isLoading.value = true
  try {
    // 并行加载所有资源数据
    const [games, novels, videos, images, audios] = await Promise.all([
      saveManager.loadGames(),
      saveManager.loadNovels(),
      saveManager.loadVideos(),
      saveManager.loadImages(),
      saveManager.loadAudios()
    ])
    
    gameCount.value = games.length
    novelCount.value = novels.length
    videoCount.value = videos.length
    imageCount.value = images.length
    audioCount.value = audios.length
    
    // lastEarningsTime 现在通过 props 传递，不需要在这里加载
  } catch (error) {
    console.error('加载数据失败:', error)
    gameCount.value = 0
    novelCount.value = 0
    videoCount.value = 0
    imageCount.value = 0
    audioCount.value = 0
  } finally {
    isLoading.value = false
  }
}

// 更新当前时间（每秒更新一次）
function updateCurrentTime() {
  const newTime = Date.now()
  console.log('[PetMenuEarnings] 更新当前时间:', {
    oldTime: currentTime.value,
    newTime,
    timeString: new Date(newTime).toISOString(),
    lastEarningsTime: props.lastEarningsTime
  })
  currentTime.value = newTime
}

// 监听 lastEarningsTime prop 的变化
watch(() => props.lastEarningsTime, (newValue, oldValue) => {
  console.log('[PetMenuEarnings] lastEarningsTime prop 变化:', {
    oldValue,
    newValue
  })
}, { immediate: true })

// 组件挂载时加载数据并启动定时器
onMounted(() => {
  loadData()
  // 每秒更新一次时间，用于实时显示剩余时间和进度
  updateTimer = window.setInterval(() => {
    updateCurrentTime()
  }, 1000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (updateTimer !== null) {
    clearInterval(updateTimer)
    updateTimer = null
  }
})
</script>

<style scoped>
.menu-earnings {
  padding: 10px 0;
}

.earnings-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.earnings-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 5px 0;
}

.earnings-subtitle {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.earnings-content {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.earnings-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.earnings-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>

