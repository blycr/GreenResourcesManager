<template>
  <div class="pages-section" v-if="pages.length > 0">
    <!-- 分页导航 -->
    <div class="pagination-nav" v-if="totalPages > 1">
      <div class="pagination-info">
        <span>第 {{ currentPage }} 页，共 {{ totalPages }} 页</span>
        <span class="page-range">
          显示第 {{ currentPageStartIndex + 1 }} - {{ Math.min(currentPageStartIndex + pageSize, pages.length) }} 张，共 {{ pages.length }} 张
        </span>
      </div>
      <div class="pagination-controls">
        <button 
          class="btn-pagination" 
          @click="handlePreviousPage" 
          :disabled="currentPage <= 1"
        >
          ◀ 上一页
        </button>
        <div class="page-jump-group">
          <input 
            type="number" 
            v-model.number="jumpToPageInput" 
            :min="1" 
            :max="totalPages"
            @keyup.enter="handleJumpToPage"
            class="page-input-group"
            placeholder="页码"
          >
          <button class="btn-jump-group" @click="handleJumpToPage">跳转</button>
        </div>
        <button 
          class="btn-pagination" 
          @click="handleNextPage" 
          :disabled="currentPage >= totalPages"
        >
          下一页 ▶
        </button>
      </div>
    </div>
    
    <!-- 图片网格 -->
    <div class="pages-grid">
      <div 
        v-for="(page, idx) in paginatedPages" 
        :key="page" 
        class="page-item" 
        @click="handlePageClick(idx)"
      >
        <img 
          :src="resolveImage(page)" 
          :alt="'Page ' + (currentPageStartIndex + idx + 1)" 
          @error="handleImageError"
          loading="lazy"
          class="preview-thumbnail"
        >
        <div class="page-index">{{ currentPageStartIndex + idx + 1 }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, ref } from 'vue'

export default {
  name: 'AlbumPagesGrid',
  props: {
    pages: {
      type: Array as () => string[],
      required: true
    },
    currentPage: {
      type: Number,
      required: true
    },
    pageSize: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    },
    resolveImage: {
      type: Function,
      required: true
    },
    handleImageError: {
      type: Function,
      required: true
    }
  },
  emits: ['page-click', 'previous-page', 'next-page', 'jump-to-page'],
  setup(props, { emit }) {
    const jumpToPageInput = ref(1)

    const currentPageStartIndex = computed(() => {
      return (props.currentPage - 1) * props.pageSize
    })

    const paginatedPages = computed(() => {
      if (!props.pages || props.pages.length === 0) return []
      const start = currentPageStartIndex.value
      const end = start + props.pageSize
      return props.pages.slice(start, end)
    })

    const handlePageClick = (index: number) => {
      emit('page-click', index)
    }

    const handlePreviousPage = () => {
      emit('previous-page')
    }

    const handleNextPage = () => {
      emit('next-page')
    }

    const handleJumpToPage = () => {
      emit('jump-to-page', jumpToPageInput.value)
    }

    return {
      jumpToPageInput,
      currentPageStartIndex,
      paginatedPages,
      handlePageClick,
      handlePreviousPage,
      handleNextPage,
      handleJumpToPage
    }
  }
}
</script>

<style scoped>
.pages-section {
  margin-top: 20px;
}

.pagination-nav {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
}

.pagination-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: var(--text-secondary, #666);
}

.page-range {
  font-size: 12px;
  color: var(--text-tertiary, #999);
}

.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.btn-pagination {
  padding: 8px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-pagination:hover:not(:disabled) {
  background: var(--bg-hover, #f0f0f0);
  border-color: var(--border-hover, #bbb);
}

.btn-pagination:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-jump-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.page-input-group {
  width: 80px;
  padding: 8px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  font-size: 14px;
  text-align: center;
}

.btn-jump-group {
  padding: 8px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--bg-primary, #fff);
  color: var(--text-primary, #333);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-jump-group:hover {
  background: var(--bg-hover, #f0f0f0);
  border-color: var(--border-hover, #bbb);
}

.pages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 16px 0;
}

.page-item {
  position: relative;
  aspect-ratio: 2 / 3;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
  background: var(--bg-secondary, #f5f5f5);
}

.page-item:hover {
  border-color: var(--primary-color, #007bff);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.preview-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.page-index {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  color: white;
  padding: 8px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
}
</style>

