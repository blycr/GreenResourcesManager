import { type Ref } from 'vue'
import { formatPlayTime } from '../utils/formatters'
import notify from '../utils/NotificationService.ts'
import type { Game } from './useGameManagement'

/**
 * 游戏时长管理的 composable
 */
export function useGamePlayTime(
  games: Ref<Game[]>,
  updateGamePlayTimeFn: (executablePath: string, playTimeSeconds: number) => Promise<void>,
  updateGameFn: (gameId: string, updates: Partial<Game>) => Promise<void>,
  checkGameTimeAchievementsFn: () => Promise<void>,
  removeRunningGameFn: (gameId: string) => void
) {
  /**
   * 更新游戏游玩时长（从进程结束事件调用）
   */
  async function updateGamePlayTime(data: { executablePath: string; playTime: number }) {
    console.log(`[DEBUG] 🎮 updateGamePlayTime 被调用，数据:`, data)
    
    // 根据可执行文件路径找到对应的游戏
    const game = games.value.find(g => g.executablePath === data.executablePath)
    if (game) {
      console.log(`[DEBUG] ✅ 找到游戏 ${game.name}，进程结束，时长:`, data.playTime, '秒')

      // 更新游戏时长和最后游玩时间
      await updateGamePlayTimeFn(data.executablePath, data.playTime)
      await updateGameFn(game.id, {
        lastPlayed: new Date().toISOString()
      })

      // 从全局运行列表中移除
      console.log(`[DEBUG] 🔄 调用 removeRunningGame(${game.id})`)
      removeRunningGameFn(game.id)

      await checkGameTimeAchievementsFn()

      // 显示通知
      const updatedGame = games.value.find(g => g.id === game.id)
      notify.native(
        '游戏已结束',
        `${game.name} 本次游玩 ${formatPlayTime(data.playTime)}，总时长 ${formatPlayTime(updatedGame?.playTime || 0)}`
      )

      console.log(`[DEBUG] ✅ 游戏 ${game.name} 进程结束处理完成`)
    } else {
      console.warn(`[DEBUG] ⚠️ 未找到对应的游戏，executablePath: ${data.executablePath}`)
    }
  }

  /**
   * 格式化游玩时长（导出以便组件使用）
   */
  function formatPlayTimeDisplay(seconds: number): string {
    return formatPlayTime(seconds)
  }

  /**
   * 获取游戏总游玩时长
   */
  function getTotalPlayTime(): number {
    return games.value.reduce((total, game) => {
      return total + (game.playTime || 0)
    }, 0)
  }

  /**
   * 获取游戏平均游玩时长
   */
  function getAveragePlayTime(): number {
    const gamesWithPlayTime = games.value.filter(game => (game.playTime || 0) > 0)
    if (gamesWithPlayTime.length === 0) return 0
    
    const total = getTotalPlayTime()
    return Math.floor(total / gamesWithPlayTime.length)
  }

  /**
   * 获取游玩时长最长的游戏
   */
  function getLongestPlayTimeGame(): Game | null {
    if (games.value.length === 0) return null
    
    return games.value.reduce((longest, game) => {
      const longestTime = longest?.playTime || 0
      const gameTime = game.playTime || 0
      return gameTime > longestTime ? game : longest
    }, null as Game | null)
  }

  return {
    updateGamePlayTime,
    formatPlayTimeDisplay,
    getTotalPlayTime,
    getAveragePlayTime,
    getLongestPlayTimeGame
  }
}

