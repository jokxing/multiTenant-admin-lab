<script setup lang="ts">
import { computed, h, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NInput, NInputNumber, NSelect, NTag } from 'naive-ui';
import { activeRole, canUse, reviewRows, type PageColumn, type TableAction } from '../shared';
import { PAGE_CONFIG_STORAGE_KEYS, defaultSearchSchema } from '../page-config/constants';
import type { ConfigSnapshot, LegacyConfigSnapshot, PageConfig, SearchField } from '../page-config/types';

defineOptions({ name: 'DemoRuntime' });

const route = useRoute();
const router = useRouter();
const searchModel = reactive<Record<string, any>>({});
const actionModalVisible = ref(false);
const activeAction = ref<TableAction | null>(null);
const activeRow = ref<Record<string, any> | null>(null);
const actionModel = reactive<Record<string, any>>({});

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function loadStoredValue<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function normalizePublishedPages(value: ConfigSnapshot | LegacyConfigSnapshot | null): PageConfig[] {
  if (value && 'pages' in value && Array.isArray(value.pages)) return cloneJson(value.pages);
  if (value && 'table' in value) {
    return [
      {
        pageKey: 'review',
        pageName: '申请审核列表',
        routeKey: 'review',
        routePath: '/demo/runtime/review',
        pageType: 'table-form',
        table: cloneJson(value.table),
        form: cloneJson(value.form),
        search: cloneJson(value.search || defaultSearchSchema)
      }
    ];
  }

  return [];
}

const publishedSnapshot = computed(() =>
  loadStoredValue<ConfigSnapshot | LegacyConfigSnapshot>(PAGE_CONFIG_STORAGE_KEYS.published)
);
const publishedPages = computed(() => normalizePublishedPages(publishedSnapshot.value));
const pageKey = computed(() => String(route.params.pageKey || ''));
const pageConfig = computed(() => publishedPages.value.find(page => page.pageKey === pageKey.value));
const searchSchema = computed(() => pageConfig.value?.search || []);
const actionColumn = computed(() => pageConfig.value?.table.find(column => column.type === 'action'));
const routeKey = computed(() => pageConfig.value?.routeKey || 'review');

function getSearchValue(field: SearchField) {
  if (!(field.key in searchModel)) {
    if (field.type === 'number-range') searchModel[field.key] = [null, null];
    else searchModel[field.key] = field.type === 'input' ? '' : null;
  }

  return searchModel[field.key];
}

function getCellValue(row: Record<string, any>, key: string) {
  if (row[key] != null && row[key] !== '') return row[key];
  if (/time|date|created/i.test(key)) return row.createdAt || '-';

  return '-';
}

function isEmptyValue(value: any) {
  if (Array.isArray(value)) return value.every(item => item === '' || item == null);

  return value === '' || value == null;
}

const runtimeRows = computed(() =>
  reviewRows.value.filter(row =>
    searchSchema.value.every(field => {
      const value = searchModel[field.key];
      if (isEmptyValue(value)) return true;
      if (field.type === 'date-range') {
        const [start, end] = value as string[];
        const rowValue = String((row as any)[field.targetKey || field.key] ?? '');
        return (!start || rowValue >= start) && (!end || rowValue <= end);
      }
      if (field.type === 'number-range') {
        const [min, max] = value as Array<number | null>;
        const rowValue = Number((row as any)[field.targetKey || field.key] ?? 0);
        return (min == null || rowValue >= min) && (max == null || rowValue <= max);
      }
      if (field.key === 'keyword')
        return `${row.id}${row.title}${row.tenant}`.toLowerCase().includes(String(value).trim().toLowerCase());

      return String((row as any)[field.targetKey || field.key] ?? '')
        .toLowerCase()
        .includes(String(value).toLowerCase());
    })
  )
);

