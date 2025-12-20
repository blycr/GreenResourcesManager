/**
 * 视频时长处理 Composable
 * 负责获取视频时长信息
 */
import type { VideoThumbnailOptions } from './useVideoThumbnail'
import { useVideoThumbnail } from './useVideoThumbnail'

export interface VideoDurationOptions extends Partial<VideoThumbnailOptions> {}

/**
 * 视频时长处理 composable
 */
export function useVideoDuration(options: VideoDurationOptions = {}) {
  // 复用缩略图 composable 的 buildFileUrl 方法
  const { buildFileUrl } = useVideoThumbnail(options)

  /**
   * 获取视频时长（分钟）
   */
  const getVideoDuration = async (filePath: string): Promise<number> => {
    return new Promise(async (resolve) => {
      try {
        if (!filePath) {
          console.warn('⚠️ getVideoDuration: 文件路径为空')
          return resolve(0)
        }
        
        console.log('🔍 getVideoDuration 开始处理:', filePath)
        
        let src = filePath
        // 优先通过 getFileUrl 生成可加载的 file:// 或安全映射 URL
        if (window.electronAPI && window.electronAPI.getFileUrl) {
          try {
            console.log('📡 调用 getFileUrl API...')
            const result = await window.electronAPI.getFileUrl(filePath)
            if (result && result.success && result.url && result.url.startsWith('file://')) {
              src = result.url
              console.log('✅ 使用 getFileUrl 生成的 URL:', src)
            } else {
              console.warn('⚠️ getFileUrl 返回格式不正确:', result)
              src = buildFileUrl(filePath)
            }
          } catch (e) {
            console.warn('⚠️ getFileUrl 调用失败:', e)
            src = buildFileUrl(filePath)
          }
        } else {
          console.warn('⚠️ getFileUrl API 不可用，使用降级方案')
          src = buildFileUrl(filePath)
        }

        console.log('🎬 创建 video 元素获取时长，src:', src)
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
          console.warn('⏰ 视频时长获取超时')
          cleanup()
          resolve(0)
        }, 5000) // 5秒超时

        const onError = (e: Event) => {
          console.error('❌ 视频加载错误:', e)
          cleanup()
          resolve(0)
        }

        const cleanup = () => {
          clearTimeout(timeout)
          console.log('🧹 清理 video 元素和事件监听器')
          video.removeEventListener('error', onError)
          video.removeEventListener('loadedmetadata', onLoadedMeta)
          try { 
            video.pause() 
            if (video.parentNode) {
              video.parentNode.removeChild(video)
            }
          } catch (e) {
            console.warn('清理 video 元素时出错:', e)
          }
        }

        const onLoadedMeta = () => {
          try {
            console.log('📊 视频元数据加载完成')
            console.log('⏱️ 视频时长:', video.duration)
            
            const duration = Math.max(0, Number(video.duration) || 0)
            const durationMinutes = duration / 60 // 保持小数精度
            
            console.log('✅ 视频时长获取成功:', durationMinutes, '分钟')
            cleanup()
            resolve(durationMinutes)
          } catch (err) {
            console.error('❌ 获取视频时长时出错:', err)
            cleanup()
            resolve(0)
          }
        }

        video.addEventListener('error', onError)
        video.addEventListener('loadedmetadata', onLoadedMeta, { once: true })

        // 将元素附加到文档，确保某些浏览器能正确触发事件
        document.body.appendChild(video)
        console.log('📎 Video 元素已添加到文档')
      } catch (e) {
        console.error('❌ getVideoDuration 外层错误:', e)
        resolve(0)
      }
    })
  }

  return {
    getVideoDuration,
    buildFileUrl
  }
}

