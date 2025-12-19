/**
 * ============================================================================
 * 主窗口管理模块 (Main Window Manager)
 * ============================================================================
 * 
 * 功能说明：
 * 本模块负责管理应用的主窗口（应用主界面），包括窗口的创建、生命周期管理、
 * 窗口状态控制以及与系统托盘的集成。
 * 
 * 主要功能：
 * 1. 创建和管理应用主窗口（单例模式）
 * 2. 根据环境加载内容（开发环境加载 Vite 服务器，生产环境加载构建文件）
 * 3. 处理窗口事件（关闭、最小化、大小变化）
 * 4. 支持最小化到托盘功能
 * 5. 窗口状态控制（最小化、最大化、关闭）
 * 6. 注册窗口相关的 IPC 处理器
 * 
 * 导出的函数：
 * - createMainWindow()         创建主窗口
 * - getMainWindow()            获取主窗口实例
 * - showAndFocusMainWindow()   显示并聚焦主窗口（用于单实例处理）
 * - registerIpcHandlers()      注册窗口相关的 IPC 处理器
 * 
 * IPC 处理器：
 * - minimize-window             最小化窗口
 * - maximize-window             最大化/还原窗口
 * - close-window                关闭窗口
 * 
 * ============================================================================
 */

const { BrowserWindow } = require('electron')
const path = require('path')

// 主窗口实例
let mainWindow = null

/**
 * 创建主窗口
 * @param {boolean} isDev - 是否为开发环境
 * @param {Function} getMinimizeToTrayEnabled - 获取最小化到托盘功能状态
 * @param {Function} getSystemTray - 获取系统托盘实例的函数
 * @param {Function} displayBalloon - 显示托盘通知的函数
 * @returns {BrowserWindow} 主窗口实例
 */
function createMainWindow(isDev, getMinimizeToTrayEnabled, getSystemTray, displayBalloon) {
  // 如果窗口已存在，直接返回
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow
  }

  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../../preload.js'),
      // 允许在 http(s) 环境下加载 file:// 资源（用于本地视频缩略图生成）
      webSecurity: false
    },
    icon: path.join(__dirname, '../../butter-icon.ico'), // 应用图标
    titleBarStyle: 'default',
    show: false // 先不显示，等加载完成后再显示
  })

  // 加载应用
  console.log('当前环境:', isDev ? '开发环境' : '生产环境')
  
  if (isDev) {
    // 开发环境：加载Vite开发服务器
    console.log('正在加载: http://localhost:5173')
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      console.error('加载失败:', err)
      // 如果Vite服务器还没启动，等待一下再重试
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL('http://localhost:5173').catch(console.error)
        }
      }, 2000)
    })
  } else {
    // 生产环境：加载构建后的文件
    const indexPath = path.join(__dirname, '../../dist/index.html')
    console.log('正在加载文件:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // 窗口准备好后显示
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      
      // 开发环境下自动打开开发者工具
      if (isDev) {
        mainWindow.webContents.openDevTools()
      }
    }
  })

  // 当窗口被关闭时触发
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  
  // 处理窗口关闭事件（支持最小化到托盘）
  mainWindow.on('close', (event) => {
    const minimizeToTrayEnabled = getMinimizeToTrayEnabled ? getMinimizeToTrayEnabled() : false
    const tray = getSystemTray ? getSystemTray() : null
    
    if (minimizeToTrayEnabled && tray) {
      // 阻止默认的关闭行为
      event.preventDefault()
      // 最小化到托盘
      mainWindow.hide()
      // 显示托盘通知
      if (displayBalloon) {
        displayBalloon({
          title: 'Green Resource Manager',
          content: '应用已最小化到系统托盘'
        })
      }
    }
  })
  
  // 处理窗口最小化事件 - 正常最小化到任务栏，不干预
  mainWindow.on('minimize', (event) => {
    // 允许正常的最小化行为，不干预
    // console.log('窗口已最小化到任务栏')
  })

  // 处理窗口大小变化
  mainWindow.on('resize', () => {
    // 可以在这里添加窗口大小变化的处理逻辑
  })

  return mainWindow
}

/**
 * 获取主窗口实例
 * @returns {BrowserWindow|null} 主窗口实例
 */
function getMainWindow() {
  return mainWindow
}

/**
 * 显示并聚焦主窗口
 */
function showAndFocusMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // 如果窗口被最小化，恢复窗口
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }
    
    // 显示并聚焦窗口
    mainWindow.show()
    mainWindow.focus()
    
    // 在 Windows 上，确保窗口在最前面
    if (process.platform === 'win32') {
      mainWindow.setAlwaysOnTop(true)
      // 短暂置顶后取消，确保窗口出现在最前面
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.setAlwaysOnTop(false)
        }
      }, 100)
    }
  }
}

/**
 * 注册主窗口相关的 IPC 处理器
 * @param {IpcMain} ipcMain - Electron IPC Main 对象
 */
function registerIpcHandlers(ipcMain) {
  // 最小化窗口
  ipcMain.handle('minimize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
  })

  // 最大化/还原窗口
  ipcMain.handle('maximize-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize()
      } else {
        mainWindow.maximize()
      }
    }
  })

  // 关闭窗口
  ipcMain.handle('close-window', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
  })
}

module.exports = {
  createMainWindow,
  getMainWindow,
  showAndFocusMainWindow,
  registerIpcHandlers
}

