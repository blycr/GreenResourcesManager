/**
 * 视频播放处理 Composable
 * 负责视频播放相关的逻辑
 */
import notify from '../../utils/NotificationService'
import saveManager from '../../utils/SaveManager'
import type { Video } from '../../types/video'
import type { VideoDurationOptions } from './useVideoDuration'
import { useVideoDuration } from './useVideoDuration'

export interface VideoPlaybackOptions extends Partial<VideoDurationOptions> {
  /**
   * 播放后更新观看次数的回调函数
   */
  onIncrementWatchCount?: (videoId: string) => Promise<void>
  
  /**
   * 重新加载视频列表的回调函数
   */
  onReloadVideos?: () => Promise<void>
}

/**
 * 视频播放处理 composable
 */
export function useVideoPlayback(options: VideoPlaybackOptions = {}) {
  const { onIncrementWatchCount, onReloadVideos } = options
  const { buildFileUrl } = useVideoDuration(options)

  /**
   * 检查视频文件是否可访问
   */
  const checkVideoFileAccess = async (filePath: string): Promise<{ accessible: boolean; url?: string; error?: string }> => {
    try {
      if (window.electronAPI && window.electronAPI.getFileUrl) {
        const result = await window.electronAPI.getFileUrl(filePath)
        if (result.success) {
          console.log('✅ 视频文件可访问:', result.url)
          return { accessible: true, url: result.url }
        } else {
          console.warn('⚠️ 视频文件不可访问:', result.error)
          return { accessible: false, error: result.error }
        }
      }
      return { accessible: true, url: buildFileUrl(filePath) }
    } catch (error: any) {
      console.error('检查视频文件访问失败:', error)
      return { accessible: false, error: error.message }
    }
  }

  /**
   * 在本应用新窗口中播放视频
   */
  const playVideoInternal = async (video: Video | { name: string; filePath: string }): Promise<void> => {
    try {
      console.log('=== 开始内部播放视频 ===')
      console.log('视频名称:', video.name)
      console.log('视频路径:', video.filePath)
      console.log('当前环境:', typeof window.electronAPI !== 'undefined' ? 'Electron' : '浏览器')
      
      if (!video.filePath) {
        notify.toast('error', '播放失败', '视频文件路径不存在')
        return
      }

      // 首先检查视频文件是否可访问
      const accessCheck = await checkVideoFileAccess(video.filePath)
      if (!accessCheck.accessible) {
        console.error('❌ 视频文件不可访问:', accessCheck.error)
        notify.toast('error', '播放失败', `视频文件不可访问: ${accessCheck.error}`)
        return
      }
      
      if (window.electronAPI && window.electronAPI.openVideoWindow) {
        console.log('✅ Electron API 可用，调用 openVideoWindow')
        
        const result = await window.electronAPI.openVideoWindow(video.filePath, {
          title: video.name,
          width: 1200,
          height: 800,
          resizable: true,
          minimizable: true,
          maximizable: true
        })
        
        console.log('openVideoWindow 返回结果:', result)
        
        if (result.success) {
          console.log('✅ 视频窗口已成功打开')
          // 播放成功时不显示通知，只在控制台记录
        } else {
          console.error('❌ 打开视频窗口失败:', result.error)
          
          // 检查是否是路径编码问题
          if (result.error && (result.error.includes('ERR_FILE_NOT_FOUND') || result.error.includes('路径'))) {
            console.log('🔄 检测到路径问题')
            notify.toast('error', '播放失败', `视频文件路径问题: ${result.error}`)
          } else {
            notify.toast('error', '播放失败', `打开视频窗口失败: ${result.error}`)
          }
        }
      } else {
        // 降级处理：使用外部播放器
        console.warn('❌ Electron API 不可用，降级到外部播放器')
        console.warn('electronAPI 可用性:', !!window.electronAPI)
        console.warn('openVideoWindow 可用性:', !!window.electronAPI?.openVideoWindow)
        notify.toast('error', '播放失败', '内部播放器不可用')
      }
    } catch (error: any) {
      console.error('❌ 内部播放视频失败:', error)
      
      // 检查是否是特定类型的错误
      let errorMessage = error.message
      if (error.message.includes('ERR_FILE_NOT_FOUND')) {
        errorMessage = '视频文件未找到，可能是路径包含特殊字符或文件不存在'
      } else if (error.message.includes('ERR_ACCESS_DENIED')) {
        errorMessage = '无法访问视频文件，请检查文件权限'
      }
      
      notify.toast('error', '播放失败', `内部播放视频失败: ${errorMessage}`)
    }
  }

  /**
   * 使用外部默认播放器播放视频
   */
  const playVideoExternal = async (video: Video | { name: string; filePath: string }): Promise<void> => {
    try {
      if (!video.filePath) {
        notify.toast('error', '播放失败', '视频文件路径不存在')
        return
      }

      if (window.electronAPI && window.electronAPI.openExternal) {
        await window.electronAPI.openExternal(video.filePath)
        // 播放成功时不显示通知，只在控制台记录
        console.log('✅ 已使用外部播放器播放视频:', video.name)
      } else {
        // 降级处理：在浏览器中显示路径
        notify.toast('error', '播放失败', '在浏览器环境中无法直接打开视频文件')
      }
    } catch (error: any) {
      console.error('外部播放视频失败:', error)
      notify.toast('error', '播放失败', `外部播放视频失败: ${error.message}`)
    }
  }

  /**
   * 播放视频（根据设置选择内部或外部播放器）
   */
  const playVideo = async (video: Video): Promise<void> => {
    if (!video.filePath) {
      notify.toast('error', '播放失败', '视频文件路径不存在')
      return
    }

    // 检查视频文件是否存在
    if (video.fileExists === false) {
      notify.toast('error', '播放失败', `视频文件不存在: ${video.name}`)
      return
    }

    try {
      // 获取当前设置
      const settings = await saveManager.loadSettings()
      console.log('当前视频播放设置:', settings)
      console.log('videoPlayMode:', settings.videoPlayMode)
      
      if (settings.videoPlayMode === 'internal') {
        console.log('使用内部播放器播放视频')
        // 在本应用新窗口中播放
        await playVideoInternal(video)
      } else {
        console.log('使用外部播放器播放视频')
        // 使用外部默认播放器
        await playVideoExternal(video)
      }
      
      // 更新观看次数
      if (onIncrementWatchCount) {
        await onIncrementWatchCount(video.id)
      }
      
      // 重新加载视频列表
      if (onReloadVideos) {
        await onReloadVideos()
      }
    } catch (error: any) {
      console.error('播放视频失败:', error)
      notify.toast('error', '播放失败', `播放视频失败: ${error.message}`)
    }
  }

  return {
    playVideo,
    playVideoInternal,
    playVideoExternal,
    checkVideoFileAccess,
    buildFileUrl
  }
}

