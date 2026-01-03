/**
 * 插件管理器
 * 负责扫描、加载和管理创意工坊插件
 */

interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  entry?: string
  tags?: string[]
  icon?: string
}

interface PluginInfo {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  entry?: string
  tags?: string[]
  icon?: string
  path: string // 插件目录路径
  enabled: boolean // 是否启用
  manifestPath: string // manifest.json 路径
}

class PluginManager {
  private plugins: PluginInfo[] = []
  private modsDirectory: string = 'mods'

  /**
   * 获取 mods 目录路径
   */
  private getModsDirectory(): string {
    // 在 Electron 应用中，mods 目录应该在应用根目录下
    // 这里返回相对路径，实际使用时需要转换为绝对路径
    return this.modsDirectory
  }

  /**
   * 扫描 mods 目录，加载所有插件
   */
  async scanPlugins(): Promise<PluginInfo[]> {
    try {
      if (!window.electronAPI || !window.electronAPI.listFiles) {
        console.warn('electronAPI.listFiles 不可用')
        return []
      }

      // 获取应用根路径
      let appRootPath = ''
      if (window.electronAPI.getAppRootPath) {
        try {
          const rootResult = await window.electronAPI.getAppRootPath() as any
          if (rootResult && (rootResult.success || typeof rootResult === 'string')) {
            // 如果返回的是对象，取 path 字段；如果是字符串，直接使用
            appRootPath = typeof rootResult === 'string' ? rootResult : (rootResult.path || '')
          }
        } catch (error) {
          console.warn('获取应用根路径失败:', error)
          appRootPath = ''
        }
      }

      // 构建 mods 目录路径
      const modsPath = appRootPath ? `${appRootPath}/${this.modsDirectory}` : this.modsDirectory
      
      // 列出 mods 目录下的所有文件夹
      const listResult = await window.electronAPI.listFiles(modsPath)
      
      if (!listResult || !listResult.success || !listResult.files) {
        console.warn('无法列出 mods 目录:', listResult?.error || '未知错误')
        return []
      }

      const plugins: PluginInfo[] = []
      
      // 遍历每个目录，检查是否为有效插件
      for (const folderName of listResult.files) {
        // 跳过 README.md 等文件
        if (folderName.includes('.')) {
          continue
        }

        try {
          const pluginPath = appRootPath ? `${appRootPath}/${this.modsDirectory}/${folderName}` : `${this.modsDirectory}/${folderName}`
          const manifestPath = `${pluginPath}/manifest.json`

          // 检查 manifest.json 是否存在
          if (window.electronAPI.checkFileExists) {
            const existsResult = await window.electronAPI.checkFileExists(manifestPath)
            if (!existsResult || !existsResult.success) {
              continue
            }
          }

          // 读取 manifest.json
          if (!window.electronAPI.readJsonFile) {
            continue
          }

          const manifestResult = await window.electronAPI.readJsonFile(manifestPath)
          
          if (!manifestResult || !manifestResult.success || !manifestResult.data) {
            console.warn(`无法读取插件 ${folderName} 的 manifest.json`)
            continue
          }

          const manifest = manifestResult.data as PluginManifest

          // 验证必需的字段
          if (!manifest.id || !manifest.name || !manifest.version) {
            console.warn(`插件 ${folderName} 的 manifest.json 缺少必需字段`)
            continue
          }

          // 加载插件启用状态（从设置或本地存储）
          const enabled = await this.getPluginEnabledStatus(manifest.id)

          const pluginInfo: PluginInfo = {
            id: manifest.id,
            name: manifest.name,
            version: manifest.version,
            description: manifest.description,
            author: manifest.author,
            entry: manifest.entry || 'index.js',
            tags: manifest.tags,
            icon: manifest.icon,
            path: pluginPath,
            enabled: enabled,
            manifestPath: manifestPath
          }

          plugins.push(pluginInfo)
        } catch (error) {
          console.error(`加载插件 ${folderName} 失败:`, error)
        }
      }

      this.plugins = plugins
      return plugins
    } catch (error) {
      console.error('扫描插件失败:', error)
      return []
    }
  }

  /**
   * 获取插件启用状态
   */
  private async getPluginEnabledStatus(pluginId: string): Promise<boolean> {
    try {
      // 从本地存储读取
      const storageKey = `plugin-${pluginId}-enabled`
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) {
        return stored === 'true'
      }
      
      // 默认禁用
      return false
    } catch (error) {
      console.error(`获取插件 ${pluginId} 启用状态失败:`, error)
      return false
    }
  }

  /**
   * 设置插件启用状态
   */
  async setPluginEnabled(pluginId: string, enabled: boolean): Promise<boolean> {
    try {
      const plugin = this.plugins.find(p => p.id === pluginId)
      if (!plugin) {
        console.warn(`插件 ${pluginId} 不存在`)
        return false
      }

      // 更新内存中的状态
      plugin.enabled = enabled

      // 保存到本地存储
      const storageKey = `plugin-${pluginId}-enabled`
      localStorage.setItem(storageKey, enabled.toString())

      return true
    } catch (error) {
      console.error(`设置插件 ${pluginId} 启用状态失败:`, error)
      return false
    }
  }

  /**
   * 获取所有插件
   */
  getPlugins(): PluginInfo[] {
    return [...this.plugins]
  }

  /**
   * 根据 ID 获取插件
   */
  getPlugin(pluginId: string): PluginInfo | undefined {
    return this.plugins.find(p => p.id === pluginId)
  }
}

// 导出单例
const pluginManager = new PluginManager()
export default pluginManager

