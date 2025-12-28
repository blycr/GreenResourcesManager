<template>
  <div class="settings-view">
    <div class="settings-layout">
      <!-- 左侧导航栏 -->
      <div class="settings-sidebar">
        <div class="sidebar-header">
          <h3>设置</h3>
        </div>
        <nav class="settings-nav">
          <div 
            v-for="category in settingsCategories" 
            :key="category.id"
            class="nav-item"
            :class="{ 'active': currentCategory === category.id }"
            @click="selectCategory(category.id)"
          >
            <span class="nav-icon">{{ category.icon }}</span>
            <span class="nav-label">{{ category.name }}</span>
          </div>
        </nav>
      </div>

      <!-- 右侧设置内容 -->
      <div class="settings-content">
        <div class="content-header">
          <h2>{{ getCurrentCategoryName() }}</h2>
          <p>{{ getCurrentCategoryDescription() }}</p>
        </div>
        
        <div class="settings-container">
          <!-- 通用设置 -->
          <GeneralSettings 
            v-if="currentCategory === 'general'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
            @theme-changed="onThemeChanged"
            @action="handleGeneralAction"
          />

          <!-- 个性化设置 -->
          <PersonalizationSettings 
            v-if="currentCategory === 'personalization'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 页面管理（自定义页面系统） -->
          <PageManagementSettings
            v-if="currentCategory === 'pageManagement'"
            @pages-updated="handlePagesUpdated"
          />

          <!-- 游戏设置 -->
          <GameSettings 
            v-if="currentCategory === 'games'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
            @action="handleGameAction"
          />

          <!-- 图片设置 -->
          <ImageSettings 
            v-if="currentCategory === 'images'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 视频设置 -->
          <VideoSettings 
            v-if="currentCategory === 'videos'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 音频设置 -->
          <AudioSettings 
            v-if="currentCategory === 'audios'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 小说设置 -->
          <NovelSettings 
            v-if="currentCategory === 'novels'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 网站设置 -->
          <WebsiteSettings 
            v-if="currentCategory === 'websites'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 更新设置 -->
          <UpdateSettings 
            v-if="currentCategory === 'updates'"
            :settings="settings"
            :current-version="currentVersion"
            @update:settings="handleSettingUpdate"
          />

          <!-- 解压/压缩设置 -->
          <ArchiveSettings 
            v-if="currentCategory === 'archive'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />

          <!-- 桌宠设置 -->
          <PetSettings 
            v-if="currentCategory === 'pet'"
            :settings="settings"
            @update:settings="handleSettingUpdate"
          />
        </div>
        
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../utils/SaveManager.ts'
import notify from '../utils/NotificationService.ts'
import GeneralSettings from '../components/settings/GeneralSettings.vue'
import GameSettings from '../components/settings/GameSettings.vue'
import ImageSettings from '../components/settings/ImageSettings.vue'
import VideoSettings from '../components/settings/VideoSettings.vue'
import AudioSettings from '../components/settings/AudioSettings.vue'
import NovelSettings from '../components/settings/NovelSettings.vue'
import WebsiteSettings from '../components/settings/WebsiteSettings.vue'
import UpdateSettings from '../components/settings/UpdateSettings.vue'
import ArchiveSettings from '../components/settings/ArchiveSettings.vue'
import PetSettings from '../components/settings/PetSettings.vue'
import PersonalizationSettings from '../components/settings/PersonalizationSettings.vue'
import PageManagementSettings from '../components/settings/PageManagementSettings.vue'

