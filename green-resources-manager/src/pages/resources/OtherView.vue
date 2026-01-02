<template>
        <BaseView
          ref="baseView"
          :items="allItemsForEmptyState"
          :filtered-items="filteredItems"
          :empty-state-config="otherEmptyStateConfig"
          :toolbar-config="otherToolbarConfig"
          :context-menu-items="otherContextMenuItems"
          :pagination-config="otherPaginationConfig"
          :sort-by="sortBy"
          :search-query="searchQuery"
          @empty-state-action="handleEmptyStateAction"
          @add-item="showAddFileDialog"
          @add-folder="showAddFolderDialog"
          @sort-changed="handleSortChanged"
          @search-query-changed="handleSearchQueryChanged"
          @sort-by-changed="handleSortByChanged"
          @context-menu-click="handleContextMenuClick"
          @page-change="handlePageChange"
        >
    <!-- 主内容区域 -->
    <div 
      class="other-content"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      :class="{ 'drag-over': isDragOver }"
    >

      <!-- 文件和文件夹网格 -->
      <div class="items-grid" v-if="paginatedItems.length > 0">
        <MediaCard
          v-for="item in paginatedItems" 
          :key="item.id"
          :item="item"
          :type="item.type || 'file'"
          :isElectronEnvironment="true"
          :file-exists="item.fileExists"
          @click="item.type === 'folder' ? showFolderDetail(item) : showFileDetail(item)"
          @contextmenu="(event) => ($refs.baseView as any).showContextMenuHandler(event, item)"
          @action="item.type === 'folder' ? openFolder(item) : openFile(item)"
        />
      </div>
    </div>

    <!-- 添加/编辑文件对话框 -->
    <div v-if="showAddDialog || showEditDialog" class="modal-overlay" @click="showAddDialog ? closeAddFileDialog() : closeEditDialog()">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ showAddDialog ? '添加文件' : '编辑文件' }}</h3>
          <button class="btn-close" @click="showAddDialog ? closeAddFileDialog() : closeEditDialog()">×</button>
        </div>
        
        <div class="modal-body">
          <FormField
            label="文件名称 *"
            type="text"
            :model-value="showAddDialog ? newFileForm.name : editFileForm.name"
            @update:model-value="showAddDialog ? (newFileForm.name = $event) : (editFileForm.name = $event)"
            placeholder="文件名称"
          />
          
          <FormField
            label="文件路径 *"
            type="text"
            :model-value="showAddDialog ? newFileForm.filePath : editFileForm.filePath"
            placeholder="文件路径"
            readonly
          />
          <button class="btn-select-file" @click="showAddDialog ? selectFile() : browseEditFile()">
            选择文件
          </button>
          
          <FormField
            label="描述"
            type="textarea"
            :model-value="showAddDialog ? newFileForm.description : editFileForm.description"
            @update:model-value="showAddDialog ? (newFileForm.description = $event) : (editFileForm.description = $event)"
            placeholder="文件描述（可选）..."
            :rows="3"
          />
          
          <FormField
            label="标签"
            type="tags"
            :model-value="showAddDialog ? newFileForm.tags : editFileForm.tags"
            @update:model-value="showAddDialog ? (newFileForm.tags = $event) : (editFileForm.tags = $event)"
            :tagInput="showAddDialog ? fileTagsInput : editTagsInput"
            @update:tagInput="showAddDialog ? (fileTagsInput = $event) : (editTagsInput = $event)"
            @add-tag="showAddDialog ? addFileTag() : addEditTag()"
            @remove-tag="showAddDialog ? removeFileTag($event) : removeEditTag($event)"
            tag-placeholder="输入标签后按回车或逗号添加"
          />
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" @click="showAddDialog ? closeAddFileDialog() : closeEditDialog()">取消</button>
          <button class="btn-confirm" @click="showAddDialog ? handleAddFile() : saveEditedFile()">确认</button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑文件夹对话框 -->
    <div v-if="showFolderDialog || showEditFolderDialog" class="modal-overlay" @click="showFolderDialog ? closeAddFolderDialog() : closeEditFolderDialog()">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ showFolderDialog ? '添加文件夹' : '编辑文件夹' }}</h3>
          <button class="btn-close" @click="showFolderDialog ? closeAddFolderDialog() : closeEditFolderDialog()">×</button>
        </div>
        
        <div class="modal-body">
          <FormField
            label="文件夹名称 *"
            type="text"
            :model-value="showFolderDialog ? newFolder.name : editFolderForm.name"
            @update:model-value="showFolderDialog ? (newFolder.name = $event) : (editFolderForm.name = $event)"
            placeholder="文件夹名称"
          />
          
          <FormField
            label="文件夹路径 *"
            type="text"
            :model-value="showFolderDialog ? newFolder.folderPath : editFolderForm.folderPath"
            placeholder="文件夹路径"
            readonly
          />
          <button class="btn-select-file" @click="showFolderDialog ? selectNewFolderPath() : selectEditFolderPath()">
            选择文件夹
          </button>
          
          <FormField
            label="描述"
            type="textarea"
            :model-value="showFolderDialog ? newFolder.description : editFolderForm.description"
            @update:model-value="showFolderDialog ? (newFolder.description = $event) : (editFolderForm.description = $event)"
            placeholder="文件夹描述（可选）..."
            :rows="3"
          />
          
          <FormField
            label="标签"
            type="tags"
            :model-value="showFolderDialog ? newFolder.tags : editFolderForm.tags"
            @update:model-value="showFolderDialog ? (newFolder.tags = $event) : (editFolderForm.tags = $event)"
            :tagInput="showFolderDialog ? folderTagsInput : editFolderTagsInput"
            @update:tagInput="showFolderDialog ? (folderTagsInput = $event) : (editFolderTagsInput = $event)"
            @add-tag="showFolderDialog ? addFolderTag() : addEditFolderTag()"
            @remove-tag="showFolderDialog ? removeFolderTag($event) : removeEditFolderTag($event)"
            tag-placeholder="输入标签后按回车或逗号添加"
          />
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" @click="showFolderDialog ? closeAddFolderDialog() : closeEditFolderDialog()">取消</button>
          <button class="btn-confirm" @click="showFolderDialog ? addFolder() : saveEditedFolder()">确认</button>
        </div>
      </div>
    </div>

    <!-- 文件/文件夹详情对话框 -->
    <DetailPanel
      :visible="showDetailDialog && !!selectedItem"
      :item="selectedItem"
      :type="selectedItem?.type === 'folder' ? 'folder' : 'file'"
      :stats="itemStats"
      :actions="itemActions"
      :on-update-resource="updateItemResource"
      @close="closeItemDetail"
      @action="handleDetailAction"
    />

    <!-- 路径更新确认对话框 -->
    <PathUpdateDialog
      :visible="showPathUpdateDialog"
      title="更新文件路径"
      description="发现同名但路径不同的文件："
      item-name-label="文件名称"
      :item-name="pathUpdateInfo.existingItem?.name || ''"
      :old-path="pathUpdateInfo.existingItem?.filePath || ''"
      :new-path="pathUpdateInfo.newPath || ''"
      missing-label="文件丢失"
      found-label="文件存在"
      question="是否要更新文件路径？"
      @confirm="confirmPathUpdate"
      @cancel="closePathUpdateDialog"
    />
  </BaseView>
</template>

<script lang="ts">
import FolderManager from '../../utils/FolderManager.ts'
import BaseView from '../../components/BaseView.vue'
import FormField from '../../components/FormField.vue'
import MediaCard from '../../components/MediaCard.vue'
import DetailPanel from '../../components/DetailPanel.vue'
import PathUpdateDialog from '../../components/PathUpdateDialog.vue'

import saveManager from '../../utils/SaveManager.ts'
import notify from '../../utils/NotificationService.ts'
import { ref, watch, PropType } from 'vue'
import { PageConfig } from '../../types/page.ts'
import { usePagination } from '../../composables/usePagination.ts'
import { useVideoFilter } from '../../composables/video/useVideoFilter.ts'
import { useVideoFolder } from '../../composables/video/useVideoFolder.ts'
// 通过 preload 暴露的 electronAPI 进行调用

// 简单的文件管理器类
class FileManager {
  files: any[]
  pageId: string

  constructor(pageId: string = 'other') {
    this.files = []
    this.pageId = pageId
    this.loadFiles()
  }

  async loadFiles() {
    try {
      const data = await saveManager.loadPageData(`other-${this.pageId}`)
      this.files = Array.isArray(data) ? data : []
    } catch (error) {
      console.error('加载文件列表失败:', error)
      this.files = []
    }
  }

  async saveFiles() {
    try {
      await saveManager.savePageData(`other-${this.pageId}`, this.files)
      return true
    } catch (error) {
      console.error('保存文件列表失败:', error)
      return false
    }
  }

  async addFile(fileData: any) {
    const deriveNameFromPath = (filePath: string) => {
      if (!filePath) return ''
      const normalized = filePath.replace(/\\/g, '/')
      const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
      return filename
    }

    const file = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: (fileData.name && fileData.name.trim()) ? fileData.name.trim() : deriveNameFromPath(fileData.filePath) || '未知文件',
      description: fileData.description || '',
      tags: Array.isArray(fileData.tags) ? fileData.tags : [],
      filePath: fileData.filePath || '',
      addedDate: new Date().toISOString(),
      rating: Number(fileData.rating) || 0,
      comment: fileData.comment || '',
      isFavorite: fileData.isFavorite || false
    }

    this.files.push(file)
    await this.saveFiles()
    return file
  }

  async updateFile(id: string, fileData: any) {
    const index = this.files.findIndex(file => file.id === id)
    if (index === -1) return false

    this.files[index] = { ...this.files[index], ...fileData }
    await this.saveFiles()
    return true
  }

  async deleteFile(id: string) {
    const index = this.files.findIndex(file => file.id === id)
    if (index === -1) return false

    this.files.splice(index, 1)
    await this.saveFiles()
    return true
  }
}

