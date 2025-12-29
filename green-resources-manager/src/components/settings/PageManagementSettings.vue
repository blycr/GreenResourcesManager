<template>
  <div class="page-management-settings">
    <div class="settings-section">
      <h3>页面管理</h3>
      <p class="section-desc">管理侧边栏显示的页面，可以添加自定义页面、排序或隐藏不需要的页面。</p>

      <div class="actions-bar">
        <button class="btn-primary" @click="showAddPageDialog">
          <span class="icon">➕</span> 添加新页面
        </button>
      </div>

      <div class="pages-list" :class="{ 'is-dragging': isDragging }">
        <div
          v-for="(page, index) in previewPages"
          :key="page.id"
          class="page-item"
          :class="{ 'is-hidden': page.isHidden, dragging: draggingId === page.id }"
          @dragover.prevent="onDragOver($event, index)"
          @drop.prevent="onDrop($event, index)"
        >
          <div
            class="page-drag-handle"
            draggable="true"
            title="拖拽排序"
            @dragstart.stop="onDragStart($event, index)"
            @dragend.stop="onDragEnd"
          >
            ⋮⋮
          </div>
          <div class="page-icon">{{ page.icon }}</div>
          <div class="page-info">
            <div class="page-name">
              {{ page.name }}
              <span v-if="page.isDefault" class="badge system">系统</span>
              <span v-if="page.isHidden" class="badge hidden">已隐藏</span>
            </div>
            <div class="page-type">{{ getTypeName(page.type) }}</div>
          </div>

          <div class="page-actions">
            <button
              class="btn-icon"
              title="上移"
              @click="moveUp(getActualIndex(page.id))"
              :disabled="getActualIndex(page.id) === 0"
            >
              ▲
            </button>
            <button
              class="btn-icon"
              title="下移"
              @click="moveDown(getActualIndex(page.id))"
              :disabled="getActualIndex(page.id) === pages.length - 1"
            >
              ▼
            </button>
            <button
              class="btn-icon"
              :title="page.isHidden ? '显示页面' : '隐藏页面'"
              @click="toggleVisibility(page)"
            >
              {{ page.isHidden ? '🚫' : '👁️' }}
            </button>
            <button class="btn-icon" title="编辑" @click="editPage(page)">
              ✏️
            </button>
            <button
              class="btn-icon delete"
              title="删除"
              :disabled="page.isDefault"
              @click="deletePage(page)"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑页面' : '添加新页面' }}</h3>
          <button class="close-btn" @click="closeDialog">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>页面名称</label>
            <input v-model.trim="editingPage.name" type="text" placeholder="例如：我的收藏" maxlength="20" />
          </div>
          <div class="form-group">
            <label>资源类型</label>
            <select v-model="editingPage.type" :disabled="isEditing || editingPage.isDefault">
              <option value="Game">游戏 (Game)</option>
              <option value="Software">软件 (Software)</option>
              <option value="Image">图片 (Image)</option>
              <option value="SingleImage">单图 (SingleImage)</option>
              <option value="Video">电影 (Video)</option>
              <option value="Anime">番剧 (Anime)</option>
              <option value="Novel">小说 (Novel)</option>
              <option value="Audio">音频 (Audio)</option>
              <option value="Website">网站 (Website)</option>
            </select>
            <p class="help-text" v-if="isEditing && !editingPage.isDefault">资源类型创建后不可修改</p>
            <p class="help-text" v-if="editingPage.isDefault">系统默认页面的资源类型不可修改</p>
          </div>
          <div class="form-group">
            <label>图标</label>
            <div class="icon-selector">
              <input v-model="editingPage.icon" type="text" placeholder="输入 emoji 或选择" class="icon-input" />
              <div class="quick-icons">
                <span v-for="icon in quickIcons" :key="icon" @click="editingPage.icon = icon">{{ icon }}</span>
              </div>
            </div>
          </div>
          <div class="form-group">
            <label>页面描述</label>
            <input v-model.trim="editingPage.description" type="text" placeholder="例如：管理我喜欢的资源" maxlength="50" />
            <p class="help-text">显示在页面顶部的描述文字</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="closeDialog">取消</button>
          <button class="btn-primary" @click="savePage" :disabled="!isValidPage">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, ref } from 'vue'
