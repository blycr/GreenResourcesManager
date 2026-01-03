<template>
  <BaseView ref="baseView" :items="games" :filtered-items="filteredGames" :empty-state-config="gameEmptyStateConfig"
    :toolbar-config="gameToolbarConfig" :context-menu-items="gameContextMenuItems"
    :pagination-config="gamePaginationConfig" :sort-by="sortBy" :search-query="searchQuery"
    :scale="scale" :show-layout-control="true" @update:scale="updateScale"
    @empty-state-action="handleEmptyStateAction" @add-item="showAddGameDialog" @sort-changed="handleSortChanged"
    @search-query-changed="handleSearchQueryChanged" @sort-by-changed="handleSortByChanged"
    @context-menu-click="handleContextMenuClick" @page-change="handleGamePageChange">
    <!-- 主内容区域 -->
    <div class="game-content" @drop="handleDrop" @dragover="handleDragOver" @dragenter="handleDragEnter"
      @dragleave="handleDragLeave" :class="{ 'drag-over': dragDropComposable?.isDragOver || false }">


      <!-- 游戏网格 -->
      <GameGrid 
        :games="paginatedGames"
        :is-game-running="isGameRunning"
        :is-electron-environment="isElectronEnvironment"
        :scale="scale"
        :layout-styles="layoutStyles"
        @game-click="showGameDetail"
        @game-contextmenu="handleGameContextMenu"
        @game-action="launchGame"
      />


      <!-- 添加游戏对话框 -->
      <AddGameDialog 
        :visible="showAddDialog" 
        :is-electron-environment="isElectronEnvironment"
        @close="closeAddGameDialog"
        @confirm="handleAddGameConfirm"
      />

      <!-- 编辑游戏对话框 -->
      <EditGameDialog 
        :visible="showEditDialog" 
        :game="currentGame"
        :is-electron-environment="isElectronEnvironment"
        @close="closeEditGameDialog"
        @confirm="handleEditGameConfirm"
      />

      <!-- 游戏详情页面 -->
      <GameDetailPanel 
        :visible="showDetailModal" 
        :game="currentGame"
        :is-running="currentGame ? isGameRunning(currentGame) : false"
        @close="closeGameDetail"
        @action="handleDetailAction"
        @update-rating="handleUpdateRating"
        @update-comment="handleUpdateComment"
        @toggle-favorite="handleToggleFavorite"
      />


      <!-- 路径更新确认对话框 -->
      <PathUpdateDialog :visible="showPathUpdateDialog" title="更新游戏路径" description="发现同名但路径不同的游戏文件："
        item-name-label="游戏名称" :item-name="pathUpdateInfo.existingGame?.name || ''"
        :old-path="pathUpdateInfo.existingGame?.executablePath || ''" :new-path="pathUpdateInfo.newPath || ''"
        missing-label="文件丢失" found-label="文件存在" question="是否要更新游戏路径？" @confirm="confirmPathUpdate"
        @cancel="closePathUpdateDialog" />

      <!-- 强制结束游戏确认对话框 -->
      <div v-if="showTerminateConfirmDialog" class="modal-overlay" @click="closeTerminateConfirmDialog">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>强制结束游戏</h3>
            <button class="btn-close" @click="closeTerminateConfirmDialog">✕</button>
          </div>
          <div class="modal-body">
            <p>确定要强制结束游戏 <strong>{{ gameToTerminate?.name }}</strong> 吗？</p>
            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 10px;">
              此操作将立即终止游戏进程，未保存的数据可能会丢失。
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeTerminateConfirmDialog">取消</button>
            <button class="btn-confirm" @click="confirmTerminateGame" style="background: #ef4444;">确认结束</button>
          </div>
        </div>
      </div>

      <!-- 密码输入对话框 -->
      <PasswordInputDialog
        :visible="showPasswordDialog"
        :title="passwordDialogTitle"
        :message="passwordDialogMessage"
        @confirm="handlePasswordConfirm"
        @cancel="handlePasswordCancel"
      />
    </div>
  </BaseView>
</template>

<script lang="ts">
import BaseView from '../../components/BaseView.vue'
import EmptyState from '../../components/EmptyState.vue'
import MediaCard from '../../components/MediaCard.vue'
import FormField from '../../components/FormField.vue'
import PathUpdateDialog from '../../components/PathUpdateDialog.vue'
import PasswordInputDialog from '../../components/PasswordInputDialog.vue'
import AddGameDialog from '../../components/game/AddGameDialog.vue'
import EditGameDialog from '../../components/game/EditGameDialog.vue'
import GameDetailPanel from '../../components/game/GameDetailPanel.vue'
import GameGrid from '../../components/game/GameGrid.vue'
import { formatPlayTime, formatLastPlayed, formatDateTime, formatDate, formatFirstPlayed } from '../../utils/formatters'

import saveManager from '../../utils/SaveManager.ts'
import notify from '../../utils/NotificationService.ts'
import alertService from '../../utils/AlertService.ts'
import confirmService from '../../utils/ConfirmService.ts'
import { ref, toRefs, PropType } from 'vue'
import { PageConfig } from '../../types/page'
import { GameSortBy } from '../../types/game'
import { useGameFilter } from '../../composables/game/useGameFilter'
import { useGameManagement } from '../../composables/game/useGameManagement'
import { useGameScreenshot } from '../../composables/game/useGameScreenshot'
import { useGameRunning } from '../../composables/game/useGameRunning'
import { useGamePlayTime } from '../../composables/game/useGamePlayTime'
import { usePagination } from '../../composables/usePagination'
import { useGameDragAndDrop, isArchiveFile } from '../../composables/game/useGameDragAndDrop'
import { useGameRunningStore } from '../../stores/game-running'
import { useDisplayLayout } from '../../composables/useDisplayLayout'

