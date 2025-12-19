<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>添加游戏</h3>
        <button class="modal-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField 
          label="游戏名称 (可选)" 
          type="text" 
          v-model="formData.name" 
          placeholder="留空将自动从文件名提取" 
        />
        <FormField 
          label="开发商 (可选)" 
          type="text" 
          v-model="formData.developer" 
          placeholder="输入开发商名称" 
        />
        <FormField 
          label="发行商 (可选)" 
          type="text" 
          v-model="formData.publisher" 
          placeholder="输入发行商名称" 
        />
        <FormField 
          label="游戏简介 (可选)" 
          type="textarea" 
          v-model="formData.description" 
          placeholder="输入游戏简介或描述..."
          :rows="3" 
        />
        <FormField 
          label="游戏标签 (可选)" 
          type="tags" 
          v-model="formData.tags" 
          v-model:tagInput="tagInput"
          @add-tag="handleAddTag" 
          @remove-tag="handleRemoveTag" 
        />
        <FormField 
          label="游戏可执行文件" 
          type="file" 
          v-model="formData.executablePath" 
          placeholder="选择游戏可执行文件"
          @browse="handleBrowseExecutable" 
        />
        <!-- 封面图片选择区域 -->
        <div class="form-group">
          <label class="form-label">游戏封面 (可选)</label>
          <div class="cover-selection-container">
            <div class="cover-preview" v-if="formData.imagePath">
              <img :src="resolveImage(formData.imagePath)" :alt="'封面预览'" @error="handleImageError">
              <div class="cover-preview-info">
                <span class="cover-filename">{{ getImageFileName(formData.imagePath) }}</span>
              </div>
            </div>
            <div class="cover-actions">
              <button 
                type="button" 
                class="btn-cover-action" 
                @click="handleUseScreenshotAsCover"
                :disabled="!formData.executablePath"
              >
                <span class="btn-icon">📸</span>
                使用截图作为封面
              </button>
              <button type="button" class="btn-cover-action" @click="handleBrowseImage">
                <span class="btn-icon">📁</span>
                选择自定义封面
              </button>
              <button 
                type="button" 
                class="btn-cover-action btn-clear" 
                @click="handleClearCover"
                v-if="formData.imagePath"
              >
                <span class="btn-icon">🗑️</span>
                清除封面
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose">取消</button>
        <button class="btn-confirm" @click="handleConfirm" :disabled="!canAdd">添加游戏</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import FormField from '../FormField.vue'
import saveManager from '../../utils/SaveManager.ts'
import notify from '../../utils/NotificationService.ts'