import customPageManager from '../../utils/CustomPageManager'
import { PageConfig } from '../../types/page'

const TYPE_NAME_MAP: Record<string, string> = {
  Game: '游戏',
  Software: '软件',
  Image: '图片',
  SingleImage: '单图',
  Video: '电影',
  Anime: '番剧',
  Novel: '小说',
  Audio: '音频',
  Website: '网站'
}

const DEFAULT_PAGE_PRESET: Partial<PageConfig> = {
  type: 'Game',
  icon: '📁',
  description: '',
  isHidden: false
}

export default defineComponent({
  name: 'PageManagementSettings',
  emits: ['pages-updated'],
  setup(_, { emit }) {
    const pages = ref<PageConfig[]>([])
    const showDialog = ref(false)
    const isEditing = ref(false)
    const editingPage = ref<Partial<PageConfig>>({ ...DEFAULT_PAGE_PRESET, name: '' })
    const quickIcons = [
      '🎮', '🖼️', '🎬', '📚', '🎵', '🌐', '⭐', '❤️', '📁', '📦',
      '📺', '🎨', '🎭', '🎪', '🎯', '🎲', '🎸', '🎹', '🎺', '🎻',
      '📷', '📹', '💿', '💾', '💽', '📀', '📱', '💻', '🖥️', '⌨️'
    ]

    const isDragging = ref(false)
    const draggedIndex = ref<number | null>(null)
    const dragTargetIndex = ref<number | null>(null)
    const draggingId = ref<string | null>(null)

    const loadPages = () => {
      pages.value = customPageManager.getPages()
    }

    onMounted(loadPages)

    const getTypeName = (type: string) => TYPE_NAME_MAP[type] || type

    const showAddPageDialog = () => {
      isEditing.value = false
      editingPage.value = { ...DEFAULT_PAGE_PRESET, name: '' }
      showDialog.value = true
    }

    const editPage = (page: PageConfig) => {
      isEditing.value = true
      editingPage.value = { ...page }
      showDialog.value = true
    }

    const closeDialog = () => {
      showDialog.value = false
    }

    const isValidPage = computed(() => Boolean(editingPage.value.name && editingPage.value.name.trim().length > 0))

    const resetDragState = () => {
      draggedIndex.value = null
      dragTargetIndex.value = null
      draggingId.value = null
      isDragging.value = false
    }

    const previewPages = computed(() => {
      if (draggedIndex.value === null) {
        return pages.value
      }
      const clone = [...pages.value]
      const [draggedItem] = clone.splice(draggedIndex.value, 1)
      const targetIndex = Math.max(0, Math.min(clone.length, dragTargetIndex.value ?? clone.length))
      clone.splice(targetIndex, 0, draggedItem)
      return clone
    })

    const getActualIndex = (pageId: string) => pages.value.findIndex(p => p.id === pageId)

    const persistOrder = async (newPages: PageConfig[]) => {
      pages.value = newPages
      try {
        await customPageManager.reorderPages(newPages.map(p => p.id))
        emit('pages-updated')
      } catch (error) {
        console.error('排序失败:', error)
        loadPages()
      }
    }

    const moveUp = async (index: number) => {
      if (index <= 0) return
      const newPages = [...pages.value]
      const [item] = newPages.splice(index, 1)
      newPages.splice(index - 1, 0, item)
      await persistOrder(newPages)
    }

    const moveDown = async (index: number) => {
      if (index >= pages.value.length - 1) return
      const newPages = [...pages.value]
      const [item] = newPages.splice(index, 1)
      newPages.splice(index + 1, 0, item)
      await persistOrder(newPages)
    }

    const savePage = async () => {
      if (!isValidPage.value) return

      try {
        if (isEditing.value && editingPage.value.id) {
          await customPageManager.updatePage(editingPage.value.id, editingPage.value as PageConfig)
        } else {
          await customPageManager.addPage(editingPage.value as Omit<PageConfig, 'id' | 'order' | 'createdAt' | 'updatedAt'>)
        }
        loadPages()
        closeDialog()
        emit('pages-updated')
      } catch (error) {
        console.error('保存页面失败:', error)
        alert('保存失败: ' + error)
      }
    }

    const deletePage = async (page: PageConfig) => {
      if (page.isDefault) {
        alert('系统默认页面无法删除')
        return
      }
      if (!confirm(`确定要删除页面 "${page.name}" 吗？\n该页面下的数据文件将被保留，但页面入口将被移除。`)) {
        return
      }

      try {
        await customPageManager.deletePage(page.id)
        loadPages()
        emit('pages-updated')
      } catch (error) {
        console.error('删除页面失败:', error)
        alert('删除失败: ' + error)
      }
    }

    const toggleVisibility = async (page: PageConfig) => {
      try {
        await customPageManager.updatePage(page.id, { isHidden: !page.isHidden })
        loadPages()
        emit('pages-updated')
      } catch (error) {
        console.error('更新状态失败:', error)
      }
    }

    const onDragStart = (event: DragEvent, index: number) => {
      draggedIndex.value = index
      dragTargetIndex.value = index
      draggingId.value = pages.value[index]?.id ?? null
      isDragging.value = true
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.dropEffect = 'move'
        event.dataTransfer.setDragImage(new Image(), 0, 0)
      }
    }

    const onDragEnd = () => {
      resetDragState()
    }

    const onDragOver = (_event: DragEvent, index: number) => {
      if (draggedIndex.value === null) return
      dragTargetIndex.value = index
    }

    const onDrop = async (_event: DragEvent, index: number) => {
      if (draggedIndex.value === null) {
        resetDragState()
        return
      }
      const newPages = [...pages.value]
      const [item] = newPages.splice(draggedIndex.value, 1)
      newPages.splice(index, 0, item)
      await persistOrder(newPages)
      resetDragState()
    }

    return {
      pages,
      showDialog,
      isEditing,
      editingPage,
      quickIcons,
      getTypeName,
      showAddPageDialog,
      editPage,
      closeDialog,
      savePage,
      deletePage,
      toggleVisibility,
      isValidPage,
      previewPages,
      onDragStart,
      onDragOver,
      onDrop,
      onDragEnd,
      moveUp,
      moveDown,
      draggingId,
      getActualIndex,
      isDragging
    }
  }
})
</script>

