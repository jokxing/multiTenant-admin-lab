<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { defaultPageColumns, pageColumns } from '../shared';
import { contentRecommendColumns, contentRecommendSearchSchema } from '../list-sort/contentRecommendSchema';
import { activityMaterialsPageConfig } from '../activity-materials/schema';
import {
  PAGE_CONFIG_STORAGE_KEYS,
  defaultFormSchema,
  defaultLangAssetFormSchema,
  defaultPageMeta,
  defaultSearchSchema,
  pageTemplateOptions,
  pageTypeOptions
} from './constants';
import { assertValidFormSchema } from './formSchemaGuard';
import FormConfigDesigner from './components/FormConfigDesigner.vue';
import FormRuleModal from './components/FormRuleModal.vue';
import FormRuntimePreview from './components/FormRuntimePreview.vue';
import TableConfigDesigner from './components/TableConfigDesigner.vue';
import TableRuntimePreview from './components/TableRuntimePreview.vue';
import { useFormConfig } from './composables/useFormConfig';
import { useTableConfig } from './composables/useTableConfig';
import type { ConfigSnapshot, ConfigVersion, LegacyConfigSnapshot, PageConfig, PageType } from './types';

defineOptions({ name: 'DemoPageConfig' });

const router = useRouter();

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

const configMode = ref<'table' | 'form'>('table');
const editorMode = ref<'visual' | 'json'>('visual');
const {
  activeAction,
  activeRole,
  activeRow,
  actionModalVisible,
  actionModel,
  addActionField,
  addSearchField,
  addTableAction,
  addTableColumn,
  columnOrder,
  columnTitleMap,
  columns,
  configuredActions,
  formActions,
  getNumberRangeValue,
  handleSortReorder,
  hiddenActions,
  moveActionField,
  movePreferenceColumn,
  moveSearchField,
  moveTableAction,
  moveTableColumn,
  openPermissionConfig,
  previewRoleOptions,
  removeActionField,
  removeSearchField,
  removeTableAction,
  removeTableColumn,
  resetTablePreference,
  resetTableSchema,
  runtimeRows,
  searchModel,
  searchSchema,
  selectedActionFieldIndex,
  selectedActionIndex,
  selectedActionKey,
  selectedColumnIndex,
  selectedSearchIndex,
  setCurrentRouteKey,
  setFailNext: setSortFailNext,
  setTableConfig,
  sortBlockedReason,
  sortFailNext,
  sortSubmitting,
  sortableEnabled,
  submitTableAction,
  tableDensity,
  tableEditorMode,
  tableJson,
  tablePreviewMode,
  tableScale,
  tableVisualMode,
  updateActionMode,
  updateActionOptions,
  updateColumnType,
  updateColumnTagOptions,
  updateSearchOptions,
  visibleColumnKeys
} = useTableConfig();

const activePageKey = ref(defaultPageMeta.pageKey);

const {
  conditionFieldOptions,
  failNextSave,
  formErrors,
  formJson,
  formModel,
  formSaveError,
  formSchema,
  formSubmitting,
  hasLangAssetGroup,
  ruleModalVisible,
  selectedField,
  selectedIndex,
  typeOptions,
  visibleFields,
  addField,
  clearCondition,
  moveField,
  openRuleModal,
  removeField,
  resetFormSchema,
  saveRules,
  setFailNext: setFormFailNext,
  setFormConfig,
  submitForm,
  updateOptions
} = useFormConfig(() => activePageKey.value);

const versionModalVisible = ref(false);
const publishLoading = ref(false);
const pageCreateModalVisible = ref(false);
const pageMetaModalMode = ref<'create' | 'edit'>('create');
const editingPageKey = ref('');
const newPageModel = reactive({
  pageName: '',
  pageKey: '',
  routeKey: '',
  routePath: '',
  pageType: 'table-form' as PageType,
  template: 'review'
});
const pageTemplateSelectOptions = pageTemplateOptions.map(item => ({ label: item.label, value: item.value }));

watch(
  () => newPageModel.template,
  template => {
    if (pageMetaModalMode.value !== 'create') return;
    newPageModel.pageType =
      template === 'lang-asset-form' || template === 'activity-materials'
        ? 'form'
        : template === 'content-recommend'
          ? 'table'
          : 'table-form';
  }
);

function createPageConfig(partial?: Partial<PageConfig>): PageConfig {
  return {
    ...defaultPageMeta,
    table: cloneJson(defaultPageColumns),
    form: cloneJson(defaultFormSchema),
    search: cloneJson(defaultSearchSchema),
    ...partial
  };
}

function createOperationTemplate(partial?: Partial<PageConfig>): PageConfig {
  return createPageConfig({
    pageKey: 'operation-config',
    pageName: '运营配置列表',
    routeKey: 'operations',
    routePath: '/demo/runtime/operations',
    table: [
      { key: 'id', title: '配置编号' },
      { key: 'title', title: '配置名称' },
      { key: 'tenant', title: '适用租户' },
      {
        key: 'status',
        title: '发布状态',
        type: 'tag',
        options: [
          { label: '草稿', value: 1, type: 'default' },
          { label: '待发布', value: 2, type: 'warning' },
          { label: '已发布', value: 3, type: 'success' },
          { label: '已停用', value: 4, type: 'error' }
        ]
      },
      { key: 'createdAt', title: '更新时间' },
      {
        key: 'action',
        title: '操作',
        type: 'action',
        actions: [
          { key: 'edit', label: '编辑', mode: 'form', permission: 'edit', type: 'default', formSchema: [] },
          { key: 'publish', label: '发布', mode: 'confirm', permission: 'approve', type: 'primary' },
          { key: 'delete', label: '删除', mode: 'confirm', permission: 'delete', type: 'error' }
        ]
      }
    ],
    ...partial
  });
}