export default {
  name: 'GameView',
  components: {
    BaseView,
    EmptyState,
    MediaCard,
    FormField,
    PathUpdateDialog,
    AddGameDialog,
    EditGameDialog,
    GameDetailPanel,
    GameGrid
  },
  props: {
    pageConfig: {
      type: Object as PropType<PageConfig>,
      default: () => ({ id: 'games', type: 'Game' })
    }
  },
  emits: ['filter-data-updated'],
  setup(props) {
    // 响应式数据
    const games = ref([])
    const isElectronEnvironment = ref(false)
    const searchQuery = ref('')
    const sortBy = ref<GameSortBy>('name-asc')

    // 使用显示布局 composable
    const displayLayoutComposable = useDisplayLayout(80, 400)

    // 获取父组件方法的辅助函数（在 Options API 中通过 this.$parent 访问）
    // 注意：这些函数会在组件实例化后通过 methods 中的包装方法设置
    let getRunningGamesFn: () => Map<string, any> = () => gameRunningStore.getRunningGamesMap()
    let isGameRunningFn: (gameId: string) => boolean = (gameId) => gameRunningStore.isGameRunning(gameId)

    // 创建用于筛选的 isGameRunning 函数（接受 Game 对象）
    // 直接使用 store，确保总是获取最新的运行状态
    const isGameRunningForFilter = (game: any) => {
      return gameRunningStore.isGameRunning(game.id)
    }

    // 使用筛选 composable
    const filterComposable = useGameFilter(games, searchQuery, sortBy, isGameRunningForFilter)

    // 使用管理 composable
    const managementComposable = useGameManagement(
      games,
      filterComposable.extractAllTags,
      isElectronEnvironment,
      props.pageConfig.id
    )

    // 使用游戏运行状态 store（暴露给组件使用）
    const gameRunningStore = useGameRunningStore()

    // 获取父组件方法的辅助函数（在 Options API 中通过 this.$parent 访问）
    // 注意：这些函数会在组件实例化后通过 methods 中的包装方法设置
    let addRunningGameFn: (gameInfo: any) => void = (gameInfo) => gameRunningStore.addRunningGame(gameInfo)
    let removeRunningGameFn: (gameId: string) => void = (gameId) => gameRunningStore.removeRunningGame(gameId)

    // 使用截图 composable
    const screenshotComposable = useGameScreenshot(
      isElectronEnvironment,
      () => getRunningGamesFn()
    )

    // 使用运行状态 composable
    const runningComposable = useGameRunning(
      games,
      () => getRunningGamesFn(),
      (gameInfo) => addRunningGameFn(gameInfo),
      (gameId) => removeRunningGameFn(gameId)
    )

    // 使用游戏时长 composable
    const playTimeComposable = useGamePlayTime(
      games,
      managementComposable.updateGamePlayTime,
      managementComposable.updateGame,
      managementComposable.checkGameTimeAchievements,
      (gameId) => removeRunningGameFn(gameId)
    )

    // 使用分页 composable
    const paginationComposable = usePagination(
      filterComposable.filteredGames,
      20,
      '游戏'
    )

    // 拖拽相关函数（需要在组件实例化后设置）
    let showPathUpdateDialogFn: (info: { existingGame: any; newPath: string; newFileName: string }) => void = () => {}
    let addGameFn: (game: any) => Promise<void> = async () => {}

    // 使用拖拽 composable（延迟初始化，因为需要访问组件方法）
    const dragDropComposable = ref<ReturnType<typeof useGameDragAndDrop> | null>(null)

    return {
      // 数据
      games,
      isElectronEnvironment,
      searchQuery,
      sortBy,
      // 筛选相关
      ...toRefs(filterComposable),
      ...filterComposable,
      // 管理相关
      ...toRefs(managementComposable),
      ...managementComposable,
      // 显示布局相关
      ...displayLayoutComposable,
      // 截图相关
      ...toRefs(screenshotComposable),
      ...screenshotComposable,
      // 运行状态相关
      ...runningComposable,
      // 游戏时长相关
      ...playTimeComposable,
      // 暴露 gameRunningStore 供组件使用
      gameRunningStore,
      // 分页相关
      ...toRefs(paginationComposable),
      ...paginationComposable,
      // 拖拽相关（延迟初始化）
      dragDropComposable,
      // 内部函数设置器（供 mounted 使用）
      _setDragDropFunctions: (functions: {
        showPathUpdateDialog: (info: { existingGame: any; newPath: string; newFileName: string }) => void
        addGame: (game: any) => Promise<void>
      }) => {
        showPathUpdateDialogFn = functions.showPathUpdateDialog
        addGameFn = functions.addGame
        
        // 初始化拖拽 composable（传入响应式的 games）
        dragDropComposable.value = useGameDragAndDrop({
          games: games, // 传入 ref，composable 内部会处理
          onAddGame: addGameFn,
          onShowPathUpdateDialog: showPathUpdateDialogFn,
          isElectronEnvironment: isElectronEnvironment.value
        })
      },
      _setParentFunctions: (functions: {
        getRunningGames: () => Map<string, any>
        addRunningGame: (gameInfo: any) => void
        removeRunningGame: (gameId: string) => void
        isGameRunning: (gameId: string) => boolean
      }) => {
      
        const store = gameRunningStore
        getRunningGamesFn = () => store.getRunningGamesMap()
        addRunningGameFn = (gameInfo: any) => store.addRunningGame(gameInfo)
        removeRunningGameFn = (gameId: string) => store.removeRunningGame(gameId)
        isGameRunningFn = (gameId: string) => store.isGameRunning(gameId)
        
        // 更新筛选器中的 isGameRunning 函数
        // 注意：由于 filterComposable 已经创建，我们需要通过其他方式更新
        // 这里我们重新创建 filterComposable（但实际上 Vue 的响应式系统会自动处理）
      }
    }
  },
  data() {
    return {
      showAddDialog: false,
      selectedGame: null,
      showDetailModal: false,
      currentGame: null,
      // runningGames 现在由 App.vue 全局管理
      // isScreenshotInProgress 和 lastScreenshotTime 已移至 useGameScreenshot composable
      // 编辑相关状态
      showEditDialog: false,
      // 事件处理器（用于清理）
      handleGamePlaytimeUpdate: null as ((event: CustomEvent) => void) | null,
      handleGamePlaytimeSave: null as ((event: CustomEvent) => void) | null,
      handleRequestUpdatePlaytime: null as ((event: CustomEvent) => void) | null,
      handleRequestFinalPlaytime: null as ((event: CustomEvent) => void) | null,
      // 存储游戏启动时的初始 playTime（Map<gameId, initialPlayTime>）
      gameInitialPlayTimes: null as Map<string, number> | null,
      // 密码输入对话框
      showPasswordDialog: false,
      passwordDialogTitle: '输入密码',
      passwordDialogMessage: '该压缩包需要密码，请输入密码：',
      passwordDialogCallback: null, // 存储密码确认后的回调函数
      passwordDialogGame: null, // 存储需要解压的游戏
      passwordDialogOutputDir: null, // 存储输出目录
      passwordDialogTriedPasswords: [], // 存储已尝试的密码
      // 排序选项
      gameSortOptions: [
        { value: 'name', label: '按名称排序' },
        { value: 'lastPlayed', label: '按最后游玩时间' },
        { value: 'playTime', label: '按游戏时长' },
        { value: 'added', label: '按添加时间' }
      ],
      // 右键菜单基础配置
      baseGameContextMenuItems: [
        { key: 'detail', icon: '👁️', label: '查看详情' },
        { key: 'launch', icon: '▶️', label: '启动游戏' },
        { key: 'folder', icon: '📁', label: '打开文件夹' },
        { key: 'screenshot-folder', icon: '📸', label: '打开截图文件夹' },
        { key: 'update-folder-size', icon: '📊', label: '更新文件夹大小' },
        { 
          key: 'compress', 
          icon: '🗜️', 
          label: '压缩文件',
          children: [
            { key: 'compress-to', icon: '🗜️', label: '压缩到指定目录...' },
            { key: 'compress-here', icon: '🗜️', label: '压缩到当前目录' }
          ]
        },
        { 
          key: 'extract', 
          icon: '📦', 
          label: '解压文件',
          children: [
            { key: 'extract', icon: '📦', label: '解压到指定目录...' },
            { key: 'extract-here', icon: '📦', label: '解压到当前目录' }
          ]
        },
        { key: 'edit', icon: '✏️', label: '编辑信息' },
        { key: 'remove', icon: '🗑️', label: '删除游戏' }
      ],
      // 标签和开发商筛选相关已移至 composables
      // 拖拽相关已移至 useGameDragAndDrop composable
      // 路径更新确认对话框
      showPathUpdateDialog: false,
      pathUpdateInfo: {
        existingGame: null,
        newPath: '',
        newFileName: ''
      },
      // 强制结束游戏确认对话框
      showTerminateConfirmDialog: false,
      gameToTerminate: null,
      // 分页相关已移至 useGamePagination composable
      // 空状态配置
      gameEmptyStateConfig: {
        emptyIcon: '🎮',
        emptyTitle: '你的游戏库是空的',
        emptyDescription: '点击"添加游戏"按钮来添加你的第一个游戏，或直接拖拽游戏文件（.exe、.swf、.bat）或压缩包（.zip、.rar、.7z 等）到此处',
        emptyButtonText: '添加第一个游戏',
        emptyButtonAction: 'showAddGameDialog',
        noResultsIcon: '🔍',
        noResultsTitle: '没有找到匹配的游戏',
        noResultsDescription: '尝试使用不同的搜索词',
        noPageDataIcon: '📄',
        noPageDataTitle: '当前页没有游戏',
        noPageDataDescription: '请切换到其他页面查看游戏'
      },
      // 工具栏配置
      gameToolbarConfig: {
        addButtonText: '添加游戏',
        searchPlaceholder: '搜索游戏...',
        sortOptions: [
          { value: 'name-asc', label: '按名称排序（升序）' },
          { value: 'name-desc', label: '按名称排序（降序）' },
          { value: 'lastPlayed-asc', label: '按最后游玩时间（升序）' },
          { value: 'lastPlayed-desc', label: '按最后游玩时间（降序）' },
          { value: 'playTime-asc', label: '按游戏时长（升序）' },
          { value: 'playTime-desc', label: '按游戏时长（降序）' },
          { value: 'added-asc', label: '按添加时间（升序）' },
          { value: 'added-desc', label: '按添加时间（降序）' }
        ],
        pageType: 'games'
      }
    }
  },
  computed: {
    // filteredGames 已移至 useGameFilter composable
    // 分页相关已移至 useGamePagination composable
    // paginatedGames 现在通过 paginationComposable.paginatedItems 访问
    paginatedGames() {
      return this.paginatedItems || []
    },
    // gamePaginationConfig 现在通过 paginationComposable.paginationConfig 访问
    gamePaginationConfig() {
      return this.paginationConfig || {
        currentPage: 1,
        totalPages: 0,
        pageSize: 20,
        totalItems: 0,
        itemType: '游戏'
      }
    },
    // 动态生成右键菜单项（根据选中的游戏是否为压缩包）
    gameContextMenuItems() {
      // 基础菜单项
      const menuItems = [...this.baseGameContextMenuItems]
      
      // 如果当前选中的游戏是压缩包，确保"解压文件"选项存在
      // 如果不是压缩包，移除"解压文件"选项
      // 注意：这里无法直接获取当前选中的游戏，所以我们在 handleContextMenuClick 中处理
      // 但为了简化，我们始终显示"解压文件"选项，在点击时判断是否为压缩包
      
      return menuItems
    }
  },
  methods: {
    // checkGameCollectionAchievements 和 checkGameTimeAchievements 已移至 useGameManagement composable
    showAddGameDialog() {
      this.showAddDialog = true
    },
    closeAddGameDialog() {
      this.showAddDialog = false
    },
    async handleAddGameConfirm(game) {
      await this.addGame(game)
      this.closeAddGameDialog()
    },
    async launchGame(game) {
      try {
        // 检查是否为压缩包，压缩包不能运行
        const isArchive = game.isArchive || (game.executablePath && isArchiveFile(game.executablePath))
        if (isArchive) {
          notify.toast('warning', '无法运行', `压缩包文件无法直接运行。请先解压后再运行游戏。`)
          return
        }

        // 检查游戏是否正在运行
        if (this.isGameRunning(game)) {
          // 如果游戏正在运行，显示确认对话框
          this.showTerminateConfirmDialog = true
          this.gameToTerminate = game
          return
        }

        console.log('启动游戏:', game.name, game.executablePath)
        console.log('更新前 - lastPlayed:', game.lastPlayed)
        console.log('更新前 - playCount:', game.playCount)

        // 更新游戏统计（启动时也更新 lastPlayed，记录开始游玩的时间）
        const updates: any = {
          lastPlayed: new Date().toISOString(),
          playCount: (game.playCount || 0) + 1
        }

        // 如果是第一次启动，记录第一次游玩时间
        if (!game.firstPlayed) {
          updates.firstPlayed = new Date().toISOString()
          console.log(`游戏 ${game.name} 第一次启动，记录时间:`, updates.firstPlayed)
        }

        await this.updateGame(game.id, updates)
        console.log('更新后 - lastPlayed:', updates.lastPlayed)
        console.log('更新后 - playCount:', updates.playCount)
        console.log('游戏数据已保存')

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.launchGame) {
          console.log('使用 Electron API 启动游戏')
          const result = await window.electronAPI.launchGame(game.executablePath, game.name)

          if (result.success) {
            console.log('------------------------------')
            console.log('游戏启动成功，进程ID:', result.pid)
            console.log('游戏窗口标题列表:', result.windowTitles)
            console.log('------------------------------')

            // 将游戏添加到全局运行列表中（包含完整信息）
            this.addRunningGame({
              id: game.id,
              pid: result.pid,
              windowTitles: result.windowTitles || [],
              gameName: game.name
            })
            
            // 保存游戏启动时的初始 playTime
            if (!this.gameInitialPlayTimes) {
              this.gameInitialPlayTimes = new Map()
            }
            this.gameInitialPlayTimes.set(game.id, game.playTime || 0)

            // 显示成功提示
            notify.toast('success', '游戏启动成功', `${game.name} 已启动`)
          } else {
            console.error('游戏启动失败:', result.error)
            notify.toast('error', '游戏启动失败', `启动游戏失败: ${result.error}`)
            return
          }
        } else {
          // 提供更详细的错误信息
          let errorMessage = `无法启动游戏: ${game.name}\n\n`
          if (!this.isElectronEnvironment) {
            errorMessage += `❌ 错误：未检测到 Electron 环境\n`
            errorMessage += `当前环境：${navigator.userAgent.includes('Electron') ? 'Electron 但 API 未加载' : '浏览器环境'}\n\n`
            errorMessage += `解决方案：\n`
            errorMessage += `1. 确保在打包后的应用中运行\n`
            errorMessage += `2. 检查 preload.js 是否正确加载\n`
            errorMessage += `3. 重新构建应用\n\n`
          } else {
            errorMessage += `❌ 错误：Electron API 不可用\n`
            errorMessage += `请检查应用是否正确打包\n\n`
          }
          errorMessage += `游戏路径: ${game.executablePath}`
          notify.toast('error', '游戏启动失败', errorMessage)
          return
        }

        // 关闭详情页面
        this.closeGameDetail()
      } catch (error) {
        console.error('启动游戏失败:', error)
        notify.toast('error', '游戏启动失败', `启动游戏失败: ${error.message}`)
      }
    },
    
    showGameDetail(game) {
      this.currentGame = game
      this.showDetailModal = true
      this.showContextMenu = false
    },
    closeGameDetail() {
      this.showDetailModal = false
      this.currentGame = null
    },
    handleGameContextMenu(event, game) {
      (this.$refs.baseView as any).showContextMenuHandler(event, game)
    },
    handleDetailAction(actionKey, game) {
      switch (actionKey) {
        case 'launch':
          this.launchGame(game)
          break
        case 'terminate':
          // 显示确认对话框
          this.showTerminateConfirmDialog = true
          this.gameToTerminate = game
          break
        case 'folder':
          this.openGameFolder(game)
          break
        case 'edit':
          this.editGame(game)
          break
        case 'remove':
          this.handleRemoveGame(game)
          break
      }
    },
    /**
     * 右键菜单点击事件处理
     * @param {*} data - 包含 item 和 selectedItem
     */
    handleContextMenuClick(data) {
      const { item, selectedItem } = data
      if (!selectedItem) return

      switch (item.key) {
        case 'detail':
          this.showGameDetail(selectedItem)
          break
        case 'launch':
          this.launchGame(selectedItem)
          break
        case 'folder':
          this.openGameFolder(selectedItem)
          break
        case 'screenshot-folder':
          this.openGameScreenshotFolder(selectedItem)
          break
        case 'update-folder-size':
          this.updateGameFolderSize(selectedItem)
          break
        case 'edit':
          this.editGame(selectedItem)
          break
        case 'remove':
          this.handleRemoveGame(selectedItem)
          break
        case 'compress-to':
          this.compressFile(selectedItem)
          break
        case 'compress-here':
          this.compressFileToCurrentDir(selectedItem)
          break
        case 'extract':
          this.extractArchive(selectedItem)
          break
        case 'extract-here':
          this.extractArchiveToCurrentDir(selectedItem)
          break
      }
    },
    async handleUpdateRating(rating, game) {
      // 检查 game 是否存在，避免在面板关闭时触发更新
      if (!game || !game.id) {
        return
      }
      try {
        await this.updateGame(game.id, { rating })
        // 更新当前游戏对象，以便详情面板立即显示新星级
        if (this.currentGame && this.currentGame.id === game.id) {
          this.currentGame.rating = rating
        }
      } catch (error: any) {
        console.error('更新星级失败:', error)
        await alertService.error('更新星级失败: ' + error.message, '错误')
      }
    },
    async handleUpdateComment(comment, game) {
      // 检查 game 是否存在，避免在面板关闭时触发更新
      if (!game || !game.id) {
        return
      }
      try {
        await this.updateGame(game.id, { comment })
        // 更新当前游戏对象，以便详情面板立即显示新评论
        if (this.currentGame && this.currentGame.id === game.id) {
          this.currentGame.comment = comment
        }
      } catch (error: any) {
        console.error('更新评论失败:', error)
        await alertService.error('更新评论失败: ' + error.message, '错误')
      }
    },
    async handleToggleFavorite(game) {
      // 检查 game 是否存在，避免在面板关闭时触发更新
      if (!game || !game.id) {
        return
      }
      try {
        const newFavoriteStatus = !game.isFavorite
        await this.updateGame(game.id, { isFavorite: newFavoriteStatus })
        // 更新当前游戏对象，以便详情面板立即显示新状态
        if (this.currentGame && this.currentGame.id === game.id) {
          this.currentGame.isFavorite = newFavoriteStatus
        }
      } catch (error: any) {
        console.error('切换收藏状态失败:', error)
        await alertService.error('切换收藏状态失败: ' + error.message, '错误')
      }
    },
    editGame(game) {
      this.showContextMenu = false
      this.showDetailModal = false
      if (!game) return
      this.currentGame = game
      this.showEditDialog = true
    },
    closeEditGameDialog() {
      this.showEditDialog = false
      this.currentGame = null
    },
    async handleEditGameConfirm(updatedGame) {
      try {
        await this.updateGame(updatedGame.id, {
          name: updatedGame.name,
          developer: updatedGame.developer,
          publisher: updatedGame.publisher,
          engine: updatedGame.engine,
          description: updatedGame.description,
          tags: updatedGame.tags,
          executablePath: updatedGame.executablePath,
          image: updatedGame.image
        })
        notify.native('保存成功', '游戏信息已更新')
        this.closeEditGameDialog()
      } catch (error: any) {
        console.error('保存编辑失败:', error)
        await alertService.error('保存编辑失败: ' + error.message, '错误')
      }
    },
    async handleRemoveGame(game) {
      const confirmed = await confirmService.confirm(`确定要删除游戏 "${game.name}" 吗？`, '确认删除')
      if (!confirmed) return

      try {
        // 调用 composable 的 removeGame 方法（接收 gameId）
        // composable 的方法已经在 setup 中暴露，可以直接访问
        if (typeof (this as any).removeGame === 'function') {
          await (this as any).removeGame(game.id)
        } else {
          throw new Error('删除方法不可用')
        }
        this.showContextMenu = false
      } catch (error: any) {
        notify.toast('error', '删除失败', `无法删除游戏 "${game.name}": ${error.message}`)
        console.error('删除游戏失败:', error)
      }
    },
    formatDate,
    formatFirstPlayed,
    formatDateTime,
    formatPlayTime,
    formatLastPlayed,
    // loadGames 已移至 useGameManagement composable
    async loadGamesWithChecks() {
      // 调用 composable 的 loadGames（从 setup 返回，方法名是 loadGames）
      if (typeof (this as any).loadGames === 'function') {
        await (this as any).loadGames()
      }

      this.updateFilterData()

      // 检测文件存在性（仅在应用启动时检测一次）
      if ((this.$root as any).shouldCheckFileLoss && (this.$root as any).shouldCheckFileLoss()) {
        // 标记为已开始检测，避免其它页面重复发起检测
        ;(this.$root as any).markFileLossChecked()
        Promise.resolve()
          .then(() => this.checkFileExistence())
          .catch((e) => {
            console.warn('[GameView] 后台检测文件存在性失败:', e)
          })
          .finally(() => {
            // 检测完成后，刷新筛选器
            this.updateFilterData()
          })
      }

      // 为现有游戏计算文件夹大小（如果还没有的话）
      Promise.resolve()
        .then(() => this.updateExistingGamesFolderSize())
        .catch((e) => {
          console.warn('[GameView] 后台计算文件夹大小失败:', e)
        })

      // 分页信息会自动更新（usePagination composable 会监听 filteredGames 的变化）
      // 如果需要手动触发，可以使用 this.updatePagination()

      Promise.resolve()
        .then(() => this.checkGameCollectionAchievements())
        .catch((e) => {
          console.warn('[GameView] 后台成就检测失败(checkGameCollectionAchievements):', e)
        })

      Promise.resolve()
        .then(() => this.checkGameTimeAchievements())
        .catch((e) => {
          console.warn('[GameView] 后台成就检测失败(checkGameTimeAchievements):', e)
        })
    },
    // updateExistingGamesFolderSize 和 checkFileExistence 已移至 useGameManagement composable

    // 显示丢失文件提醒
    showMissingFilesAlert(missingFiles) {
      // 构建文件列表文本
      const fileList = missingFiles.map(file =>
        `• ${file.name}${file.path !== '未设置路径' && file.path !== '路径检测失败' ? ` (${file.path})` : ''}`
      ).join('\n')

      // 显示 toast 通知，包含详细信息
      notify.toast(
        'warning',
        '游戏文件丢失提醒',
        `发现 ${missingFiles.length} 个游戏文件丢失：\n${fileList}\n\n请检查文件路径或重新添加这些游戏。`
      )

      // 在控制台输出详细信息
      console.warn('📋 丢失的游戏文件列表:')
      missingFiles.forEach((file, index) => {
        console.warn(`${index + 1}. ${file.name}`)
        if (file.path !== '未设置路径' && file.path !== '路径检测失败') {
          console.warn(`   路径: ${file.path}`)
        }
      })
    },

    async updateGameFolderSize(game) {
      try {
        await this.updateGameFolderSize(game.id)
      } catch (error: any) {
        console.error(`❌ 更新游戏 ${game.name} 文件夹大小失败:`, error)
      }
    },
    // extractAllTags 已移至 useGameFilter composable
    // filterByTag, excludeByTag, clearTagFilter, filterByDeveloper, excludeByDeveloper, clearDeveloperFilter 已移至 useGameFilter composable
    // 这些方法现在直接从 composable 中获取，只需要在调用后更新筛选器数据
    handleFilterByTag(tagName: string) {
      this.filterByTag(tagName)
      this.updateFilterData()
    },
    handleExcludeByTag(tagName: string) {
      this.excludeByTag(tagName)
      this.updateFilterData()
    },
    handleClearTagFilter() {
      this.clearTagFilter()
      this.updateFilterData()
    },
    handleFilterByDeveloper(developerName: string) {
      this.filterByDeveloper(developerName)
      this.updateFilterData()
    },
    handleExcludeByDeveloper(developerName: string) {
      this.excludeByDeveloper(developerName)
      this.updateFilterData()
    },
    handleClearDeveloperFilter() {
      this.clearDeveloperFilter()
      this.updateFilterData()
    },
    handleFilterByPublisher(publisherName: string) {
      this.filterByPublisher(publisherName)
      this.updateFilterData()
    },
    handleExcludeByPublisher(publisherName: string) {
      this.excludeByPublisher(publisherName)
      this.updateFilterData()
    },
    handleClearPublisherFilter() {
      this.clearPublisherFilter()
      this.updateFilterData()
    },
    handleFilterByEngine(engineName: string) {
      this.filterByEngine(engineName)
      this.updateFilterData()
    },
    handleExcludeByEngine(engineName: string) {
      this.excludeByEngine(engineName)
      this.updateFilterData()
    },
    handleClearEngineFilter() {
      this.clearEngineFilter()
      this.updateFilterData()
    },
    handleFilterByOther(otherName: string) {
      this.filterByOther(otherName)
      this.updateFilterData()
    },
    handleExcludeByOther(otherName: string) {
      this.excludeByOther(otherName)
      this.updateFilterData()
    },
    handleClearOtherFilter() {
      this.clearOtherFilter()
      this.updateFilterData()
    },
    // 处理来自 App.vue 的筛选器事件
    handleFilterEvent(event, data) {
      console.log('GameView handleFilterEvent:', event, data)
      switch (event) {
        case 'filter-select':
          if (data.filterKey === 'tags') {
            this.handleFilterByTag(data.itemName)
          } else if (data.filterKey === 'developers') {
            this.handleFilterByDeveloper(data.itemName)
          } else if (data.filterKey === 'publishers') {
            this.handleFilterByPublisher(data.itemName)
          } else if (data.filterKey === 'engines') {
            this.handleFilterByEngine(data.itemName)
          } else if (data.filterKey === 'others') {
            this.handleFilterByOther(data.itemName)
          }
          break
        case 'filter-exclude':
          if (data.filterKey === 'tags') {
            this.handleExcludeByTag(data.itemName)
          } else if (data.filterKey === 'developers') {
            this.handleExcludeByDeveloper(data.itemName)
          } else if (data.filterKey === 'publishers') {
            this.handleExcludeByPublisher(data.itemName)
          } else if (data.filterKey === 'engines') {
            this.handleExcludeByEngine(data.itemName)
          } else if (data.filterKey === 'others') {
            this.handleExcludeByOther(data.itemName)
          }
          break
        case 'filter-clear':
          if (data === 'tags') {
            this.handleClearTagFilter()
          } else if (data === 'developers') {
            this.handleClearDeveloperFilter()
          } else if (data === 'publishers') {
            this.handleClearPublisherFilter()
          } else if (data === 'engines') {
            this.handleClearEngineFilter()
          } else if (data === 'others') {
            this.handleClearOtherFilter()
          }
          break
      }
    },
    // 更新筛选器数据到 App.vue
    updateFilterData() {
      const filterData = this.getFilterData()
      this.$emit('filter-data-updated', filterData)
    },
    // updateGamePlayTime 已移至 useGamePlayTime composable
    async updateGamePlayTime(data) {
      // 调用 composable 的方法（注意：方法名相同，但 this.updateGamePlayTime 指向 composable 的方法）
      await (this as any).updateGamePlayTime(data)
    },
    // isGameRunning 已移至 useGameRunning composable
    isGameRunning(game) {
      // 调用 composable 的方法
      return (this as any).isGameRunning(game)
    },
    async terminateGame(game) {
      try {
        console.log('[DEBUG] 🛑 开始强制结束游戏:', game.name, game.executablePath)
        
        if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.terminateGame) {
          notify.toast('error', '操作失败', '当前环境不支持强制结束游戏功能')
          return
        }

        const result = await window.electronAPI.terminateGame(game.executablePath)
        
        if (result.success) {
          console.log('[DEBUG] ✅ 游戏已强制结束，PID:', result.pid, '运行时长:', result.playTime, '秒')
          notify.toast('success', '游戏已结束', `${game.name} 已强制结束`)
        } else {
          console.warn('[DEBUG] ⚠️ 强制结束游戏失败:', result.error)
          
          // 检查错误信息是否包含"未找到运行中的游戏进程"
          const isProcessNotFound = result.error && (
            result.error.includes('未找到') || 
            result.error.includes('运行中的游戏进程') ||
            result.error.includes('not found') ||
            result.error.includes('process not found')
          )
          
          if (isProcessNotFound) {
            // 如果未找到进程，显示警告并从运行列表中移除
            console.warn('[DEBUG] ⚠️ 游戏进程未找到，从运行列表中移除:', game.id)
            notify.toast('warning', '游戏已停止', `未找到 ${game.name} 的运行进程，已将其标记为已停止`)
            
            // 检查游戏是否在运行列表中，如果在则移除
            if (this.isGameRunning(game)) {
              this.removeRunningGame(game.id)
              console.log('[DEBUG] ✅ 已从运行列表中移除游戏:', game.id)
            }
          } else {
            // 其他错误，显示错误提示
            notify.toast('error', '操作失败', `强制结束游戏失败: ${result.error}`)
          }
        }
      } catch (error) {
        console.error('[DEBUG] ❌ 强制结束游戏异常:', error)
        
        // 检查错误信息是否包含"未找到运行中的游戏进程"
        const errorMessage = error.message || String(error)
        const isProcessNotFound = errorMessage.includes('未找到') || 
          errorMessage.includes('运行中的游戏进程') ||
          errorMessage.includes('not found') ||
          errorMessage.includes('process not found')
        
        if (isProcessNotFound) {
          // 如果未找到进程，显示警告并从运行列表中移除
          console.warn('[DEBUG] ⚠️ 游戏进程未找到，从运行列表中移除:', game.id)
          notify.toast('warning', '游戏已停止', `未找到 ${game.name} 的运行进程，已将其标记为已停止`)
          
          // 检查游戏是否在运行列表中，如果在则移除
          if (this.isGameRunning(game)) {
            this.removeRunningGame(game.id)
            console.log('[DEBUG] ✅ 已从运行列表中移除游戏:', game.id)
          }
        } else {
          notify.toast('error', '操作失败', `强制结束游戏失败: ${errorMessage}`)
        }
      }
    },
    closeTerminateConfirmDialog() {
      this.showTerminateConfirmDialog = false
      this.gameToTerminate = null
    },
    async confirmTerminateGame() {
      if (this.gameToTerminate) {
        await this.terminateGame(this.gameToTerminate)
        this.closeTerminateConfirmDialog()
      }
    },
    // 密码输入对话框处理方法
    handlePasswordConfirm(password) {
      this.showPasswordDialog = false
      if (this.passwordDialogCallback) {
        this.passwordDialogCallback(password)
      }
      // 清理状态
      this.passwordDialogCallback = null
      this.passwordDialogGame = null
      this.passwordDialogOutputDir = null
      this.passwordDialogTriedPasswords = []
    },
    handlePasswordCancel() {
      this.showPasswordDialog = false
      if (this.passwordDialogCallback) {
        // 传递 null 表示取消
        this.passwordDialogCallback(null)
      }
      // 清理状态
      this.passwordDialogCallback = null
      this.passwordDialogGame = null
      this.passwordDialogOutputDir = null
      this.passwordDialogTriedPasswords = []
    },



    // playScreenshotSound 和 takeScreenshot 已移至 useGameScreenshot composable
    playScreenshotSound() {
      this.playScreenshotSound()
    },
    async takeScreenshot() {
      await this.takeScreenshot()
    },
    // 应用内快捷键功能已禁用，只使用全局快捷键
    // handleKeyDown(event) {
    //   // 获取用户设置的截图快捷键
    //   const settings = JSON.parse(localStorage.getItem('butter-manager-settings') || '{}')
    //   const screenshotKey = settings.screenshotKey || 'F12'
    //   
    //   // 检查是否匹配用户设置的快捷键
    //   if (this.isKeyMatch(event, screenshotKey)) {
    //     event.preventDefault()
    //     this.takeScreenshot()
    //   }
    // },
    // isKeyMatch(event, keySetting) {
    //   // 只支持F12键
    //   if (keySetting === 'F12') {
    //     return event.key === 'F12' && !event.ctrlKey && !event.altKey && !event.shiftKey
    //   }
    //   
    //   return false
    // },
    // initializeGlobalShortcut 已移至 useGameScreenshot composable
    async initializeGlobalShortcut() {
      await this.initializeGlobalShortcut()
    },

    // SaveManager 相关方法
    async exportGames() {
      try {
        const success = await saveManager.exportData('games')
        if (success) {
          notify.native('导出成功', '游戏数据已导出到文件')
        } else {
          notify.native('导出失败', '游戏数据导出失败')
        }
      } catch (error) {
        console.error('导出游戏数据失败:', error)
        notify.native('导出失败', `导出失败: ${error.message}`)
      }
    },

    async getStorageInfo() {
      const info = await saveManager.getStorageInfo()
      if (info) {
        const sizeKB = Math.round(info.total.size / 1024)
        const sizeMB = Math.round(sizeKB / 1024 * 100) / 100
        return {
          totalSize: sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`,
          gameCount: info.games.count,
          settingsCount: info.settings.count,
          backupCount: info.backup.count
        }
      }
      return null
    },

    async parseGameSaveFile(file) {
      try {
        const content = await file.text()
        const result = saveManager.parseGameSaveFile(content)
        if (result.success) {
          console.log('游戏存档解析成功:', result.slots)
          return result
        } else {
          console.error('游戏存档解析失败:', result.error)
          return null
        }
      } catch (error) {
        console.error('读取游戏存档文件失败:', error)
        return null
      }
    },

    async openGameFolder(game) {
      try {
        if (!game.executablePath) {
          await alertService.warning('游戏文件路径不存在', '提示')
          return
        }

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.openFileFolder) {
          const result = await window.electronAPI.openFileFolder(game.executablePath)
          if (result.success) {
            console.log('已打开游戏文件夹:', result.folderPath)

          } else {
            console.error('打开文件夹失败:', result.error)
            await alertService.error(`打开文件夹失败: ${result.error}`, '错误')
          }
        } else {
          // 降级处理：在浏览器中显示路径
          await alertService.info(`游戏文件位置:\n${game.executablePath}`, '文件位置')
        }
      } catch (error) {
        console.error('打开游戏文件夹失败:', error)
        await alertService.error(`打开文件夹失败: ${error.message}`, '错误')
      }
    },
    // openGameScreenshotFolder 已移至 useGameScreenshot composable
    async openGameScreenshotFolder(game) {
      await this.openGameScreenshotFolder(game)
    },
    // 解压压缩包文件（选择目录）
    async extractArchive(game) {
      try {
        // 检查是否为压缩包
        const isArchive = game.isArchive || (game.executablePath && isArchiveFile(game.executablePath))
        if (!isArchive) {
          notify.toast('warning', '无法解压', '选中的游戏不是压缩包文件')
          return
        }

        // 检查文件是否存在
        if (!game.executablePath) {
          notify.toast('error', '解压失败', '游戏文件路径不存在')
          return
        }

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.checkFileExists) {
          const existsResult = await window.electronAPI.checkFileExists(game.executablePath)
          if (!existsResult.success || !existsResult.exists) {
            notify.toast('error', '解压失败', '压缩包文件不存在或无法访问')
            return
          }
        }

        // 让用户选择解压目录
        if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.selectFolder) {
          notify.toast('error', '解压失败', '当前环境不支持选择文件夹')
          return
        }

        const folderResult = await window.electronAPI.selectFolder()
        if (!folderResult.success || !folderResult.path) {
          // 用户取消了选择
          return
        }

        const outputDir = folderResult.path

        // 执行解压
        await this.performExtraction(game, outputDir)
      } catch (error) {
        console.error('解压文件异常:', error)
        notify.toast('error', '解压失败', `解压过程中发生错误: ${error.message}`)
      }
    },
    // 解压到压缩包所在目录（创建同名子文件夹）
    async extractArchiveToCurrentDir(game) {
      try {
        // 检查是否为压缩包
        const isArchive = game.isArchive || (game.executablePath && isArchiveFile(game.executablePath))
        if (!isArchive) {
          notify.toast('warning', '无法解压', '选中的游戏不是压缩包文件')
          return
        }

        // 检查文件是否存在
        if (!game.executablePath) {
          notify.toast('error', '解压失败', '游戏文件路径不存在')
          return
        }

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.checkFileExists) {
          const existsResult = await window.electronAPI.checkFileExists(game.executablePath)
          if (!existsResult.success || !existsResult.exists) {
            notify.toast('error', '解压失败', '压缩包文件不存在或无法访问')
            return
          }
        }

        // 获取压缩包所在目录和文件名
        const archivePath = game.executablePath
        // 使用字符串操作获取目录路径（兼容 Windows 和 Unix 路径）
        const lastBackslash = archivePath.lastIndexOf('\\')
        const lastSlash = archivePath.lastIndexOf('/')
        const lastSeparator = Math.max(lastBackslash, lastSlash)
        const archiveDir = lastSeparator >= 0 ? archivePath.substring(0, lastSeparator) : archivePath
        
        // 获取压缩包文件名（不含扩展名）
        const fileName = lastSeparator >= 0 ? archivePath.substring(lastSeparator + 1) : archivePath
        // 移除扩展名（支持多种压缩格式，按长度从长到短排序，优先匹配长扩展名如 .tar.gz）
        const archiveExtensions = ['.tar.gz', '.tar.bz2', '.tar.xz', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']
        let fileNameWithoutExt = fileName
        for (const ext of archiveExtensions) {
          if (fileNameWithoutExt.toLowerCase().endsWith(ext.toLowerCase())) {
            fileNameWithoutExt = fileNameWithoutExt.substring(0, fileNameWithoutExt.length - ext.length)
            break
          }
        }
        
        // 创建子文件夹路径（Windows 使用反斜杠）
        const pathSeparator = archivePath.includes('\\') ? '\\' : '/'
        const outputDir = archiveDir + (archiveDir.endsWith('\\') || archiveDir.endsWith('/') ? '' : pathSeparator) + fileNameWithoutExt
        
        // 确认是否解压到当前目录的子文件夹
        const confirmMessage = `确定要将 ${game.name} 解压到当前目录吗？\n\n解压位置: ${outputDir}\n\n注意：将在压缩包所在目录创建同名子文件夹。`
        const confirmed = await confirmService.confirm(confirmMessage, '确认解压')
        if (!confirmed) {
          return
        }

        // 执行解压（会自动创建目录）
        await this.performExtraction(game, outputDir)
      } catch (error) {
        console.error('解压文件异常:', error)
        notify.toast('error', '解压失败', `解压过程中发生错误: ${error.message}`)
      }
    },
    // 压缩文件（选择目录）
    async compressFile(game) {
      try {
        // 检查文件是否存在
        if (!game.executablePath) {
          notify.toast('error', '压缩失败', '游戏文件路径不存在')
          return
        }

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.checkFileExists) {
          const existsResult = await window.electronAPI.checkFileExists(game.executablePath)
          if (!existsResult.success || !existsResult.exists) {
            notify.toast('error', '压缩失败', '文件不存在或无法访问')
            return
          }
        }

        // 让用户选择压缩包保存位置和名称
        if (!this.isElectronEnvironment || !window.electronAPI || !window.electronAPI.selectFolder) {
          notify.toast('error', '压缩失败', '当前环境不支持选择文件夹')
          return
        }

        // 获取要压缩的文件夹路径
        let folderToCompress = game.executablePath
        let isFile = false

        // 检查路径是文件还是文件夹
        if (window.electronAPI && window.electronAPI.getFileStats) {
          const statsResult = await window.electronAPI.getFileStats(game.executablePath)
          if (statsResult.success) {
            isFile = statsResult.isFile === true
            if (statsResult.isFile) {
              // 如果是文件，获取其所在文件夹
              const filePath = game.executablePath
              const lastBackslash = filePath.lastIndexOf('\\')
              const lastSlash = filePath.lastIndexOf('/')
              const lastSeparator = Math.max(lastBackslash, lastSlash)
              
              if (lastSeparator >= 0) {
                folderToCompress = filePath.substring(0, lastSeparator)
              }
            }
            // 如果是文件夹，folderToCompress 已经是正确的路径，不需要修改
          }
        }

        // 如果 getFileStats 失败，通过文件扩展名判断（后备方案）
        if (!isFile) {
          const filePath = game.executablePath
          const commonExtensions = ['.exe', '.swf', '.bat', '.cmd', '.com', '.scr', '.msi', '.zip', '.rar', '.7z']
          const lowerPath = filePath.toLowerCase()
          const hasExtension = commonExtensions.some(ext => lowerPath.endsWith(ext))
          
          if (hasExtension) {
            // 看起来是文件，获取其所在文件夹
            const lastBackslash = filePath.lastIndexOf('\\')
            const lastSlash = filePath.lastIndexOf('/')
            const lastSeparator = Math.max(lastBackslash, lastSlash)
            
            if (lastSeparator >= 0) {
              folderToCompress = filePath.substring(0, lastSeparator)
            }
          }
        }

        // 让用户选择保存位置
        const folderResult = await window.electronAPI.selectFolder()
        if (!folderResult.success || !folderResult.path) {
          // 用户取消了选择
          return
        }

        const outputDir = folderResult.path
        const pathSeparator = outputDir.includes('\\') ? '\\' : '/'
        const archivePath = outputDir + (outputDir.endsWith('\\') || outputDir.endsWith('/') ? '' : pathSeparator) + game.name + '.zip'

        // 确认压缩
        const confirmMessage = `确定要压缩 ${game.name} 的文件夹吗？\n\n压缩包保存位置: ${archivePath}`
        const confirmed = await confirmService.confirm(confirmMessage, '确认压缩')
        if (!confirmed) {
          return
        }

        // 执行压缩
        await this.performCompression(game, folderToCompress, archivePath)
      } catch (error) {
        console.error('压缩文件异常:', error)
        notify.toast('error', '压缩失败', `压缩过程中发生错误: ${error.message}`)
      }
    },
    // 压缩到当前目录
    async compressFileToCurrentDir(game) {
      try {
        // 检查文件是否存在
        if (!game.executablePath) {
          notify.toast('error', '压缩失败', '游戏文件路径不存在')
          return
        }

        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.checkFileExists) {
          const existsResult = await window.electronAPI.checkFileExists(game.executablePath)
          if (!existsResult.success || !existsResult.exists) {
            notify.toast('error', '压缩失败', '文件不存在或无法访问')
            return
          }
        }

        // 获取要压缩的文件夹路径和压缩包保存目录
        let folderToCompress = game.executablePath
        let currentDir = game.executablePath

        // 检查路径是文件还是文件夹
        let isFile = false
        if (window.electronAPI && window.electronAPI.getFileStats) {
          const statsResult = await window.electronAPI.getFileStats(game.executablePath)
          if (statsResult.success) {
            isFile = statsResult.isFile === true
            if (statsResult.isFile) {
              // 如果是文件，获取其所在文件夹
              const filePath = game.executablePath
              const lastBackslash = filePath.lastIndexOf('\\')
              const lastSlash = filePath.lastIndexOf('/')
              const lastSeparator = Math.max(lastBackslash, lastSlash)
              
              if (lastSeparator >= 0) {
                folderToCompress = filePath.substring(0, lastSeparator)
                currentDir = folderToCompress
              }
            }
            // 如果是文件夹，folderToCompress 和 currentDir 已经是正确的路径，不需要修改
          }
        }

        // 如果 getFileStats 失败，通过文件扩展名判断（后备方案）
        if (!isFile) {
          const filePath = game.executablePath
          const commonExtensions = ['.exe', '.swf', '.bat', '.cmd', '.com', '.scr', '.msi', '.zip', '.rar', '.7z']
          const lowerPath = filePath.toLowerCase()
          const hasExtension = commonExtensions.some(ext => lowerPath.endsWith(ext))
          
          if (hasExtension) {
            // 看起来是文件，获取其所在文件夹
            const lastBackslash = filePath.lastIndexOf('\\')
            const lastSlash = filePath.lastIndexOf('/')
            const lastSeparator = Math.max(lastBackslash, lastSlash)
            
            if (lastSeparator >= 0) {
              folderToCompress = filePath.substring(0, lastSeparator)
              currentDir = folderToCompress
            }
          }
        }

        // 创建压缩包路径（在当前目录）
        const pathSeparator = currentDir.includes('\\') ? '\\' : '/'
        const archivePath = currentDir + (currentDir.endsWith('\\') || currentDir.endsWith('/') ? '' : pathSeparator) + game.name + '.zip'

        // 确认压缩
        const confirmMessage = `确定要将 ${game.name} 的文件夹压缩到当前目录吗？\n\n压缩包保存位置: ${archivePath}`
        const confirmed = await confirmService.confirm(confirmMessage, '确认压缩')
        if (!confirmed) {
          return
        }

        // 执行压缩
        await this.performCompression(game, folderToCompress, archivePath)
      } catch (error) {
        console.error('压缩文件异常:', error)
        notify.toast('error', '压缩失败', `压缩过程中发生错误: ${error.message}`)
      }
    },
    // 执行压缩操作（通用方法）
    async performCompression(game, sourcePath, archivePath) {
      try {
        // 显示压缩中提示
        notify.toast('info', '正在压缩', `正在压缩 ${game.name}...`)

        // 调用压缩 API（sourcePath 是要压缩的文件夹路径）
        if (window.electronAPI && window.electronAPI.compressFile) {
          const result = await window.electronAPI.compressFile(sourcePath, archivePath)

          if (result.success) {
            notify.toast('success', '压缩成功', `文件夹已压缩到: ${archivePath}`)
            console.log('✅ 压缩成功:', result.archivePath)
          } else {
            notify.toast('error', '压缩失败', result.error || '压缩过程中发生错误')
            console.error('❌ 压缩失败:', result.error)
          }
        } else {
          notify.toast('error', '压缩失败', '压缩功能不可用')
        }
      } catch (error) {
        console.error('执行压缩操作异常:', error)
        notify.toast('error', '压缩失败', `压缩过程中发生错误: ${error.message}`)
      }
    },
    // 执行解压操作（通用方法）
    async performExtraction(game, outputDir, password = null, triedPasswords = []) {
      try {
        console.log('=== 开始解压操作 ===')
        console.log('游戏名称:', game.name)
        console.log('压缩包路径:', game.executablePath)
        console.log('输出目录:', outputDir)
        console.log('是否提供密码:', password ? '是' : '否')
        console.log('已尝试的密码数量:', triedPasswords.length)
        
        // 如果还没有尝试过密码，先尝试常用密码（避免 WinRAR.exe 弹出密码输入框）
        if (!password && triedPasswords.length === 0) {
          console.log('📋 首次解压，先尝试常用密码...')
          let commonPasswords = []
          let passwordFileCreated = false
          if (window.electronAPI && window.electronAPI.readArchivePasswords) {
            const passwordsResult = await window.electronAPI.readArchivePasswords()
            if (passwordsResult.success && passwordsResult.passwords) {
              commonPasswords = passwordsResult.passwords
              passwordFileCreated = passwordsResult.fileCreated || false
              console.log('📋 读取到常用密码列表，共', commonPasswords.length, '个密码')
              
              // 如果密码文件是新创建的，告知用户并直接弹出密码输入框
              if (passwordFileCreated) {
                notify.toast('info', '密码文件已创建', '已创建 SaveData/passwords.txt 文件，请编辑添加常用密码。现在请手动输入密码。')
                // 显示密码输入对话框
                this.passwordDialogTitle = '输入密码'
                this.passwordDialogMessage = '该压缩包需要密码，请输入密码：'
                this.passwordDialogGame = game
                this.passwordDialogOutputDir = outputDir
                this.passwordDialogTriedPasswords = triedPasswords
                this.passwordDialogCallback = async (userPassword) => {
                  if (userPassword) {
                    await this.performExtraction(game, outputDir, userPassword, triedPasswords)
                  } else {
                    notify.toast('error', '解压取消', '未输入密码，解压已取消')
                  }
                }
                this.showPasswordDialog = true
                return
              }
            }
          }
          
          // 如果有常用密码，先尝试常用密码（使用测试命令，避免弹出 GUI）
          if (commonPasswords.length > 0) {
            console.log('🔑 开始测试常用密码，共', commonPasswords.length, '个密码')
            // 提示用户检测到密码，正在使用密码本
            notify.toast('info', '检测到密码', `该压缩包需要密码，正在使用默认密码本尝试解密（共 ${commonPasswords.length} 个密码）...`)
            let triedCount = 0
            let correctPassword = null
            
            // 先测试所有密码，找到正确的密码
            for (let i = 0; i < commonPasswords.length; i++) {
              const commonPassword = commonPasswords[i]
              triedCount++
              console.log(`🔑 [${triedCount}/${commonPasswords.length}] 测试密码:`, commonPassword.replace(/./g, '*'))
              
              // 跳过已经尝试过的密码
              if (triedPasswords.includes(commonPassword)) {
                console.log('⏭️ 密码已尝试过，跳过')
                continue
              }
              
              triedPasswords.push(commonPassword)
              
              // 使用测试命令验证密码（不实际解压，避免弹出 GUI）
              if (window.electronAPI && window.electronAPI.testArchivePassword) {
                const testResult = await window.electronAPI.testArchivePassword(game.executablePath, commonPassword)
                console.log(`🔑 [${triedCount}/${commonPasswords.length}] 密码测试结果:`, testResult.passwordCorrect ? '✅ 正确' : '❌ 错误')
                
                if (testResult.success && testResult.passwordCorrect) {
                  // 找到正确密码
                  correctPassword = commonPassword
                  console.log('✅ 找到正确密码，已尝试', triedCount, '个密码')
                  break // 找到正确密码，退出循环
                }
                // 密码错误，继续尝试下一个
                console.log(`❌ [${triedCount}/${commonPasswords.length}] 密码错误，继续测试下一个...`)
              } else {
                // 如果测试 API 不可用，降级到直接解压的方式
                console.log('⚠️ 测试 API 不可用，降级到直接解压方式')
                const tryResult = await window.electronAPI.extractArchive(game.executablePath, outputDir, commonPassword)
                
                if (tryResult.success) {
                  notify.toast('success', '解压成功', `使用常用密码成功解压到: ${outputDir}`)
                  console.log('✅ 使用常用密码解压成功，已尝试', triedCount, '个密码')
                  return
                } else {
                  const errorMsg = tryResult.error || ''
                  const errorMsgLower = errorMsg.toLowerCase()
                  const exitCodeMatch = errorMsg.match(/退出码:\s*(\d+)/)
                  const exitCode = exitCodeMatch ? parseInt(exitCodeMatch[1]) : null
                  const isWinRARExitCode11 = exitCode === 11
                  const isPasswordError = tryResult.requiresPassword || 
                                         errorMsgLower.includes('password') || 
                                         errorMsgLower.includes('密码') ||
                                         isWinRARExitCode11
                  
                  if (!isPasswordError) {
                    console.log('❌ 不是密码错误，解压失败:', errorMsg.substring(0, 200))
                    notify.toast('error', '解压失败', errorMsg || '解压过程中发生错误')
                    return
                  }
                  console.log(`❌ [${triedCount}/${commonPasswords.length}] 密码错误，继续尝试下一个...`)
                }
              }
            }
            
            // 如果找到了正确密码，使用它进行解压
            if (correctPassword) {
              console.log('🔑 使用找到的正确密码进行解压:', correctPassword.replace(/./g, '*'))
              notify.toast('success', '密码验证成功', `已在密码本中找到正确密码（第 ${triedCount}/${commonPasswords.length} 个），开始解压...`)
              
              // 使用正确密码解压
              const extractResult = await window.electronAPI.extractArchive(game.executablePath, outputDir, correctPassword)
              if (extractResult.success) {
                notify.toast('success', '解压成功', `使用密码本中的密码成功解压到: ${outputDir}`)
                console.log('✅ 解压成功')
                return
              } else {
                notify.toast('error', '解压失败', extractResult.error || '解压过程中发生错误')
                console.error('❌ 解压失败:', extractResult.error)
                return
              }
            } else {
              console.log('❌ 所有常用密码都失败了，共测试了', triedCount, '个密码')
              notify.toast('warning', '密码本解密失败', `已尝试密码本中的 ${triedCount} 个密码，均不正确。请手动输入密码。`)
            }
          }
        }
        
        // 显示解压中提示
        if (password) {
          notify.toast('info', '正在解压', `正在尝试密码解压 ${game.name}...`)
        } else {
          notify.toast('info', '正在解压', `正在解压 ${game.name}...`)
        }

        // 调用解压 API
        if (window.electronAPI && window.electronAPI.extractArchive) {
          const result = await window.electronAPI.extractArchive(game.executablePath, outputDir, password)
          console.log('解压 API 返回结果:', result.success ? '成功' : '失败', result.error || '', result.requiresPassword ? '(需要密码)' : '')

          if (result.success) {
            if (password) {
              notify.toast('success', '解压成功', `使用密码成功解压到: ${outputDir}`)
            } else {
              notify.toast('success', '解压成功', `文件已解压到: ${outputDir}`)
            }
            console.log('✅ 解压成功:', result.outputDir)
          } else {
            // 检查是否需要密码
            const errorMsg = result.error || ''
            const needsPassword = result.requiresPassword || 
                                 errorMsg.toLowerCase().includes('password') || 
                                 errorMsg.toLowerCase().includes('密码') ||
                                 errorMsg.toLowerCase().includes('wrong password') ||
                                 errorMsg.toLowerCase().includes('incorrect password')
            
            console.log('检查是否需要密码:', needsPassword, '错误信息:', errorMsg.substring(0, 200))
            
            if (needsPassword && !password) {
              // 常用密码已经在前面尝试过了，如果到这里说明都失败了
              console.log('❌ 常用密码都失败了，提示用户输入密码')
              
              // 如果常用密码都失败了，提示用户输入密码
              this.passwordDialogTitle = '输入密码'
              this.passwordDialogMessage = '该压缩包需要密码，常用密码已尝试失败。请输入密码：'
              this.passwordDialogGame = game
              this.passwordDialogOutputDir = outputDir
              this.passwordDialogTriedPasswords = triedPasswords
              this.passwordDialogCallback = async (userPassword) => {
                if (userPassword) {
                  await this.performExtraction(game, outputDir, userPassword, triedPasswords)
                } else {
                  notify.toast('error', '解压取消', '未输入密码，解压已取消')
                }
              }
              this.showPasswordDialog = true
            } else {
              notify.toast('error', '解压失败', result.error || '解压过程中发生错误')
              console.error('❌ 解压失败:', result.error)
            }
          }
        } else {
          notify.toast('error', '解压失败', '解压功能不可用')
        }
      } catch (error) {
        console.error('执行解压操作异常:', error)
        notify.toast('error', '解压失败', `解压过程中发生错误: ${error.message}`)
      }
      return false
    },
    // 拖拽处理方法
    // 拖拽相关方法已移至 useGameDragAndDrop composable
    handleDragOver(event) {
      if (this.dragDropComposable?.handleDragOver) {
        this.dragDropComposable.handleDragOver(event)
      }
    },

    handleDragEnter(event) {
      if (this.dragDropComposable?.handleDragEnter) {
        this.dragDropComposable.handleDragEnter(event)
      }
    },

    handleDragLeave(event) {
      if (this.dragDropComposable?.handleDragLeave) {
        this.dragDropComposable.handleDragLeave(event)
      }
    },

    async handleDrop(event) {
      if (this.dragDropComposable?.handleDrop) {
        await this.dragDropComposable.handleDrop(event)
      }
    },

    // 旧的 handleDrop 方法已移除，现在使用 useGameDragAndDrop composable

    // 检查是否在 Electron 环境中
    checkElectronEnvironment() {
      this.isElectronEnvironment = !!(window.electronAPI && typeof window.electronAPI === 'object')

      if (this.isElectronEnvironment) {
        console.log('✅ 检测到 Electron 环境')
      } else {
        console.log('❌ 未检测到 Electron 环境，可能是浏览器环境或 API 未正确加载')
        console.log('当前环境信息:')
        console.log('- userAgent:', navigator.userAgent)
        console.log('- location:', window.location.href)
        console.log('- process:', typeof process !== 'undefined' ? process.versions : 'undefined')
      }
    },

    // 路径更新相关方法
    closePathUpdateDialog() {
      this.showPathUpdateDialog = false
      this.pathUpdateInfo = {
        existingGame: null,
        newPath: '',
        newFileName: ''
      }
    },

    async confirmPathUpdate() {
      try {
        const { existingGame, newPath } = this.pathUpdateInfo

        if (!existingGame || !newPath) {
          console.error('路径更新信息不完整')
          return
        }

        console.log(`更新游戏 "${existingGame.name}" 的路径:`)
        console.log(`旧路径: ${existingGame.executablePath}`)
        console.log(`新路径: ${newPath}`)

        // 更新游戏路径
        existingGame.executablePath = newPath
        existingGame.fileExists = true

        // 重新计算文件夹大小
        if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.getFolderSize) {
          try {
            const result = await window.electronAPI.getFolderSize(newPath)
            if (result.success) {
              existingGame.folderSize = result.size
              console.log(`游戏 ${existingGame.name} 文件夹大小: ${result.size} 字节`)
            }
          } catch (error) {
            console.error('获取文件夹大小失败:', error)
          }
        }

        // 保存更新后的数据
        await this.saveGames()

        // 关闭对话框
        this.closePathUpdateDialog()

        // 显示成功通知
        notify.toast(
          'success',
          '路径更新成功',
          `游戏 "${existingGame.name}" 的路径已更新`
        )

        console.log(`游戏 "${existingGame.name}" 路径更新完成`)

      } catch (error) {
        console.error('更新游戏路径失败:', error)
        notify.toast('error', '更新失败', `更新游戏路径失败: ${error.message}`)
      }
    },
    async handleSortChanged({ pageType, sortBy }) {
      try {

        await saveManager.saveSortSetting(pageType, sortBy)
        console.log(`✅ 已保存${pageType}页面排序方式:`, sortBy)
      } catch (error) {
        console.warn('保存排序方式失败:', error)
      }
    },
    async loadSortSetting() {
      try {

        const savedSortBy = await saveManager.getSortSetting('games')
        if (savedSortBy) {
          // 兼容旧的排序值，转换为新格式
          let normalizedSortBy = savedSortBy
          if (!savedSortBy.includes('-')) {
            // 旧的排序值（如 'name'），默认转换为升序
            normalizedSortBy = `${savedSortBy}-asc`
          }
          
          if (normalizedSortBy !== this.sortBy) {
            this.sortBy = normalizedSortBy as GameSortBy
            console.log('✅ 已加载游戏页面排序方式:', normalizedSortBy)
          }
        }
      } catch (error) {
        console.warn('加载排序方式失败:', error)
      }
    },

    // 分页相关方法已移至 useGamePagination composable
    // handleGamePageChange 现在通过 handlePageChange 访问
    handleGamePageChange(pageNum) {
      if (this.handlePageChange) {
        this.handlePageChange(pageNum)
      }
    },

    // 处理空状态按钮点击事件
    handleEmptyStateAction(actionName) {
      if (actionName === 'showAddGameDialog') {
        this.showAddGameDialog()
      }
    },

    // 处理搜索查询变化
    handleSearchQueryChanged(newValue) {
      this.searchQuery = newValue
    },

    // 处理排序变化
    handleSortByChanged(newValue) {
      this.sortBy = newValue
      console.log('✅ GameView 排序方式已更新:', newValue)
    }
  },
  watch: {
    // 分页相关监听已移至 useGamePagination composable
    // 监听搜索查询变化，重置到第一页
    searchQuery() {
      if (this.resetToFirstPage) {
        this.resetToFirstPage()
      }
    },
    // 监听排序变化，重置到第一页
    sortBy() {
      if (this.resetToFirstPage) {
        this.resetToFirstPage()
      }
    }
  },
  async mounted() {
    // 设置父组件函数引用（在 Options API 中通过 this.$root 访问）
    if ((this as any)._setParentFunctions && this.$root) {
      (this as any)._setParentFunctions({
        getRunningGames: () => (this.$root as any).runningGames || new Map(),
        addRunningGame: (gameInfo: any) => (this.$root as any).addRunningGame(gameInfo),
        removeRunningGame: (gameId: string) => (this.$root as any).removeRunningGame(gameId),
        isGameRunning: (gameId: string) => (this.$root as any).isGameRunning(gameId)
      })
    }

    this.checkElectronEnvironment()
    
    // 移除等待逻辑，因为 ResourceView 仅在 App.vue 初始化完成后才渲染
    console.log('✅ 存档系统已初始化，开始加载游戏数据')
    
    await this.loadGamesWithChecks()

    // 游戏运行状态现在由 App.vue 全局管理，无需在此处处理

    // 监听游戏时长更新事件（接收总时长，直接设置）
    this.handleGamePlaytimeUpdate = (event: CustomEvent) => {
      const { gameId, totalPlayTime, shouldSave } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game) {
        // 直接设置总时长，不累加
        game.playTime = totalPlayTime
        console.log(`[GameView] 游戏 ${game.name} 时长已更新: ${game.playTime} 秒`)
        
        if (shouldSave) {
          // 游戏结束时保存
          this.saveGames()
          console.log(`[GameView] 游戏 ${game.name} 时长已保存`)
        }
      }
    }
    
    // 初始化游戏初始时长存储
    if (!this.gameInitialPlayTimes) {
      this.gameInitialPlayTimes = new Map()
    }
    
    // 监听请求更新游戏时长事件（App.vue 定时触发）
    this.handleRequestUpdatePlaytime = (event: CustomEvent) => {
      const { gameId } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game && this.gameRunningStore && this.gameInitialPlayTimes) {
        // 如果还没有保存初始值，先保存（第一次更新时）
        if (!this.gameInitialPlayTimes.has(gameId)) {
          this.gameInitialPlayTimes.set(gameId, game.playTime || 0)
        }
        
        // 获取初始 playTime（启动时的值）
        const initialPlayTime = this.gameInitialPlayTimes.get(gameId) || 0
        // 计算当前总时长 = 初始时长 + 会话时长
        const totalPlayTime = this.gameRunningStore.getCurrentPlayTime(gameId, initialPlayTime)
        // 更新游戏时长（用于显示）
        game.playTime = totalPlayTime
        console.log(`[GameView] 游戏 ${game.name} 时长已更新: ${totalPlayTime} 秒 (初始: ${initialPlayTime}, 会话: ${totalPlayTime - initialPlayTime})`)
      }
    }
    
    // 监听请求最终游戏时长事件（游戏结束时）
    this.handleRequestFinalPlaytime = (event: CustomEvent) => {
      const { gameId } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game && this.gameRunningStore && this.gameInitialPlayTimes) {
        // 获取初始 playTime（从保存的初始值获取，如果不存在则使用当前值）
        const initialPlayTime = this.gameInitialPlayTimes.get(gameId) || game.playTime || 0
        // 计算最终总时长
        const totalPlayTime = this.gameRunningStore.getCurrentPlayTime(gameId, initialPlayTime)
        // 更新并保存
        game.playTime = totalPlayTime
        // 清除保存的初始值
        this.gameInitialPlayTimes.delete(gameId)
        this.saveGames()
        console.log(`[GameView] 游戏 ${game.name} 最终时长已保存: ${totalPlayTime} 秒`)
      }
    }
    
    // 监听游戏时长保存事件
    this.handleGamePlaytimeSave = (event: CustomEvent) => {
      const { gameId } = event.detail
      const game = this.games.find(g => g.id === gameId)
      if (game) {
        this.saveGames()
        console.log(`[GameView] 游戏 ${game.name} 时长已保存`)
      }
    }
    
    window.addEventListener('game-playtime-update', this.handleGamePlaytimeUpdate as EventListener)
    window.addEventListener('game-playtime-save', this.handleGamePlaytimeSave as EventListener)
    window.addEventListener('game-request-update-playtime', this.handleRequestUpdatePlaytime as EventListener)
    window.addEventListener('game-request-final-playtime', this.handleRequestFinalPlaytime as EventListener)

    // 加载游戏分页设置（使用 composable 的方法）
    if (this.loadPaginationSettings) {
      await this.loadPaginationSettings('game')
    }

    // 初始化拖拽 composable
    if (this._setDragDropFunctions) {
      this._setDragDropFunctions({
        showPathUpdateDialog: (info) => {
          this.pathUpdateInfo = {
            existingGame: info.existingGame,
            newPath: info.newPath,
            newFileName: info.newFileName
          }
          this.showPathUpdateDialog = true
        },
        addGame: this.addGame
      })
    }

    // 加载排序设置
    await this.loadSortSetting()

    // 初始化筛选器数据
    this.updateFilterData()


    // 监听游戏进程结束事件
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.onGameProcessEnded) {
      console.log('[DEBUG] 🎧 注册 game-process-ended 事件监听器')
      window.electronAPI.onGameProcessEnded((event, data) => {
        console.log('[DEBUG] 📥 收到 game-process-ended 事件，数据:', data)
        this.updateGamePlayTime(data)
      })
    } else {
      console.log('[DEBUG] ⚠️ 无法注册 game-process-ended 事件监听器')
    }

    // 监听全局截图触发事件（只使用全局快捷键）
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.onGlobalScreenshotTrigger) {
      window.electronAPI.onGlobalScreenshotTrigger(() => {
        console.log('全局快捷键触发截图')
        this.takeScreenshot()
      })
    } else {
      // 应用内快捷键功能已禁用
      console.log('全局快捷键不可用，应用内快捷键已禁用')
    }

    // 监听 Flash 播放器错误事件
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.onFlashPlayerError) {
      window.electronAPI.onFlashPlayerError((event, data) => {
        console.error('Flash 播放器错误:', data)
        if (data.type === 'no-path') {
          // 未指定路径，使用 alertService
          alertService.error(data.message, 'Flash 播放器错误')
        } else {
          // 其他错误，使用 toast
          notify.toast('error', 'Flash 播放器错误', data.message)
        }
      })
    }

    // 初始化全局快捷键
    this.initializeGlobalShortcut()
  },
  beforeUnmount() {
    // 清理游戏时长更新事件监听
    if (this.handleGamePlaytimeUpdate) {
      window.removeEventListener('game-playtime-update', this.handleGamePlaytimeUpdate as EventListener)
    }
    if (this.handleGamePlaytimeSave) {
      window.removeEventListener('game-playtime-save', this.handleGamePlaytimeSave as EventListener)
    }
    if (this.handleRequestInitialPlaytime) {
      window.removeEventListener('game-request-initial-playtime', this.handleRequestInitialPlaytime as EventListener)
    }
    
    // 应用内快捷键功能已禁用，无需清理
    // document.removeEventListener('keydown', this.handleKeyDown)

    // 清理全局截图事件监听器
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeGlobalScreenshotListener) {
      // 移除全局截图事件监听器
      window.electronAPI.removeGlobalScreenshotListener()
      console.log('清理全局截图事件监听器')
    } else if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeAllListeners) {
      // 降级方案：移除所有监听器
      window.electronAPI.removeAllListeners('global-screenshot-trigger')
      console.log('清理所有全局截图事件监听器')
    }

    // 清理 Flash 播放器错误事件监听器
    if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeFlashPlayerErrorListener) {
      window.electronAPI.removeFlashPlayerErrorListener()
      console.log('清理 Flash 播放器错误事件监听器')
    } else if (this.isElectronEnvironment && window.electronAPI && window.electronAPI.removeAllListeners) {
      window.electronAPI.removeAllListeners('flash-player-error')
      console.log('清理 Flash 播放器错误事件监听器（降级方案）')
    }
  }
}
</script>

<style lang="scss" scoped>
// 游戏主内容区域
.game-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--spacing-xl);
  height: 100%;
  overflow-y: auto;
  position: relative;
  transition: all var(--transition-base);
  box-sizing: border-box;

  // 拖拽样式
  &.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed var(--accent-color);
    border-radius: var(--radius-xl);

    &::before {
      content: '拖拽游戏文件到这里添加游戏 (.exe / .swf / .bat / .zip / .rar / .7z 等)';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--accent-color);
      color: white;
      padding: var(--spacing-xl) calc(var(--spacing-xl) * 2);
      border-radius: var(--radius-xl);
      font-size: 18px;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      pointer-events: none;
    }
  }
}

// 游戏网格样式已移至 GameGrid.vue 组件

// 强制结束游戏确认对话框样式
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
  z-index: var(--z-modal-backdrop);
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  width: 500px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color var(--transition-base);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xl);
  border-bottom: 1px solid var(--border-color);

  h3 {
    color: var(--text-primary);
    margin: 0;
    transition: color var(--transition-base);
  }
}


.modal-body {
  padding: var(--spacing-xl);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    background: var(--bg-secondary);
  }
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 600;
  transition: background var(--transition-base);

  &:hover:not(:disabled) {
    background: var(--accent-hover);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: var(--spacing-xl);
  }

  .detail-body {
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .detail-image {
    width: 100%;
    height: 250px;
  }

  .detail-stats {
    grid-template-columns: 1fr;
  }

  .detail-actions {
    flex-direction: column;
  }
}
</style>
