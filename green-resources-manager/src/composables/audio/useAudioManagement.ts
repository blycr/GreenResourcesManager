/**
 * 音频管理 Composable
 * 负责音频的 CRUD 操作和数据持久化
 */
import { ref, type Ref } from 'vue'
import audioManager from '../../utils/AudioManager.js'
import notify from '../../utils/NotificationService'
import type { Audio } from '../../types/audio'

export function useAudioManagement() {
  const audios = ref<Audio[]>([])
  const isLoading = ref(false)

  /**
   * 加载所有音频
   */
  const loadAudios = async (): Promise<void> => {
    try {
      isLoading.value = true
      audios.value = await audioManager.loadAudios()
      console.log('音频数据加载完成:', audios.value.length, '个音频')
    } catch (error: any) {
      console.error('加载音频数据失败:', error)
      notify.toast('error', '加载失败', '无法加载音频列表')
      throw error
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存所有音频
   */
  const saveAudios = async (): Promise<void> => {
    try {
      await audioManager.saveAudios()
    } catch (error) {
      console.error('保存音频失败:', error)
      throw error
    }
  }

  /**
   * 添加音频
   */
  const addAudio = async (audioData: Partial<Audio>): Promise<Audio | null> => {
    try {
      const newAudio = await audioManager.addAudio(audioData)
      if (newAudio) {
        await loadAudios()
        return newAudio
      }
      return null
    } catch (error) {
      console.error('添加音频失败:', error)
      throw error
    }
  }

  /**
   * 更新音频
   */
  const updateAudio = async (id: string, audioData: Partial<Audio>): Promise<void> => {
    try {
      await audioManager.updateAudio(id, audioData)
      await loadAudios()
    } catch (error) {
      console.error('更新音频失败:', error)
      throw error
    }
  }

  /**
   * 删除音频
   */
  const deleteAudio = async (id: string): Promise<void> => {
    try {
      await audioManager.deleteAudio(id)
      await loadAudios()
    } catch (error) {
      console.error('删除音频失败:', error)
      throw error
    }
  }

  /**
   * 增加播放次数
   */
  const incrementPlayCount = async (id: string): Promise<Audio | null> => {
    try {
      const updatedAudio = await audioManager.incrementPlayCount(id)
      if (updatedAudio) {
        await loadAudios()
        return updatedAudio
      }
      return null
    } catch (error) {
      console.error('增加播放次数失败:', error)
      throw error
    }
  }

  /**
   * 检查音频文件存在性
   */
  const checkFileExistence = async (): Promise<void> => {
    console.log('🔍 开始检测音频文件存在性...')
    
    if (!window.electronAPI || !window.electronAPI.checkFileExists) {
      console.log('⚠️ Electron API 不可用，跳过文件存在性检测')
      // 如果API不可用，默认设置为存在
      audios.value.forEach(audio => {
        audio.fileExists = true
      })
      return
    }
    
    let checkedCount = 0
    let missingCount = 0
    
    for (const audio of audios.value) {
      if (!audio.filePath) {
        audio.fileExists = false
        missingCount++
        continue
      }
      
      try {
        const result = await window.electronAPI.checkFileExists(audio.filePath)
        audio.fileExists = result.exists
        console.log(`🔍 检测结果: ${audio.name} - fileExists=${audio.fileExists}`)
        
        if (!result.exists) {
          missingCount++
          console.log(`❌ 音频文件不存在: ${audio.name} - ${audio.filePath}`)
        } else {
          console.log(`✅ 音频文件存在: ${audio.name}`)
        }
      } catch (error) {
        console.error(`❌ 检测音频文件存在性失败: ${audio.name}`, error)
        audio.fileExists = false
        missingCount++
      }
      
      checkedCount++
    }
    
    console.log(`📊 文件存在性检测完成: 检查了 ${checkedCount} 个音频，${missingCount} 个文件不存在`)
  }

  /**
   * 获取音频管理器实例
   */
  const getAudioManager = () => {
    return audioManager
  }

  return {
    audios,
    isLoading,
    loadAudios,
    saveAudios,
    addAudio,
    updateAudio,
    deleteAudio,
    incrementPlayCount,
    checkFileExistence,
    getAudioManager
  }
}

