<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NInput, NInputNumber, NSelect, NTag } from 'naive-ui';
import {
  activeRole,
  canUse,
  hasSortableColumn,
  reviewRows,
  type PageColumn,
  type TableAction
} from '../shared';
import SortableColumnCell from '../list-sort/SortableColumnCell.vue';
import { contentRecommendRows } from '../list-sort/contentRecommendStore';
import { useListSortActions } from '../list-sort/useListSortActions';
import { useTableRowDrag } from '../list-sort/useTableRowDrag';
import LangAssetGroupField from '../lang-asset/LangAssetGroupField.vue';
import { createEmptyLangAssetGroup, type LangAssetGroupValue } from '../lang-asset/types';
import { validateLangAssetGroup } from '../lang-asset/validateLangAssetGroup';
import {
  getLangAssetFailNext,
  loadLangAssetForm,
  saveLangAssetForm,
  setLangAssetFailNext
} from '../lang-asset/langAssetStore';
import { PAGE_CONFIG_STORAGE_KEYS, defaultSearchSchema } from '../page-config/constants';
import type { ConfigSnapshot, FormField, LegacyConfigSnapshot, PageConfig, SearchField } from '../page-config/types';

defineOptions({ name: 'DemoRuntime' });

const route = useRoute();
const router = useRouter();
const searchModel = reactive<Record<string, any>>({});
const actionModalVisible = ref(false);
const activeAction = ref<TableAction | null>(null);
const activeRow = ref<Record<string, any> | null>(null);
const actionModel = reactive<Record<string, any>>({});
const tableWrapRef = ref<HTMLElement | null>(null);

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
const sortableEnabled = computed(() => hasSortableColumn(pageConfig.value?.table || []));
const isFormPage = computed(() => pageConfig.value?.pageType === 'form');
const formSchema = computed(() => pageConfig.value?.form || []);
const formModel = reactive<Record<string, any>>({});
const formErrors = ref<Record<string, string>>({});
const formSubmitting = ref(false);
const formSaveError = ref('');
const formFailNext = ref(getLangAssetFailNext());

/**
 * 表单保存权限：按 routeKey + savePermission + canUse 响应式判断，不写死角色名。
 * - 声明了 savePermission：必须 canUse 通过才可保存
 * - activity-materials 未声明：不得默认放行
 * - 其他旧表单未声明：保持原先可保存行为
 */
const canSaveForm = computed(() => {
  const page = pageConfig.value;
  if (!page || page.pageType !== 'form') return false;

  if (page.savePermission) return canUse(page.routeKey, page.savePermission);
  if (page.pageKey === 'activity-materials') return false;
  return true;
});

const formFieldsReadonly = computed(() => formSubmitting.value || !canSaveForm.value);

function createFormFieldValue(field: FormField) {
  if (field.type === 'switch') return false;
  if (field.type === 'lang-asset-group') return createEmptyLangAssetGroup();
  return null;
}

function syncRuntimeFormModel() {
  Object.keys(formModel).forEach(key => {
    if (!formSchema.value.some(field => field.field === key)) delete formModel[key];
  });
  formSchema.value.forEach(field => {
    if (!(field.field in formModel)) formModel[field.field] = createFormFieldValue(field);
  });
  const drafts = loadLangAssetForm(pageKey.value);
  formSchema.value.filter(field => field.type === 'lang-asset-group').forEach(field => {
    formModel[field.field] = drafts[field.field] || createEmptyLangAssetGroup();
  });
  formErrors.value = {};
  formSaveError.value = '';
  formFailNext.value = getLangAssetFailNext();
}

watch(
  () => pageConfig.value?.pageKey,
  () => {
    if (isFormPage.value) syncRuntimeFormModel();
  },
  { immediate: true }
);

function langFieldErrors(field: FormField) {
  const mapped: Record<string, string> = {};
  Object.entries(formErrors.value).forEach(([key, message]) => {
    const prefix = `${field.field}.`;
    if (key.startsWith(prefix)) mapped[key.slice(prefix.length)] = message;
  });
  return mapped;
}

function setFormFailNext(enabled: boolean) {
  if (!canSaveForm.value) {
    window.$message?.warning('当前角色无保存权限，无法修改该开关');
    return;
  }
  formFailNext.value = enabled;
  setLangAssetFailNext(enabled);
}