export default {
  name: 'OtherView',
  components: {
    BaseView,
    FormField,
    MediaCard,
    DetailPanel,
    PathUpdateDialog,
  },
  emits: ['filter-data-updated'],
  props: {
    pageConfig: {
      type: Object as PropType<PageConfig>,
      default: () => ({ id: 'other', type: 'Other' })
    }
  },
  setup(props) {
    // 文件列表
    const files = ref([])
    
    // 使用文件夹管理 composable
    const folderComposable = useVideoFolder()
    
    // 使用筛选 composable（基于 files 和 folders）
    const filterComposable = useVideoFilter(
      files,
      folderComposable.folders
    )
    
    // 创建一个 ref 用于存储筛选后的列表（用于分页）
    const filteredItemsRef = ref([])
    
    // 监听筛选结果变化，更新 filteredItemsRef
    watch(filterComposable.filteredVideos, (newValue) => {
      filteredItemsRef.value = newValue
    }, { immediate: true })

    // 使用分页 composable
    const paginationComposable = usePagination(
      filteredItemsRef,
      20,
      '文件'
    )

    // 路径更新对话框状态
    const showPathUpdateDialog = ref(false)
    const pathUpdateInfo = ref({
      existingItem: null,
      newPath: '',
      newFileName: ''
    })

    // 拖拽状态
    const isDragOver = ref(false)

    // 文件管理器实例（在 mounted 中初始化）
    const fileManager = ref<FileManager | null>(null)

    // 创建统一的资源更新函数（用于 DetailPanel）
    const updateItemResource = async (id: string, updates: { rating?: number; comment?: string; isFavorite?: boolean }) => {
      // 检查是文件还是文件夹
      const file = files.value.find(f => f.id === id)
      const folder = folderComposable.folders.value.find(f => f.id === id)
      
      if (folder) {
        // 是文件夹
        await folderComposable.updateFolder(id, updates)
      } else if (file && fileManager.value) {
        // 是文件
        await fileManager.value.updateFile(id, updates)
        await fileManager.value.loadFiles()
        files.value = fileManager.value.files
      } else {
        throw new Error('未找到要更新的资源')
      }
    }

    return {
      files,
      filteredItemsRef,
      showPathUpdateDialog,
      pathUpdateInfo,
      isDragOver,
      fileManager,
      // 文件夹管理相关
      ...folderComposable,
      // 筛选相关
      ...filterComposable,
      // 分页相关
      ...paginationComposable,
      // 统一的资源更新函数
      updateItemResource
    }
  },
  data() {
    return {
      // files, folders, searchQuery, sortBy 已移至 setup()
      // fileManager, folderManager 已移至 setup()
      showAddDialog: false,
      showFolderDialog: false,
      // isDragOver 已移至 setup()
      // showPathUpdateDialog, pathUpdateInfo 已移至 setup()
      showDetailDialog: false,
      selectedItem: null,
      searchQuery: '',
      sortBy: 'name',
      // 添加文件表单
      newFileForm: {
        name: '',
        description: '',
        tags: [],
        filePath: ''
      },
      fileTagsInput: '',
      newFolder: {
        name: '',
        description: '',
        tags: [],
        folderPath: ''
      },
      folderTagsInput: '',
      // 编辑相关
      showEditDialog: false,
      editFileForm: {
        id: '',
        name: '',
        description: '',
        tags: [],
        filePath: ''
      },
      editTagsInput: '',
      // 编辑文件夹相关
      showEditFolderDialog: false,
      editFolderForm: {
        id: '',
        name: '',
        description: '',
        tags: [],
        folderPath: ''
      },
      editFolderTagsInput: '',
      // 排序选项
      sortOptions: [
        { value: 'name', label: '按名称排序' },
        { value: 'added', label: '按添加时间' }
      ],
      // 右键菜单配置
      otherContextMenuItems: [
        { key: 'detail', icon: '👁️', label: '查看详情' },
        { key: 'open', icon: '📂', label: '打开文件' },
        { key: 'folder', icon: '📁', label: '打开文件夹' },
        { key: 'edit', icon: '✏️', label: '编辑信息' },
        { key: 'remove', icon: '🗑️', label: '删除' }
      ],
      // 空状态配置
      otherEmptyStateConfig: {
        emptyIcon: '📦',
        emptyTitle: '你的文件库是空的',
        emptyDescription: '点击"添加文件"或"添加文件夹"按钮来添加内容，或直接拖拽文件/文件夹到此处（支持多选）',
        emptyButtonText: '添加第一个文件',
        emptyButtonAction: 'showAddFileDialog',
        noResultsIcon: '🔍',
        noResultsTitle: '没有找到匹配的内容',
        noResultsDescription: '尝试使用不同的搜索词',
        noPageDataIcon: '📄',
        noPageDataTitle: '当前页没有内容',
        noPageDataDescription: '请尝试切换到其他页面'
      },
      // 工具栏配置
      otherToolbarConfig: {
        addButtonText: '添加文件',
        addFolderButtonText: '添加文件夹',
        searchPlaceholder: '搜索文件...',
        sortOptions: [
          { value: 'name', label: '按名称排序' },
          { value: 'added', label: '按添加时间' }
        ],
        pageType: 'other'
      }
    }
  },
  computed: {
    // 合并文件和文件夹，用于空状态判断
    allItemsForEmptyState() {
      return (this as any).allItems || []
    },
    // 使用 composable 的 filteredVideos（虽然名字是 filteredVideos，但实际包含文件和文件夹）
    filteredItems() {
      return this.filteredItemsRef || []
    },
    // 分页显示的项目列表（文件和文件夹）
    paginatedItems() {
      return (this as any).paginatedItems || []
    },
    itemStats() {
      if (!this.selectedItem) return []
      
      if (this.selectedItem.type === 'folder') {
        return [
          { label: '文件夹路径', value: this.getFolderPath(this.selectedItem) },
          { label: '添加时间', value: this.formatAddedDate(this.selectedItem.addedDate) }
        ]
      } else {
        return [
          { label: '文件路径', value: this.selectedItem.filePath || '未设置' },
          { label: '添加时间', value: this.formatAddedDate(this.selectedItem.addedDate) }
        ]
      }
    },
    itemActions() {
      if (this.selectedItem?.type === 'folder') {
        return [
          { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
          { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit' },
          { key: 'remove', icon: '🗑️', label: '删除文件夹', class: 'btn-remove' }
        ]
      } else {
        return [
          { key: 'open', icon: '📂', label: '打开文件', class: 'btn-open' },
          { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
          { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit' },
          { key: 'remove', icon: '🗑️', label: '删除文件', class: 'btn-remove' }
        ]
      }
    },
    // 动态更新分页配置
    otherPaginationConfig() {
      const config = (this as any).paginationConfig || {
        currentPage: 1,
        totalPages: 0,
        pageSize: 20,
        totalItems: 0,
        itemType: '文件'
      }
      
      return {
        ...config,
        totalItems: this.filteredItems.length,
        totalPages: config.totalPages || Math.ceil(this.filteredItems.length / (config.pageSize || 20))
      }
    }
  },
  async mounted() {
    // 初始化文件管理器
    this.fileManager = new FileManager(this.pageConfig.id)
    await this.fileManager.loadFiles()
    this.files = this.fileManager.files
    
    // 初始化文件夹管理器
    if ((this as any).initFolderManager) {
      await (this as any).initFolderManager()
    }
    
    // 加载文件夹
    const loadFoldersFn = (this as any).loadFolders
    if (loadFoldersFn && typeof loadFoldersFn === 'function') {
      await loadFoldersFn.call(this)
    }
    
    // 加载排序设置（使用 composable 的方法）
    if ((this as any).loadSortSetting) {
      await (this as any).loadSortSetting()
    }
    
    // 初始化筛选器数据
    this.updateFilterData()
  },
  watch: {
    // 监听筛选结果变化，更新分页信息
    filteredItems: {
      handler() {
        if ((this as any).updatePagination) {
          (this as any).updatePagination()
        }
      },
      immediate: false
    },
    // 监听搜索查询变化，重置到第一页
    searchQuery() {
      if ((this as any).resetToFirstPage) {
        (this as any).resetToFirstPage()
      }
    },
    // 监听排序变化，重置到第一页
    sortBy() {
      if ((this as any).resetToFirstPage) {
        (this as any).resetToFirstPage()
      }
    }
  },
  methods: {
    async loadFiles() {
      if (this.fileManager) {
        await this.fileManager.loadFiles()
        this.files = this.fileManager.files
        this.updateFilterData()
        
        // 更新分页信息
        if ((this as any).updatePagination) {
          (this as any).updatePagination()
        }
      }
    },

    async loadFolders() {
      const loadFn = (this as any).loadFolders
      if (loadFn && typeof loadFn === 'function') {
        await loadFn.call(this)
      }
    },

    // checkFileExistence 已移至 useVideoManagement composable
    // showMissingFilesAlert 已移至 useVideoManagement composable（在 checkFileExistence 内部处理）
    // 拖拽处理方法
    handleDragOver(event: DragEvent) {
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy'
      }
    },
    
    handleDragEnter(event: DragEvent) {
      event.preventDefault()
      if (!this.isDragOver) {
        this.isDragOver = true
      }
    },
    
    handleDragLeave(event: DragEvent) {
      event.preventDefault()
      if (!event.relatedTarget || !(event.currentTarget as Element).contains(event.relatedTarget as Node)) {
        this.isDragOver = false
      }
    },
    
    async handleDrop(event: DragEvent) {
      event.preventDefault()
      this.isDragOver = false
      
      try {
        const files = Array.from(event.dataTransfer?.files || [])
        
        if (files.length === 0) {
          notify.native('拖拽失败', '请拖拽文件或文件夹到此处')
          return
        }
        
        // 检测文件夹
        const folders = this.detectFoldersFromFiles(files)
        const fileItems = files.filter((file: File) => {
          // 排除已经在文件夹中的文件
          const filePath = (file as any).path || file.name
          return !folders.some((folder: any) => filePath.startsWith(folder.folderPath))
        })
        
        let addedCount = 0
        let failedCount = 0
        
        // 处理文件
        for (const file of fileItems) {
          try {
            const filePath = (file as any).path || file.name
            const normalized = filePath.replace(/\\/g, '/')
            const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
            
            if (this.fileManager) {
              await this.fileManager.addFile({
                name: filename,
                filePath: filePath,
                description: '',
                tags: []
              })
              addedCount++
            }
          } catch (error) {
            console.error('添加文件失败:', error)
            failedCount++
          }
        }
        
        // 处理文件夹
        if (folders.length > 0) {
          for (const folder of folders) {
            try {
              if ((this as any).addFolder) {
                await (this as any).addFolder(folder)
                addedCount++
              }
            } catch (error) {
              console.error('添加文件夹失败:', error)
              failedCount++
            }
          }
        }
        
        // 重新加载数据
        await this.loadFiles()
        await this.loadFolders()
        
        // 显示结果通知
        if (addedCount > 0) {
          notify.toast('success', '批量添加完成', `成功添加 ${addedCount} 个项目${failedCount > 0 ? `，${failedCount} 个项目添加失败` : ''}`)
        } else if (failedCount > 0) {
          notify.toast('error', '添加失败', `所有项目添加失败`)
        }
      } catch (error: any) {
        console.error('拖拽添加失败:', error)
        notify.toast('error', '添加失败', `拖拽添加时发生错误: ${error.message}`)
      }
    },
    
    detectFoldersFromFiles(files: File[]): any[] {
      const folderMap = new Map<string, any>()
      
      for (const file of files) {
        const filePath = (file as any).path || file.name
        const webkitPath = (file as any).webkitRelativePath
        const normalizedPath = filePath ? filePath.replace(/\\/g, '/') : ''
        
        let folderPath = ''
        let folderName = ''
        
        if (webkitPath && webkitPath.includes('/')) {
          const relativePath = webkitPath.replace(/\\/g, '/')
          const relativeParts = relativePath.split('/')
          folderName = relativeParts[0]
          
          const basePath = normalizedPath.slice(0, normalizedPath.length - relativePath.length)
          const sanitizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
          folderPath = sanitizedBasePath ? `${sanitizedBasePath}/${folderName}` : folderName
          folderPath = folderPath.replace(/\\/g, '/')
        } else {
          const entry = typeof (file as any).webkitGetAsEntry === 'function'
            ? (file as any).webkitGetAsEntry()
            : null

          if (entry && entry.isDirectory && normalizedPath) {
            folderPath = normalizedPath
            folderName = file.name
          }
        }
        
        if (folderPath && folderName && !folderMap.has(folderPath)) {
          folderMap.set(folderPath, {
            name: folderName,
            folderPath: folderPath,
            description: '',
            tags: []
          })
        }
      }
      
      return Array.from(folderMap.values())
    },
    
    // 自动更新未知时长的视频
    async autoUpdateUnknownDurations() {
      // 防止重复执行
      if (this.isUpdatingDurations) {
        console.log('⏭️ 视频时长更新正在进行中，跳过重复执行')
        return
      }
      
      this.isUpdatingDurations = true
      console.log('🔄 开始自动更新未知时长的视频...')
      
      try {
        // 检查设置，看是否启用自动更新
        try {
          const settings = await this.loadSettings()
          if (settings.autoUpdateVideoDuration === false) {
            console.log('⏭️ 自动更新视频时长已禁用，跳过')
            return
          }
        } catch (error) {
          console.warn('⚠️ 无法加载设置，继续执行自动更新:', error)
        }
      
      // 筛选出需要更新时长的视频
      const videosToUpdate = this.videos.filter(video => {
        return video.filePath && 
               video.fileExists !== false && 
               (!video.duration || video.duration === 0)
      })
      
      if (videosToUpdate.length === 0) {
        console.log('✅ 所有视频都有时长信息，无需更新')
        return
      }
      
      console.log(`📊 发现 ${videosToUpdate.length} 个视频需要更新时长`)
      
      // 如果视频数量较多，询问用户是否要批量更新
      if (videosToUpdate.length > 10) {
        const shouldUpdate = confirm(
          `发现 ${videosToUpdate.length} 个视频需要更新时长。\n\n` +
          `这可能需要一些时间，是否要现在更新？\n\n` +
          `点击"确定"开始更新，点击"取消"稍后手动更新。`
        )
        
        if (!shouldUpdate) {
          console.log('⏭️ 用户取消了批量更新')
          notify.toast(
            'info',
            '已取消更新', 
            `发现 ${videosToUpdate.length} 个视频需要更新时长，您可以稍后手动更新`
          )
          return
        }
      }
      
      let updatedCount = 0
      let failedCount = 0
      

      
      // 批量更新视频时长
      for (const video of videosToUpdate) {
        try {
          console.log(`🔄 正在更新视频时长: ${video.name}`)
          
          const duration = await this.getVideoDuration(video.filePath)
          if (duration > 0) {
            // 更新视频数据
            await this.videoManager.updateVideo(video.id, {
              ...video,
              duration: duration
            })
            
            // 更新本地数据
            video.duration = duration
            updatedCount++
            
            console.log(`✅ 视频时长更新成功: ${video.name} - ${duration} 分钟`)
          } else {
            console.warn(`⚠️ 无法获取视频时长: ${video.name}`)
            failedCount++
          }
        } catch (error) {
          console.error(`❌ 更新视频时长失败: ${video.name}`, error)
          failedCount++
        }
        
        // 添加小延迟，避免过于频繁的操作
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // 使用 composable 的 saveVideos 方法保存视频数据
      await this.saveVideos()
      
      // 显示更新结果
      if (updatedCount > 0) {
        notify.toast(
          'success',
          '时长更新完成', 
          `成功更新 ${updatedCount} 个视频的时长${failedCount > 0 ? `，${failedCount} 个视频更新失败` : ''}`
        )
      } else if (failedCount > 0) {
        notify.toast(
          'error',
          '时长更新失败', 
          `所有 ${failedCount} 个视频的时长更新失败，请检查视频文件是否有效`
        )
      }
        
        console.log(`📊 视频时长更新完成: 成功 ${updatedCount} 个，失败 ${failedCount} 个`)
      } finally {
        // 重置标志
        this.isUpdatingDurations = false
      }
    },

    // 拖拽处理方法已移至 useVideoDragDrop composable
    // detectFoldersFromFiles, processMultipleVideoFiles, processMultipleFolders, extractVideoName 已移至 composable

    showAddFileDialog() {
      this.resetNewFileForm()
      this.showAddDialog = true
    },

    closeAddFileDialog() {
      this.showAddDialog = false
      this.resetNewFileForm()
    },

    resetNewFileForm() {
      this.newFileForm = {
        name: '',
        description: '',
        tags: [],
        filePath: ''
      }
      this.fileTagsInput = ''
    },

    async selectFile() {
      try {
        // 使用通用的文件选择器（如果可用），否则使用任意文件选择
        let filePath = ''
        if (window.electronAPI && window.electronAPI.selectFile) {
          const result = await window.electronAPI.selectFile()
          filePath = result?.path || result || ''
        } else if (window.electronAPI && window.electronAPI.selectVideoFile) {
          // 回退到视频文件选择器（作为通用文件选择器的临时方案）
          filePath = await window.electronAPI.selectVideoFile()
        }
        
        if (filePath) {
          this.newFileForm.filePath = filePath
          if (!this.newFileForm.name || !this.newFileForm.name.trim()) {
            // 从路径提取文件名
            const normalized = filePath.replace(/\\/g, '/')
            const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
            this.newFileForm.name = filename
          }
        }
      } catch (error) {
        console.error('选择文件失败:', error)
        notify.toast('error', '选择失败', `选择文件时发生错误: ${error.message}`)
      }
    },

    addFileTag() {
      const tag = this.fileTagsInput.trim()
      if (tag && !this.newFileForm.tags.includes(tag)) {
        this.newFileForm.tags.push(tag)
        this.fileTagsInput = ''
      }
    },

    removeFileTag(index) {
      this.newFileForm.tags.splice(index, 1)
    },

    showAddFolderDialog() {
      console.log('showAddFolderDialog 被调用')
      console.log('当前 showFolderDialog 值:', this.showFolderDialog)
      this.resetNewFolder()
      this.showFolderDialog = true
      console.log('showFolderDialog 设置为:', this.showFolderDialog)
      console.log('newFolder 数据:', this.newFolder)
    },

    closeAddFolderDialog() {
      this.showFolderDialog = false
      this.resetNewFolder()
    },

    resetNewFolder() {
      this.newFolder = {
        name: '',
        description: '',
        tags: [],
        folderPath: ''
      }
      this.folderTagsInput = ''
    },


    addFolderTag() {
      const tag = this.folderTagsInput.trim()
      if (tag && !this.newFolder.tags.includes(tag)) {
        this.newFolder.tags.push(tag)
        this.folderTagsInput = ''
      }
    },
    removeFolderTag(index) {
      this.newFolder.tags.splice(index, 1)
    },

    async selectNewFolderPath() {
      try {
        if (window.electronAPI && window.electronAPI.selectFolder) {
          const result = await window.electronAPI.selectFolder()
          if (result && result.success && result.path) {
            this.newFolder.folderPath = result.path
            if (!this.newFolder.name || !this.newFolder.name.trim()) {
              const parts = result.path.replace(/\\/g, '/').split('/')
              this.newFolder.name = parts[parts.length - 1]
            }
          }
        }
      } catch (e) {
        console.error('选择文件夹失败:', e)
      }
    },

    // 获取文件夹路径显示
    getFolderPath(folder) {
      return folder.folderPath || '未设置路径'
    },

    // getFolderVideos 已移至 useVideoFolder composable



    async selectFolderThumbnailFile() {
      try {
        const filePath = await window.electronAPI.selectImageFile()
        if (filePath) {
          this.newFolder.thumbnail = filePath
        }
      } catch (error) {
        console.error('选择文件夹缩略图失败:', error)
      }
    },

    async handleAddFile() {
      try {
        const fileData = { ...this.newFileForm }
        
        // 如果没有名称，从文件路径提取
        if (!fileData.name || !fileData.name.trim()) {
          if (fileData.filePath) {
            const normalized = fileData.filePath.replace(/\\/g, '/')
            const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
            fileData.name = filename
          }
        }
        if (!fileData.name || !fileData.name.trim()) {
          notify.toast('error', '添加失败', '请至少选择一个文件或填写名称')
          return
        }

        if (!fileData.filePath || !fileData.filePath.trim()) {
          notify.toast('error', '添加失败', '请选择文件路径')
          return
        }

        // 使用文件管理器添加文件
        if (this.fileManager) {
          await this.fileManager.addFile(fileData)
          await this.fileManager.loadFiles()
          this.files = this.fileManager.files
          
          // 更新筛选器数据
          this.updateFilterData()
          
          // 重置表单
          this.resetNewFileForm()
          this.closeAddFileDialog()
          
          // 成功时使用 toast 通知
          notify.toast('success', '添加成功', `文件 "${fileData.name}" 已成功添加`)
        }
      } catch (error) {
        console.error('添加文件失败:', error)
        notify.toast('error', '添加失败', `添加文件失败: ${error.message}`)
      }
    },

    async addFolder(folderData?: any) {
      // 如果没有传入 folderData，使用 newFolder
      const data = folderData || this.newFolder
      
      if (!data.name || !data.name.trim()) {
        notify.toast('error', '添加失败', '请填写文件夹名称')
        return
      }
      if (!data.folderPath || !data.folderPath.trim()) {
        notify.toast('error', '添加失败', '请先选择文件夹路径')
        return
      }

      try {
        const folder = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: data.name.trim(),
          description: data.description || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          folderPath: data.folderPath.trim(),
          addedDate: new Date().toISOString()
        }

        // 使用 composable 的 addFolder 方法（通过 this 访问）
        if ((this as any).addFolder && typeof (this as any).addFolder === 'function') {
          const success = await (this as any).addFolder(folder)
          if (success) {
            // 更新筛选器数据
            this.updateFilterData()
            
            // 如果是通过对话框添加的，关闭对话框
            if (!folderData) {
              this.closeAddFolderDialog()
            }
            
            // 成功时使用 toast 通知
            notify.toast('success', '添加成功', `文件夹 "${folder.name}" 已成功添加`)
          } else {
            notify.toast('error', '添加失败', '文件夹添加失败，请重试')
          }
        } else {
          notify.toast('error', '添加失败', '文件夹添加功能不可用')
        }
      } catch (error) {
        console.error('添加文件夹失败:', error)
        notify.toast('error', '添加失败', `添加文件夹失败: ${error.message}`)
      }
    },

    showFileDetail(file) {
      // 确保设置 type 字段
      this.selectedItem = { ...file, type: 'file' }
      this.showDetailDialog = true
    },

    closeItemDetail() {
      this.showDetailDialog = false
      this.selectedItem = null
    },

    async showFolderDetail(folder) {
      // 确保设置 type 字段
      this.selectedItem = { ...folder, type: 'folder' }
      this.showDetailDialog = true
    },

    async openFolder(folder) {
      if (folder && folder.folderPath && window.electronAPI && window.electronAPI.openFolder) {
        try {
          const result = await window.electronAPI.openFolder(folder.folderPath)
          if (!result.success) {
            console.warn('打开文件夹失败:', result.error)
            notify.toast('error', '打开失败', `无法打开文件夹: ${result.error}`)
          }
          return
        } catch (e) {
          console.error('打开文件夹异常:', e)
          notify.toast('error', '打开失败', `打开文件夹时发生错误: ${e.message}`)
        }
      }
      // 回退：显示文件夹路径
      alert(`文件夹路径: ${folder.folderPath || '未设置'}`)
    },

    async openFile(file) {
      if (file && file.filePath && window.electronAPI && window.electronAPI.openFile) {
        try {
          const result = await window.electronAPI.openFile(file.filePath)
          if (!result.success) {
            console.warn('打开文件失败:', result.error)
            notify.toast('error', '打开失败', `无法打开文件: ${result.error}`)
          }
          return
        } catch (e) {
          console.error('打开文件异常:', e)
          notify.toast('error', '打开失败', `打开文件时发生错误: ${e.message}`)
        }
      } else if (file && file.filePath && window.electronAPI && window.electronAPI.openFileFolder) {
        // 如果无法直接打开文件，则打开文件所在文件夹
        try {
          const result = await window.electronAPI.openFileFolder(file.filePath)
          if (!result.success) {
            console.warn('打开文件文件夹失败:', result.error)
            notify.toast('error', '打开失败', `无法打开文件位置: ${result.error}`)
          }
          return
        } catch (e) {
          console.error('打开文件文件夹异常:', e)
          notify.toast('error', '打开失败', `打开文件位置时发生错误: ${e.message}`)
        }
      }
      // 回退：显示文件路径
      alert(`文件路径: ${file.filePath || '未设置'}`)
    },

    // 打开文件夹中的文件（已移除，不再需要）
    // async openFolderFile(file: any) {
    //   try {
    //     console.log('开始播放文件夹视频:', {
    //       name: video.name,
    //       path: video.path
    //     })
    //
    //     // 检查视频文件是否存在
    //     if (window.electronAPI && window.electronAPI.checkFileExists) {
    //       console.log('检查文件存在性:', video.path)
    //       const result = await window.electronAPI.checkFileExists(video.path)
    //       console.log('文件存在性检查结果:', result)
    //       
    //       if (!result.exists) {
    //         console.error('文件不存在:', video.path)
    //         notify.toast('error', '播放失败', `视频文件不存在: ${video.name}\n路径: ${video.path}`)
    //         return
    //       }
    //     } else {
    //       console.warn('Electron API 不可用，跳过文件存在性检查')
    //     }
    //
    //     // 获取当前设置
    //     const settings = await this.loadSettings()
    //     console.log('播放设置:', settings.videoPlayMode)
    //     
    //     if (settings.videoPlayMode === 'internal') {
    //       // 使用内部播放器
    //       console.log('使用内部播放器播放')
    //       await this.playVideoInternal({
    //         name: video.name,
    //         filePath: video.path
    //       })
    //     } else {
    //       // 使用外部播放器
    //       console.log('使用外部播放器播放')
    //       await this.playVideoExternal({
    //         name: video.name,
    //         filePath: video.path
    //       })
    //     }
    //     
    //     notify.toast('success', '播放成功', `正在播放: ${video.name}`)
    //   } catch (error) {
    //     console.error('播放文件夹视频失败:', error)
    //     notify.toast('error', '播放失败', `播放视频失败: ${error.message}`)
    //   }
    // },

    // 为文件夹中的视频生成缩略图
    async generateFolderVideoThumbnail(video, index) {
      try {
        console.log('开始为文件夹视频生成缩略图:', {
          name: video.name,
          path: video.path,
          currentThumbnail: video.thumbnail
        })

        // 设置生成状态
        video.isGeneratingThumbnail = true

        // 生成缩略图文件名：使用文件夹名作为子目录
        const folderName = this.selectedVideo.name
        const cleanFolderName = folderName.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
        const videoFileName = this.extractVideoName(video.path.split('/').pop() || video.path.split('\\').pop() || '')
        const cleanVideoName = videoFileName.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
        
        // 使用 composable 的方法获取当前最大序号
        const maxNumber = await this.getMaxFolderVideoThumbnailNumber(cleanFolderName, cleanVideoName)
        const nextNumber = maxNumber + 1
        
        const thumbnailFilename = `${cleanFolderName}/${cleanVideoName}_cover_${nextNumber}.jpg`

        console.log('缩略图文件名:', thumbnailFilename)
        console.log('当前最大序号:', maxNumber, '新序号:', nextNumber)

        // 删除旧的缩略图文件
        if (video.thumbnail && video.thumbnail.trim()) {
          await this.deleteOldThumbnail(video.thumbnail)
        }

        // 使用 composable 的方法生成缩略图
        const thumbnailPath = await this.generateThumbnailForFolderVideo(video.path, thumbnailFilename)

        if (thumbnailPath) {
          console.log('✅ 缩略图生成成功:', thumbnailPath)
          
          // 更新视频对象的缩略图路径
          video.thumbnail = thumbnailPath
          
          // 更新到原始文件夹对象中
          if (this.selectedVideo && this.selectedVideo.folderVideos) {
            const videoInList = this.selectedVideo.folderVideos[index]
            if (videoInList) {
              videoInList.thumbnail = thumbnailPath
            }
          }

          // 同时更新到 folders 数组中
          const originalFolder = this.folders.find(f => f.id === this.selectedVideo.id)
          if (originalFolder) {
            if (!originalFolder.folderVideos) {
              originalFolder.folderVideos = []
            }
            if (originalFolder.folderVideos[index]) {
              originalFolder.folderVideos[index].thumbnail = thumbnailPath
            }
            
            // 使用 composable 的 updateFolder 方法保存文件夹数据（包含 folderVideos）
            await this.updateFolder(originalFolder.id, originalFolder)
          }

          // 强制更新视图
          this.$forceUpdate()

          notify.toast('success', '生成成功', `缩略图已生成: ${video.name}`)
        } else {
          console.warn('⚠️ 缩略图生成失败')
          notify.toast('error', '生成失败', '无法生成缩略图，请检查视频文件是否有效')
        }
      } catch (error) {
        console.error('生成文件夹视频缩略图失败:', error)
        notify.toast('error', '生成失败', `生成缩略图失败: ${error.message}`)
      } finally {
        // 清除生成状态
        video.isGeneratingThumbnail = false
        // 强制更新视图
        this.$forceUpdate()
      }
    },
    // generateThumbnailForFolderVideo 已移至 useVideoThumbnail composable

    // 处理文件夹视频缩略图加载错误（使用 composable 的方法）
    handleFolderVideoThumbnailError(event) {
      // 使用 composable 的 handleThumbnailError 方法
      this.handleThumbnailError(event)
    },

    handleDetailAction(actionKey, item) {
      if (item.type === 'folder') {
        switch (actionKey) {
          case 'folder':
            this.openFolder(item)
            break
          case 'edit':
            this.editFolder(item)
            break
          case 'remove':
            this.deleteFolder(item)
            break
        }
      } else {
        switch (actionKey) {
          case 'open':
            this.openFile(item)
            break
          case 'folder':
            this.openFileFolder(item)
            break
          case 'edit':
            this.editFile(item)
            break
          case 'remove':
            this.deleteFile(item)
            break
        }
      }
    },

    // playVideo, playVideoInternal, playVideoExternal 已移至 useVideoPlayback composable

    editFile(file) {
      if (!file) return
      this.showDetailDialog = false
      this.editFileForm = {
        id: file.id,
        name: file.name || '',
        description: file.description || '',
        tags: Array.isArray(file.tags) ? [...file.tags] : [],
        filePath: file.filePath || ''
      }
      this.editTagsInput = ''
      // 先设置数据，再显示对话框，确保数据已准备好
      this.$nextTick(() => {
        this.showEditDialog = true
      })
    },
    closeEditDialog() {
      this.showEditDialog = false
    },
    addEditTag() {
      const tag = this.editTagsInput.trim()
      if (tag && !this.editFileForm.tags.includes(tag)) {
        this.editFileForm.tags.push(tag)
        this.editTagsInput = ''
      }
    },
    removeEditTag(index) {
      this.editFileForm.tags.splice(index, 1)
    },
    async browseEditFile() {
      try {
        let filePath = ''
        if (window.electronAPI && window.electronAPI.selectFile) {
          const result = await window.electronAPI.selectFile()
          filePath = result?.path || result || ''
        } else if (window.electronAPI && window.electronAPI.selectVideoFile) {
          filePath = await window.electronAPI.selectVideoFile()
        }
        if (filePath) {
          this.editFileForm.filePath = filePath
        }
      } catch (e) {
        console.error('选择文件失败:', e)
        notify.toast('error', '选择失败', `选择文件时发生错误: ${e.message}`)
      }
    },
     async randomizeThumbnail() {
       try {
         if (!this.editFileForm.filePath) {
           alert('请先选择文件')
           return
         }
         
         console.log('=== 开始生成随机封面 ===')
         console.log('文件路径:', this.editFileForm.filePath)
         console.log('文件名称:', this.editFileForm.name)
         console.log('当前缩略图:', this.editFileForm.thumbnail)
         
         // 使用 composable 的 generateThumbnail 方法（如果可用）
         if (this.generateThumbnail) {
           const thumb = await this.generateThumbnail(
             this.editFileForm.filePath, 
             this.editFileForm.name, 
             this.editFileForm.thumbnail
           )
           console.log('🔄 随机封面生成结果:', thumb)
           if (thumb) {
             console.log('✅ 缩略图生成成功，路径:', thumb)
             this.editFileForm.thumbnail = thumb
             
             // 强制清除缓存，确保新生成的缩略图能正确显示
             if (this.thumbnailUrlCache) {
               const cache = 'value' in this.thumbnailUrlCache ? this.thumbnailUrlCache.value : this.thumbnailUrlCache
               cache.delete(thumb)
             }
             
             // 强制更新视图
             this.$nextTick(() => {
               this.$forceUpdate()
             })
             
             console.log('缩略图生成成功，已更新预览')
           } else {
             console.warn('⚠️ 缩略图生成失败')
             notify.toast('error', '缩略图生成失败', '无法生成缩略图，请检查文件是否有效')
           }
         } else {
           notify.toast('info', '功能不可用', '缩略图生成功能在当前页面不可用')
         }
       } catch (e) {
         console.error('❌ 随机封面失败:', e)
         notify.toast('error', '缩略图生成失败', `生成过程中发生错误: ${e.message}`)
       }
     },
    async saveEditedFile() {
      try {
        const fileData = { ...this.editFileForm }
        
        if (!fileData.name || !fileData.name.trim()) {
          notify.toast('error', '保存失败', '请填写文件名称')
          return
        }
        
        const payload = {
          name: (fileData.name || '').trim(),
          description: (fileData.description || '').trim(),
          tags: Array.isArray(fileData.tags) ? fileData.tags : [],
          filePath: (fileData.filePath || '').trim()
        }
        
        // 使用文件管理器的 updateFile 方法
        if (this.fileManager) {
          await this.fileManager.updateFile(this.editFileForm.id, payload)
          await this.fileManager.loadFiles()
          this.files = this.fileManager.files
          
          // 更新筛选器数据
          this.updateFilterData()
          
          this.showEditDialog = false
          notify.toast('success', '保存成功', '文件信息已更新')
        }
      } catch (e) {
        console.error('保存编辑失败:', e)
        notify.toast('error', '保存失败', `保存编辑失败: ${e.message}`)
      }
    },
    // handleUpdateRating, handleUpdateComment, handleToggleFavorite 已移至 DetailPanel 内部统一处理
    // 保留这些方法作为向后兼容（如果 DetailPanel 没有提供 onUpdateResource prop）
    async handleUpdateRating(rating, video) {
      // 检查 video 是否存在，避免在面板关闭时触发更新
      if (!video || !video.id) {
        return
      }
      try {
        // 根据类型选择更新方法
        if (video.type === 'folder') {
          await this.updateFolder(video.id, { rating })
          // 更新当前文件夹对象，以便详情面板立即显示新星级
          if (this.selectedVideo && this.selectedVideo.id === video.id) {
            this.selectedVideo.rating = rating
          }
        } else {
          await this.updateVideo(video.id, { rating })
          // 更新当前视频对象，以便详情面板立即显示新星级
          if (this.selectedVideo && this.selectedVideo.id === video.id) {
            this.selectedVideo.rating = rating
          }
        }
      } catch (error: any) {
        console.error('更新星级失败:', error)
        alert('更新星级失败: ' + error.message)
      }
    },
    async handleUpdateComment(comment, video) {
      // 检查 video 是否存在，避免在面板关闭时触发更新
      if (!video || !video.id) {
        return
      }
      try {
        // 根据类型选择更新方法
        if (video.type === 'folder') {
          await this.updateFolder(video.id, { comment })
          // 更新当前文件夹对象，以便详情面板立即显示新评论
          if (this.selectedVideo && this.selectedVideo.id === video.id) {
            this.selectedVideo.comment = comment
          }
        } else {
          await this.updateVideo(video.id, { comment })
          // 更新当前视频对象，以便详情面板立即显示新评论
          if (this.selectedVideo && this.selectedVideo.id === video.id) {
            this.selectedVideo.comment = comment
          }
        }
      } catch (error: any) {
        console.error('更新评论失败:', error)
        alert('更新评论失败: ' + error.message)
      }
    },
    async handleToggleFavorite(video) {
      // 检查 video 是否存在，避免在面板关闭时触发更新
      if (!video || !video.id) {
        return
      }
      try {
        const newFavoriteStatus = !video.isFavorite
        // 根据类型选择更新方法（优先使用 type 字段，如果没有则通过其他属性判断）
        const isFolder = video.type === 'folder' || (video.folderPath && !video.filePath && video.folderVideos !== undefined)
        
        if (isFolder) {
          await this.updateFolder(video.id, { isFavorite: newFavoriteStatus })
        } else {
          await this.updateVideo(video.id, { isFavorite: newFavoriteStatus })
        }
        // 更新当前视频对象，以便详情面板立即显示新状态
        if (this.selectedVideo && this.selectedVideo.id === video.id) {
          this.selectedVideo.isFavorite = newFavoriteStatus
        }
      } catch (error: any) {
        console.error('切换收藏状态失败:', error)
        alert('切换收藏状态失败: ' + error.message)
      }
    },

    async deleteFile(file) {
      if (!confirm(`确定要删除文件 "${file.name}" 吗？`)) return
      
      try {
        // 使用文件管理器的 deleteFile 方法
        if (this.fileManager) {
          await this.fileManager.deleteFile(file.id)
          await this.fileManager.loadFiles()
          this.files = this.fileManager.files
          
          // 更新筛选器数据
          this.updateFilterData()
          
          // 显示删除成功通知
          notify.toast('success', '删除成功', `已成功删除文件 "${file.name}"`)
          console.log('文件删除成功:', file.name)
          
          this.closeItemDetail()
        }
      } catch (error) {
        console.error('删除文件失败:', error)
        // 显示删除失败通知
        notify.toast('error', '删除失败', `无法删除文件 "${file.name}": ${error.message}`)
      }
    },

    editFolder(folder) {
      if (!folder) return
      this.showDetailDialog = false
      this.editFolderForm = {
        id: folder.id,
        name: folder.name || '',
        description: folder.description || '',
        tags: Array.isArray(folder.tags) ? [...folder.tags] : [],
        actors: Array.isArray(folder.actors) ? [...folder.actors] : [],
        series: folder.series || '',
        folderPath: folder.folderPath || '',
        thumbnail: folder.thumbnail || ''
      }
      this.editFolderActorsInput = (this.editFolderForm.actors || []).join(', ')
      this.editFolderTagsInput = ''
      this.showEditFolderDialog = true
    },

    closeEditFolderDialog() {
      this.showEditFolderDialog = false
    },

    parseEditFolderActors() {
      if (this.editFolderActorsInput && this.editFolderActorsInput.trim()) {
        this.editFolderForm.actors = this.editFolderActorsInput.split(',').map(s => s.trim()).filter(Boolean)
      } else {
        this.editFolderForm.actors = []
      }
    },

    addEditFolderTag() {
      const tag = this.editFolderTagsInput.trim()
      if (tag && !this.editFolderForm.tags.includes(tag)) {
        this.editFolderForm.tags.push(tag)
        this.editFolderTagsInput = ''
      }
    },

    removeEditFolderTag(index) {
      this.editFolderForm.tags.splice(index, 1)
    },

    async selectEditFolderPath() {
      try {
        if (window.electronAPI && window.electronAPI.selectFolder) {
          const result = await window.electronAPI.selectFolder()
          if (result && result.success && result.path) {
            this.editFolderForm.folderPath = result.path
          }
        }
      } catch (e) {
        console.error('选择编辑文件夹路径失败:', e)
      }
    },

    async selectEditFolderThumbnailFile() {
      try {
        const filePath = await window.electronAPI.selectImageFile()
        if (filePath) {
          this.editFolderForm.thumbnail = filePath
        }
      } catch (error) {
        console.error('选择编辑文件夹缩略图失败:', error)
      }
    },

    // 从文件夹的 Covers 子目录选择图片作为封面（编辑文件夹时）
    async selectFromFolderCovers() {
      try {
        if (!this.editFolderForm.folderPath) {
          alert('请先选择文件夹路径')
          return
        }

        const folderName = this.editFolderForm.name || '未命名文件夹'
        const cleanFolderName = folderName.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
        
        // 构建文件夹的 Covers 子目录的绝对路径
        const baseCoversPath = saveManager.thumbnailDirectories?.videos || 'SaveData/Video/Covers'
        const coversPath = `${baseCoversPath}/${cleanFolderName}`
        
        console.log('=== 从文件夹 Covers 目录选择封面 ===')
        console.log('文件夹名称:', folderName)
        console.log('清理后的文件夹名:', cleanFolderName)
        console.log('基础 Covers 路径:', baseCoversPath)
        console.log('目标 Covers 路径:', coversPath)

        // 先确保目录存在，然后等待确认
        let directoryReady = false
        if (window.electronAPI && window.electronAPI.ensureDirectory) {
          try {
            const ensureResult = await window.electronAPI.ensureDirectory(coversPath)
            if (ensureResult.success) {
              console.log('✅ Covers 目录已确保存在:', coversPath)
              directoryReady = true
            } else {
              console.warn('⚠️ 创建 Covers 目录失败:', ensureResult.error)
            }
          } catch (error) {
            console.warn('⚠️ 确保 Covers 目录存在时出错:', error)
          }
        }

        // 添加短暂延迟，确保目录创建完成
        if (directoryReady) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (window.electronAPI && window.electronAPI.selectImageFile) {
          console.log('📂 调用 selectImageFile，初始路径:', coversPath)
          const filePath = await window.electronAPI.selectImageFile(coversPath)
          console.log('📂 selectImageFile 返回:', filePath)
          
          if (filePath) {
            this.editFolderForm.thumbnail = filePath
            console.log('✅ 已设置文件夹封面:', filePath)
            notify.toast('success', '设置成功', '已选择文件夹封面')
          } else {
            console.log('⚠️ 用户取消了选择')
          }
        } else {
          alert('当前环境不支持选择图片功能')
        }
      } catch (error) {
        console.error('❌ 从文件夹选择封面失败:', error)
        notify.toast('error', '选择失败', `选择封面失败: ${error.message}`)
      }
    },

    // 从文件夹的 Covers 子目录选择图片作为封面（添加文件夹时）
    async selectFromNewFolderCovers() {
      try {
        if (!this.newFolder.folderPath) {
          alert('请先选择文件夹路径')
          return
        }

        const folderName = this.newFolder.name || '未命名文件夹'
        const cleanFolderName = folderName.replace(/[^\w\u4e00-\u9fa5\-_]/g, '_')
        
        // 构建文件夹的 Covers 子目录的绝对路径
        const baseCoversPath = saveManager.thumbnailDirectories?.videos || 'SaveData/Video/Covers'
        const coversPath = `${baseCoversPath}/${cleanFolderName}`
        
        console.log('=== 从文件夹 Covers 目录选择封面（新建）===')
        console.log('文件夹名称:', folderName)
        console.log('清理后的文件夹名:', cleanFolderName)
        console.log('基础 Covers 路径:', baseCoversPath)
        console.log('目标 Covers 路径:', coversPath)

        // 先确保目录存在，然后等待确认
        let directoryReady = false
        if (window.electronAPI && window.electronAPI.ensureDirectory) {
          try {
            const ensureResult = await window.electronAPI.ensureDirectory(coversPath)
            if (ensureResult.success) {
              console.log('✅ Covers 目录已确保存在:', coversPath)
              directoryReady = true
            } else {
              console.warn('⚠️ 创建 Covers 目录失败:', ensureResult.error)
            }
          } catch (error) {
            console.warn('⚠️ 确保 Covers 目录存在时出错:', error)
          }
        }

        // 添加短暂延迟，确保目录创建完成
        if (directoryReady) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        if (window.electronAPI && window.electronAPI.selectImageFile) {
          console.log('📂 调用 selectImageFile，初始路径:', coversPath)
          const filePath = await window.electronAPI.selectImageFile(coversPath)
          console.log('📂 selectImageFile 返回:', filePath)
          
          if (filePath) {
            this.newFolder.thumbnail = filePath
            console.log('✅ 已设置文件夹封面:', filePath)
            notify.toast('success', '设置成功', '已选择文件夹封面')
          } else {
            console.log('⚠️ 用户取消了选择')
          }
        } else {
          alert('当前环境不支持选择图片功能')
        }
      } catch (error) {
        console.error('❌ 从文件夹选择封面失败:', error)
        notify.toast('error', '选择失败', `选择封面失败: ${error.message}`)
      }
    },

    async saveEditedFolder(folderData?: any) {
      try {
        // 如果没有传入 folderData，使用 editFolderForm
        const data = folderData || this.editFolderForm
        this.parseEditFolderActors()
        const payload = {
          name: (data.name || '').trim(),
          description: (data.description || '').trim(),
          tags: data.tags || this.editFolderForm.tags,
          actors: data.actors || this.editFolderForm.actors,
          series: (data.series || '').trim(),
          folderPath: (data.folderPath || '').trim(),
          thumbnail: (data.thumbnail || '').trim()
        }
        // 使用 composable 的 updateFolder 方法
        await this.updateFolder(this.editFolderForm.id, payload)
        
        // 更新筛选器数据
        this.updateFilterData()
        
        this.showEditFolderDialog = false
        notify.toast('success', '保存成功', `文件夹 "${payload.name}" 已更新`)
      } catch (e) {
        console.error('保存编辑文件夹失败:', e)
        notify.toast('error', '保存失败', `保存文件夹失败: ${e.message}`)
      }
    },

    async deleteFolder(folder) {
      if (!confirm(`确定要删除文件夹 "${folder.name}" 吗？`)) return
      
      try {
        // 使用 composable 的 deleteFolder 方法
        const success = await this.deleteFolder(folder.id)
        if (success) {
          // 更新筛选器数据
          this.updateFilterData()
          
          // 显示删除成功通知
          notify.toast('success', '删除成功', `已成功删除文件夹 "${folder.name}"`)
          console.log('文件夹删除成功:', folder.name)
          
          this.closeItemDetail()
        } else {
          notify.toast('error', '删除失败', '文件夹删除失败，请重试')
        }
      } catch (error) {
        console.error('删除文件夹失败:', error)
        // 显示删除失败通知
        notify.toast('error', '删除失败', `无法删除文件夹 "${folder.name}": ${error.message}`)
      }
    },

    /**
     * 右键菜单点击事件处理
     * @param {*} data - 包含 item 和 selectedItem
     */
    handleContextMenuClick(data) {
      const { item, selectedItem } = data
      if (!selectedItem) return
      
      if (selectedItem.type === 'folder') {
        switch (item.key) {
          case 'detail':
            this.showFolderDetail(selectedItem)
            break
          case 'folder':
            this.openFolder(selectedItem)
            break
          case 'edit':
            this.editFolder(selectedItem)
            break
          case 'remove':
            this.deleteFolder(selectedItem)
            break
        }
      } else {
        switch (item.key) {
          case 'detail':
            this.showFileDetail(selectedItem)
            break
          case 'open':
            this.openFile(selectedItem)
            break
          case 'folder':
            this.openFileFolder(selectedItem)
            break
          case 'edit':
            this.editFile(selectedItem)
            break
          case 'remove':
            this.deleteFile(selectedItem)
            break
        }
      }
    },
    
    // 处理空状态按钮点击事件
    handleEmptyStateAction(actionName) {
      if (actionName === 'showAddFileDialog') {
        this.showAddFileDialog()
      }
    },
    
    // 处理搜索查询变化
    handleSearchQueryChanged(newValue) {
      this.searchQuery = newValue
    },
    
    // 处理排序变化
    handleSortByChanged(newValue) {
      this.sortBy = newValue
      console.log('✅ VideoView 排序方式已更新:', newValue)
    },

    // getThumbnailUrl, getThumbnailUrlAsync, handleThumbnailError, resolveThumbnail 已移至 useVideoThumbnail composable
    // onThumbnailLoad 保留在组件中（如果需要）
    async onThumbnailLoad(event) {
      // 缩略图加载成功时的处理
      console.log('缩略图加载成功')
    },

    formatLastWatched(dateString) {
      if (!dateString) return '从未观看'
      
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周前`
      if (diffDays < 365) return `${Math.ceil(diffDays / 30)}个月前`
      return `${Math.ceil(diffDays / 365)}年前`
    },

    formatAddedDate(dateString) {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周前`
      if (diffDays < 365) return `${Math.ceil(diffDays / 30)}个月前`
      return `${Math.ceil(diffDays / 365)}年前`
    },

    formatFirstWatched(dateString) {
      if (!dateString) return '从未观看'
      
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return '今天'
      if (diffDays === 1) return '昨天'
      if (diffDays < 7) return `${diffDays}天前`
      if (diffDays < 30) return `${Math.ceil(diffDays / 7)}周前`
      if (diffDays < 365) return `${Math.ceil(diffDays / 30)}个月前`
      return `${Math.ceil(diffDays / 365)}年前`
    },

    formatDuration(minutes) {
      if (!minutes || minutes === 0) return '未知时长'
      
      // 将分钟转换为秒
      const totalSeconds = Math.floor(minutes * 60)
      const hours = Math.floor(totalSeconds / 3600)
      const mins = Math.floor((totalSeconds % 3600) / 60)
      const secs = totalSeconds % 60
      
      if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      } else {
        return `${mins}:${secs.toString().padStart(2, '0')}`
      }
    },

    // extractNameFromPath 已移至 useVideoThumbnail composable

    // 打开文件所在文件夹
    async openFileFolder(file) {
      try {
        if (!file.filePath) {
          notify.toast('error', '打开失败', '文件路径不存在')
          return
        }
        
        if (window.electronAPI && window.electronAPI.openFileFolder) {
          const result = await window.electronAPI.openFileFolder(file.filePath)
          if (result.success) {
            console.log('已打开文件文件夹:', result.folderPath)
          } else {
            console.error('打开文件夹失败:', result.error)
            notify.toast('error', '打开失败', `打开文件夹失败: ${result.error}`)
          }
        } else {
          // 降级处理：在浏览器中显示路径
          alert(`文件位置:\n${file.filePath}`)
        }
      } catch (error) {
        console.error('打开文件文件夹失败:', error)
        notify.toast('error', '打开失败', `打开文件夹失败: ${error.message}`)
      }
    },

    // 更新视频时长
    async updateVideoDuration(video) {
      try {
        if (!video.filePath) {
          notify.toast('error', '更新失败', '视频文件路径不存在')
          return
        }

        console.log('🔄 开始更新视频时长:', video.name)

        // 使用 composable 的 getVideoDuration 方法
        const duration = await this.getVideoDuration(video.filePath)
        if (duration > 0) {
          // 使用 composable 的 updateVideo 方法更新视频数据
          await this.updateVideo(video.id, {
            ...video,
            duration: duration
          })
          
          // 重新加载视频列表
          await this.loadVideos()
          
          console.log('✅ 视频时长更新成功:', duration, '分钟')
        } else {
          console.warn('⚠️ 无法获取视频时长')
          notify.toast('error', '更新失败', '无法获取视频时长，请检查视频文件是否有效')
        }
      } catch (error) {
        console.error('更新视频时长失败:', error)
        notify.toast('error', '更新失败', `更新视频时长失败: ${error.message}`)
      }
    },

    // 手动批量更新所有未知时长的视频
    async batchUpdateAllDurations() {
      console.log('🔄 开始手动批量更新所有视频时长...')
      
      // 筛选出需要更新时长的视频
      const videosToUpdate = this.videos.filter(video => {
        return video.filePath && 
               video.fileExists !== false && 
               (!video.duration || video.duration === 0)
      })
      
      if (videosToUpdate.length === 0) {
        notify.toast('info', '无需更新', '所有视频都有时长信息')
        return
      }
      
      const shouldUpdate = confirm(
        `发现 ${videosToUpdate.length} 个视频需要更新时长。\n\n` +
        `这可能需要一些时间，是否要开始更新？\n\n` +
        `点击"确定"开始更新，点击"取消"取消操作。`
      )
      
      if (!shouldUpdate) {
        console.log('⏭️ 用户取消了批量更新')
        return
      }
      
      let updatedCount = 0
      let failedCount = 0
      
      // 显示更新进度通知
      notify.toast(
        'info',
        '正在批量更新视频时长', 
        `正在更新 ${videosToUpdate.length} 个视频的时长，请稍候...`
      )
      
      // 批量更新视频时长
      for (const video of videosToUpdate) {
        try {
          console.log(`🔄 正在更新视频时长: ${video.name}`)
          
          const duration = await this.getVideoDuration(video.filePath)
          if (duration > 0) {
            // 更新视频数据
            await this.videoManager.updateVideo(video.id, {
              ...video,
              duration: duration
            })
            
            // 更新本地数据
            video.duration = duration
            updatedCount++
            
            console.log(`✅ 视频时长更新成功: ${video.name} - ${duration} 分钟`)
          } else {
            console.warn(`⚠️ 无法获取视频时长: ${video.name}`)
            failedCount++
          }
        } catch (error) {
          console.error(`❌ 更新视频时长失败: ${video.name}`, error)
          failedCount++
        }
        
        // 添加小延迟，避免过于频繁的操作
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      // 重新加载视频列表以保存更改
      await this.loadVideos()
      
      // 显示更新结果
      if (updatedCount > 0) {
        notify.toast(
          'success',
          '批量更新完成', 
          `成功更新 ${updatedCount} 个视频的时长${failedCount > 0 ? `，${failedCount} 个视频更新失败` : ''}`
        )
      } else if (failedCount > 0) {
        notify.toast(
          'error',
          '批量更新失败', 
          `所有 ${failedCount} 个视频的时长更新失败，请检查视频文件是否有效`
        )
      }
      
      console.log(`📊 批量视频时长更新完成: 成功 ${updatedCount} 个，失败 ${failedCount} 个`)
    },

     // getVideoDuration 已移至 useVideoDuration composable

     // generateThumbnail, buildFileUrl, generateThumbnailFilename, getMaxThumbnailNumber, deleteOldThumbnail 已移至 useVideoThumbnail composable

    // getMaxFolderVideoThumbnailNumber, checkVideoFileAccess 已移至 composables

    // 加载设置
    async loadSettings() {
      try {
        return await saveManager.loadSettings()
      } catch (error) {
        console.error('加载设置失败:', error)
        // 返回默认设置
        return {
          videoPlayMode: 'external'
        }
      }
    },

    // playVideoInternal, playVideoExternal 已移至 useVideoPlayback composable

    // 处理缩略图预览加载错误（使用 composable 的方法）
    async handleThumbnailPreviewError(event) {
      // 处理缩略图预览加载错误
      if (event && event.target) {
        event.target.style.display = 'none'
      }
      console.warn('缩略图预览加载失败')
    },

    // 处理缩略图预览加载成功
    handleThumbnailPreviewLoad(event) {
      console.log('缩略图预览加载成功')
      event.target.style.display = 'block'
    },

    // 关闭路径更新对话框
    closePathUpdateDialog() {
      this.showPathUpdateDialog = false
      this.pathUpdateInfo = {
        existingItem: null,
        newPath: '',
        newFileName: ''
      }
    },

    // 确认路径更新
    async confirmPathUpdate() {
      try {
        const { existingItem, newPath } = this.pathUpdateInfo
        if (!existingItem || !newPath) {
          notify.toast('error', '更新失败', '路径更新信息不完整')
          return
        }
        
        if (existingItem.type === 'folder') {
          // 更新文件夹路径
          if ((this as any).updateFolder) {
            await (this as any).updateFolder(existingItem.id, { folderPath: newPath })
            await this.loadFolders()
          }
        } else {
          // 更新文件路径
          if (this.fileManager) {
            await this.fileManager.updateFile(existingItem.id, { filePath: newPath })
            await this.loadFiles()
          }
        }
        
        this.closePathUpdateDialog()
        this.updateFilterData()
        notify.toast('success', '路径更新成功', `路径已更新`)
      } catch (error) {
        console.error('更新路径失败:', error)
        notify.toast('error', '更新失败', `更新路径失败: ${error.message}`)
      }
    },



    // extractAllFilters 已移至 useVideoFilter composable（通过 allTags, allActors, allSeries 计算属性自动提取）
    // 筛选方法已移至 useVideoFilter composable
    // filterByTag, excludeByTag, clearTagFilter, filterByActor, excludeByActor, clearActorFilter,
    // filterBySeries, excludeBySeries, clearSeriesFilter 已移至 composable
    
    // 处理来自 App.vue 的筛选器事件
    handleFilterEvent(event, data) {
      switch (event) {
        case 'filter-select':
          if (data.filterKey === 'tags') {
            this.filterByTag(data.itemName)
          } else if (data.filterKey === 'actors') {
            this.filterByActor(data.itemName)
          } else if (data.filterKey === 'series') {
            this.filterBySeries(data.itemName)
          } else if (data.filterKey === 'others') {
            this.filterByOther(data.itemName)
          }
          break
        case 'filter-exclude':
          if (data.filterKey === 'tags') {
            this.excludeByTag(data.itemName)
          } else if (data.filterKey === 'actors') {
            this.excludeByActor(data.itemName)
          } else if (data.filterKey === 'series') {
            this.excludeBySeries(data.itemName)
          } else if (data.filterKey === 'others') {
            this.excludeByOther(data.itemName)
          }
          break
        case 'filter-clear':
          if (data === 'tags') {
            this.clearTagFilter()
          } else if (data === 'actors') {
            this.clearActorFilter()
          } else if (data === 'series') {
            this.clearSeriesFilter()
          } else if (data === 'others') {
            this.clearOtherFilter()
          }
          break
      }
      // 更新筛选器数据
      this.updateFilterData()
    },
    
    // 更新筛选器数据到 App.vue（使用 composable 的 getFilterData）
    updateFilterData() {
      if ((this as any).getFilterData) {
        this.$emit('filter-data-updated', (this as any).getFilterData())
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
    
    // 处理分页组件的事件（使用 composable 的 handlePageChange）
    handlePageChange(pageNum) {
      if ((this as any).handlePageChange) {
        (this as any).handlePageChange(pageNum)
      }
    },
    
    // 更新视频列表分页信息（composable 会自动更新，这里只需要同步 filteredVideosRef）
    updateVideoPagination() {
      // 同步 filteredVideos 到 filteredVideosRef，composable 会自动更新分页
      if (this.filteredVideosRef && this.filteredVideos) {
        this.filteredVideosRef = this.filteredVideos
      }
      // 使用 composable 的 updatePagination
      if (this.updatePagination) {
        this.updatePagination()
      }
    },
    
    // 从设置中加载视频分页配置
    async loadVideoPaginationSettings() {
      try {
        const settings = await this.loadSettings()
        
        if (settings && settings.video) {
          const newVideoPageSize = parseInt(settings.video.listPageSize) || 20
          
          // 更新视频列表分页大小
          if (this.videoPageSize !== newVideoPageSize) {
            this.videoPageSize = newVideoPageSize
            
            // 重新计算视频列表分页
            this.updateVideoPagination()
            
            console.log('视频列表分页设置已更新:', {
              listPageSize: this.videoPageSize,
              totalVideoPages: this.totalVideoPages,
              currentVideoPage: this.currentVideoPage
            })
          }
        }
      } catch (error) {
        console.error('加载视频分页设置失败:', error)
        // 使用默认值
        this.videoPageSize = 20
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.video-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

// 文件主内容区域
.other-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: var(--spacing-xl);
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  position: relative;
  transition: all var(--transition-base);

  // 拖拽样式
  &.drag-over {
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed var(--accent-color);
    border-radius: var(--radius-xl);

      &::before {
      content: '拖拽文件或文件夹到这里添加（支持多选）';
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
      z-index: var(--z-modal);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      pointer-events: none;
    }
  }
}

// 工具栏样式
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: var(--spacing-md) 40px var(--spacing-md) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  width: 300px;
  transition: all var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-color-20);
  }
}

.search-icon {
  position: absolute;
  right: var(--spacing-md);
  color: var(--text-secondary);
  pointer-events: none;
}

.sort-select {
  padding: var(--spacing-md) var(--spacing-lg);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--transition-base);

  &:focus {
    outline: none;
    border-color: var(--accent-color);
  }
}

// 文件网格样式
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-3xl);
  padding: var(--spacing-xl);
}

.video-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: all var(--transition-base);
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px var(--shadow-medium);
    border-color: var(--accent-color);

    .video-thumbnail img {
      transform: scale(1.05);
    }

    .video-overlay {
      opacity: 1;
    }
  }
}

