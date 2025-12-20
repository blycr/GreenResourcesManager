<template>
  <div v-if="visible" class="modal-overlay" @click="handleClose">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3>{{ mode === 'add' ? '添加视频' : '编辑视频' }}</h3>
        <button class="modal-close" @click="handleClose">✕</button>
      </div>
      <div class="modal-body">
        <FormField
          :label="mode === 'add' ? '视频名称 (可选)' : '名称'"
          type="text"
          v-model="localFormData.name"
          :placeholder="mode === 'add' ? '未填写将自动使用文件名' : '输入视频名称'"
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
          placeholder="视频描述..."
          :rows="3"
        />

        <FormField
          label="视频文件"
          type="file"
          v-model="localFormData.filePath"
          :placeholder="mode === 'add' ? '选择视频文件...' : '选择视频文件'"
          @browse="handleBrowseVideoFile"
        />

        <div class="form-group">
          <label>缩略图</label>
          <div class="file-input-group">
            <input type="text" v-model="localFormData.thumbnail" readonly>
            <button type="button" class="btn-select-file" @click="handleBrowseThumbnailFile">选择图片</button>
            <button 
              type="button" 
              class="btn-select-file" 
              @click="handleRandomizeThumbnail"
              :disabled="!localFormData.filePath"
            >
              随机封面
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

        <div class="form-group">
          <label>时长 (分钟)</label>
          <input type="number" v-model.number="localFormData.duration" min="0">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" @click="handleClose" class="btn btn-cancel">取消</button>
        <button 
          type="button" 
          @click="handleSubmit" 
          class="btn btn-confirm"
          :disabled="!canSubmit"
        >
          {{ mode === 'add' ? '添加视频' : '保存' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { ref, computed, watch } from 'vue'
import FormField from '../FormField.vue'
import type { VideoForm } from '../../types/video'

export default {
  name: 'VideoFormDialog',
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
      type: Object as () => VideoForm,
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
    },
    extractVideoName: {
      type: Function,
      required: true
    },
    getVideoDuration: {
      type: Function,
      required: true
    },
    generateThumbnail: {
      type: Function,
      required: true
    }
  },
  emits: ['update:visible', 'update:formData', 'update:actorsInput', 'update:tagsInput', 'submit', 'close', 'browse-video-file', 'browse-thumbnail-file', 'randomize-thumbnail', 'parse-actors', 'add-tag', 'remove-tag'],
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
      if (props.mode === 'add') {
        return localFormData.value.filePath && localFormData.value.filePath.trim()
      }
      return localFormData.value.name && localFormData.value.name.trim()
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

    const handleBrowseVideoFile = () => {
      emit('browse-video-file')
    }

    const handleBrowseThumbnailFile = () => {
      emit('browse-thumbnail-file')
    }

    const handleRandomizeThumbnail = () => {
      emit('randomize-thumbnail')
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
      handleBrowseVideoFile,
      handleBrowseThumbnailFile,
      handleRandomizeThumbnail
    }
  }
}
</script>

<style scoped>
/* 
  注意：以下样式已移至共享样式文件，可以直接使用：
  - .modal-overlay, .modal-content, .modal-header, .modal-body, .modal-footer, .modal-close (在 styles/components/modal.css)
  - .btn, .btn-cancel, .btn-confirm, .btn-select-file (在 styles/components/button.css)
  - .form-group, .file-input-group (在 styles/components/form.css)
  - .thumb-preview-wrapper, .thumb-preview, .thumb-placeholder (在 styles/components/form.css)
  
  这里只保留组件特定的样式
*/

/* 组件特定样式（如果有的话） */
</style>