async function submitRuntimeForm() {
  if (!canSaveForm.value) {
    window.$message?.warning('当前角色无保存权限');
    return;
  }
  if (formSubmitting.value) {
    window.$message?.warning('表单提交中，请勿重复操作');
    return;
  }

  const errors: Record<string, string> = {};
  formSchema.value.forEach(field => {
    const value = formModel[field.field];
    if (field.type === 'lang-asset-group') {
      const groupErrors = validateLangAssetGroup(value as LangAssetGroupValue, field.primaryLang || 'zh-CN', field.languages);
      Object.entries(groupErrors).forEach(([key, message]) => { errors[`${field.field}.${key}`] = message; });
      return;
    }
    if (field.required && (value === '' || value == null)) {
      errors[field.field] = field.message || `${field.label}必填`;
    }
    if (field.type === 'number' && value != null) {
      if (field.min != null && value < field.min) errors[field.field] = `${field.label}不能小于 ${field.min}`;
      if (field.max != null && value > field.max) errors[field.field] = `${field.label}不能大于 ${field.max}`;
    }
    if (field.pattern) {
      try {
        if (value && !new RegExp(field.pattern).test(String(value))) errors[field.field] = field.message || `${field.label}格式不正确`;
      } catch { errors[field.field] = `${field.label}的正则表达式非法，请修正配置`; }
    }
  });
  formErrors.value = errors;
  formSaveError.value = '';
  if (Object.keys(errors).length) {
    window.$message?.warning('请先修正表单校验错误');
    return;
  }

  const langField = formSchema.value.find(field => field.type === 'lang-asset-group');
  if (!langField) {
    window.$message?.success('运行时表单校验通过');
    return;
  }

  formSubmitting.value = true;
  const scope = pageKey.value;
  try {
    const result = await saveLangAssetForm(scope, Object.fromEntries(
      formSchema.value.filter(field => field.type === 'lang-asset-group').map(field => [field.field, formModel[field.field]])
    ));
    if (scope !== pageKey.value) return;
    formFailNext.value = getLangAssetFailNext();
    if (!result.ok) {
      formSaveError.value = result.message;
      window.$message?.error(result.message);
      return;
    }
    Object.assign(formModel, result.value);
    window.$message?.success('多语言素材组已保存，刷新后可回填');
  } finally {
    formSubmitting.value = false;
  }
}

function getSearchValue(field: SearchField) {
  if (!(field.key in searchModel)) {
    if (field.type === 'number-range') searchModel[field.key] = [null, null];
    else searchModel[field.key] = field.type === 'input' ? '' : null;
  }

  return searchModel[field.key];
}

function getCellValue(row: Record<string, any>, key: string) {
  if (row[key] != null && row[key] !== '') return row[key];
  if (/time|date|created|updated/i.test(key)) return row.updatedAt || row.createdAt || '-';

  return '-';
}

function isEmptyValue(value: any) {
  if (Array.isArray(value)) return value.every(item => item === '' || item == null);

  return value === '' || value == null;
}

const hasActiveFilters = computed(() =>
  searchSchema.value.some(field => !isEmptyValue(searchModel[field.key]))
);

const {
  submitting: sortSubmitting,
  lastError: sortLastError,
  failNext: sortFailNext,
  sortEnabled,
  sortBlockedReason,
  dispatchSortAction,
  getRowIndex,
  setFailNext
} = useListSortActions({
  rows: contentRecommendRows,
  isFiltered: hasActiveFilters,
  onSuccess: message => window.$message?.success(message),
  onError: message => window.$message?.error(message)
});

const sourceRows = computed(() => (sortableEnabled.value ? contentRecommendRows.value : reviewRows.value));

const runtimeRows = computed(() =>
  sourceRows.value.filter(row =>
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
      if (field.key === 'keyword') {
        const haystack = `${row.id}${(row as any).title ?? ''}${(row as any).tenant ?? ''}${(row as any).channel ?? ''}`;
        return haystack.toLowerCase().includes(String(value).trim().toLowerCase());
      }

      return String((row as any)[field.targetKey || field.key] ?? '')
        .toLowerCase()
        .includes(String(value).toLowerCase());
    })
  )
);

