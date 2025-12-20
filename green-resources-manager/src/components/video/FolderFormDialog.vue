<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ mode === 'add' ? '添加文件夹' : '编辑文件夹' }}</h3>
        <button class="modal-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField
          label="文件夹名称"
          type="text"
          v-model="localFormData.name"
          placeholder="如：复仇者联盟系列"
        />
        
        <FormField
          label="系列名"
          type="text"
          v-model="localFormData.series"
          placeholder="如：复仇者联盟"
        />

        <FormField
          label="演员"
          type="text"
          v-model="localActorsInput"
          placeholder="用逗号分隔多个演员"
          @blur="parseActors"
        />

        <FormField
          label="标签"
          type="tags"
          v-model="localFormData.tags"
          v-model:tagInput="localTagsInput"
          @add-tag="addTag"
          @remove-tag="removeTag"
        />

        <FormField
          label="描述"
          type="textarea"
          v-model="localFormData.description"
          placeholder="文件夹描述..."
          :rows="3"
        />

        <FormField
          label="文件夹路径"
          type="file"
          v-model="localFormData.folderPath"
          placeholder="选择包含视频的文件夹"
          @browse="handleBrowseFolder"
        />

        <div class="form-group">
          <label>缩略图</label>
          <div class="file-input-group">
            <input type="text" v-model="localFormData.thumbnail" readonly>
            <button 
              type="button" 
              class="btn-select-file" 
              @click="handleSelectFromCovers" 
              :disabled="!localFormData.folderPath"
            >
              从封面文件夹选择
            </button>
            <button type="button" class="btn-select-file" @click="handleBrowseThumbnailFile">
              自定义选择
            </button>
          </div>
          <div class="thumb-preview-wrapper">
            <img 
              v-if="localFormData.thumbnail"
              class="thumb-preview"
              :src="getThumbnailUrl(localFormData.thumbnail)"
              :alt="localFormData.name || 'thumbnail'"
              @error="(event: Event) => handleThumbnailPreviewError(event)"
              @load="handleThumbnailPreviewLoad ? (event: Event) => handleThumbnailPreviewLoad(event) : undefined"
            >
            <div v-else class="thumb-placeholder">无缩略图</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" @click="handleClose" class="btn-cancel">取消</button>
        <button 
          type="button" 
          @click="handleSubmit" 
          class="btn-confirm"
          :disabled="!canSubmit"
        >
          {{ mode === 'add' ? '添加文件夹' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, watch } from 'vue'
import FormField from '../FormField.vue'
import type { FolderForm } from '../../types/video'

export default {
  name: 'FolderFormDialog',
  components: {
    FormField
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
      type: Object as () => FolderForm,
      required: true
    },
    actorsInput: {
      type: String,
      default: ''
    },
    tagsInput: {
      type: String,
      default: ''
    },
    getThumbnailUrl: {
      type: Function,
      required: true
    },
    handleThumbnailPreviewError: {
      type: Function,
      required: true
    },
    handleThumbnailPreviewLoad: {
      type: Function,
      default: () => {}
    }
  },
  emits: ['update:visible', 'update:formData', 'update:actorsInput', 'update:tagsInput', 'submit', 'close', 'browse-folder', 'select-from-covers', 'browse-thumbnail-file', 'parse-actors', 'add-tag', 'remove-tag'],
  setup(props, { emit }) {
    const localFormData = ref({ ...props.formData })
    const localActorsInput = ref(props.actorsInput)
    const localTagsInput = ref(props.tagsInput)

    watch(() => props.formData, (newVal) => {
      localFormData.value = { ...newVal }
    }, { deep: true })

    watch(() => props.actorsInput, (newVal) => {
      localActorsInput.value = newVal
    })

    watch(() => props.tagsInput, (newVal) => {
      localTagsInput.value = newVal
    })

    watch(localFormData, (newVal) => {
      emit('update:formData', { ...newVal })
    }, { deep: true })

    watch(localActorsInput, (newVal) => {
      emit('update:actorsInput', newVal)
    })

    watch(localTagsInput, (newVal) => {
      emit('update:tagsInput', newVal)
    })

    const canSubmit = computed(() => {
      return localFormData.value.folderPath && localFormData.value.folderPath.trim()
    })

    const handleClose = () => {
      emit('update:visible', false)
      emit('close')
    }

    const handleSubmit = () => {
      if (canSubmit.value) {
        emit('submit', { ...props.formData })
      }
    }

    const parseActors = () => {
      emit('parse-actors')
    }

    const addTag = () => {
      emit('add-tag')
    }

    const removeTag = (index: number) => {
      emit('remove-tag', index)
    }

    const handleBrowseFolder = () => {
      emit('browse-folder')
    }

    const handleSelectFromCovers = () => {
      emit('select-from-covers')
    }

    const handleBrowseThumbnailFile = () => {
      emit('browse-thumbnail-file')
    }

    return {
      localFormData,
      localActorsInput,
      localTagsInput,
      canSubmit,
      handleClose,
      handleSubmit,
      parseActors,
      addTag,
      removeTag,
      handleBrowseFolder,
      handleSelectFromCovers,
      handleBrowseThumbnailFile
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
  z-index: 1000;
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

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary, #333);
}

.file-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.file-input-group input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 4px;
  font-size: 14px;
}

.btn-select-file {
  padding: 8px 16px;
  border: 1px solid var(--border-color, #e0e0e0);
  background: var(--bg-secondary, #f5f5f5);
  color: var(--text-primary, #333);
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-select-file:hover:not(:disabled) {
  background: var(--bg-hover, #e0e0e0);
}

.btn-select-file:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.thumb-preview-wrapper {
  margin-top: 12px;
}

.thumb-preview {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.thumb-placeholder {
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary, #999);
  border: 1px dashed var(--border-color, #e0e0e0);
  border-radius: 4px;
}
</style>

