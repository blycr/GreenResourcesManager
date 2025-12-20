/**
 * 视频缩略图处理 Composable
 * 负责缩略图的生成、URL转换、缓存管理
 */
import { ref, type Ref } from 'vue'
import saveManager from '../../utils/SaveManager'

export interface VideoThumbnailOptions {
  /**
   * 缩略图URL缓存（可选，如果不提供则创建新的）
   */
  thumbnailUrlCache?: Ref<Map<string, string>> | Map<string, string>
}

/**
 * 视频缩略图处理 composable
 */
export function useVideoThumbnail(options: VideoThumbnailOptions = {}) {
  const thumbnailUrlCache = ref(options.thumbnailUrlCache || new Map<string, string>())

  /**
   * 构建文件URL的辅助方法
   */
  const buildFileUrl = (filePath: string): string => {
    try {
      // 将反斜杠转换为正斜杠，并确保路径以 / 开头
      const normalized = filePath.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')
      // 对路径进行编码，处理中文和特殊字符
      const encoded = normalized.split('/').map(seg => {
        if (seg.includes(':')) {
          // 处理 Windows 盘符（如 C:）
          return seg
        }
        return encodeURIComponent(seg)
      }).join('/')
      const fileUrl = 'file://' + encoded
      console.log('🔧 手动构建的 file:// URL:', fileUrl)
      return fileUrl
    } catch (e) {
      console.error('构建文件URL失败:', e)
      return filePath // 降级返回原始路径
    }
  }

  /**
   * 获取缩略图的显示URL
   * 支持多种格式：base64 dataURL、本地文件路径、HTTP URL
   */
  const getThumbnailUrl = (thumbnail: string): string => {
    // 1. 空值检查：如果没有缩略图，返回默认图标
    if (!thumbnail) {
      return './default-video.png'
    }
    
    // 2. 缓存检查：如果已经处理过这个缩略图，直接返回缓存结果
    const cache = 'value' in thumbnailUrlCache ? thumbnailUrlCache.value : thumbnailUrlCache
    if (cache.has(thumbnail)) {
      return cache.get(thumbnail)!
    }
    
    // 3. 格式判断：只处理本地文件路径，其他格式直接返回
    if (thumbnail && !thumbnail.startsWith('data:') && !thumbnail.startsWith('/') && !thumbnail.startsWith('http')) {
      // 本地文件路径，需要转换为浏览器可访问的 file:// URL
      try {
        let url = ''
        
        // 4. 路径类型判断：区分相对路径和绝对路径
        if (thumbnail.startsWith('SaveData/')) {
          // 4.1 相对路径处理（以 SaveData 开头）
          const absolutePath = thumbnail.replace(/\\/g, '/')
          console.log('处理相对路径:', absolutePath)
          
          // 构建 file:// URL
          const encoded = absolutePath.split('/').map(seg => {
            return encodeURIComponent(seg)
          }).join('/')
          
          url = 'file:///' + encoded
        } else {
          // 4.2 绝对路径处理（如 E:/app/SaveData/...）
          const normalized = thumbnail.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')
          
          // URL 编码每个路径段
          const encoded = normalized.split('/').map(seg => {
            if (seg.includes(':')) return seg // 保留盘符部分（如 /E:）
            return encodeURIComponent(seg)
          }).join('/')
          
          url = 'file://' + encoded
        }
        
        // 5. 缓存结果
        cache.set(thumbnail, url)
        console.log('缩略图 URL:', url)
        return url
      } catch (error) {
        console.error('转换缩略图路径失败:', error)
        return './default-video.png'
      }
    }
    
    // 6. 直接返回：对于 base64 dataURL、HTTP URL 等格式，直接返回原值
    return thumbnail
  }

  /**
   * 异步获取缩略图的显示URL（增强版）
   * 优先使用 Electron API 来正确处理文件路径，提供更好的兼容性
   */
  const getThumbnailUrlAsync = async (thumbnail: string): Promise<string> => {
    // 1. 空值检查
    if (!thumbnail) {
      return './default-video.png'
    }
    
    // 2. 缓存检查：避免重复的异步操作
    const cache = 'value' in thumbnailUrlCache ? thumbnailUrlCache.value : thumbnailUrlCache
    if (cache.has(thumbnail)) {
      return cache.get(thumbnail)!
    }
    
    // 3. 格式判断：只处理本地文件路径
    if (thumbnail && !thumbnail.startsWith('data:') && !thumbnail.startsWith('/') && !thumbnail.startsWith('http')) {
      // 本地文件路径，使用 Electron API 进行异步处理
      try {
        // 4. 优先方案：使用 readFileAsDataUrl API
        if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
          const dataUrl = await window.electronAPI.readFileAsDataUrl(thumbnail)
          if (dataUrl) {
            console.log('通过 readFileAsDataUrl 获取缩略图:', dataUrl.substring(0, 50) + '...')
            cache.set(thumbnail, dataUrl)
            return dataUrl
          }
        }
        
        // 5. 降级方案1：使用 getFileUrl API
        if (window.electronAPI && window.electronAPI.getFileUrl) {
          const result = await window.electronAPI.getFileUrl(thumbnail)
          if (result.success) {
            console.log('通过 Electron API 获取文件 URL:', result.url)
            cache.set(thumbnail, result.url)
            return result.url
          } else {
            console.warn('Electron API 获取文件 URL 失败:', result.error)
          }
        }
        
        // 6. 降级方案2：使用同步方法
        const url = getThumbnailUrl(thumbnail)
        cache.set(thumbnail, url)
        return url
      } catch (error) {
        console.error('转换缩略图路径失败:', error)
        return './default-video.png'
      }
    }
    
    // 7. 直接返回：对于 base64 dataURL、HTTP URL 等格式，直接返回原值
    return thumbnail
  }

  /**
   * 处理缩略图加载失败的情况
   */
  const handleThumbnailError = async (event: Event): Promise<void> => {
    console.log('缩略图加载失败，尝试使用异步方法')
    
    const target = event.target as HTMLImageElement
    const originalSrc = target.getAttribute('data-original-src')
    
    // 检查是否为本地文件路径
    if (originalSrc && !originalSrc.startsWith('data:') && !originalSrc.startsWith('/') && !originalSrc.startsWith('http')) {
      try {
        // 使用异步方法重新获取正确的 URL
        const asyncUrl = await getThumbnailUrlAsync(originalSrc)
        
        if (asyncUrl && asyncUrl !== '/icon.svg') {
          console.log('异步方法获取到缩略图 URL:', asyncUrl)
          target.src = asyncUrl
          return
        }
      } catch (error) {
        console.error('异步获取缩略图失败:', error)
      }
    }
    
    // 降级处理：如果异步方法也失败，使用默认图标
    console.log('使用默认图标')
    target.src = './default-video.png'
  }

  /**
   * 处理缩略图预览加载错误
   */
  const handleThumbnailPreviewError = async (event: Event, thumbnailPath: string): Promise<void> => {
    console.log('缩略图预览加载失败，尝试使用异步方法')
    
    const target = event.target as HTMLImageElement
    
    if (thumbnailPath && !thumbnailPath.startsWith('data:') && !thumbnailPath.startsWith('/') && !thumbnailPath.startsWith('http')) {
      try {
        // 使用异步方法重新获取正确的 URL
        const asyncUrl = await getThumbnailUrlAsync(thumbnailPath)
        
        if (asyncUrl && asyncUrl !== '/icon.svg') {
          console.log('异步方法获取到缩略图 URL:', asyncUrl)
          target.src = asyncUrl
          return
        }
      } catch (error) {
        console.error('异步获取缩略图失败:', error)
      }
    }
    
    // 降级处理：隐藏图片
    console.log('使用默认处理')
    target.style.display = 'none'
  }

  /**
   * 从路径提取不带扩展名的文件名
   */
  const extractNameFromPath = (filePath: string): string => {
    if (!filePath) return ''
    const normalized = filePath.replace(/\\/g, '/')
    const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
    const dotIndex = filename.lastIndexOf('.')
    return dotIndex > 0 ? filename.substring(0, dotIndex) : filename
  }

  /**
   * 生成缩略图文件名：视频名+cover+_序号
   */
  const generateThumbnailFilename = async (videoName: string | null, filePath: string): Promise<string> => {
    try {
      // 如果没有提供视频名，从文件路径提取
      let name = videoName
      if (!name || !name.trim()) {
        name = extractNameFromPath(filePath)
      }
      
      // 清理文件名，移除特殊字符，只保留字母、数字、中文、下划线和连字符
      const cleanName = name.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
      
      // 获取当前最大的序号
      const maxNumber = await getMaxThumbnailNumber(cleanName)
      const nextNumber = maxNumber + 1
      
      const filename = `${cleanName}cover_${nextNumber}.jpg`
      console.log('📝 生成缩略图文件名:', filename)
      return filename
    } catch (error) {
      console.error('生成缩略图文件名失败:', error)
      // 降级方案：使用时间戳
      return `video_${Date.now()}.jpg`
    }
  }

  /**
   * 获取指定视频名的最大缩略图序号
   */
  const getMaxThumbnailNumber = async (videoName: string): Promise<number> => {
    try {
      if (!window.electronAPI || !window.electronAPI.listFiles) {
        console.warn('Electron API 不可用，使用默认序号')
        return 0
      }

      // 获取视频缩略图目录
      const thumbnailDir = saveManager.thumbnailDirectories?.videos || 'SaveData/Video/Covers'
      
      // 列出目录中的所有文件
      const result = await window.electronAPI.listFiles(thumbnailDir)
      if (!result.success) {
        console.warn('无法列出缩略图目录:', result.error)
        return 0
      }

      const files = result.files || []
      let maxNumber = 0
      
      // 查找匹配的文件名模式：视频名cover_数字.jpg
      const pattern = new RegExp(`^${videoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}cover_(\\d+)\\.jpg$`)
      
      for (const file of files) {
        const match = file.match(pattern)
        if (match) {
          const number = parseInt(match[1], 10)
          if (number > maxNumber) {
            maxNumber = number
          }
        }
      }
      
      console.log(`📊 视频 "${videoName}" 的最大缩略图序号: ${maxNumber}`)
      return maxNumber
    } catch (error) {
      console.error('获取最大缩略图序号失败:', error)
      return 0
    }
  }

  /**
   * 获取文件夹视频的最大缩略图序号
   */
  const getMaxFolderVideoThumbnailNumber = async (folderName: string, videoName: string): Promise<number> => {
    try {
      if (!window.electronAPI || !window.electronAPI.listFiles) {
        console.warn('Electron API 不可用，使用默认序号')
        return 0
      }

      // 获取文件夹的缩略图目录
      const thumbnailDir = `${saveManager.thumbnailDirectories?.videos || 'SaveData/Video/Covers'}/${folderName}`
      
      // 列出目录中的所有文件
      const result = await window.electronAPI.listFiles(thumbnailDir)
      if (!result.success) {
        console.warn('无法列出文件夹缩略图目录:', result.error)
        return 0
      }

      const files = result.files || []
      let maxNumber = 0
      
      // 查找匹配的文件名模式：视频名_cover_数字.jpg
      const pattern = new RegExp(`^${videoName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_cover_(\\d+)\\.jpg$`)
      
      for (const file of files) {
        // 只匹配文件名，不包含路径
        const fileName = file.split(/[\\/]/).pop() || file
        const match = fileName.match(pattern)
        if (match) {
          const number = parseInt(match[1], 10)
          if (number > maxNumber) {
            maxNumber = number
          }
        }
      }
      
      console.log(`📊 文件夹 "${folderName}" 中视频 "${videoName}" 的最大缩略图序号: ${maxNumber}`)
      return maxNumber
    } catch (error) {
      console.error('获取文件夹视频缩略图最大序号失败:', error)
      return 0
    }
  }

  /**
   * 删除旧的缩略图文件
   */
  const deleteOldThumbnail = async (thumbnailPath: string): Promise<void> => {
    try {
      if (!thumbnailPath || !thumbnailPath.trim()) {
        return
      }

      // 如果是base64数据，不需要删除
      if (thumbnailPath.startsWith('data:')) {
        return
      }

      console.log('🗑️ 准备删除旧缩略图:', thumbnailPath)
      
      const success = await saveManager.deleteThumbnail(thumbnailPath)
      
      if (success) {
        console.log('✅ 旧缩略图删除成功:', thumbnailPath)
      } else {
        console.warn('⚠️ 旧缩略图删除失败:', thumbnailPath)
      }
    } catch (error) {
      console.error('删除旧缩略图失败:', error)
    }
  }

  /**
   * 生成视频缩略图：从视频随机时间截取一帧，保存为本地文件并返回文件路径
   */
  const generateThumbnail = async (
    filePath: string,
    videoName: string | null = null,
    existingThumbnail: string | null = null,
    buildFileUrlFn?: (path: string) => string
  ): Promise<string | null> => {
    return new Promise(async (resolve) => {
      try {
        if (!filePath) {
          console.warn('⚠️ generateThumbnail: 文件路径为空')
          return resolve(null)
        }
        
        console.log('🔍 generateThumbnail 开始处理:', filePath)
        
        // 检查文件扩展名，跳过可能不支持的格式
        const extension = filePath.toLowerCase().split('.').pop()
        const supportedFormats = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv']
        if (!supportedFormats.includes(extension || '')) {
          console.warn('⚠️ 不支持的视频格式:', extension)
          return resolve(null)
        }
        
        let src = filePath
        const buildUrl = buildFileUrlFn || buildFileUrl
        
        // 优先通过 getFileUrl 生成可加载的 file:// 或安全映射 URL
        if (window.electronAPI && window.electronAPI.getFileUrl) {
          try {
            console.log('📡 调用 getFileUrl API...')
            const result = await window.electronAPI.getFileUrl(filePath)
            console.log('📡 getFileUrl 返回:', result)
            if (result && result.success && result.url && result.url.startsWith('file://')) {
              src = result.url
              console.log('✅ 使用 getFileUrl 生成的 URL:', src)
            } else {
              console.warn('⚠️ getFileUrl 返回格式不正确:', result)
              src = buildUrl(filePath)
            }
          } catch (e) {
            console.warn('⚠️ getFileUrl 调用失败:', e)
            src = buildUrl(filePath)
          }
        } else {
          console.warn('⚠️ getFileUrl API 不可用，使用降级方案')
          src = buildUrl(filePath)
        }

        console.log('🎬 创建 video 元素，src:', src)
        const video = document.createElement('video')
        video.style.position = 'fixed'
        video.style.left = '-9999px'
        video.style.top = '-9999px'
        video.muted = true
        video.preload = 'metadata'
        video.crossOrigin = 'anonymous'
        video.src = src

        // 设置超时，避免长时间等待
        const timeout = setTimeout(() => {
          console.warn('⏰ 视频加载超时')
          cleanup()
          resolve(null)
        }, 10000) // 10秒超时

        const onError = (e: Event) => {
          console.error('❌ 视频加载错误:', e)
          console.error('❌ 错误详情:', {
            error: e,
            code: (video as any).error?.code,
            message: (video as any).error?.message,
            src: video.src,
            networkState: video.networkState,
            readyState: video.readyState
          })
          
          // 检查是否是解码器不支持的错误
          if ((video as any).error?.code === 4 || (video as any).error?.message?.includes('DECODER_ERROR_NOT_SUPPORTED')) {
            console.warn('⚠️ 视频格式不被浏览器支持，跳过缩略图生成')
            cleanup()
            resolve(null)
          } else {
            cleanup()
            resolve(null)
          }
        }

        const cleanup = () => {
          clearTimeout(timeout)
          console.log('🧹 清理 video 元素和事件监听器')
          video.removeEventListener('error', onError)
          video.removeEventListener('loadedmetadata', onLoadedMeta)
          video.removeEventListener('seeked', onSeeked)
          try { 
            video.pause() 
            if (video.parentNode) {
              video.parentNode.removeChild(video)
            }
          } catch (e) {
            console.warn('清理 video 元素时出错:', e)
          }
        }

        const onSeeked = () => {
          try {
            console.log('🎯 视频定位完成，开始截取帧...')
            console.log('📐 视频尺寸:', video.videoWidth, 'x', video.videoHeight)
            console.log('⏰ 当前时间:', video.currentTime)
            
            const canvas = document.createElement('canvas')
            const width = Math.min(800, video.videoWidth || 800)
            const height = Math.floor((video.videoHeight || 450) * (width / (video.videoWidth || 800)))
            canvas.width = width
            canvas.height = height
            console.log('🖼️ Canvas 尺寸:', width, 'x', height)
            
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              cleanup()
              resolve(null)
              return
            }
            
            ctx.drawImage(video, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            console.log('✅ 缩略图生成成功，dataURL 长度:', dataUrl.length)
            
            // 保存为本地文件
            const saveThumbnailFile = async () => {
              try {
                // 生成新的缩略图文件名
                const filename = await generateThumbnailFilename(videoName, filePath)
                
                // 删除旧的缩略图文件
                if (existingThumbnail && existingThumbnail.trim()) {
                  await deleteOldThumbnail(existingThumbnail)
                }
               
                const savedPath = await saveManager.saveThumbnail('videos', filename, dataUrl)
                
                if (savedPath) {
                  console.log('✅ 缩略图保存为本地文件:', savedPath)
                  cleanup()
                  resolve(savedPath)
                } else {
                  console.warn('⚠️ 缩略图保存失败，返回 dataURL')
                  cleanup()
                  resolve(dataUrl)
                }
              } catch (saveError) {
                console.error('❌ 保存缩略图文件失败:', saveError)
                console.warn('⚠️ 降级返回 dataURL')
                cleanup()
                resolve(dataUrl)
              }
            }
            
            // 异步保存文件
            saveThumbnailFile()
            
          } catch (err) {
            console.error('❌ 截取帧时出错:', err)
            cleanup()
            resolve(null)
          }
        }

        const onLoadedMeta = () => {
          try {
            console.log('📊 视频元数据加载完成')
            console.log('⏱️ 视频时长:', video.duration)
            console.log('📐 视频尺寸:', video.videoWidth, 'x', video.videoHeight)
            
            const duration = Math.max(0, Number(video.duration) || 0)
            // 在 5% - 80% 之间取一帧，避免黑屏开头或片尾
            const start = duration * 0.05
            const end = duration * 0.8
            const target = isFinite(duration) && duration > 0 ? (start + Math.random() * (end - start)) : 1.0
            
            console.log('🎯 目标时间:', target, '(范围:', start, '-', end, ')')
            video.currentTime = target
          } catch (err) {
            console.error('❌ 设置视频时间时出错:', err)
            cleanup()
            resolve(null)
          }
        }

        video.addEventListener('error', onError)
        video.addEventListener('loadedmetadata', onLoadedMeta, { once: true })
        video.addEventListener('seeked', onSeeked, { once: true })

        // 将元素附加到文档，确保某些浏览器能正确触发事件
        document.body.appendChild(video)
        console.log('📎 Video 元素已添加到文档')
      } catch (e) {
        console.error('❌ generateThumbnail 外层错误:', e)
        resolve(null)
      }
    })
  }

  /**
   * 为文件夹视频生成缩略图（专用方法）
   */
  const generateThumbnailForFolderVideo = async (
    filePath: string,
    thumbnailFilename: string,
    buildFileUrlFn?: (path: string) => string
  ): Promise<string | null> => {
    return new Promise(async (resolve) => {
      try {
        if (!filePath) {
          console.warn('⚠️ generateThumbnailForFolderVideo: 文件路径为空')
          return resolve(null)
        }
        
        console.log('🔍 generateThumbnailForFolderVideo 开始处理:', filePath)
        
        // 检查文件扩展名
        const extension = filePath.toLowerCase().split('.').pop()
        const supportedFormats = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'mkv', 'flv', 'wmv']
        if (!supportedFormats.includes(extension || '')) {
          console.warn('⚠️ 不支持的视频格式:', extension)
          return resolve(null)
        }
        
        let src = filePath
        const buildUrl = buildFileUrlFn || buildFileUrl
        
        // 优先通过 getFileUrl 生成可加载的 file:// 或安全映射 URL
        if (window.electronAPI && window.electronAPI.getFileUrl) {
          try {
            console.log('📡 调用 getFileUrl API...')
            const result = await window.electronAPI.getFileUrl(filePath)
            console.log('📡 getFileUrl 返回:', result)
            if (result && result.success && result.url && result.url.startsWith('file://')) {
              src = result.url
              console.log('✅ 使用 getFileUrl 生成的 URL:', src)
            } else {
              console.warn('⚠️ getFileUrl 返回格式不正确:', result)
              src = buildUrl(filePath)
            }
          } catch (e) {
            console.warn('⚠️ getFileUrl 调用失败:', e)
            src = buildUrl(filePath)
          }
        } else {
          console.warn('⚠️ getFileUrl API 不可用，使用降级方案')
          src = buildUrl(filePath)
        }

        console.log('🎬 创建 video 元素，src:', src)
        const video = document.createElement('video')
        video.style.position = 'fixed'
        video.style.left = '-9999px'
        video.style.top = '-9999px'
        video.muted = true
        video.preload = 'metadata'
        video.crossOrigin = 'anonymous'
        video.src = src

        // 设置超时
        const timeout = setTimeout(() => {
          console.warn('⏰ 视频加载超时')
          cleanup()
          resolve(null)
        }, 10000)

        const onError = (e: Event) => {
          console.error('❌ 视频加载错误:', e)
          cleanup()
          resolve(null)
        }

        const cleanup = () => {
          clearTimeout(timeout)
          console.log('🧹 清理 video 元素和事件监听器')
          video.removeEventListener('error', onError)
          video.removeEventListener('loadedmetadata', onLoadedMeta)
          video.removeEventListener('seeked', onSeeked)
          try { 
            video.pause() 
            if (video.parentNode) {
              video.parentNode.removeChild(video)
            }
          } catch (e) {
            console.warn('清理 video 元素时出错:', e)
          }
        }

        const onSeeked = () => {
          try {
            console.log('🎯 视频定位完成，开始截取帧...')
            
            const canvas = document.createElement('canvas')
            const width = Math.min(800, video.videoWidth || 800)
            const height = Math.floor((video.videoHeight || 450) * (width / (video.videoWidth || 800)))
            canvas.width = width
            canvas.height = height
            console.log('✅ 缩略图生成成功，dataURL 长度:', canvas.width * canvas.height)
            
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              cleanup()
              resolve(null)
              return
            }
            
            ctx.drawImage(video, 0, 0, width, height)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            console.log('✅ 缩略图生成成功，dataURL 长度:', dataUrl.length)
            
            // 保存为本地文件
            const saveThumbnailFile = async () => {
              try {
                const savedPath = await saveManager.saveThumbnail('videos', thumbnailFilename, dataUrl)
                
                if (savedPath) {
                  console.log('✅ 缩略图保存为本地文件:', savedPath)
                  cleanup()
                  resolve(savedPath)
                } else {
                  console.warn('⚠️ 缩略图保存失败')
                  cleanup()
                  resolve(null)
                }
              } catch (saveError) {
                console.error('❌ 保存缩略图文件失败:', saveError)
                cleanup()
                resolve(null)
              }
            }
            
            saveThumbnailFile()
            
          } catch (err) {
            console.error('❌ 截取帧时出错:', err)
            cleanup()
            resolve(null)
          }
        }

        const onLoadedMeta = () => {
          try {
            console.log('📊 视频元数据加载完成')
            
            const duration = Math.max(0, Number(video.duration) || 0)
            const start = duration * 0.05
            const end = duration * 0.8
            const target = isFinite(duration) && duration > 0 ? (start + Math.random() * (end - start)) : 1.0
            
            console.log('🎯 目标时间:', target)
            video.currentTime = target
          } catch (err) {
            console.error('❌ 设置视频时间时出错:', err)
            cleanup()
            resolve(null)
          }
        }

        video.addEventListener('error', onError)
        video.addEventListener('loadedmetadata', onLoadedMeta, { once: true })
        video.addEventListener('seeked', onSeeked, { once: true })

        document.body.appendChild(video)
        console.log('📎 Video 元素已添加到文档')
      } catch (e) {
        console.error('❌ generateThumbnailForFolderVideo 外层错误:', e)
        resolve(null)
      }
    })
  }

  /**
   * 清除缓存
   */
  const clearCache = () => {
    const cache = 'value' in thumbnailUrlCache ? thumbnailUrlCache.value : thumbnailUrlCache
    cache.clear()
  }

  return {
    thumbnailUrlCache,
    buildFileUrl,
    getThumbnailUrl,
    getThumbnailUrlAsync,
    handleThumbnailError,
    handleThumbnailPreviewError,
    extractNameFromPath,
    generateThumbnailFilename,
    getMaxThumbnailNumber,
    getMaxFolderVideoThumbnailNumber,
    deleteOldThumbnail,
    generateThumbnail,
    generateThumbnailForFolderVideo,
    clearCache
  }
}

