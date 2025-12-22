<template>
  <div class="help-view">
    <!-- 左侧导航栏 -->
    <HelpSidebar :active-section="activeSection" @section-change="setActiveSection" />

    <!-- 右侧内容区域 -->
    <div class="help-content">
      <!-- 使用动态组件加载各个section -->
      <component :is="currentSectionComponent" v-if="currentSectionComponent" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import HelpSidebar from '../components/help/HelpSidebar.vue'
import IntroSection from '../components/help/sections/IntroSection.vue'
import GeneralSection from '../components/help/sections/GeneralSection.vue'
import GameSection from '../components/help/sections/GameSection.vue'
import ImageSection from '../components/help/sections/ImageSection.vue'
import VideoSection from '../components/help/sections/VideoSection.vue'
import NovelSection from '../components/help/sections/NovelSection.vue'
import WebsiteSection from '../components/help/sections/WebsiteSection.vue'
import AudioSection from '../components/help/sections/AudioSection.vue'
import FaqSection from '../components/help/sections/FaqSection.vue'
import SupportSection from '../components/help/sections/SupportSection.vue'
import AboutSection from '../components/help/sections/AboutSection.vue'

export default defineComponent({
  name: 'HelpView',
  components: {
    HelpSidebar,
    IntroSection,
    GeneralSection,
    GameSection,
    ImageSection,
    VideoSection,
    NovelSection,
    WebsiteSection,
    AudioSection,
    FaqSection,
    SupportSection,
    AboutSection
  },
  setup() {
    const activeSection = ref('intro')

    const sectionComponents: Record<string, any> = {
      intro: IntroSection,
      general: GeneralSection,
      game: GameSection,
      image: ImageSection,
      video: VideoSection,
      novel: NovelSection,
      website: WebsiteSection,
      audio: AudioSection,
      faq: FaqSection,
      support: SupportSection,
      about: AboutSection
    }

    const currentSectionComponent = computed(() => {
      return sectionComponents[activeSection.value]
    })

    function setActiveSection(section: string) {
      activeSection.value = section
    }

    return {
      activeSection,
      currentSectionComponent,
      setActiveSection
    }
  }
})
</script>

<style scoped>
.help-view {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
}
</style>

<style>
@import '../styles/help/help-common.css';
</style>
