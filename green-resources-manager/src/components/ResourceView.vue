<template>
  <div class="resource-view-wrapper">
    <component 
      ref="innerView"
      :is="viewComponent" 
      v-if="viewComponent"
      :key="pageConfig.id"
      :page-config="pageConfig"
      @filter-data-updated="$emit('filter-data-updated', $event)"
    />
    <div v-else class="error-state">
      <p>未知资源类型: {{ pageConfig.type }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType, computed, defineAsyncComponent, ref, watch, nextTick } from 'vue';
import { PageConfig } from '../types/page';

// 异步加载视图组件以避免循环引用和减少初始包大小
const GameView = defineAsyncComponent(() => import('../pages/GameView.vue'));
const ImageView = defineAsyncComponent(() => import('../pages/ImageView.vue'));
const VideoView = defineAsyncComponent(() => import('../pages/VideoView.vue'));
const NovelView = defineAsyncComponent(() => import('../pages/NovelView.vue'));
const WebsiteView = defineAsyncComponent(() => import('../pages/WebsiteView.vue'));
const AudioView = defineAsyncComponent(() => import('../pages/AudioView.vue'));

export default defineComponent({
  name: 'ResourceView',
  props: {
    pageConfig: {
      type: Object as PropType<PageConfig>,
      required: true
    }
  },
  emits: ['filter-data-updated'],
  setup(props, { emit }) {
    const innerView = ref(null);

    const viewComponent = computed(() => {
      if (!props.pageConfig || !props.pageConfig.type) return null;
      
      const normalizedType = props.pageConfig.type.charAt(0).toUpperCase() + props.pageConfig.type.slice(1).toLowerCase();
      
      switch (normalizedType) {
        case 'Game':
          return GameView;
        case 'Image':
          return ImageView;
        case 'Video':
          return VideoView;
        case 'Novel':
          return NovelView;
        case 'Website':
          return WebsiteView;
        case 'Audio':
          return AudioView;
        default:
          return null;
      }
    });

    // If component is not found, emit empty filter data to stop loading spinner
    if (!viewComponent.value) {
      emit('filter-data-updated', { filters: [] });
    }

    // Expose updateFilterData method to parent
    const updateFilterData = () => {
      if (innerView.value && (innerView.value as any).updateFilterData) {
        (innerView.value as any).updateFilterData();
      }
    };

    // Expose handleFilterEvent method to parent
    const handleFilterEvent = (event: string, data: any) => {
      if (innerView.value && (innerView.value as any).handleFilterEvent) {
        (innerView.value as any).handleFilterEvent(event, data);
      }
    };

    watch(
      () => innerView.value,
      (v) => {
        if (v && (v as any).updateFilterData) {
          nextTick(() => {
            try {
              (v as any).updateFilterData();
            } catch (e) {
              console.warn('[ResourceView] 初始化过滤失败:', e);
            }
          });
        }
      },
      { flush: 'post' }
    );

    return {
      viewComponent,
      innerView,
      updateFilterData,
      handleFilterEvent
    };
  }
});
</script>

<style scoped>
.resource-view-wrapper {
  height: 100%;
  width: 100%;
}

.error-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--text-secondary);
}
</style>
