<template>
  <div class="games-grid" v-if="games.length > 0">
    <MediaCard 
      v-for="game in games" 
      :key="game.id" 
      :item="game" 
      type="game"
      :is-running="isGameRunning(game)" 
      :is-electron-environment="isElectronEnvironment"
      :file-exists="game.fileExists" 
      @click="$emit('game-click', game)"
      @contextmenu="$emit('game-contextmenu', $event, game)" 
      @action="$emit('game-action', game)" 
    />
  </div>
</template>

<script lang="ts">
import MediaCard from '../MediaCard.vue'

export default {
  name: 'GameGrid',
  components: {
    MediaCard
  },
  props: {
    games: {
      type: Array,
      required: true,
      default: () => []
    },
    isGameRunning: {
      type: Function,
      required: true
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    }
  },
  emits: ['game-click', 'game-contextmenu', 'game-action']
}
</script>

<style scoped>
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }
}
</style>