function createBlankTemplate(partial?: Partial<PageConfig>): PageConfig {
  return createPageConfig({
    pageKey: 'custom-page',
    pageName: '自定义配置页',
    routeKey: 'custom_page',
    routePath: '/demo/runtime/custom-page',
    table: [
      { key: 'id', title: '编号' },
      { key: 'title', title: '标题' },
      {
        key: 'action',
        title: '操作',
        type: 'action',
        actions: [{ key: 'detail', label: '详情', mode: 'slot', type: 'default', slot: 'detail-panel' }]
      }
    ],
    form: [],
    search: [],
    ...partial
  });
}

function createContentRecommendTemplate(partial?: Partial<PageConfig>): PageConfig {
  return createPageConfig({
    pageKey: 'content-recommend',
    pageName: '内容推荐列表',
    routeKey: 'content_recommend',
    routePath: '/demo/runtime/content-recommend',
    pageType: 'table',
    table: cloneJson(contentRecommendColumns),
    form: [],
    search: cloneJson(contentRecommendSearchSchema),
    ...partial
  });
}

function createLangAssetFormTemplate(partial?: Partial<PageConfig>): PageConfig {
  return createPageConfig({
    pageKey: 'lang-asset-form',
    pageName: '多语言素材组',
    routeKey: 'lang_asset_form',
    routePath: '/demo/runtime/lang-asset-form',
    pageType: 'form',
    table: [],
    form: cloneJson(defaultLangAssetFormSchema),
    search: [],
    ...partial
  });
}

/** 活动素材配置表单：深拷贝共享 Schema，再叠创建弹窗中的页面元数据。 */
function createActivityMaterialsTemplate(partial?: Partial<PageConfig>): PageConfig {
  return {
    ...cloneJson(activityMaterialsPageConfig),
    ...partial
  };
}

function normalizePageConfig(page: Partial<PageConfig>, index = 0): PageConfig {
  const fallback = createPageConfig();
  const pageKey = page.pageKey || (index === 0 ? defaultPageMeta.pageKey : `page_${index + 1}`);
  return {
    pageKey,
    pageName: page.pageName || page.routeKey || fallback.pageName,
    routeKey: page.routeKey || pageKey,
    routePath: page.routePath || `/demo/runtime/${pageKey}`,
    pageType: page.pageType || 'table-form',
    table: cloneJson(Array.isArray(page.table) ? page.table : fallback.table),
    form: cloneJson(Array.isArray(page.form) ? page.form : fallback.form),
    search: cloneJson(Array.isArray(page.search) ? page.search : defaultSearchSchema),
    // 仅透传已声明的保存权限元数据；旧配置缺省时不补默认值，避免误判为已授权
    ...(page.savePermission != null ? { savePermission: page.savePermission } : {})
  };
}

function normalizeSnapshot(value: ConfigSnapshot | LegacyConfigSnapshot | null): ConfigSnapshot {
  if (value && 'pages' in value && Array.isArray(value.pages)) {
    const pages = value.pages.map((page, index) => normalizePageConfig(page, index));
    return {
      activePageKey: value.activePageKey || pages[0]?.pageKey || defaultPageMeta.pageKey,
      pages: pages.length ? pages : [createPageConfig()]
    };
  }

  if (value && 'table' in value) {
    return {
      activePageKey: defaultPageMeta.pageKey,
      pages: [
        createPageConfig({
          table: cloneJson(value.table),
          form: cloneJson(value.form || defaultFormSchema),
          search: cloneJson(value.search || defaultSearchSchema)
        })
      ]
    };
  }

  return {
    activePageKey: defaultPageMeta.pageKey,
    pages: [createPageConfig(), createContentRecommendTemplate(), createLangAssetFormTemplate()]
  };
}

const storedPublished = loadStoredValue<ConfigSnapshot | LegacyConfigSnapshot>(PAGE_CONFIG_STORAGE_KEYS.published);
const initialSnapshot = normalizeSnapshot(storedPublished);
const pages = ref<PageConfig[]>(cloneJson(initialSnapshot.pages));
activePageKey.value = initialSnapshot.activePageKey;

const activePage = computed(() => pages.value.find(page => page.pageKey === activePageKey.value) || pages.value[0]);
const pageOptions = computed(() => pages.value.map(page => ({ label: page.pageName, value: page.pageKey })));
const activePageTypeLabel = computed(
  () => pageTypeOptions.find(option => option.value === activePage.value?.pageType)?.label || '列表 + 表单'
);

function syncActivePageDraft() {
  const page = activePage.value;
  if (!page) return;
  page.table = cloneJson(pageColumns.value);
  page.form = cloneJson(formSchema.value);
  page.search = cloneJson(searchSchema.value);
}

