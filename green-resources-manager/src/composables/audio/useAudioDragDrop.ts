/**
 * 音频拖拽处理 Composable
 * 处理音频文件的拖拽添加逻辑，支持批量添加
 */
import { ref, type Ref } from 'vue'
import notify from '../../utils/NotificationService'
import type { Audio, PathUpdateInfo } from '../../types/audio'

export interface AudioDragDropOptions {
  /**
   * 音频列表（响应式）
   */
  audios: Ref<Audio[]> | Audio[]
  
  /**
   * 添加音频的回调函数
   */
  onAddAudio: (audioData: Partial<Audio>) => Promise<Audio | null>
  
  /**
   * 显示路径更新对话框的回调函数
   */
  onShowPathUpdateDialog: (info: PathUpdateInfo) => void
  
  /**
   * 重新加载数据的回调函数
   */
  onReloadData?: () => Promise<void>
  
  /**
   * 从文件路径提取音频名称的函数
   */
  extractAudioNameFromPath?: (filePath: string) => string
}

/**
 * 处理结果接口
 */
interface ProcessResult {
  success: boolean
  fileName?: string
  filePath?: string
  error?: string
  message?: string
  audio?: Audio
  existingAudioId?: string
}

/**
 * 音频拖拽处理 composable
 */
export function useAudioDragDrop(options: AudioDragDropOptions) {
  const {
    audios,
    onAddAudio,
    onShowPathUpdateDialog,
    onReloadData,
    extractAudioNameFromPath
  } = options

  const isDragOver = ref(false)

  // 获取当前音频列表
  const getAudios = () => {
    return 'value' in audios ? audios.value : audios
  }

  /**
   * 从文件名提取音频名称（去掉扩展名）
   */
  const extractAudioName = (fileName: string): string => {
    if (extractAudioNameFromPath) {
      return extractAudioNameFromPath(fileName)
    }
    const lastDotIndex = fileName.lastIndexOf('.')
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
  }

  /**
   * 批量处理多个音频文件
   */
  const processMultipleAudioFiles = async (audioFiles: File[]): Promise<ProcessResult[]> => {
    console.log('=== 开始批量处理音频文件 ===')
    console.log('待处理音频文件数量:', audioFiles.length)
    
    const results: ProcessResult[] = []
    const currentAudios = getAudios()
    
    for (let i = 0; i < audioFiles.length; i++) {
      const audioFile = audioFiles[i]
      console.log(`\n--- 处理音频文件 ${i + 1}/${audioFiles.length} ---`)
      console.log('音频文件信息:', {
        name: audioFile.name,
        path: (audioFile as any).path,
        size: audioFile.size
      })
      
      try {
        const filePath = (audioFile as any).path || audioFile.name
        
        // 检查是否已经存在相同的文件路径
        const existingAudioByPath = currentAudios.find(audio => audio.filePath === filePath)
        if (existingAudioByPath) {
          console.log(`音频文件已存在: ${audioFile.name}`)
          results.push({
            success: false,
            fileName: audioFile.name,
            error: `音频文件 "${audioFile.name}" 已经存在`,
            filePath: filePath,
            existingAudioId: existingAudioByPath.id
          })
          continue
        }
        
        // 检查是否存在同名但路径不同的丢失文件
        const existingAudioByName = currentAudios.find(audio => {
          const audioFileName = audio.filePath?.split(/[\\/]/).pop()?.toLowerCase() || ''
          const newFileName = audioFile.name.toLowerCase()
          const isSameName = audioFileName === newFileName
          const isFileMissing = audio.fileExists === false
          
          console.log(`检查音频: ${audio.name}`)
          console.log(`  文件名: ${audioFileName} vs ${newFileName}`)
          console.log(`  是否同名: ${isSameName}`)
          console.log(`  文件存在: ${audio.fileExists}`)
          console.log(`  是否丢失: ${isFileMissing}`)
          console.log(`  匹配条件: ${isSameName && isFileMissing}`)
          
          return isSameName && isFileMissing
        })
        
        if (existingAudioByName) {
          console.log(`发现同名丢失文件: ${audioFile.name}`)
          console.log(`现有音频路径: ${existingAudioByName.filePath}`)
          console.log(`新文件路径: ${filePath}`)
          // 显示路径更新确认对话框
          onShowPathUpdateDialog({
            existingAudio: existingAudioByName,
            newPath: filePath,
            newFileName: audioFile.name
          })
          // 暂停处理，等待用户确认
          return results
        }
        
        // 创建新的音频对象
        const audioData: Partial<Audio> = {
          name: extractAudioName(audioFile.name),
          artist: '未知艺术家',
          filePath: filePath,
          thumbnailPath: '',
          actors: [],
          tags: [],
          notes: '',
          duration: 0,
          addedDate: new Date().toISOString()
        }
        
        console.log('创建音频对象:', audioData)
        
        // 使用回调添加音频
        const addedAudio = await onAddAudio(audioData)
        
        if (addedAudio) {
          results.push({
            success: true,
            fileName: audioFile.name,
            audio: addedAudio
          })
        } else {
          results.push({
            success: false,
            fileName: audioFile.name,
            error: '添加音频失败'
          })
        }
        console.log('音频文件处理成功:', audioFile.name)
        
      } catch (error: any) {
        console.error(`处理音频文件 "${audioFile.name}" 失败:`, error)
        console.error('错误堆栈:', error.stack)
        
        // 根据错误类型提供更具体的错误信息
        let errorMessage = error.message
        if (error.message.includes('ENOENT')) {
          errorMessage = '音频文件不存在或无法访问'
        } else if (error.message.includes('EACCES')) {
          errorMessage = '没有访问权限'
        } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
          errorMessage = '打开文件过多，请稍后重试'
        } else if (error.message.includes('timeout')) {
          errorMessage = '操作超时'
        } else if (error.message.includes('Invalid path')) {
          errorMessage = '无效的音频文件路径'
        }
        
        results.push({
          success: false,
          fileName: audioFile.name,
          error: errorMessage,
          filePath: (audioFile as any).path,
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
        notify.toast('error', '拖拽失败', '请拖拽音频文件到此处')
        return
      }
      
      // 过滤出支持的音频文件
      const supportedExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.wma']
      const audioFiles = files.filter((file: File) => {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
        return supportedExtensions.includes(ext)
      })
      
      if (audioFiles.length === 0) {
        notify.toast('error', '文件类型不支持', '请拖拽音频文件（.mp3、.wav、.flac等）')
        return
      }
      
      console.log('检测到音频文件数量:', audioFiles.length)
      
      // 处理音频文件
      const results = await processMultipleAudioFiles(audioFiles)
      
      // 统计结果
      const addedCount = results.filter(r => r.success).length
      const failedCount = results.filter(r => !r.success).length
      const failedReasons = results
        .filter(r => !r.success)
        .map(r => `"${r.fileName}": ${r.error || '未知错误'}`)
      
      // 重新加载数据
      if (onReloadData) {
        await onReloadData()
      }
      
      // 显示结果通知
      if (addedCount > 0 && failedCount === 0) {
        notify.toast('success', '添加成功', `成功添加 ${addedCount} 个音频`)
      } else if (addedCount > 0 && failedCount > 0) {
        notify.toast('warning', '部分成功', `成功添加 ${addedCount} 个音频，${failedCount} 个文件添加失败：${failedReasons.join('；')}`)
      } else if (addedCount === 0 && failedCount > 0) {
        notify.toast('error', '添加失败', `${failedCount} 个文件添加失败：${failedReasons.join('；')}`)
      }
      
      console.log(`拖拽处理完成: 成功 ${addedCount} 个，失败 ${failedCount} 个`)
      
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
        '处理失败', 
        `处理拖拽文件失败: ${errorMessage}`
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
    processMultipleAudioFiles,
    extractAudioName
  }
}

