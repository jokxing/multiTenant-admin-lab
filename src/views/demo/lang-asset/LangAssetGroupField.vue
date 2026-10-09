<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DEMO_ASSET_OPTIONS, findDemoAsset } from './demoAssets';
import {
  LANG_OPTIONS,
  cloneLangAssetGroup,
  type LangAssetFieldError,
  type LangAssetGroupValue,
  type LangCode
} from './types';

const props = withDefaults(
  defineProps<{
    modelValue?: LangAssetGroupValue | null;
    primaryLang?: LangCode;
    languages?: LangCode[];
    errors?: LangAssetFieldError;
    disabled?: boolean;
  }>(),
  {
    modelValue: null,
    primaryLang: 'zh-CN',
    languages: () => ['zh-CN', 'zh-TW', 'en'],
    errors: () => ({}),
    disabled: false
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: LangAssetGroupValue];
  change: [value: LangAssetGroupValue];
}>();

const activeLang = ref<LangCode>(props.primaryLang);
const innerValue = ref<LangAssetGroupValue>(cloneLangAssetGroup(props.modelValue));

watch(
  () => props.modelValue,
  value => {
    innerValue.value = cloneLangAssetGroup(value);
  },
  { deep: true }
);

watch(
  () => [props.primaryLang, ...props.languages],
  () => {
    if (!props.languages.includes(activeLang.value)) activeLang.value = props.languages[0] || props.primaryLang;
  },
  { immediate: true }
);

watch(() => props.errors, errors => {
  const firstInvalid = props.languages.find(code => Object.keys(errors).some(key => key.startsWith(`${code}.`)));
  if (firstInvalid) activeLang.value = firstInvalid;
}, { immediate: true });

const visibleLangs = computed(() =>
  LANG_OPTIONS.filter(item => props.languages.includes(item.code)).map(item => ({
    ...item,
    isPrimary: item.code === props.primaryLang
  }))
);

const currentEntry = computed(() => innerValue.value[activeLang.value]);

function commit(next: LangAssetGroupValue) {
  // 仅通过事件向外传递克隆值，不直接改写外部共享对象。
  const cloned = cloneLangAssetGroup(next);
  innerValue.value = cloned;
  emit('update:modelValue', cloned);
  emit('change', cloned);
}

function patchCurrent(partial: Partial<(typeof innerValue.value)[LangCode]>) {
  const next = cloneLangAssetGroup(innerValue.value);
  next[activeLang.value] = { ...next[activeLang.value], ...partial };
  commit(next);
}

function fieldError(field: 'title' | 'description' | 'assetId') {
  return props.errors[`${activeLang.value}.${field}`] || '';
}

function selectAsset(assetId: string) {
  if (props.disabled) return;
  patchCurrent({ assetId: currentEntry.value.assetId === assetId ? null : assetId });
}

</script>

<template>
  <div class="lang-asset-group" :class="{ disabled }">
    <NRadioGroup v-model:value="activeLang" size="small">
      <NRadioButton v-for="lang in visibleLangs" :key="lang.code" :value="lang.code">
        {{ lang.label }}
        <NTag v-if="lang.isPrimary" size="tiny" type="info" :bordered="false">主</NTag>
      </NRadioButton>
    </NRadioGroup>

    <div class="lang-panel">
      <NFormItem
        label="标题"
        :required="activeLang === primaryLang"
        :validation-status="fieldError('title') ? 'error' : undefined"
        :feedback="fieldError('title')"
      >
        <NInput
          :value="currentEntry.title"
          :disabled="disabled"
          placeholder="请输入标题"
          @update:value="value => patchCurrent({ title: value })"
        />
      </NFormItem>

      <NFormItem
        label="说明"
        :validation-status="fieldError('description') ? 'error' : undefined"
        :feedback="fieldError('description')"
      >
        <NInput
          :value="currentEntry.description"
          :disabled="disabled"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 4 }"
          placeholder="可选说明，最多 120 字"
          @update:value="value => patchCurrent({ description: value })"
        />
      </NFormItem>

      <NFormItem
        label="素材选择"
        :validation-status="fieldError('assetId') ? 'error' : undefined"
        :feedback="fieldError('assetId')"
      >
        <div class="asset-selection">
          <div class="asset-grid">
            <button
              v-for="asset in DEMO_ASSET_OPTIONS"
              :key="asset.id"
              type="button"
              class="asset-card"
              :class="{ selected: currentEntry.assetId === asset.id }"
              :disabled="disabled"
              @click="selectAsset(asset.id)"
            >
              <img :src="asset.preview" :alt="asset.label" />
              <span>{{ asset.label }}</span>
            </button>
          </div>
          <NText v-if="findDemoAsset(currentEntry.assetId)" depth="3" class="asset-hint">
            已选：{{ findDemoAsset(currentEntry.assetId)?.label }}
          </NText>
        </div>
      </NFormItem>
    </div>
  </div>
</template>

<style scoped lang="scss">
.lang-asset-group {
  width: 100%;

  &.disabled {
    opacity: 0.72;
  }
}

.lang-asset-group :deep(.n-radio-button) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.lang-panel {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e6e8f0;
  border-radius: 8px;
  background: #fafbff;
}

.asset-selection {
  width: 100%;
  min-width: 0;
}

.asset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

.asset-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border: 1px solid #d7dbe7;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;

  img {
    width: 100%;
    height: 72px;
    object-fit: cover;
    border-radius: 6px;
  }

  span {
    font-size: 12px;
    color: #4e5969;
  }

  &.selected {
    border-color: #2080f0;
    box-shadow: 0 0 0 1px #2080f0 inset;
  }

  &:disabled {
    cursor: not-allowed;
  }
}

.asset-hint {
  display: block;
  margin-top: 8px;
}

@media (max-width: 700px) {
  .asset-grid {
    grid-template-columns: 1fr;
  }
}
</style>
