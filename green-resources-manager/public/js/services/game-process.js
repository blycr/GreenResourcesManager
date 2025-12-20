/**
 * @module GameProcess
 * @description 管理游戏进程的启动、终止、监控和窗口控制。
 *
 * 主要功能:
 * 1. 启动游戏进程并跟踪进程信息（PID、启动时间、可执行路径、游戏名称等）。
 * 2. 监听游戏进程的退出事件，计算游戏运行时长并通知渲染进程。
 * 3. 通过可执行文件路径强制终止游戏进程。
 * 4. 通过 PID 查找游戏进程信息（包括子进程，通过进程树遍历）。
 * 5. 最小化所有正在运行的游戏窗口。
 * 6. 获取游戏进程的所有窗口标题。
 * 7. 注册与游戏进程相关的 IPC 处理器。
 *
 * 导出的函数:
 * - `getGameProcessesCount()`: 获取当前运行的游戏进程数量。
 * - `minimizeAllGameWindows()`: 最小化所有正在运行的游戏窗口。
 * - `findGameInfoByPID(pid)`: 通过 PID 查找游戏信息（包括子进程）。
 * - `registerIpcHandlers(ipcMain, getMainWindow)`: 注册 IPC 处理器。
 *
 * 内部函数:
 * - `launchGame(executablePath, gameName)`: 启动游戏进程。
 * - `terminateGame(executablePath)`: 强制终止游戏进程。
 *
 * IPC 处理器:
 * - `launch-game`: 启动游戏进程。
 * - `terminate-game`: 强制终止游戏进程。
 * - `get-all-window-titles-by-pid`: 通过 PID 获取所有窗口标题。
 *
 * 游戏进程信息结构:
 * {
 *   process: ChildProcess,      // 子进程对象
 *   startTime: number,          // 启动时间戳（毫秒）
 *   executablePath: string,     // 可执行文件路径
 *   gameName: string | null,    // 游戏名称
 *   windowTitles?: string[]     // 窗口标题列表（可选）
 * }
 */

const { spawn } = require('child_process')
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')
const windowsUtils = require('../utils/windows-utils')
const fileUtils = require('../utils/file-utils')

// 存储游戏进程信息的 Map，键为 PID，值为游戏信息对象
const gameProcesses = new Map()

/**
 * 加载设置文件
 * @returns {Promise<Object|null>} 设置对象，如果加载失败则返回null
 */
async function loadSettings() {
  try {
    // 获取当前文件所在目录（public/js/services/）
    const currentDir = __dirname
    // 获取应用根目录（public/）
    const publicDir = path.join(currentDir, '../..')
    // 获取项目根目录（green-resources-manager/）
    const projectRoot = path.join(publicDir, '..')
    
    // 可能的设置文件路径
    const possibleSettingsPaths = [
      path.join(projectRoot, 'SaveData', 'Settings', 'settings.json'),
      path.join(publicDir, '..', 'SaveData', 'Settings', 'settings.json'),
      path.join(process.cwd(), 'SaveData', 'Settings', 'settings.json')
    ]
    
    for (const settingsPath of possibleSettingsPaths) {
      try {
        const normalizedPath = path.normalize(settingsPath)
        if (fs.existsSync(normalizedPath)) {
          const result = await fileUtils.readJsonFile(normalizedPath)
          if (result.success && result.data && result.data.settings) {
            console.log('✅ 成功加载设置文件:', normalizedPath)
            return result.data.settings
          }
        }
      } catch (error) {
        continue
      }
    }
    
    console.warn('⚠️ 未找到设置文件，使用默认设置')
    return null
  } catch (error) {
    console.error('加载设置文件失败:', error)
    return null
  }
}

/**
 * 查找 Ruffle 可执行文件路径
 * @returns {Promise<string|null>} Ruffle 路径，如果未找到则返回null
 */