function executeAction(action: TableAction, row: Record<string, any>) {
  activeAction.value = action;
  activeRow.value = row;

  if (action.mode === 'confirm') {
    window.$dialog?.warning({
      title: action.label,
      content: action.confirmText || `确认执行“${action.label}”？`,
      positiveText: '确认',
      negativeText: '取消',
      onPositiveClick: () => window.$message?.success(`运行时已执行：${action.label}`)
    });
    return;
  }

  Object.keys(actionModel).forEach(key => delete actionModel[key]);
  action.formSchema?.forEach(field => {
    actionModel[field.field] = row[field.field] ?? null;
  });
  actionModalVisible.value = true;
}

function createColumn(column: PageColumn) {
  if (column.type === 'tag') {
    return {
      title: column.title,
      key: column.key,
      render: (row: Record<string, any>) => {
        const rawValue = getCellValue(row, column.key);
        const option = column.options?.find(item => String(item.value) === String(rawValue));
        return h(
          NTag,
          { type: option?.type || 'default', size: 'small' },
          { default: () => option?.label || rawValue }
        );
      }
    };
  }

  if (column.type === 'amount') {
    return {
      title: column.title,
      key: column.key,
      render: (row: Record<string, any>) => {
        const value = Number(row[column.key] ?? row.amount ?? 0);
        return value ? `¥${value.toLocaleString()}` : '-';
      }
    };
  }

  if (column.type === 'action') {
    return {
      title: column.title,
      key: column.key,
      width: 240,
      render: (row: Record<string, any>) =>
        h(
          'div',
          { class: 'runtime-actions' },
          (column.actions || [])
            .filter(action => !action.permission || canUse(routeKey.value, action.permission))
            .map(action =>
              h(
                NButton,
                { size: 'small', type: action.type, onClick: () => executeAction(action, row) },
                { default: () => action.label }
              )
            )
        )
    };
  }

  return {
    title: column.title,
    key: column.key,
    render: (row: Record<string, any>) => getCellValue(row, column.key)
  };
}

const columns = computed(() => (pageConfig.value?.table || []).map(createColumn));
const configuredActionCount = computed(() => actionColumn.value?.actions?.length || 0);
const authorizedActionCount = computed(
  () =>
    actionColumn.value?.actions?.filter(action => !action.permission || canUse(routeKey.value, action.permission))
      .length || 0
);

function submitActionForm() {
  const missing = activeAction.value?.formSchema?.find(
    field => field.required && (actionModel[field.field] === '' || actionModel[field.field] == null)
  );
  if (missing) {
    window.$message?.warning(`请填写${missing.label}`);
    return;
  }
  window.$message?.success(`运行时已提交：${activeAction.value?.label}`);
  actionModalVisible.value = false;
}
</script>

