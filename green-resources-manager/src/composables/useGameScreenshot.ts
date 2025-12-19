import { ref, type Ref } from 'vue'
import saveManager from '../utils/SaveManager.ts'
import notify from '../utils/NotificationService.ts'

/**
 * 游戏截图功能的 composable
 */
export function useGameScreenshot(
  isElectronEnvironment: Ref<boolean>,
  getRunningGames: () => Map<string, any> // 获取运行中游戏的函数
) {
  const isScreenshotInProgress = ref(false)
  const lastScreenshotTime = ref(0)

  /**
   * 播放截图音效
   */
  function playScreenshotSound() {
    try {
      const audio = new Audio('./camera.mp3')
      audio.volume = 1
      audio.play().catch(error => {
        console.warn('播放截图音效失败:', error)
      })
    } catch (error) {
      console.warn('创建音频对象失败:', error)
    }
  }

  /**
   * 获取截图设置
   */
  async function getScreenshotSettings() {
    const settings = await saveManager.loadSettings()
    
    // 根据截图位置设置确定实际路径
    let screenshotsPath = ''
    if (settings.screenshotLocation === 'default') {
      screenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
    } else if (settings.screenshotLocation === 'custom') {
      screenshotsPath = settings.screenshotsPath || ''
    } else {
      // 兼容旧设置
      screenshotsPath = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
    }

    return {
      screenshotsPath,
      format: settings.screenshotFormat || 'png',
      quality: settings.screenshotQuality || 90,
      showNotification: settings.screenshotNotification !== false,
      autoOpenFolder: settings.autoOpenScreenshotFolder || false,
      smartWindowDetection: settings.smartWindowDetection !== false,
      screenshotKey: settings.screenshotKey || 'Ctrl+F12'
    }
  }

  /**
   * 转换运行中游戏信息为可序列化格式
   */
  function serializeRunningGames(runningGamesMap: Map<string, any>) {
    const runningGamesInfo: Record<string, any> = {}
    for (const [gameId, runtimeGameData] of runningGamesMap) {
      const gameData = {
        id: String(runtimeGameData.id),
        pid: Number(runtimeGameData.pid),
        windowTitles: Array.isArray(runtimeGameData.windowTitles)
          ? runtimeGameData.windowTitles.map((title: string) => String(title)).filter((title: string) => title)
          : [],
        gameName: runtimeGameData.gameName ? String(runtimeGameData.gameName) : null,
        startTime: Number(runtimeGameData.startTime)
      }
      runningGamesInfo[String(gameId)] = JSON.parse(JSON.stringify(gameData))
    }
    return runningGamesInfo
  }

  /**
   * 截图功能
   */
  async function takeScreenshot() {
    // 防止重复截图
    const now = Date.now()
    if (isScreenshotInProgress.value || (now - lastScreenshotTime.value < 1000)) {
      console.log('截图请求被忽略：正在截图或距离上次截图时间太短')
      return
    }

    isScreenshotInProgress.value = true
    lastScreenshotTime.value = now

    console.log('开始截图，时间戳:', now)

    try {
      // 获取运行中的游戏信息
      const runningGamesMap = getRunningGames()
      const runningGamesInfo = serializeRunningGames(runningGamesMap)

      // 获取截图设置
      const settings = await getScreenshotSettings()

      console.log('截图设置:', {
        runningGames: runningGamesInfo,
        screenshotLocation: settings.screenshotsPath,
        format: settings.format,
        quality: settings.quality,
        smartWindowDetection: settings.smartWindowDetection
      })

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.takeScreenshot) {
        // 确保截图目录存在
        try {
          if (window.electronAPI.ensureDirectory) {
            const result = await window.electronAPI.ensureDirectory(settings.screenshotsPath)
            if (result.success) {
              console.log('截图目录已确保存在:', settings.screenshotsPath)
            } else {
              console.warn('创建截图目录失败:', result.error)
            }
          }
        } catch (error) {
          console.warn('创建截图目录失败:', error)
        }

        const result = await window.electronAPI.takeScreenshot(
          settings.screenshotsPath,
          settings.format,
          settings.quality,
          runningGamesInfo
        )

        if (result.success) {
          console.log('截图成功:', result.filepath, '窗口:', result.windowName)

          // 播放截图音效
          playScreenshotSound()

          if (settings.showNotification) {
            setTimeout(() => {
              const folderInfo = result.matchedGame
                ? `游戏文件夹: ${result.gameFolder}`
                : `文件夹: ${result.gameFolder}`
              notify.toast(
                'success',
                '截图成功',
                `截图已保存为: ${result.filepath}\n${folderInfo}\n窗口: ${result.windowName}`
              )
            }, 100)
          }

          // 自动打开截图文件夹
          if (settings.autoOpenFolder && isElectronEnvironment.value && window.electronAPI && window.electronAPI.openFolder) {
            try {
              await window.electronAPI.openFolder(result.filepath)
            } catch (error) {
              console.error('打开文件夹失败:', error)
            }
          }
        } else {
          console.error('截图失败:', result.error)
          if (settings.showNotification) {
            setTimeout(() => {
              notify.toast('error', '截图失败', result.error)
            }, 100)
          }
        }
      } else {
        console.log('Electron API不可用，无法截图')
        if (settings.showNotification) {
          setTimeout(() => {
            notify.toast('error', '截图失败', '当前环境不支持截图功能')
          }, 100)
        }
      }
    } catch (error: any) {
      console.error('截图过程中发生错误:', error)
      const settings = await getScreenshotSettings()
      if (settings.showNotification) {
        setTimeout(() => {
          notify.toast('error', '截图失败', error.message)
        }, 100)
      }
    } finally {
      isScreenshotInProgress.value = false
    }
  }

  /**
   * 打开游戏截图文件夹
   */
  async function openGameScreenshotFolder(game: { name: string; executablePath?: string }) {
    try {
      const settings = await saveManager.loadSettings()

      // 确定基础截图路径
      let baseScreenshotsPath = ''
      if (settings.screenshotLocation === 'default') {
        baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
      } else if (settings.screenshotLocation === 'custom') {
        baseScreenshotsPath = settings.screenshotsPath || ''
      } else {
        baseScreenshotsPath = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
      }

      if (!baseScreenshotsPath || baseScreenshotsPath.trim() === '') {
        baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
      }

      // 确定游戏文件夹名称
      let gameFolderName = 'Screenshots'
      if (game.name && game.name !== 'Screenshot') {
        // 清理游戏名称，移除特殊字符
        gameFolderName = game.name.replace(/[<>:"/\\|?*]/g, '').trim() || 'Screenshots'
      } else {
        gameFolderName = 'Screenshots'
      }

      const gameScreenshotPath = `${baseScreenshotsPath}/${gameFolderName}`

      console.log('尝试打开游戏截图文件夹:', gameScreenshotPath)

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.openFolder) {
        // 确保目录存在
        try {
          if (window.electronAPI.ensureDirectory) {
            const ensureResult = await window.electronAPI.ensureDirectory(gameScreenshotPath)
            if (ensureResult.success) {
              console.log('游戏截图目录已确保存在:', gameScreenshotPath)
            }
          }
        } catch (error) {
          console.warn('创建游戏截图目录失败:', error)
        }

        const result = await window.electronAPI.openFolder(gameScreenshotPath)
        if (result.success) {
          console.log('游戏截图文件夹已打开:', gameScreenshotPath)
          notify.native('文件夹已打开', `已打开 ${game.name} 的截图文件夹`)
        } else {
          console.error('打开游戏截图文件夹失败:', result.error)
          alert(`打开截图文件夹失败: ${result.error}`)
        }
      } else {
        alert(`${game.name} 的截图文件夹路径:\n${gameScreenshotPath}\n\n在浏览器环境中无法直接打开文件夹，请手动导航到该路径`)
      }
    } catch (error: any) {
      console.error('打开游戏截图文件夹失败:', error)
      alert(`打开截图文件夹失败: ${error.message}`)
    }
  }

  /**
   * 初始化全局快捷键
   */
  async function initializeGlobalShortcut() {
    try {
      const settings = await getScreenshotSettings()
      const screenshotKey = settings.screenshotKey

      console.log('初始化全局快捷键:', screenshotKey)

      if (isElectronEnvironment.value && window.electronAPI && window.electronAPI.updateGlobalShortcut) {
        const result = await window.electronAPI.updateGlobalShortcut(screenshotKey)
        if (result.success) {
          console.log('全局快捷键更新成功:', result.key)
        } else {
          console.error('全局快捷键更新失败:', result.error)
        }
      }
    } catch (error) {
      console.error('初始化全局快捷键失败:', error)
    }
  }

  /**
   * 清理全局截图事件监听器
   */
  function cleanupGlobalScreenshotListener() {
    if (isElectronEnvironment.value && window.electronAPI) {
      if (window.electronAPI.removeGlobalScreenshotListener) {
        window.electronAPI.removeGlobalScreenshotListener()
        console.log('清理全局截图事件监听器')
      } else if (window.electronAPI.removeAllListeners) {
        window.electronAPI.removeAllListeners('global-screenshot-trigger')
        console.log('清理所有全局截图事件监听器')
      }
    }
  }

  return {
    isScreenshotInProgress,
    lastScreenshotTime,
    takeScreenshot,
    playScreenshotSound,
    openGameScreenshotFolder,
    initializeGlobalShortcut,
    cleanupGlobalScreenshotListener
  }
}