async function findRufflePath() {
  // 获取当前文件所在目录（public/js/services/）
  const currentDir = __dirname
  // 获取应用根目录（public/）
  const publicDir = path.join(currentDir, '../..')
  // 获取项目根目录（green-resources-manager/）
  const projectRoot = path.join(publicDir, '..')
  
  // 可能的 Ruffle 路径（按优先级排序）
  // 注意：打包后，extraFiles 会将文件放到应用根目录下的 third-party/ 目录
  const possiblePaths = [
    // 打包环境：应用根目录/third-party/ruffle-nightly-2025_12_20-windows-x86_64/ruffle.exe
    path.join(publicDir, '..', 'third-party', 'ruffle-nightly-2025_12_20-windows-x86_64', 'ruffle.exe'),
    // 开发环境：src/third-party/ruffle-nightly-2025_12_20-windows-x86_64/ruffle.exe
    path.join(projectRoot, 'src', 'third-party', 'ruffle-nightly-2025_12_20-windows-x86_64', 'ruffle.exe'),
  ]

  // 检查每个路径
  for (const rufflePath of possiblePaths) {
    try {
      const normalizedPath = path.normalize(rufflePath)
      if (fs.existsSync(normalizedPath)) {
        console.log('✅ 找到 Ruffle:', normalizedPath)
        return normalizedPath
      }
    } catch (error) {
      // 忽略路径错误，继续查找下一个
      continue
    }
  }

  console.warn('⚠️ 未找到 Ruffle 可执行文件')
  console.warn('已检查的路径:', possiblePaths.map(p => path.normalize(p)))
  return null
}

/**
 * 获取当前运行的游戏进程数量。
 * @returns {number} 游戏进程数量。
 */
function getGameProcessesCount() {
  return gameProcesses.size
}

/**
 * 通过 PID 查找对应的游戏信息（包括子进程）。
 * 如果直接匹配失败，会通过向上遍历进程树来查找父进程。
 * @param {number} pid - 进程 ID。
 * @returns {Promise<Object|null>} 游戏信息对象或 null。
 */
async function findGameInfoByPID(pid) {
  // 首先检查直接匹配
  if (gameProcesses.has(pid)) {
    return gameProcesses.get(pid)
  }

  // 如果不是直接匹配，检查是否是某个游戏进程的子进程
  // 通过向上遍历进程树来查找
  let currentPid = pid
  const maxDepth = 10 // 防止无限循环
  let depth = 0

  try {
    while (depth < maxDepth) {
      // 获取当前进程的父进程 PID
      const parentPid = await windowsUtils.getParentProcessID(currentPid)

      // 检查父进程是否在我们的游戏进程列表中
      if (gameProcesses.has(parentPid)) {
        console.log(`✅ 通过进程树匹配到游戏: PID ${pid} 是游戏进程 ${parentPid} 的子进程`)
        return gameProcesses.get(parentPid)
      }

      // 如果父进程是系统进程（PID < 100），停止查找
      if (parentPid < 100) {
        break
      }

      currentPid = parentPid
      depth++
    }
  } catch (error) {
    // 如果获取父进程失败，返回 null
    console.warn('检查进程树时出错:', error.message)
    return null
  }

  return null
}

/**
 * 启动游戏进程。
 * @param {string} executablePath - 游戏可执行文件路径。
 * @param {string|null} gameName - 游戏名称。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @returns {Promise<{success: boolean, pid?: number, windowTitles?: string[], error?: string}>} 启动结果。
 */
