<script setup lang="ts">
import { computed } from 'vue';
import { componentOptions } from '../constants';
import type { FieldType, FormField } from '../types';

const props = defineProps<{
  formSchema: FormField[];
  selectedIndex: number;
  selectedField?: FormField;
  typeOptions: Array<{ label: string; value: FieldType }>;
  addField: (type: FieldType) => void;
  moveField: (index: number, offset: -1 | 1) => void;
  removeField: (index: number) => void;
  resetFormSchema: () => void;
  openRuleModal: () => void;
  updateOptions: (text: string) => void;
}>();

const emit = defineEmits<{
  'update:selectedIndex': [value: number];
}>();

const typeLabelMap = computed(() => new Map(props.typeOptions.map(item => [item.value, item.label])));

function selectField(index: number) {
  emit('update:selectedIndex', index);
}
</script>

<template>
  <div class="designer">
    <aside class="palette">
      <h3>组件库</h3>
      <button
        v-for="item in componentOptions"
        :key="item.type"
        class="component-button"
        type="button"
        @click="addField(item.type)"
      >
        <SvgIcon :icon="item.icon" />
        <span>{{ item.label }}</span>
        <SvgIcon icon="mdi:plus" />
      </button>
    </aside>

    <section class="canvas">
      <div class="canvas-heading">
        <div>
          <h3>表单画布</h3>
          <span>{{ formSchema.length }} 个字段</span>
        </div>
        <NButton size="small" @click="resetFormSchema">恢复默认</NButton>
      </div>
      <div class="field-grid">
        <div
          v-for="(field, index) in formSchema"
          :key="field.field"
          class="field-row"
          :class="{ selected: selectedIndex === index, wide: field.span === 2 }"
          @click="selectField(index)"
        >
          <SvgIcon icon="mdi:drag" class="drag-icon" />
          <div class="field-summary">
            <strong>{{ field.label }}</strong>
            <span>{{ field.field }} · {{ typeLabelMap.get(field.type) }}</span>
          </div>
          <NTag v-if="field.required" size="small" type="error" :bordered="false">必填</NTag>
          <NButton quaternary circle size="small" title="上移" @click.stop="moveField(index, -1)">
            <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
          </NButton>
          <NButton quaternary circle size="small" title="下移" @click.stop="moveField(index, 1)">
            <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
          </NButton>
          <NButton quaternary circle size="small" type="error" title="删除" @click.stop="removeField(index)">
            <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
          </NButton>
        </div>
      </div>
    </section>

    <aside v-if="selectedField" class="inspector">
      <div class="inspector-heading">
        <h3>字段属性 · {{ selectedField.label }}</h3>
        <NButton text type="primary" @click="openRuleModal">规则配置</NButton>
      </div>
      <NForm label-placement="top" size="small">
        <NFormItem label="标题"><NInput v-model:value="selectedField.label" /></NFormItem>
        <NFormItem label="字段名"><NInput v-model:value="selectedField.field" /></NFormItem>
        <NFormItem label="组件类型">
          <NSelect v-model:value="selectedField.type" :options="typeOptions" />
        </NFormItem>
        <NFormItem label="占用列数">
          <NRadioGroup v-model:value="selectedField.span">
            <NRadioButton :value="1">1 列</NRadioButton>
            <NRadioButton :value="2">2 列</NRadioButton>
          </NRadioGroup>
        </NFormItem>
        <NFormItem label="提示文字"><NInput v-model:value="selectedField.placeholder" /></NFormItem>
        <NFormItem v-if="selectedField.type === 'select'" label="选项（每行一项）">
          <NInput
            type="textarea"
            :value="selectedField.options?.map(item => item.label).join('\n')"
            @update:value="updateOptions"
          />
        </NFormItem>
        <template v-if="selectedField.type === 'lang-asset-group'">
          <NFormItem label="主语言">
            <NSelect
              v-model:value="selectedField.primaryLang"
              :options="[
                { label: '简体中文', value: 'zh-CN' },
                { label: '繁体中文', value: 'zh-TW' },
                { label: 'English', value: 'en' }
              ]"
            />
          </NFormItem>
          <NAlert type="info" :bordered="false">
            运行时渲染可复用多语言素材组组件：标题 / 说明 / 本地素材选择，切换语言保留输入。
          </NAlert>
        </template>
      </NForm>
    </aside>
  </div>
</template>

<style scoped>
.designer {
  display: block;
  min-height: 0;
  margin-top: 0;
  border: 1px solid rgb(var(--border-color));
}

.palette {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px;
  padding: 14px;
  border: 1px solid rgba(128, 128, 128, 0.24);
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.045);
}

.palette h3,
.canvas h3,
.inspector h3 {
  margin: 0;
  font-size: 15px;
  letter-spacing: 0;
}

.palette h3 {
  grid-column: 1 / -1;
  margin-bottom: 4px;
}

.component-button {
  display: grid;
  grid-template-columns: 22px 1fr 18px;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  border: 1px solid rgba(128, 128, 128, 0.26);
  border-radius: 6px;
  background: var(--card-color, #fff);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.component-button:hover {
  border-color: rgb(var(--primary-color));
  color: rgb(var(--primary-color));
}

.canvas {
  margin: 0 12px;
  padding: 14px;
  border: 1px solid rgba(128, 128, 128, 0.24);
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.025);
}

.canvas-heading,
.inspector-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.canvas-heading span {
  color: rgb(var(--text-color-3));
  font-size: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-top: 16px;
}

.field-row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto 28px 28px 28px;
  align-items: center;
  gap: 6px;
  padding: 11px;
  border: 1px solid rgba(128, 128, 128, 0.24);
  border-radius: 6px;
  background: var(--card-color, #fff);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.field-row:hover {
  border-color: rgba(99, 102, 241, 0.55);
  background: rgba(99, 102, 241, 0.035);
}

.field-row.selected {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.09);
  box-shadow:
    inset 3px 0 #6366f1,
    0 0 0 1px rgba(99, 102, 241, 0.08);
}

.field-row.selected .field-summary strong {
  color: #5558e8;
}

.drag-icon {
  color: rgb(var(--text-color-3));
}

.field-summary {
  display: grid;
  min-width: 0;
}

.field-summary span {
  overflow: hidden;
  color: rgb(var(--text-color-3));
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inspector {
  margin: 12px;
  padding: 14px;
  border: 1px solid rgba(99, 102, 241, 0.28);
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.035);
}
</style>
