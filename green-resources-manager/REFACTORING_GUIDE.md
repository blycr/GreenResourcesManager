# 重构指南 (Refactoring Guide)

## 📋 当前问题概述

### 1. 文件过大问题
- `ImageView.vue`: **3362行** - 严重违反单一职责原则
- `GameView.vue`: **2742行** - 职责过多，难以维护
- `App.vue`: **1160行** - 承担了过多全局状态管理

### 2. 架构问题
- ❌ 未使用状态管理库（Vuex/Pinia）
- ❌ 未使用 Composition API
- ❌ 没有 composables 目录
- ❌ 业务逻辑与 UI 高度耦合
- ❌ 大量重复代码

### 3. 代码质量问题
- 单个组件承担过多职责（数据管理、UI渲染、业务逻辑、事件处理）
- 状态管理混乱（全局状态在 App.vue，本地状态在各组件）
- 样式代码过多（ImageView 中约 700 行 CSS）
- 缺乏类型定义和接口规范

---

## 🎯 重构目标

1. **可维护性**: 文件大小控制在 200-300 行以内
2. **可复用性**: 提取公共逻辑到 composables
3. **可测试性**: 业务逻辑与 UI 分离
4. **性能优化**: 按需加载，减少初始包大小
5. **开发效率**: 新功能开发更快

---

## 🚀 重构方案

### 阶段一：拆分大文件（优先级：高）

#### ImageView.vue 拆分方案
```
ImageView.vue (主组件, <200行)
├── components/
│   ├── AlbumGrid.vue              # 专辑网格展示
│   ├── AlbumDetailPanel.vue       # 详情面板
│   ├── AddAlbumDialog.vue         # 添加对话框
│   ├── EditAlbumDialog.vue        # 编辑对话框
│   └── AlbumPagination.vue        # 分页组件
├── composables/
│   ├── useAlbumManagement.ts      # CRUD操作
│   ├── useAlbumFilter.ts          # 筛选逻辑
│   ├── useAlbumSort.ts            # 排序逻辑
│   ├── useAlbumPagination.ts      # 分页逻辑
│   ├── useDragAndDrop.ts          # 拖拽处理
│   ├── useImageCache.ts           # 图片缓存
│   └── useImageProcessing.ts      # 图片处理
└── styles/
    └── ImageView.module.css       # 样式分离
```

#### GameView.vue 拆分方案
```
GameView.vue (主组件, <200行)
├── components/
│   ├── GameGrid.vue
│   ├── GameDetailPanel.vue
│   ├── AddGameDialog.vue
│   ├── EditGameDialog.vue
│   └── ScreenshotDialog.vue
├── composables/
│   ├── useGameManagement.ts
│   ├── useGameFilter.ts
│   ├── useGameScreenshot.ts       # 截图功能
│   ├── useGameRunning.ts          # 运行状态
│   └── useGamePlayTime.ts         # 游戏时长
└── styles/
    └── GameView.module.css
```

### 阶段二：引入 Composition API（优先级：高）

#### 创建 composables 目录结构
```
src/
├── composables/
│   ├── common/                    # 通用逻辑
│   │   ├── usePagination.ts       # 分页逻辑
│   │   ├── useSearch.ts           # 搜索逻辑
│   │   ├── useSort.ts             # 排序逻辑
│   │   ├── useFilter.ts           # 筛选逻辑
│   │   ├── useDragAndDrop.ts     # 拖拽处理
│   │   └── useModal.ts            # 对话框管理
│   ├── image/                     # 图片相关
│   │   ├── useAlbumManagement.ts
│   │   ├── useImageCache.ts
│   │   └── useImageProcessing.ts
│   ├── game/                      # 游戏相关
│   │   ├── useGameManagement.ts
│   │   └── useGameScreenshot.ts
│   └── shared/                    # 共享逻辑
│       ├── useFileExistence.ts
│       └── usePathUpdate.ts
```

#### 示例：usePagination.ts
```typescript
import { ref, computed } from 'vue'

export function usePagination<T>(items: Ref<T[]>, pageSize = 20) {
  const currentPage = ref(1)
  
  const totalPages = computed(() => 
    Math.ceil(items.value.length / pageSize)
  )
  
  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return items.value.slice(start, start + pageSize)
  })
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }
  
  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage
  }
}
```

