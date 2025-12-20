import { ref, type Ref } from 'vue'
import saveManager from '../../utils/SaveManager.ts'
import notify from '../../utils/NotificationService.ts'
import { unlockAchievement } from '../../pages/user/AchievementView.vue'
import type { Game } from '../../types/game'

const GAME_COLLECTION_ACHIEVEMENTS = [
  { threshold: 50, id: 'game_collector_50' },
  { threshold: 100, id: 'game_collector_100' },
  { threshold: 500, id: 'game_collector_500' },
  { threshold: 1000, id: 'game_collector_1000' }
]

const GAME_TIME_ACHIEVEMENTS = [
  { threshold: 1, id: 'game_time_1' },
  { threshold: 10, id: 'game_time_10' },
  { threshold: 20, id: 'game_time_20' },
  { threshold: 50, id: 'game_time_50' },
  { threshold: 100, id: 'game_time_100' },
  { threshold: 500, id: 'game_time_500' },
  { threshold: 1000, id: 'game_time_1000' }
]

/**
 * 游戏管理的 composable
 */
export function useGameManagement(
  games: Ref<Game[]>,
  extractAllTags: () => void,
  isElectronEnvironment: Ref<boolean>
) {
  /**
   * 加载游戏列表
   */
  async function loadGames() {
    games.value = await saveManager.loadGames()
    extractAllTags()
  }

  /**
   * 保存游戏列表
   */
  async function saveGames() {
    return await saveManager.saveGames(games.value)
  }

  /**
   * 添加游戏
   */
  async function addGame(game: Game) {
    games.value.push(game)
    await saveGames()
    await checkGameCollectionAchievements()
    extractAllTags()
  }

  /**
   * 更新游戏
   */
  async function updateGame(gameId: string, updates: Partial<Game>) {
    const index = games.value.findIndex(g => g.id === gameId)
    if (index === -1) {
      throw new Error('未找到要更新的游戏')
    }

    const target = games.value[index]
    Object.assign(target, updates)

    // 如果可执行文件路径发生变化，重新计算文件夹大小
    if (updates.executablePath && updates.executablePath.trim() !== target.executablePath) {
      let folderSize = 0
      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.getFolderSize) {
        try {
          const result = await window.electronAPI.getFolderSize(updates.executablePath.trim())
          if (result.success) {
            folderSize = result.size
          }
        } catch (error) {
          console.error('获取文件夹大小失败:', error)
        }
      }
      target.folderSize = folderSize
    }

    await saveGames()
    extractAllTags()
  }

  /**
   * 删除游戏
   */
  async function removeGame(gameId: string) {
    const index = games.value.findIndex(g => g.id === gameId)
    if (index === -1) {
      throw new Error('未找到要删除的游戏')
    }

    const game = games.value[index]
    games.value.splice(index, 1)
    await saveGames()

    notify.toast('success', '删除成功', `已成功删除游戏 "${game.name}"`)
  }

  /**
   * 更新游戏游玩时长
   */
  async function updateGamePlayTime(executablePath: string, playTime: number) {
    const game = games.value.find(g => g.executablePath === executablePath)
    if (game) {
      game.playTime = (game.playTime || 0) + playTime
      game.lastPlayed = new Date().toISOString()
      await saveGames()
      await checkGameTimeAchievements()
    }
  }

  /**
   * 更新游戏文件夹大小
   */
  async function updateGameFolderSize(gameId: string) {
    const game = games.value.find(g => g.id === gameId)
    if (!game || !game.executablePath) {
      throw new Error('游戏文件路径不存在')
    }

    if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.getFolderSize) {
      try {
        const result = await window.electronAPI.getFolderSize(game.executablePath)
        if (result.success) {
          const oldSize = game.folderSize || 0
          game.folderSize = result.size
          await saveGames()

          const oldSizeMB = (oldSize / 1024 / 1024).toFixed(2)
          const newSizeMB = (result.size / 1024 / 1024).toFixed(2)

          notify.toast(
            'success',
            '更新成功',
            `"${game.name}" 文件夹大小已更新\n旧大小: ${oldSizeMB} MB\n新大小: ${newSizeMB} MB`
          )
        } else {
          throw new Error(result.error || '获取文件夹大小失败')
        }
      } catch (error: any) {
        console.error('获取文件夹大小失败:', error)
        notify.toast('error', '更新失败', `无法获取 "${game.name}" 的文件夹大小: ${error.message}`)
        throw error
      }
    } else {
      throw new Error('当前环境不支持文件夹大小计算功能')
    }
  }

  /**
   * 检查游戏收藏成就
   */
  async function checkGameCollectionAchievements() {
    if (!Array.isArray(games.value)) return

    const totalGames = games.value.length
    const unlockPromises = GAME_COLLECTION_ACHIEVEMENTS
      .filter(config => totalGames >= config.threshold)
      .map(config => unlockAchievement(config.id))

    if (unlockPromises.length === 0) {
      return
    }

    try {
      await Promise.all(unlockPromises)
    } catch (error) {
      console.warn('触发游戏收藏成就时出错:', error)
    }
  }

  /**
   * 检查游戏时长成就
   */
  async function checkGameTimeAchievements() {
    if (!Array.isArray(games.value) || games.value.length === 0) return

    const totalSeconds = games.value.reduce((sum, game) => {
      const playTime = Number(game?.playTime) || 0
      return sum + playTime
    }, 0)

    if (totalSeconds <= 0) {
      return
    }

    const totalHours = totalSeconds / 3600
    const unlockPromises = GAME_TIME_ACHIEVEMENTS
      .filter(config => totalHours >= config.threshold)
      .map(config => unlockAchievement(config.id))

    if (unlockPromises.length === 0) {
      return
    }

    try {
      await Promise.all(unlockPromises)
    } catch (error) {
      console.warn('触发游戏时长成就时出错:', error)
    }
  }

  /**
   * 检查文件存在性
   */
  async function checkFileExistence() {
    if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.checkFileExists) {
      // 如果API不可用，默认设置为存在
      games.value.forEach(game => {
        game.fileExists = true
      })
      return
    }

    for (const game of games.value) {
      if (!game.executablePath) {
        game.fileExists = false
        continue
      }

      try {
        const result = await window.electronAPI.checkFileExists(game.executablePath)
        game.fileExists = result.exists
      } catch (error) {
        console.error(`检测游戏文件存在性失败: ${game.name}`, error)
        game.fileExists = false
      }
    }

    await saveGames()
  }

  /**
   * 为现有游戏计算文件夹大小（如果还没有的话）
   */
  async function updateExistingGamesFolderSize() {
    const gamesNeedingUpdate = games.value.filter(game =>
      game.executablePath &&
      (game.folderSize === undefined || game.folderSize === null || game.folderSize === 0)
    )

    if (gamesNeedingUpdate.length === 0) {
      return
    }

    if (!isElectronEnvironment.value || !window.electronAPI || !window.electronAPI.getFolderSize) {
      return
    }

    let updatedCount = 0
    for (const game of gamesNeedingUpdate) {
      try {
        const result = await window.electronAPI.getFolderSize(game.executablePath!)
        if (result.success) {
          game.folderSize = result.size
          updatedCount++
        }
      } catch (error) {
        console.error(`计算游戏 ${game.name} 文件夹大小失败:`, error)
      }
    }

    if (updatedCount > 0) {
      await saveGames()
    }
  }

  return {
    // 方法
    loadGames,
    saveGames,
    addGame,
    updateGame,
    removeGame,
    updateGamePlayTime,
    updateGameFolderSize,
    checkGameCollectionAchievements,
    checkGameTimeAchievements,
    checkFileExistence,
    updateExistingGamesFolderSize
  }
}

