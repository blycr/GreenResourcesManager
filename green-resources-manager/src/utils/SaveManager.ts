/**
 * SaveManager - 统一管理存档和读档功能
 * 支持本地 JSON 文件存储、文件导入导出、数据备份等功能
 */
class SaveManager {
  dataDirectory: string
  version: string
  dataDirectories: Record<string, string>
  filePaths: Record<string, string>
  thumbnailDirectories: Record<string, string>
  defaultData: Record<string, any>
  // 数据缓存
  dataCache: Record<string, any> = {}
  // 设置缓存
  settingsCache: Record<string, any> | null = null
  settingsCacheDirty: boolean = false  // 标记缓存是否已被修改，需要写入磁盘

  constructor() {
    this.dataDirectory = 'SaveData'
    this.version = '0.0.0' // 默认版本号，将在初始化时更新
    
    // 各种数据类型的根目录
    this.dataDirectories = {
      games: `${this.dataDirectory}/Game`,
      images: `${this.dataDirectory}/Image`,
      videos: `${this.dataDirectory}/Video`,
      audios: `${this.dataDirectory}/Audio`,
      websites: `${this.dataDirectory}/Website`,
      novels: `${this.dataDirectory}/Novel`,
      settings: `${this.dataDirectory}/Settings`
    }
    
    // 各种数据类型的存档文件路径
    this.filePaths = {
      games: `${this.dataDirectories.games}/games.json`,
      images: `${this.dataDirectories.images}/images.json`,
      videos: `${this.dataDirectories.videos}/videos.json`,
      videoFolders: `${this.dataDirectories.videos}/folders.json`, // 视频文件夹
      audios: `${this.dataDirectories.audios}/audios.json`,
      websites: `${this.dataDirectories.websites}/websites.json`,
      novels: `${this.dataDirectories.novels}/novels.json`,
      settings: `${this.dataDirectories.settings}/settings.json`,
      collections: `${this.dataDirectories.settings}/collections.json`,
      user: `${this.dataDirectories.settings}/user.json`, // 用户数据文件
      achievements: `${this.dataDirectories.settings}/achievements.json`, // 成就状态文件
      backup: `${this.dataDirectory}/backup.json` // 备份文件仍在根目录
    }
    
    // 缩略图目录
    this.thumbnailDirectories = {
      videos: `${this.dataDirectories.videos}/Covers`,
      images: `${this.dataDirectories.images}/Covers`,
      audios: `${this.dataDirectories.audios}/Covers`,
      games: `${this.dataDirectories.games}/Covers`
    }
    
    // 默认数据结构
    this.defaultData = {
      games: [],
      images: [],
      videoFolders: [], // 视频文件夹默认数据
      settings: {
        theme: 'auto',
        sidebarWidth: 280,
        autoStart: false,
        minimizeToTray: true,
        disguiseMode: false,
        showWelcome: true,
        sageMode: false,
        safetyKey: 'Ctrl+Alt+Q',
        safetyAppPath: '',
        dataPath: 'C:\\Users\\User\\Documents\\ButterManager',
        autoBackup: true,
        screenshotKey: 'Ctrl+F12',
        screenshotLocation: 'default',
        screenshotsPath: '',
        screenshotFormat: 'png',
        screenshotQuality: 90,
        screenshotNotification: true,
        autoOpenScreenshotFolder: false,
        smartWindowDetection: true,
        videoPlayMode: 'external',
        lastView: 'games', // 记录最后访问的页面
        // 各页面的排序方式设置
        sortSettings: {
          games: 'name',
          images: 'name', 
          videos: 'name',
          novels: 'name',
          websites: 'name',
          audio: 'name'
        }
      }
    }
  }

  /**
   * 写入 JSON 文件
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要写入的数据
   * @returns {Promise<boolean>} 写入是否成功
   */
  /**
   * 获取应用版本号
   * @returns {Promise<string>} 版本号
   */
  async getAppVersion() {
    try {
      
      
      //从 package.json 导入
      try {
        const packageJson = await import('../../package.json')
        return packageJson.version || '0.0.0'
      } catch (importError) {
        console.warn('无法从 package.json 获取版本号:', importError)
      }
      
      return '0.0.0'
    } catch (error) {
      console.warn('获取版本号失败:', error)
      return '0.0.0'
    }
  }

  /**
   * 初始化存档系统
   * 检查并创建必要的文件夹和默认文件
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async initialize() {
    try {
      console.log('=== 初始化存档系统 ===')
      
      // 获取应用版本号
      this.version = await this.getAppVersion()
      console.log('应用版本号:', this.version)
      
      // 首先从根目录读取设置，确定真正的存档位置
      try {
        const rootSettingsPath = `${this.dataDirectory}/Settings/settings.json`
        const rootSettings = await this.readJsonFile(rootSettingsPath)
        
        if (rootSettings && rootSettings.settings) {
          const settings = rootSettings.settings
          if (settings.saveDataLocation === 'custom' && settings.saveDataPath) {
            // 切换到自定义存档目录
            const customPath = settings.saveDataPath + '/SaveData'
            console.log('检测到自定义存档目录设置，切换到:', customPath)
            this.setDataDirectory(customPath)
          } else {
            console.log('使用默认存档目录')
          }
        } else {
          console.log('未找到设置文件，使用默认存档目录')
        }
      } catch (error) {
        console.warn('读取根目录设置失败，使用默认目录:', error)
      }
      
      // 检查主存档目录是否存在
      const mainDirExists = await this.ensureDataDirectory()
      if (!mainDirExists) {
        console.error('无法创建主存档目录:', this.dataDirectory)
        return false
      }
      
      // 创建所有子目录
      const directories = Object.values(this.dataDirectories)
      for (const dir of directories) {
        const created = await this.ensureDirectoryByPath(dir)
        if (!created) {
          console.error('无法创建目录:', dir)
          return false
        }
        console.log('✅ 目录已创建:', dir)
      }
      
      // 创建缩略图目录
      const thumbnailDirs = Object.values(this.thumbnailDirectories)
      for (const dir of thumbnailDirs) {
        const created = await this.ensureDirectoryByPath(dir)
        if (!created) {
          console.error('无法创建缩略图目录:', dir)
          return false
        }
        console.log('✅ 缩略图目录已创建:', dir)
      }
      
      // 检查并创建默认数据文件
      await this.initializeDataFiles()
      
      console.log('=== 存档系统初始化完成 ===')
      return true
    } catch (error) {
      console.error('初始化存档系统失败:', error)
      return false
    }
  }

  /**
   * 设置数据目录（用于自定义存档位置）
   * @param {string} newDirectory - 新的数据目录路径
   * @returns {boolean} 设置是否成功
   */
  setDataDirectory(newDirectory) {
    try {
      console.log('=== 设置新的数据目录 ===')
      console.log('原目录:', this.dataDirectory)
      console.log('新目录:', newDirectory)
      
      // 更新主目录
      this.dataDirectory = newDirectory
      
      // 重新构建所有路径
      this.dataDirectories = {
        games: `${this.dataDirectory}/Game`,
        images: `${this.dataDirectory}/Image`,
        videos: `${this.dataDirectory}/Video`,
        audios: `${this.dataDirectory}/Audio`,
        websites: `${this.dataDirectory}/Website`,
        novels: `${this.dataDirectory}/Novel`,
        settings: `${this.dataDirectory}/Settings`
      }
      
      this.filePaths = {
        games: `${this.dataDirectories.games}/games.json`,
        images: `${this.dataDirectories.images}/images.json`,
        videos: `${this.dataDirectories.videos}/videos.json`,
        videoFolders: `${this.dataDirectories.videos}/videofolders.json`, // 视频文件夹
        audios: `${this.dataDirectories.audios}/audios.json`,
        websites: `${this.dataDirectories.websites}/websites.json`,
        novels: `${this.dataDirectories.novels}/novels.json`,
        settings: `${this.dataDirectories.settings}/settings.json`,
        collections: `${this.dataDirectories.settings}/collections.json`,
        user: `${this.dataDirectories.settings}/user.json`,
        achievements: `${this.dataDirectories.settings}/achievements.json`,
        backup: `${this.dataDirectory}/backup.json`
      }
      
      this.thumbnailDirectories = {
        videos: `${this.dataDirectories.videos}/Covers`,
        images: `${this.dataDirectories.images}/Covers`,
        audios: `${this.dataDirectories.audios}/Covers`,
        games: `${this.dataDirectories.games}/Covers`
      }
      
      console.log('数据目录设置完成')
      console.log('新的数据目录:', this.dataDirectory)
      console.log('新的文件路径:', this.filePaths)
      
      return true
    } catch (error) {
      console.error('设置数据目录失败:', error)
      return false
    }
  }