export default {
  name: 'AddGameDialog',
  components: {
    FormField
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'confirm'],
  data() {
    return {
      formData: {
        name: '',
        developer: '',
        publisher: '',
        description: '',
        tags: [],
        executablePath: '',
        imagePath: ''
      },
      tagInput: ''
    }
  },
  computed: {
    canAdd() {
      return this.formData.executablePath && this.formData.executablePath.trim()
    }
  },
  watch: {
    visible(newVal) {
      if (newVal) {
        this.resetForm()
      }
    }
  },
  methods: {
    resetForm() {
      this.formData = {
        name: '',
        developer: '',
        publisher: '',
        description: '',
        tags: [],
        executablePath: '',
        imagePath: ''
      }
      this.tagInput = ''
    },
    handleClose() {
      this.$emit('close')
    },
    handleAddTag() {
      const tag = this.tagInput.trim()
      if (tag && !this.formData.tags.includes(tag)) {
        this.formData.tags.push(tag)
        this.tagInput = ''
      }
    },
    handleRemoveTag(index) {
      this.formData.tags.splice(index, 1)
    },
    async handleBrowseExecutable() {
      try {
        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.selectExecutableFile) {
          console.log('使用Electron API选择可执行文件')
          const filePath = await window.electronAPI.selectExecutableFile()
          if (filePath) {
            this.formData.executablePath = filePath
            console.log('选择的文件路径:', filePath)

            // 自动提取游戏名称（如果名称字段为空）
            if (!this.formData.name.trim()) {
              this.formData.name = this.extractGameNameFromPath(filePath)
            }
          }
        } else {
          console.log('Electron API不可用，使用HTML5文件选择器')
          this.showFileInput('executable')
        }
      } catch (error) {
        console.error('选择可执行文件失败:', error)
        alert(`选择文件失败: ${error.message}`)
      }
    },
    async handleBrowseImage() {
      try {
        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.selectImageFile) {
          console.log('使用Electron API选择图片文件')
          const filePath = await window.electronAPI.selectImageFile()
          if (filePath) {
            this.formData.imagePath = filePath
            console.log('选择的图片路径:', filePath)
          }
        } else {
          console.log('Electron API不可用，使用HTML5文件选择器')
          this.showFileInput('image')
        }
      } catch (error) {
        console.error('选择图片文件失败:', error)
        alert(`选择文件失败: ${error.message}`)
      }
    },
    showFileInput(type) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = type === 'executable' ? '.exe,.app' : 'image/*'
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (file) {
          if (type === 'executable') {
            this.formData.executablePath = (file as any).path || file.name
            if (!this.formData.name.trim()) {
              this.formData.name = this.extractGameNameFromPath((file as any).path || file.name)
            }
          } else {
            this.formData.imagePath = (file as any).path || file.name
          }
        }
      }
      input.click()
    },
    extractGameNameFromPath(filePath) {
      const fileName = filePath.split(/[\\/]/).pop() || ''
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

      let cleanName = nameWithoutExt
        .replace(/\.exe$/i, '')
        .replace(/\.app$/i, '')
        .replace(/^game[-_\s]*/i, '')
        .replace(/[-_\s]+/g, ' ')
        .trim()

      if (!cleanName) {
        cleanName = nameWithoutExt
      }

      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1)
    },
    async handleUseScreenshotAsCover() {
      try {
        if (!this.formData.name && !this.formData.executablePath) {
          alert('请先输入游戏名称或选择可执行文件')
          return
        }

        let gameName = this.formData.name.trim()
        if (!gameName && this.formData.executablePath) {
          gameName = this.extractGameNameFromPath(this.formData.executablePath)
        }

        if (!gameName) {
          alert('无法确定游戏名称')
          return
        }

        const settings = await saveManager.loadSettings()

        let baseScreenshotsPath = ''
        if (settings.screenshotLocation === 'default') {
          baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
        } else if (settings.screenshotLocation === 'custom') {
          baseScreenshotsPath = settings.screenshotsPath || ''
        } else {
          baseScreenshotsPath = settings.screenshotsPath || `${saveManager.dataDirectory}/Game/Screenshots`
        }

        if (!baseScreenshotsPath || baseScreenshotsPath.trim() === '') {
          baseScreenshotsPath = `${saveManager.dataDirectory}/Game/Screenshots`
        }

        let gameFolderName = 'Screenshots'
        if (gameName && gameName !== 'Screenshot') {
          gameFolderName = gameName.replace(/[<>:"/\\|?*]/g, '_').trim()
          if (!gameFolderName) {
            gameFolderName = 'Screenshots'
          }
        }

        const gameScreenshotPath = `${baseScreenshotsPath}/${gameFolderName}`.replace(/\\/g, '/')

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.ensureDirectory) {
          try {
            const ensureResult = await window.electronAPI.ensureDirectory(gameScreenshotPath)
            if (ensureResult.success) {
              console.log('截图文件夹已确保存在:', gameScreenshotPath)
            }
          } catch (error) {
            console.warn('确保截图文件夹存在时出错:', error)
          }
        }

        if (this.isElectronEnvironment && window.electronAPI) {
          if (window.electronAPI.selectScreenshotImage) {
            const filePath = await window.electronAPI.selectScreenshotImage(gameScreenshotPath)
            if (filePath) {
              this.formData.imagePath = filePath
              notify.native('设置成功', '已选择截图作为封面')
            }
          } else if (window.electronAPI.selectImageFile) {
            const filePath = await window.electronAPI.selectImageFile(gameScreenshotPath)
            if (filePath) {
              this.formData.imagePath = filePath
              notify.native('设置成功', '已选择截图作为封面')
            }
          }
        } else {
          alert('当前环境不支持选择图片功能')
        }
      } catch (error) {
        console.error('选择截图作为封面失败:', error)
        alert(`选择截图失败: ${error.message}`)
      }
    },
    handleClearCover() {
      this.formData.imagePath = ''
    },
    async handleConfirm() {
      if (!this.canAdd) return

      let gameName = this.formData.name.trim()
      if (!gameName) {
        gameName = this.extractGameNameFromPath(this.formData.executablePath)
      }

      let folderSize = 0
      if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.getFolderSize) {
        try {
          const result = await window.electronAPI.getFolderSize(this.formData.executablePath)
          if (result.success) {
            folderSize = result.size
          }
        } catch (error) {
          console.error('获取文件夹大小失败:', error)
        }
      }

      const game = {
        id: Date.now().toString(),
        name: gameName,
        developer: (this.formData.developer || '').trim(),
        publisher: (this.formData.publisher || '').trim(),
        description: (this.formData.description || '').trim(),
        tags: [...this.formData.tags],
        executablePath: this.formData.executablePath.trim(),
        image: this.formData.imagePath.trim(),
        folderSize: folderSize,
        playTime: 0,
        playCount: 0,
        lastPlayed: null,
        firstPlayed: null,
        addedDate: new Date().toISOString(),
        fileExists: true
      }

      this.$emit('confirm', game)
    },
    resolveImage(imagePath) {
      if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) {
        return '/default-game.png'
      }
      if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        return imagePath
      }
      if (typeof imagePath === 'string' && (imagePath.startsWith('data:') || imagePath.startsWith('file:'))) {
        return imagePath
      }
      const normalizedPath = String(imagePath).replace(/\\/g, '/')
      const fileUrl = `file:///${normalizedPath}`
      return fileUrl
    },
    handleImageError(event) {
      event.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgMTIwSDgwVjE2MEgxMjBWMTIwWiIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNODAgMTIwTDEwMCAxMDBMMTIwIDEyMEwxMDAgMTQwTDgwIDEyMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
    },
    getImageFileName(imagePath) {
      if (!imagePath) return ''
      const fileName = imagePath.split(/[\\/]/).pop()
      return fileName || imagePath
    }
  }
}
</script>

<style scoped>
/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  color: var(--text-primary);
  margin: 0;
  transition: color 0.3s ease;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label,
.form-label {
  display: block;
  color: var(--text-primary);
  font-weight: 600;
  margin-bottom: 8px;
  transition: color 0.3s ease;
}

/* 封面选择区域样式 */
.cover-selection-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.cover-preview {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.cover-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.cover-preview-info {
  flex: 1;
}

.cover-filename {
  color: var(--text-secondary);
  font-size: 0.9rem;
  word-break: break-all;
  line-height: 1.4;
}

.cover-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-cover-action {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.3s ease;
  font-size: 0.9rem;
}

.btn-cover-action:hover {
  background: var(--accent-hover);
}

.btn-cover-action.btn-clear {
  background: #ef4444;
}

.btn-cover-action.btn-clear:hover {
  background: #dc2626;
}

.btn-cover-action .btn-icon {
  font-size: 1rem;
}

.btn-cover-action:disabled {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-cover-action:disabled:hover {
  background: var(--bg-secondary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.3s ease;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: 20px;
  }
}
</style>

