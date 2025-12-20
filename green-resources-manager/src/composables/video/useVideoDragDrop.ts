/**
 * 视频拖拽处理 Composable
 * 处理视频文件和文件夹的拖拽添加逻辑，支持批量添加
 */
import { ref, type Ref } from 'vue'
import notify from '../../utils/NotificationService'
import type { Video, VideoFolder, PathUpdateInfo } from '../../types/video'

export interface VideoDragDropOptions {
  /**
   * 视频列表（响应式）
   */
  videos: Ref<Video[]> | Video[]
  
  /**
   * 文件夹列表（响应式）
   */
  folders: Ref<VideoFolder[]> | VideoFolder[]
  
  /**
   * 添加视频的回调函数
   */
  onAddVideo: (videoData: Partial<Video>) => Promise<Video | null>
  
  /**
   * 添加文件夹的回调函数
   */
  onAddFolder: (folderData: Partial<VideoFolder>) => Promise<VideoFolder | null>
  
  /**
   * 显示路径更新对话框的回调函数
   */
  onShowPathUpdateDialog: (info: PathUpdateInfo) => void
  
  /**
   * 重新加载数据的回调函数
   */
  onReloadData?: () => Promise<void>
  
  /**
   * 从文件路径提取视频名称的函数
   */
  extractVideoNameFromPath?: (filePath: string) => string
}

/**
 * 文件夹信息接口（用于拖拽检测）
 */
interface FolderInfo {
  name: string
  path: string
  files: File[]
}

/**
 * 处理结果接口
 */
interface ProcessResult {
  success: boolean
  fileName?: string
  folderName?: string
  filePath?: string
  folderPath?: string
  error?: string
  message?: string
  video?: Video
  existingVideoId?: string
}

/**
 * 视频拖拽处理 composable
 */
