<template>
  <div class="home-view">
    <div class="home-content">
      <!-- 为您推荐 -->
      <div class="recommended-section">
        <div class="section-header">
          <h2 class="section-title">为您推荐</h2>
          <a href="#" class="view-more-link" @click.prevent="navigateToRecommended">查看更多</a>
        </div>
        <div class="resources-grid" v-if="recommendedResources.length > 0">
          <ResourceCard
            v-for="resource in recommendedResources"
            :key="`${resource.type}-${resource.id}`"
            :resource="resource"
            @click="handleResourceClick(resource)"
          />
        </div>
        <div v-else class="empty-state">
          <p>暂无推荐资源</p>
        </div>
      </div>

      <!-- 最近浏览 -->
      <div class="recent-section">
        <div class="section-header">
          <h2 class="section-title">最近浏览</h2>
          <a href="#" class="view-more-link" @click.prevent="navigateToRecent">查看全部</a>
        </div>
        <div class="resources-grid" v-if="recentResources.length > 0">
          <ResourceCard
            v-for="resource in recentResources"
            :key="`${resource.type}-${resource.id}`"
            :resource="resource"
            @click="handleResourceClick(resource)"
          />
        </div>
        <div v-else class="empty-state">
          <p>暂无最近浏览记录</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import saveManager from '../utils/SaveManager.ts'
import ResourceCard from '../components/home/ResourceCard.vue'

interface UnifiedResource {
  id: string
  type: 'game' | 'image' | 'video' | 'novel' | 'website' | 'audio'
  name: string
  category?: string
  description?: string
  thumbnail?: string
  image?: string
  cover?: string
  lastAccessed?: string | null
  badge?: string
  metadata?: {
    [key: string]: any
  }
}

