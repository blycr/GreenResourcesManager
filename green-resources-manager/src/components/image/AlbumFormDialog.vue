<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <!-- 调试信息 -->
    <div style="position: fixed; top: 10px; right: 10px; background: green; color: white; padding: 10px; z-index: 10000; font-size: 12px;">
      AlbumFormDialog 已渲染: visible={{ visible }}, mode={{ mode }}
    </div>
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ mode === 'add' ? '添加漫画' : '编辑漫画' }}</h3>
        <button class="modal-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField
          :label="mode === 'add' ? '漫画名称 (可选)' : '名称'"
          type="text"
          v-model="formData.name"
          :placeholder="mode === 'add' ? '留空将自动从文件夹名提取' : '输入漫画名称'"
        />
        <FormField
          :label="mode === 'add' ? '作者 (可选)' : '作者'"
          type="text"
          v-model="formData.author"
          placeholder="输入作者名称"
        />
        <FormField
          :label="mode === 'add' ? '漫画简介 (可选)' : '漫画简介'"
          type="textarea"
          v-model="formData.description"
          placeholder="输入漫画简介或描述..."
          :rows="3"
        />
        <FormField
          :label="mode === 'add' ? '漫画标签 (可选)' : '漫画标签'"
          type="tags"
          v-model="formData.tags"
          v-model:tagInput="localTagInput"
          @add-tag="handleAddTag"
          @remove-tag="handleRemoveTag"
        />
        <FormField
          label="漫画文件夹"
          type="file"
          v-model="formData.folderPath"
          placeholder="选择漫画文件夹"
          @browse="handleBrowseFolder"
        />
        <!-- 封面选择器 -->
        <CoverSelector
          :cover="cover"
          :folderPath="formData.folderPath"
          :label="mode === 'add' ? '封面图片 (可选)' : '封面图片'"
          :resolveCoverImage="resolveCoverImage"
          :getImageFileName="getImageFileName"
          :handleImageError="handleImageError"
          @use-first-image="handleUseFirstImage"
          @select-from-folder="handleSelectFromFolder"
          @browse="handleBrowseImage"
          @clear="handleClearCover"
        />
      </div>
      <div class="modal-footer">
        <button class="btn-cancel" @click="handleClose">取消</button>
        <button 
          class="btn-confirm" 
          @click="handleSubmit" 
          :disabled="!canSubmit"
        >
          {{ mode === 'add' ? '添加' : '保存修改' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, watch } from 'vue'
import FormField from '../FormField.vue'
import CoverSelector from './CoverSelector.vue'
import type { AlbumForm } from '../../types/image'

export default {
  name: 'AlbumFormDialog',
  components: {
    FormField,
    CoverSelector
  },
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    mode: {
      type: String as () => 'add' | 'edit',
      default: 'add',
      validator: (value: string) => ['add', 'edit'].includes(value)
    },
    formData: {
      type: Object as () => AlbumForm,
      required: true
    },
    cover: {
      type: String,
      default: ''
    },
    tagInput: {
      type: String,
      default: ''
    },
    resolveCoverImage: {
      type: Function,
      required: true
    },
    getImageFileName: {
      type: Function,
      required: true
    },
    handleImageError: {
      type: Function,
      required: true
    },
    useFirstImageAsCover: {
      type: Function,
      required: true
    },
    selectImageFromFolder: {
      type: Function,
      required: true
    },
    browseForImage: {
      type: Function,
      required: true
    },
    clearCover: {
      type: Function,
      required: true
    }
  },
  emits: ['update:visible', 'update:formData', 'update:cover', 'update:tagInput', 'submit', 'close', 'browse-folder', 'add-tag', 'remove-tag'],
  setup(props, { emit }) {
    const localTagInput = ref(props.tagInput)

    // 监听 visible 变化
    watch(() => props.visible, (newVal) => {
      console.log('📝 [AlbumFormDialog] visible 变化:', {
        visible: newVal,
        mode: props.mode,
        formData: props.formData ? { name: props.formData.name, folderPath: props.formData.folderPath } : null,
        timestamp: new Date().toISOString()
      })
    }, { immediate: true })

    watch(() => props.tagInput, (newVal) => {
      localTagInput.value = newVal
    })

    watch(localTagInput, (newVal) => {
      emit('update:tagInput', newVal)
    })

    const canSubmit = computed(() => {
      return props.formData.folderPath && props.formData.folderPath.trim()
    })

    const handleClose = () => {
      console.log('📝 [AlbumFormDialog] handleClose 被调用')
      emit('update:visible', false)
      emit('close')
    }

    const handleSubmit = () => {
      if (canSubmit.value) {
        emit('submit', { ...props.formData, cover: props.cover })
      }
    }

    const handleBrowseFolder = () => {
      emit('browse-folder')
    }

    const handleAddTag = () => {
      emit('add-tag')
    }

    const handleRemoveTag = (index: number) => {
      emit('remove-tag', index)
    }

    const handleUseFirstImage = () => {
      props.useFirstImageAsCover()
    }

    const handleSelectFromFolder = () => {
      props.selectImageFromFolder()
    }

    const handleBrowseImage = () => {
      props.browseForImage()
    }

    const handleClearCover = () => {
      props.clearCover()
    }

    return {
      localTagInput,
      canSubmit,
      handleClose,
      handleSubmit,
      handleBrowseFolder,
      handleAddTag,
      handleRemoveTag,
      handleUseFirstImage,
      handleSelectFromFolder,
      handleBrowseImage,
      handleClearCover
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000; /* 高于 DetailPanel 的 z-index: 2000 */
}

.modal-content {
  background: var(--bg-primary, #fff);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background: var(--bg-hover, #f0f0f0);
  color: var(--text-primary, #333);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color, #e0e0e0);
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
}

.btn-cancel:hover {
  background: var(--bg-hover, #e0e0e0);
}

.btn-confirm {
  background: var(--primary-color, #007bff);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: var(--primary-hover, #0056b3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

