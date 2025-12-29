<template>
  <div v-if="visible" class="modal-overlay" @mousedown="handleOverlayMouseDown">
    <div class="modal-content" @mousedown.stop>
      <div class="modal-header">
        <h3>{{ getTitle() }}</h3>
        <button class="modal-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField
          :label="mode === 'add' ? (singleImageOnly ? '图片名称 (可选)' : '漫画名称 (可选)') : '名称'"
          type="text"
          v-model="formData.name"
          :placeholder="mode === 'add' ? (singleImageOnly ? '留空将自动从文件名提取' : '留空将自动从文件夹名提取') : '输入名称'"
        />
        <FormField
          :label="mode === 'add' ? '作者 (可选)' : '作者'"
          type="text"
          v-model="formData.author"
          placeholder="输入作者名称"
        />
        <FormField
          :label="mode === 'add' ? (singleImageOnly ? '图片简介 (可选)' : '漫画简介 (可选)') : (singleImageOnly ? '图片简介' : '漫画简介')"
          type="textarea"
          v-model="formData.description"
          placeholder="输入简介或描述..."
          :rows="3"
        />
        <FormField
          :label="mode === 'add' ? (singleImageOnly ? '图片标签 (可选)' : '漫画标签 (可选)') : (singleImageOnly ? '图片标签' : '漫画标签')"
          type="tags"
          v-model="formData.tags"
          v-model:tagInput="localTagInput"
          @add-tag="handleAddTag"
          @remove-tag="handleRemoveTag"
        />
        <!-- 添加模式：选择添加类型（文件夹或单个图片） -->
        <div v-if="mode === 'add' && allowSingleImage && !singleImageOnly" class="add-type-selector">
          <label class="add-type-label">添加类型：</label>
          <div class="add-type-options">
            <label class="add-type-option">
              <input 
                type="radio" 
                value="folder" 
                v-model="addType"
                @change="handleAddTypeChange"
              />
              <span>文件夹</span>
            </label>
            <label class="add-type-option">
              <input 
                type="radio" 
                value="single" 
                v-model="addType"
                @change="handleAddTypeChange"
              />
              <span>单个图片</span>
            </label>
          </div>
        </div>
        <FormField
          :label="(singleImageOnly || (addType === 'single' && mode === 'add' && allowSingleImage)) ? '图片文件' : '漫画文件夹'"
          type="file"
          v-model="formData.folderPath"
          :placeholder="(singleImageOnly || (addType === 'single' && mode === 'add' && allowSingleImage)) ? '选择图片文件' : '选择漫画文件夹'"
          @browse="handleBrowseFolder"
        />
        <!-- 封面选择器 - 单图模式下隐藏，因为图片本身就是封面 -->
        <CoverSelector
          v-if="!singleImageOnly"
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
    },
    allowSingleImage: {
      type: Boolean,
      default: false
    },
    singleImageOnly: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:visible', 'update:formData', 'update:cover', 'update:tagInput', 'submit', 'close', 'browse-folder', 'browse-image-file', 'add-tag', 'remove-tag'],
  setup(props, { emit }) {
    const localTagInput = ref(props.tagInput)
    const addType = ref<'folder' | 'single'>(props.singleImageOnly ? 'single' : 'folder')

    // 监听 visible 变化
    watch(() => props.visible, () => {
      // visible 变化时的处理逻辑
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
      emit('update:visible', false)
      emit('close')
    }

    /**
     * 处理 overlay 区域的 mousedown 事件
     * 使用 mousedown 而不是 click，避免在复制文字时（鼠标在外部区域释放）误关闭
     * 这样只有在外部区域按下鼠标时才会关闭，符合常见软件的交互习惯
     */
    const handleOverlayMouseDown = (event: MouseEvent) => {
      // 只在 overlay 背景上按下鼠标时才关闭（不是 content 区域）
      // event.target 是 overlay 本身，而不是 content
      if (event.target === event.currentTarget) {
        handleClose()
      }
    }

    const handleSubmit = () => {
      if (canSubmit.value) {
        emit('submit', { ...props.formData, cover: props.cover })
      }
    }

    const handleAddTypeChange = () => {
      // 切换类型时清空路径
      emit('update:formData', { ...props.formData, folderPath: '' })
    }

    const handleBrowseFolder = () => {
      if (props.singleImageOnly || (addType.value === 'single' && props.mode === 'add' && props.allowSingleImage)) {
        emit('browse-image-file')
      } else {
        emit('browse-folder')
      }
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

    const getTitle = () => {
      if (props.mode === 'add') {
        return props.singleImageOnly ? '添加图片' : '添加漫画'
      } else {
        return props.singleImageOnly ? '编辑图片' : '编辑漫画'
      }
    }

    return {
      localTagInput,
      addType,
      canSubmit,
      handleClose,
      handleOverlayMouseDown,
      handleSubmit,
      handleAddTypeChange,
      handleBrowseFolder,
      handleAddTag,
      handleRemoveTag,
      handleUseFirstImage,
      handleSelectFromFolder,
      handleBrowseImage,
      handleClearCover,
      getTitle
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

.add-type-selector {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-tertiary, #f9f9f9);
  border-radius: 8px;
  border: 1px solid var(--border-color, #e0e0e0);
}

.add-type-label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: var(--text-primary, #333);
  font-size: 14px;
}

.add-type-options {
  display: flex;
  gap: 20px;
}

.add-type-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.add-type-option input[type="radio"] {
  cursor: pointer;
}

.add-type-option span {
  color: var(--text-primary, #333);
  font-size: 14px;
}
</style>

