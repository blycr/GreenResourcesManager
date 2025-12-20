/**
 * 音频时长处理 Composable
 * 负责获取音频时长信息
 */

export interface AudioDurationOptions {
  /**
   * 超时时间（毫秒），默认 10 秒
   */
  timeout?: number
}

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
 * 音频时长处理 composable
 */
export function useAudioDuration(options: AudioDurationOptions = {}) {
  const { timeout = 10000 } = options

  /**
   * 获取音频时长（秒）
   */
  const getAudioDuration = async (filePath: string): Promise<number> => {
    return new Promise(async (resolve) => {
      try {
        if (!filePath) {
          console.warn('⚠️ getAudioDuration: 文件路径为空')
          return resolve(0)
        }
        
        console.log('🎵 开始获取音频时长:', filePath)
        
        // 创建音频元素
        const audio = document.createElement('audio')
        audio.style.position = 'fixed'
        audio.style.left = '-9999px'
        audio.style.top = '-9999px'
        audio.preload = 'metadata'
        audio.crossOrigin = 'anonymous'
        
        let audioSrc = ''
        
        // 优先尝试使用 readFileAsDataUrl 方法
        if (window.electronAPI && window.electronAPI.readFileAsDataUrl) {
          try {
            console.log('🔄 尝试使用 readFileAsDataUrl 方法...')
            const result = await window.electronAPI.readFileAsDataUrl(filePath)
            if (result) {
              audioSrc = result
              console.log('✅ 使用 readFileAsDataUrl 成功')
              audio.src = audioSrc
            } else {
              throw new Error('readFileAsDataUrl 失败')
            }
          } catch (error) {
            console.warn('⚠️ readFileAsDataUrl 失败，尝试 getFileUrl:', error)
            
            // 降级到 getFileUrl 方法
            if (window.electronAPI && window.electronAPI.getFileUrl) {
              try {
                const urlResult = await window.electronAPI.getFileUrl(filePath)
                if (urlResult && urlResult.success && urlResult.url) {
                  audioSrc = urlResult.url
                  console.log('✅ 使用 getFileUrl 成功:', audioSrc)
                  audio.src = audioSrc
                } else {
                  throw new Error(urlResult?.error || 'getFileUrl 失败')
                }
              } catch (urlError) {
                console.warn('⚠️ getFileUrl 也失败，使用降级处理:', urlError)
                audioSrc = filePath.startsWith('file://') ? filePath : buildFileUrl(filePath)
                console.log('🔗 使用降级 URL:', audioSrc)
                audio.src = audioSrc
              }
            } else {
              audioSrc = filePath.startsWith('file://') ? filePath : buildFileUrl(filePath)
              console.log('🔗 使用降级 URL:', audioSrc)
              audio.src = audioSrc
            }
          }
        } else {
          // 降级处理：直接使用文件路径
          audioSrc = filePath.startsWith('file://') ? filePath : buildFileUrl(filePath)
          console.log('🔗 使用降级 URL:', audioSrc)
          audio.src = audioSrc
        }
        
        // 设置超时，避免无限等待
        const timeoutId = setTimeout(() => {
          if (audio.readyState === 0) {
            console.warn('⏰ 音频加载超时')
            console.warn('⏰ 超时详情:', {
              src: audioSrc,
              networkState: audio.networkState,
              readyState: audio.readyState
            })
            cleanup()
            resolve(0)
          }
        }, timeout)
        
        const cleanup = () => {
          clearTimeout(timeoutId)
          console.log('🧹 清理 audio 元素和事件监听器')
          audio.removeEventListener('error', onError)
          audio.removeEventListener('loadedmetadata', onLoadedMeta)
          try {
            audio.pause()
            if (audio.parentNode) {
              audio.parentNode.removeChild(audio)
            }
          } catch (e) {
            console.warn('清理 audio 元素时出错:', e)
          }
        }
        
        const onError = (event: Event) => {
          console.warn('❌ 音频加载失败，无法获取时长')
          console.warn('❌ 错误详情:', {
            error: event,
            src: audioSrc,
            networkState: audio.networkState,
            readyState: audio.readyState,
            errorCode: (audio as any).error ? (audio as any).error.code : 'unknown'
          })
          cleanup()
          resolve(0)
        }
        
        const onLoadedMeta = () => {
          try {
            console.log('📊 音频元数据加载完成')
            console.log('⏱️ 音频时长:', audio.duration)
            
            const duration = Math.max(0, Number(audio.duration) || 0)
            
            console.log('✅ 音频时长获取成功:', duration, '秒')
            cleanup()
            resolve(duration)
          } catch (err) {
            console.error('❌ 获取音频时长时出错:', err)
            cleanup()
            resolve(0)
          }
        }
        
        audio.addEventListener('error', onError)
        audio.addEventListener('loadedmetadata', onLoadedMeta, { once: true })
        
        // 将元素附加到文档，确保某些浏览器能正确触发事件
        document.body.appendChild(audio)
        console.log('📎 Audio 元素已添加到文档')
        
      } catch (error) {
        console.error('❌ 创建音频元素失败:', error)
        resolve(0)
      }
    })
  }

  return {
    getAudioDuration,
    buildFileUrl
  }
}