<template>
  <NCard title="Schema 运行时页面" :bordered="false">
    <template #header-extra>
      <NSpace align="center">
        <NButton secondary @click="router.push('/demo/page-config')">
          <template #icon><SvgIcon icon="mdi:arrow-left" /></template>
          返回配置器
        </NButton>
      </NSpace>
    </template>

    <NResult
      v-if="!pageConfig"
      status="404"
      title="未找到已发布页面"
      description="运行时只读取已发布配置。请回到页面配置器发布当前页面后再预览。"
    >
      <template #footer>
        <NButton type="primary" @click="router.push('/demo/page-config')">回到页面配置器</NButton>
      </template>
    </NResult>

    <template v-else>
      <div class="runtime-header">
        <div>
          <NText depth="3">已发布配置驱动</NText>
          <h2>{{ pageConfig.pageName }}</h2>
          <NSpace>
            <NTag :bordered="false" type="info">{{ pageConfig.routePath }}</NTag>
            <NTag :bordered="false">routeKey: {{ pageConfig.routeKey }}</NTag>
            <NTag :bordered="false">当前角色：{{ activeRole }}</NTag>
          </NSpace>
        </div>
        <NAlert type="success" :bordered="false" class="runtime-summary">
          Schema 列 {{ pageConfig.table.length }} 个，搜索项 {{ pageConfig.search.length }} 个，操作按钮
          {{ authorizedActionCount }}/{{ configuredActionCount }} 个可见。
        </NAlert>
      </div>

      <NCard size="small" title="动态查询区" class="runtime-section">
        <div class="runtime-search">
          <template v-for="field in searchSchema" :key="`${field.key}-${field.type}`">
            <NInput
              v-if="field.type === 'input'"
              v-model:value="searchModel[field.key]"
              clearable
              :placeholder="field.placeholder"
              class="search-input"
            >
              <template #prefix><SvgIcon icon="mdi:magnify" /></template>
            </NInput>
            <NSelect
              v-else-if="field.type === 'select'"
              v-model:value="searchModel[field.key]"
              clearable
              :placeholder="field.placeholder"
              :options="field.options || []"
              class="search-select"
            />
            <NDatePicker
              v-else-if="field.type === 'date-range'"
              v-model:formatted-value="searchModel[field.key]"
              type="daterange"
              clearable
              value-format="yyyy-MM-dd"
              :start-placeholder="field.placeholder || '开始日期'"
              end-placeholder="结束日期"
              class="search-date"
            />
            <div v-else class="search-range">
              <NInputNumber
                :value="getSearchValue(field)[0]"
                clearable
                :placeholder="`${field.label}最小`"
                @update:value="value => (getSearchValue(field)[0] = value)"
              />
              <span>-</span>
              <NInputNumber
                :value="getSearchValue(field)[1]"
                clearable
                :placeholder="`${field.label}最大`"
                @update:value="value => (getSearchValue(field)[1] = value)"
              />
            </div>
          </template>
          <NButton secondary @click="Object.keys(searchModel).forEach(key => delete searchModel[key])">重置</NButton>
        </div>
      </NCard>

      <NCard size="small" title="动态列表" class="runtime-section">
        <NDataTable :columns="columns" :data="runtimeRows" :bordered="false" :row-key="row => row.id" />
      </NCard>
    </template>

    <NModal
      v-model:show="actionModalVisible"
      preset="card"
      :title="activeAction?.label"
      style="width: min(620px, calc(100vw - 32px))"
    >
      <NForm v-if="activeAction?.mode === 'form'" label-placement="left" label-width="90" :model="actionModel">
        <NFormItem
          v-for="field in activeAction.formSchema"
          :key="field.field"
          :label="field.label"
          :required="field.required"
        >
          <NInput v-if="field.type === 'input'" v-model:value="actionModel[field.field]" />
          <NInputNumber v-else-if="field.type === 'number'" v-model:value="actionModel[field.field]" class="w-full" />
          <NSelect v-else v-model:value="actionModel[field.field]" :options="field.options || []" />
        </NFormItem>
      </NForm>
      <NAlert v-else type="info" :bordered="false">
        当前操作由自定义 Slot 扩展点渲染：{{ activeAction?.slot || activeAction?.key }}。运行时已拿到行数据
        {{ activeRow?.id }}。
      </NAlert>
      <template #footer>
        <div class="modal-actions">
          <NButton @click="actionModalVisible = false">取消</NButton>
          <NButton v-if="activeAction?.mode === 'form'" type="primary" @click="submitActionForm">提交</NButton>
        </div>
      </template>
    </NModal>
  </NCard>
</template>

<style scoped>
.runtime-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e6e8f0;
  border-radius: 8px;
  background: #fafbff;
}

.runtime-header h2 {
  margin: 6px 0 10px;
  font-size: 24px;
}

.runtime-summary {
  max-width: 440px;
}

.runtime-section {
  margin-top: 16px;
}

.runtime-search {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.search-input {
  width: 240px;
}

.search-select {
  width: 150px;
}

.search-date {
  width: 260px;
}

.search-range {
  display: inline-grid;
  grid-template-columns: 130px auto 130px;
  align-items: center;
  gap: 6px;
}

:deep(.runtime-actions) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 900px) {
  .runtime-header {
    flex-direction: column;
  }

  .runtime-summary {
    max-width: none;
    width: 100%;
  }
}
</style>
