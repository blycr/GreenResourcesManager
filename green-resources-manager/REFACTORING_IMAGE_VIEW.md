# ImageView.vue 重构建议

## 📊 当前问题分析

### 1. **组件过大** (3419行)
- 违反单一职责原则
- 难以维护和测试
- 代码可读性差

### 2. **关注点混合**
- UI渲染逻辑
- 业务逻辑
- 数据管理
- 缓存管理
- 文件操作
- 状态管理

### 3. **代码重复**
- 封面选择逻辑重复（新增/编辑）
- 标签管理重复
- 错误处理不一致

### 4. **状态管理混乱**
- Options API 和 Composition API 混用
- 部分使用 composables，但不一致
- 状态分散在 data、computed、methods 中

### 5. **类型安全不足**
- TypeScript 使用不充分
- 缺少接口定义
- 类型推断不完整

---

## 🎯 重构方案

### 阶段一：提取 Composables（优先）

#### 1.1 创建 `useImageAlbum.ts` - 专辑管理核心逻辑

```typescript
// composables/image/useImageAlbum.ts
import { ref, computed } from 'vue'
import saveManager from '@/utils/SaveManager'
import type { Album } from '@/types/image'

export function useImageAlbum() {
  const albums = ref<Album[]>([])
  const currentAlbum = ref<Album | null>(null)
  
  const loadAlbums = async () => {
    albums.value = await saveManager.loadImages()
  }
  
  const addAlbum = async (albumData: Partial<Album>) => {
    // 添加逻辑
  }
  
  const updateAlbum = async (id: string, updates: Partial<Album>) => {
    // 更新逻辑
  }
  
  const removeAlbum = async (id: string) => {
    // 删除逻辑
  }
  
  const saveAlbums = async () => {
    await saveManager.saveImages(albums.value)
  }
  
  return {
    albums,
    currentAlbum,
    loadAlbums,
    addAlbum,
    updateAlbum,
    removeAlbum,
    saveAlbums
  }
}
```

#### 1.2 创建 `useImageFilter.ts` - 筛选逻辑

```typescript
// composables/image/useImageFilter.ts
import { ref, computed } from 'vue'
import type { Album } from '@/types/image'

export function useImageFilter(albums: Ref<Album[]>) {
  const searchQuery = ref('')
  const sortBy = ref('name')
  const selectedTags = ref<string[]>([])
  const excludedTags = ref<string[]>([])
  const selectedAuthors = ref<string[]>([])
  const excludedAuthors = ref<string[]>([])
  
  // 提取所有标签和作者
  const allTags = computed(() => {
    const tagCount: Record<string, number> = {}
    albums.value.forEach(album => {
      album.tags?.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      })
    })
    return Object.entries(tagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })
  
  const allAuthors = computed(() => {
    // 类似逻辑
  })
  
  // 筛选后的专辑
  const filteredAlbums = computed(() => {
    let filtered = albums.value.filter(album => {
      // 搜索筛选
      const matchesSearch = /* ... */
      // 标签筛选
      const matchesTag = /* ... */
      // 作者筛选
      const matchesAuthor = /* ... */
      return matchesSearch && matchesTag && matchesAuthor
    })
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'name': return a.name.localeCompare(b.name)
        case 'count': return (b.pagesCount || 0) - (a.pagesCount || 0)
        // ...
      }
    })
    
    return filtered
  })
  
  return {
    searchQuery,
    sortBy,
    selectedTags,
    excludedTags,
    selectedAuthors,
    excludedAuthors,
    allTags,
    allAuthors,
    filteredAlbums
  }
}
```

#### 1.3 创建 `useImageCache.ts` - 图片缓存管理

```typescript
// composables/image/useImageCache.ts
import { ref } from 'vue'

interface CacheEntry {
  url: string
  size: number
  lastAccessed: number
}

export function useImageCache(maxCacheSize = 50 * 1024 * 1024) {
  const imageCache = new Map<string, CacheEntry>()
  const imageCacheSize = ref(0)
  
  const addToCache = (key: string, url: string, size: number) => {
    // LRU 缓存逻辑
  }
  
  const resolveImage = (imagePath: string, useThumbnail = false) => {
    // 图片解析逻辑
  }
  
  const resolveCoverImage = (imagePath: string) => {
    // 封面图解析
  }
  
  return {
    imageCache,
    imageCacheSize,
    addToCache,
    resolveImage,
    resolveCoverImage
  }
}
```