export default {
  name: 'SettingsView',
  components: {
    GeneralSettings,
    GameSettings,
    ImageSettings,
    VideoSettings,
    AudioSettings,
    NovelSettings,
    WebsiteSettings,
    UpdateSettings,
    ArchiveSettings,
    PetSettings,
    PersonalizationSettings,
    PageManagementSettings
  },
  data() {
    return {
      currentCategory: 'general',
      settingsCategories: [
        { id: 'general', name: '通用', icon: '⚙️', description: '应用的基本设置和外观配置' },
        { id: 'personalization', name: '个性化', icon: '🎨', description: '个性化外观和主题设置' },
        { id: 'pageManagement', name: '页面管理', icon: '🧩', description: '添加/编辑/排序/隐藏自定义页面' },
        { id: 'games', name: '游戏', icon: '🎮', description: '游戏相关的设置选项' },
        { id: 'images', name: '图片', icon: '🖼️', description: '图片管理和显示设置' },
        { id: 'videos', name: '视频', icon: '🎬', description: '视频播放和管理设置' },
        { id: 'audios', name: '音频', icon: '🎵', description: '音频播放和管理设置' },
        { id: 'novels', name: '小说', icon: '📚', description: '小说阅读和管理设置' },
        { id: 'websites', name: '网站', icon: '🌐', description: '网站收藏和管理设置' },
        { id: 'archive', name: '解压/压缩', icon: '📦', description: '压缩包解压和压缩相关设置' },
        { id: 'pet', name: '桌宠', icon: '🐾', description: '桌宠显示和管理设置' },
        { id: 'updates', name: '更新', icon: '🔄', description: '应用更新和版本管理' }
      ],
      settings: {
        theme: 'auto',
        autoStart: false,
        minimizeToTray: true,
        disguiseMode: false,
        safetyKeyEnabled: false,
        safetyKeyUrl: 'https://www.bilibili.com/video/BV1jR4y1M78W/?p=17&share_source=copy_web&vd_source=7de8c277f16e8e03b48a5328dddfe2ce&t=466',
        // 个性化设置
        customAppTitle: '',
        customAppSubtitle: '',
        // 背景图片设置
        backgroundImagePath: '',
        // 存档设置
        saveDataLocation: 'default',
        saveDataPath: '',
        autoBackupEnabled: false, // 是否开启自动备份
        autoBackupInterval: 5, // 自动备份时间间隔（分钟）
        maxBackupCount: 5, // 保留的备份数量
        // 截图设置
        screenshotKey: 'Ctrl+F12',
        screenshotLocation: 'default',
        screenshotsPath: '',
        screenshotFormat: 'png',
        screenshotQuality: 90,
        screenshotNotification: true,
        autoOpenScreenshotFolder: false,
        smartWindowDetection: true,
        // 视频播放设置
        videoPlayMode: 'external',
        // 小说设置
        novelDefaultOpenMode: 'internal',
        novelFontSize: 16,
        novelLineHeight: 1.6,
        novelFontFamily: 'Microsoft YaHei, sans-serif',
        novelBackgroundColor: '#ffffff',
        novelTextColor: '#333333',
        novelWordsPerPage: 1000,
        novelShowProgress: true,
        // 分页设置
        image: {
          listPageSize: 20,
          jpegQuality: 80,
          thumbnailSize: 200,
          cacheSize: 50,
          enableThumbnails: true,
          preloadCount: 3,
          hardwareAcceleration: true,
          renderQuality: 'high',
          detailPageSize: 50
        },
        video: {
          listPageSize: 20
        },
        audio: {
          listPageSize: 20
        },
        game: {
          listPageSize: 20
        },
        novel: {
          listPageSize: 20
        },
        // 更新设置
        autoCheckUpdates: true
      },
      // 自动保存相关
      autoSaveTimer: null,
      isAutoSaving: false,
      lastSaveTime: null,
      // 初始化标志，避免在初始化时触发watcher
      isInitializing: true,
      // 更新相关
      currentVersion: '0.4.0',
      isCheckingUpdates: false,
      updateStatus: null
    }
  },
  watch: {
    // 监听所有设置变化，实现自动保存
    settings: {
      handler(newSettings, oldSettings) {
        // 避免初始化时触发自动保存
        if (oldSettings && this.lastSaveTime) {
          this.scheduleAutoSave()
        }
      },
      deep: true
    },
    
    // 监听特定设置项的变化，立即应用某些设置
    'settings.theme'(newTheme) {
      this.applyTheme(newTheme)
    },
    
    // 以下设置项的变化处理已移至对应的子组件：
    // 'settings.autoStart' - 已移至 GeneralSettings 组件
    // 'settings.minimizeToTray' - 已移至 GeneralSettings 组件
    // 'settings.screenshotKey' - 已移至 GameSettings 组件
    // 'settings.screenshotLocation' - 已移至 GameSettings 组件
    // 'settings.saveDataLocation' - 已移至 GeneralSettings 组件
    // 'settings.safetyKeyUrl' - 已移至 GeneralSettings 组件
  },
  methods: {
    selectCategory(categoryId) {
      this.currentCategory = categoryId
    },
    
    getCurrentCategoryName() {
      const category = this.settingsCategories.find(cat => cat.id === this.currentCategory)
      return category ? category.name : '设置'
    },
    
    getCurrentCategoryDescription() {
      const category = this.settingsCategories.find(cat => cat.id === this.currentCategory)
      return category ? category.description : ''
    },
    
    // 处理设置更新事件（来自子组件）
    handleSettingUpdate({ key, value }: { key: string; value: any }) {
      // 处理嵌套键（如 'game.listPageSize'）
      const keys = key.split('.')
      if (keys.length === 1) {
        // 简单键
        this.settings[key] = value
      } else if (keys.length === 2) {
        // 嵌套键（如 game.listPageSize）
        if (!this.settings[keys[0]]) {
          this.settings[keys[0]] = {}
        }
        this.settings[keys[0]][keys[1]] = value
      }
    },
    
    // 处理主题变化事件
    onThemeChanged(actualTheme: string) {
      this.$emit('theme-changed', actualTheme)
    },

    // 页面管理更新（例如新增/隐藏/排序）
    handlePagesUpdated() {
      // 通知 App.vue 重新加载 pages/navItems（避免 window.location.reload 导致离开设置页面）
      window.dispatchEvent(new CustomEvent('custom-pages-updated'))
      notify.toast('success', '页面已更新', '页面配置已保存，导航将自动刷新')
    },
    
    // 处理通用设置的特殊操作
    async handleGeneralAction(action: { type: string }) {
      if (action.type === 'reset-settings') {
        await this.resetSettings()
      }
    },
    
    // 处理游戏设置的特殊操作
    handleGameAction(action: { type: string }) {
      if (action.type === 'save-settings') {
        // 触发自动保存
        this.scheduleAutoSave()
      }
    },
    
    // 自动保存相关方法
    scheduleAutoSave() {
      // 清除之前的定时器
      if (this.autoSaveTimer) {
        clearTimeout(this.autoSaveTimer)
      }
      
      // 设置新的定时器，1秒后自动保存
      this.autoSaveTimer = setTimeout(() => {
        this.autoSave()
      }, 1000)
    },
    
    async autoSave() {
      if (this.isAutoSaving) {
        return // 如果正在保存，跳过
      }
      
      try {
        this.isAutoSaving = true
        
        // 构建设置对象（复用原有的saveSettings逻辑）
        const cleanSettings = { ...this.settings }
        
        // 构建novel对象
        cleanSettings.novel = {
          defaultOpenMode: this.settings.novelDefaultOpenMode || 'internal',
          readerSettings: {
            fontSize: this.settings.novelFontSize || 16,
            lineHeight: this.settings.novelLineHeight || 1.6,
            fontFamily: this.settings.novelFontFamily || 'Microsoft YaHei, sans-serif',
            backgroundColor: this.settings.novelBackgroundColor || '#ffffff',
            textColor: this.settings.novelTextColor || '#333333',
            wordsPerPage: this.settings.novelWordsPerPage || 1000,
            showProgress: this.settings.novelShowProgress !== undefined ? this.settings.novelShowProgress : true
          }
        }
        
        // 构建image对象
        cleanSettings.image = {
          listPageSize: parseInt(this.settings.image?.listPageSize) || 20,
          jpegQuality: this.settings.image?.jpegQuality || 80,
          thumbnailSize: this.settings.image?.thumbnailSize || 200,
          cacheSize: this.settings.image?.cacheSize || 50,
          enableThumbnails: this.settings.image?.enableThumbnails !== undefined ? this.settings.image.enableThumbnails : true,
          preloadCount: this.settings.image?.preloadCount || 3,
          hardwareAcceleration: this.settings.image?.hardwareAcceleration !== undefined ? this.settings.image.hardwareAcceleration : true,
          renderQuality: this.settings.image?.renderQuality || 'high',
          detailPageSize: parseInt(this.settings.image?.detailPageSize) || 50
        }
        
        // 构建video对象
        cleanSettings.video = {
          listPageSize: parseInt(this.settings.video?.listPageSize) || 20
        }
        
        // 构建audio对象
        cleanSettings.audio = {
          listPageSize: parseInt(this.settings.audio?.listPageSize) || 20
        }
        
        // 构建game对象
        cleanSettings.game = {
          listPageSize: parseInt(this.settings.game?.listPageSize) || 20
        }
        
        // 构建novel对象（包含分页设置）
        cleanSettings.novel = {
          listPageSize: parseInt(this.settings.novel?.listPageSize) || 20,
          defaultOpenMode: this.settings.novelDefaultOpenMode || 'internal',
          readerSettings: {
            fontSize: this.settings.novelFontSize || 16,
            lineHeight: this.settings.novelLineHeight || 1.6,
            fontFamily: this.settings.novelFontFamily || 'Microsoft YaHei, sans-serif',
            backgroundColor: this.settings.novelBackgroundColor || '#ffffff',
            textColor: this.settings.novelTextColor || '#333333',
            wordsPerPage: this.settings.novelWordsPerPage || 1000,
            showProgress: this.settings.novelShowProgress !== undefined ? this.settings.novelShowProgress : true
          }
        }
        
        // 清理单独的字段
        delete cleanSettings.novelDefaultOpenMode
        delete cleanSettings.novelFontSize
        delete cleanSettings.novelLineHeight
        delete cleanSettings.novelFontFamily
        delete cleanSettings.novelBackgroundColor
        delete cleanSettings.novelTextColor
        delete cleanSettings.novelWordsPerPage
        delete cleanSettings.novelShowProgress
        
        // 保存设置
        const success = await saveManager.saveSettings(cleanSettings)
        
        if (success) {
          this.lastSaveTime = new Date()
          this.$emit('settings-saved', cleanSettings)
          console.log('设置自动保存成功')
          
          // 使用NotificationService显示成功通知

          notify.autoSaveSettings(true)
        } else {
          console.error('设置自动保存失败')
          
          // 使用NotificationService显示错误通知
          
          notify.autoSaveSettings(false)
        }
      } catch (error) {
        console.error('自动保存设置失败:', error)
        
        // 使用NotificationService显示错误通知
        try {
          notify.autoSaveSettings(false, error.message)
        } catch (importError) {
          console.error('无法导入NotificationService:', importError)
        }
      } finally {
        this.isAutoSaving = false
      }
    },
    
    // onThemeChange, onAutoStartChange, onMinimizeToTrayChange, onDisguiseModeChange,
    // onSafetyKeyChange, onScreenshotKeyChange, onScreenshotLocationChange, onSaveDataLocationChange,
    // onAutoBackupEnabledChange, onAutoBackupIntervalChange, onMaxBackupCountChange 已移至 GeneralSettings 和 GameSettings 组件
    applyTheme(theme) {
      // 处理跟随系统主题
      let actualTheme = theme
      if (theme === 'auto') {
        // 检测系统主题偏好
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        actualTheme = prefersDark ? 'dark' : 'light'
      }
      
      // 应用主题
      document.documentElement.setAttribute('data-theme', actualTheme)
      localStorage.setItem('butter-manager-theme', theme)
      
      // 通知父组件主题变化
      this.$emit('theme-changed', actualTheme)
    },
    async resetSettings() {
      if (confirm('确定要重置所有设置吗？此操作不可撤销！')) {
        try {
          this.settings = {
            theme: 'auto',
            autoStart: false,
            minimizeToTray: true,
            disguiseMode: false,
            safetyKeyEnabled: false,
            safetyKeyUrl: 'https://www.bilibili.com/video/BV1jR4y1M78W/?p=17&share_source=copy_web&vd_source=7de8c277f16e8e03b48a5328dddfe2ce&t=466',
            // 存档设置
            saveDataLocation: 'default',
            saveDataPath: '',
            autoBackupEnabled: false,
            autoBackupInterval: 5,
            maxBackupCount: 5,
            // 截图设置
            screenshotKey: 'Ctrl+F12',
            screenshotLocation: 'default',
            screenshotsPath: '',
            screenshotFormat: 'png',
            screenshotQuality: 90,
            screenshotNotification: true,
            autoOpenScreenshotFolder: false,
            smartWindowDetection: true,
            // 视频播放设置
            videoPlayMode: 'external',
            // 小说设置
            novelDefaultOpenMode: 'internal',
            novelFontSize: 16,
            novelLineHeight: 1.6,
            novelFontFamily: 'Microsoft YaHei, sans-serif',
            novelBackgroundColor: '#ffffff',
            novelTextColor: '#333333',
            novelWordsPerPage: 1000,
            novelShowProgress: true,
            // 分页设置
            image: {
              listPageSize: 20,
              jpegQuality: 80,
              thumbnailSize: 200,
              cacheSize: 50,
              enableThumbnails: true,
              preloadCount: 3,
              hardwareAcceleration: true,
              renderQuality: 'high',
              detailPageSize: 50
            },
            video: {
              listPageSize: 20
            },
            audio: {
              listPageSize: 20
            },
            game: {
              listPageSize: 20
            },
            novel: {
              listPageSize: 20
            },
            // 更新设置
            autoCheckUpdates: true,
            autoDownloadUpdates: false,
            // 个性化设置
            customAppTitle: '',
            customAppSubtitle: '',
            // 背景图片设置
            backgroundImagePath: ''
          }
          
          // 应用主题
          this.applyTheme(this.settings.theme)
          
          // 清除背景图片
          if (this.settings.backgroundImagePath) {
            try {
              const event = new CustomEvent('background-image-changed', {
                detail: { path: '' }
              })
              window.dispatchEvent(event)
            } catch (error) {
              console.error('触发背景图片清除事件失败:', error)
            }
          }
          
          // 使用NotificationService显示重置成功通知

          notify.success('设置已重置', '所有设置已恢复为默认值')
          
          // 自动保存重置后的设置
          await this.autoSave()
        } catch (error) {
          console.error('重置设置失败:', error)
          try {
            notify.error('重置设置失败', '重置设置时发生错误: ' + error.message)
          } catch (importError) {
            console.error('无法导入NotificationService:', importError)
          }
        }
      }
    },
    async selectScreenshotsDirectory() {
      try {
        if (window.electronAPI && window.electronAPI.setScreenshotsDirectory) {
          const directory = await window.electronAPI.setScreenshotsDirectory()
          if (directory) {
            this.settings.screenshotsPath = directory
            this.settings.screenshotLocation = 'custom' // 自动设置为自定义模式
            this.saveSettings()
            this.showToastNotification('截图目录已更新', `已设置自定义截图目录: ${directory}`)
          }
        } else {
          alert('当前环境不支持选择目录功能')
        }
      } catch (error) {
        console.error('选择截图目录失败:', error)
        alert('选择目录失败: ' + error.message)
      }
    },
    
    async selectSaveDataDirectory() {
      try {
        if (window.electronAPI && window.electronAPI.setSaveDataDirectory) {
          // 临时禁用自动保存，避免在复制过程中触发自动保存
          const originalAutoSaveState = this.isAutoSaving
          this.isAutoSaving = true
          
          const result = await window.electronAPI.setSaveDataDirectory()
          if (result && result.success) {
            // 更新设置
            this.settings.saveDataPath = result.directory
            this.settings.saveDataLocation = 'custom' // 自动设置为自定义模式
            
            // 更新SaveManager的数据目录
            const newSaveDataPath = result.directory + '/SaveData'
            const saveManagerUpdated = saveManager.setDataDirectory(newSaveDataPath)
            if (saveManagerUpdated) {
              console.log('SaveManager数据目录已更新为:', newSaveDataPath)
            }
            
            // 手动保存设置（绕过自动保存机制）
            const success = await saveManager.saveSettings(this.settings)
            if (success) {
              console.log('存档目录设置已保存')
            }
            
            // 恢复自动保存状态
            this.isAutoSaving = originalAutoSaveState
            
            // 显示成功通知
            const message = result.message || '存档目录已更新'
            let detailMessage = `已设置自定义存档目录: ${result.directory}`
            
            if (result.copiedFiles && result.copiedFiles > 0) {
              // 复制数据的情况
              detailMessage += `\n\n成功复制 ${result.copiedFiles} 个文件`
              detailMessage += `\n${message}`
            } else {
              detailMessage += `\n\n${message}`
            }
            
            // 使用 toast 通知显示成功消息
            this.showToastNotification('存档目录设置成功', detailMessage)
            
            // 如果有复制文件，显示更详细的信息
            if (result.copiedFiles && result.copiedFiles > 0) {
              console.log('存档数据复制完成:', {
                directory: result.directory,
                copiedFiles: result.copiedFiles,
                message: result.message
              })
            }
          } else if (result && !result.success) {
            // 恢复自动保存状态
            this.isAutoSaving = originalAutoSaveState
            
            // 显示错误通知
            const errorMessage = result.error || '未知错误'
            this.showToastNotification('存档目录设置失败', errorMessage)
            console.error('设置存档目录失败:', result.error)
          } else {
            // 用户取消选择的情况
            this.isAutoSaving = originalAutoSaveState
            console.log('用户取消了目录选择')
          }
        } else {
          alert('当前环境不支持选择目录功能')
        }
      } catch (error) {
        // 确保在出错时也恢复自动保存状态
        this.isAutoSaving = false
        console.error('选择存档目录失败:', error)
        alert('选择目录失败: ' + error.message)
      }
    },
    async showNotification(title, message) {
      // 简单的通知实现
      if (window.electronAPI && window.electronAPI.showNotification) {
        window.electronAPI.showNotification(title, message)
      } else {
        // 降级处理：使用浏览器通知
        if (Notification.permission === 'granted') {
          new Notification(title, { body: message })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, { body: message })
            }
          })
        }
      }
    },

    // 显示 Toast 通知
    async showToastNotification(title, message, results = null) {
      try {
        
        if (results && results.length > 0) {
          // 批量操作结果通知
          notify.batchResult(title, results)
        } else {
          // 普通通知
          const type = title.includes('失败') || title.includes('错误') ? 'error' : 'success'
          notify[type](title, message)
        }
      } catch (error) {
        console.error('显示 Toast 通知失败:', error)
        // 降级到原来的通知方式
        this.showNotification(title, message)
      }
    },
    async openSaveDataFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          // 获取存档文件夹路径
          let saveDataPath = ''
          
          if (this.settings.saveDataLocation === 'default') {
            // 使用默认路径
            saveDataPath = 'SaveData'
          } else if (this.settings.saveDataLocation === 'custom') {
            // 使用自定义路径
            saveDataPath = this.settings.saveDataPath
          }
          
          // 如果自定义路径为空，回退到默认路径
          if (!saveDataPath || saveDataPath.trim() === '') {
            saveDataPath = 'SaveData'
          }
          
          console.log('尝试打开存档文件夹:', saveDataPath)
          
          // 确保目录存在
          try {
            if (window.electronAPI.ensureDirectory) {
              const ensureResult = await window.electronAPI.ensureDirectory(saveDataPath)
              if (ensureResult.success) {
                console.log('存档目录已确保存在:', saveDataPath)
              }
            }
          } catch (error) {
            console.warn('创建存档目录失败:', error)
          }
          
          const result = await window.electronAPI.openFolder(saveDataPath)
          if (result.success) {
            console.log('存档文件夹已打开')
            this.showToastNotification('文件夹已打开', `已打开存档文件夹: ${saveDataPath}`)
          } else {
            console.error('打开存档文件夹失败:', result.error)
            this.showToastNotification(`打开存档文件夹失败: ${result.error}`)
          }
        } else {
          // 降级处理：在浏览器中显示路径信息
          const saveDataPath = this.settings.saveDataLocation === 'default' 
            ? 'SaveData' 
            : (this.settings.saveDataPath || 'SaveData')
          this.showToastNotification(`存档文件夹路径: ${saveDataPath}\n\n在浏览器环境中无法直接打开文件夹，请手动导航到该路径`)
        }
      } catch (error) {
        console.error('打开存档文件夹失败:', error)
        this.showToastNotification(`打开存档文件夹失败: ${error.message}`)
      }
    },
    async openScreenshotFolder() {
      try {
        if (window.electronAPI && window.electronAPI.openFolder) {
          // 获取截图文件夹路径
          let screenshotPath = ''
          
          if (this.settings.screenshotLocation === 'default') {
            // 使用默认路径
            screenshotPath = 'SaveData/Game/Screenshots'
          } else if (this.settings.screenshotLocation === 'custom') {
            // 使用自定义路径
            screenshotPath = this.settings.screenshotsPath
          }
          
          // 如果自定义路径为空，回退到默认路径
          if (!screenshotPath || screenshotPath.trim() === '') {
            screenshotPath = 'SaveData/Game/Screenshots'
          }
          
          console.log('尝试打开截图文件夹:', screenshotPath)
          
          // 确保目录存在（特别是默认目录）
          try {
            if (window.electronAPI.ensureDirectory) {
              const ensureResult = await window.electronAPI.ensureDirectory(screenshotPath)
              if (ensureResult.success) {
                console.log('截图目录已确保存在:', screenshotPath)
              }
            }
          } catch (error) {
            console.warn('创建截图目录失败:', error)
          }
          
          const result = await window.electronAPI.openFolder(screenshotPath)
          if (result.success) {
            console.log('截图文件夹已打开')
            this.showToastNotification('文件夹已打开', `已打开截图文件夹: ${screenshotPath}`)
          } else {
            console.error('打开截图文件夹失败:', result.error)
            this.showToastNotification(`打开截图文件夹失败: ${result.error}`)
          }
        } else {
          // 降级处理：在浏览器中显示路径信息
          const screenshotPath = this.settings.screenshotLocation === 'default' 
            ? 'SaveData/Game/Screenshots' 
            : (this.settings.screenshotsPath || 'SaveData/Game/Screenshots')
          this.showToastNotification(`截图文件夹路径: ${screenshotPath}\n\n在浏览器环境中无法直接打开文件夹，请手动导航到该路径`)
        }
      } catch (error) {
        console.error('打开截图文件夹失败:', error)
        this.showToastNotification(`打开截图文件夹失败: ${error.message}`)
      }
    },
    async testNovelSettings() {
      try {
        console.log('=== 测试小说设置 ===')
        console.log('当前设置:', {
          novelDefaultOpenMode: this.settings.novelDefaultOpenMode,
          novelFontSize: this.settings.novelFontSize,
          novelLineHeight: this.settings.novelLineHeight,
          novelFontFamily: this.settings.novelFontFamily,
          novelBackgroundColor: this.settings.novelBackgroundColor,
          novelTextColor: this.settings.novelTextColor,
          novelWordsPerPage: this.settings.novelWordsPerPage,
          novelShowProgress: this.settings.novelShowProgress
        })
        
        // 保存设置
        const success = await saveManager.saveSettings(this.settings)
        if (success) {
          console.log('设置保存成功')
          
          // 重新加载设置验证
          const reloadedSettings = await saveManager.loadSettings()
          console.log('重新加载的设置:', reloadedSettings)
          
          this.showToastNotification('测试完成', '设置已保存并验证，请查看控制台输出')
        } else {
          this.showToastNotification('设置保存失败！')
        }
      } catch (error) {
        console.error('测试设置失败:', error)
        alert('测试设置失败: ' + error.message)
      }
    },
    
    async testImageSettings() {
      try {
        console.log('=== 测试图片设置 ===')
        console.log('当前图片设置:', {
          jpegQuality: this.settings.image.jpegQuality,
          thumbnailSize: this.settings.image.thumbnailSize,
          cacheSize: this.settings.image.cacheSize,
          enableThumbnails: this.settings.image.enableThumbnails,
          preloadCount: this.settings.image.preloadCount,
          hardwareAcceleration: this.settings.image.hardwareAcceleration,
          renderQuality: this.settings.image.renderQuality,
          detailPageSize: parseInt(this.settings.image.detailPageSize)
        })
        
        // 保存设置
        const success = await saveManager.saveSettings(this.settings)
        if (success) {
          console.log('图片设置保存成功')
          
          // 重新加载设置验证
          const reloadedSettings = await saveManager.loadSettings()
          console.log('重新加载的图片设置:', {
            jpegQuality: reloadedSettings.image?.jpegQuality,
            thumbnailSize: reloadedSettings.image?.thumbnailSize,
            cacheSize: reloadedSettings.image?.cacheSize,
            enableThumbnails: reloadedSettings.image?.enableThumbnails,
            preloadCount: reloadedSettings.image?.preloadCount,
            hardwareAcceleration: reloadedSettings.image?.hardwareAcceleration,
            renderQuality: reloadedSettings.image?.renderQuality,
            detailPageSize: reloadedSettings.image?.detailPageSize
          })
          
          this.showToastNotification('图片设置测试完成', '图片设置已保存并验证，请查看控制台输出')
        } else {
          alert('图片设置保存失败！')
        }
      } catch (error) {
        console.error('测试图片设置失败:', error)
        alert('测试图片设置失败: ' + error.message)
      }
    },

    // ==================== 自动更新相关方法 ====================
    
    async checkForUpdates() {
      try {
        this.isCheckingUpdates = true
        this.updateStatus = { checking: true }
        
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
          const result = await window.electronAPI.checkForUpdates()
          if (result.success) {
            console.log('更新检查已启动:', result.message)
            // 不在这里设置 isCheckingUpdates = false，等待事件监听器处理结果
          } else {
            this.updateStatus = { error: result.error }
            this.isCheckingUpdates = false
          }
        } else {
          this.updateStatus = { error: '自动更新功能不可用' }
          this.isCheckingUpdates = false
        }
      } catch (error) {
        console.error('检查更新失败:', error)
        this.updateStatus = { error: error.message }
        this.isCheckingUpdates = false
      }
    },



    onAutoCheckUpdatesChange() {
      // 自动检查更新设置变化时的处理
      console.log('自动检查更新设置已更新:', this.settings.autoCheckUpdates)
    },

    openGitHubPage() {
      try {
        const githubUrl = 'https://github.com/klsdf/ButterResourcesManager/releases/latest'
        
        if (window.electronAPI && window.electronAPI.openExternal) {
          window.electronAPI.openExternal(githubUrl)
        } else {
          // 降级处理：在浏览器中打开
          window.open(githubUrl, '_blank')
        }
      } catch (error) {
        console.error('打开GitHub页面失败:', error)
        // 最后的降级处理
        window.open('https://github.com/klsdf/ButterResourcesManager/releases/latest', '_blank')
      }
    },


    formatBytes(bytes) {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    },




    // 监听自动更新事件
    setupUpdateListeners() {
      if (window.electronAPI) {
        // 监听更新检查事件
        window.electronAPI.onUpdateChecking(() => {
          this.updateStatus = { checking: true }
          this.isCheckingUpdates = true
        })

        // 监听发现新版本事件
        window.electronAPI.onUpdateAvailable((event, info) => {
          this.updateStatus = { 
            available: true, 
            version: info.version,
            releaseNotes: info.releaseNotes 
          }
          this.isCheckingUpdates = false
        })

        // 监听没有新版本事件
        window.electronAPI.onUpdateNotAvailable((event, info) => {
          this.updateStatus = { notAvailable: true, version: info.version }
          this.isCheckingUpdates = false
        })


        // 监听更新错误事件
        window.electronAPI.onUpdateError((event, error) => {
          // 处理不同类型的错误
          let errorMessage = error
          if (typeof error === 'object') {
            errorMessage = error.message || '未知错误'
            if (error.code) {
              errorMessage += ` (错误代码: ${error.code})`
            }
          }
          this.updateStatus = { error: errorMessage }
          this.isCheckingUpdates = false
        })
      }
    }
  },
  async mounted() {
    try {
      // 等待父组件（App.vue）的存档系统初始化完成
      const maxWaitTime = 5000
      const startTime = Date.now()
      while (!this.$parent.isInitialized && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      if (this.$parent.isInitialized) {
        console.log('✅ 存档系统已初始化，开始加载设置数据')
      }
      
      // 使用 SaveManager 加载设置
      this.settings = await saveManager.loadSettings()
      console.log('加载的设置:', this.settings)
      
      // 从novel对象中读取小说设置到表单字段
      if (this.settings.novel) {
        this.settings.novelDefaultOpenMode = this.settings.novel.defaultOpenMode || 'internal'
        if (this.settings.novel.readerSettings) {
          this.settings.novelFontSize = this.settings.novel.readerSettings.fontSize || 16
          this.settings.novelLineHeight = this.settings.novel.readerSettings.lineHeight || 1.6
          this.settings.novelFontFamily = this.settings.novel.readerSettings.fontFamily || 'Microsoft YaHei, sans-serif'
          this.settings.novelBackgroundColor = this.settings.novel.readerSettings.backgroundColor || '#ffffff'
          this.settings.novelTextColor = this.settings.novel.readerSettings.textColor || '#333333'
          this.settings.novelWordsPerPage = this.settings.novel.readerSettings.wordsPerPage || 1000
          this.settings.novelShowProgress = this.settings.novel.readerSettings.showProgress !== undefined ? this.settings.novel.readerSettings.showProgress : true
        }
      }
      
      // 从image对象中读取图片设置到表单字段
      if (this.settings.image) {
        this.settings.image = {
          listPageSize: parseInt(this.settings.image.listPageSize) || 20,
          jpegQuality: this.settings.image.jpegQuality || 80,
          thumbnailSize: this.settings.image.thumbnailSize || 200,
          cacheSize: this.settings.image.cacheSize || 50,
          enableThumbnails: this.settings.image.enableThumbnails !== undefined ? this.settings.image.enableThumbnails : true,
          preloadCount: this.settings.image.preloadCount || 3,
          hardwareAcceleration: this.settings.image.hardwareAcceleration !== undefined ? this.settings.image.hardwareAcceleration : true,
          renderQuality: this.settings.image.renderQuality || 'high',
          detailPageSize: parseInt(this.settings.image.detailPageSize) || 50
        }
      } else {
        // 如果没有image对象，创建默认的
        this.settings.image = {
          listPageSize: 20,
          jpegQuality: 80,
          thumbnailSize: 200,
          cacheSize: 50,
          enableThumbnails: true,
          preloadCount: 3,
          hardwareAcceleration: true,
          renderQuality: 'high',
          detailPageSize: 50
        }
      }
      
      // 从video对象中读取视频设置到表单字段
      if (this.settings.video) {
        this.settings.video = {
          listPageSize: parseInt(this.settings.video.listPageSize) || 20
        }
      } else {
        this.settings.video = {
          listPageSize: 20
        }
      }
      
      // 从audio对象中读取音频设置到表单字段
      if (this.settings.audio) {
        this.settings.audio = {
          listPageSize: parseInt(this.settings.audio.listPageSize) || 20
        }
      } else {
        this.settings.audio = {
          listPageSize: 20
        }
      }
      
      // 从game对象中读取游戏设置到表单字段
      if (this.settings.game) {
        this.settings.game = {
          listPageSize: parseInt(this.settings.game.listPageSize) || 20
        }
      } else {
        this.settings.game = {
          listPageSize: 20
        }
      }
      
      // 从novel对象中读取小说分页设置到表单字段
      if (this.settings.novel) {
        this.settings.novel = {
          listPageSize: parseInt(this.settings.novel.listPageSize) || 20
        }
      } else {
        this.settings.novel = {
          listPageSize: 20
        }
      }
      
      // 确保小说设置字段存在并设置默认值
      if (!this.settings.novelDefaultOpenMode) {
        this.settings.novelDefaultOpenMode = 'internal'
      }
      if (!this.settings.novelFontSize) {
        this.settings.novelFontSize = 16
      }
      if (!this.settings.novelLineHeight) {
        this.settings.novelLineHeight = 1.6
      }
      if (!this.settings.novelFontFamily) {
        this.settings.novelFontFamily = 'Microsoft YaHei, sans-serif'
      }
      if (!this.settings.novelBackgroundColor) {
        this.settings.novelBackgroundColor = '#ffffff'
      }
      if (!this.settings.novelTextColor) {
        this.settings.novelTextColor = '#333333'
      }
      if (!this.settings.novelWordsPerPage) {
        this.settings.novelWordsPerPage = 1000
      }
      if (this.settings.novelShowProgress === undefined) {
        this.settings.novelShowProgress = true
      }
      
      // 初始化安全键设置（如果未设置）
      if (this.settings.safetyKeyEnabled === undefined || this.settings.safetyKeyEnabled === null) {
        this.settings.safetyKeyEnabled = false
      }
      if (!this.settings.safetyKeyUrl) {
        this.settings.safetyKeyUrl = 'https://www.bilibili.com/video/BV1jR4y1M78W/?p=17&share_source=copy_web&vd_source=7de8c277f16e8e03b48a5328dddfe2ce&t=466'
      }
      
      // 加载设置后立即应用主题
      if (this.settings.theme) {
        this.applyTheme(this.settings.theme)
      }
      
      // 初始化存档设置（如果未设置）
      if (!this.settings.saveDataLocation) {
        this.settings.saveDataLocation = 'default'
      }
      
      // 如果使用自定义目录但没有设置路径，尝试获取
      if (this.settings.saveDataLocation === 'custom' && !this.settings.saveDataPath) {
        try {
          if (window.electronAPI && window.electronAPI.getSaveDataDirectory) {
            this.settings.saveDataPath = await window.electronAPI.getSaveDataDirectory()
          }
        } catch (error) {
          console.error('获取默认存档目录失败:', error)
        }
      }
      
      // 根据设置更新SaveManager的数据目录
      try {
        let saveDataPath = ''
        if (this.settings.saveDataLocation === 'default') {
          saveDataPath = 'SaveData' // 默认根目录下的SaveData
        } else if (this.settings.saveDataLocation === 'custom' && this.settings.saveDataPath) {
          saveDataPath = this.settings.saveDataPath + '/SaveData' // 自定义目录下的SaveData
        }
        
        if (saveDataPath) {
          const saveManagerUpdated = saveManager.setDataDirectory(saveDataPath)
          if (saveManagerUpdated) {
            console.log('SaveManager数据目录已设置为:', saveDataPath)
          }
        }
      } catch (error) {
        console.error('设置SaveManager数据目录失败:', error)
      }
      
      // 初始化截图设置（如果未设置）
      if (!this.settings.screenshotLocation) {
        this.settings.screenshotLocation = 'default'
      }
      
      // 如果使用默认目录，清空自定义路径
      if (this.settings.screenshotLocation === 'default') {
        this.settings.screenshotsPath = ''
      } else if (this.settings.screenshotLocation === 'custom' && !this.settings.screenshotsPath) {
        // 如果使用自定义目录但没有设置路径，尝试获取
        try {
          if (window.electronAPI && window.electronAPI.getScreenshotsDirectory) {
            this.settings.screenshotsPath = await window.electronAPI.getScreenshotsDirectory()
          }
        } catch (error) {
          console.error('获取默认截图目录失败:', error)
        }
      }
      
      // 获取当前开机自启状态（仅在设置文件中没有值时获取）
      if (this.settings.autoStart === undefined || this.settings.autoStart === null) {
        try {
          if (window.electronAPI && window.electronAPI.getAutoStart) {
            const result = await window.electronAPI.getAutoStart()
            if (result.success) {
              this.settings.autoStart = result.enabled
              console.log('从系统获取开机自启状态:', result.enabled)
            }
          }
        } catch (error) {
          console.error('获取开机自启状态失败:', error)
          // 如果获取失败，使用默认值
          this.settings.autoStart = false
        }
      } else {
        console.log('使用设置文件中的开机自启状态:', this.settings.autoStart)
      }
      
      // 获取当前最小化到托盘状态（仅在设置文件中没有值时获取）
      if (this.settings.minimizeToTray === undefined || this.settings.minimizeToTray === null) {
        try {
          if (window.electronAPI && window.electronAPI.getMinimizeToTray) {
            const result = await window.electronAPI.getMinimizeToTray()
            if (result.success) {
              this.settings.minimizeToTray = result.enabled
              console.log('从系统获取最小化到托盘状态:', result.enabled)
            }
          }
        } catch (error) {
          console.error('获取最小化到托盘状态失败:', error)
          // 如果获取失败，使用默认值
          this.settings.minimizeToTray = true
        }
      } else {
        console.log('使用设置文件中的最小化到托盘状态:', this.settings.minimizeToTray)
      }
      
      // 设置初始保存时间，启用自动保存
      this.lastSaveTime = new Date()
      // 初始化完成，启用watcher
      this.isInitializing = false
      console.log('设置页面已加载，自动保存功能已启用')
      
      // 获取当前版本信息
      if (window.electronAPI && window.electronAPI.getAppVersion) {
        window.electronAPI.getAppVersion().then(version => {
          this.currentVersion = version
        }).catch(error => {
          console.error('获取版本信息失败:', error)
        })
      }
      
      // 设置自动更新事件监听
      this.setupUpdateListeners()
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  },
  
  beforeUnmount() {
    // 清理定时器
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer)
    }
  }
}
</script>

