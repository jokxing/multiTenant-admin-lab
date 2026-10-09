<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { PageColumn, TableAction } from '../../shared';
import type { SearchField } from '../types';

const props = defineProps<{
  mode: 'columns' | 'search' | 'actions' | 'action-form';
  pageColumns: PageColumn[];
  searchSchema: SearchField[];
  configuredActions: TableAction[];
  formActions: TableAction[];
  selectedColumnIndex: number;
  selectedSearchIndex: number;
  selectedActionIndex: number;
  selectedActionFieldIndex: number;
  selectedActionKey: string;
  addTableColumn: () => void;
  moveTableColumn: (index: number, offset: -1 | 1) => void;
  removeTableColumn: (index: number) => void;
  updateColumnType: (value: 'text' | 'tag' | 'amount' | 'sortable') => void;
  updateColumnTagOptions: (text: string) => void;
  addSearchField: (type: SearchField['type']) => void;
  moveSearchField: (index: number, offset: -1 | 1) => void;
  removeSearchField: (index: number) => void;
  updateSearchOptions: (text: string) => void;
  addTableAction: () => void;
  moveTableAction: (index: number, offset: -1 | 1) => void;
  removeTableAction: (index: number) => void;
  updateActionMode: (mode: TableAction['mode']) => void;
  addActionField: (type: 'input' | 'number' | 'select') => void;
  moveActionField: (index: number, offset: -1 | 1) => void;
  removeActionField: (index: number) => void;
  updateActionOptions: (text: string) => void;
}>();

const emit = defineEmits<{
  'update:mode': [value: 'columns' | 'search' | 'actions' | 'action-form'];
  'update:selectedColumnIndex': [value: number];
  'update:selectedSearchIndex': [value: number];
  'update:selectedActionIndex': [value: number];
  'update:selectedActionFieldIndex': [value: number];
  'update:selectedActionKey': [value: string];
}>();

const activeMode = computed({
  get: () => props.mode,
  set: value => emit('update:mode', value)
});
const activeActionKey = computed({
  get: () => props.selectedActionKey,
  set: value => emit('update:selectedActionKey', value)
});
const selectedColumn = computed(() => props.pageColumns[props.selectedColumnIndex]);
const selectedSearchField = computed(() => props.searchSchema[props.selectedSearchIndex]);
const selectedAction = computed(() => props.configuredActions[props.selectedActionIndex]);
const selectedTableAction = computed(
  () => props.formActions.find(action => action.key === props.selectedActionKey) || props.formActions[0]
);
const selectedActionField = computed(() => selectedTableAction.value?.formSchema?.[props.selectedActionFieldIndex]);
const enumOptionsText = ref('');

watch(
  () => `${selectedColumn.value?.key || ''}-${selectedColumn.value?.type || ''}`,
  () => {
    enumOptionsText.value = formatColumnOptionsText();
  },
  { immediate: true }
);

function selectActionForm(action: TableAction) {
  emit('update:selectedActionKey', action.key);
  emit('update:mode', 'action-form');
}

function formatColumnOptionsText() {
  return (
    selectedColumn.value?.options?.map(item => `${item.label}=${item.value}=${item.type || 'default'}`).join('\n') || ''
  );
}

function handleColumnOptionsUpdate(value: string) {
  enumOptionsText.value = value;
  props.updateColumnTagOptions(value);
}
</script>

