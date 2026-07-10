<script setup lang="ts">
import type { FormField } from '../types';

defineProps<{
  formModel: Record<string, any>;
  formErrors: Record<string, string>;
  visibleFields: FormField[];
  submitForm: () => void;
}>();
</script>

<template>
  <NCard title="动态表单预览" size="small" class="preview-card">
    <NForm class="preview-form" label-placement="top" :model="formModel">
      <div class="preview-grid">
        <NFormItem
          v-for="field in visibleFields"
          :key="field.field"
          :class="{ wide: field.span === 2 }"
          :label="field.label"
          :required="field.required"
          :validation-status="formErrors[field.field] ? 'error' : undefined"
          :feedback="formErrors[field.field]"
        >
          <NInput
            v-if="field.type === 'input' || field.type === 'textarea'"
            v-model:value="formModel[field.field]"
            :type="field.type === 'textarea' ? 'textarea' : 'text'"
            :placeholder="field.placeholder"
          />
          <NSelect
            v-else-if="field.type === 'select'"
            v-model:value="formModel[field.field]"
            :options="field.options || []"
          />
          <NInputNumber
            v-else-if="field.type === 'number'"
            v-model:value="formModel[field.field]"
            :min="field.min"
            :max="field.max"
            class="w-full"
          />
          <NDatePicker
            v-else-if="field.type === 'date'"
            v-model:formatted-value="formModel[field.field]"
            value-format="yyyy-MM-dd"
            type="date"
            class="w-full"
          />
          <NSwitch v-else v-model:value="formModel[field.field]" />
        </NFormItem>
      </div>
      <NButton type="primary" @click="submitForm">校验并生成配置</NButton>
    </NForm>
  </NCard>
</template>

<style scoped>
.preview-card {
  position: sticky;
  top: 16px;
  min-height: 460px;
  margin-top: 0;
}

.preview-form {
  max-width: 760px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.preview-grid .wide {
  grid-column: 1/-1;
}
</style>
