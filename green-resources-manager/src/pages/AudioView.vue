<template>
        <BaseView
          ref="baseView"
          :items="audios"
          :filtered-items="filteredAudios"
          :empty-state-config="audioEmptyStateConfig"
          :toolbar-config="audioToolbarConfig"
          :context-menu-items="audioContextMenuItems"
          :pagination-config="audioPaginationConfig"
          :sort-by="sortBy"
          :search-query="searchQuery"
          @empty-state-action="handleEmptyStateAction"
          @add-item="showAddDialog = true"
          @sort-changed="handleSortChanged"
          @search-query-changed="handleSearchQueryChanged"
          @sort-by-changed="handleSortByChanged"
          @context-menu-click="handleContextMenuClick"
          @page-change="handleAudioPageChange"
        >
    <!-- 音频主内容区域 -->
    <div 
      class="audio-content"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      :class="{ 'drag-over': isDragOver }"
    >
      
      <!-- 主要内容区域 -->
      <div class="audio-main-content">
        <!-- 音频列表 -->
        <AudioGrid
          :audios="paginatedAudios"
          :isElectronEnvironment="true"
          @audio-click="showAudioDetail"
          @audio-contextmenu="(event, audio) => ($refs.baseView as any).showContextMenuHandler(event, audio)"
          @audio-action="playAudio"
        />
      </div>
    </div>

    <!-- 添加音频对话框 -->
    <div v-if="showAddDialog" class="modal-overlay" @click="closeAddDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>添加音频文件</h3>
          <button class="btn-close" @click="closeAddDialog">×</button>
        </div>
        
        <div class="modal-body">
          <FormField
            label="音频文件"
            type="file"
            v-model="newAudio.filePath"
            placeholder="选择音频文件..."
            @browse="selectAudioFile"
          />
          
          <FormField
            label="音频名称"
            type="text"
            v-model="newAudio.name"
            placeholder="音频名称（可选，将自动从文件名获取）"
          />
          
          <FormField
            label="艺术家"
            type="text"
            v-model="newAudio.artist"
            placeholder="艺术家"
          />
          
          <FormField
            label="演员（用逗号分隔）"
            type="text"
            v-model="newAudio.actorsInput"
            placeholder="例如: 张三, 李四, 王五"
          />
          
          <FormField
            label="标签（用逗号分隔）"
            type="text"
            v-model="newAudio.tagsInput"
            placeholder="例如: 流行, 经典, 摇滚"
          />
          
          <FormField
            label="备注"
            type="textarea"
            v-model="newAudio.notes"
            placeholder="音频备注..."
            :rows="3"
          />
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddDialog">取消</button>
          <button class="btn-confirm" @click="addAudio">添加</button>
        </div>
      </div>
    </div>

    <!-- 音频详情对话框 -->
    <DetailPanel
      :visible="!!selectedAudio"
      :item="selectedAudio"
      type="audio"
      :stats="audioStats"
      :actions="audioActions"
      @close="closeAudioDetail"
      @action="handleDetailAction"
    />

    <!-- 编辑音频对话框 -->
    <div v-if="showEditDialog" class="modal-overlay" @click="closeEditDialog">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑音频信息</h3>
          <button class="btn-close" @click="closeEditDialog">×</button>
        </div>
        
        <div class="modal-body">
          <FormField
            label="音频文件"
            type="file"
            v-model="editAudioForm.filePath"
            placeholder="选择音频文件..."
            @browse="selectEditAudioFile"
          />
          
          <FormField
            label="音频名称"
            type="text"
            v-model="editAudioForm.name"
            placeholder="音频名称"
          />
          
          <FormField
            label="艺术家"
            type="text"
            v-model="editAudioForm.artist"
            placeholder="艺术家"
          />
          
          <FormField
            label="演员"
            type="tags"
            v-model="editAudioForm.actors"
            v-model:tagInput="editActorInput"
            @add-tag="addEditActor"
            @remove-tag="removeEditActor"
            tagPlaceholder="输入演员名称，按回车或逗号添加"
          />
          
          <FormField
            label="标签"
            type="tags"
            v-model="editAudioForm.tags"
            v-model:tagInput="editTagInput"
            @add-tag="addEditTag"
            @remove-tag="removeEditTag"
            tagPlaceholder="输入标签，按回车或逗号添加"
          />
          
          <FormField
            label="缩略图"
            type="file"
            v-model="editAudioForm.thumbnailPath"
            placeholder="选择缩略图文件..."
            @browse="selectEditThumbnailFile"
          />
          <div v-if="editAudioForm.thumbnailPath" class="thumbnail-preview">
            <img :src="getThumbnailUrl(editAudioForm.thumbnailPath)" alt="缩略图预览" class="preview-image">
          </div>
          
          <FormField
            label="备注"
            type="textarea"
            v-model="editAudioForm.notes"
            placeholder="音频备注..."
            :rows="3"
          />
        </div>
        
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeEditDialog">取消</button>
          <button class="btn-confirm" @click="saveEditedAudio">保存</button>
        </div>
      </div>
    </div>


    <!-- 路径更新确认对话框 -->
    <PathUpdateDialog
      :visible="showPathUpdateDialog"
      title="更新音频路径"
      description="发现同名但路径不同的音频文件："
      item-name-label="音频名称"
      :item-name="pathUpdateInfo.existingAudio?.name || ''"
      :old-path="pathUpdateInfo.existingAudio?.filePath || ''"
      :new-path="pathUpdateInfo.newPath || ''"
      missing-label="文件丢失"
      found-label="文件存在"
      question="是否要更新音频路径？"
      @confirm="confirmPathUpdate"
      @cancel="closePathUpdateDialog"
    />
  </BaseView>
