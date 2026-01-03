import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import type { PageConfig } from '../types/page'
import customPageManager from '../utils/CustomPageManager'

// 固定页面路由
const fixedRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../pages/HomeView.vue'),
    meta: {
      title: '主页',
      icon: '🏠',
      description: '欢迎页面，快速访问各个功能模块',
      requiresFilter: false
    }
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('../pages/SearchView.vue'),
    meta: {
      title: '搜索',
      icon: '🔍',
      description: '在所有资源中搜索内容',
      requiresFilter: false
    }
  },
  {
    path: '/workshop',
    name: 'workshop',
    component: () => import('../pages/WorkshopView.vue'),
    meta: {
      title: '创意工坊',
      icon: '🎨',
      description: '分享和发现社区创作内容',
      requiresFilter: false
    }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('../pages/UserView.vue'),
    meta: {
      title: '用户',
      icon: '👤',
      description: '记录您的个人数据已经本软件的各种数据',
      requiresFilter: false
    },
    children: [
      {
        path: 'profile',
        name: 'users-profile',
        component: () => import('../pages/user/ProfileView.vue'),
        meta: { title: '用户资料' }
      },
      {
        path: 'achievements',
        name: 'users-achievements',
        component: () => import('../pages/user/AchievementView.vue'),
        meta: { title: '成就' }
      },
      {
        path: 'statistics',
        name: 'users-statistics',
        component: () => import('../pages/user/StatisticsView.vue'),
        meta: { title: '统计' }
      },
      {
        path: '',
        redirect: 'profile'
      }
    ]
  },
  {
    path: '/messages',
    name: 'messages',
    component: () => import('../pages/MessageCenterView.vue'),
    meta: {
      title: '信息中心',
      icon: '📢',
      description: '查看系统通知和操作历史',
      requiresFilter: false
    }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../pages/SettingsView.vue'),
    meta: {
      title: '设置',
      icon: '⚙️',
      description: '管理应用设置和偏好',
      requiresFilter: false
    }
  },
  {
    path: '/help',
    name: 'help',
    component: () => import('../pages/HelpView.vue'),
    meta: {
      title: '帮助',
      icon: '❓',
      description: '了解应用功能和使用方法',
      requiresFilter: false
    }
  },
  {
    path: '/collections',
    name: 'collections',
    component: () => import('../pages/CollectionsView.vue'),
    meta: {
      title: '合集',
      icon: '🗂️',
      description: '管理你的合集',
      requiresFilter: false
    }
  },
  {
    path: '/recent',
    name: 'recent',
    component: () => import('../pages/RecentView.vue'),
    meta: {
      title: '最近浏览',
      icon: '🕒',
      description: '查看最近浏览的内容',
      requiresFilter: false
    }
  }
]

// 资源类型到组件的映射
const resourceTypeToComponent: Record<string, () => Promise<any>> = {
  Game: () => import('../pages/resources/GameView.vue'),
  Software: () => import('../pages/resources/SoftwareView.vue'),
  Image: () => import('../pages/resources/ImageView.vue'),
  SingleImage: () => import('../pages/resources/SingleImageView.vue'),
  Video: () => import('../pages/resources/VideoView.vue'),
  Anime: () => import('../pages/resources/VideoAnimeSeriesView.vue'),
  Novel: () => import('../pages/resources/NovelView.vue'),
  Website: () => import('../pages/resources/WebsiteView.vue'),
  Audio: () => import('../pages/resources/AudioView.vue'),
  Other: () => import('../pages/resources/OtherView.vue')
}

/**
 * 根据页面配置创建资源路由
 */
function createResourceRoute(pageConfig: PageConfig): RouteRecordRaw {
  const component = resourceTypeToComponent[pageConfig.type]
  
  if (!component) {
    throw new Error(`未知的资源类型: ${pageConfig.type}`)
  }

  return {
    path: `/${pageConfig.id}`,
    name: pageConfig.id,
    component: () => import('../components/ResourceView.vue'),
    props: {
      pageConfig: pageConfig
    },
    meta: {
      title: pageConfig.name,
      icon: pageConfig.icon,
      description: pageConfig.description || `${pageConfig.name}管理页面`,
      requiresFilter: true,
      pageConfig: pageConfig
    }
  }
}

/**
 * 从 customPageManager 加载动态路由
 */
export async function loadDynamicRoutes(): Promise<RouteRecordRaw[]> {
  await customPageManager.init()
  const pages = customPageManager.getPages()
  
  return pages
    .filter(page => !page.isHidden)
    .map(page => createResourceRoute(page))
}

/**
 * 创建路由实例
 */
export async function createAppRouter() {
  // 加载动态路由
  const dynamicRoutes = await loadDynamicRoutes()
  
  // 合并所有路由
  const routes: RouteRecordRaw[] = [
    ...fixedRoutes,
    ...dynamicRoutes,
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]

  const router = createRouter({
    history: createWebHashHistory(),
    routes
  })

  // 路由守卫：保存最后访问的页面
  router.afterEach((to) => {
    // 保存到 localStorage 或通过事件通知 App.vue
    if (to.name && to.name !== 'home') {
      window.dispatchEvent(new CustomEvent('route-changed', {
        detail: { routeName: to.name }
      }))
    }
  })

  return router
}

/**
 * 更新动态路由（当页面配置变化时调用）
 */
export async function updateDynamicRoutes(router: ReturnType<typeof createRouter>) {
  // 移除旧的动态路由（除了固定路由）
  const routesToRemove = router.getRoutes().filter(route => {
    const meta = route.meta as any
    return meta?.pageConfig && !fixedRoutes.some(r => r.name === route.name)
  })

  routesToRemove.forEach(route => {
    if (route.name) {
      router.removeRoute(route.name)
    }
  })

  // 添加新的动态路由
  const newRoutes = await loadDynamicRoutes()
  newRoutes.forEach(route => {
    router.addRoute(route)
  })
}