export default {
  name: 'HomeView',
  components: {
    ResourceCard
  },
  data() {
    return {
      recommendedResources: [] as UnifiedResource[],
      recentResources: [] as UnifiedResource[],
      isLoading: false
    }
  },
  methods: {
    navigateTo(viewId: string) {
      this.$emit('navigate', viewId)
    },
    navigateToRecommended() {
      // 可以导航到推荐页面或刷新推荐
      this.loadRecommendedResources()
    },
    navigateToRecent() {
      // 导航到最近浏览页面，这里可以导航到各个资源类型页面
      // 或者创建一个专门的最近浏览页面
      this.navigateTo('games') // 暂时导航到游戏页面
    },
    async loadAllResources() {
      try {
        this.isLoading = true
        
        // 并行加载所有资源类型
        const [games, images, videos, novels, websites, audios] = await Promise.all([
          saveManager.loadGames(),
          saveManager.loadImages(),
          saveManager.loadVideos(),
          saveManager.loadNovels(),
          saveManager.loadWebsites(),
          saveManager.loadAudios()
        ])

        // 转换为统一格式
        const allResources: UnifiedResource[] = [
          ...games.map((g: any) => this.normalizeGame(g)),
          ...images.map((img: any) => this.normalizeImage(img)),
          ...videos.map((v: any) => this.normalizeVideo(v)),
          ...novels.map((n: any) => this.normalizeNovel(n)),
          ...websites.map((w: any) => this.normalizeWebsite(w)),
          ...audios.map((a: any) => this.normalizeAudio(a))
        ]

        // 生成随机推荐（只显示6个）
        this.recommendedResources = this.generateRandomRecommendations(allResources, 6)
        
        // 获取最近访问的资源（至少6个）
        this.recentResources = this.getRecentResources(allResources, 6)
        
        this.isLoading = false
      } catch (error) {
        console.error('加载资源失败:', error)
        this.isLoading = false
      }
    },
    normalizeGame(game: any): UnifiedResource {
      return {
        id: game.id,
        type: 'game',
        name: game.name,
        category: game.developer || '游戏',
        description: game.description,
        thumbnail: game.image,
        lastAccessed: game.lastPlayed,
        badge: game.playTime ? undefined : '未通关',
        metadata: {
          developer: game.developer,
          publisher: game.publisher,
          tags: game.tags,
          playTime: game.playTime,
          playCount: game.playCount
        }
      }
    },
    normalizeImage(album: any): UnifiedResource {
      // 尝试从 metadata 或其他字段获取大小信息
      const size = album.folderSize || (album.pagesCount ? album.pagesCount * 1024 * 1024 : 0)
      // 根据大小判断是否为高清
      let badge = undefined
      if (size > 0) {
        const sizeGB = size / (1024 * 1024 * 1024)
        if (sizeGB >= 4) {
          badge = '4K'
        } else {
          badge = this.formatSize(size)
        }
      }
      
      return {
        id: album.id,
        type: 'image',
        name: album.name,
        category: album.author || '高清壁纸',
        description: album.description,
        thumbnail: album.cover,
        lastAccessed: album.lastViewed,
        badge: badge,
        metadata: {
          author: album.author,
          pagesCount: album.pagesCount,
          viewCount: album.viewCount,
          tags: album.tags,
          folderSize: size
        }
      }
    },
    normalizeVideo(video: any): UnifiedResource {
      // 根据视频大小或质量添加徽章
      let badge = undefined
      if (video.fileSize) {
        const sizeGB = video.fileSize / (1024 * 1024 * 1024)
        if (sizeGB >= 4) {
          badge = '4K'
        } else if (sizeGB >= 1) {
          badge = 'HD'
        }
      } else if (video.duration) {
        // 如果没有大小信息，使用时长作为徽章
        badge = this.formatDuration(video.duration)
      }
      
      return {
        id: video.id,
        type: 'video',
        name: video.name,
        category: video.series || '冒险视频',
        description: video.description,
        thumbnail: video.thumbnail,
        lastAccessed: video.lastWatched,
        badge: badge,
        metadata: {
          series: video.series,
          duration: video.duration,
          watchCount: video.watchCount,
          tags: video.tags,
          actors: video.actors,
          fileSize: video.fileSize
        }
      }
    },
    normalizeNovel(novel: any): UnifiedResource {
      // 小说可以使用卷数或文件大小作为徽章
      let badge = undefined
      if (novel.volume) {
        badge = novel.volume
      } else if (novel.fileSize) {
        badge = this.formatSize(novel.fileSize)
      }
      
      return {
        id: novel.id,
        type: 'novel',
        name: novel.name,
        category: novel.author || '轻小说',
        description: novel.description,
        thumbnail: novel.coverImage,
        lastAccessed: novel.lastRead,
        badge: badge,
        metadata: {
          author: novel.author,
          genre: novel.genre,
          readProgress: novel.readProgress,
          status: novel.status,
          tags: novel.tags,
          volume: novel.volume,
          fileSize: novel.fileSize
        }
      }
    },
    normalizeWebsite(website: any): UnifiedResource {
      return {
        id: website.id,
        type: 'website',
        name: website.name,
        category: website.category || '游戏资源网站',
        description: website.description,
        thumbnail: website.favicon || website.icon,
        lastAccessed: website.lastVisited,
        badge: website.isBookmark ? '已收藏' : undefined,
        metadata: {
          url: website.url,
          category: website.category,
          visitCount: website.visitCount,
          tags: website.tags
        }
      }
    },
    normalizeAudio(audio: any): UnifiedResource {
      // 音频使用文件大小作为徽章
      const fileSize = audio.fileSize || 0
      return {
        id: audio.id,
        type: 'audio',
        name: audio.name,
        category: audio.album || 'OST音乐',
        description: audio.notes,
        thumbnail: audio.thumbnailPath,
        lastAccessed: audio.lastPlayed,
        badge: fileSize > 0 ? this.formatSize(fileSize) : undefined,
        metadata: {
          artist: audio.artist,
          album: audio.album,
          genre: audio.genre,
          playCount: audio.playCount,
          duration: audio.duration,
          tags: audio.tags,
          fileSize: fileSize
        }
      }
    },
    generateRandomRecommendations(resources: UnifiedResource[], count: number): UnifiedResource[] {
      if (resources.length === 0) return []
      if (resources.length <= count) return [...resources].sort(() => Math.random() - 0.5)
      
      // 随机选择资源
      const shuffled = [...resources].sort(() => Math.random() - 0.5)
      return shuffled.slice(0, count)
    },
    getRecentResources(resources: UnifiedResource[], count: number): UnifiedResource[] {
      // 过滤出有访问时间的资源并按时间排序
      const withAccessTime = resources
        .filter(r => r.lastAccessed)
        .sort((a, b) => {
          const timeA = new Date(a.lastAccessed!).getTime()
          const timeB = new Date(b.lastAccessed!).getTime()
          return timeB - timeA // 降序，最新的在前
        })
      
      return withAccessTime.slice(0, count)
    },
    handleResourceClick(resource: UnifiedResource) {
      // 导航到对应的资源类型页面
      const viewMap: { [key: string]: string } = {
        'game': 'games',
        'image': 'images',
        'video': 'videos',
        'novel': 'novels',
        'website': 'websites',
        'audio': 'audio'
      }
      
      const viewId = viewMap[resource.type]
      if (viewId) {
        this.navigateTo(viewId)
      }
    },
    formatSize(bytes: number): string {
      if (!bytes || bytes === 0) return ''
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(1024))
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
    },
    formatDuration(seconds?: number): string {
      if (!seconds) return ''
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = seconds % 60
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${minutes}:${secs.toString().padStart(2, '0')}`
    }
  },
  async mounted() {
    await this.loadAllResources()
  }
}
</script>

<style scoped>
.home-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.home-content {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
  background: #f5f5f5;
}

/* 推荐区域和最近浏览区域 */
.recommended-section,
.recent-section {
  margin-bottom: 3rem;
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.view-more-link {
  color: #666;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.view-more-link:hover {
  color: #dc2626;
}

/* 资源网格 */
.resources-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
  overflow-x: auto;
}

/* 为您推荐区域 - 只显示一行 */
.recommended-section .resources-grid {
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: 1fr;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #999;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .recommended-section .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .home-content {
    padding: 1rem;
  }
}
</style>