<template>
  <DetailPanel 
    :visible="visible" 
    :item="game" 
    type="game" 
    :is-running="isRunning"
    @close="handleClose"
    @action="handleAction" 
  />
</template>

<script lang="ts">
import DetailPanel from '../DetailPanel.vue'

export default {
  name: 'GameDetailPanel',
  components: {
    DetailPanel
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    game: {
      type: Object,
      default: null
    },
    isRunning: {
      type: Boolean,
      default: false
    }
  },
  emits: ['close', 'action'],
  methods: {
    handleClose() {
      this.$emit('close')
    },
    handleAction(actionKey, game) {
      this.$emit('action', actionKey, game)
    }
  }
}
</script>

<style scoped>
/* 样式由 DetailPanel 组件提供 */
</style>

