/**
 * 视频文件夹管理 Composable
 * 负责文件夹的 CRUD 操作和数据持久化
 */
import { ref, type Ref } from 'vue'
import FolderManager from '../../utils/FolderManager'
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import type { VideoFolder, FolderVideo } from '../../types/video'

export function useVideoFolder() {
  const folders = ref<VideoFolder[]>([])
  const folderManager = ref<FolderManager | null>(null)
  const isLoading = ref(false)

  /**
   * 初始化文件夹管理器
   */
  const initFolderManager = async () => {
    if (!folderManager.value) {
      folderManager.value = new FolderManager()
      await folderManager.value.init(saveManager)
    }
    return folderManager.value
  }

  /**
   * 加载所有文件夹
   */
  const loadFolders = async () => {
    try {
      isLoading.value = true
      const manager = await initFolderManager()
      folders.value = manager.getFolders()
      console.log('加载文件夹完成:', folders.value.length, '个文件夹')
    } catch (error) {
      console.error('加载文件夹失败:', error)
      notify.toast('error', '加载失败', '无法加载文件夹列表')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存所有文件夹
   */
  const saveFolders = async (): Promise<void> => {
    try {
      const manager = await initFolderManager()
      if (manager) {
        // FolderManager 内部会自动保存
        // 如果需要显式保存，可以在这里调用
      }
    } catch (error) {
      console.error('保存文件夹失败:', error)
      throw error
    }
  }

  /**
   * 添加文件夹
   */
  const addFolder = async (folderData: Partial<VideoFolder>): Promise<VideoFolder | null> => {
    try {
      const manager = await initFolderManager()
      if (!manager) {
        throw new Error('文件夹管理器未初始化')
      }
      
      // FolderManager.addFolder 返回 boolean，需要从列表中查找新添加的文件夹
      const success = await manager.addFolder(folderData as any)
      if (success) {
        await loadFolders()
        // 从列表中查找新添加的文件夹（通过 folderPath 匹配）
        const addedFolder = folders.value.find(f => f.folderPath === folderData.folderPath && f.id === folderData.id)
        return addedFolder || null
      }
      return null
    } catch (error) {
      console.error('添加文件夹失败:', error)
      throw error
    }
  }

  /**
   * 更新文件夹
   */
  const updateFolder = async (id: string, folderData: Partial<VideoFolder>): Promise<void> => {
    try {
      const manager = await initFolderManager()
      if (!manager) {
        throw new Error('文件夹管理器未初始化')
      }
      
      await manager.updateFolder(id, folderData)
      await loadFolders()
    } catch (error) {
      console.error('更新文件夹失败:', error)
      throw error
    }
  }

  /**
   * 删除文件夹
   */
  const deleteFolder = async (id: string): Promise<boolean> => {
    try {
      const manager = await initFolderManager()
      if (!manager) {
        throw new Error('文件夹管理器未初始化')
      }
      
      const success = await manager.deleteFolder(id)
      if (success) {
        await loadFolders()
      }
      return success
    } catch (error) {
      console.error('删除文件夹失败:', error)
      throw error
    }
  }

  /**
   * 从文件夹中移除视频引用
   */
  const removeVideoFromFolders = async (videoId: string): Promise<void> => {
    try {
      const manager = await initFolderManager()
      if (!manager) {
        throw new Error('文件夹管理器未初始化')
      }
      
      await manager.removeVideoFromFolders(videoId)
      await loadFolders()
    } catch (error) {
      console.error('从文件夹移除视频失败:', error)
      throw error
    }
  }

  /**
   * 获取文件夹中的视频文件列表
   */
  const getFolderVideos = async (folder: VideoFolder): Promise<FolderVideo[]> => {
    if (!folder || !folder.folderPath) {
      console.log('文件夹或路径不存在:', folder)
      return []
    }
    
    try {
      console.log('开始扫描文件夹:', folder.folderPath)
      
      // 如果文件夹对象中已经有 folderVideos 数据，直接返回（包含缩略图信息）
      if (folder.folderVideos && Array.isArray(folder.folderVideos) && folder.folderVideos.length > 0) {
        console.log('使用已保存的文件夹视频列表（包含缩略图）:', folder.folderVideos.length, '个视频')
        // 确保清理任何可能残留的生成状态
        folder.folderVideos.forEach(video => {
          video.isGeneratingThumbnail = false
        })
        return folder.folderVideos
      }
      
      // 否则重新扫描文件夹
      if (window.electronAPI && window.electronAPI.listFiles) {
        const result = await window.electronAPI.listFiles(folder.folderPath)
        console.log('文件夹扫描结果:', result)
        
        if (result && result.success && Array.isArray(result.files)) {
          const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv']
          const videoFiles = result.files
            .map((f: any) => {
              const path = typeof f === 'string' ? f : f.path || ''
              console.log('处理文件:', path)
              return path
            })
            .filter(Boolean)
            .map((p: string) => {
              // 如果路径不是绝对路径，则拼接文件夹路径
              let fullPath = p.replace(/\\/g, '/')
              if (!fullPath.includes('/') || (!fullPath.startsWith('/') && !fullPath.match(/^[A-Za-z]:/))) {
                // 只是文件名，需要拼接完整路径
                const folderPath = folder.folderPath!.replace(/\\/g, '/')
                fullPath = folderPath.endsWith('/') ? folderPath + fullPath : folderPath + '/' + fullPath
              }
              console.log('完整路径:', fullPath)
              return fullPath
            })
            .filter((p: string) => {
              const hasVideoExt = videoExtensions.some(ext => p.toLowerCase().endsWith(ext))
              console.log('视频文件检查:', p, '是否视频:', hasVideoExt)
              return hasVideoExt
            })
            .map((filePath: string) => {
              // 从文件路径提取视频名称（去掉扩展名）
              const extractVideoName = (fileName: string) => {
                const lastDotIndex = fileName.lastIndexOf('.')
                return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
              }
              
              const videoInfo: FolderVideo = {
                name: extractVideoName(filePath.split('/').pop() || ''),
                path: filePath,
                size: 0, // 可以后续添加文件大小获取
                thumbnail: null, // 初始没有缩略图
                isGeneratingThumbnail: false // 确保不会被禁用
              }
              console.log('创建视频信息:', videoInfo)
              return videoInfo
            })
            
          console.log('最终视频文件列表:', videoFiles)
          return videoFiles
        }
      }
      return []
    } catch (error) {
      console.error('获取文件夹视频列表失败:', error)
      return []
    }
  }

  /**
   * 为文件夹预加载视频列表
   */
  const preloadFolderVideos = async (folder: VideoFolder): Promise<void> => {
    if (folder.folderPath && !folder.folderVideos) {
      try {
        const folderVideos = await getFolderVideos(folder)
        folder.folderVideos = folderVideos
        console.log(`文件夹 "${folder.name}" 包含 ${folderVideos.length} 个视频`)
      } catch (error) {
        console.error(`加载文件夹 "${folder.name}" 视频列表失败:`, error)
        folder.folderVideos = []
      }
    }
  }

  /**
   * 批量预加载所有文件夹的视频列表
   */
  const preloadAllFolderVideos = async (): Promise<void> => {
    for (const folder of folders.value) {
      await preloadFolderVideos(folder)
    }
  }

  /**
   * 获取文件夹管理器实例
   */
  const getFolderManager = (): FolderManager | null => {
    return folderManager.value
  }

  return {
    folders,
    folderManager,
    isLoading,
    loadFolders,
    saveFolders,
    addFolder,
    updateFolder,
    deleteFolder,
    removeVideoFromFolders,
    getFolderVideos,
    preloadFolderVideos,
    preloadAllFolderVideos,
    getFolderManager,
    initFolderManager
  }
}