<template>
  <div class="action-designer">
    <NRadioGroup v-model:value="activeMode" size="small" class="visual-section-switch">
      <NRadioButton value="columns">列配置</NRadioButton>
      <NRadioButton value="search">搜索表单</NRadioButton>
      <NRadioButton value="actions">操作按钮</NRadioButton>
      <NRadioButton value="action-form">操作表单</NRadioButton>
    </NRadioGroup>

    <template v-if="activeMode === 'columns'">
      <NButton dashed block @click="addTableColumn">
        <template #icon><SvgIcon icon="mdi:table-column-plus-after" /></template>
        新增列
      </NButton>
      <div class="action-field-list">
        <div
          v-for="(column, index) in pageColumns"
          :key="column.key"
          class="action-field-item"
          :class="{ selected: selectedColumnIndex === index }"
          @click="emit('update:selectedColumnIndex', index)"
        >
          <div>
            <strong>{{ column.title }}</strong>
            <span>{{ column.key }} · {{ column.type || 'text' }}</span>
          </div>
          <NButton quaternary circle size="tiny" title="左移" @click.stop="moveTableColumn(index, -1)">
            <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" title="右移" @click.stop="moveTableColumn(index, 1)">
            <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
          </NButton>
          <NButton
            quaternary
            circle
            size="tiny"
            type="error"
            title="删除"
            :disabled="column.type === 'action'"
            @click.stop="removeTableColumn(index)"
          >
            <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
          </NButton>
        </div>
      </div>
      <NForm v-if="selectedColumn" label-placement="top" size="small" class="action-property">
        <div class="property-heading">列配置 · {{ selectedColumn.title }}</div>
        <NGrid :cols="2" :x-gap="10">
          <NFormItemGi label="列标题"><NInput v-model:value="selectedColumn.title" /></NFormItemGi>
          <NFormItemGi label="字段名"><NInput v-model:value="selectedColumn.key" /></NFormItemGi>
          <NFormItemGi :span="2" label="渲染类型">
            <NSelect
              :value="selectedColumn.type || 'text'"
              :disabled="selectedColumn.type === 'action'"
              :options="[
                { label: '文本', value: 'text' },
                { label: '状态标签', value: 'tag' },
                { label: '金额', value: 'amount' },
                { label: '列表排序', value: 'sortable' }
              ]"
              @update:value="updateColumnType"
            />
          </NFormItemGi>
          <NFormItemGi v-if="selectedColumn.type === 'tag'" :span="2" label="状态枚举映射">
            <div class="enum-editor">
              <NInput
                type="textarea"
                :autosize="{ minRows: 4, maxRows: 8 }"
                :value="enumOptionsText"
                placeholder="每行：名称=后端值=标签样式，例如 拒绝=4=error"
                @update:value="handleColumnOptionsUpdate"
              />
              <div class="enum-preview">
                <span>预览</span>
                <NTag
                  v-for="item in selectedColumn.options"
                  :key="`${item.label}-${item.value}`"
                  size="small"
                  :type="item.type || 'default'"
                >
                  {{ item.label }}: {{ item.value }}
                </NTag>
              </div>
              <p>支持 default / info / success / warning / error。后端只改枚举值时，更新这里并发布配置即可。</p>
            </div>
          </NFormItemGi>
        </NGrid>
      </NForm>
    </template>

    <template v-else-if="activeMode === 'search'">
      <div class="action-component-grid two-columns">
        <NButton dashed @click="addSearchField('input')">
          <template #icon><SvgIcon icon="mdi:form-textbox" /></template>
          输入框
        </NButton>
        <NButton dashed @click="addSearchField('select')">
          <template #icon><SvgIcon icon="mdi:form-dropdown" /></template>
          下拉筛选
        </NButton>
        <NButton dashed @click="addSearchField('date-range')">
          <template #icon><SvgIcon icon="mdi:calendar-range" /></template>
          日期范围
        </NButton>
        <NButton dashed @click="addSearchField('number-range')">
          <template #icon><SvgIcon icon="mdi:tune-variant" /></template>
          数值范围
        </NButton>
      </div>
      <div class="action-field-list">
        <div
          v-for="(field, index) in searchSchema"
          :key="field.key"
          class="action-field-item"
          :class="{ selected: selectedSearchIndex === index }"
          @click="emit('update:selectedSearchIndex', index)"
        >
          <div>
            <strong>{{ field.label }}</strong>
            <span>{{ field.key }} · {{ field.type }}</span>
          </div>
          <NButton quaternary circle size="tiny" title="前移" @click.stop="moveSearchField(index, -1)">
            <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" title="后移" @click.stop="moveSearchField(index, 1)">
            <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" type="error" title="删除" @click.stop="removeSearchField(index)">
            <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
          </NButton>
        </div>
      </div>
      <NForm v-if="selectedSearchField" label-placement="top" size="small" class="action-property">
        <div class="property-heading">搜索项配置 · {{ selectedSearchField.label }}</div>
        <NGrid :cols="2" :x-gap="10">
          <NFormItemGi label="标题"><NInput v-model:value="selectedSearchField.label" /></NFormItemGi>
          <NFormItemGi label="字段名"><NInput v-model:value="selectedSearchField.key" /></NFormItemGi>
          <NFormItemGi label="组件">
            <NSelect
              v-model:value="selectedSearchField.type"
              :options="[
                { label: '输入框', value: 'input' },
                { label: '下拉筛选', value: 'select' },
                { label: '日期范围', value: 'date-range' },
                { label: '数值范围', value: 'number-range' }
              ]"
            />
          </NFormItemGi>
          <NFormItemGi label="占位文字"><NInput v-model:value="selectedSearchField.placeholder" /></NFormItemGi>
          <NFormItemGi
            v-if="selectedSearchField.type === 'date-range' || selectedSearchField.type === 'number-range'"
            :span="2"
            label="筛选目标字段"
          >
            <NSelect
              v-model:value="selectedSearchField.targetKey"
              :options="
                pageColumns
                  .filter(column => column.type !== 'action')
                  .map(column => ({ label: column.title, value: column.key }))
              "
            />
          </NFormItemGi>
          <NFormItemGi v-if="selectedSearchField.type === 'select'" :span="2" label="选项（每行一项）">
            <NInput
              type="textarea"
              :value="selectedSearchField.options?.map(item => item.label).join('\n')"
              @update:value="updateSearchOptions"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </template>

    <template v-else-if="activeMode === 'actions'">
      <NButton dashed block @click="addTableAction">
        <template #icon><SvgIcon icon="mdi:button-cursor" /></template>
        新增操作按钮
      </NButton>
      <div class="action-field-list">
        <div
          v-for="(action, index) in configuredActions"
          :key="action.key"
          class="action-field-item"
          :class="{ selected: selectedActionIndex === index }"
          @click="emit('update:selectedActionIndex', index)"
        >
          <div>
            <strong>{{ action.label }}</strong>
            <span>{{ action.key }} · {{ action.mode }}</span>
          </div>
          <NButton quaternary circle size="tiny" title="左移" @click.stop="moveTableAction(index, -1)">
            <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" title="右移" @click.stop="moveTableAction(index, 1)">
            <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" type="error" title="删除" @click.stop="removeTableAction(index)">
            <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
          </NButton>
        </div>
      </div>
      <NForm v-if="selectedAction" label-placement="top" size="small" class="action-property">
        <div class="property-heading">按钮配置 · {{ selectedAction.label }}</div>
        <NGrid :cols="2" :x-gap="10">
          <NFormItemGi label="按钮名称"><NInput v-model:value="selectedAction.label" /></NFormItemGi>
          <NFormItemGi label="动作标识"><NInput v-model:value="selectedAction.key" /></NFormItemGi>
          <NFormItemGi label="执行模式">
            <NSelect
              :value="selectedAction.mode"
              :options="[
                { label: '表单', value: 'form' },
                { label: '确认操作', value: 'confirm' },
                { label: '自定义 Slot', value: 'slot' }
              ]"
              @update:value="updateActionMode"
            />
          </NFormItemGi>
          <NFormItemGi label="按钮样式">
            <NSelect
              v-model:value="selectedAction.type"
              :options="[
                { label: '默认', value: 'default' },
                { label: '主要', value: 'primary' },
                { label: '危险', value: 'error' }
              ]"
            />
          </NFormItemGi>
          <NFormItemGi label="权限标识">
            <NInput v-model:value="selectedAction.permission" placeholder="留空则不鉴权" />
          </NFormItemGi>
          <NFormItemGi v-if="selectedAction.mode === 'slot'" label="Slot 名称">
            <NInput v-model:value="selectedAction.slot" placeholder="例如 detail-panel" />
          </NFormItemGi>
          <NFormItemGi v-if="selectedAction.mode === 'slot'" :span="2" label="展示说明">
            <NAlert type="info" :bordered="false" class="slot-help">
              Slot 模式表示按钮点击后交给业务自定义渲染，可用于详情面板、配置面板、二次确认流等非标准表单场景。
            </NAlert>
          </NFormItemGi>
          <NFormItemGi v-if="selectedAction.mode === 'confirm'" :span="2" label="确认文案">
            <NInput v-model:value="selectedAction.confirmText" />
          </NFormItemGi>
        </NGrid>
        <NButton
          v-if="selectedAction.mode === 'form'"
          secondary
          type="primary"
          @click="selectActionForm(selectedAction)"
        >
          设计该按钮表单
        </NButton>
      </NForm>
    </template>

    <template v-else>
      <NFormItem label="表单动作">
        <NSelect
          v-model:value="activeActionKey"
          :options="formActions.map(action => ({ label: action.label, value: action.key }))"
        />
      </NFormItem>

      <div class="action-component-grid">
        <NButton dashed @click="addActionField('input')">
          <template #icon><SvgIcon icon="mdi:form-textbox" /></template>
          文本
        </NButton>
        <NButton dashed @click="addActionField('number')">
          <template #icon><SvgIcon icon="mdi:numeric" /></template>
          数字
        </NButton>
        <NButton dashed @click="addActionField('select')">
          <template #icon><SvgIcon icon="mdi:form-dropdown" /></template>
          选择
        </NButton>
      </div>

      <div class="action-field-list">
        <div
          v-for="(field, index) in selectedTableAction?.formSchema"
          :key="field.field"
          class="action-field-item"
          :class="{ selected: selectedActionFieldIndex === index }"
          @click="emit('update:selectedActionFieldIndex', index)"
        >
          <div>
            <strong>{{ field.label }}</strong>
            <span>{{ field.field }} · {{ field.type }}</span>
          </div>
          <NButton quaternary circle size="tiny" title="上移" @click.stop="moveActionField(index, -1)">
            <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" title="下移" @click.stop="moveActionField(index, 1)">
            <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
          </NButton>
          <NButton quaternary circle size="tiny" type="error" title="删除" @click.stop="removeActionField(index)">
            <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
          </NButton>
        </div>
      </div>

      <NForm v-if="selectedActionField" label-placement="top" size="small" class="action-property">
        <div class="property-heading">字段配置 · {{ selectedActionField.label }}</div>
        <NGrid :cols="2" :x-gap="10">
          <NFormItemGi label="标题"><NInput v-model:value="selectedActionField.label" /></NFormItemGi>
          <NFormItemGi label="字段名"><NInput v-model:value="selectedActionField.field" /></NFormItemGi>
          <NFormItemGi label="组件">
            <NSelect
              v-model:value="selectedActionField.type"
              :options="[
                { label: '文本', value: 'input' },
                { label: '数字', value: 'number' },
                { label: '选择', value: 'select' }
              ]"
            />
          </NFormItemGi>
          <NFormItemGi label="必填"><NSwitch v-model:value="selectedActionField.required" /></NFormItemGi>
          <NFormItemGi v-if="selectedActionField.type === 'select'" :span="2" label="选项（每行一项）">
            <NInput
              type="textarea"
              :value="selectedActionField.options?.map(item => item.label).join('\n')"
              @update:value="updateActionOptions"
            />
          </NFormItemGi>
        </NGrid>
      </NForm>
    </template>
  </div>