.video-thumbnail {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-base);
  }
}

.duration-badge {
  position: absolute;
  bottom: var(--spacing-sm);
  right: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  font-family: 'Courier New', monospace;
  z-index: 10;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.play-button {
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: all var(--transition-base);

  &:hover {
    background: white;
    transform: scale(1.1);
  }
}

.watch-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
}

.progress-bar {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.3);
}

.progress-fill {
  height: 100%;
  background: var(--accent-color);
  transition: width var(--transition-base);
}

.video-info {
  padding: var(--spacing-xl);
}

.video-title {
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 var(--spacing-sm) 0;
  line-height: 1.3;
}

.video-series {
  font-size: var(--font-size-base);
  color: var(--accent-color);
  margin: 0 0 5px 0;
  font-weight: 500;
}

.video-description {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0 0 var(--spacing-md) 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--spacing-md);
}

.video-tag {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 11px;
  border: 1px solid var(--border-color);
}

.video-tag-more {
  background: var(--accent-color-20);
  color: var(--accent-color);
  padding: 4px var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
}

.video-actors {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  margin-bottom: var(--spacing-md);
}

.actors-label {
  font-weight: 500;
  margin-right: 5px;
}

.video-stats {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
}

.stats-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.watch-count {
  font-weight: 500;
  color: var(--text-primary);
}