<style scoped>
.settings-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
}

.settings-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.settings-sidebar {
  width: 250px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 600;
}

.settings-nav {
  flex: 1;
  padding: 10px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: var(--hover-bg);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--primary-bg);
  color: var(--accent-color);
  border-left-color: var(--accent-color);
}

.nav-icon {
  font-size: 18px;
  margin-right: 12px;
  width: 20px;
  text-align: center;
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  padding: 20px 30px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.content-header h2 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 24px;
  font-weight: 600;
}

.content-header p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.settings-container {
  flex: 1;
  /* padding: 30px; */
  overflow-y: auto;
  background: var(--bg-color);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 500;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}


.btn-icon {
  font-size: 16px;
}


.settings-section {
  border-bottom: 1px solid var(--border-color);
  padding: 30px;
  transition: border-color 0.3s ease;
}

.settings-section:last-of-type {
  border-bottom: none;
}

.settings-section h4 {
  color: var(--text-primary);
  font-size: 1.3rem;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: color 0.3s ease;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
  border-bottom: 1px solid var(--bg-tertiary);
  transition: border-color 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.setting-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  transition: color 0.3s ease;
}

.setting-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.setting-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.setting-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.btn-test-notification {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.3s ease;
}

.btn-test-notification:hover {
  background: var(--accent-hover);
}