function loadPageToDesigner(page: PageConfig) {
  setCurrentRouteKey(page.routeKey);
  setTableConfig(cloneJson(page.table), cloneJson(page.search || defaultSearchSchema));
  setFormConfig(cloneJson(page.form || defaultFormSchema));
}

loadPageToDesigner(activePage.value || createPageConfig());

const publishedSnapshot = ref<ConfigSnapshot>(cloneJson(initialSnapshot));
const configVersions = ref<ConfigVersion[]>(
  (loadStoredValue<ConfigVersion[]>(PAGE_CONFIG_STORAGE_KEYS.versions) || []).map(version => ({
    ...version,
    snapshot: normalizeSnapshot(version.snapshot as ConfigSnapshot | LegacyConfigSnapshot)
  }))
);

if (configVersions.value.length === 0) {
  configVersions.value.push({
    id: 'version_baseline',
    version: 1,
    publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    summary: '初始化脱敏演示配置',
    snapshot: cloneJson(publishedSnapshot.value)
  });
  localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.published, JSON.stringify(publishedSnapshot.value));
  localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.versions, JSON.stringify(configVersions.value));
}

function createSnapshot(sync = true): ConfigSnapshot {
  if (sync) syncActivePageDraft();
  return cloneJson({ activePageKey: activePageKey.value, pages: pages.value });
}

const currentSnapshot = computed(() => createSnapshot(false));
const hasUnpublishedChanges = computed(
  () => JSON.stringify(currentSnapshot.value) !== JSON.stringify(publishedSnapshot.value)
);
const configDiff = computed(() => {
  const currentPage = activePage.value || createPageConfig();
  const publishedPage =
    publishedSnapshot.value.pages.find(page => page.pageKey === currentPage.pageKey) || createPageConfig();
  const publishedActions = publishedPage.table.find(column => column.type === 'action')?.actions || [];
  const currentColumns = pageColumns.value.filter(column => column.type !== 'action');
  const publishedColumns = publishedPage.table.filter(column => column.type !== 'action');
  const currentPageMetas = pages.value.map(({ pageKey, pageName, routeKey, routePath, pageType }) => ({
    pageKey,
    pageName,
    routeKey,
    routePath,
    pageType
  }));
  const publishedPageMetas = publishedSnapshot.value.pages.map(
    ({ pageKey, pageName, routeKey, routePath, pageType }) => ({
      pageKey,
      pageName,
      routeKey,
      routePath,
      pageType
    })
  );
  return {
    pages: pages.value.length - publishedSnapshot.value.pages.length,
    columns: currentColumns.length - publishedColumns.length,
    actions: configuredActions.value.length - publishedActions.length,
    fields: formSchema.value.length - publishedPage.form.length,
    search: searchSchema.value.length - (publishedPage.search || defaultSearchSchema).length,
    pagesChanged: JSON.stringify(currentPageMetas) !== JSON.stringify(publishedPageMetas),
    columnsChanged: JSON.stringify(currentColumns) !== JSON.stringify(publishedColumns),
    actionsChanged: JSON.stringify(configuredActions.value) !== JSON.stringify(publishedActions),
    fieldsChanged: JSON.stringify(formSchema.value) !== JSON.stringify(publishedPage.form),
    searchChanged: JSON.stringify(searchSchema.value) !== JSON.stringify(publishedPage.search || defaultSearchSchema)
  };
});

function switchPage(pageKey: string) {
  if (pageKey === activePageKey.value) return;
  syncActivePageDraft();
  activePageKey.value = pageKey;
  if (activePage.value) loadPageToDesigner(activePage.value);
}

function createRouteKey(pageKey: string) {
  return pageKey.replace(/-/g, '_');
}

function openCreatePageModal() {
  const suffix = String(Date.now()).slice(-4);
  pageMetaModalMode.value = 'create';
  editingPageKey.value = '';
  Object.assign(newPageModel, {
    pageName: '新配置页面',
    pageKey: `custom-page-${suffix}`,
    routeKey: `custom_page_${suffix}`,
    routePath: `/demo/runtime/custom-page-${suffix}`,
    pageType: 'table-form',
    template: 'review'
  });
  pageCreateModalVisible.value = true;
}

function openEditPageModal() {
  const page = activePage.value;
  if (!page) return;
  pageMetaModalMode.value = 'edit';
  editingPageKey.value = page.pageKey;
  Object.assign(newPageModel, {
    pageName: page.pageName,
    pageKey: page.pageKey,
    routeKey: page.routeKey,
    routePath: page.routePath,
    pageType: page.pageType,
    template: 'review'
  });
  pageCreateModalVisible.value = true;
}

function buildPageFromTemplate(): PageConfig {
  const meta = {
    pageName: newPageModel.pageName,
    pageKey: newPageModel.pageKey,
    routeKey: newPageModel.routeKey || createRouteKey(newPageModel.pageKey),
    routePath: newPageModel.routePath || `/demo/runtime/${newPageModel.pageKey}`,
    pageType: newPageModel.pageType
  };
  if (newPageModel.template === 'operations') return createOperationTemplate(meta);
  if (newPageModel.template === 'content-recommend') return createContentRecommendTemplate(meta);
  if (newPageModel.template === 'lang-asset-form') return createLangAssetFormTemplate(meta);
  if (newPageModel.template === 'activity-materials') return createActivityMaterialsTemplate(meta);
  if (newPageModel.template === 'blank') return createBlankTemplate(meta);

  return createPageConfig(meta);
}