#### 1.4 创建 `useImagePages.ts` - 页面管理

```typescript
// composables/image/useImagePages.ts
import { ref, computed } from 'vue'
import { usePagination } from '@/composables/usePagination'

export function useImagePages(pageSize = 50) {
  const pages = ref<string[]>([])
  const currentPageIndex = ref(0)
  
  // 使用分页 composable
  const pagePagination = usePagination(pages, pageSize, '图片')
  
  const loadAlbumPages = async (folderPath: string) => {
    if (!window.electronAPI?.listImageFiles) {
      throw new Error('Electron API 不可用')
    }
    
    const resp = await window.electronAPI.listImageFiles(folderPath)
    if (!resp.success) {
      throw new Error(resp.error || '扫描图片文件失败')
    }
    
    pages.value = resp.files || []
  }
  
  return {
    pages,
    currentPageIndex,
    ...pagePagination,
    loadAlbumPages
  }
}
```

#### 1.5 创建 `useImageDragDrop.ts` - 拖拽处理

```typescript
// composables/image/useImageDragDrop.ts
import { useDragAndDrop } from '@/composables/useDragAndDrop'
import type { Album } from '@/types/image'

export function useImageDragDrop(
  albums: Ref<Album[]>,
  onAddAlbum: (album: Album) => Promise<void>
) {
  const detectMultipleFolders = (files: File[]) => {
    // 文件夹检测逻辑
  }
  
  const processMultipleFolders = async (folders: FolderInfo[]) => {
    // 批量处理逻辑
  }
  
  const { isDragOver, handleDragOver, handleDragEnter, handleDragLeave } = 
    useDragAndDrop({
      enabled: true,
      onDrop: async (files: File[]) => {
        const detectedFolders = detectMultipleFolders(files)
        const results = await processMultipleFolders(detectedFolders)
        // 处理结果
      }
    })
  
  return {
    isDragOver,
    handleDragOver,
    handleDragEnter,
    handleDragLeave
  }
}
```

#### 1.6 创建 `useImageCover.ts` - 封面管理

```typescript
// composables/image/useImageCover.ts
import { ref } from 'vue'

export function useImageCover() {
  const cover = ref('')
  
  const useFirstImageAsCover = async (folderPath: string) => {
    if (!window.electronAPI?.listImageFiles) return
    
    const resp = await window.electronAPI.listImageFiles(folderPath)
    if (resp.success && resp.files?.length > 0) {
      cover.value = resp.files[0]
    }
  }
  
  const selectImageFromFolder = async (folderPath: string) => {
    if (!window.electronAPI?.selectScreenshotImage) return
    
    const filePath = await window.electronAPI.selectScreenshotImage(folderPath)
    if (filePath) {
      cover.value = filePath
    }
  }
  
  const browseForImage = async () => {
    if (!window.electronAPI?.selectImageFile) return
    
    const filePath = await window.electronAPI.selectImageFile()
    if (filePath) {
      cover.value = filePath
    }
  }
  
  const clearCover = () => {
    cover.value = ''
  }
  
  return {
    cover,
    useFirstImageAsCover,
    selectImageFromFolder,
    browseForImage,
    clearCover
  }
}
```

---

### 阶段二：类型定义

#### 2.1 创建类型文件

```typescript
// types/image.ts
export interface Album {
  id: string
  name: string
  author: string
  description: string
  tags: string[]
  folderPath: string
  cover: string
  pagesCount: number
  lastViewed: string | null
  viewCount: number
  addedDate: string
  fileExists?: boolean
}

export interface AlbumForm {
  name: string
  author: string
  description: string
  tags: string[]
  folderPath: string
  cover: string
}

export interface AlbumStats {
  label: string
  value: string | number
}

export interface FolderInfo {
  path: string
  name: string
  files: File[]
}

export interface ProcessResult {
  success: boolean
  folderName: string
  error?: string
  album?: Album
}
```

---

### 阶段三：组件拆分

#### 3.1 拆分子组件

