/**
 * 图片专辑管理 Composable
 * 负责专辑的 CRUD 操作和数据持久化
 */
import { ref, type Ref } from 'vue'
import saveManager from '../../utils/SaveManager'
import notify from '../../utils/NotificationService'
import type { Album } from '../../types/image'

const IMAGE_COLLECTION_ACHIEVEMENTS = [
  { threshold: 50, id: 'image_collector_50' },
  { threshold: 100, id: 'image_collector_100' },
  { threshold: 500, id: 'image_collector_500' },
  { threshold: 1000, id: 'image_collector_1000' }
]

export function useImageAlbum(pageId: string = 'images') {
  const albums = ref<Album[]>([])
  const currentAlbum = ref<Album | null>(null)
  const isLoading = ref(false)

  /**
   * 加载所有专辑
   */
  const loadAlbums = async () => {
    try {
      isLoading.value = true
      albums.value = await saveManager.loadPageData(pageId)
    } catch (error) {
      console.error('加载专辑失败:', error)
      notify.toast('error', '加载失败', '无法加载漫画列表')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存所有专辑
   */
  const saveAlbums = async (): Promise<void> => {
    try {
      await saveManager.savePageData(pageId, albums.value)
    } catch (error) {
      console.error('保存专辑失败:', error)
      throw error
    }
  }

  /**
   * 检查图片收藏成就
   */
  const checkImageCollectionAchievements = async () => {
    if (!Array.isArray(albums.value)) return

    const totalAlbums = albums.value.length
    const unlockPromises = IMAGE_COLLECTION_ACHIEVEMENTS
      .filter(config => totalAlbums >= config.threshold)
      .map(config => {
        // 动态导入避免循环依赖
        return import('../../pages/user/AchievementView.vue').then(module => 
          module.unlockAchievement(config.id)
        )
      })

    if (unlockPromises.length === 0) return

    try {
      await Promise.all(unlockPromises)
    } catch (error) {
      console.warn('触发图片收藏成就时出错:', error)
    }
  }

  /**
   * 从路径提取文件夹名
   */
  const extractFolderName = (path: string): string => {
    const parts = String(path || '').replace(/\\/g, '/').split('/')
    return parts[parts.length - 1] || '未命名'
  }

  /**
   * 检查路径是否为单个图片文件
   */
  const isImageFile = (path: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']
    const lowerPath = path.toLowerCase()
    return imageExtensions.some(ext => lowerPath.endsWith(ext))
  }

  /**
   * 添加新专辑
   */
  const addAlbum = async (albumData: Partial<Album>): Promise<Album> => {
    if (!albumData.folderPath?.trim()) {
      throw new Error('文件夹路径不能为空')
    }

    const path = albumData.folderPath.trim()
    const isSingleImage = isImageFile(path)

    // 检查是否已存在相同路径的专辑
    const existingAlbum = albums.value.find(
      a => a.folderPath === path
    )
    if (existingAlbum) {
      throw new Error(`路径 "${path}" 已经存在`)
    }

    // 检查是否为压缩包
    const isArchive = albumData.isArchive || false
    
    // 扫描图片文件
    let pages: string[] = []
    if (isSingleImage) {
      // 单个图片文件，直接使用该文件路径
      pages = [path]
    } else if (!isArchive && window.electronAPI?.listImageFiles) {
      // 文件夹，扫描其中的图片文件
      const resp = await window.electronAPI.listImageFiles(path)
      if (resp.success) {
        pages = resp.files || []
      } else {
        throw new Error(resp.error || '扫描图片文件失败')
      }
    }

    // 提取名称
    let albumName = albumData.name?.trim()
    if (!albumName) {
      if (isSingleImage) {
        // 单个图片：使用文件名（不含扩展名）
        const fileName = extractFolderName(path)
        albumName = fileName.replace(/\.[^/.]+$/, '')
      } else {
        // 文件夹：使用文件夹名
        albumName = extractFolderName(path)
      }
    }

    const album: Album = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: albumName,
      author: albumData.author?.trim() || '',
      description: albumData.description?.trim() || '',
      tags: albumData.tags || [],
      folderPath: path,
      cover: albumData.cover || pages[0] || '',
      pagesCount: pages.length,
      addedDate: new Date().toISOString(),
      lastViewed: null,
      viewCount: 0,
      fileExists: true,
      isArchive: isArchive
    }

    albums.value.push(album)
    await saveAlbums()
    
    return album
  }

  /**
   * 更新专辑
   */
  const updateAlbum = async (id: string, updates: Partial<Album>): Promise<void> => {
    const index = albums.value.findIndex(a => a.id === id)
    if (index === -1) {
      throw new Error('未找到要编辑的漫画')
    }

    const target = albums.value[index]
    const oldFolderPath = target.folderPath
    
    // 更新字段
    if (updates.name !== undefined) target.name = updates.name.trim() || target.name
    if (updates.author !== undefined) target.author = updates.author.trim()
    if (updates.description !== undefined) target.description = updates.description.trim()
    if (updates.tags !== undefined) target.tags = [...updates.tags]
    if (updates.folderPath !== undefined) target.folderPath = updates.folderPath.trim() || target.folderPath
    if (updates.cover !== undefined) target.cover = updates.cover.trim()
    if (updates.rating !== undefined) target.rating = updates.rating
    if (updates.comment !== undefined) target.comment = updates.comment
    if (updates.isFavorite !== undefined) target.isFavorite = updates.isFavorite
    
    // 保持浏览次数不变
    if (!target.viewCount) {
      target.viewCount = 0
    }

    // 如果更换了文件夹，重新扫描图片
    if (updates.folderPath && updates.folderPath.trim() && updates.folderPath !== oldFolderPath) {
      await refreshAlbumPages(target)
    }

    await saveAlbums()
  }

  /**
   * 删除专辑
   */
  const removeAlbum = async (id: string): Promise<void> => {
    const index = albums.value.findIndex(a => a.id === id)
    if (index === -1) {
      throw new Error('漫画不存在')
    }

    const album = albums.value[index]
    albums.value.splice(index, 1)
    await saveAlbums()
    
    notify.toast('success', '删除成功', `已成功删除漫画 "${album.name}"`)
  }

  /**
   * 刷新专辑的页面信息
   */
  const refreshAlbumPages = async (album: Album): Promise<void> => {
    const isSingleImage = isImageFile(album.folderPath)
    
    if (isSingleImage) {
      // 单个图片文件，直接使用该文件
      album.pagesCount = 1
      if (!album.cover) {
        album.cover = album.folderPath
      }
      return
    }
    
    if (!window.electronAPI?.listImageFiles) return

    try {
      const resp = await window.electronAPI.listImageFiles(album.folderPath)
      if (resp.success) {
        const files = resp.files || []
        album.pagesCount = files.length
        if (!album.cover && files.length > 0) {
          album.cover = files[0]
        }
      }
    } catch (error) {
      console.error('重新扫描图片文件失败:', error)
    }
  }

  /**
   * 更新专辑的查看信息
   */
  const updateViewInfo = async (album: Album): Promise<void> => {
    album.viewCount = (album.viewCount || 0) + 1
    album.lastViewed = new Date().toISOString()
    await saveAlbums()
  }

  /**
   * 检查文件存在性
   */
  const checkFileExistence = async (): Promise<void> => {
    if (!window.electronAPI?.checkFileExists) {
      albums.value.forEach(album => {
        album.fileExists = true
      })
      return
    }

    const missingFiles: Array<{ name: string; path: string }> = []

    for (const album of albums.value) {
      if (!album.folderPath) {
        album.fileExists = false
        missingFiles.push({ name: album.name, path: '未设置路径' })
        continue
      }

      try {
        const result = await window.electronAPI.checkFileExists(album.folderPath)
        album.fileExists = result.exists
        if (!result.exists) {
          missingFiles.push({ name: album.name, path: album.folderPath })
        }
      } catch (error) {
        console.error(`检测图片文件夹存在性失败: ${album.name}`, error)
        album.fileExists = false
        missingFiles.push({ name: album.name, path: album.folderPath || '路径检测失败' })
      }
    }

    if (missingFiles.length > 0) {
      const fileList = missingFiles
        .map(file => `• ${file.name}${file.path !== '未设置路径' && file.path !== '路径检测失败' ? ` (${file.path})` : ''}`)
        .join('\n')
      
      notify.toast(
        'warning',
        '文件夹丢失提醒',
        `发现 ${missingFiles.length} 个图片文件夹丢失：\n${fileList}\n\n请检查文件夹路径或重新添加这些图片。`
      )
    }
  }

  return {
    // 状态
    albums,
    currentAlbum,
    isLoading,

    // 方法
    loadAlbums,
    saveAlbums,
    addAlbum,
    updateAlbum,
    removeAlbum,
    checkFileExistence,
    checkImageCollectionAchievements,
    refreshAlbumPages,
    updateViewInfo,
    extractFolderName
  }
}