function createPage() {
  const pageKey = newPageModel.pageKey.trim();
  const routeKey = (newPageModel.routeKey || createRouteKey(pageKey)).trim();
  if (!pageKey || !newPageModel.pageName.trim()) {
    window.$message?.warning('请填写页面名称和页面标识');
    return;
  }
  if (pages.value.some(page => page.pageKey === pageKey)) {
    window.$message?.warning('页面标识已存在');
    return;
  }
  if (pages.value.some(page => page.routeKey === routeKey)) {
    window.$message?.warning('权限 routeKey 已存在');
    return;
  }

  Object.assign(newPageModel, { pageKey, routeKey });
  const page = buildPageFromTemplate();
  syncActivePageDraft();
  pages.value.push(page);
  activePageKey.value = page.pageKey;
  loadPageToDesigner(page);
  pageCreateModalVisible.value = false;
  window.$message?.success('页面已加入草稿，发布后同步到权限树');
}

function savePageMeta() {
  const page = pages.value.find(item => item.pageKey === editingPageKey.value);
  if (!page) return;
  const pageKey = newPageModel.pageKey.trim();
  const routeKey = (newPageModel.routeKey || createRouteKey(pageKey)).trim();
  if (!pageKey || !newPageModel.pageName.trim()) {
    window.$message?.warning('请填写页面名称和页面标识');
    return;
  }
  if (pages.value.some(item => item.pageKey === pageKey && item.pageKey !== editingPageKey.value)) {
    window.$message?.warning('页面标识已存在');
    return;
  }
  if (pages.value.some(item => item.routeKey === routeKey && item.pageKey !== editingPageKey.value)) {
    window.$message?.warning('权限 routeKey 已存在');
    return;
  }

  page.pageName = newPageModel.pageName.trim();
  page.pageKey = pageKey;
  page.routeKey = routeKey;
  page.routePath = newPageModel.routePath.trim() || `/demo/runtime/${pageKey}`;
  page.pageType = newPageModel.pageType;
  activePageKey.value = pageKey;
  editingPageKey.value = pageKey;
  setCurrentRouteKey(routeKey);
  pageCreateModalVisible.value = false;
  window.$message?.success('页面信息已更新');
}

function duplicateCurrentPage() {
  const page = activePage.value;
  if (!page) return;
  const suffix = String(Date.now()).slice(-4);
  const next = normalizePageConfig({
    ...cloneJson(page),
    pageKey: `${page.pageKey}-copy-${suffix}`,
    pageName: `${page.pageName}副本`,
    routeKey: `${page.routeKey}_copy_${suffix}`,
    routePath: `${page.routePath}-copy-${suffix}`
  });
  syncActivePageDraft();
  pages.value.push(next);
  activePageKey.value = next.pageKey;
  loadPageToDesigner(next);
}

watch(
  [pageColumns, formSchema, searchSchema],
  () => {
    syncActivePageDraft();
  },
  { deep: true }
);

function applyJson() {
  try {
    const next = JSON.parse(configMode.value === 'table' ? tableJson.value : formJson.value);
    if (configMode.value === 'table') {
      if (Array.isArray(next)) setTableConfig(next, searchSchema.value);
      else {
        if (!Array.isArray(next.columns) || !Array.isArray(next.search))
          throw new Error('表格配置需要 columns 和 search 数组');
        setTableConfig(next.columns, next.search);
      }
    } else {
      // 非法配置拒绝应用，并保留原有效配置（不只依赖 TypeScript）
      setFormConfig(assertValidFormSchema(next));
    }
    window.$message?.success('Schema 已应用');
  } catch (error: any) {
    window.$message?.error(error.message || 'JSON 格式错误，已保留原有效配置');
  }
}

function validateConfiguration() {
  syncActivePageDraft();
  const errors: string[] = [];
  const duplicateValues = (values: string[]) =>
    values.filter((value, index) => !value || values.indexOf(value) !== index);
  if (duplicateValues(pages.value.map(page => page.pageKey)).length) errors.push('页面标识存在空值或重复');
  if (duplicateValues(pages.value.map(page => page.routeKey)).length) errors.push('权限 routeKey 存在空值或重复');

  pages.value.forEach(page => {
    try {
      assertValidFormSchema(page.form);
    } catch (error) {
      errors.push(`“${page.pageName}”${error instanceof Error ? error.message : '表单配置非法'}`);
    }
    const actions = page.table.find(column => column.type === 'action')?.actions || [];
    if (duplicateValues(page.table.map(column => column.key)).length)
      errors.push(`“${page.pageName}”表格列字段名存在空值或重复`);
    if (duplicateValues(actions.map(action => action.key)).length)
      errors.push(`“${page.pageName}”操作按钮标识存在空值或重复`);
    if (duplicateValues(page.form.map(field => field.field)).length)
      errors.push(`“${page.pageName}”页面表单字段名存在空值或重复`);
    if (duplicateValues(page.search.map(field => field.key)).length)
      errors.push(`“${page.pageName}”搜索字段名存在空值或重复`);
    actions
      .filter(action => action.mode === 'form')
      .forEach(action => {
        const fields = action.formSchema || [];
        if (duplicateValues(fields.map(field => field.field)).length)
          errors.push(`“${page.pageName} / ${action.label}”表单字段名存在空值或重复`);
      });
  });
  return errors;
}