  /**
   * 通过路径确保目录存在
   * @param {string} dirPath - 目录路径
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureDirectoryByPath(dirPath) {
    try {
      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(dirPath)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error('创建目录失败:', dirPath, error)
      return false
    }
  }

  /**
   * 初始化数据文件
   * 检查文件是否存在，如果不存在则创建默认文件
   * @returns {Promise<void>}
   */
  async initializeDataFiles() {
    try {
      console.log('=== 初始化数据文件 ===')
      
      // 检查并创建各种数据文件
      const dataTypes = ['games', 'images', 'videos', 'audios', 'websites', 'novels', 'settings', 'user', 'achievements', 'collections']
      
      for (const dataType of dataTypes) {
        const filePath = this.filePaths[dataType]
        const fileExists = await this.fileExists(filePath)
        
        if (!fileExists) {
          console.log(`创建默认 ${dataType} 文件:`, filePath)
          await this.createDefaultDataFile(dataType)
        } else {
          console.log(`✅ ${dataType} 文件已存在:`, filePath)
        }
      }
      
      console.log('=== 数据文件初始化完成 ===')
    } catch (error) {
      console.error('初始化数据文件失败:', error)
      throw error
    }
  }

  /**
   * 检查文件是否存在
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 文件是否存在
   */
  async fileExists(filePath) {
    try {
      if (window.electronAPI && window.electronAPI.readJsonFile) {
        const result = await window.electronAPI.readJsonFile(filePath)
        return result.success
      } else {
        // 浏览器环境下的降级处理
        return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * 创建默认数据文件
   * @param {string} dataType - 数据类型
   * @returns {Promise<boolean>} 创建是否成功
   */
  async createDefaultDataFile(dataType) {
    try {
      const filePath = this.filePaths[dataType]
      let defaultData = {}
      
      switch (dataType) {
        case 'games':
          defaultData = { games: [] }
          break
        case 'images':
          defaultData = { images: [] }
          break
        case 'videos':
          defaultData = { videos: [] }
          break
        case 'audios':
          defaultData = { audios: [] }
          break
        case 'websites':
          defaultData = { websites: [] }
          break
        case 'novels':
          defaultData = { novels: [] }
          break
        case 'settings':
          defaultData = { settings: this.defaultData.settings }
          break
        case 'user':
          defaultData = { 
            user: {
              name: '',
              joinDate: new Date().toISOString(),
              loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
              checkInDays: [],
              totalUsageTime: 0 // 总使用时长（秒）
            }
          }
          break
        case 'achievements':
          defaultData = { 
            achievements: {
              unlockedAchievements: new Map(), // 存储已解锁的成就ID和状态
              lastCheckTime: new Date().toISOString()
            }
          }
          break
        case 'collections':
          defaultData = { collections: [] }
          break
        default:
          console.warn('未知的数据类型:', dataType)
          return false
      }
      
      // 写入默认数据
      if (window.electronAPI && window.electronAPI.writeJsonFile) {
        const result = await window.electronAPI.writeJsonFile(filePath, defaultData)
        if (result.success) {
          console.log(`✅ 默认 ${dataType} 文件创建成功:`, filePath)
          return true
        } else {
          console.error(`❌ 创建默认 ${dataType} 文件失败:`, result.error)
          return false
        }
      } else {
        console.warn('Electron API 不可用，无法创建默认文件')
        return false
      }
    } catch (error) {
      console.error(`创建默认 ${dataType} 文件失败:`, error)
      return false
    }
  }

  /**
   * 清理数据中的不可序列化内容
   * @param {any} data - 要清理的数据
   * @returns {any} 清理后的数据
   */
  cleanDataForSerialization(data) {
    if (data === null || data === undefined) {
      return data
    }
    
    if (typeof data === 'function') {
      return undefined // 函数无法序列化，返回 undefined
    }
    
    if (typeof data === 'symbol') {
      return undefined // Symbol 无法序列化，返回 undefined
    }
    
    if (data instanceof Date) {
      return data.toISOString() // 日期转换为字符串
    }
    
    if (data instanceof RegExp) {
      return data.toString() // 正则表达式转换为字符串
    }
    
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack
      }
    }
    
    if (data instanceof Map) {
      return Object.fromEntries(data) // Map 转换为普通对象
    }
    
    if (data instanceof Set) {
      return Array.from(data) // Set 转换为数组
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.cleanDataForSerialization(item))
    }
    
    if (typeof data === 'object') {
      const cleaned = {}
      for (const [key, value] of Object.entries(data)) {
        const cleanedValue = this.cleanDataForSerialization(value)
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue
        }
      }
      return cleaned
    }
    
