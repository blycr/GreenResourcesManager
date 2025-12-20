<template>
  <div class="audios-grid" v-if="audios.length > 0">
    <MediaCard
      v-for="audio in audios" 
      :key="audio.id"
      :item="audio"
      type="audio"
      :isElectronEnvironment="isElectronEnvironment"
      :file-exists="audio.fileExists"
      @click="$emit('audio-click', audio)"
      @contextmenu="$emit('audio-contextmenu', $event, audio)"
      @action="$emit('audio-action', audio)"
    />
  </div>
</template>

<script lang="ts">
import MediaCard from '../MediaCard.vue'
import type { Audio } from '../../types/audio'

export default {
  name: 'AudioGrid',
  components: {
    MediaCard
  },
  props: {
    audios: {
      type: Array as () => Audio[],
      required: true,
      default: () => []
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    }
  },
  emits: ['audio-click', 'audio-contextmenu', 'audio-action']
}
</script>

<style scoped>
.audios-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .audios-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
    padding: 15px;
  }
}

@media (min-width: 1200px) {
  .audios-grid {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }
}
</style>