function formatDelta(value: number, label: string, changed = false) {
  if (value === 0) return changed ? `${label}已修改` : `${label}不变`;
  return `${label}${value > 0 ? '+' : ''}${value}`;
}

async function publishConfiguration() {
  const errors = validateConfiguration();
  if (errors.length) {
    window.$dialog?.error({ title: '配置校验未通过', content: errors.join('；'), positiveText: '返回修改' });
    return;
  }
  publishLoading.value = true;
  await new Promise(resolve => setTimeout(resolve, 300));
  const snapshot = createSnapshot();
  const version = (configVersions.value[0]?.version || 0) + 1;
  const summary = [
    formatDelta(configDiff.value.pages, '页面', configDiff.value.pagesChanged),
    formatDelta(configDiff.value.columns, '列', configDiff.value.columnsChanged),
    formatDelta(configDiff.value.actions, '按钮', configDiff.value.actionsChanged),
    formatDelta(configDiff.value.fields, '字段', configDiff.value.fieldsChanged),
    formatDelta(configDiff.value.search, '搜索项', configDiff.value.searchChanged)
  ].join('，');
  const record: ConfigVersion = {
    id: `version_${Date.now()}`,
    version,
    publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    summary,
    snapshot: cloneJson(snapshot)
  };
  publishedSnapshot.value = snapshot;
  configVersions.value.unshift(record);
  localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.published, JSON.stringify(snapshot));
  localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.versions, JSON.stringify(configVersions.value));
  publishLoading.value = false;
  window.$message?.success(`版本 V${version} 发布成功`);
}

function rollbackVersion(version: ConfigVersion) {
  const snapshot = normalizeSnapshot(version.snapshot);
  pages.value = cloneJson(snapshot.pages);
  activePageKey.value = snapshot.activePageKey;
  loadPageToDesigner(activePage.value || pages.value[0]);
  publishedSnapshot.value = createSnapshot();
  const rollbackRecord: ConfigVersion = {
    id: `rollback_${Date.now()}`,
    version: (configVersions.value[0]?.version || 0) + 1,
    publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    summary: `回滚至 V${version.version}`,
    snapshot: createSnapshot()
  };
  configVersions.value.unshift(rollbackRecord);
  localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.published, JSON.stringify(publishedSnapshot.value));
  localStorage.setItem(PAGE_CONFIG_STORAGE_KEYS.versions, JSON.stringify(configVersions.value));
  window.$message?.success(`已回滚并发布为 V${rollbackRecord.version}`);
}

function discardDraft() {
  pages.value = cloneJson(publishedSnapshot.value.pages);
  activePageKey.value = publishedSnapshot.value.activePageKey;
  loadPageToDesigner(activePage.value || pages.value[0]);
  window.$message?.success('未发布修改已撤销');
}

function restore() {
  if (configMode.value === 'table') resetTableSchema();
  else resetFormSchema();
}

function previewRuntimePage() {
  const page = activePage.value;
  if (!page) return;
  const publishedPage = publishedSnapshot.value.pages.find(item => item.pageKey === page.pageKey);
  if (!publishedPage || hasUnpublishedChanges.value) {
    window.$message?.warning('运行时页面只读取已发布配置，请先发布当前草稿');
    return;
  }
  router.push(`/demo/runtime/${page.pageKey}`);
}
</script>

