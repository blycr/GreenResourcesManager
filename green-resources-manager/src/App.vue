<template>
  <div id="app">
    <!-- 加载中提示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <h2>Butter Manager</h2>
        <p>正在初始化应用...</p>
      </div>
    </div>

    <!-- 左侧导航栏 -->
    <nav class="sidebar" v-show="!isLoading">
      <div class="sidebar-header">
        <img 
          :src="logoIcon" 
          alt="Butter Manager" 
          class="sidebar-logo"
          @click="onLogoClick"
        >
        <h1>{{ personalization.customAppTitle || '绿色资源管理器' }}</h1>
        <p>{{ personalization.customAppSubtitle || '绿色、全能的资源管理器' }}</p>
        <p class="version">v{{ version }}</p>
      </div>

      <ul class="nav-menu">
        <li v-for="item in navItems" :key="item.id" 
          :class="{ active: $route.name === item.id }"
          @click="navigateTo(item.id)" class="nav-item">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </li>
      </ul>

      <!-- 底部按钮 -->
      <div class="nav-footer">
        <div v-for="viewId in footerViews" :key="viewId" 
          :class="['nav-item', `${viewId}-item`, { active: $route.name === viewId }]" 
          @click="navigateTo(viewId)">
          <span class="nav-icon">{{ viewConfig[viewId]?.icon || '' }}</span>
          <span class="nav-text">{{ viewConfig[viewId]?.name || '' }}</span>
        </div>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content" v-show="!isLoading">

      <!-- 标题和简介 -->
      <header class="content-header">
        <h2>{{ getCurrentViewTitle() }}</h2>
        <p>{{ getCurrentViewDescription() }}</p>
      </header>

      <div class="content-body" :class="{ 'with-filter': showFilterSidebar }">
        <!-- 筛选器侧边栏 - 只在需要筛选的页面显示 -->
        <div v-if="showFilterSidebar" class="filter-sidebar-container">
          <FilterSidebar 
            :filters="currentFilterData.filters" 
            :isLoading="isFilterSidebarLoading"
            @filter-select="onFilterSelect"
            @filter-exclude="onFilterExclude" 
            @filter-clear="onFilterClear" 
          />
        </div>

        <!-- 页面内容区域 -->
        <div class="page-content" :class="{ 'has-background': backgroundImage.backgroundImageUrl.value }" :style="backgroundImage.pageContentStyle.value">
          <router-view 
            ref="routerView"
            @filter-data-updated="updateFilterData"
            @navigate="navigateTo"
            @theme-changed="theme.applyTheme"
          />
        </div>
      </div>
      <!-- 全局音频播放器 -->
      <GlobalAudioPlayer @audio-started="onAudioStarted" @playlist-ended="onPlaylistEnded" />
    </main>

    <!-- 全局通知组件 -->
    <ToastNotification ref="toastNotification" />

  </div>
</template>

<script lang="ts">
import GlobalAudioPlayer from './components/GlobalAudioPlayer.vue'
import ToastNotification from './components/ToastNotification.vue'
import FilterSidebar from './components/FilterSidebar.vue'
import { updateDynamicRoutes } from './router/index'
import { useSafetyKey } from './composables/useSafetyKey'
import { useTheme } from './composables/useTheme'
import { useBackgroundImage } from './composables/useBackgroundImage'
import { usePersonalization } from './composables/usePersonalization'
import { useGameRunningStore } from './stores/game-running'


import notificationService from './utils/NotificationService.ts'

import saveManager from './utils/SaveManager.ts'
import customPageManager from './utils/CustomPageManager.ts'
import { unlockAchievement } from './pages/user/AchievementView.vue'