.added-date {
  font-size: 11px;
  color: var(--text-tertiary);
}


// 空状态样式
.empty-state {
  text-align: center;
  padding: 60px var(--spacing-xl);
  color: var(--text-secondary);

  h3 {
    font-size: var(--font-size-2xl);
    margin-bottom: var(--spacing-md);
    color: var(--text-primary);
  }

  p {
    font-size: var(--font-size-md);
    margin-bottom: var(--spacing-3xl);
  }
}

.empty-icon {
  font-size: 64px;
  margin-bottom: var(--spacing-xl);
  opacity: 0.5;
}

.btn-add-first-video {
  padding: var(--spacing-md) var(--spacing-2xl);
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover {
    background: var(--accent-hover);
    transform: translateY(-2px);
  }
}

// 模态框样式
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

// 表单样式
.form-group {
  margin-bottom: var(--spacing-xl);

  label {
    display: block;
    margin-bottom: var(--spacing-sm);
    color: var(--text-primary);
    font-weight: 500;
    font-size: var(--font-size-base);
  }

  input,
  textarea {
    width: 100%;
    padding: var(--spacing-md);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: var(--font-size-base);
    transition: all var(--transition-base);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--accent-color);
      box-shadow: 0 0 0 3px var(--accent-color-20);
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-xl);
}