.btn-test-tray {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.3s ease;
}

.btn-test-tray:hover {
  background: #7c3aed;
}

.btn-open-folder {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-open-folder:hover {
  background: #059669;
  transform: translateY(-1px);
}

.btn-open-screenshot-folder {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-open-screenshot-folder:hover {
  background: #7c3aed;
  transform: translateY(-1px);
}

.btn-open-save-data-folder {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-open-save-data-folder:hover {
  background: #059669;
  transform: translateY(-1px);
}

.btn-reset-settings {
  background: #ef4444;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

.btn-reset-settings:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-test-settings {
  background: #10b981;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-test-settings:hover {
  background: #059669;
  transform: translateY(-1px);
}

.btn-test-image-settings {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-test-image-settings:hover {
  background: #d97706;
  transform: translateY(-1px);
}

.btn-icon {
  font-size: 1rem;
}

.setting-input {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  min-width: 200px;
  transition: all 0.3s ease;
}

.setting-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.setting-slider {
  width: 150px;
  margin-right: 10px;
}

.setting-value {
  color: #718096;
  font-size: 0.9rem;
  min-width: 50px;
}

.color-input {
  width: 40px;
  height: 40px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg-secondary);
  transition: all 0.3s ease;
}

.color-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
}

.path-input-group,
.file-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-input-group .setting-input {
  flex: 1;
  min-width: 200px;
}

.path-button {
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.3s ease;
}

.path-button:hover {
  background: var(--accent-hover);
}

.btn-browse {
  padding: 8px 16px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn-browse:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--accent-color);
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* 更新相关样式 */
.version-info {
  font-family: 'Courier New', monospace;
  font-weight: bold;
  color: var(--accent-color);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.update-status {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-item:last-child {
  margin-bottom: 0;
}

.status-icon {
  font-size: 20px;
  width: 24px;
  text-align: center;
}

.status-content {
  flex: 1;
}

.status-text {
  font-weight: 500;
  margin-bottom: 8px;
}

.status-detail {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-family: 'Courier New', monospace;
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: 4px;
  word-break: break-all;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.download-progress {
  margin-top: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: var(--border-color);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width 0.3s ease;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.btn-success {
  background: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.btn-warning {
  background: #ffc107;
  color: #212529;
}

.btn-warning:hover:not(:disabled) {
  background: #e0a800;
  transform: translateY(-1px);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6268;
  transform: translateY(-1px);
}

.btn-info {
  background: #17a2b8;
  color: white;
}

.btn-info:hover:not(:disabled) {
  background: #138496;
  transform: translateY(-1px);
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .settings-layout {
    flex-direction: column;
  }
  
  .settings-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .settings-nav {
    display: flex;
    overflow-x: auto;
    padding: 10px;
  }
  
  .nav-item {
    flex-shrink: 0;
    border-left: none;
    border-bottom: 3px solid transparent;
    padding: 8px 16px;
    margin-right: 8px;
    border-radius: 6px;
  }
  
  .nav-item.active {
    border-left: none;
    border-bottom-color: var(--accent-color);
  }
  
  .content-header {
    padding: 15px 20px;
  }
  
  .content-header h2 {
    font-size: 20px;
  }
  
  .settings-container {
    padding: 20px;
  }
  
}

@media (max-width: 480px) {
  .settings-container {
    padding: 15px;
  }
  
  .content-header {
    padding: 15px;
  }
  
  .nav-item {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .nav-icon {
    font-size: 16px;
    margin-right: 8px;
  }
}
</style>