<style scoped>
.page-management-settings {
  padding: 20px;
}

.settings-section {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 20px;
}

.section-desc {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.actions-bar {
  margin-bottom: 20px;
}

.pages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.page-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  transition: all 0.2s;
}

.page-item:hover {
  border-color: var(--accent-color);
}

.page-item.is-hidden {
  opacity: 0.6;
  background: var(--bg-primary);
}

.page-drag-handle {
  cursor: move;
  padding: 0 10px;
  color: var(--text-secondary);
  font-size: 1.2rem;
  user-select: none;
}

.page-icon {
  font-size: 1.5rem;
  margin-right: 15px;
  width: 40px;
  text-align: center;
}

.page-info {
  flex: 1;
}

.page-name {
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-type {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.badge {
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge.system {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.badge.hidden {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.page-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  font-size: 1.1rem;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-icon.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.form-group textarea {
  height: 80px;
  resize: vertical;
}

.icon-selector {
  display: flex;
  gap: 10px;
  align-items: center;
}

.icon-input {
  width: 60px !important;
  text-align: center;
  font-size: 1.2rem;
}

.quick-icons {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.quick-icons span {
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  transition: background 0.2s;
}

.quick-icons span:hover {
  background: var(--bg-tertiary);
}

.help-text {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.btn-primary {
  background: var(--accent-color);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
</style>