.file-input-group {
  display: flex;
  gap: var(--spacing-md);

  input {
    flex: 1;
  }
}

.btn-select-file {
  padding: var(--spacing-md) var(--spacing-xl);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  cursor: pointer;
  transition: all var(--transition-base);
  white-space: nowrap;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--accent-color);
  }
}

.thumb-preview-wrapper {
  margin-top: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.thumb-preview {
  width: 200px;
  height: 120px;
  object-fit: cover;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);
}

.thumb-placeholder {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

// 按钮样式
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

.btn-open {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background 0.3s ease;
  flex: 1;
  justify-content: center;

  &:hover {
    background: var(--accent-hover);
  }
}


.btn-open-folder {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-secondary);
  }
}

.btn-update-duration {
  background: #17a2b8;
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-base);

  &:hover {
    background: #138496;
    transform: translateY(-1px);
  }
}

// 视频详情样式
.video-detail-content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--spacing-3xl);
}

.video-detail-thumbnail {
  img {
    width: 100%;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
  }
}

.video-detail-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.detail-section {
  h4 {
    color: var(--text-primary);
    font-size: var(--font-size-md);
    margin: 0 0 var(--spacing-md) 0;
    font-weight: 600;
  }

  p {
    color: var(--text-secondary);
    margin: 0 0 var(--spacing-sm) 0;
    font-size: var(--font-size-base);
    line-height: 1.5;
  }
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.tag {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  padding: 6px var(--spacing-md);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  border: 1px solid var(--border-color);
}

// 标签输入样式
.tags-input-container {
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  padding: var(--spacing-sm);
  transition: all var(--transition-base);

  &:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px var(--accent-color-20);
  }
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: var(--spacing-sm);
  min-height: 20px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  background: var(--accent-color);
  color: white;
  padding: 4px var(--spacing-sm);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  gap: 4px;
  transition: background var(--transition-base);

  &:hover {
    background: var(--accent-hover);
  }
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  margin-left: 4px;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--transition-base);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.tag-input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 4px 0;
  outline: none;

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.tag-hint {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-top: 6px;
  line-height: 1.4;
}