</template>

<style scoped>
.action-designer {
  display: grid;
  gap: 14px;
}

.action-component-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.action-component-grid.two-columns {
  grid-template-columns: repeat(2, 1fr);
}

.action-field-list {
  display: grid;
  gap: 8px;
}

.action-field-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 26px 26px 26px;
  align-items: center;
  gap: 4px;
  padding: 10px;
  border: 1px solid rgba(128, 128, 128, 0.24);
  border-radius: 6px;
  cursor: pointer;
}

.action-field-item.selected {
  border-color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  box-shadow: inset 3px 0 #6366f1;
}

.action-field-item > div {
  display: grid;
  min-width: 0;
}

.action-field-item span {
  color: rgba(128, 128, 128, 0.9);
  font-size: 12px;
}

.action-property {
  padding: 12px;
  border: 1px solid rgba(99, 102, 241, 0.25);
  border-radius: 6px;
  background: rgba(99, 102, 241, 0.035);
}

.property-heading {
  margin-bottom: 10px;
  font-weight: 600;
}

.visual-section-switch {
  justify-self: stretch;
}

.visual-section-switch :deep(.n-radio-button) {
  flex: 1;
  text-align: center;
}

.slot-help {
  line-height: 1.6;
}

.enum-editor {
  display: grid;
  gap: 8px;
}

.enum-editor p {
  margin: 0;
  color: rgb(var(--text-color-3));
  font-size: 12px;
  line-height: 1.6;
}

.enum-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.enum-preview span {
  color: rgb(var(--text-color-3));
  font-size: 12px;
}
</style>