```
components/image/
├── AlbumCard.vue          # 专辑卡片（已存在 MediaCard，可复用）
├── AlbumFormDialog.vue    # 添加/编辑专辑对话框
├── AlbumDetailPanel.vue   # 专辑详情面板
├── AlbumPagesGrid.vue     # 页面网格显示
├── AlbumPaginationNav.vue # 页面分页导航
└── CoverSelector.vue      # 封面选择器（可复用）
```

#### 3.2 重构后的 ImageView.vue 结构

```vue
<template>
  <BaseView
    ref="baseView"
    :items="albums"
    :filtered-items="filteredAlbums"
    :empty-state-config="emptyStateConfig"
    :toolbar-config="toolbarConfig"
    :context-menu-items="contextMenuItems"
    :pagination-config="albumPaginationConfig"
    :sort-by="sortBy"
    :search-query="searchQuery"
    @empty-state-action="handleEmptyStateAction"
    @add-item="showAddDialog"
    @sort-changed="handleSortChanged"
    @search-query-changed="handleSearchQueryChanged"
    @sort-by-changed="handleSortByChanged"
    @context-menu-click="handleContextMenuClick"
    @page-change="handleAlbumPageChange"
  >
    <div 
      class="image-content"
      :class="{ 'drag-over': isDragOver }"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
    >
      <div class="albums-grid" v-if="paginatedAlbums.length > 0">
        <MediaCard
          v-for="album in paginatedAlbums" 
          :key="album.id"
          :item="album"
          type="image"
          :isElectronEnvironment="true"
          :file-exists="album.fileExists"
          @click="showAlbumDetail"
          @contextmenu="handleContextMenu"
          @action="openAlbum"
        />
      </div>
    </div>

    <!-- 子组件 -->
    <AlbumFormDialog
      v-model:visible="showAddDialog"
      mode="add"
      @confirm="handleAddAlbum"
    />
    
    <AlbumFormDialog
      v-model:visible="showEditDialog"
      mode="edit"
      :album="currentAlbum"
      @confirm="handleEditAlbum"
    />
    
    <AlbumDetailPanel
      v-model:visible="showDetailModal"
      :album="currentAlbum"
      :pages="pages"
      @action="handleDetailAction"
    />
    
    <ComicViewer
      :visible="showComicViewer"
      :album="currentAlbum"
      :pages="pages"
      :initial-page-index="currentPageIndex"
      @close="closeComicViewer"
      @page-change="onPageChange"
    />
    
    <PathUpdateDialog
      :visible="showPathUpdateDialog"
      :info="pathUpdateInfo"
      @confirm="confirmPathUpdate"
      @cancel="closePathUpdateDialog"
    />
  </BaseView>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useImageAlbum } from '@/composables/image/useImageAlbum'
import { useImageFilter } from '@/composables/image/useImageFilter'
import { useImagePages } from '@/composables/image/useImagePages'
import { useImageDragDrop } from '@/composables/image/useImageDragDrop'
import { usePagination } from '@/composables/usePagination'
import type { Album } from '@/types/image'

// Composables
const {
  albums,
  currentAlbum,
  loadAlbums,
  addAlbum,
  updateAlbum,
  removeAlbum,
  saveAlbums
} = useImageAlbum()

const {
  searchQuery,
  sortBy,
  filteredAlbums,
  allTags,
  allAuthors,
  selectedTags,
  excludedTags,
  selectedAuthors,
  excludedAuthors
} = useImageFilter(albums)

const albumPagination = usePagination(filteredAlbums, 20, '漫画')

const {
  pages,
  currentPageIndex,
  loadAlbumPages,
  ...pagePagination
} = useImagePages()

const {
  isDragOver,
  handleDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDrop
} = useImageDragDrop(albums, addAlbum)

// 组件状态
const showAddDialog = ref(false)
const showEditDialog = ref(false)
const showDetailModal = ref(false)
const showComicViewer = ref(false)
const showPathUpdateDialog = ref(false)
const pathUpdateInfo = ref<PathUpdateInfo | null>(null)

// 计算属性
const paginatedAlbums = computed(() => albumPagination.paginatedItems.value)
const albumPaginationConfig = computed(() => albumPagination.paginationConfig.value)

// 方法
const handleAddAlbum = async (albumData: Partial<Album>) => {
  await addAlbum(albumData)
  await saveAlbums()
  showAddDialog.value = false
}

const handleEditAlbum = async (id: string, updates: Partial<Album>) => {
  await updateAlbum(id, updates)
  await saveAlbums()
  showEditDialog.value = false
}

// ... 其他方法

// 生命周期
onMounted(async () => {
  await loadAlbums()
  // 加载设置等
})
</script>
```