</template>

<script lang="ts">
import audioManager from '../utils/AudioManager.js'
import BaseView from '../components/BaseView.vue'
import FormField from '../components/FormField.vue'
import AudioGrid from '../components/audio/AudioGrid.vue'
import DetailPanel from '../components/DetailPanel.vue'
import PathUpdateDialog from '../components/PathUpdateDialog.vue'

import saveManager from '../utils/SaveManager.ts'
import notify from '../utils/NotificationService.ts'
import { useAudioDuration } from '../composables/audio/useAudioDuration'
import { useAudioDragDrop } from '../composables/audio/useAudioDragDrop'
import { useAudioManagement } from '../composables/audio/useAudioManagement'
import { useAudioFilter } from '../composables/audio/useAudioFilter'
import { useAudioPlayback } from '../composables/audio/useAudioPlayback'
import { formatDuration as formatDurationUtil } from '../utils/formatters.ts'
import { ref, computed } from 'vue'

export default {
  name: 'AudioView',
  components: {
    BaseView,
    FormField,
    AudioGrid,
    DetailPanel,
    PathUpdateDialog,
  },
  emits: ['filter-data-updated'],
  setup() {
    // 初始化音频时长 composable
    const { getAudioDuration } = useAudioDuration()
    
    // 初始化音频管理 composable
    const audioManagement = useAudioManagement()
    
    // 初始化音频筛选 composable
    // 注意：onFilterDataUpdated 需要在组件实例化后设置，所以先传一个占位函数
    const audioFilter = useAudioFilter({
      audios: audioManagement.audios,
      onFilterDataUpdated: (data) => {
        // 这个回调将在 mounted 中重新设置
      }
    })
    
    // 路径更新对话框状态（需要在 setup 中定义，以便传递给 composable）
    const showPathUpdateDialog = ref(false)
    const pathUpdateInfo = ref({
      existingAudio: null,
      newPath: '',
      newFileName: ''
    })
    
    // 音频拖拽 composable 将在 methods 中初始化（因为需要访问 this）
    let audioDragDropComposable: ReturnType<typeof useAudioDragDrop> | null = null
    
    // 初始化音频播放 composable
    const audioPlayback = useAudioPlayback({
      audios: audioManagement.audios,
      onIncrementPlayCount: audioManagement.incrementPlayCount
    })
    
    return {
      getAudioDuration,
      showPathUpdateDialog,
      pathUpdateInfo,
      audioDragDropComposable,
      // 音频管理相关（重命名避免冲突）
      audios: audioManagement.audios,
      isLoading: audioManagement.isLoading,
      loadAudiosFromComposable: audioManagement.loadAudios,
      saveAudios: audioManagement.saveAudios,
      addAudioToManager: audioManagement.addAudio,
      updateAudioInManager: audioManagement.updateAudio,
      deleteAudioFromManager: audioManagement.deleteAudio,
      incrementPlayCountInManager: audioManagement.incrementPlayCount,
      checkFileExistence: audioManagement.checkFileExistence,
      getAudioManager: audioManagement.getAudioManager,
      // 音频筛选相关
      searchQuery: audioFilter.searchQuery,
      sortBy: audioFilter.sortBy,
      selectedTags: audioFilter.selectedTags,
      excludedTags: audioFilter.excludedTags,
      selectedArtists: audioFilter.selectedArtists,
      excludedArtists: audioFilter.excludedArtists,
      allTags: audioFilter.allTags,
      allArtists: audioFilter.allArtists,
      filteredAudios: audioFilter.filteredAudios,
      filterByTag: audioFilter.filterByTag,
      excludeByTag: audioFilter.excludeByTag,
      clearTagFilter: audioFilter.clearTagFilter,
      filterByArtist: audioFilter.filterByArtist,
      excludeByArtist: audioFilter.excludeByArtist,
      clearArtistFilter: audioFilter.clearArtistFilter,
      handleFilterEvent: audioFilter.handleFilterEvent,
      updateFilterData: audioFilter.updateFilterData,
      setFilterDataUpdatedCallback: audioFilter.setFilterDataUpdatedCallback,
      // 音频播放相关
      playAudio: audioPlayback.playAudio,
      addToPlaylist: audioPlayback.addToPlaylist,
      openAudioFolder: audioPlayback.openAudioFolder
    }
  },
  data() {
    return {
      // audios, searchQuery, sortBy, selectedTags, excludedTags, selectedArtists, excludedArtists, allTags, allArtists 已移至 composables
      showAddDialog: false,
      // isDragOver 已移至 useAudioDragDrop composable
      // showPathUpdateDialog 和 pathUpdateInfo 已移至 setup()
      // 音频列表分页相关
      currentAudioPage: 1,
      audioPageSize: 20, // 默认每页显示20个音频
      totalAudioPages: 0,
      selectedAudio: null,
      newAudio: {
        name: '',
        artist: '',
        filePath: '',
        actorsInput: '',
        tagsInput: '',
        notes: ''
      },
      // 编辑相关状态
      showEditDialog: false,
      editAudioForm: {
        id: '',
        name: '',
        artist: '',
        filePath: '',
        thumbnailPath: '',
        actors: [],
        tags: [],
        notes: ''
      },
      editActorInput: '',
      editTagInput: '',
      // 排序选项
      audioSortOptions: [
        { value: 'name', label: '按名称' },
        { value: 'artist', label: '按艺术家' },
        { value: 'playCount', label: '按播放次数' },
        { value: 'addedDate', label: '按添加时间' }
      ],
      // 空状态配置
      audioEmptyStateConfig: {
        emptyIcon: '🎵',
        emptyTitle: '你的音频库是空的',
        emptyDescription: '点击"添加音频"按钮来添加你的第一个音频',
        emptyButtonText: '添加第一个音频',
        emptyButtonAction: 'showAddDialog',
        noResultsIcon: '🔍',
        noResultsTitle: '没有找到匹配的音频',
        noResultsDescription: '尝试使用不同的搜索词',
        noPageDataIcon: '📄',
        noPageDataTitle: '当前页没有音频',
        noPageDataDescription: '请切换到其他页面查看音频'
      },
      // 工具栏配置
      audioToolbarConfig: {
        addButtonText: '添加音频',
        searchPlaceholder: '搜索音频...',
        sortOptions: [
          { value: 'name', label: '按名称' },
          { value: 'artist', label: '按艺术家' },
          { value: 'playCount', label: '按播放次数' },
          { value: 'addedDate', label: '按添加时间' }
        ],
        pageType: 'audio'
      },
      // 右键菜单配置
      audioContextMenuItems: [
        { key: 'detail', icon: '👁️', label: '查看详情' },
        { key: 'play', icon: '▶️', label: '播放' },
        { key: 'addToPlaylist', icon: '➕', label: '添加到播放列表' },
        { key: 'folder', icon: '📁', label: '打开文件夹' },
        { key: 'edit', icon: '✏️', label: '编辑信息' },
        { key: 'delete', icon: '🗑️', label: '删除音频' }
      ]
    }
  },
  computed: {
    // filteredAudios 已移至 useAudioFilter composable
    // 分页显示的音频列表
    paginatedAudios() {
      if (!this.filteredAudios || this.filteredAudios.length === 0) return []
      const start = (this.currentAudioPage - 1) * this.audioPageSize
      const end = start + this.audioPageSize
      return this.filteredAudios.slice(start, end)
    },
    // 当前音频页的起始索引
    currentAudioPageStartIndex() {
      return (this.currentAudioPage - 1) * this.audioPageSize
    },
    audioStats() {
      if (!this.selectedAudio) return []
      
      return [
        { label: '艺术家', value: this.selectedAudio.artist || '未知' },
        { label: '时长', value: this.formatDuration(this.selectedAudio.duration) },
        { label: '播放次数', value: `${this.selectedAudio.playCount || 0} 次` },
        { label: '添加时间', value: this.formatDate(this.selectedAudio.addedDate) }
      ]
    },
    audioActions() {
      const actions = [
        { key: 'play', icon: '▶️', label: '播放', class: 'btn-play-game' },
        { key: 'addToPlaylist', icon: '➕', label: '添加到播放列表', class: 'btn-add-to-playlist' },
        { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
        { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit-game' },
        { key: 'remove', icon: '🗑️', label: '删除音频', class: 'btn-remove-game' }
      ]
      
      // 如果没有时长，添加更新时长按钮
      if (!this.selectedAudio?.duration || this.selectedAudio.duration === 0) {
        actions.splice(2, 0, { key: 'updateDuration', icon: '⏱️', label: '更新时长', class: 'btn-update-duration' })
      }
      
      return actions
    },
    // 动态更新分页配置
    audioPaginationConfig() {
      return {
        currentPage: this.currentAudioPage,
        totalPages: this.totalAudioPages,
        pageSize: this.audioPageSize,
        totalItems: this.filteredAudios.length,
        itemType: '音频'
      }
    },
    // 拖拽状态（从 composable 获取）
    isDragOver() {
      return this.audioDragDropComposable?.isDragOver?.value || false
    }
  },
  methods: {
    // 初始化音频拖拽 composable（延迟初始化，因为需要访问 this）
    initAudioDragDrop() {
      if (this.audioDragDropComposable) return this.audioDragDropComposable
      
      this.audioDragDropComposable = useAudioDragDrop({
        audios: computed(() => this.audios),
        onAddAudio: async (audioData) => {
          return await this.addAudioToManager(audioData)
        },
        onShowPathUpdateDialog: (info) => {
          this.pathUpdateInfo = info
          this.showPathUpdateDialog = true
        },
        onReloadData: async () => {
          await this.loadAudios()
        },
        extractAudioNameFromPath: (filePath) => {
          return this.extractNameFromPath(filePath)
        }
      })
      return this.audioDragDropComposable
    },
    
    async loadAudios() {
      try {
        // 调用 composable 的 loadAudios 方法
        await this.loadAudiosFromComposable()
        
        // 检测文件存在性（仅在应用启动时检测一次）
        if (this.$parent.shouldCheckFileLoss && this.$parent.shouldCheckFileLoss()) {
          await this.checkFileExistence()
          this.$parent.markFileLossChecked()
        }
        
        // 更新筛选器数据
        this.updateFilterData()
        
        // 计算音频列表总页数
        this.updateAudioPagination()
      } catch (error: any) {
        console.error('加载音频数据失败:', error)
        notify.toast('error', '加载失败', '加载音频数据失败: ' + error.message)
      }
    },
    
    // checkFileExistence, updateFilterOptions, filterByTag, excludeByTag, clearTagFilter, 
    // filterByArtist, excludeByArtist, clearArtistFilter, handleFilterEvent, updateFilterData 已移至 composables
    
    async selectAudioFile() {
      try {
        if (window.electronAPI && window.electronAPI.selectAudioFile) {
          const filePath = await window.electronAPI.selectAudioFile()
          if (filePath) {
            this.newAudio.filePath = filePath
            // 自动提取文件名
            this.newAudio.name = this.extractNameFromPath(filePath)
            // 自动获取音频时长
            this.newAudio.duration = await this.getAudioDuration(filePath)
          }
        } else {
          notify.toast('error', '选择失败', '当前环境不支持文件选择功能')
        }
      } catch (error) {
        console.error('选择音频文件失败:', error)
        notify.toast('error', '选择失败', '选择音频文件失败: ' + error.message)
      }
    },
    
    async addAudio() {
      try {
        if (!this.newAudio.filePath) {
          notify.toast('error', '添加失败', '请选择音频文件')
          return
        }
        
        const audioData = {
          ...this.newAudio,
          actors: this.newAudio.actorsInput ? this.newAudio.actorsInput.split(',').map(actor => actor.trim()).filter(actor => actor) : [],
          tags: this.newAudio.tagsInput ? this.newAudio.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : []
        }
        
        const audio = await this.addAudioToManager(audioData)
        // 重新加载音频列表，确保数据同步
        await this.loadAudios()
        this.closeAddDialog()
        notify.native('音频添加成功', `已添加音频: ${audio.name}`)
      } catch (error) {
        console.error('添加音频失败:', error)
        notify.toast('error', '添加失败', '添加音频失败: ' + error.message)
      }
    },
    
    // playAudio, addToPlaylist, openAudioFolder 已移至 useAudioPlayback composable
    
    async deleteAudio(audio) {
      if (!confirm(`确定要删除音频 "${audio.name}" 吗？`)) return
      
      try {
        await this.deleteAudioFromManager(audio.id)
        
        // 显示删除成功通知
        notify.toast('success', '删除成功', `已成功删除音频 "${audio.name}"`)
        console.log('音频删除成功:', audio.name)
        
        this.closeAudioDetail()
      } catch (error) {
        console.error('删除音频失败:', error)
        // 显示删除失败通知
        notify.toast('error', '删除失败', `无法删除音频 "${audio.name}": ${error.message}`)
      }
    },
    
    showAudioDetail(audio) {
      this.selectedAudio = audio
      this.contextMenu.visible = false
    },
    
    closeAudioDetail() {
      this.selectedAudio = null
    },
    handleDetailAction(actionKey, audio) {
      switch (actionKey) {
        case 'play':
          this.playAudio(audio)
          break
        case 'addToPlaylist':
          this.addToPlaylist(audio)
          break
        case 'updateDuration':
          this.updateAudioDuration(audio)
          break
        case 'folder':
          this.openAudioFolder(audio)
          break
        case 'edit':
          this.editAudio(audio)
          break
        case 'remove':
          this.deleteAudio(audio)
          break
      }
    },
    
    closeAddDialog() {
      this.showAddDialog = false
      this.newAudio = {
        name: '',
        artist: '',
        filePath: '',
        actorsInput: '',
        tagsInput: '',
        notes: ''
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
          this.showAudioDetail(selectedItem)
          break
        case 'play':
          this.playAudio(selectedItem)
          break
        case 'addToPlaylist':
          this.addToPlaylist(selectedItem)
          break
        case 'folder':
          this.openAudioFolder(selectedItem)
          break
        case 'edit':
          this.editAudio(selectedItem)
          break
        case 'delete':
          this.deleteAudio(selectedItem)
          break
      }
    },
    
    // 处理空状态按钮点击事件
    handleEmptyStateAction(actionName) {
      if (actionName === 'showAddDialog') {
        this.showAddDialog = true
      }
    },
    
    // 处理搜索查询变化
    handleSearchQueryChanged(newValue) {
      this.searchQuery = newValue
    },
    
    // 处理排序变化
    handleSortByChanged(newValue) {
      this.sortBy = newValue
      console.log('✅ AudioView 排序方式已更新:', newValue)
    },
    
    editAudio(audio) {
      this.editAudioForm = {
        id: audio.id,
        name: audio.name || '',
        artist: audio.artist || '',
        filePath: audio.filePath || '',
        thumbnailPath: audio.thumbnailPath || '',
        actors: audio.actors || [],
        tags: audio.tags || [],
        notes: audio.notes || ''
      }
      this.editActorInput = ''
      this.editTagInput = ''
      this.showEditDialog = true
      this.contextMenu.visible = false
      
      // 关闭详情页面
      this.closeAudioDetail()
    },
    
    closeEditDialog() {
      this.showEditDialog = false
      this.editAudioForm = {
        id: '',
        name: '',
        artist: '',
        filePath: '',
        thumbnailPath: '',
        actors: [],
        tags: [],
        notes: ''
      }
      this.editActorInput = ''
      this.editTagInput = ''
    },
    
    // 演员管理
    addEditActor() {
      const actor = this.editActorInput.trim()
      if (actor && !this.editAudioForm.actors.includes(actor)) {
        this.editAudioForm.actors.push(actor)
        this.editActorInput = ''
      }
    },
    
    removeEditActor(index) {
      this.editAudioForm.actors.splice(index, 1)
    },
    
    // 标签管理
    addEditTag() {
      const tag = this.editTagInput.trim()
      if (tag && !this.editAudioForm.tags.includes(tag)) {
        this.editAudioForm.tags.push(tag)
        this.editTagInput = ''
      }
    },
    
    removeEditTag(index) {
      this.editAudioForm.tags.splice(index, 1)
    },
    
    // 文件选择
    async selectEditAudioFile() {
      try {
        if (window.electronAPI && window.electronAPI.selectAudioFile) {
          const filePath = await window.electronAPI.selectAudioFile()
          if (filePath) {
            this.editAudioForm.filePath = filePath
            // 如果名称为空，自动提取文件名
            if (!this.editAudioForm.name) {
              this.editAudioForm.name = this.extractNameFromPath(filePath)
            }
            // 自动获取音频时长
            this.editAudioForm.duration = await this.getAudioDuration(filePath)
          }
        } else {
          notify.toast('error', '选择失败', '当前环境不支持文件选择功能')
        }
      } catch (error) {
        console.error('选择音频文件失败:', error)
        notify.toast('error', '选择失败', '选择音频文件失败: ' + error.message)
      }
    },
    
    async selectEditThumbnailFile() {
      try {
        if (window.electronAPI && window.electronAPI.selectImageFile) {
          const filePath = await window.electronAPI.selectImageFile()
          if (filePath) {
            this.editAudioForm.thumbnailPath = filePath
          }
        } else {
          alert('当前环境不支持文件选择功能')
        }
      } catch (error) {
        console.error('选择缩略图文件失败:', error)
        alert('选择缩略图文件失败: ' + error.message)
      }
    },
    
    // 获取缩略图URL
    getThumbnailUrl(thumbnailPath) {
      if (!thumbnailPath) return ''
      if (window.electronAPI && window.electronAPI.getFileUrl) {
        return window.electronAPI.getFileUrl(thumbnailPath)
      }
      return thumbnailPath.startsWith('file://') ? thumbnailPath : `file://${thumbnailPath}`
    },
    
    // 保存编辑
    async saveEditedAudio() {
      try {
        if (!this.editAudioForm.name.trim()) {
          alert('请输入音频名称')
          return
        }
        
        if (!this.editAudioForm.filePath.trim()) {
          alert('请选择音频文件')
          return
        }
        
        const audioData = {
          name: this.editAudioForm.name.trim(),
          artist: this.editAudioForm.artist.trim(),
          filePath: this.editAudioForm.filePath,
          thumbnailPath: this.editAudioForm.thumbnailPath,
          actors: this.editAudioForm.actors,
          tags: this.editAudioForm.tags,
          notes: this.editAudioForm.notes.trim()
        }
        
        await this.updateAudioInManager(this.editAudioForm.id, audioData)
        
        // 重新加载音频列表
        await this.loadAudios()
        
        // 关闭编辑对话框
        this.closeEditDialog()
        
        notify.native('音频更新成功', `已更新音频: ${audioData.name}`)
      } catch (error) {
        console.error('更新音频失败:', error)
        alert('更新音频失败: ' + error.message)
      }
    },
    
    formatDuration(seconds) {
      return formatDurationUtil(seconds, '未知时长')
    },
    formatDate(dateString) {
      if (!dateString) return '未知'
      try {
        return new Date(dateString).toLocaleDateString('zh-CN')
      } catch {
        return '未知'
      }
    },

    // 更新音频时长
    async updateAudioDuration(audio) {
      try {
        if (!audio.filePath) {
          alert('音频文件路径不存在')
          return
        }
        
        console.log('🔄 开始更新音频时长:', audio.name)
        const duration = await this.getAudioDuration(audio.filePath)
        
        if (duration > 0) {
          // 更新音频数据
          await this.updateAudioInManager(audio.id, { duration })
          
          // 更新本地数据
          const index = this.audios.findIndex(a => a.id === audio.id)
          if (index !== -1) {
            this.audios[index].duration = duration
          }
          
          // 更新选中的音频数据
          if (this.selectedAudio && this.selectedAudio.id === audio.id) {
            this.selectedAudio.duration = duration
          }
          
          console.log('✅ 音频时长更新成功:', duration, '秒')
          notify.native('时长更新成功', `音频时长已更新为: ${this.formatDuration(duration)}`)
        } else {
          alert('无法获取音频时长，请检查文件是否有效')
        }
      } catch (error) {
        console.error('更新音频时长失败:', error)
        alert('更新音频时长失败: ' + error.message)
      }
    },

    
    extractNameFromPath(filePath) {
      if (!filePath) return ''
      const normalized = filePath.replace(/\\/g, '/')
      const filename = normalized.substring(normalized.lastIndexOf('/') + 1)
      const dotIndex = filename.lastIndexOf('.')
      return dotIndex > 0 ? filename.substring(0, dotIndex) : filename
    },
    
    // 拖拽处理方法（使用 composable）
    handleDragOver(event) {
      const composable = this.initAudioDragDrop()
      return composable.handleDragOver(event)
    },
    
    handleDragEnter(event) {
      const composable = this.initAudioDragDrop()
      return composable.handleDragEnter(event)
    },
    
    handleDragLeave(event) {
      const composable = this.initAudioDragDrop()
      return composable.handleDragLeave(event)
    },
    
    async handleDrop(event) {
      const composable = this.initAudioDragDrop()
      return await composable.handleDrop(event)
    },

    // 路径更新相关方法
    closePathUpdateDialog() {
      this.showPathUpdateDialog = false
      this.pathUpdateInfo = {
        existingAudio: null,
        newPath: '',
        newFileName: ''
      }
    },
    
    async confirmPathUpdate() {
      try {
        const { existingAudio, newPath } = this.pathUpdateInfo
        
        if (!existingAudio || !newPath) {
          console.error('路径更新信息不完整')
          notify.toast('error', '更新失败', '路径更新信息不完整')
          return
        }
        
        console.log(`更新音频 "${existingAudio.name}" 的路径:`)
        console.log(`旧路径: ${existingAudio.filePath}`)
        console.log(`新路径: ${newPath}`)
        
        // 更新音频路径
        existingAudio.filePath = newPath
        existingAudio.fileExists = true
        
        // 重新获取音频时长（如果之前没有）
        if (!existingAudio.duration || existingAudio.duration === 0) {
          try {
            console.log('🔄 重新获取音频时长...')
            const duration = await this.getAudioDuration(newPath)
            if (duration > 0) {
              existingAudio.duration = duration
              console.log('✅ 音频时长更新成功:', duration, '秒')
            }
          } catch (e) {
            console.warn('获取音频时长失败:', e)
          }
        }
        
        // 保存更新后的数据
        await this.updateAudioInManager(existingAudio.id, {
          filePath: newPath,
          fileExists: true,
          duration: existingAudio.duration
        })
        
        // 重新加载音频列表
        await this.loadAudios()
        
        // 关闭对话框
        this.closePathUpdateDialog()
        
        // 显示成功通知
        notify.toast(
          'success',
          '路径更新成功', 
          `音频 "${existingAudio.name}" 的路径已更新`
        )
        
        console.log(`音频 "${existingAudio.name}" 路径更新完成`)
        
      } catch (error) {
        console.error('更新音频路径失败:', error)
        notify.toast('error', '更新失败', `更新音频路径失败: ${error.message}`)
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
        const savedSortBy = await saveManager.getSortSetting('audio')
        if (savedSortBy && savedSortBy !== this.sortBy) {
          this.sortBy = savedSortBy
          console.log('✅ 已加载音频页面排序方式:', savedSortBy)
        }
      } catch (error) {
        console.warn('加载排序方式失败:', error)
      }
    },
    
    // 处理分页组件的事件
    handleAudioPageChange(pageNum) {
      this.currentAudioPage = pageNum
    },
    
    // 更新音频列表分页信息
    updateAudioPagination() {
      this.totalAudioPages = Math.ceil(this.filteredAudios.length / this.audioPageSize)
      // 确保当前页不超过总页数
      if (this.currentAudioPage > this.totalAudioPages && this.totalAudioPages > 0) {
        this.currentAudioPage = this.totalAudioPages
      }
      // 如果当前页为0且没有数据，重置为1
      if (this.currentAudioPage === 0 && this.filteredAudios.length > 0) {
        this.currentAudioPage = 1
      }
    },
    
    // 从设置中加载音频分页配置
    async loadAudioPaginationSettings() {
      try {
        const settings = await saveManager.loadSettings()
        
        if (settings && settings.audio) {
          const newAudioPageSize = parseInt(settings.audio.listPageSize) || 20
          
          // 更新音频列表分页大小
          if (this.audioPageSize !== newAudioPageSize) {
            this.audioPageSize = newAudioPageSize
            
            // 重新计算音频列表分页
            this.updateAudioPagination()
            
            console.log('音频列表分页设置已更新:', {
              listPageSize: this.audioPageSize,
              totalAudioPages: this.totalAudioPages,
              currentAudioPage: this.currentAudioPage
            })
          }
        }
      } catch (error) {
        console.error('加载音频分页设置失败:', error)
        // 使用默认值
        this.audioPageSize = 20
      }
    },
  },
  watch: {
    // 监听筛选结果变化，更新分页信息
    filteredAudios: {
      handler() {
        this.updateAudioPagination()
      },
      immediate: false
    },
    // 监听搜索查询变化，重置到第一页
    searchQuery() {
      this.currentAudioPage = 1
    },
    // 监听排序变化，重置到第一页
    sortBy() {
      this.currentAudioPage = 1
    }
  },
  async mounted() {
    // 等待父组件（App.vue）的存档系统初始化完成
    const maxWaitTime = 5000
    const startTime = Date.now()
    while (!this.$parent.isInitialized && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    if (this.$parent.isInitialized) {
      console.log('✅ 存档系统已初始化，开始加载音频数据')
    }
    
    await this.loadAudios()
    
    // 加载音频分页设置
    await this.loadAudioPaginationSettings()
    
    // 加载排序设置
    await this.loadSortSetting()
    
    // 设置筛选器数据更新回调
    this.setFilterDataUpdatedCallback((data) => {
      this.$emit('filter-data-updated', data)
    })
    
    // 初始化筛选器数据
    this.updateFilterData()
  }
}
</script>

<style lang="scss" scoped>
// 音频主内容区域
.audio-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  height: 100%;
  overflow-y: auto;
  position: relative;
  transition: all 0.3s ease;

  &.drag-over {
    background-color: rgba(102, 192, 244, 0.1);
    background: rgba(59, 130, 246, 0.1);
    border: 2px dashed var(--accent-color);
    border-radius: 12px;

    &::before {
      content: '拖拽音频文件到这里添加音频（支持多选）';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--accent-color);
      color: white;
      padding: 20px 40px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      pointer-events: none;
    }
  }
}

// 主要内容区域
.audio-main-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: calc(100vh - 120px);
  padding: 20px;
  box-sizing: border-box;
}