<template>
  <div class="page-config-root">
    <NCard title="页面配置器" :bordered="false">
      <template #header-extra>
        <NSpace align="center">
          <NTag :type="hasUnpublishedChanges ? 'warning' : 'success'" :bordered="false">
            {{
              hasUnpublishedChanges
                ? '存在未发布修改'
                : `已发布${configVersions[0] ? ` V${configVersions[0].version}` : ''}`
            }}
          </NTag>
          <NButton size="small" @click="versionModalVisible = true">
            <template #icon><SvgIcon icon="mdi:history" /></template>
            版本记录
          </NButton>
          <NButton
            size="small"
            type="primary"
            :disabled="!hasUnpublishedChanges"
            :loading="publishLoading"
            @click="publishConfiguration"
          >
            <template #icon><SvgIcon icon="mdi:cloud-upload-outline" /></template>
            发布配置
          </NButton>
        </NSpace>
      </template>

      <NAlert type="info" :bordered="false">
        可视化操作会实时生成 JSON Schema，并同步驱动右侧表单预览与校验规则。
      </NAlert>
      <NAlert v-if="hasUnpublishedChanges" type="warning" :bordered="false" class="draft-alert">
        草稿差异：{{ formatDelta(configDiff.pages, '页面', configDiff.pagesChanged) }}，{{
          formatDelta(configDiff.columns, '列', configDiff.columnsChanged)
        }}，{{ formatDelta(configDiff.search, '搜索项', configDiff.searchChanged) }}，{{
          formatDelta(configDiff.actions, '按钮', configDiff.actionsChanged)
        }}，{{ formatDelta(configDiff.fields, '字段', configDiff.fieldsChanged) }}
      </NAlert>

      <div class="page-toolbar">
        <div class="page-toolbar-main">
          <span class="toolbar-label">当前配置页</span>
          <NSelect :value="activePageKey" class="page-select" :options="pageOptions" @update:value="switchPage" />
          <NTag :bordered="false" type="info">{{ activePageTypeLabel }}</NTag>
          <NTag :bordered="false">{{ activePage?.routePath }}</NTag>
          <NTag :bordered="false">routeKey: {{ activePage?.routeKey }}</NTag>
        </div>
        <NSpace>
          <NButton secondary type="primary" @click="previewRuntimePage">
            <template #icon><SvgIcon icon="mdi:play-box-outline" /></template>
            预览页面
          </NButton>
          <NButton secondary @click="openEditPageModal">
            <template #icon><SvgIcon icon="mdi:pencil-outline" /></template>
            编辑页面
          </NButton>
          <NButton secondary @click="duplicateCurrentPage">
            <template #icon><SvgIcon icon="mdi:content-copy" /></template>
            复制页面
          </NButton>
          <NButton type="primary" secondary @click="openCreatePageModal">
            <template #icon><SvgIcon icon="mdi:file-plus-outline" /></template>
            新增页面
          </NButton>
        </NSpace>
      </div>

      <div class="mode-switch">
        <NRadioGroup v-model:value="configMode" name="config-mode">
          <NRadioButton value="table">表格配置</NRadioButton>
          <NRadioButton value="form">表单配置</NRadioButton>
        </NRadioGroup>
      </div>

      <div v-if="configMode === 'table'" class="table-layout">
        <NCard :title="tableEditorMode === 'json' ? 'table-schema.json' : '表格可视化设计'" size="small">
          <template #header-extra>
            <NRadioGroup v-model:value="tableEditorMode" size="small">
              <NRadioButton value="json">JSON</NRadioButton>
              <NRadioButton value="visual">可视化</NRadioButton>
            </NRadioGroup>
          </template>

          <template v-if="tableEditorMode === 'json'">
            <NInput v-model:value="tableJson" type="textarea" :autosize="{ minRows: 18, maxRows: 26 }" />
            <div class="actions">
              <NButton @click="restore">恢复默认</NButton>
              <NButton type="primary" @click="applyJson">应用配置</NButton>
            </div>
          </template>

          <TableConfigDesigner
            v-else
            v-model:mode="tableVisualMode"
            v-model:selected-column-index="selectedColumnIndex"
            v-model:selected-search-index="selectedSearchIndex"
            v-model:selected-action-index="selectedActionIndex"
            v-model:selected-action-field-index="selectedActionFieldIndex"
            v-model:selected-action-key="selectedActionKey"
            :page-columns="pageColumns"
            :search-schema="searchSchema"
            :configured-actions="configuredActions"
            :form-actions="formActions"
            :add-table-column="addTableColumn"
            :move-table-column="moveTableColumn"
            :remove-table-column="removeTableColumn"
            :update-column-type="updateColumnType"
            :update-column-tag-options="updateColumnTagOptions"
            :add-search-field="addSearchField"
            :move-search-field="moveSearchField"
            :remove-search-field="removeSearchField"
            :update-search-options="updateSearchOptions"
            :add-table-action="addTableAction"
            :move-table-action="moveTableAction"
            :remove-table-action="removeTableAction"
            :update-action-mode="updateActionMode"
            :add-action-field="addActionField"
            :move-action-field="moveActionField"
            :remove-action-field="removeActionField"
            :update-action-options="updateActionOptions"
          />
        </NCard>

        <TableRuntimePreview
          v-model:active-role="activeRole"
          v-model:table-preview-mode="tablePreviewMode"
          v-model:table-scale="tableScale"
          v-model:table-density="tableDensity"
          v-model:visible-column-keys="visibleColumnKeys"
          :search-schema="searchSchema"
          :search-model="searchModel"
          :columns="columns"
          :runtime-rows="runtimeRows"
          :preview-role-options="previewRoleOptions"
          :hidden-actions="hiddenActions"
          :configured-action-count="configuredActions.length"
          :column-order="columnOrder"
          :column-title-map="columnTitleMap"
          :get-number-range-value="getNumberRangeValue"
          :reset-table-preference="resetTablePreference"
          :move-preference-column="movePreferenceColumn"
          :open-permission-config="openPermissionConfig"
          :sortable-enabled="sortableEnabled"
          :sort-blocked-reason="sortBlockedReason"
          :sort-submitting="sortSubmitting"
          :sort-fail-next="sortFailNext"
          :handle-sort-reorder="handleSortReorder"
          :set-fail-next="setSortFailNext"
        />
      </div>

      <template v-else>
        <div class="editor-switch">
          <NRadioGroup v-model:value="editorMode" size="small">
            <NRadioButton value="visual">可视化设计</NRadioButton>
            <NRadioButton value="json">JSON Schema</NRadioButton>
          </NRadioGroup>
        </div>

        <div class="form-workspace">
          <FormConfigDesigner
            v-if="editorMode === 'visual'"
            v-model:selected-index="selectedIndex"
            :form-schema="formSchema"
            :selected-field="selectedField"
            :type-options="typeOptions"
            :add-field="addField"
            :move-field="moveField"
            :remove-field="removeField"
            :reset-form-schema="resetFormSchema"
            :open-rule-modal="openRuleModal"
            :update-options="updateOptions"
          />

          <NCard v-else title="form-schema.json" size="small" class="json-editor">
            <NInput v-model:value="formJson" type="textarea" :autosize="{ minRows: 18, maxRows: 28 }" />
            <div class="actions">
              <NButton @click="restore">恢复默认</NButton>
              <NButton type="primary" @click="applyJson">应用 JSON</NButton>
            </div>
          </NCard>

          <FormRuntimePreview
            :form-model="formModel"
            :form-errors="formErrors"
            :visible-fields="visibleFields"
            :submit-form="submitForm"
            :form-submitting="formSubmitting"
            :form-save-error="formSaveError"
            :has-lang-asset-group="hasLangAssetGroup"
            :fail-next-save="failNextSave"
            :set-fail-next="setFormFailNext"
          />
        </div>
      </template>
    </NCard>

    <NModal
      v-model:show="pageCreateModalVisible"
      preset="card"
      :title="pageMetaModalMode === 'create' ? '新增配置页面' : '编辑配置页面'"
      style="width: min(720px, calc(100vw - 32px))"
    >
      <NAlert type="info" :bordered="false" class="modal-tip">
        这里维护的是页面配置元数据，发布后会进入权限树；真实业务中可由后端按 routeKey 下发菜单、按钮与 Schema。
      </NAlert>
      <NForm label-placement="top" :model="newPageModel">
        <div class="page-meta-grid">
          <NFormItem label="页面名称">
            <NInput v-model:value="newPageModel.pageName" placeholder="例如：资金申请审核" />
          </NFormItem>
          <NFormItem label="页面类型">
            <NSelect v-model:value="newPageModel.pageType" :options="pageTypeOptions" />
          </NFormItem>
          <NFormItem label="页面标识">
            <NInput v-model:value="newPageModel.pageKey" placeholder="例如：fund-review" />
          </NFormItem>
          <NFormItem label="权限 routeKey" feedback="用于角色权限树和按钮鉴权，修改后需要重新发布配置并同步权限。">
            <NInput v-model:value="newPageModel.routeKey" placeholder="例如：fund_review" />
          </NFormItem>
          <NFormItem label="路由路径" feedback="用于菜单访问地址或运行时配置页路径。">
            <NInput v-model:value="newPageModel.routePath" placeholder="/demo/runtime/fund-review" />
          </NFormItem>
          <NFormItem v-if="pageMetaModalMode === 'create'" label="初始模板">
            <NSelect v-model:value="newPageModel.template" :options="pageTemplateSelectOptions" />
          </NFormItem>
        </div>
      </NForm>
      <template #footer>
        <div class="actions">
          <NButton @click="pageCreateModalVisible = false">取消</NButton>
          <NButton type="primary" @click="pageMetaModalMode === 'create' ? createPage() : savePageMeta()">
            {{ pageMetaModalMode === 'create' ? '加入草稿' : '保存页面信息' }}
          </NButton>
        </div>
      </template>
    </NModal>

    <NModal
      v-model:show="versionModalVisible"
      preset="card"
      title="配置版本管理"
      style="width: min(760px, calc(100vw - 32px))"
    >
      <NCard size="small" :bordered="false" class="version-summary">
        <div class="version-summary-row">
          <div>
            <NText strong>{{ hasUnpublishedChanges ? '当前草稿尚未发布' : '当前配置已发布' }}</NText>
            <div class="version-diff">
              {{ formatDelta(configDiff.pages, '页面', configDiff.pagesChanged) }}，{{
                formatDelta(configDiff.columns, '列', configDiff.columnsChanged)
              }}，{{ formatDelta(configDiff.search, '搜索项', configDiff.searchChanged) }}，{{
                formatDelta(configDiff.actions, '按钮', configDiff.actionsChanged)
              }}，{{ formatDelta(configDiff.fields, '字段', configDiff.fieldsChanged) }}
            </div>
          </div>
          <NSpace>
            <NButton :disabled="!hasUnpublishedChanges" @click="discardDraft">撤销草稿</NButton>
            <NButton
              type="primary"
              :disabled="!hasUnpublishedChanges"
              :loading="publishLoading"
              @click="publishConfiguration"
            >
              校验并发布
            </NButton>
          </NSpace>
        </div>
      </NCard>

      <NDivider>历史版本</NDivider>
      <NEmpty v-if="configVersions.length === 0" description="首次发布后生成版本记录" />
      <NList v-else bordered>
        <NListItem v-for="version in configVersions" :key="version.id">
          <NThing :title="`V${version.version}`" :description="`${version.publishedAt} · ${version.summary}`" />
          <template #suffix>
            <NButton size="small" secondary @click="rollbackVersion(version)">回滚到此版本</NButton>
          </template>
        </NListItem>
      </NList>
    </NModal>

    <NModal
      v-model:show="actionModalVisible"
      preset="card"
      :title="activeAction?.label"
      class="action-modal"
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
      <div v-else class="slot-preview">
        <NAlert type="info" :bordered="false">
          当前按钮使用自定义渲染扩展点，适合承载详情面板、配置面板或复杂业务流程。
        </NAlert>
        <div class="slot-business-panel">
          <div class="slot-business-header">
            <div>
              <span class="slot-eyebrow">CUSTOM RENDER</span>
              <h3>{{ activeAction?.label }}面板</h3>
              <p>{{ activeRow?.title }} · {{ activeRow?.tenant }}</p>
            </div>
            <NTag :type="activeRow?.risk === '高' ? 'error' : activeRow?.risk === '中' ? 'warning' : 'success'">
              风险{{ activeRow?.risk }}
            </NTag>
          </div>
          <div class="slot-metric-grid">
            <div>
              <span>申请编号</span>
              <strong>{{ activeRow?.id }}</strong>
            </div>
            <div>
              <span>申请状态</span>
              <strong>{{ activeRow?.status }}</strong>
            </div>
            <div>
              <span>申请金额</span>
              <strong>{{ activeRow?.amount ? `¥${activeRow.amount.toLocaleString()}` : '-' }}</strong>
            </div>
          </div>
          <div class="slot-flow">
            <span>自定义处理流</span>
            <NTag size="small" :bordered="false">读取行数据</NTag>
            <NTag size="small" :bordered="false" type="info">渲染业务面板</NTag>
            <NTag size="small" :bordered="false" type="success">提交自定义动作</NTag>
          </div>
        </div>
        <NDescriptions :column="2" label-placement="left" bordered class="slot-content">
          <NDescriptionsItem label="执行模式">自定义 Slot</NDescriptionsItem>
          <NDescriptionsItem label="扩展点">{{ activeAction?.slot || activeAction?.key }}</NDescriptionsItem>
          <NDescriptionsItem label="按钮标识">{{ activeAction?.key }}</NDescriptionsItem>
          <NDescriptionsItem label="权限标识">{{ activeAction?.permission || '无需鉴权' }}</NDescriptionsItem>
        </NDescriptions>
      </div>
      <template #footer>
        <div class="actions">
          <NButton @click="actionModalVisible = false">取消</NButton>
          <NButton v-if="activeAction?.mode === 'form'" type="primary" @click="submitTableAction">提交</NButton>
        </div>
      </template>
    </NModal>

    <FormRuleModal
      v-model:show="ruleModalVisible"
      :selected-field="selectedField"
      :condition-field-options="conditionFieldOptions"
      :clear-condition="clearCondition"
      :save-rules="saveRules"
    />
  </div>