// 文件夹视频列表样式
.folder-videos-section {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);

  h4 {
    margin: 0 0 var(--spacing-xl) 0;
    color: var(--text-primary);
    font-size: var(--font-size-md);
    font-weight: 600;
  }
}

.folder-videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  max-height: 500px;
  overflow-y: auto;
  padding: 4px;
}

.folder-video-card {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: all var(--transition-base);
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px var(--shadow-medium);
    border-color: var(--accent-color);

    .folder-video-thumbnail img {
      transform: scale(1.05);
    }

    .video-overlay {
      opacity: 1;
    }
  }
}

.folder-video-thumbnail-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; // 16:9 aspect ratio
  overflow: hidden;
  background: var(--bg-secondary);
}

.folder-video-thumbnail {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-base);
  }

  &.placeholder {
    font-size: 48px;
    color: var(--text-tertiary);
    background: var(--bg-secondary);
  }
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-base);
}

.overlay-action-button {
  width: 50px;
  height: 50px;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  color: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);

  &:hover {
    background: white;
    transform: scale(1.1);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
}

.folder-video-info {
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.video-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--font-size-base);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 40px;
}

.video-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.action-button {
  padding: 6px var(--spacing-md);
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-base);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all var(--transition-base);
  border: 1px solid var(--border-color);

  &:hover:not(:disabled) {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.generate-thumbnail-btn {
  background: var(--bg-tertiary);

  &:hover:not(:disabled) {
    background: #17a2b8;
    border-color: #17a2b8;
    color: white;
  }
}

.no-videos {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-secondary);

  p {
    margin: 0;
    font-style: italic;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .items-grid {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95vw;
    margin: var(--spacing-xl);
  }

  .folder-videos-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    max-height: 400px;
    gap: var(--spacing-md);
  }

  .folder-video-info {
    padding: var(--spacing-sm);
  }

  .video-name {
    font-size: var(--font-size-sm);
    min-height: 32px;
  }

  .action-button {
    padding: 4px var(--spacing-sm);
    font-size: var(--font-size-sm);
  }
}

</style>
