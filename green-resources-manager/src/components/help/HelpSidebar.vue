<template>
  <div class="help-sidebar">
    <div class="sidebar-header">
      <h2>📚 帮助中心</h2>
    </div>
    <nav class="sidebar-nav">
      <ul class="nav-list">
        <li 
          v-for="item in navItems" 
          :key="item.id"
          class="nav-item" 
          :class="{ active: activeSection === item.id }" 
          @click="$emit('section-change', item.id)">
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.text }}</span>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HelpSidebar',
  props: {
    activeSection: {
      type: String,
      required: true
    }
  },
  emits: ['section-change'],
  data() {
    return {
      navItems: [
        { id: 'intro', icon: '🏠', text: '简介' },
        { id: 'general', icon: '🛠️', text: '通用管理' },
        { id: 'game', icon: '🎮', text: '游戏管理' },
        { id: 'image', icon: '🖼️', text: '图片管理' },
        { id: 'video', icon: '🎬', text: '视频管理' },
        { id: 'novel', icon: '📚', text: '小说管理' },
        { id: 'website', icon: '🌐', text: '网站收藏' },
        { id: 'audio', icon: '🎵', text: '音频管理' },
        { id: 'faq', icon: '❓', text: '常见问题' },
        { id: 'support', icon: '💬', text: '客服&问题反馈' },
        { id: 'about', icon: 'ℹ️', text: '关于我们' }
      ]
    }
  }
}
</script>

<style scoped>
.help-sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
}

.sidebar-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.3rem;
  font-weight: 600;
}

.sidebar-nav {
  flex: 1;
  padding: 10px 0;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-list li {
  list-style: none;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
}

.nav-item:hover {
  background: var(--bg-tertiary);
}

.nav-item.active {
  background: var(--accent-color);
  color: white;
  border-left-color: var(--accent-hover);
}

.nav-item.active .nav-icon,
.nav-item.active .nav-text {
  color: white;
}

.nav-icon {
  font-size: 1.2rem;
  margin-right: 12px;
  color: var(--text-secondary);
  transition: color 0.3s ease;
}

.nav-text {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: color 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .help-sidebar {
    width: 100%;
    height: auto;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .sidebar-nav {
    padding: 0;
  }

  .nav-list {
    display: flex;
    overflow-x: auto;
    padding: 10px;
  }

  .nav-item {
    flex-shrink: 0;
    white-space: nowrap;
    border-left: none;
    border-bottom: 3px solid transparent;
  }

  .nav-item.active {
    border-left: none;
    border-bottom-color: var(--accent-hover);
  }
}
</style>

