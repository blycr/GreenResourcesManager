<template>
  <div v-if="visible" class="detail-overlay" @mousedown="handleOverlayMouseDown">
    <div class="detail-content" @mousedown.stop>
      <div class="detail-header">
        <button 
          class="detail-favorite" 
          :class="{ 'favorited': item?.isFavorite }"
          @click="handleFavoriteClick"
          :title="item?.isFavorite ? '取消收藏' : '收藏'"
        >
          {{ item?.isFavorite ? '⭐' : '☆' }}
        </button>
        <button class="detail-close" @click="close">✕</button>
      </div>
      <div class="detail-body" v-if="item">
        <div class="detail-left">
          <div class="detail-image">
            <img 
              :src="resolveImage(item.image || item.cover || item.thumbnail || item.favicon)" 
              :alt="item.name"
              @error="handleImageError"
            >
          </div>
          
          <!-- 玩家评价区域 -->
          <div class="detail-rating">
            <h4 class="rating-title">玩家评价</h4>
            <div class="rating-content">
              <!-- 星级显示 -->
              <div class="rating-stars" @mouseleave="handleStarMouseLeave">
                <span 
                  v-for="star in 5" 
                  :key="star"
                  class="star"
                  :class="{ 'star-filled': star <= currentRating }"
                  @mouseenter="handleStarMouseEnter(star)"
                  @click="handleStarClick(star)"
                >
                  ★
                </span>
                <span class="rating-text" :class="{ 'no-rating': currentRating === 0 }">
                  {{ currentRating > 0 ? getRatingText(currentRating) : '未评价' }}
                </span>
              </div>
              <!-- 评论输入框 -->
              <div class="rating-comment">
                <textarea
                  class="comment-input"
                  :value="item.comment || item.notes || ''"
                  @input="handleCommentInput"
                  @blur="handleCommentBlur"
                  placeholder="在此输入你的评价..."
                  rows="4"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
        <div class="detail-info">
          <h2 class="detail-title">{{ item.name }}</h2>
          
          <!-- 动态显示作者/开发商信息 -->
          <p class="detail-author" v-if="item.author">{{ item.author }}</p>
          <p class="detail-developer" v-if="item.developer">{{ item.developer }}</p>
          
          <!-- 动态显示发行商信息 -->
          <p class="detail-publisher" v-if="item.publisher && item.publisher !== '未知发行商'">{{ item.publisher }}</p>
          
          <!-- 动态显示路径（按优先级：executablePath > filePath > folderPath > url） -->
          <p class="detail-folder" v-if="item.executablePath" :title="item.executablePath">
            {{ item.executablePath }}
          </p>
          <p class="detail-folder" v-else-if="item.filePath" :title="item.filePath">
            {{ item.filePath }}
          </p>
          <p class="detail-folder" v-else-if="item.folderPath" :title="item.folderPath">
            {{ item.folderPath }}
          </p>
          <p class="detail-folder" v-else-if="item.url" :title="item.url">
            {{ item.url }}
          </p>
          
          <!-- 描述信息 -->
          <div class="detail-description" v-if="item.description">
            <h4 class="description-title">{{ descriptionTitle }}</h4>
            <p class="description-content">{{ item.description }}</p>
          </div>
          
          <!-- 标签信息 -->
          <div class="detail-tags" v-if="item.tags && item.tags.length > 0">
            <h4 class="tags-title">{{ tagsTitle }}</h4>
            <div class="tags-container">
              <span 
                v-for="tag in item.tags" 
                :key="tag" 
                class="detail-tag"
              >{{ tag }}</span>
            </div>
          </div>
          
          <!-- 统计信息 -->
          <div class="detail-stats">
            <div 
              v-for="stat in computedStats" 
              :key="stat.label" 
              class="stat-item"
            >
              <span class="stat-label">{{ stat.label }}</span>
              <span class="stat-value">{{ stat.value }}</span>
            </div>
          </div>
          
          <!-- 操作按钮 -->
          <div class="detail-actions">
            <button 
              v-for="action in computedActions" 
              :key="action.key"
              :class="action.class"
              @click="(e) => {
                console.log('📋 [DetailPanel] 按钮被点击:', {
                  actionKey: action.key,
                  actionLabel: action.label,
                  event: e,
                  target: e.target,
                  currentTarget: e.currentTarget,
                  timestamp: new Date().toISOString()
                })
                handleAction(action.key)
              }"
            >
              <span class="btn-icon">{{ action.icon }}</span>
              {{ action.label }}
            </button>
          </div>
        </div>
      </div>
      
      <!-- 额外的内容区域（如图片分页等） -->
      <div v-if="$slots.extra" class="extra-section">
        <slot name="extra"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DetailPanel',
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    item: {
      type: Object,
      default: null
    },
    type: {
      type: String,
      required: true,
      validator: value => ['game', 'image', 'album', 'video', 'audio', 'novel', 'website'].includes(value)
    },
    isRunning: {
      type: Boolean,
      default: false
    },
    stats: {
      type: Array,
      default: () => []
    },
    actions: {
      type: Array,
      default: () => []
    },
    // 统一的更新函数（如果提供，组件内部会自动处理评分、评论和收藏）
    onUpdateResource: {
      type: Function,
      default: null
    }
  },
  emits: ['close', 'action', 'update-rating', 'update-comment', 'toggle-favorite'],
  data() {
    return {
      hoverRating: 0 // hover 时的星级
    }
  },
  computed: {
    descriptionTitle() {
      const titles = {
        game: '游戏简介',
        image: '漫画简介',
        album: '漫画简介',
        video: '视频简介',
        audio: '音频简介'
      }
      return titles[this.type] || '简介'
    },
    tagsTitle() {
      const titles = {
        game: '游戏标签',
        image: '漫画标签',
        album: '漫画标签',
        video: '视频标签',
        audio: '音频标签'
      }
      return titles[this.type] || '标签'
    },
    computedStats() {
      if (this.stats.length > 0) {
        return this.stats
      }
      
      // 默认统计信息
      const defaultStats = []
      
      if (this.type === 'game') {
        defaultStats.push(
          { label: '总游戏时长', value: this.formatPlayTime(this.item?.playTime) },
          { label: '运行次数', value: `${this.item?.playCount || 0} 次` },
          { label: '最后游玩', value: this.formatLastPlayed(this.item?.lastPlayed) },
          { label: '第一次游玩', value: this.formatFirstPlayed(this.item?.firstPlayed) },
          { label: '添加时间', value: this.formatDate(this.item?.addedDate) }
        )
      } else if (this.type === 'image' || this.type === 'album') {
        defaultStats.push(
          { label: '总页数', value: this.item?.pageCount || 0 },
          { label: '浏览次数', value: this.item?.viewCount || 0 },
          { label: '添加时间', value: this.formatDate(this.item?.addedDate) },
          { label: '最后查看', value: this.formatDate(this.item?.lastViewed) }
        )
      }
      
      return defaultStats.filter(stat => stat.value !== undefined && stat.value !== null)
    },
    computedActions() {
      console.log('📋 [DetailPanel] computedActions 被调用:', {
        type: this.type,
        actions: this.actions,
        actionsIsArray: Array.isArray(this.actions),
        actionsLength: this.actions ? this.actions.length : 0,
        timestamp: new Date().toISOString()
      })
      
      // 如果传递了 actions prop 且不为空，使用传递的 actions
      if (this.actions && Array.isArray(this.actions) && this.actions.length > 0) {
        console.log('📋 [DetailPanel] 使用传递的 actions:', this.actions)
        return this.actions
      }
      
      // 默认操作按钮
      const defaultActions = []
      
      if (this.type === 'game') {
        // 检查是否为压缩包
        const isArchive = this.item?.isArchive || (this.item?.executablePath && this.isArchiveFile(this.item.executablePath))
        
        // 如果游戏正在运行，显示"结束游戏"按钮，否则显示"开始游戏"按钮
        // 压缩包不能运行，所以不显示启动按钮
        if (this.isRunning) {
          defaultActions.push(
            { key: 'terminate', icon: '⏹️', label: '结束游戏', class: 'btn-stop-game' },
            { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
            { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit' },
            { key: 'remove', icon: '🗑️', label: '删除游戏', class: 'btn-remove' }
          )
        } else {
          // 压缩包不显示启动按钮
          if (!isArchive) {
            defaultActions.push(
              { key: 'launch', icon: '▶️', label: '开始游戏', class: 'btn-play' }
            )
          }
          defaultActions.push(
            { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
            { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit' },
            { key: 'remove', icon: '🗑️', label: '删除游戏', class: 'btn-remove' }
          )
        }
      } else if (this.type === 'image' || this.type === 'album') {
        defaultActions.push(
          { key: 'open', icon: '📖', label: '开始阅读', class: 'btn-play' },
          { key: 'folder', icon: '📁', label: '打开文件夹', class: 'btn-open-folder' },
          { key: 'edit', icon: '✏️', label: '编辑信息', class: 'btn-edit' },
          { key: 'remove', icon: '🗑️', label: '删除漫画', class: 'btn-remove' }
        )
      }
      
      console.log('📋 [DetailPanel] 使用默认 actions:', defaultActions)
      return defaultActions
    },
    hasRating() {
      // 判断是否有评价数据（有星级或评论）
      return (this.item?.rating && this.item.rating > 0) || this.item?.comment || this.item?.notes
    },
    ratingText() {
      // 根据星级返回对应的文字
      const rating = this.item?.rating || 0
      const ratingMap = {
        1: '劣作',
        2: '庸作',
        3: '良作',
        4: '佳作',
        5: '神作'
      }
      return ratingMap[rating] || ''
    },
    currentRating() {
      // 优先显示 hover 的星级，否则显示实际星级
      return this.hoverRating > 0 ? this.hoverRating : (this.item?.rating || 0)
    }
  },
  methods: {
    close() {
      this.$emit('close')
    },
    async handleFavoriteClick() {
      // 检查 item 是否存在，避免在面板关闭时触发更新
      if (!this.item || !this.item.id) {
        return
      }
      
      // 如果提供了统一的更新函数，直接调用
      if (this.onUpdateResource && typeof this.onUpdateResource === 'function') {
        try {
          const newFavoriteStatus = !this.item.isFavorite
          await this.onUpdateResource(this.item.id, { isFavorite: newFavoriteStatus })
          // 立即更新UI
          this.item.isFavorite = newFavoriteStatus
        } catch (error) {
          console.error('切换收藏状态失败:', error)
        }
      } else {
        // 否则 emit 事件（向后兼容）
        this.$emit('toggle-favorite', this.item)
      }
    },
    /**
     * 处理 overlay 区域的 mousedown 事件
     * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
     * 这样只有在外部区域按下鼠标时才会关闭，符合常见软件的交互习惯
     */
    handleOverlayMouseDown(event) {
      // 只在 overlay 背景上按下鼠标时才关闭（不是 content 区域）
      // event.target 是 overlay 本身，而不是 content
      if (event.target === event.currentTarget) {
        this.close()
      }
    },
    handleAction(actionKey) {
      console.log('📋 [DetailPanel] handleAction 被调用:', {
        actionKey,
        type: this.type,
        item: this.item ? { id: this.item.id, name: this.item.name } : null,
        actions: this.actions,
        computedActions: this.computedActions,
        timestamp: new Date().toISOString()
      })
      this.$emit('action', actionKey, this.item)
      console.log('📋 [DetailPanel] action 事件已发出:', actionKey)
    },
    handleStarMouseEnter(star) {
      // hover 时设置 hoverRating
      this.hoverRating = star
    },
    handleStarMouseLeave() {
      // 离开时清除 hoverRating
      this.hoverRating = 0
    },
    async handleStarClick(star) {
      // 检查 item 是否存在，避免在面板关闭时触发更新
      if (!this.item || !this.item.id) {
        return
      }
      
      // 如果提供了统一的更新函数，直接调用
      if (this.onUpdateResource && typeof this.onUpdateResource === 'function') {
        try {
          await this.onUpdateResource(this.item.id, { rating: star })
          // 立即更新UI
          this.item.rating = star
        } catch (error) {
          console.error('更新评分失败:', error)
        }
      } else {
        // 否则 emit 事件（向后兼容）
        this.$emit('update-rating', star, this.item)
      }
      
      // 点击后清除 hover 状态
      this.hoverRating = 0
    },
    getRatingText(rating) {
      // 根据星级返回对应的文字
      const ratingMap = {
        1: '劣作',
        2: '庸作',
        3: '良作',
        4: '佳作',
        5: '神作'
      }
      return ratingMap[rating] || ''
    },
    handleCommentInput(event) {
      // 实时更新评论内容（不立即保存，等待失焦时保存）
      // 这里可以添加防抖逻辑，但为了简单起见，我们在失焦时保存
    },
    async handleCommentBlur(event) {
      // 失焦时保存评论
      // 检查 item 是否存在，避免在面板关闭时触发更新
      if (!this.item || !this.item.id) {
        return
      }
      const comment = event.target.value.trim()
      
      // 如果提供了统一的更新函数，直接调用
      if (this.onUpdateResource && typeof this.onUpdateResource === 'function') {
        try {
          await this.onUpdateResource(this.item.id, { comment })
          // 立即更新UI
          this.item.comment = comment
        } catch (error) {
          console.error('更新评论失败:', error)
        }
      } else {
        // 否则 emit 事件（向后兼容）
        this.$emit('update-comment', comment, this.item)
      }
    },
    isArchiveFile(filePath) {
      if (!filePath) return false
      const fileName = filePath.toLowerCase()
      const archiveExtensions = ['.zip', '.rar', '.7z', '.tar', '.gz', '.tar.gz', '.bz2', '.tar.bz2', '.xz', '.tar.xz']
      return archiveExtensions.some(ext => fileName.endsWith(ext))
    },
    resolveImage(imagePath) {
      // 空值返回默认图片
      if (!imagePath || (typeof imagePath === 'string' && imagePath.trim() === '')) {
        const defaultImages = {
          game: './default-game.png',
          image: './default-image.png',
          album: './default-image.png',
          video: './default-video.png',
          audio: './default-audio.png',
          novel: './default-novel.png',
          website: './default-image.png'
        }
        return defaultImages[this.type] || './default-image.png'
      }
      
      // 网络资源直接返回
      if (typeof imagePath === 'string' && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        return imagePath
      }
      
      // 已是 data: 或 file: 直接返回
      if (typeof imagePath === 'string' && (imagePath.startsWith('data:') || imagePath.startsWith('file:'))) {
        return imagePath
      }
      
      // 对于视频缩略图，使用更复杂的路径处理
      if (this.type === 'video') {
        return this.resolveVideoThumbnail(imagePath)
      }
      
      // 回退：尝试 file://
      const normalizedPath = String(imagePath).replace(/\\/g, '/')
      const fileUrl = `file:///${normalizedPath}`
      return fileUrl
    },
    resolveVideoThumbnail(thumbnail) {
      // 处理视频缩略图路径，参考VideoView.vue的逻辑
      if (!thumbnail) {
        return './default-video.png'
      }
      
      // 相对路径处理（以 SaveData 开头）
      if (thumbnail.startsWith('SaveData/')) {
        const absolutePath = thumbnail.replace(/\\/g, '/')
        const fileUrl = `file:///${absolutePath}`
        return fileUrl
      }
      
      // 绝对路径处理
      if (thumbnail.includes(':')) {
        const normalized = thumbnail.replace(/\\/g, '/').replace(/^([A-Za-z]:)/, '/$1')
        const encoded = normalized.split('/').map(seg => {
          if (seg.includes(':')) return seg
          return encodeURIComponent(seg)
        }).join('/')
        return `file://${encoded}`
      }
      
      // 其他情况直接返回
      return thumbnail
    },
    handleImageError(event) {
      const defaultImages = {
        game: './default-game.png',
        image: './default-image.png',
        album: './default-image.png',
        video: './default-video.png',
        audio: './default-audio.png',
        novel: './default-novel.png',
        website: './default-image.png'
      }
      event.target.src = defaultImages[this.type] || './default-image.png'
    },
    formatDate(date) {
      if (!date) return '未知'
      try {
        return new Date(date).toLocaleDateString('zh-CN')
      } catch {
        return '未知'
      }
    },
    formatPlayTime(seconds) {
      if (!seconds || seconds === 0) return '0 分钟'
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      if (hours > 0) {
        return `${hours} 小时 ${minutes} 分钟`
      }
      return `${minutes} 分钟`
    },
    formatLastPlayed(date) {
      if (!date) return '从未游玩'
      try {
        return new Date(date).toLocaleDateString('zh-CN')
      } catch {
        return '未知'
      }
    },
    formatFirstPlayed(date) {
      if (!date) return '从未游玩'
      try {
        return new Date(date).toLocaleDateString('zh-CN')
      } catch {
        return '未知'
      }
    }
  }
}
</script>

<style scoped>
/* 详情面板样式 */
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.detail-content {
  background: var(--bg-secondary);
  border-radius: 12px;
  width: 800px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px var(--shadow-medium);
  transition: background-color 0.3s ease;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
}

.detail-favorite {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  padding: 5px;
  line-height: 1;
}

.detail-favorite:hover {
  color: #fbbf24;
  transform: scale(1.1);
}

.detail-favorite.favorited {
  color: #fbbf24;
}

.detail-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.detail-close:hover {
  color: var(--text-primary);
}

.detail-body {
  display: flex;
  gap: 30px;
  padding: 30px;
}

.detail-left {
  flex-shrink: 0;
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-image {
  width: 100%;
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 25px var(--shadow-medium);
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-title {
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  transition: color 0.3s ease;
  word-break: break-all;
}

.detail-author,
.detail-developer {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.detail-publisher {
  color: var(--text-tertiary);
  font-size: 1rem;
  margin: 0 0 15px 0;
  font-style: italic;
  transition: color 0.3s ease;
}

.detail-folder {
  color: var(--text-tertiary);
  font-size: 0.9rem;
  margin: 0 0 15px 0;
  word-break: break-all;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.detail-description {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--accent-color);
  transition: background-color 0.3s ease;
}

.description-title {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.description-content {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  transition: color 0.3s ease;
}

.detail-tags {
  margin-bottom: 20px;
  padding: 15px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--accent-color);
  transition: background-color 0.3s ease;
}

.tags-title {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 10px 0;
  transition: color 0.3s ease;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-tag {
  background: var(--accent-color);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.3s ease;
}

.detail-tag:hover {
  background: var(--accent-hover);
}

.detail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  padding: 20px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  transition: background-color 0.3s ease;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  transition: color 0.3s ease;
}

.stat-value {
  color: var(--text-primary);
  font-size: 1.1rem;
  font-weight: 600;
  transition: color 0.3s ease;
}

.detail-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}


.btn-stop-game {
  background: #ef4444;
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
}

.btn-stop-game:hover {
  background: #dc2626;
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
}

.btn-open-folder:hover {
  background: var(--bg-secondary);
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
}

.btn-open:hover {
  background: var(--accent-hover);
}

.btn-update-duration {
  background: #17a2b8;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-update-duration:hover {
  background: #138496;
  transform: translateY(-1px);
}

.btn-visit {
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
}

.btn-visit:hover {
  background: var(--accent-hover);
}

.btn-refresh-favicon {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-refresh-favicon:hover {
  background: #218838;
  transform: translateY(-1px);
}

.btn-edit {
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
}

.btn-edit:hover {
  background: var(--bg-secondary);
}


.btn-remove {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-remove:hover {
  background: #fecaca;
}

.btn-add-to-playlist {
  background: #28a745;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
}

.btn-add-to-playlist:hover {
  background: #218838;
  transform: translateY(-1px);
}



.btn-icon {
  font-size: 1rem;
}

.detail-rating {
  width: 100%;
  padding: 15px;
  background: var(--bg-tertiary);
  border-radius: 8px;
  border-left: 4px solid var(--accent-color);
  transition: background-color 0.3s ease;
}

.rating-title {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px 0;
  transition: color 0.3s ease;
}

.rating-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rating-stars {
  display: flex;
  align-items: center;
  gap: 8px;
}

.star {
  font-size: 1.5rem;
  color: var(--text-tertiary);
  transition: color 0.3s ease;
  line-height: 1;
  cursor: pointer;
  user-select: none;
}

.star:hover {
  transform: scale(1.1);
  transition: transform 0.2s ease;
}

.star-filled {
  color: #fbbf24;
}

.rating-text {
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 600;
  margin-left: 4px;
  transition: color 0.3s ease;
}

.rating-text.no-rating {
  color: var(--text-tertiary);
  font-style: italic;
  margin-left: 0;
}

.rating-comment {
  margin-top: 12px;
}

.comment-input {
  width: 100%;
  min-height: 80px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95rem;
  line-height: 1.6;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.comment-input:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(var(--accent-color-rgb, 59, 130, 246), 0.1);
}

.comment-input::placeholder {
  color: var(--text-tertiary);
  font-style: italic;
}

.comment-content {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  transition: color 0.3s ease;
}

.extra-section {
  border-top: 1px solid var(--border-color);
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .detail-content {
    width: 95vw;
    margin: 20px;
  }
  
  .detail-body {
    flex-direction: column;
    gap: 20px;
  }
  
  .detail-left {
    width: 100%;
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