    return data
  }

  /**
   * 创建文件备份
   * @param {string} filePath - 文件路径
   * @returns {Promise<string|null>} 备份文件路径，失败返回null
   */
  async createBackup(filePath) {
    try {
      if (!window.electronAPI || !window.electronAPI.readJsonFile || !window.electronAPI.writeJsonFile) {
        return null
      }
      
      // 检查原文件是否存在
      const fileExists = await this.fileExists(filePath)
      if (!fileExists) {
        return null // 文件不存在，无需备份
      }
      
      // 生成备份文件路径（添加 .backup 后缀和时间戳）
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = `${filePath}.backup.${timestamp}`
      
      // 读取原文件内容
      const originalData = await this.readJsonFile(filePath)
      if (!originalData) {
        return null // 无法读取原文件，跳过备份
      }
      
      // 写入备份文件
      const backupSuccess = await this.writeJsonFileWithoutBackup(backupPath, originalData)
      if (backupSuccess) {
        console.log('✅ 已创建备份文件:', backupPath)
        
        // 清理旧备份（只保留最近的3个备份）
        await this.cleanupOldBackups(filePath, 3)
        
        return backupPath
      }
      
      return null
    } catch (error) {
      console.warn('创建备份失败:', error)
      return null
    }
  }

  /**
   * 清理旧的备份文件
   * @param {string} filePath - 原文件路径
   * @param {number} keepCount - 保留的备份数量
   */
  async cleanupOldBackups(filePath, keepCount = 5) {
    try {
      if (!window.electronAPI || !window.electronAPI.listFiles) {
        return
      }
      
      const dir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'))
      const fileName = filePath.substring(filePath.lastIndexOf('/') + 1 || filePath.lastIndexOf('\\') + 1)
      const backupPattern = `${fileName}.backup.`
      
      const result = await window.electronAPI.listFiles(dir)
      if (!result.success || !result.files) {
        return
      }
      
      // 筛选出所有备份文件
      const backups = (result.files as any[])
        .filter((file: any) => file && (typeof file === 'string' ? file.startsWith(backupPattern) : file.name && file.name.startsWith(backupPattern)))
        .map((file: any) => {
          if (typeof file === 'string') {
            return {
              name: file,
              path: `${dir}/${file}`,
              mtime: 0
            }
          }
          return {
            name: file.name,
            path: file.path || `${dir}/${file.name}`,
            mtime: file.mtime || 0
          }
        })
        .sort((a, b) => b.mtime - a.mtime) // 按修改时间降序排列
      
      // 删除多余的备份（保留最近的 keepCount 个）
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount)
        for (const backup of toDelete) {
          try {
            if (window.electronAPI.deleteFile) {
              await window.electronAPI.deleteFile(backup.path)
              console.log('🗑️ 已删除旧备份:', backup.name)
            }
          } catch (error) {
            console.warn('删除旧备份失败:', backup.name, error)
          }
        }
      }
    } catch (error) {
      // 清理失败不影响主流程，静默处理
      console.warn('清理旧备份失败（不影响使用）:', error)
    }
  }

  /**
   * 不创建备份的写入方法（用于备份文件本身）
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要写入的数据
   * @returns {Promise<boolean>} 写入是否成功
   */
  async writeJsonFileWithoutBackup(filePath, data) {
    try {
      if (!filePath) {
        throw new Error('文件路径不能为空')
      }
      
      if (window.electronAPI && window.electronAPI.writeJsonFile) {
        const cleanedData = this.cleanDataForSerialization(data)
        let serializedData
        try {
          serializedData = JSON.parse(JSON.stringify(cleanedData))
        } catch (serializeError) {
          console.error('数据序列化失败:', serializeError)
          throw new Error(`数据序列化失败: ${serializeError.message}`)
        }
        
        const result = await window.electronAPI.writeJsonFile(filePath, serializedData)
        return result.success
      } else {
        const cleanedData = this.cleanDataForSerialization(data)
        localStorage.setItem(filePath, JSON.stringify(cleanedData))
        return true
      }
    } catch (error) {
      console.error('写入文件失败:', error)
      return false
    }
  }

  async writeJsonFile(filePath, data) {
    try {
      // 添加调试信息
      if (!filePath) {
        console.error('writeJsonFile: filePath 参数为空')
        console.error('当前 filePaths:', this.filePaths)
        throw new Error('文件路径不能为空')
      }
      
      // 备份逻辑已移到 electron.js 中统一处理，这里不再需要
      
      if (window.electronAPI && window.electronAPI.writeJsonFile) {
        // 清理数据，移除不可序列化的内容
        const cleanedData = this.cleanDataForSerialization(data)
        
        // 先序列化数据，确保可以安全传递
        let serializedData
        try {
          serializedData = JSON.parse(JSON.stringify(cleanedData))
        } catch (serializeError) {
          console.error('数据序列化失败:', serializeError)
          console.error('原始数据:', data)
          console.error('清理后数据:', cleanedData)
          throw new Error(`数据序列化失败: ${serializeError.message}`)
        }
        
        const result = await window.electronAPI.writeJsonFile(filePath, serializedData)
        return result.success
      } else {
        // 降级处理：使用 localStorage
        console.warn('Electron API 不可用，使用 localStorage 作为降级方案')
        const cleanedData = this.cleanDataForSerialization(data)
        localStorage.setItem(filePath, JSON.stringify(cleanedData))
        return true
      }
    } catch (error) {
      console.error('写入文件失败:', error)
      console.error('文件路径:', filePath)
      console.error('数据内容:', data)
      return false
    }
  }

  /**
   * 读取 JSON 文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object|null>} 读取的数据
   */
  async readJsonFile(filePath) {
    try {
      if (window.electronAPI && window.electronAPI.readJsonFile) {
        const result = await window.electronAPI.readJsonFile(filePath)
        return result.success ? result.data : null
      } else {
        // 降级处理：使用 localStorage
        console.warn('Electron API 不可用，使用 localStorage 作为降级方案')
        const data = localStorage.getItem(filePath)
        return data ? JSON.parse(data) : null
      }
    } catch (error) {
      console.error('读取文件失败:', error)
      return null
    }
  }

  /**
   * 确保数据目录存在
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureDataDirectory() {
    try {
      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(this.dataDirectory)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error('创建数据目录失败:', error)
      return false
    }
  }

  /**
   * 确保指定数据类型的目录存在
   * @param {string} dataType - 数据类型 ('games', 'images', 'videos', 'audios', 'websites', 'novels', 'settings')
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureDataTypeDirectory(dataType) {
    try {
      const dirPath = this.dataDirectories[dataType]
      if (!dirPath) {
        console.error('未知的数据类型:', dataType)
        return false
      }

      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(dirPath)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error(`创建${dataType}数据目录失败:`, error)
      return false
    }
  }

  /**
   * 确保缩略图目录存在
   * @param {string} type - 数据类型 ('videos', 'images', 'audios', 'games')
   * @returns {Promise<boolean>} 目录创建是否成功
   */
  async ensureThumbnailDirectory(type) {
    try {
      const dirPath = this.thumbnailDirectories[type]
      if (!dirPath) {
        console.error('未知的缩略图类型:', type)
        return false
      }

      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        const result = await window.electronAPI.ensureDirectory(dirPath)
        return result.success
      }
      return true // 如果 Electron API 不可用，假设目录存在
    } catch (error) {
      console.error('创建缩略图目录失败:', error)
      return false
    }
  }

  /**
   * 保存缩略图文件
   * @param {string} type - 数据类型 ('videos', 'images', 'audios', 'games')
   * @param {string} filename - 文件名
   * @param {string} dataUrl - base64数据URL
   * @returns {Promise<string|null>} 保存的文件路径，失败返回null
   */
  async saveThumbnail(type, filename, dataUrl) {
    try {
      // 确保目录存在
      const dirCreated = await this.ensureThumbnailDirectory(type)
      if (!dirCreated) {
        console.error('无法创建缩略图目录')
        return null
      }

      const dirPath = this.thumbnailDirectories[type]
      const filePath = `${dirPath}/${filename}`

      if (window.electronAPI && window.electronAPI.saveThumbnail) {
        const result = await window.electronAPI.saveThumbnail(filePath, dataUrl)
        if (result.success) {
          console.log('缩略图保存成功:', filePath)
          return filePath
        } else {
          console.error('缩略图保存失败:', result.error)
          return null
        }
      } else {
        console.warn('Electron API 不可用，无法保存缩略图')
        return null
      }
    } catch (error) {
      console.error('保存缩略图失败:', error)
      return null
    }
  }

  /**
   * 删除缩略图文件
   * @param {string} filePath - 缩略图文件路径
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteThumbnail(filePath) {
    try {
      if (!filePath || filePath.startsWith('data:')) {
        // 如果是base64数据或空路径，直接返回成功
        return true
      }

      if (window.electronAPI && window.electronAPI.deleteFile) {
        const result = await window.electronAPI.deleteFile(filePath)
        return result.success
      } else {
        console.warn('Electron API 不可用，无法删除缩略图')
        return false
      }
    } catch (error) {
      console.error('删除缩略图失败:', error)
      return false
    }
  }

  /**
   * 保存图片（漫画专辑）数据到本地 JSON 文件
   * @param {Array} images - 图片专辑数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveImages(images) {
    try {
      await this.ensureDataTypeDirectory('images')
      const data = {
        images: images,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.images, data)
      if (success) {
        console.log('图片数据保存成功:', images.length, '个专辑')
        this.dataCache.images = JSON.parse(JSON.stringify(images)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存图片数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载图片（漫画专辑）数据
   * @returns {Promise<Array>} 图片专辑数据数组
   */
  async loadImages() {
    // 检查缓存
    if (this.dataCache.images) {
      console.log('从缓存加载图片数据:', this.dataCache.images.length, '个专辑')
      return JSON.parse(JSON.stringify(this.dataCache.images))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.images)
      if (data && Array.isArray(data.images)) {
        console.log('加载图片数据:', data.images.length, '个专辑')
        this.dataCache.images = data.images // 更新缓存
        return data.images
      }
      return []
    } catch (error) {
      console.error('加载图片数据失败:', error)
      return []
    }
  }

  /**
   * 保存游戏数据到本地 JSON 文件
   * @param {Array} games - 游戏数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveGames(games) {
    try {
      await this.ensureDataTypeDirectory('games')
      
      const data = {
        games: games,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.games, data)
      if (success) {
        console.log('游戏数据保存成功:', games.length, '个游戏')
        this.dataCache.games = JSON.parse(JSON.stringify(games)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存游戏数据失败:', error)
      return false
    }
  }

  /**
   * 保存视频数据到本地 JSON 文件
   * @param {Array} videos - 视频数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveVideos(videos) {
    try {
      await this.ensureDataTypeDirectory('videos')

      const data = {
        videos: videos,
        timestamp: new Date().toISOString(),
        version: this.version
      }

      const success = await this.writeJsonFile(this.filePaths.videos, data)
      if (success) {
        console.log('视频数据保存成功:', videos.length, '个视频')
        this.dataCache.videos = JSON.parse(JSON.stringify(videos)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存视频数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载视频数据
   * @returns {Promise<Array>} 视频数据数组
   */
  async loadVideos() {
    // 检查缓存
    if (this.dataCache.videos) {
      console.log('从缓存加载视频数据:', this.dataCache.videos.length, '个视频')
      return JSON.parse(JSON.stringify(this.dataCache.videos))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.videos)
      if (data && Array.isArray(data.videos)) {
        console.log('加载视频数据:', data.videos.length, '个视频')
        this.dataCache.videos = data.videos // 更新缓存
        return data.videos
      }
      return []
    } catch (error) {
      console.error('加载视频数据失败:', error)
      return []
    }
  }

  /**
   * 保存视频文件夹数据到本地 JSON 文件
   * @param {Array} folders - 文件夹数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveVideoFolders(folders) {
    try {
      await this.ensureDataTypeDirectory('videos')

      const data = {
        folders: folders,
        timestamp: new Date().toISOString(),
        version: this.version
      }

      console.log('准备保存视频文件夹数据:')
      console.log('文件夹数量:', folders.length)
      console.log('文件路径:', this.filePaths.videoFolders)
      console.log('数据内容:', data)

      const success = await this.writeJsonFile(this.filePaths.videoFolders, data)
      if (success) {
        console.log('视频文件夹数据保存成功:', folders.length, '个文件夹')
      }
      return success
    } catch (error) {
      console.error('保存视频文件夹数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载视频文件夹数据
   * @returns {Promise<Array>} 文件夹数据数组
   */
  async loadVideoFolders() {
    try {
      const data = await this.readJsonFile(this.filePaths.videoFolders)
      if (data && Array.isArray(data.folders)) {
        console.log('加载视频文件夹数据:', data.folders.length, '个文件夹')
        return data.folders
      }
      return []
    } catch (error) {
      console.error('加载视频文件夹数据失败:', error)
      return []
    }
  }

  async saveAudios(audios) {
    try {
      await this.ensureDataTypeDirectory('audios')
      const data = {
        audios: audios,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.audios, data)
      if (success) {
        console.log('音频数据保存成功:', audios.length, '个音频')
        this.dataCache.audios = JSON.parse(JSON.stringify(audios)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存音频数据失败:', error)
      return false
    }
  }

  async loadAudios() {
    // 检查缓存
    if (this.dataCache.audios) {
      console.log('从缓存加载音频数据:', this.dataCache.audios.length, '个音频')
      return JSON.parse(JSON.stringify(this.dataCache.audios))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.audios)
      if (data && Array.isArray(data.audios)) {
        console.log('加载音频数据:', data.audios.length, '个音频')
        this.dataCache.audios = data.audios // 更新缓存
        return data.audios
      }
      return []
    } catch (error) {
      console.error('加载音频数据失败:', error)
      return []
    }
  }

  async saveWebsites(websites) {
    try {
      await this.ensureDataTypeDirectory('websites')
      const data = {
        websites: websites,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.websites, data)
      if (success) {
        console.log('网站数据保存成功:', websites.length, '个网站')
        this.dataCache.websites = JSON.parse(JSON.stringify(websites)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存网站数据失败:', error)
      return false
    }
  }

  async loadWebsites() {
    // 检查缓存
    if (this.dataCache.websites) {
      console.log('从缓存加载网站数据:', this.dataCache.websites.length, '个网站')
      return JSON.parse(JSON.stringify(this.dataCache.websites))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.websites)
      if (data && Array.isArray(data.websites)) {
        console.log('加载网站数据:', data.websites.length, '个网站')
        this.dataCache.websites = data.websites // 更新缓存
        return data.websites
      }
      return []
    } catch (error) {
      console.error('加载网站数据失败:', error)
      return []
    }
  }

  async saveNovels(novels) {
    try {
      await this.ensureDataTypeDirectory('novels')
      const data = {
        novels: novels,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.novels, data)
      if (success) {
        console.log('小说数据保存成功:', novels.length, '本小说')
        this.dataCache.novels = JSON.parse(JSON.stringify(novels)) // 更新缓存
      }
      return success
    } catch (error) {
      console.error('保存小说数据失败:', error)
      return false
    }
  }

  async loadNovels() {
    // 检查缓存
    if (this.dataCache.novels) {
      console.log('从缓存加载小说数据:', this.dataCache.novels.length, '本小说')
      return JSON.parse(JSON.stringify(this.dataCache.novels))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.novels)
      if (data && Array.isArray(data.novels)) {
        console.log('加载小说数据:', data.novels.length, '本小说')
        this.dataCache.novels = data.novels // 更新缓存
        return data.novels
      }
      return []
    } catch (error) {
      console.error('加载小说数据失败:', error)
      return []
    }
  }

  /**
   * 保存合集数据到本地 JSON 文件
   * @param {Array} collections - 合集数据数组
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveCollections(collections) {
    try {
      await this.ensureDataTypeDirectory('settings')
      const data = {
        collections: collections,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      const success = await this.writeJsonFile(this.filePaths.collections, data)
      if (success) {
        console.log('合集数据保存成功:', collections.length, '个合集')
      }
      return success
    } catch (error) {
      console.error('保存合集数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载合集数据
   * @returns {Promise<Array>} 合集数据数组
   */
  async loadCollections() {
    try {
      const data = await this.readJsonFile(this.filePaths.collections)
      if (data && Array.isArray(data.collections)) {
        console.log('加载合集数据:', data.collections.length, '个合集')
        return data.collections
      }
      return []
    } catch (error) {
      console.error('加载合集数据失败:', error)
      return []
    }
  }

  /**
   * 从备份恢复文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<boolean>} 恢复是否成功
   */
  async restoreFromBackupFile(filePath) {
    try {
      if (!window.electronAPI || !window.electronAPI.readJsonFile) {
        return false
      }
      
      // 尝试查找备份文件（最多尝试10个最近的备份）
      const maxAttempts = 10
      for (let i = 0; i < maxAttempts; i++) {
        // 生成可能的备份文件路径（基于时间戳）
        const now = new Date()
        const timestamp = new Date(now.getTime() - i * 60000).toISOString().replace(/[:.]/g, '-') // 每分钟一个备份
        const backupPath = `${filePath}.backup.${timestamp}`
        
        try {
          const backupData = await this.readJsonFile(backupPath)
          if (backupData) {
            // 验证备份数据是否有效
            if (this.filePaths.games === filePath && (!backupData.games || !Array.isArray(backupData.games))) {
              continue // 数据无效，尝试下一个
            }
            
            // 恢复文件
            const restoreSuccess = await this.writeJsonFileWithoutBackup(filePath, backupData)
            if (restoreSuccess) {
              console.log('✅ 已从备份恢复文件:', filePath, '备份文件:', backupPath)
              return true
            }
          }
        } catch (error) {
          // 文件不存在或读取失败，继续尝试下一个
          continue
        }
      }
      
      // 如果时间戳方法失败，尝试使用 listFiles（如果可用）
      if (window.electronAPI.listFiles) {
        try {
          const dir = filePath.substring(0, filePath.lastIndexOf('/') || filePath.lastIndexOf('\\'))
          const fileName = filePath.substring(filePath.lastIndexOf('/') + 1 || filePath.lastIndexOf('\\') + 1)
          const backupPattern = `${fileName}.backup.`
          
          const result = await window.electronAPI.listFiles(dir)
          if (result.success && result.files) {
            const backups = (result.files as any[])
              .filter((file: any) => file && (typeof file === 'string' ? file.startsWith(backupPattern) : file.name && file.name.startsWith(backupPattern)))
              .map((file: any) => {
                if (typeof file === 'string') {
                  return {
                    name: file,
                    path: `${dir}/${file}`,
                    mtime: 0
                  }
                }
                return {
                  name: file.name,
                  path: file.path || `${dir}/${file.name}`,
                  mtime: file.mtime || 0
                }
              })
              .sort((a, b) => b.mtime - a.mtime)
            
            for (const backup of backups) {
              try {
                const backupData = await this.readJsonFile(backup.path)
                if (backupData) {
                  if (this.filePaths.games === filePath && (!backupData.games || !Array.isArray(backupData.games))) {
                    continue
                  }
                  
                  const restoreSuccess = await this.writeJsonFileWithoutBackup(filePath, backupData)
                  if (restoreSuccess) {
                    console.log('✅ 已从备份恢复文件:', filePath, '备份文件:', backup.name)
                    return true
                  }
                }
              } catch (error) {
                continue
              }
            }
          }
        } catch (error) {
          console.warn('使用 listFiles 查找备份失败:', error)
        }
      }
      
      console.warn('未找到有效的备份文件:', filePath)
      return false
    } catch (error) {
      console.error('恢复备份失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载游戏数据
   * @returns {Promise<Array>} 游戏数据数组
   */
  async loadGames() {
    // 检查缓存
    if (this.dataCache.games) {
      console.log('从缓存加载游戏数据:', this.dataCache.games.length, '个游戏')
      return JSON.parse(JSON.stringify(this.dataCache.games)) // 返回副本以防止引用修改
    }

    try {
      let data = await this.readJsonFile(this.filePaths.games)
      
      // 检查数据完整性
      if (!data || !data.games || !Array.isArray(data.games)) {
        console.warn('⚠️ 游戏数据文件损坏或为空，尝试从备份恢复...')
        
        // 尝试从备份恢复
        const restored = await this.restoreFromBackupFile(this.filePaths.games)
        if (restored) {
          // 重新读取恢复后的数据
          data = await this.readJsonFile(this.filePaths.games)
          if (data && data.games && Array.isArray(data.games)) {
            console.log('✅ 已从备份恢复游戏数据:', data.games.length, '个游戏')
            this.dataCache.games = data.games // 更新缓存
            return data.games
          }
        }
        
        console.error('❌ 无法恢复游戏数据，返回空数组')
        return []
      }
      
      // 验证数据有效性
      if (data.games.length === 0 && data.timestamp) {
        // 如果数据为空但有时间戳，可能是正常情况（用户删除了所有游戏）
        console.log('游戏数据为空（可能是正常情况）')
        this.dataCache.games = [] // 更新缓存
        return []
      }
      
      this.dataCache.games = data.games // 更新缓存
      return data.games
    } catch (error) {
      console.error('加载游戏数据失败:', error)
      
      // 尝试从备份恢复
      console.warn('尝试从备份恢复游戏数据...')
      const restored = await this.restoreFromBackupFile(this.filePaths.games)
      if (restored) {
        try {
          const data = await this.readJsonFile(this.filePaths.games)
          if (data && data.games && Array.isArray(data.games)) {
            console.log('✅ 已从备份恢复游戏数据:', data.games.length, '个游戏')
            this.dataCache.games = data.games // 更新缓存
            return data.games
          }
        } catch (recoveryError) {
          console.error('恢复后读取数据失败:', recoveryError)
        }
      }
      
      return []
    }
  }

  /**
   * 保存设置数据到本地 JSON 文件
   * @param {Object} settings - 设置数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSettings(settings) {
    try {
      // 更新缓存
      this.settingsCache = JSON.parse(JSON.stringify(settings))
      this.settingsCacheDirty = true
      
      await this.ensureDataTypeDirectory('settings')
      
      const data = {
        settings: settings,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.settings, data)
      if (success) {
        console.log('设置数据保存成功')
        this.settingsCacheDirty = false
        
        // 同时更新根目录的设置文件（保持同步）
        try {
          const rootSettingsPath = 'SaveData/Settings/settings.json'
          const rootSuccess = await this.writeJsonFile(rootSettingsPath, data)
          if (rootSuccess) {
            console.log('根目录设置文件已同步')
          } else {
            console.warn('同步根目录设置文件失败')
          }
        } catch (rootError) {
          console.warn('同步根目录设置文件出错:', rootError)
          // 不影响主流程，继续执行
        }
        
        // 自动同步到 localStorage 以保持向后兼容性
        try {
          localStorage.setItem('butter-manager-settings', JSON.stringify(settings))
          console.log('设置已同步到 localStorage')
        } catch (localStorageError) {
          console.warn('同步到 localStorage 失败:', localStorageError)
          // 不影响主流程，继续执行
        }
      }
      return success
    } catch (error) {
      console.error('保存设置数据失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载设置数据
   * @returns {Promise<Object>} 设置数据对象
   */
  async loadSettings() {
    // 优先使用缓存，减少磁盘读取
    if (this.settingsCache) {
      console.log('从缓存加载设置数据')
      return JSON.parse(JSON.stringify(this.settingsCache))
    }

    try {
      const data = await this.readJsonFile(this.filePaths.settings)
      if (data && data.settings) {
        console.log('从文件加载设置数据成功')
        const result = { ...this.defaultData.settings, ...data.settings }
        this.settingsCache = result  // 缓存结果
        return JSON.parse(JSON.stringify(result))
      }
      
      // 如果文件不存在或为空，尝试从 localStorage 加载
      console.log('文件设置不存在，尝试从 localStorage 加载')
      const localStorageSettings = localStorage.getItem('butter-manager-settings')
      if (localStorageSettings) {
        try {
          const parsedSettings = JSON.parse(localStorageSettings)
          console.log('从 localStorage 加载设置成功')
          const result = { ...this.defaultData.settings, ...parsedSettings }
          this.settingsCache = result
          return JSON.parse(JSON.stringify(result))
        } catch (parseError) {
          console.warn('解析 localStorage 设置失败:', parseError)
        }
      }
      
      this.settingsCache = this.defaultData.settings
      return JSON.parse(JSON.stringify(this.defaultData.settings))
    } catch (error) {
      console.error('加载设置数据失败:', error)
      
      // 降级到 localStorage
      try {
        const localStorageSettings = localStorage.getItem('butter-manager-settings')
        if (localStorageSettings) {
          const parsedSettings = JSON.parse(localStorageSettings)
          console.log('降级到 localStorage 加载设置成功')
          const result = { ...this.defaultData.settings, ...parsedSettings }
          this.settingsCache = result
          return JSON.parse(JSON.stringify(result))
        }
      } catch (localStorageError) {
        console.warn('从 localStorage 加载设置也失败:', localStorageError)
      }
      
      this.settingsCache = this.defaultData.settings
      return JSON.parse(JSON.stringify(this.defaultData.settings))
    }
  }

  /**
   * 导出数据为 JSON 文件
   * @param {string} dataType - 数据类型 ('games', 'settings', 'all')
   * @param {string} filename - 文件名（可选）
   * @returns {Promise<boolean>} 导出是否成功
   */
  async exportData(dataType = 'all', filename = null) {
    try {
      let exportData = {}
      let defaultFilename = 'butter-manager-export'

      switch (dataType) {
        case 'games':
          exportData = {
            type: 'games',
            data: await this.loadGames(),
            timestamp: new Date().toISOString(),
            version: this.version
          }
          defaultFilename = 'butter-manager-games'
          break
        case 'settings':
          exportData = {
            type: 'settings',
            data: await this.loadSettings(),
            timestamp: new Date().toISOString(),
            version: this.version
          }
          defaultFilename = 'butter-manager-settings'
          break
        case 'all':
        default:
          exportData = {
            type: 'all',
            games: await this.loadGames(),
            settings: await this.loadSettings(),
            timestamp: new Date().toISOString(),
            version: this.version
          }
          defaultFilename = 'butter-manager-backup'
          break
      }

      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename || `${defaultFilename}.json`
      link.click()
      
      URL.revokeObjectURL(url)
      console.log('数据导出成功:', dataType)
      return true
    } catch (error) {
      console.error('导出数据失败:', error)
      return false
    }
  }

  /**
   * 从文件导入数据
   * @param {File} file - 要导入的文件
   * @returns {Promise<Object>} 导入结果
   */
  async importData(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // 验证数据格式
      if (!data.type && !data.games && !data.settings) {
        throw new Error('无效的数据文件格式')
      }

      let result = {
        success: true,
        imported: {
          games: 0,
          settings: false
        },
        errors: []
      }

      // 导入游戏数据
      if (data.games && Array.isArray(data.games)) {
        if (this.saveGames(data.games)) {
          result.imported.games = data.games.length
        } else {
          result.errors.push('游戏数据导入失败')
        }
      }

      // 导入设置数据
      if (data.settings && typeof data.settings === 'object') {
        if (this.saveSettings(data.settings)) {
          result.imported.settings = true
        } else {
          result.errors.push('设置数据导入失败')
        }
      }

      console.log('数据导入成功:', result)
      return result
    } catch (error) {
      console.error('导入数据失败:', error)
      return {
        success: false,
        error: error.message,
        imported: { games: 0, settings: false },
        errors: [error.message]
      }
    }
  }


  /**
   * 从备份恢复数据
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreFromBackup() {
    try {
      const backupData = await this.readJsonFile(this.filePaths.backup)
      if (!backupData) {
        return { success: false, error: '没有找到备份数据' }
      }

      let result = { success: true, restored: { games: 0, settings: false } }

      // 恢复游戏数据
      if (backupData.games) {
        if (await this.saveGames(backupData.games)) {
          result.restored.games = backupData.games.length
        }
      }

      // 恢复设置数据
      if (backupData.settings) {
        if (await this.saveSettings(backupData.settings)) {
          result.restored.settings = true
        }
      }

      console.log('从备份恢复数据成功:', result)
      return result
    } catch (error) {
      console.error('从备份恢复数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清空所有数据
   * @param {string} dataType - 要清空的数据类型 ('games', 'settings', 'all')
   * @returns {Promise<boolean>} 清空是否成功
   */
  async clearData(dataType = 'all') {
    try {
      // 清空缓存
      if (dataType === 'all') {
        this.dataCache = {}
      } else if (this.dataCache[dataType]) {
        delete this.dataCache[dataType]
      }

      if (window.electronAPI && window.electronAPI.deleteFile) {
        switch (dataType) {
          case 'games':
            await window.electronAPI.deleteFile(this.filePaths.games)
            break
          case 'settings':
            await window.electronAPI.deleteFile(this.filePaths.settings)
            break
          case 'all':
            await window.electronAPI.deleteFile(this.filePaths.games)
            await window.electronAPI.deleteFile(this.filePaths.settings)
            await window.electronAPI.deleteFile(this.filePaths.backup)
            break
        }
      } else {
        // 降级处理：使用 localStorage
        console.warn('Electron API 不可用，使用 localStorage 作为降级方案')
        switch (dataType) {
          case 'games':
            localStorage.removeItem(this.filePaths.games)
            break
          case 'settings':
            localStorage.removeItem(this.filePaths.settings)
            break
          case 'all':
            localStorage.removeItem(this.filePaths.games)
            localStorage.removeItem(this.filePaths.settings)
            localStorage.removeItem(this.filePaths.backup)
            break
        }
      }
      console.log('数据清空成功:', dataType)
      return true
    } catch (error) {
      console.error('清空数据失败:', error)
      return false
    }
  }

  /**
   * 获取存储使用情况
   * @returns {Promise<Object>} 存储使用情况
   */
  async getStorageInfo() {
    try {
      const info = {
        games: { size: 0, count: 0 },
        settings: { size: 0, count: 0 },
        backup: { size: 0, count: 0 },
        total: { size: 0, count: 0 }
      }

      // 获取游戏数据信息
      const gamesData = await this.readJsonFile(this.filePaths.games)
      if (gamesData) {
        info.games.size = new Blob([JSON.stringify(gamesData)]).size
        info.games.count = gamesData.games?.length || 0
      }

      // 获取设置数据信息
      const settingsData = await this.readJsonFile(this.filePaths.settings)
      if (settingsData) {
        info.settings.size = new Blob([JSON.stringify(settingsData)]).size
        info.settings.count = 1
      }

      // 获取备份数据信息
      const backupData = await this.readJsonFile(this.filePaths.backup)
      if (backupData) {
        info.backup.size = new Blob([JSON.stringify(backupData)]).size
        info.backup.count = 1
      }

      // 计算总计
      info.total.size = info.games.size + info.settings.size + info.backup.size
      info.total.count = info.games.count + info.settings.count + info.backup.count

      return info
    } catch (error) {
      console.error('获取存储信息失败:', error)
      return null
    }
  }

  /**
   * 解析游戏存档文件（.dat 格式）
   * @param {string} content - 文件内容
   * @returns {Object} 解析后的存档数据
   */
  parseGameSaveFile(content) {
    try {
      const data = JSON.parse(content)
      if (data.dataBlocks && Array.isArray(data.dataBlocks)) {
        const saveManagerBlock = data.dataBlocks.find(block => block.ID === 'SaveManager')
        if (saveManagerBlock) {
          const saveData = JSON.parse(saveManagerBlock.data)
          return {
            success: true,
            data: saveData,
            slots: this.extractSaveSlots(saveData)
          }
        }
      }
      return { success: false, error: '无效的存档文件格式' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * 提取存档槽位信息
   * @param {Object} saveData - 存档数据
   * @returns {Array} 存档槽位数组
   */
  extractSaveSlots(saveData) {
    const slots = []
    const slotKeys = Object.keys(saveData).filter(key => key.startsWith('slot'))
    
    slotKeys.forEach(key => {
      const slot = saveData[key]
      if (slot && slot.date) {
        slots.push({
          id: key,
          date: slot.date,
          memo: slot.memo || '',
          day: slot.day || 0,
          playTime: slot.playTime || 0,
          charaLevel: slot.chara_level || 0,
          tameLevel: slot.tameLevel || 0
        })
      }
    })
    
    return slots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  /**
   * 保存页面排序方式
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio')
   * @param {string} sortBy - 排序方式
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveSortSetting(pageType, sortBy) {
    try {
      const settings = await this.loadSettings()
      if (settings) {
        if (!settings.sortSettings) {
          settings.sortSettings = {}
        }
        settings.sortSettings[pageType] = sortBy
        const success = await this.saveSettings(settings)
        if (success) {
          console.log(`✅ 已保存${pageType}页面排序方式:`, sortBy)
        }
        return success
      }
      return false
    } catch (error) {
      console.error(`保存${pageType}页面排序方式失败:`, error)
      return false
    }
  }

  /**
   * 获取页面排序方式
   * @param {string} pageType - 页面类型 ('games', 'images', 'videos', 'novels', 'websites', 'audio')
   * @returns {Promise<string>} 排序方式
   */
  async getSortSetting(pageType) {
    try {
      const settings = await this.loadSettings()
      if (settings && settings.sortSettings && settings.sortSettings[pageType]) {
        console.log(`✅ 加载${pageType}页面排序方式:`, settings.sortSettings[pageType])
        return settings.sortSettings[pageType]
      }
      return 'name' // 默认按名称排序
    } catch (error) {
      console.error(`获取${pageType}页面排序方式失败:`, error)
      return 'name'
    }
  }

  /**
   * 保存用户资料数据到本地 JSON 文件
   * @param {Object} userProfile - 用户资料数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveUserProfile(userProfile) {
    try {
      await this.ensureDataTypeDirectory('settings')
      
      const data = {
        user: userProfile,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.user, data)
      if (success) {
        console.log('用户资料保存成功')
      }
      return success
    } catch (error) {
      console.error('保存用户资料失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载用户资料数据
   * @returns {Promise<Object>} 用户资料数据对象
   */
  async loadUserProfile() {
    try {
      const data = await this.readJsonFile(this.filePaths.user)
      if (data && data.user) {
        console.log('用户资料加载成功')
        return data.user
      }
      
      // 如果文件不存在，返回默认用户资料
      console.log('用户资料文件不存在，返回默认资料')
      return {
        name: '',
        joinDate: new Date().toISOString(),
        loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
        checkInDays: [],
        totalUsageTime: 0 // 总使用时长（秒）
      }
    } catch (error) {
      console.error('加载用户资料失败:', error)
      return {
        name: '',
        joinDate: new Date().toISOString(),
        loginHistory: [], // 登录时间队列，最多2个元素：[本次登录时间, 上一次登录时间]
        checkInDays: [],
        totalUsageTime: 0 // 总使用时长（秒）
      }
    }
  }


  /**
   * 从文件导入用户数据
   * @param {File} file - 要导入的文件
   * @returns {Promise<Object>} 导入结果
   */
  async importUserData(file) {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      // 验证数据格式
      if (!data.type || data.type !== 'user' || !data.data) {
        throw new Error('无效的用户数据文件格式')
      }

      const result = {
        success: true,
        imported: {
          user: false
        },
        errors: []
      }

      // 导入用户数据
      if (data.data && typeof data.data === 'object') {
        if (await this.saveUserProfile(data.data)) {
          result.imported.user = true
        } else {
          result.errors.push('用户数据导入失败')
        }
      }

      console.log('用户数据导入成功:', result)
      return result
    } catch (error) {
      console.error('导入用户数据失败:', error)
      return {
        success: false,
        error: error.message,
        imported: { user: false },
        errors: [error.message]
      }
    }
  }

  /**
   * 保存成就状态数据到本地 JSON 文件
   * @param {Object} achievementStates - 成就状态数据对象
   * @returns {Promise<boolean>} 保存是否成功
   */
  async saveAchievementStates(achievementStates) {
    try {
      await this.ensureDataTypeDirectory('settings')
      
      const data = {
        achievements: achievementStates,
        timestamp: new Date().toISOString(),
        version: this.version
      }
      
      const success = await this.writeJsonFile(this.filePaths.achievements, data)
      if (success) {
        console.log('成就状态保存成功')
      }
      return success
    } catch (error) {
      console.error('保存成就状态失败:', error)
      return false
    }
  }

  /**
   * 从本地 JSON 文件加载成就状态数据
   * @returns {Promise<Object>} 成就状态数据对象
   */
  async loadAchievementStates() {
    try {
      const data = await this.readJsonFile(this.filePaths.achievements)
      if (data && data.achievements) {
        console.log('成就状态加载成功')
        // 将Map对象从普通对象转换回来
        const achievementStates = data.achievements
        if (achievementStates.unlockedAchievements && typeof achievementStates.unlockedAchievements === 'object') {
          achievementStates.unlockedAchievements = new Map(Object.entries(achievementStates.unlockedAchievements))
        } else {
          achievementStates.unlockedAchievements = new Map()
        }
        return achievementStates
      }
      
      // 如果文件不存在，返回默认成就状态
      console.log('成就状态文件不存在，返回默认状态')
      return {
        unlockedAchievements: new Map(),
        lastCheckTime: new Date().toISOString()
      }
    } catch (error) {
      console.error('加载成就状态失败:', error)
      return {
        unlockedAchievements: new Map(),
        lastCheckTime: new Date().toISOString()
      }
    }
  }

  /**
   * 更新单个成就的解锁状态
   * @param {string} achievementId - 成就ID
   * @param {boolean} unlocked - 是否已解锁
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateAchievementState(achievementId, unlocked) {
    try {
      const achievementStates = await this.loadAchievementStates()
      achievementStates.unlockedAchievements.set(achievementId, unlocked)
      achievementStates.lastCheckTime = new Date().toISOString()
      
      return await this.saveAchievementStates(achievementStates)
    } catch (error) {
      console.error('更新成就状态失败:', error)
      return false
    }
  }

  /**
   * 批量更新成就解锁状态
   * @param {Map} newAchievementStates - 新的成就状态Map
   * @returns {Promise<boolean>} 更新是否成功
   */
  async updateAchievementStates(newAchievementStates) {
    try {
      const achievementStates = await this.loadAchievementStates()
      
      // 更新所有成就状态
      newAchievementStates.forEach((unlocked, achievementId) => {
        achievementStates.unlockedAchievements.set(achievementId, unlocked)
      })
      
      achievementStates.lastCheckTime = new Date().toISOString()
      
      return await this.saveAchievementStates(achievementStates)
    } catch (error) {
      console.error('批量更新成就状态失败:', error)
      return false
    }
  }

  /**
   * 检查成就是否已解锁
   * @param {string} achievementId - 成就ID
   * @returns {Promise<boolean>} 是否已解锁
   */
  async isAchievementUnlocked(achievementId) {
    try {
      const achievementStates = await this.loadAchievementStates()
      return achievementStates.unlockedAchievements.get(achievementId) || false
    } catch (error) {
      console.error('检查成就状态失败:', error)
      return false
    }
  }

  /**
   * 获取所有已解锁的成就ID列表
   * @returns {Promise<Array>} 已解锁的成就ID数组
   */
  async getUnlockedAchievementIds() {
    try {
      const achievementStates = await this.loadAchievementStates()
      const unlockedIds = []
      
      achievementStates.unlockedAchievements.forEach((unlocked, achievementId) => {
        if (unlocked) {
          unlockedIds.push(achievementId)
        }
      })
      
      return unlockedIds
    } catch (error) {
      console.error('获取已解锁成就列表失败:', error)
      return []
    }
  }

  /**
   * 开始使用时长跟踪
   * @returns {Promise<boolean>} 开始跟踪是否成功
   */
  async startUsageTracking() {
    try {
      const userProfile = await this.loadUserProfile()
      
      // 确保 loginHistory 数组存在
      if (!userProfile.loginHistory) {
        userProfile.loginHistory = []
      }
      
      const now = new Date().toISOString()
      
      // 保存旧的登录时间（用于计算上次会话时长）
      const previousLoginTime = userProfile.loginHistory.length > 0 ? userProfile.loginHistory[0] : null
      
      // 处理会话时长跟踪
      // 如果 previousLoginTime 存在，说明是应用异常关闭后重启，需要累加上次会话时长
      if (previousLoginTime) {
        const previousSessionStart = new Date(previousLoginTime)
        const nowDate = new Date()
        const previousSessionDuration = Math.floor((nowDate.getTime() - previousSessionStart.getTime()) / 1000)
        
        // 如果上次会话时长超过 24 小时，可能是异常情况，只累加最多 24 小时
        const maxSessionDuration = 24 * 3600 // 24 小时
        const sessionDuration = Math.min(previousSessionDuration, maxSessionDuration)
        
        // 累加上次会话时长到总使用时长
        userProfile.totalUsageTime += sessionDuration
      }
      
      // 更新登录历史队列：将旧的 loginHistory[0] 移到 [1]（作为上一次登录时间）
      // 将当前时间设为 loginHistory[0]（作为本次登录时间）
      if (userProfile.loginHistory.length > 0) {
        // 如果有旧的登录时间，将其移到 [1] 位置
        userProfile.loginHistory[1] = userProfile.loginHistory[0]
        // 确保数组长度不超过2
        userProfile.loginHistory = userProfile.loginHistory.slice(0, 2)
      }
      // 将当前登录时间设为 [0]
      userProfile.loginHistory[0] = now
      // 确保数组长度不超过2（防止数组意外扩展）
      if (userProfile.loginHistory.length > 2) {
        userProfile.loginHistory = userProfile.loginHistory.slice(0, 2)
      }
      
      await this.saveUserProfile(userProfile)
      console.log('开始使用时长跟踪')
      
      return true
    } catch (error) {
      console.error('开始使用时长跟踪失败:', error)
      return false
    }
  }

  /**
   * 结束使用时长跟踪并更新总时长
   * @returns {Promise<boolean>} 结束跟踪是否成功
   */
  async endUsageTracking() {
    try {
      const userProfile = await this.loadUserProfile()
      
      // 使用 loginHistory[0] 作为当前会话开始时间
      if (userProfile.loginHistory && userProfile.loginHistory.length > 0 && userProfile.loginHistory[0]) {
        const sessionStart = new Date(userProfile.loginHistory[0])
        const sessionEnd = new Date()
        const sessionDuration = Math.floor((sessionEnd.getTime() - sessionStart.getTime()) / 1000) // 转换为秒
        
        // 更新总使用时长
        userProfile.totalUsageTime += sessionDuration
        
        await this.saveUserProfile(userProfile)
        console.log(`会话结束，本次使用时长: ${sessionDuration}秒，总使用时长: ${userProfile.totalUsageTime}秒`)
      }
      
      return true
    } catch (error) {
      console.error('结束使用时长跟踪失败:', error)
      return false
    }
  }

  /**
   * 获取当前会话使用时长（秒）
   * @returns {Promise<number>} 当前会话使用时长
   */
  async getCurrentSessionDuration() {
    try {
      const userProfile = await this.loadUserProfile()
      
      // 使用 loginHistory[0] 作为当前会话开始时间
      if (userProfile.loginHistory && userProfile.loginHistory.length > 0 && userProfile.loginHistory[0]) {
        const sessionStart = new Date(userProfile.loginHistory[0])
        const now = new Date()
        return Math.floor((now.getTime() - sessionStart.getTime()) / 1000)
      }
      
      return 0
    } catch (error) {
      console.error('获取当前会话时长失败:', error)
      return 0
    }
  }

  /**
   * 获取总使用时长（秒）
   * @returns {Promise<number>} 总使用时长
   */
  async getTotalUsageTime() {
    try {
      const userProfile = await this.loadUserProfile()
      return userProfile.totalUsageTime || 0
    } catch (error) {
      console.error('获取总使用时长失败:', error)
      return 0
    }
  }

  /**
   * 格式化使用时长显示
   * @param {number} seconds - 秒数
   * @returns {string} 格式化后的时长字符串
   */
  formatUsageTime(seconds) {
    if (seconds < 60) {
      return `${seconds}秒`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`
    } else if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
    } else {
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      return hours > 0 ? `${days}天${hours}小时` : `${days}天`
    }
  }

  /**
   * 备份整个存档目录
   * @param {number} maxBackups - 保留的备份数量，默认5个
   * @returns {Promise<{success: boolean, backupPath?: string, error?: string}>} 备份结果
   */
  async backupEntireSaveData(maxBackups = 5) {
    try {
      if (!window.electronAPI || !window.electronAPI.backupSaveDataDirectory) {
        return { success: false, error: 'Electron API 不可用' }
      }

      const result = await window.electronAPI.backupSaveDataDirectory(this.dataDirectory, maxBackups)
      if (result.success) {
        console.log('✅ 整个存档备份成功:', result.backupPath)
        return { success: true, backupPath: result.backupPath }
      } else {
        console.error('备份整个存档失败:', result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('备份整个存档失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 加载页面数据
   * @param {string} pageId - 页面ID
   * @returns {Promise<any[]>} 页面数据
   */
  async loadPageData(pageId) {
    // 检查是否为默认页面类型
    switch (pageId) {
      case 'games': return this.loadGames()
      case 'images': return this.loadImages()
      case 'videos': return this.loadVideos()
      case 'novels': return this.loadNovels()
      case 'websites': return this.loadWebsites()
      case 'audios': return this.loadAudios()
    }

    // 自定义页面
    // 检查缓存
    if (this.dataCache[`custom_${pageId}`]) {
      console.log(`从缓存加载自定义页面 ${pageId} 数据`)
      return JSON.parse(JSON.stringify(this.dataCache[`custom_${pageId}`]))
    }

    const customPath = `${this.dataDirectory}/CustomPages/${pageId}/data.json`
    const data = await this.readJsonFile(customPath)
    // 自定义页面直接存储数组
    if (!Array.isArray(data)) {
      console.error(
        `加载自定义页面数据失败：${pageId}，路径：${customPath}。期望为数组，实际为：`,
        data
      )
    }
    const result = Array.isArray(data) ? data : []
    this.dataCache[`custom_${pageId}`] = result // 更新缓存
    return result
  }

  /**
   * 保存页面数据
   * @param {string} pageId - 页面ID
   * @param {any[]} data - 页面数据
   * @returns {Promise<boolean>} 是否保存成功
   */
  async savePageData(pageId, data) {
    // 检查是否为默认页面类型
    switch (pageId) {
      case 'games': return this.saveGames(data)
      case 'images': return this.saveImages(data)
      case 'videos': return this.saveVideos(data)
      case 'novels': return this.saveNovels(data)
      case 'websites': return this.saveWebsites(data)
      case 'audios': return this.saveAudios(data)
    }

    // 自定义页面
    const customDir = `${this.dataDirectory}/CustomPages/${pageId}`
    const customPath = `${customDir}/data.json`
    
    // 确保目录存在
    await this.ensureDirectoryByPath(customDir)
    
    const success = await this.writeJsonFile(customPath, data)
    if (success) {
      this.dataCache[`custom_${pageId}`] = JSON.parse(JSON.stringify(data)) // 更新缓存
    }
    return success
  }

  /**
   * 删除页面数据
   * @param {string} pageId - 页面ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deletePageData(pageId) {
    // 检查是否为默认页面类型
    if (this.filePaths[pageId]) {
      console.warn('无法删除默认页面数据:', pageId)
      return false
    }

    // 自定义页面
    const customDir = `${this.dataDirectory}/CustomPages/${pageId}`
    
    if (window.electronAPI && window.electronAPI.deleteDirectory) {
      const result = await window.electronAPI.deleteDirectory(customDir)
      return result.success
    }
    
    return false
  }
}

// 创建单例实例
const saveManager = new SaveManager()

export default saveManager