---

### 阶段四：统一错误处理

#### 4.1 创建错误处理工具

```typescript
// utils/errorHandler.ts
import notify from './NotificationService'

export class ImageError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ImageError'
  }
}

export function handleImageError(error: unknown, context: string) {
  if (error instanceof ImageError) {
    notify.toast('error', '操作失败', `${context}: ${error.message}`)
  } else if (error instanceof Error) {
    notify.toast('error', '操作失败', `${context}: ${error.message}`)
  } else {
    notify.toast('error', '操作失败', `${context}: 未知错误`)
  }
  
  console.error(`[${context}]`, error)
}
```

---

### 阶段五：配置管理

#### 5.1 创建配置常量

```typescript
// config/image.ts
export const IMAGE_CONFIG = {
  DEFAULT_PAGE_SIZE: 50,
  DEFAULT_LIST_PAGE_SIZE: 20,
  MAX_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  THUMBNAIL_SIZE: 200,
  PRELOAD_COUNT: 3,
  JPEG_QUALITY: 80
} as const

export const IMAGE_SORT_OPTIONS = [
  { value: 'name', label: '按名称排序' },
  { value: 'count', label: '按页数' },
  { value: 'added', label: '按添加时间' },
  { value: 'lastViewed', label: '按最后查看' }
] as const

export const ALBUM_CONTEXT_MENU_ITEMS = [
  { key: 'detail', icon: '👁️', label: '查看详情' },
  { key: 'open', icon: '📖', label: '打开漫画' },
  { key: 'folder', icon: '📁', label: '打开文件夹' },
  { key: 'edit', icon: '✏️', label: '编辑信息' },
  { key: 'remove', icon: '🗑️', label: '删除漫画' }
] as const
```

---

## 📋 重构步骤建议

### 第一步：类型定义（1-2小时）
1. 创建 `types/image.ts`
2. 定义所有接口和类型

### 第二步：提取 Composables（4-6小时）
1. `useImageAlbum.ts` - 专辑管理
2. `useImageFilter.ts` - 筛选逻辑
3. `useImageCache.ts` - 缓存管理
4. `useImagePages.ts` - 页面管理
5. `useImageDragDrop.ts` - 拖拽处理
6. `useImageCover.ts` - 封面管理

### 第三步：拆分组件（3-4小时）
1. `AlbumFormDialog.vue` - 表单对话框
2. `AlbumDetailPanel.vue` - 详情面板
3. `CoverSelector.vue` - 封面选择器

### 第四步：重构主组件（2-3小时）
1. 使用新的 composables
2. 使用新的子组件
3. 简化模板和逻辑

### 第五步：测试和优化（2-3小时）
1. 功能测试
2. 性能优化
3. 代码审查

---

## ✅ 重构后的优势

1. **可维护性**：每个 composable 职责单一，易于理解和修改
2. **可测试性**：逻辑分离，便于单元测试
3. **可复用性**：composables 可在其他组件中复用
4. **类型安全**：完整的 TypeScript 类型定义
5. **代码量减少**：主组件从 3419 行减少到约 300-400 行
6. **性能优化**：逻辑分离便于优化

---

## 🎨 代码质量提升

### Before (当前)
- 3419 行单文件
- 混合 API 风格
- 重复代码多
- 类型不完整

### After (重构后)
- 主组件 ~300 行
- 纯 Composition API
- 逻辑复用
- 完整类型定义
- 清晰的职责分离

---

## 💡 额外建议

1. **使用 Pinia**：如果项目规模继续增长，考虑引入 Pinia 进行全局状态管理
2. **单元测试**：为每个 composable 编写单元测试
3. **文档**：使用 JSDoc 为所有 composable 添加文档
4. **性能监控**：添加性能监控，识别瓶颈
5. **代码规范**：使用 ESLint + Prettier 统一代码风格

---

## 📚 参考资源

- [Vue 3 Composition API 最佳实践](https://vuejs.org/guide/reusability/composables.html)
- [TypeScript 在 Vue 3 中的使用](https://vuejs.org/guide/typescript/overview.html)
- [组件设计原则](https://vuejs.org/guide/components/props.html)