</template>

<style scoped>
.page-config-root {
  min-width: 0;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  margin-top: 16px;
  border: 1px solid #e6e8f0;
  border-radius: 8px;
  background: #fafbff;
}

.page-toolbar-main {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.toolbar-label {
  color: #64748b;
  font-size: 14px;
}

.page-select {
  width: 220px;
}

.modal-tip {
  margin-bottom: 16px;
}

.page-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 16px;
}

.mode-switch,
.editor-switch {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.table-layout {
  display: grid;
  grid-template-columns: minmax(340px, 460px) 1fr;
  gap: 16px;
  margin-top: 16px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.form-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(380px, 0.85fr);
  gap: 16px;
  align-items: start;
  margin-top: 16px;
}

.form-workspace .json-editor {
  margin-top: 0;
}

.action-modal {
  width: min(620px, calc(100vw - 32px));
}

.slot-preview {
  display: grid;
  gap: 16px;
}

.slot-business-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid color-mix(in srgb, #6366f1 18%, transparent);
  border-radius: 8px;
  background: linear-gradient(180deg, color-mix(in srgb, #6366f1 9%, transparent), transparent);
}

.slot-business-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.slot-business-header h3 {
  margin: 4px 0;
  font-size: 20px;
  letter-spacing: 0;
}

.slot-business-header p {
  margin: 0;
  color: rgba(128, 128, 128, 0.95);
}

.slot-eyebrow {
  color: #6366f1;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.slot-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.slot-metric-grid > div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
}

.slot-metric-grid span,
.slot-flow > span {
  color: rgba(128, 128, 128, 0.95);
  font-size: 12px;
}

.slot-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.slot-content {
  margin-top: 4px;
}

.draft-alert {
  margin-top: 12px;
}

.version-summary {
  background: rgba(99, 102, 241, 0.05);
}

.version-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.version-diff {
  margin-top: 6px;
  color: rgba(128, 128, 128, 0.95);
  font-size: 13px;
}

@media (max-width: 1100px) {
  .designer,
  .table-layout,
  .form-workspace {
    grid-template-columns: 1fr;
  }

  .form-workspace .preview-card {
    position: static;
  }
}

@media (max-width: 700px) {
  .page-meta-grid,
  .field-grid,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .field-row.wide,
  .preview-grid .wide {
    grid-column: auto;
  }

  .version-summary-row {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 600px) {
  .form-workspace .palette {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