// 工具栏样式
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  padding: 10px 40px 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  width: 300px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }
}

.search-icon {
  position: absolute;
  right: 12px;
  color: var(--text-secondary);
  pointer-events: none;
}

.sort-select {
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
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
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  transition: background-color 0.3s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);

  h3 {
    color: var(--text-primary);
    margin: 0;
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 5px;
  border-radius: 4px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
  }
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

// 表单样式
.form-group {
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 5px;
    color: var(--text-primary);
    font-weight: 500;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }
}

.file-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.file-path-input {
  flex: 1;
}

.btn-browse {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: var(--accent-hover);
  }
}

// 按钮样式
.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;

  &:hover {
    background: var(--bg-tertiary);
  }
}

.btn-confirm {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: var(--accent-hover);
  }
}

// 音频详情样式
.audio-detail-modal {
  max-width: 800px;
}

.audio-detail-content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 30px;
}

.audio-detail-thumbnail {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  height: 200px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 12px;
  }
}

.audio-detail-icon {
  font-size: 4rem;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.audio-detail-info {
  flex: 1;
}

.detail-section {
  margin-bottom: 25px;

  h4 {
    color: var(--text-primary);
    margin-bottom: 15px;
    font-size: 1.1rem;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.detail-value {
  color: var(--text-primary);
  font-size: 1rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  background: var(--accent-color);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
}

.notes-text {
  color: var(--text-primary);
  line-height: 1.5;
  background: var(--bg-secondary);
  padding: 15px;
  border-radius: 8px;
  margin: 0;
}

// 详情按钮样式
.btn-play {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: var(--accent-hover);
  }
}

.btn-open-folder {
  background: #10b981;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: #059669;
  }
}

.btn-edit {
  background: #f59e0b;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: #d97706;
  }
}

.btn-delete {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: #dc2626;
  }
}

.btn-add-to-playlist {
  background: #8b5cf6;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;

  &:hover {
    background: #7c3aed;
  }
}

.btn-update-duration {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;

  &:hover {
    background: #138496;
    transform: translateY(-1px);
  }
}

// 标签输入样式
.tags-input-container {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px;
  background: var(--bg-secondary);
  transition: all 0.3s ease;

  &:focus-within {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 3px rgba(102, 192, 244, 0.1);
  }
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  background: var(--accent-color);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  gap: 4px;
}

.tag-text {
  font-weight: 500;
}

.tag-remove {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.tag-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 0.9rem;
  padding: 4px 0;

  &::placeholder {
    color: var(--text-tertiary);
  }
}

.tag-hint {
  font-size: 0.7rem;
  color: var(--text-tertiary);
  margin-top: 4px;
}

// 演员标签样式
.actor-tag {
  background: #8b5cf6 !important;
}

// 缩略图预览样式
.thumbnail-preview {
  margin-top: 15px;
  text-align: center;
  padding: 10px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.preview-image {
  max-width: 200px;
  max-height: 150px;
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-light);
  object-fit: cover;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .audio-detail-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>