export default {
  name: 'App',
  components: {
    GlobalAudioPlayer,
    ToastNotification,
    FilterSidebar
  },
  setup() {
    // 使用安全键管理 composable
    const safetyKey = useSafetyKey()
    let cleanupSafetyKeyListener: (() => void) | null = null
    
    // 使用主题管理 composable
    const theme = useTheme()
    
    // 使用背景图片管理 composable
    const backgroundImage = useBackgroundImage()
    
    // 使用个性化设置 composable
    const personalization = usePersonalization()
    
    // 使用游戏运行状态 store（渐进式迁移）
    const gameRunningStore = useGameRunningStore()
    
    // 清理函数存储
    let cleanupPersonalization: (() => void) | null = null
    let cleanupBackgroundImage: (() => void) | null = null
    
    return {
      safetyKey,
      theme,
      backgroundImage,
      personalization,
      gameRunningStore,
      setCleanupSafetyKeyListener: (cleanup: () => void) => {
        cleanupSafetyKeyListener = cleanup
      },
      getCleanupSafetyKeyListener: () => cleanupSafetyKeyListener,
      setCleanupPersonalization: (cleanup: () => void) => {
        cleanupPersonalization = cleanup
      },
      getCleanupPersonalization: () => cleanupPersonalization,
      setCleanupBackgroundImage: (cleanup: () => void) => {
        cleanupBackgroundImage = cleanup
      },
      getCleanupBackgroundImage: () => cleanupBackgroundImage
    }
  },
  data() {
    return {
      version: '0.0.0',
      isLoading: true, // 应用加载状态
      isInitialized: false, // 存档系统是否已初始化
      isLogoClicked: false, // logo 是否被点击过
      // 筛选器相关数据
      showFilterSidebar: false,
      isFilterSidebarLoading: false,
      currentFilterData: {
        filters: []
      },
      // 定时器管理（定时器由 App.vue 管理，因为需要调用 App.vue 的方法）
      statusCheckIntervalId: null as number | null,
      playtimeUpdateIntervalId: null as number | null,
      playtimeSaveIntervalId: null as number | null,
      // 应用使用时长跟踪
      appSessionStartTime: null, // 应用会话开始时间
      appUsageTimer: null, // 应用使用时长定时器
      // 文件丢失检测控制
      hasCheckedFileLoss: false, // 是否已经检测过文件丢失（应用启动时检测一次）
      // WinRAR 检测相关
      winRARInstalled: false,
      winRARPath: null as string | null,
      winRARExecutable: null as string | null,
      // 自动备份相关
      autoBackupInterval: 0, // 自动备份时间间隔（分钟），0表示禁用
      autoBackupTimer: null, // 自动备份定时器
      lastBackupTime: null, // 上次备份时间
      // 统一的页面配置
      pages: [], // 动态页面配置
      viewConfig: {
        // 固定页面
        home: {
          name: '主页',
          icon: '🏠',
          description: '欢迎页面，快速访问各个功能模块'
        },
        users: {
          name: '用户',
          icon: '👤',
          description: '记录您的个人数据已经本软件的各种数据'
        },
        messages: {
          name: '信息中心',
          icon: '📢',
          description: '查看系统通知和操作历史'
        },
        help: {
          name: '帮助',
          icon: '❓',
          description: '了解应用功能和使用方法'
        },
        settings: {
          name: '设置',
          icon: '⚙️',
          description: '管理应用设置和偏好'
        },
        // 合集页面（暂时注释）
        collections: {
          name: '合集',
          icon: '🗂️',
          description: '管理你的合集'
        }
      },
      navItems: []
    }
  },
  computed: {
    currentPageConfig() {
      // 从路由 meta 中获取页面配置
      const route = this.$route
      if (route.meta?.pageConfig) {
        return route.meta.pageConfig
      }
      // 兼容旧逻辑：从 pages 中查找
      return this.pages.find(p => p.id === route.name && !p.isHidden)
    },
    // 主导航页面ID列表
    mainNavViewIds() {
      // 隐藏页面不出现在导航中
      return ['home', ...this.pages.filter(p => !p.isHidden).map(p => p.id)]
    },
    // 底部导航页面ID列表
    footerViews() {
      return ['users', 'messages', 'help', 'settings']
    },
    // 根据点击状态返回对应的 logo 图标
    logoIcon() {
      return this.isLogoClicked ? './hide-icon.png' : './butter-icon.png'
    },
  },
  methods: {
    // 点击 logo 的处理方法
    onLogoClick() {
      // 播放解锁音效
      this.playUnlockSound()
      // 切换图标
      this.isLogoClicked = true



      unlockAchievement('serect_click')
    },
    // 播放解锁音效
    playUnlockSound() {
      try {
        const audio = new Audio('./unlock.mp3')
        audio.play().catch(error => {
          console.warn('播放解锁音效失败:', error)
        })
      } catch (error) {
        console.warn('创建音频对象失败:', error)
      }
    },
    // 检查是否应该进行文件丢失检测
    shouldCheckFileLoss() {
      return !this.hasCheckedFileLoss
    },
    
    // 标记文件丢失检测已完成
    markFileLossChecked() {
      this.hasCheckedFileLoss = true
    },
    
    async checkFirstLoginAchievement() {
         await unlockAchievement('first_login')

    },
    
    // 打印磁盘信息（后台异步执行，不阻塞）
    async printDiskInfo() {
      try {
        // 延迟执行，确保应用已经启动完成
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const drives = ['C:', 'D:', 'E:', 'F:', 'G:']
        
        console.log('=== 开始获取磁盘信息（后台执行） ===')
        
        // 并行获取所有磁盘信息，提高速度
        const diskInfoPromises = drives.map(async (drive) => {
          try {
            if (window.electronAPI && window.electronAPI.getDiskTypeByPath) {
              // 确保路径格式正确（盘符后面加反斜杠）
              const drivePath = drive.endsWith(':') ? drive + '\\' : drive + ':\\'
              const result = await window.electronAPI.getDiskTypeByPath(drivePath)
              
              if (result.success) {
                console.log(`\n📀 ${drive} 盘信息:`)
                console.log(`  磁盘名称: ${result.friendlyName}`)
                console.log(`  磁盘类型: ${result.mediaType}`) // SSD 或 HDD
                console.log(`  设备ID: ${result.deviceId}`)
                console.log(`  磁盘大小: ${result.sizeGB} GB`)
                console.log(`  总线类型: ${result.busType}`)
              } else {
                console.log(`\n❌ ${drive} 盘: 无法获取信息 - ${result.error}`)
              }
            }
          } catch (error) {
            console.error(`获取 ${drive} 盘信息时出错:`, error)
          }
        })
        
        // 等待所有磁盘信息获取完成（但不阻塞主流程）
        await Promise.allSettled(diskInfoPromises)
        
        console.log('\n=== 磁盘信息获取完成 ===\n')
      } catch (error) {
        console.error('获取磁盘信息时出错:', error)
      }
    },

    // 预热资源页面
    prefetchResourceViews() {
      const run = () => {
        const loaders: Array<() => Promise<any>> = [
          () => import('./pages/GameView.vue'),
          () => import('./pages/ImageView.vue'),
          () => import('./pages/VideoView.vue'),
          () => import('./pages/NovelView.vue'),
          () => import('./pages/WebsiteView.vue'),
          () => import('./pages/AudioView.vue')
        ]

        for (const loader of loaders) {
          try {
            loader().catch(() => {})
          } catch (_) {
            // ignore
          }
        }
      }

      const w = window as any
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(run, { timeout: 2000 })
      } else {
        setTimeout(run, 0)
      }
    },

    // 重新加载自定义页面配置并刷新导航（用于"页面管理"修改后即时生效）
    async reloadCustomPages() {
      try {
        await customPageManager.init()
        this.pages = customPageManager.getPages()

        // 更新 viewConfig
        this.pages.forEach(page => {
          this.viewConfig[page.id] = {
            name: page.name,
            icon: page.icon,
            description: page.description || `${page.name}管理页面`
          }
        })

        // 刷新导航项
        this.navItems = this.mainNavViewIds.map(viewId => ({
          id: viewId,
          name: this.viewConfig[viewId]?.name || viewId,
          icon: this.viewConfig[viewId]?.icon || '📄',
          description: this.viewConfig[viewId]?.description || ''
        }))

        // 更新动态路由
        if (this.$router) {
          await updateDynamicRoutes(this.$router)
        }

        // 当前页面如果变为隐藏/已删除（仅资源视图会有 pageConfig）则回退
        const currentRouteName = this.$route.name as string
        if (this.mainNavViewIds.includes(currentRouteName) && currentRouteName !== 'home' && !this.currentPageConfig) {
          const firstVisible = this.pages.find(p => !p.isHidden)?.id
          if (firstVisible) {
            this.$router.push({ name: firstVisible })
          } else {
            this.$router.push({ name: 'home' })
          }
        }
      } catch (e) {
        console.error('重新加载自定义页面失败:', e)
      }
    },
    
    navigateTo(viewId: string) {
      this.$router.push({ name: viewId }).catch(err => {
        // 忽略重复导航错误
        if (err.name !== 'NavigationDuplicated') {
          console.error('导航失败:', err)
        }
      })
    },
    // switchView(viewId: string) {
    //   // 兼容旧代码，重定向到 navigateTo
    //   this.navigateTo(viewId)
    // },
    resetFilterData() {
      this.currentFilterData = {
        filters: []
      }
    },
    updateFilterData(filterData) {
      this.currentFilterData = { ...this.currentFilterData, ...filterData }
      // 数据更新后取消加载状态
      this.isFilterSidebarLoading = false
    },
    onFilterSelect({ filterKey, itemName }) {
      console.log('App.vue onFilterSelect:', filterKey, itemName)
      // 直接转发事件到当前页面，不处理筛选器状态
      this.notifyCurrentView('filter-select', { filterKey, itemName })
    },
    onFilterExclude({ filterKey, itemName }) {
      console.log('App.vue onFilterExclude:', filterKey, itemName)
      // 直接转发事件到当前页面，不处理筛选器状态
      this.notifyCurrentView('filter-exclude', { filterKey, itemName })
    },
    onFilterClear(filterKey) {
      console.log('App.vue onFilterClear:', filterKey)
      // 直接转发事件到当前页面，不处理筛选器状态
      this.notifyCurrentView('filter-clear', filterKey)
    },
    notifyCurrentView(event, data) {
      // 通知当前页面筛选器状态变化（通过 router-view 获取当前组件）
      const routerView = this.$refs.routerView as any
      if (routerView && routerView.$vnode && routerView.$vnode.componentInstance) {
        const currentViewRef = routerView.$vnode.componentInstance
        if (currentViewRef.$refs && currentViewRef.$refs.innerView) {
          const innerView = currentViewRef.$refs.innerView
          if (innerView && innerView.handleFilterEvent) {
            innerView.handleFilterEvent(event, data)
          }
          if (innerView && innerView.updateFilterData) {
            innerView.updateFilterData()
          }
        } else if (currentViewRef.handleFilterEvent) {
        currentViewRef.handleFilterEvent(event, data)
      }
      if (currentViewRef && currentViewRef.updateFilterData) {
        currentViewRef.updateFilterData()
      }
      }
    },
    // 全局游戏运行状态管理方法（仅使用 store）
    addRunningGame(gameInfo) {
      // 添加游戏到 store（不再需要 initialPlayTime，使用时直接从 game.playTime 获取）
      this.gameRunningStore.addRunningGame({
        id: gameInfo.id,
        pid: gameInfo.pid,
        windowTitles: gameInfo.windowTitles || [],
        gameName: gameInfo.gameName || null
      })
      
      console.log('✅ 添加运行游戏:', gameInfo.id, '当前运行游戏:', this.gameRunningStore.runningGameIds)
    },
    removeRunningGame(gameId) {
      console.log(`[DEBUG] 🗑️ removeRunningGame 被调用，gameId: ${gameId}`)
      
      // 通过事件通知 GameView 计算并更新最终总时长（GameView 中有 game.playTime）
      window.dispatchEvent(new CustomEvent('game-request-final-playtime', {
        detail: { gameId }
      }))
      
      this.gameRunningStore.removeRunningGame(gameId)
      console.log(`[DEBUG] ✅ 已从 store 中移除 gameId: ${gameId}，当前运行游戏:`, this.gameRunningStore.runningGameIds)
    },
    isGameRunning(gameId) {
      return this.gameRunningStore.isGameRunning(gameId)
    },
    // 更新游戏时长（通过事件通知，发送总时长，不累加）
    updateGamePlayTime(gameId, totalPlayTime, shouldSave = false) {
      // 发送自定义事件，让 GameView 直接设置总时长（不累加）
      window.dispatchEvent(new CustomEvent('game-playtime-update', {
        detail: {
          gameId,
          totalPlayTime, // 总时长，不是增量
          shouldSave
        }
      }))
      
      // 如果需要保存，通过事件通知保存
        if (shouldSave) {
        window.dispatchEvent(new CustomEvent('game-playtime-save', {
          detail: { gameId }
        }))
          }
    },
    // 更新运行游戏的窗口标题列表
    async updateRunningGamesWindowTitles() {
      if (!window.electronAPI || !window.electronAPI.getAllWindowTitlesByPID) {
        console.log('无法更新窗口标题：Electron API 不可用')
        return
      }
      
      const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
      const runningGamesToUpdate: Array<[string, any]> = Array.from(runningGamesMap.entries())
      
      for (const [gameId, runtimeGameData] of runningGamesToUpdate) {
        try {
          // 获取进程的所有窗口标题
          const result = await window.electronAPI.getAllWindowTitlesByPID(runtimeGameData.pid)
          
          if (result.success && result.windowTitles && result.windowTitles.length > 0) {
            // 检查是否有新的窗口标题
            const oldTitles = runtimeGameData.windowTitles || []
            const newTitles = result.windowTitles.filter(title => title && title.trim())
            
            // 合并去重，保留所有窗口标题
            const allTitles = [...new Set([...oldTitles, ...newTitles])]
            
            // 如果有新增的窗口标题，更新数据
            if (allTitles.length !== oldTitles.length || 
                allTitles.some(title => !oldTitles.includes(title))) {
              this.gameRunningStore.updateGameWindowTitles(gameId, allTitles)
              console.log(`✅ 更新游戏 ${runtimeGameData.gameName || gameId} 的窗口标题列表:`, allTitles)
            }
          }
        } catch (error) {
          console.warn(`更新游戏 ${runtimeGameData.gameName || gameId} 窗口标题失败:`, error.message)
          // 出错时不影响其他游戏，继续处理
        }
      }
    },
    // 检查所有游戏的运行状态（不依赖 GameView，只检查进程）
    async checkAllGamesRunningStatus() {
      if (!window.electronAPI || !window.electronAPI.getAllWindowTitlesByPID) {
        console.log('无法检查游戏运行状态：Electron API 不可用')
        return
      }
      
      const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
      const runningGamesSize = runningGamesMap.size
      console.log(`[DEBUG] 🔍 开始检查所有游戏的运行状态，当前运行游戏数量: ${runningGamesSize}`)
      const runningGamesToCheck: Array<[string, any]> = Array.from(runningGamesMap.entries())
      console.log(`[DEBUG] 📋 待检查的游戏列表:`, runningGamesToCheck.map(([id, data]) => ({ id, pid: data.pid, gameName: data.gameName })))
      
      for (const [gameId, runtimeGameData] of runningGamesToCheck) {
        try {
          // 通过 PID 检查游戏进程是否还在运行（尝试获取窗口标题，如果失败说明进程已结束）
          console.log(`[DEBUG] 🔍 检查游戏 ${runtimeGameData.gameName || gameId} (ID: ${gameId}, PID: ${runtimeGameData.pid}) 的运行状态...`)
          const result = await window.electronAPI.getAllWindowTitlesByPID(runtimeGameData.pid)
          console.log(`[DEBUG] 📋 getAllWindowTitlesByPID 结果:`, { success: result.success, windowTitles: result.windowTitles, error: result.error })
          
          if (!result.success) {
            // 无法获取窗口标题，可能是进程已结束
            // 如果之前有窗口标题但现在获取不到，可能是进程结束了
            console.log(`[DEBUG] ⚠️ 无法获取窗口标题，之前记录的窗口标题:`, runtimeGameData.windowTitles)
            if (runtimeGameData.windowTitles && runtimeGameData.windowTitles.length > 0) {
              // 之前有窗口，现在获取不到，可能是进程结束了
              console.log(`[DEBUG] 🔴 游戏 ${runtimeGameData.gameName || gameId} 进程已结束（之前有窗口但现在获取不到），从运行列表中移除`)
              this.removeRunningGame(gameId)
            } else {
              console.log(`[DEBUG] ⚠️ 游戏 ${runtimeGameData.gameName || gameId} 之前没有窗口标题，无法判断进程是否结束，保留运行状态`)
            }
          } else {
            console.log(`[DEBUG] ✅ 游戏 ${runtimeGameData.gameName || gameId} 进程仍在运行，窗口标题:`, result.windowTitles)
          }
        } catch (error) {
          console.error(`[DEBUG] ❌ 检查游戏 ${runtimeGameData.gameName || gameId} 运行状态失败:`, error)
          // 出错时保守处理，保留运行状态
        }
      }
      
      console.log('游戏运行状态检查完成，正在运行的游戏:', this.gameRunningStore.runningGameIds)
    },
    // 启动定期检查运行状态
    startPeriodicStatusCheck() {
      // 先清理旧的定时器
      if (this.statusCheckIntervalId !== null) {
        clearInterval(this.statusCheckIntervalId)
      }
      
      // 定时器由 App.vue 管理，因为需要调用 App.vue 的方法
      this.statusCheckIntervalId = window.setInterval(async () => {
        const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
        if (runningGamesMap.size > 0) {
          console.log('定期检查游戏运行状态...')
          await this.checkAllGamesRunningStatus()
          // 同时更新窗口标题列表（检测新创建的窗口）
          await this.updateRunningGamesWindowTitles()
        }
      }, 3000) // 3秒
    },
    // 启动定期更新游戏时长
    startPeriodicPlaytimeUpdate() {
      console.log(`[startPeriodicPlaytimeUpdate] 🚀 启动定期更新游戏时长`)
      
      // 先清理旧的定时器
      if (this.playtimeUpdateIntervalId !== null) {
        console.log(`[startPeriodicPlaytimeUpdate] 清理旧的更新定时器:`, this.playtimeUpdateIntervalId)
        clearInterval(this.playtimeUpdateIntervalId)
      }
      if (this.playtimeSaveIntervalId !== null) {
        console.log(`[startPeriodicPlaytimeUpdate] 清理旧的保存定时器:`, this.playtimeSaveIntervalId)
        clearInterval(this.playtimeSaveIntervalId)
      }
      
      // 每1秒更新一次游戏时长（只更新内存）
      this.playtimeUpdateIntervalId = window.setInterval(() => {
        const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
        const runningGamesCount = runningGamesMap.size
        // console.log(`[定时器-更新] 检查运行游戏数量:`, runningGamesCount)
        
        if (runningGamesCount > 0) {
          // console.log(`[定时器-更新] 有运行游戏，调用 updateRunningGamesPlaytime`)
          this.updateRunningGamesPlaytime()
        } else {
          // console.log(`[定时器-更新] 没有运行游戏，跳过`)
        }
      }, 1000) // 1秒
      
      console.log(`[startPeriodicPlaytimeUpdate] ✅ 更新定时器已启动:`, this.playtimeUpdateIntervalId)
      
      // 每1分钟保存一次游戏时长
      this.playtimeSaveIntervalId = window.setInterval(() => {
        const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
        const runningGamesCount = runningGamesMap.size
        console.log(`[定时器-保存] 检查运行游戏数量:`, runningGamesCount)
        
        if (runningGamesCount > 0) {
          console.log(`[定时器-保存] 有运行游戏，调用 saveRunningGamesPlaytime`)
          this.saveRunningGamesPlaytime()
        } else {
          console.log(`[定时器-保存] 没有运行游戏，跳过`)
        }
      }, 60000) // 60秒 = 1分钟
      
      console.log(`[startPeriodicPlaytimeUpdate] ✅ 保存定时器已启动:`, this.playtimeSaveIntervalId)
    },
    // 更新正在运行游戏的时长（通过事件通知 GameView 计算并更新）
    updateRunningGamesPlaytime() {
      const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
      
      if (runningGamesMap.size === 0) {
        return
      }
      
      // 通过事件通知 GameView 更新所有运行中游戏的时长（GameView 中有 game.playTime，可以直接计算）
      for (const [gameId] of runningGamesMap) {
        window.dispatchEvent(new CustomEvent('game-request-update-playtime', {
          detail: { gameId }
        }))
      }
    },
    // 保存正在运行游戏的时长（每1分钟执行一次）
    async saveRunningGamesPlaytime() {
      // 通过事件通知 GameView 保存数据
      const runningGamesMap = this.gameRunningStore.getRunningGamesMap()
      for (const [gameId] of runningGamesMap) {
        window.dispatchEvent(new CustomEvent('game-playtime-save', {
          detail: { gameId }
        }))
      }
    },
    // 停止定期检查
    stopPeriodicStatusCheck() {
      if (this.statusCheckIntervalId !== null) {
        clearInterval(this.statusCheckIntervalId)
        this.statusCheckIntervalId = null
        console.log('已停止定期检查游戏运行状态')
      }
    },
    // 停止定期更新游戏时长
    stopPeriodicPlaytimeUpdate() {
      if (this.playtimeUpdateIntervalId !== null) {
        clearInterval(this.playtimeUpdateIntervalId)
        this.playtimeUpdateIntervalId = null
        console.log('已停止定期更新游戏时长')
      }
      if (this.playtimeSaveIntervalId !== null) {
        clearInterval(this.playtimeSaveIntervalId)
        this.playtimeSaveIntervalId = null
        console.log('已停止定期保存游戏时长')
      }
    },
    // 开始应用使用时长跟踪
    async startAppUsageTracking() {
      try {
        await saveManager.startUsageTracking()
        this.appSessionStartTime = new Date()
        console.log('应用使用时长跟踪已开始')
      } catch (error) {
        console.error('开始应用使用时长跟踪失败:', error)
      }
    },
    // 停止应用使用时长跟踪
    async stopAppUsageTracking() {
      try {
        await saveManager.endUsageTracking()
        this.appSessionStartTime = null
        console.log('应用使用时长跟踪已停止')
      } catch (error) {
        console.error('停止应用使用时长跟踪失败:', error)
      }
    },
    getCurrentViewTitle() {
      const route = this.$route
      if (route.meta?.title) {
        return route.meta.title as string
      }
      const config = this.viewConfig[route.name as string]
      return config?.name || '未知页面'
    },
    getCurrentViewDescription() {
      const route = this.$route
      if (route.meta?.description) {
        return route.meta.description as string
      }
      const config = this.viewConfig[route.name as string]
      return config?.description || '无描述'
    },
    onAudioStarted(audio) {
      console.log('🎵 全局音频播放器开始播放:', audio.name)
      // 可以在这里添加额外的逻辑，比如显示通知等
    },
    onPlaylistEnded() {
      console.log('🏁 播放列表播放完毕')
      // 可以在这里添加播放列表结束后的逻辑
    },
    async saveCurrentView(viewId: string) {
      try {
        const settings = await saveManager.loadSettings()
        if (settings) {
          settings.lastView = viewId
          await saveManager.saveSettings(settings)
          console.log('✅ 已保存最后访问页面:', viewId)
        }
      } catch (error) {
        console.warn('保存最后访问页面失败:', error)
      }
    },
    async loadLastView() {
      try {
        const settings = await saveManager.loadSettings()
        if (settings && settings.lastView) {
          // 验证页面ID是否有效（从配置中获取所有有效的视图ID）
          const validViews = Object.keys(this.viewConfig)
          if (validViews.includes(settings.lastView)) {
            console.log('✅ 加载最后访问页面:', settings.lastView)
            return settings.lastView
          }
        }
      } catch (error) {
        console.warn('加载最后访问页面失败:', error)
      }
      return 'home' // 默认返回主页
    },
    
    
    // 加载自动备份设置
    async loadAutoBackupSettings() {
      try {
        const settings = await saveManager.loadSettings()
        if (settings) {
          // 如果开启了自动备份，使用设置的时间间隔，否则为0
          if (settings.autoBackupEnabled) {
            this.autoBackupInterval = settings.autoBackupInterval || 5
          } else {
            this.autoBackupInterval = 0
          }
          console.log('✅ 已加载自动备份设置:', settings.autoBackupEnabled ? `${this.autoBackupInterval} 分钟` : '已禁用')
          
          // 启动自动备份定时器
          this.startAutoBackupTimer()
        }
      } catch (error) {
        console.warn('加载自动备份设置失败:', error)
      }
    },
    
    // 检测 WinRAR 是否已安装
    async checkWinRARInstallation() {
      try {
        if (window.electronAPI && window.electronAPI.checkWinRARInstalled) {
          const result = await window.electronAPI.checkWinRARInstalled()
          
          if (result.success) {
            this.winRARInstalled = result.installed
            this.winRARPath = result.path || null
            this.winRARExecutable = result.executable || null
            
            if (result.installed) {
              console.log('✅ WinRAR 已安装:', result.path)
              console.log('   可执行文件:', result.executable)
            } else {
              console.log('❌ WinRAR 未安装')
            }
          } else {
            console.warn('检测 WinRAR 安装状态失败:', result.error)
            this.winRARInstalled = false
            this.winRARPath = null
            this.winRARExecutable = null
          }
        } else {
          console.warn('WinRAR 检测 API 不可用')
        }
      } catch (error) {
        console.error('检测 WinRAR 安装状态异常:', error)
        this.winRARInstalled = false
        this.winRARPath = null
        this.winRARExecutable = null
      }
    },
    
    // 执行自动备份
    async performAutoBackup() {
      try {
        console.log('🔄 开始执行自动备份...')
        // 获取保留备份数量设置
        const settings = await saveManager.loadSettings()
        const maxBackups = settings?.maxBackupCount || 5
        const result = await saveManager.backupEntireSaveData(maxBackups)
        if (result.success) {
          this.lastBackupTime = new Date()
          console.log('✅ 自动备份成功:', result.backupPath)
          // 显示通知
          if (this.$refs.toastNotification) {
            this.$refs.toastNotification.show('success', '自动备份成功', `存档已备份到: ${result.backupPath}`)
          }
        } else {
          console.error('❌ 自动备份失败:', result.error)
          if (this.$refs.toastNotification) {
            this.$refs.toastNotification.show('error', '自动备份失败', result.error)
          }
        }
      } catch (error) {
        console.error('执行自动备份失败:', error)
        if (this.$refs.toastNotification) {
          this.$refs.toastNotification.show('error', '自动备份失败', error.message)
        }
      }
    },
    
    // 启动自动备份定时器
    startAutoBackupTimer() {
      // 先停止现有的定时器
      this.stopAutoBackupTimer()
      
      // 如果时间间隔为0，则不启动定时器
      if (this.autoBackupInterval <= 0) {
        console.log('自动备份已禁用')
        return
      }
      
      // 转换为毫秒
      const intervalMs = this.autoBackupInterval * 60 * 1000
      
      console.log(`启动自动备份定时器，间隔: ${this.autoBackupInterval} 分钟 (${intervalMs} 毫秒)`)
      
      // 启动定时器
      this.autoBackupTimer = setInterval(() => {
        this.performAutoBackup()
      }, intervalMs)
    },
    
    // 停止自动备份定时器
    stopAutoBackupTimer() {
      if (this.autoBackupTimer) {
        clearInterval(this.autoBackupTimer)
        this.autoBackupTimer = null
        console.log('已停止自动备份定时器')
      }
    },
    
  },
  async mounted() {
    // 读取版本号
    try {
      const packageJson = await import('../package.json')
      this.version = packageJson.version || '0.0.0'
    } catch (error) {
      console.warn('无法读取版本号:', error)
      this.version = '0.0.0'
    }

    // 首先初始化存档系统
    try {
      console.log('正在初始化存档系统...')
      const initSuccess = await saveManager.initialize()
      if (initSuccess) {
        console.log('✅ 存档系统初始化成功')
        this.isInitialized = true // 标记初始化完成
      } else {
        console.warn('⚠️ 存档系统初始化失败，但应用将继续运行')
        this.isInitialized = true // 即使失败也标记为完成，避免阻塞
      }
    } catch (error) {
      console.error('存档系统初始化出错:', error)
      this.isInitialized = true // 即使出错也标记为完成，避免阻塞
    }

    // 初始化自定义页面管理器
    try {
      await customPageManager.init()
      await this.reloadCustomPages()
      console.log('自定义页面初始化成功:', this.pages.length, '个页面')
    } catch (error) {
      console.error('自定义页面初始化失败:', error)
    }

    // 加载最后访问的页面
    try {
      const lastView = await this.loadLastView()
      // 检查路由是否存在
      const route = this.$router.resolve({ name: lastView })
      if (route.name) {
        this.$router.push({ name: lastView }).catch(() => {
          // 如果路由不存在，跳转到主页
          this.$router.push({ name: 'home' })
        })
      console.log('🎯 已设置当前页面为:', lastView)
      } else {
        this.$router.push({ name: 'home' })
      }
    } catch (error) {
      console.warn('加载最后访问页面失败，使用默认页面:', error)
      this.$router.push({ name: 'home' })
    }

    // 监听路由变化，更新筛选器状态
    this.$watch(
      () => this.$route,
      (route) => {
        if (route.name) {
          const requiresFilter = route.meta?.requiresFilter === true
          this.showFilterSidebar = requiresFilter
          this.resetFilterData()
          this.isFilterSidebarLoading = requiresFilter
          
          // 保存当前页面
          this.saveCurrentView(route.name as string)
          
          // 如果是有筛选器的页面，需要手动触发筛选器数据更新
          if (requiresFilter) {
            this.$nextTick(() => {
              const routerView = this.$refs.routerView as any
              if (routerView && routerView.$vnode && routerView.$vnode.componentInstance) {
                const currentViewRef = routerView.$vnode.componentInstance
                if (currentViewRef.$refs && currentViewRef.$refs.innerView) {
                  const innerView = currentViewRef.$refs.innerView
                  if (innerView && innerView.updateFilterData) {
                    innerView.updateFilterData()
                  }
                } else if (currentViewRef && currentViewRef.updateFilterData) {
                  currentViewRef.updateFilterData()
                }
              }
            })
          }
        }
      },
      { immediate: true }
    )

    // 初次进入带筛选器的页面时，显示加载状态并主动触发一次筛选器数据刷新
    this.resetFilterData()
    this.isFilterSidebarLoading = this.showFilterSidebar
    if (this.showFilterSidebar) {
      this.$nextTick(() => {
        const routerView = this.$refs.routerView as any
        if (routerView && routerView.$vnode && routerView.$vnode.componentInstance) {
          const currentViewRef = routerView.$vnode.componentInstance
          if (currentViewRef.$refs && currentViewRef.$refs.innerView) {
            const innerView = currentViewRef.$refs.innerView
            if (innerView && innerView.updateFilterData) {
              innerView.updateFilterData()
            }
          } else if (currentViewRef && currentViewRef.updateFilterData) {
          currentViewRef.updateFilterData()
          }
        }
      })
    }
    
    // 初始化通知服务
    try {
      notificationService.init(this.$refs.toastNotification)
    } catch (error) {
      console.error('通知服务初始化失败:', error)
    }

    // 加载主题设置
    await this.theme.loadTheme()
      
      // 加载个性化设置
    await this.personalization.loadPersonalization()
      
      // 加载背景图片设置
    await this.backgroundImage.loadBackgroundImage()
    
    // 初始化个性化设置事件监听
    const cleanupPersonalization = this.personalization.initPersonalizationListener()
    this.setCleanupPersonalization(cleanupPersonalization)
    
    // 初始化背景图片事件监听
    const cleanupBackgroundImage = this.backgroundImage.initBackgroundImageListener()
    this.setCleanupBackgroundImage(cleanupBackgroundImage)

    await this.checkFirstLoginAchievement()

    // 在后台异步打印磁盘信息，不阻塞启动流程
    this.printDiskInfo().catch(error => {
      console.error('后台获取磁盘信息失败:', error)
    })

    // 启动游戏运行状态检查
    this.startPeriodicStatusCheck()

    // 在应用空闲时预热各资源页面
    this.prefetchResourceViews()
    
    // 启动游戏时长更新
    this.startPeriodicPlaytimeUpdate()
    
    // 监听 GameView 返回的初始 playTime
    window.addEventListener('game-initial-playtime-response', ((event: CustomEvent) => {
      const { gameId, initialPlayTime } = event.detail
      this.gameRunningStore.updateInitialPlayTime(gameId, initialPlayTime)
      console.log(`[App.vue] 收到游戏 ${gameId} 初始时长: ${initialPlayTime} 秒`)
    }) as EventListener)
    
    // 开始应用使用时长跟踪
    await this.startAppUsageTracking()
    
    // 加载安全键设置
    await this.safetyKey.loadSafetyKeySettings()
    
    // 初始化安全键监听
    const cleanup = this.safetyKey.initSafetyKeyListener()
    this.setCleanupSafetyKeyListener(cleanup)
    
    // 加载自动备份设置
    await this.loadAutoBackupSettings()
    
    // 检测 WinRAR 安装状态
    await this.checkWinRARInstallation()
    
    // 监听自动备份时间间隔变化事件
    window.addEventListener('auto-backup-interval-changed', async (event: CustomEvent) => {
      const { interval } = event.detail
      this.autoBackupInterval = interval || 0
      console.log('自动备份时间间隔已更新:', this.autoBackupInterval, '分钟')
      this.startAutoBackupTimer()
    })

    // 监听页面管理变更（设置页新增/隐藏/排序后刷新导航）
    window.addEventListener('custom-pages-updated', () => {
      this.reloadCustomPages()
    })
    
    // 所有初始化完成，隐藏加载提示
    this.isLoading = false
    console.log('✅ 应用初始化完成')
  },
  beforeUnmount() {
    // 停止定期检查游戏运行状态
    this.stopPeriodicStatusCheck()
    
    // 停止定期更新游戏时长
    this.stopPeriodicPlaytimeUpdate()
    
    // 停止应用使用时长跟踪
    this.stopAppUsageTracking()
    
    // 停止自动备份定时器
    this.stopAutoBackupTimer()
    
    // 清理安全键监听
    const cleanupSafetyKey = this.getCleanupSafetyKeyListener()
    if (cleanupSafetyKey) {
      cleanupSafetyKey()
    }
    
    // 清理个性化设置监听
    const cleanupPersonalization = this.getCleanupPersonalization()
    if (cleanupPersonalization) {
      cleanupPersonalization()
    }
    
    // 清理背景图片监听
    const cleanupBackgroundImage = this.getCleanupBackgroundImage()
    if (cleanupBackgroundImage) {
      cleanupBackgroundImage()
    }
    
    // 禁用安全键（清理全局快捷键）
    this.safetyKey.disableSafetyKey().catch((error) => {
        console.error('禁用安全键失败:', error)
      })
  }
}
</script>

<style scoped>
/* 内容区域布局 */
.content-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content-body.with-filter {
  display: flex;
}

.page-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.page-content.has-background::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: var(--bg-image-url);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  z-index: 0;
  opacity: 0.3;
  mix-blend-mode: multiply;/* 混合模式：乘法，使背景图片更暗 */
  pointer-events: none;
}

.page-content.has-background > * {
  position: relative;
  z-index: 1;
}


.sidebar-logo{
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin: 0 auto;
  display: block;
  margin-bottom: 8px;
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);
  transition: all 0.3s ease;
  cursor: pointer;
}
/* 筛选器侧边栏样式 */
.filter-sidebar-container {
  display: flex;
  flex-direction: column;
  width: 250px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  transition: background-color 0.3s ease;
  flex-shrink: 0;
}

/* 版本号样式 */
.version {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  opacity: 0.8;
  font-weight: 400;
}

/* 加载中样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  transition: opacity 0.3s ease;
}

.loading-content {
  text-align: center;
  color: var(--text-primary);
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid var(--border-color);
  border-top: 4px solid var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

.loading-content h2 {
  margin: 0 0 10px 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.loading-content p {
  margin: 0;
  font-size: 1rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
