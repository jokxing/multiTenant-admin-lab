<script setup lang="ts">
import { computed } from 'vue';
import LangAssetGroupField from '../../lang-asset/LangAssetGroupField.vue';
import type { LangAssetGroupValue } from '../../lang-asset/types';
import type { FormField } from '../types';

const props = defineProps<{
  formModel: Record<string, any>;
  formErrors: Record<string, string>;
  visibleFields: FormField[];
  submitForm: () => void | Promise<boolean | void>;
  formSubmitting?: boolean;
  formSaveError?: string;
  hasLangAssetGroup?: boolean;
  failNextSave?: boolean;
  setFailNext?: (enabled: boolean) => void;
}>();

const failNextModel = computed({
  get: () => Boolean(props.failNextSave),
  set: value => props.setFailNext?.(value)
});

function langErrors(field: FormField) {
  const prefix = `${field.field}.`;
  // 每个组只接收自身的 language.field 错误。
  const mapped: Record<string, string> = {};
  Object.entries(props.formErrors).forEach(([key, message]) => {
    if (key.startsWith(prefix)) mapped[key.slice(prefix.length)] = message;
  });
  return mapped;
}

function onLangUpdate(field: FormField, value: LangAssetGroupValue) {
  props.formModel[field.field] = value;
}
</script>

<template>
  <NCard title="动态表单预览" size="small" class="preview-card">
    <NSpace v-if="hasLangAssetGroup" align="center" class="preview-toolbar">
      <NText depth="3">下次保存失败</NText>
      <NSwitch v-model:value="failNextModel" size="small" />
      <NTag v-if="formSubmitting" type="warning" :bordered="false">提交中</NTag>
    </NSpace>
    <NAlert v-if="formSaveError" type="error" :bordered="false" class="preview-alert">
      {{ formSaveError }}
    </NAlert>
    <NForm class="preview-form" label-placement="top" :model="formModel">
      <div class="preview-grid">
        <NFormItem
          v-for="field in visibleFields"
          :key="field.field"
          :class="{ wide: field.span === 2 || field.type === 'lang-asset-group' }"
          :label="field.label"
          :required="field.required"
          :validation-status="formErrors[field.field] ? 'error' : undefined"
          :feedback="formErrors[field.field]"
        >
          <LangAssetGroupField
            v-if="field.type === 'lang-asset-group'"
            :model-value="formModel[field.field]"
            :primary-lang="field.primaryLang || 'zh-CN'"
            :languages="field.languages || ['zh-CN', 'zh-TW', 'en']"
            :errors="langErrors(field)"
            :disabled="formSubmitting"
            @update:model-value="value => onLangUpdate(field, value)"
          />
          <NInput
            v-else-if="field.type === 'input' || field.type === 'textarea'"
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
      <NButton type="primary" :loading="formSubmitting" @click="submitForm">
        {{ hasLangAssetGroup ? '校验并保存素材组' : '校验并生成配置' }}
      </NButton>
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

.preview-toolbar {
  margin-bottom: 12px;
}

.preview-alert {
  margin-bottom: 12px;
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
