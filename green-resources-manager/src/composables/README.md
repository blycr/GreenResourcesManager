# Composables 使用指南

## useGameFilter.ts

用于处理游戏的筛选、排序和标签提取。

### 功能
- 搜索筛选
- 标签筛选（包含/排除）
- 开发商筛选（包含/排除）
- 排序（按名称、最后游玩时间、游戏时长、添加时间）
- 标签和开发商提取

### 使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useGameFilter, type Game } from '../composables/useGameFilter'

const games = ref<Game[]>([])
const searchQuery = ref('')
const sortBy = ref<'name' | 'lastPlayed' | 'playTime' | 'added'>('name')

const {
  filteredGames,
  allTags,
  allDevelopers,
  selectedTags,
  extractAllTags,
  filterByTag,
  excludeByTag,
  clearTagFilter,
  filterByDeveloper,
  excludeByDeveloper,
  clearDeveloperFilter,
  getFilterData
} = useGameFilter(games, searchQuery, sortBy)

// 加载游戏后提取标签
extractAllTags()
</script>
```

## useGameManagement.ts

用于处理游戏的增删改查、保存加载等操作。

### 功能
- 加载/保存游戏列表
- 添加/更新/删除游戏
- 更新游戏游玩时长
- 更新游戏文件夹大小
- 检查文件存在性
- 成就检查

### 使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useGameManagement, type Game } from '../composables/useGameManagement'
import { useGameFilter } from '../composables/useGameFilter'

const games = ref<Game[]>([])
const isElectronEnvironment = ref(false)
const searchQuery = ref('')
const sortBy = ref('name')

// 筛选 composable
const { extractAllTags } = useGameFilter(games, searchQuery, sortBy)

// 管理 composable
const {
  loadGames,
  saveGames,
  addGame,
  updateGame,
  removeGame,
  updateGamePlayTime,
  updateGameFolderSize,
  checkFileExistence
} = useGameManagement(games, extractAllTags, isElectronEnvironment)

// 加载游戏
await loadGames()
</script>
```

## 在 Options API 中使用

如果需要在 Options API 中使用这些 composables，需要在 `setup()` 函数中调用：

```vue
<script lang="ts">
import { ref } from 'vue'
import { useGameFilter } from '../composables/useGameFilter'
import { useGameManagement } from '../composables/useGameManagement'

export default {
  setup() {
    const games = ref([])
    const searchQuery = ref('')
    const sortBy = ref('name')
    const isElectronEnvironment = ref(false)

    const filter = useGameFilter(games, searchQuery, sortBy)
    const management = useGameManagement(games, filter.extractAllTags, isElectronEnvironment)

    return {
      games,
      searchQuery,
      sortBy,
      isElectronEnvironment,
      ...filter,
      ...management
    }
  }
}
</script>
```

