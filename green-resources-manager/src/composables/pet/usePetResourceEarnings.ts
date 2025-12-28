/**
 * 桌宠资源收益管理 Composable
 * 负责计算资源收益，每隔1小时产生金币
 */

import { ref, computed, onMounted, onUnmounted } from 'vue'
import saveManager from '../../utils/SaveManager'

const EARNINGS_INTERVAL_MS = 60 * 60 * 1000 // 1小时（毫秒）

export function usePetResourceEarnings(
  coins: { value: number },
  lastEarningsTime: { value: string | null },
  savePetData: () => Promise<void>
) {
  const gameCount = ref(0)
  const novelCount = ref(0)
  const videoCount = ref(0)
  const imageCount = ref(0)
  const audioCount = ref(0)
  const isLoading = ref(false)
  let earningsTimer: number | null = null

  // 总资源数量（游戏 + 小说 + 视频 + 图片 + 音频）
  const totalResourceCount = computed(() => gameCount.value + novelCount.value + videoCount.value + imageCount.value + audioCount.value)

  // 每小时收益（等于资源数量）
  const hourlyEarnings = computed(() => totalResourceCount.value)

  // 加载资源数量
  async function loadResourceCount() {
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
    } catch (error) {
      console.error('加载资源数量失败:', error)
      gameCount.value = 0
      novelCount.value = 0
      videoCount.value = 0
      imageCount.value = 0
      audioCount.value = 0
    } finally {
      isLoading.value = false
    }
  }

  // 计算应该产生的收益
  function calculateEarnings(): number {
    if (!lastEarningsTime.value) {
      // 如果没有上次收益时间，返回0（首次运行时不会立即产生收益）
      return 0
    }

    const now = Date.now()
    const lastTime = new Date(lastEarningsTime.value).getTime()
    const timeDiff = now - lastTime

    if (timeDiff >= EARNINGS_INTERVAL_MS) {
      // 计算应该产生的收益周期数（向下取整）
      const cycles = Math.floor(timeDiff / EARNINGS_INTERVAL_MS)
      return cycles * totalResourceCount.value
    }

    return 0
  }

  // 产生收益
  async function generateEarnings() {
    await loadResourceCount() // 确保资源数量是最新的

    if (!lastEarningsTime.value) {
      // 首次运行，设置当前时间为初始时间，不产生收益
      lastEarningsTime.value = new Date().toISOString()
      await savePetData()
      return
    }

    const earnings = calculateEarnings()
    if (earnings > 0) {
      const cycles = Math.floor((Date.now() - new Date(lastEarningsTime.value).getTime()) / EARNINGS_INTERVAL_MS)
      coins.value += earnings
      lastEarningsTime.value = new Date().toISOString()
      await savePetData()
      console.log(`💰 产生收益: ${earnings} 金币 (${totalResourceCount.value} 个资源 × ${cycles} 个周期)`)
    }
  }

  // 启动定时检查收益
  function startEarningsTimer() {
    // 先立即检查一次
    generateEarnings()

    // 然后每隔1小时检查一次
    earningsTimer = window.setInterval(() => {
      generateEarnings()
    }, EARNINGS_INTERVAL_MS)
  }

  // 停止定时检查
  function stopEarningsTimer() {
    if (earningsTimer !== null) {
      clearInterval(earningsTimer)
      earningsTimer = null
    }
  }

  // 组件挂载时启动（延迟一点，确保数据已加载）
  onMounted(() => {
    // 延迟启动，确保 petData 已经加载完成
    setTimeout(() => {
      loadResourceCount()
      startEarningsTimer()
    }, 100)
  })

  // 组件卸载时清理
  onUnmounted(() => {
    stopEarningsTimer()
  })

  return {
    gameCount,
    totalResourceCount,
    hourlyEarnings,
    isLoading,
    loadResourceCount,
    generateEarnings,
    startEarningsTimer,
    stopEarningsTimer
  }
}