### 阶段三：引入状态管理（优先级：中）

#### 安装 Pinia
```bash
npm install pinia
```

#### 创建 stores 目录结构
```
src/
├── stores/
│   ├── gameStore.ts               # 游戏状态
│   ├── imageStore.ts              # 图片状态
│   ├── videoStore.ts              # 视频状态
│   ├── appStore.ts                # 应用全局状态
│   └── filterStore.ts             # 筛选器状态
```

#### 迁移全局状态
将 `App.vue` 中的状态迁移到 stores：
- `runningGames` → `gameStore`
- `saveQueue` → `appStore`
- `currentFilterData` → `filterStore`

#### 示例：gameStore.ts
```typescript
import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    games: [],
    runningGames: new Map(),
    currentGame: null
  }),
  
  actions: {
    addRunningGame(gameInfo) {
      this.runningGames.set(gameInfo.id, {
        ...gameInfo,
        startTime: Date.now()
      })
    },
    
    removeRunningGame(gameId) {
      this.runningGames.delete(gameId)
    }
  }
})
```

### 阶段四：提取公共组件（优先级：中）

#### 创建可复用组件
```
src/
├── components/
│   ├── dialogs/
│   │   ├── BaseDialog.vue         # 基础对话框
│   │   ├── AddItemDialog.vue      # 通用添加对话框
│   │   └── EditItemDialog.vue     # 通用编辑对话框
│   ├── forms/
│   │   ├── CoverSelector.vue      # 封面选择器
│   │   ├── TagInput.vue           # 标签输入
│   │   └── FileSelector.vue       # 文件选择器
│   └── common/
│       └── Pagination.vue         # 分页组件（已有，可优化）
```

### 阶段五：业务逻辑分离（优先级：低）

#### 创建 service 层
```
src/
├── services/
│   ├── AlbumService.ts            # 专辑业务逻辑
│   ├── GameService.ts             # 游戏业务逻辑
│   ├── ImageCacheService.ts       # 图片缓存服务
│   └── FileService.ts             # 文件操作服务
```

### 阶段六：样式优化（优先级：低）

- 使用 CSS Modules 或 Scoped CSS
- 提取公共样式到 `styles/common.css`
- 使用 CSS 变量统一管理主题

### 阶段七：类型安全（优先级：低）

#### 创建类型定义
```
src/
├── types/
│   ├── album.ts                   # 专辑类型
│   ├── game.ts                    # 游戏类型
│   ├── video.ts                   # 视频类型
│   └── common.ts                  # 通用类型
```

---

## 📅 实施计划

### 第一周：拆分 ImageView.vue
1. ✅ 创建 composables 目录
2. ✅ 提取拖拽逻辑到 `useDragAndDrop.ts`
3. ✅ 提取筛选逻辑到 `useAlbumFilter.ts`
4. ✅ 拆分添加/编辑对话框组件

### 第二周：拆分 GameView.vue
1. ✅ 提取游戏管理逻辑
2. ✅ 提取截图功能逻辑
3. ✅ 拆分对话框组件

### 第三周：引入 Pinia
1. ✅ 安装 Pinia
2. ✅ 创建基础 stores
3. ✅ 迁移 App.vue 中的全局状态

### 第四周：优化和测试
1. ✅ 代码审查
2. ✅ 性能测试
3. ✅ 修复问题

---

## 📊 预期收益

| 指标 | 当前 | 重构后 | 提升 |
|------|------|--------|------|
| 最大文件行数 | 3362 | <300 | **91%↓** |
| 代码复用率 | 低 | 高 | **显著提升** |
| 可测试性 | 低 | 高 | **显著提升** |
| 开发效率 | 中 | 高 | **30%↑** |
| 维护成本 | 高 | 低 | **50%↓** |

---

## ⚠️ 注意事项

1. **渐进式重构**: 不要一次性重构所有代码，按模块逐步进行
2. **保持功能**: 重构过程中确保现有功能不受影响
3. **充分测试**: 每个阶段完成后进行充分测试
4. **代码审查**: 重要变更需要代码审查
5. **文档更新**: 及时更新相关文档

---

## 🔗 参考资源

- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Vue 3 最佳实践](https://vuejs.org/guide/best-practices/performance.html)

---

**最后更新**: 2025-01-XX  
**文档版本**: v1.0