export function useVideoDragDrop(options: VideoDragDropOptions) {
  const {
    videos,
    folders,
    onAddVideo,
    onAddFolder,
    onShowPathUpdateDialog,
    onReloadData,
    extractVideoNameFromPath
  } = options

  const isDragOver = ref(false)

  // 获取当前视频列表
  const getVideos = () => {
    return 'value' in videos ? videos.value : videos
  }

  // 获取当前文件夹列表
  const getFolders = () => {
    return 'value' in folders ? folders.value : folders
  }

  /**
   * 从文件名提取视频名称（去掉扩展名）
   */
  const extractVideoName = (fileName: string): string => {
    if (extractVideoNameFromPath) {
      return extractVideoNameFromPath(fileName)
    }
    const lastDotIndex = fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  }

  /**
   * 从拖拽的文件中检测文件夹
   */
  const detectFoldersFromFiles = (files: File[]): FolderInfo[] => {
    console.log('=== 开始检测文件夹 ===')
    const folderMap = new Map<string, FolderInfo>()
    
    for (const file of files) {
      const filePath = (file as any).path || file.name
      const webkitPath = (file as any).webkitRelativePath
      const normalizedPath = filePath ? filePath.replace(/\\/g, '/') : ''

      console.log('处理文件:', {
        name: file.name,
        path: filePath,
        webkitPath: webkitPath
      })
      
      let folderPath = ''
      let folderName = ''
      
      if (webkitPath && webkitPath.includes('/')) {
        // 通过 webkitRelativePath 检测文件夹
        const relativePath = webkitPath.replace(/\\/g, '/')
        const relativeParts = relativePath.split('/')
        folderName = relativeParts[0]

        const basePath = normalizedPath.slice(0, normalizedPath.length - relativePath.length)
        const sanitizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
        folderPath = sanitizedBasePath ? `${sanitizedBasePath}/${folderName}` : folderName
        folderPath = folderPath.replace(/\\/g, '/')
      } else {
        const entry = typeof (file as any).webkitGetAsEntry === 'function'
          ? (file as any).webkitGetAsEntry()
          : null

        if (entry && entry.isDirectory && normalizedPath) {
          folderPath = normalizedPath
          folderName = file.name
        } else {
          const hasExtension = /\.[^\\/]+$/.test(file.name)
          const isLikelyDirectory =
            (!file.type || file.type === '') &&
            !hasExtension

          if (isLikelyDirectory && normalizedPath) {
            folderPath = normalizedPath
            folderName = file.name
          }
        }
      }
      
      if (folderPath && folderName) {
        console.log('检测到文件夹:', {
          name: folderName,
          path: folderPath
        })
        
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, {
            name: folderName,
            path: folderPath,
            files: []
          })
        }
        
        folderMap.get(folderPath)!.files.push(file)
      }
    }
    
    const folders = Array.from(folderMap.values())
    console.log('检测到的文件夹列表:', folders.map(f => ({ name: f.name, path: f.path, fileCount: f.files.length })))
    return folders
  }

  /**
   * 批量处理多个视频文件
   */
  const processMultipleVideoFiles = async (videoFiles: File[]): Promise<ProcessResult[]> => {
    console.log('=== 开始批量处理视频文件 ===')
    console.log('待处理视频文件数量:', videoFiles.length)
    
    const results: ProcessResult[] = []
    const currentVideos = getVideos()
    
    for (let i = 0; i < videoFiles.length; i++) {
      const videoFile = videoFiles[i]
      console.log(`\n--- 处理视频文件 ${i + 1}/${videoFiles.length} ---`)
      console.log('视频文件信息:', {
        name: videoFile.name,
        path: (videoFile as any).path,
        size: videoFile.size
      })
      
      try {
        const filePath = (videoFile as any).path || videoFile.name
        
        // 检查是否已经存在相同的文件路径
        const existingVideoByPath = currentVideos.find(video => video.filePath === filePath)
        if (existingVideoByPath) {
          console.log(`视频文件已存在: ${videoFile.name}`)
          results.push({
            success: false,
            fileName: videoFile.name,
            error: `视频文件 "${videoFile.name}" 已经存在`,
            filePath: filePath,
            existingVideoId: existingVideoByPath.id
          })
          continue
        }
        
        // 检查是否存在同名但路径不同的丢失文件
        const existingVideoByName = currentVideos.find(video => {
          const videoFileName = video.filePath?.split(/[\\/]/).pop()?.toLowerCase() || ''
          const newFileName = videoFile.name.toLowerCase()
          const isSameName = videoFileName === newFileName
          const isFileMissing = video.fileExists === false
          
          console.log(`检查视频: ${video.name}`)
          console.log(`  文件名: ${videoFileName} vs ${newFileName}`)
          console.log(`  是否同名: ${isSameName}`)
          console.log(`  文件存在: ${video.fileExists}`)
          console.log(`  是否丢失: ${isFileMissing}`)
          console.log(`  匹配条件: ${isSameName && isFileMissing}`)
          
          return isSameName && isFileMissing
        })
        
        if (existingVideoByName) {
          console.log(`发现同名丢失文件: ${videoFile.name}`)
          console.log(`现有视频路径: ${existingVideoByName.filePath}`)
          console.log(`新文件路径: ${filePath}`)
          // 显示路径更新确认对话框
          onShowPathUpdateDialog({
            existingVideo: existingVideoByName,
            newPath: filePath,
            newFileName: videoFile.name
          })
          // 暂停处理，等待用户确认
          return results
        }
        
        // 创建新的视频对象
        const video: Partial<Video> = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: extractVideoName(videoFile.name),
          description: '',
          tags: [],
          actors: [],
          series: '',
          duration: 0,
          filePath: filePath,
          thumbnail: '',
          watchCount: 0,
          lastWatched: null,
          addedDate: new Date().toISOString()
        }
        
        console.log('创建视频对象:', video)
        
        // 使用回调添加视频
        const addedVideo = await onAddVideo(video)
        
        if (addedVideo) {
          results.push({
            success: true,
            fileName: videoFile.name,
            video: addedVideo
          })
        } else {
          results.push({
            success: false,
            fileName: videoFile.name,
            error: '添加视频失败'
          })
        }
        console.log('视频文件处理成功:', videoFile.name)
        
      } catch (error: any) {
        console.error(`处理视频文件 "${videoFile.name}" 失败:`, error)
        console.error('错误堆栈:', error.stack)
        
        // 根据错误类型提供更具体的错误信息
        let errorMessage = error.message
        if (error.message.includes('ENOENT')) {
          errorMessage = '视频文件不存在或无法访问'
        } else if (error.message.includes('EACCES')) {
          errorMessage = '没有访问权限'
        } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
          errorMessage = '打开文件过多，请稍后重试'
        } else if (error.message.includes('timeout')) {
          errorMessage = '操作超时'
        } else if (error.message.includes('Invalid path')) {
          errorMessage = '无效的视频文件路径'
        }
        
        results.push({
          success: false,
          fileName: videoFile.name,
          error: errorMessage,
          filePath: (videoFile as any).path,
          originalError: error.message
        } as ProcessResult)
      }
    }
    
    console.log('\n=== 批量处理完成 ===')
    console.log('处理结果统计:', {
      总数: results.length,
      成功: results.filter(r => r.success).length,
      失败: results.filter(r => !r.success).length
    })
    
    return results
  }

  /**
   * 批量处理多个文件夹
   */
  const processMultipleFolders = async (folders: FolderInfo[]): Promise<ProcessResult[]> => {
    console.log('=== 开始批量处理文件夹 ===')
    console.log('待处理文件夹数量:', folders.length)
    
    const results: ProcessResult[] = []
    const currentFolders = getFolders()
    
    for (let i = 0; i < folders.length; i++) {
      const folder = folders[i]
      console.log(`\n--- 处理文件夹 ${i + 1}/${folders.length} ---`)
      console.log('文件夹信息:', {
        name: folder.name,
        path: folder.path,
        fileCount: folder.files.length
      })
      
      try {
        // 检查文件夹是否已存在
        const existingFolder = currentFolders.find(f => f.folderPath === folder.path)
        if (existingFolder) {
          console.log(`文件夹 "${folder.name}" 已存在，跳过`)
          results.push({
            success: false,
            folderName: folder.name,
            folderPath: folder.path,
            error: '文件夹已存在'
          })
          continue
        }
        
        // 创建文件夹对象
        const newFolder: Partial<VideoFolder> = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: folder.name,
          series: '',
          actors: [],
          tags: [],
          description: '',
          folderPath: folder.path,
          thumbnail: '',
          addedDate: new Date().toISOString()
        }
        
        console.log('创建文件夹对象:', newFolder)
        
        // 使用回调添加文件夹
        const addedFolder = await onAddFolder(newFolder)
        console.log('文件夹管理器添加结果:', addedFolder)
        
        if (addedFolder) {
          console.log(`文件夹 "${folder.name}" 添加成功`)
          results.push({
            success: true,
            folderName: folder.name,
            folderPath: folder.path,
            message: '文件夹添加成功'
          })
        } else {
          console.error(`文件夹 "${folder.name}" 添加失败`)
          results.push({
            success: false,
            folderName: folder.name,
            folderPath: folder.path,
            error: '添加失败'
          })
        }
        
      } catch (error: any) {
        console.error(`处理文件夹 "${folder.name}" 时发生错误:`, error)
        results.push({
          success: false,
          folderName: folder.name,
          folderPath: folder.path,
          error: error.message || '处理失败'
        })
      }
    }
    
    console.log('=== 批量处理文件夹完成 ===')
    console.log('处理结果统计:', {
      成功: results.filter(r => r.success).length,
      失败: results.filter(r => !r.success).length,
      总数: results.length
    })
    
    return results
  }

  /**
   * 处理拖拽事件
   */
  const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = false
    
    try {
      const files = Array.from(event.dataTransfer?.files || [])
      
      console.log('=== 拖拽调试信息 ===')
      console.log('拖拽文件数量:', files.length)
      console.log('拖拽文件详细信息:', files.map((f: any) => ({
        name: f.name,
        path: f.path,
        type: f.type,
        size: f.size
      })))
      
      if (files.length === 0) {
        notify.native('拖拽失败', '请拖拽视频文件或文件夹到此处')
        return
      }
      
      // 检测拖拽的内容类型
      const videoExtensions = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.ogv']
      const videoFiles = files.filter((file: File) => {
        const fileName = file.name.toLowerCase()
        return videoExtensions.some(ext => fileName.endsWith(ext))
      })
      
      // 检测文件夹（通过 webkitRelativePath 或文件路径判断）
      const folders = detectFoldersFromFiles(files)
      
      console.log('检测到视频文件数量:', videoFiles.length)
      console.log('检测到文件夹数量:', folders.length)
      
      if (videoFiles.length === 0 && folders.length === 0) {
        notify.native('拖拽失败', '没有检测到视频文件或文件夹，请拖拽视频文件（mp4, avi, mkv, mov, wmv, flv, webm, m4v, 3gp, ogv）或文件夹')
        return
      }
      
      let allResults: ProcessResult[] = []
      
      // 处理视频文件
      if (videoFiles.length > 0) {
        console.log('开始处理视频文件...')
        const videoResults = await processMultipleVideoFiles(videoFiles)
        allResults = allResults.concat(videoResults)
      }
      
      // 处理文件夹
      if (folders.length > 0) {
        console.log('开始处理文件夹...')
        const folderResults = await processMultipleFolders(folders)
        allResults = allResults.concat(folderResults)
      }
      
      // 统计结果
      const addedCount = allResults.filter(r => r.success).length
      const failedCount = allResults.filter(r => !r.success).length
      
      // 重新加载数据
      if (onReloadData) {
        await onReloadData()
      }
      
      // 显示结果通知
      if (addedCount > 0) {
        console.log('显示批量操作结果通知')
        notify.toast('success', '批量添加完成', '', allResults as any)
      } else {
        console.log('所有项目添加失败，显示失败通知')
        const failureReasons = allResults
          .filter(r => !r.success)
          .map((r, index) => `${index + 1}. "${r.fileName || r.folderName}": ${r.error || '未知错误'}`)
          .join('\n')
        
        notify.toast('error', '添加失败', `所有项目添加失败:\n${failureReasons}`, allResults as any)
      }
      
    } catch (error: any) {
      console.error('拖拽添加失败:', error)
      
      let errorMessage = ''
      if (error.name === 'SecurityError') {
        errorMessage = '安全错误：浏览器阻止了文件访问\n请尝试使用"添加"按钮手动选择文件'
      } else if (error.name === 'NotAllowedError') {
        errorMessage = '权限错误：无法访问拖拽的文件\n请检查文件权限或尝试重新拖拽'
      } else if (error.message.includes('path')) {
        errorMessage = `文件路径错误：${error.message}\n请确保文件路径有效且可访问`
      } else {
        errorMessage = `未知错误：${error.message}\n请尝试重新拖拽文件或使用"添加"按钮`
      }
      
      notify.toast(
        'error',
        '添加失败', 
        `拖拽添加时发生错误\n\n${errorMessage}\n`
      )
    }
  }

  /**
   * 处理拖拽悬停事件
   */
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  /**
   * 处理拖拽进入事件
   */
  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    // 防止子元素触发 dragenter 时重复设置状态
    if (!isDragOver.value) {
      isDragOver.value = true
    }
  }

  /**
   * 处理拖拽离开事件
   */
  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault()
    // 只有当离开整个拖拽区域时才取消高亮
    // 检查 relatedTarget 是否存在且不在当前元素内
    const target = event.currentTarget as HTMLElement
    if (!event.relatedTarget || !target.contains(event.relatedTarget as Node)) {
      isDragOver.value = false
    }
  }

  return {
    isDragOver,
    handleDrop,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    detectFoldersFromFiles,
    processMultipleVideoFiles,
    processMultipleFolders,
    extractVideoName
  }
}