useTableRowDrag({
  wrapRef: tableWrapRef,
  rows: contentRecommendRows,
  disabled: () => Boolean(!sortableEnabled.value || !sortEnabled.value),
  onReorder: async (orderedIds, previousRows) => {
    await dispatchSortAction('drag-sort', orderedIds[0] || '', {
      orderedIds,
      previousRows
    });
  }
});

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
  if (column.type === 'sortable') {
    return {
      title: column.title,
      key: column.key,
      width: 168,
      render: (row: Record<string, any>) =>
        h(SortableColumnCell, {
          entityId: String(row.id),
          index: getRowIndex(String(row.id)),
          total: contentRecommendRows.value.length,
          disabled: !sortEnabled.value,
          submitting: sortSubmitting.value,
          onAction: (action: 'drag-sort' | 'sortTop' | 'sort-up' | 'sort-down') => {
            void dispatchSortAction(action, String(row.id));
          }
        })
    };
  }

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
            <NTag v-if="sortableEnabled" :bordered="false" type="success">排序列已启用</NTag>
          </NSpace>
        </div>
        <NAlert type="success" :bordered="false" class="runtime-summary">
          <template v-if="isFormPage">
            表单字段 {{ pageConfig.form.length }} 个，pageType: form。
          </template>
          <template v-else>
            Schema 列 {{ pageConfig.table.length }} 个，搜索项 {{ pageConfig.search.length }} 个，操作按钮
            {{ authorizedActionCount }}/{{ configuredActionCount }} 个可见。
          </template>
        </NAlert>
      </div>

      <template v-if="isFormPage">
        <NCard size="small" title="配置驱动表单运行时" class="runtime-section">
          <NSpace align="center" class="form-toolbar">
            <NText depth="3">本地 Mock 保存 · 切换语言保留输入 · 非法配置在配置器拒绝应用</NText>
            <NSpace align="center">
              <NText>下次保存失败</NText>
              <NSwitch :value="formFailNext" :disabled="!canSaveForm" @update:value="setFormFailNext" />
              <NTag v-if="!canSaveForm" type="warning" :bordered="false">只读</NTag>
              <NTag v-if="formSubmitting" type="warning" :bordered="false">提交中</NTag>
            </NSpace>
          </NSpace>
          <NAlert v-if="formSaveError" type="error" :bordered="false" class="sort-alert">
            {{ formSaveError }}
          </NAlert>
          <NForm label-placement="top" :model="formModel" class="runtime-form">
            <NFormItem
              v-for="field in formSchema"
              :key="field.field"
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
                :errors="langFieldErrors(field)"
                :disabled="formFieldsReadonly"
                @update:model-value="value => (formModel[field.field] = value)"
              />
              <NInput
                v-else-if="field.type === 'input' || field.type === 'textarea'"
                v-model:value="formModel[field.field]"
                :type="field.type === 'textarea' ? 'textarea' : 'text'"
                :placeholder="field.placeholder"
                :disabled="formFieldsReadonly"
              />
              <NSelect
                v-else-if="field.type === 'select'"
                v-model:value="formModel[field.field]"
                :options="field.options || []"
                :disabled="formFieldsReadonly"
              />
              <NInputNumber
                v-else-if="field.type === 'number'"
                v-model:value="formModel[field.field]"
                :min="field.min"
                :max="field.max"
                :disabled="formFieldsReadonly"
                class="w-full"
              />
              <NSwitch
                v-else-if="field.type === 'switch'"
                v-model:value="formModel[field.field]"
                :disabled="formFieldsReadonly"
              />
              <NDatePicker
                v-else-if="field.type === 'date'"
                v-model:formatted-value="formModel[field.field]"
                type="date"
                value-format="yyyy-MM-dd"
                :disabled="formFieldsReadonly"
                class="w-full"
              />
            </NFormItem>
            <NButton v-if="canSaveForm" type="primary" :loading="formSubmitting" @click="submitRuntimeForm">
              保存素材组
            </NButton>
          </NForm>
        </NCard>
      </template>

      <NCard v-else-if="sortableEnabled" size="small" title="排序演示控制" class="runtime-section">
        <NSpace align="center" justify="space-between">
          <NText depth="3">完整列表排序 · 本地异步 Mock 保存 · 稳定实体 ID</NText>
          <NSpace align="center">
            <NText>下次保存失败（可控）</NText>
            <NSwitch :value="sortFailNext" @update:value="setFailNext" />
            <NTag v-if="sortSubmitting" type="warning" :bordered="false">提交中</NTag>
          </NSpace>
        </NSpace>
        <NAlert v-if="sortBlockedReason" type="warning" :bordered="false" class="sort-alert">
          {{ sortBlockedReason }}
        </NAlert>
        <NAlert v-else-if="sortLastError" type="error" :bordered="false" class="sort-alert">
          {{ sortLastError }}
        </NAlert>
      </NCard>

      <template v-if="!isFormPage">
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
          <div ref="tableWrapRef">
            <NDataTable :columns="columns" :data="runtimeRows" :bordered="false" :row-key="row => row.id" />
          </div>
        </NCard>
      </template>
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

.sort-alert {
  margin-top: 12px;
}

.form-toolbar {
  margin-bottom: 12px;
  width: 100%;
  justify-content: space-between;
}

.runtime-form {
  max-width: 760px;
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
