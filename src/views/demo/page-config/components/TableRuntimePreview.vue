<script setup lang="ts">
import { computed } from 'vue';
import type { DataTableColumns } from 'naive-ui';
import type { DemoRole, TableAction } from '../../shared';
import type { SearchField } from '../types';

const props = defineProps<{
  activeRole: DemoRole;
  tablePreviewMode: 'config' | 'role';
  tableScale: 4 | 200;
  tableDensity: 'small' | 'medium' | 'large';
  searchSchema: SearchField[];
  searchModel: Record<string, any>;
  columns: DataTableColumns<Record<string, any>>;
  runtimeRows: Record<string, any>[];
  previewRoleOptions: Array<{ label: string; value: string }>;
  hiddenActions: TableAction[];
  configuredActionCount: number;
  visibleColumnKeys: string[];
  columnOrder: string[];
  columnTitleMap: Map<string, string>;
  getNumberRangeValue: (key: string) => Array<number | null>;
  resetTablePreference: () => void;
  movePreferenceColumn: (index: number, offset: -1 | 1) => void;
  openPermissionConfig: () => void;
}>();

const emit = defineEmits<{
  'update:activeRole': [value: DemoRole];
  'update:tablePreviewMode': [value: 'config' | 'role'];
  'update:tableScale': [value: 4 | 200];
  'update:tableDensity': [value: 'small' | 'medium' | 'large'];
  'update:visibleColumnKeys': [value: string[]];
}>();

const currentRole = computed({
  get: () => props.activeRole,
  set: value => emit('update:activeRole', value)
});
const previewMode = computed({
  get: () => props.tablePreviewMode,
  set: value => emit('update:tablePreviewMode', value)
});
const scale = computed({
  get: () => props.tableScale,
  set: value => emit('update:tableScale', value)
});
const density = computed({
  get: () => props.tableDensity,
  set: value => emit('update:tableDensity', value)
});
const visibleKeys = computed({
  get: () => props.visibleColumnKeys,
  set: value => emit('update:visibleColumnKeys', value)
});
</script>

<template>
  <NCard title="动态列表预览" size="small">
    <template #header-extra>
      <NSpace align="center">
        <NText depth="3">预览角色</NText>
        <NSelect v-model:value="currentRole" size="small" class="preview-role-select" :options="previewRoleOptions" />
        <NRadioGroup v-model:value="previewMode" size="small">
          <NRadioButton value="config">配置视图</NRadioButton>
          <NRadioButton value="role">角色视图</NRadioButton>
        </NRadioGroup>
      </NSpace>
    </template>

    <div class="table-runtime-toolbar">
      <template v-for="field in searchSchema" :key="`${field.key}-${field.type}`">
        <NInput
          v-if="field.type === 'input'"
          v-model:value="searchModel[field.key]"
          clearable
          :placeholder="field.placeholder"
          class="table-search"
        >
          <template #prefix><SvgIcon icon="mdi:magnify" /></template>
        </NInput>
        <NSelect
          v-else-if="field.type === 'select'"
          v-model:value="searchModel[field.key]"
          clearable
          :placeholder="field.placeholder"
          :options="field.options || []"
          class="status-select"
        />
        <NDatePicker
          v-else-if="field.type === 'date-range'"
          v-model:formatted-value="searchModel[field.key]"
          type="daterange"
          clearable
          value-format="yyyy-MM-dd"
          :start-placeholder="field.placeholder || '开始日期'"
          end-placeholder="结束日期"
          class="date-range-search"
        />
        <div v-else class="range-search">
          <NInputNumber
            :value="getNumberRangeValue(field.key)[0]"
            clearable
            :placeholder="`${field.label}最小`"
            class="range-input"
            @update:value="value => (getNumberRangeValue(field.key)[0] = value)"
          />
          <span>-</span>
          <NInputNumber
            :value="getNumberRangeValue(field.key)[1]"
            clearable
            :placeholder="`${field.label}最大`"
            class="range-input"
            @update:value="value => (getNumberRangeValue(field.key)[1] = value)"
          />
        </div>
      </template>
      <NRadioGroup v-model:value="scale" size="small">
        <NRadioButton :value="4">4 行</NRadioButton>
        <NRadioButton :value="200">200 行</NRadioButton>
      </NRadioGroup>
      <NPopover trigger="click" placement="bottom-end" :width="300">
        <template #trigger>
          <NButton title="个人列设置">
            <template #icon><SvgIcon icon="mdi:view-column-outline" /></template>
            列设置
          </NButton>
        </template>
        <div class="preference-heading">
          <strong>个人列偏好</strong>
          <NButton text type="primary" size="small" @click="resetTablePreference">重置</NButton>
        </div>
        <NFormItem label="密度" size="small">
          <NRadioGroup v-model:value="density" size="small">
            <NRadioButton value="small">紧凑</NRadioButton>
            <NRadioButton value="medium">默认</NRadioButton>
            <NRadioButton value="large">宽松</NRadioButton>
          </NRadioGroup>
        </NFormItem>
        <NCheckboxGroup v-model:value="visibleKeys">
          <div v-for="(key, index) in columnOrder" :key="key" class="preference-row">
            <NCheckbox :value="key" :label="columnTitleMap.get(key) || key" />
            <NSpace :size="2">
              <NButton quaternary circle size="tiny" title="前移" @click="movePreferenceColumn(index, -1)">
                <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
              </NButton>
              <NButton quaternary circle size="tiny" title="后移" @click="movePreferenceColumn(index, 1)">
                <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
              </NButton>
            </NSpace>
          </div>
        </NCheckboxGroup>
      </NPopover>
    </div>

    <NAlert
      v-if="tablePreviewMode === 'role' && hiddenActions.length"
      type="warning"
      :bordered="false"
      class="permission-alert"
    >
      <div class="permission-alert-content">
        <span>
          隐藏 {{ hiddenActions.length }} 个未授权按钮：{{
            hiddenActions.map(action => `${action.label} (${action.permission})`).join('、')
          }}
        </span>
        <NButton size="small" type="warning" @click="openPermissionConfig">前往权限配置</NButton>
      </div>
    </NAlert>
    <NAlert v-else-if="tablePreviewMode === 'config'" type="info" :bordered="false" class="permission-alert">
      当前展示 Schema 中的全部 {{ configuredActionCount }} 个操作按钮。
    </NAlert>
    <NDataTable
      :columns="columns"
      :data="runtimeRows"
      :bordered="false"
      :size="tableDensity"
      :virtual-scroll="tableScale === 200"
      :max-height="tableScale === 200 ? 420 : undefined"
      :row-key="row => row.id"
    />
  </NCard>
</template>

<style scoped>
.permission-alert {
  margin-bottom: 12px;
}

.table-runtime-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.table-search {
  width: 220px;
}

.status-select {
  width: 130px;
}

.date-range-search {
  width: 250px;
}

.range-search {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.range-input {
  width: 118px;
}

.preference-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.preference-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
  border-top: 1px solid rgba(128, 128, 128, 0.14);
}

.preview-role-select {
  width: 128px;
}

.permission-alert-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

@media (max-width: 700px) {
  .permission-alert-content {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