async function launchGame(executablePath, gameName, getMainWindow) {
  try {
    console.log('启动游戏:', executablePath, '游戏名称:', gameName)

    // 检查文件是否存在
    if (!fs.existsSync(executablePath)) {
      throw new Error('游戏文件不存在')
    }

    // 检查是否为Flash游戏（.swf文件）
    const fileExt = path.extname(executablePath).toLowerCase()
    const isFlashGame = fileExt === '.swf'

    let gameProcess
    let actualExecutablePath = executablePath

    if (isFlashGame) {
      // Flash游戏：根据设置选择播放器
      console.log('🎮 检测到Flash游戏')
      
      // 加载设置
      const settings = await loadSettings()
      const useBuiltInFlashPlayer = settings?.useBuiltInFlashPlayer !== false // 默认为true
      const customFlashPlayerPath = settings?.customFlashPlayerPath || ''
      
      let flashPlayerPath = null
      
      if (useBuiltInFlashPlayer) {
        // 使用内置 Ruffle
        console.log('📦 使用内置 Flash 播放器 (Ruffle)')
        flashPlayerPath = await findRufflePath()
        if (!flashPlayerPath) {
          throw new Error('未找到内置 Ruffle。请确保 Ruffle 已正确安装到 third-party 目录。')
        }
      } else {
        // 使用自定义播放器
        console.log('🔧 使用自定义 Flash 播放器')
        if (!customFlashPlayerPath || customFlashPlayerPath.trim() === '') {
          // 通知主窗口显示错误（通过返回错误信息）
          const mainWindow = getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('flash-player-error', {
              type: 'no-path',
              message: '已选择使用自定义 Flash 播放器，但未指定播放器路径。请在设置中配置自定义播放器路径。'
            })
          }
          throw new Error('未指定自定义 Flash 播放器路径。请在设置中配置。')
        }
        
        // 验证自定义播放器路径
        if (!fs.existsSync(customFlashPlayerPath)) {
          const mainWindow = getMainWindow()
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('flash-player-error', {
              type: 'path-not-found',
              message: `自定义 Flash 播放器路径不存在: ${customFlashPlayerPath}`
            })
          }
          throw new Error(`自定义 Flash 播放器路径不存在: ${customFlashPlayerPath}`)
        }
        
        flashPlayerPath = customFlashPlayerPath
      }

      // 使用选定的播放器运行.swf文件
      actualExecutablePath = flashPlayerPath
      gameProcess = spawn(flashPlayerPath, [executablePath], {
        detached: true,
        stdio: 'ignore'
      })
      
      console.log(`✅ 使用 Flash 播放器运行: ${flashPlayerPath} "${executablePath}"`)
    } else {
      // 普通游戏：直接运行可执行文件
      gameProcess = spawn(executablePath, [], {
        detached: true,
        stdio: 'ignore'
      })
    }

    // 记录游戏启动时间
    const startTime = Date.now()
    const gameInfo = {
      process: gameProcess,
      startTime: startTime,
      executablePath: executablePath, // 保存原始路径（.swf文件路径或普通游戏路径）
      actualExecutablePath: actualExecutablePath, // 保存实际运行的可执行文件路径（Ruffle路径或普通游戏路径）
      gameName: gameName || null,
      isFlashGame: isFlashGame
    }

    // 存储进程信息
    gameProcesses.set(gameProcess.pid, gameInfo)

    // 监听进程退出事件
    gameProcess.on('exit', (code, signal) => {
      console.log(`[DEBUG] 🔴 exit事件触发 - 游戏进程 ${gameProcess.pid} 已退出，退出码: ${code}, 信号: ${signal}, 游戏: ${gameName || executablePath}`)

      // 计算游戏运行时长
      const endTime = Date.now()
      const playTime = Math.floor((endTime - startTime) / 1000) // 转换为秒

      console.log(`[DEBUG] 📊 游戏运行时长: ${playTime} 秒`)

      // 通知渲染进程更新游戏时长
      const mainWindow = getMainWindow()
      if (mainWindow && !mainWindow.isDestroyed()) {
        console.log(`[DEBUG] 📤 发送 game-process-ended 事件，PID: ${gameProcess.pid}, executablePath: ${executablePath}`)
        mainWindow.webContents.send('game-process-ended', {
          pid: gameProcess.pid,
          playTime: playTime,
          executablePath: executablePath
        })
        console.log(`[DEBUG] ✅ game-process-ended 事件已发送`)
      } else {
        console.log(`[DEBUG] ⚠️ mainWindow 不可用，无法发送 game-process-ended 事件`)
      }

      // 从进程列表中移除
      gameProcesses.delete(gameProcess.pid)
      console.log(`[DEBUG] 🗑️ 已从 gameProcesses 中移除 PID: ${gameProcess.pid}`)
    })

    // 监听进程错误事件
    gameProcess.on('error', (error) => {
      console.error(`游戏进程 ${gameProcess.pid} 发生错误:`, error)
      if (isFlashGame) {
        // 通知主窗口显示错误提示
        const mainWindow = getMainWindow()
        if (mainWindow && !mainWindow.isDestroyed()) {
          const errorMessage = error.message || String(error)
          mainWindow.webContents.send('flash-player-error', {
            type: 'launch-failed',
            message: `Flash 游戏启动失败: ${errorMessage}\n\n可能的原因：\n1. Flash 播放器路径不正确\n2. .swf文件损坏或格式不正确\n3. Flash 播放器版本不兼容`
          })
        }
        console.error('Flash游戏启动失败，可能的原因：')
        console.error('1. Flash 播放器未正确安装或路径不正确')
        console.error('2. .swf文件损坏或格式不正确')
        console.error('3. Flash 播放器版本不兼容')
      }
      gameProcesses.delete(gameProcess.pid)
    })

    // 分离进程，让游戏独立运行
    gameProcess.unref()

    console.log('游戏已启动，进程ID:', gameProcess.pid)

    // 等待一段时间让窗口创建，然后尝试获取所有窗口标题
    let windowTitles = []
    try {
      // 等待 1 秒让窗口有时间创建
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 尝试获取所有窗口标题（最多重试 3 次）
      for (let i = 0; i < 3; i++) {
        windowTitles = await windowsUtils.getAllWindowTitlesByPID(gameProcess.pid)
        if (windowTitles && windowTitles.length > 0) {
          console.log('✅ 获取到窗口标题列表:', windowTitles)
          break
        }
        // 如果还没获取到，再等待 2 秒后重试
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      if (!windowTitles || windowTitles.length === 0) {
        console.log('⚠️ 未能获取到窗口标题（可能窗口还未创建或进程没有窗口）')
      }
    } catch (error) {
      console.warn('获取窗口标题时出错:', error.message)
      // 不影响启动流程，继续执行
    }

    // 将窗口标题列表保存到 gameInfo 中
    if (windowTitles && windowTitles.length > 0) {
      gameInfo.windowTitles = windowTitles
    }

    return {
      success: true,
      pid: gameProcess.pid,
      windowTitles: windowTitles.length > 0 ? windowTitles : undefined
    }
  } catch (error) {
    console.error('启动游戏失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 强制终止游戏进程。
 * @param {string} executablePath - 游戏可执行文件路径。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 * @returns {Promise<{success: boolean, pid?: number, playTime?: number, error?: string}>} 终止结果。
 */
async function terminateGame(executablePath, getMainWindow) {
  try {
    console.log('[DEBUG] 🛑 请求强制结束游戏，executablePath:', executablePath)

    if (!executablePath) {
      return { success: false, error: '可执行文件路径不能为空' }
    }

    // 查找匹配的游戏进程
    let targetPid = null
    let targetGameInfo = null

    for (const [pid, gameInfo] of gameProcesses.entries()) {
      if (gameInfo.executablePath === executablePath) {
        targetPid = pid
        targetGameInfo = gameInfo
        break
      }
    }

    if (!targetPid || !targetGameInfo) {
      console.log('[DEBUG] ⚠️ 未找到运行中的游戏进程，executablePath:', executablePath)
      return { success: false, error: '未找到运行中的游戏进程' }
    }

    console.log('[DEBUG] 🎯 找到游戏进程，PID:', targetPid, '游戏:', targetGameInfo.gameName || executablePath)

    // 计算游戏运行时长
    const endTime = Date.now()
    const startTime = targetGameInfo.startTime
    const playTime = Math.floor((endTime - startTime) / 1000)

    // 尝试通过进程对象终止
    try {
      const gameProcess = targetGameInfo.process
      if (gameProcess && !gameProcess.killed) {
        console.log('[DEBUG] 🔪 尝试通过 process.kill() 终止进程')
        gameProcess.kill('SIGTERM')

        // 等待进程退出，最多等待 3 秒
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log('[DEBUG] ⚠️ 进程未在 3 秒内退出，尝试强制终止')
            try {
              gameProcess.kill('SIGKILL')
            } catch (e) {
              console.error('[DEBUG] ❌ 强制终止失败:', e)
            }
            resolve()
          }, 3000)

          gameProcess.once('exit', () => {
            clearTimeout(timeout)
            resolve()
          })
        })
      }
    } catch (error) {
      console.warn('[DEBUG] ⚠️ 通过 process.kill() 终止失败，尝试使用 PowerShell:', error)
    }

    // 如果进程仍然存在，使用 PowerShell 强制终止
    try {
      await new Promise((resolve, reject) => {
        exec(`powershell -Command "Stop-Process -Id ${targetPid} -Force -ErrorAction SilentlyContinue"`, (error) => {
          if (error) {
            console.warn('[DEBUG] ⚠️ PowerShell 终止进程失败:', error)
            // 不抛出错误，可能进程已经退出
          }
          resolve()
        })
      })
    } catch (error) {
      console.warn('[DEBUG] ⚠️ PowerShell 终止进程异常:', error)
    }

    // 从进程列表中移除
    gameProcesses.delete(targetPid)
    console.log('[DEBUG] 🗑️ 已从 gameProcesses 中移除 PID:', targetPid)

    // 通知渲染进程游戏已结束
    const mainWindow = getMainWindow()
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.log('[DEBUG] 📤 发送 game-process-ended 事件（强制终止），PID:', targetPid, 'executablePath:', executablePath)
      mainWindow.webContents.send('game-process-ended', {
        pid: targetPid,
        playTime: playTime,
        executablePath: executablePath
      })
      console.log('[DEBUG] ✅ game-process-ended 事件已发送')
    }

    console.log('[DEBUG] ✅ 游戏进程已强制终止，PID:', targetPid)
    return { success: true, pid: targetPid, playTime: playTime }
  } catch (error) {
    console.error('[DEBUG] ❌ 强制结束游戏失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 最小化所有正在运行的游戏窗口。
 * @returns {Promise<{success: boolean, minimizedCount?: number, error?: string}>} 最小化结果。
 */
async function minimizeAllGameWindows() {
  try {
    console.log('开始最小化所有游戏窗口...')
    console.log(`当前 gameProcesses 中有 ${gameProcesses.size} 个游戏进程`)

    if (gameProcesses.size === 0) {
      console.log('⚠️ 没有正在运行的游戏进程')
      return { success: true, minimizedCount: 0 }
    }

    const minimizedPids = []
    const failedPids = []

    // 遍历所有游戏进程
    for (const [pid, gameInfo] of gameProcesses.entries()) {
      try {
        console.log(`尝试最小化游戏窗口 (PID: ${pid}, 游戏: ${gameInfo.gameName || '未知'})`)

        // 首先检查进程是否还存在
        const checkProcess = await new Promise((resolve) => {
          exec(`powershell -Command "Get-Process -Id ${pid} -ErrorAction SilentlyContinue"`, (error) => {
            resolve(!error)
          })
        })

        if (!checkProcess) {
          console.log(`⚠️ 进程 ${pid} 已不存在，从列表中移除`)
          gameProcesses.delete(pid)
          continue
        }

        const success = await windowsUtils.minimizeWindowByPID(pid)
        if (success) {
          minimizedPids.push(pid)
          console.log(`✅ 已最小化游戏窗口 (PID: ${pid}, 游戏: ${gameInfo.gameName || '未知'})`)
        } else {
          failedPids.push(pid)
          console.log(`⚠️ 无法最小化游戏窗口 (PID: ${pid})，可能没有可见窗口`)
        }
      } catch (error) {
        failedPids.push(pid)
        console.warn(`最小化游戏窗口失败 (PID: ${pid}):`, error.message)
      }
    }

    console.log(`最小化完成: 成功 ${minimizedPids.length} 个, 失败 ${failedPids.length} 个`)
    return { success: true, minimizedCount: minimizedPids.length }
  } catch (error) {
    console.error('最小化游戏窗口时出错:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 注册与游戏进程相关的 IPC 处理器。
 * @param {Object} ipcMain - Electron 的 ipcMain 对象。
 * @param {Function} getMainWindow - 获取主窗口的函数。
 */
function registerIpcHandlers(ipcMain, getMainWindow) {
  // 启动游戏
  ipcMain.handle('launch-game', async (event, executablePath, gameName) => {
    return await launchGame(executablePath, gameName, getMainWindow)
  })

  // 强制结束游戏
  ipcMain.handle('terminate-game', async (event, executablePath) => {
    return await terminateGame(executablePath, getMainWindow)
  })

  // 通过 PID 获取进程的所有窗口标题
  ipcMain.handle('get-all-window-titles-by-pid', async (event, pid) => {
    try {
      if (!pid) {
        return { success: false, error: 'PID 不能为空' }
      }

      const windowTitles = await windowsUtils.getAllWindowTitlesByPID(pid)
      return { success: true, windowTitles: windowTitles || [] }
    } catch (error) {
      console.error('获取窗口标题失败:', error)
      return { success: false, error: error.message, windowTitles: [] }
    }
  })
}

module.exports = {
  getGameProcessesCount,
  minimizeAllGameWindows,
  findGameInfoByPID,
  registerIpcHandlers
}

