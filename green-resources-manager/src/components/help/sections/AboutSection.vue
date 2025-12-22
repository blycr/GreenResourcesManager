<template>
  <HelpSection 
    title="ℹ️ 关于我们" 
    subtitle="了解 GreenResourcesManager 的更多信息">
    <!-- 帽子社艺术化展示区域 -->
    <div class="hat-soft-showcase">
      <div class="hat-soft-logo-container">
        <img src="/hat-soft.png" alt="帽子社" class="hat-soft-logo" />
      </div>
      <div class="hat-soft-content">
        <h2 class="hat-soft-title">帽子社</h2>
        <p class="hat-soft-description">
          帽子社是一个专注于实验游戏开发和游戏理论研究的社群，同时也会涉猎游戏相关的工具、产品开发。如果对游戏感兴趣，欢迎加入我们。
        </p>
        <div class="hat-soft-links">
          <div class="hat-soft-link-item" @click="openExternalLink('https://qm.qq.com/q/sUCdrpPNkc')">
            <span class="link-icon">💬</span>
            <div class="link-content">
              <span class="link-title">通知中心</span>
              <span class="link-subtitle">加入QQ群</span>
            </div>
          </div>
          <div class="hat-soft-link-item" @click="openExternalLink('https://hat-soft.top/')">
            <span class="link-icon">🌐</span>
            <div class="link-content">
              <span class="link-title">官方网站</span>
              <span class="link-subtitle">hat-soft.top</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 个人信息和名片展示 -->
    <BusinessCard />
  </HelpSection>
</template>

<script setup lang="ts">
import HelpSection from '../HelpSection.vue'
import BusinessCard from '../BusinessCard.vue'
import { useHelpUtils } from '../../../composables/useHelpUtils'

const { openExternalLink } = useHelpUtils()
</script>

