import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  activeRole,
  buildColumns,
  canUse,
  pageColumns,
  resetPageColumns,
  reviewRows,
  roleProfiles,
  type PageColumn,
  type TableAction
} from '../../shared';
import { PAGE_CONFIG_STORAGE_KEYS, defaultSearchSchema } from '../constants';
import type { SearchField } from '../types';

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

function createDefaultStatusOptions() {
  return [
    { label: '待审核', value: 1, type: 'info' as const },
    { label: '待补充', value: 2, type: 'warning' as const },
    { label: '已通过', value: 3, type: 'success' as const },
    { label: '拒绝', value: 4, type: 'error' as const }
  ];
}

function normalizePageColumns(columns: PageColumn[]) {
  return columns.map(column => {
    if (column.key === 'status' && column.type === 'tag' && !column.options?.length) {
      return { ...column, options: createDefaultStatusOptions() };
    }

    return column;
  });
}

export function useTableConfig() {
  const router = useRouter();
  const tableEditorMode = ref<'json' | 'visual'>('json');
  const tableVisualMode = ref<'columns' | 'search' | 'actions' | 'action-form'>('columns');
  const tablePreviewMode = ref<'config' | 'role'>('config');
  const searchSchema = ref<SearchField[]>(cloneJson(defaultSearchSchema));
  const tableJson = ref(JSON.stringify({ columns: pageColumns.value, search: searchSchema.value }, null, 2));
  const activeAction = ref<TableAction | null>(null);
  const activeRow = ref<Record<string, any> | null>(null);
  const actionModalVisible = ref(false);
  const actionModel = reactive<Record<string, any>>({});
  const selectedActionKey = ref('edit');
  const selectedActionFieldIndex = ref(0);
  const selectedColumnIndex = ref(0);
  const selectedActionIndex = ref(0);
  const selectedSearchIndex = ref(0);
  const searchModel = reactive<Record<string, any>>({});
  const tableScale = ref<4 | 200>(4);
  const tableDensity = ref<'small' | 'medium' | 'large'>('small');
  const storedTablePreference = loadStoredValue<{
    visible: string[];
    order: string[];
    density: 'small' | 'medium' | 'large';
  }>(PAGE_CONFIG_STORAGE_KEYS.tablePreference);

  if (storedTablePreference) tableDensity.value = storedTablePreference.density;

  const visibleColumnKeys = ref<string[]>(
    storedTablePreference?.visible || pageColumns.value.map(column => column.key)
  );
  const columnOrder = ref<string[]>(storedTablePreference?.order || pageColumns.value.map(column => column.key));
  const baseColumns = computed(() => buildColumns('review', executeTableAction, tablePreviewMode.value === 'role'));
  const columns = computed(() => {
    const columnMap = new Map(baseColumns.value.map((column: any) => [String(column.key), column]));
    return columnOrder.value
      .filter(key => visibleColumnKeys.value.includes(key))
      .map(key => columnMap.get(key))
      .filter(Boolean);
  });
  const configuredActions = computed(() => pageColumns.value.find(column => column.type === 'action')?.actions || []);
  const columnTitleMap = computed(() => new Map(pageColumns.value.map(column => [column.key, column.title])));
  const selectedColumn = computed(() => pageColumns.value[selectedColumnIndex.value]);
  const selectedAction = computed(() => configuredActions.value[selectedActionIndex.value]);
  const selectedSearchField = computed(() => searchSchema.value[selectedSearchIndex.value]);
  const hiddenActions = computed(() =>
    configuredActions.value.filter(action => action.permission && !canUse('review', action.permission))
  );
  const previewRoleOptions = Object.entries(roleProfiles).map(([value, profile]) => ({ label: profile.label, value }));
  const formActions = computed(
    () =>
      pageColumns.value.find(column => column.type === 'action')?.actions?.filter(action => action.mode === 'form') ||
      []
  );
  const selectedTableAction = computed(
    () => formActions.value.find(action => action.key === selectedActionKey.value) || formActions.value[0]
  );
  const selectedActionField = computed(() => selectedTableAction.value?.formSchema?.[selectedActionFieldIndex.value]);
  const runtimeRows = computed(() => {
    const rows =
      tableScale.value === 4
        ? reviewRows.value
        : Array.from({ length: 200 }, (_, index) => {
            const source = reviewRows.value[index % reviewRows.value.length];
            return { ...source, id: 1001 + index, title: `${source.title} ${String(index + 1).padStart(3, '0')}` };
          });
    return rows.filter(row =>
      searchSchema.value.every(field => {
        const value = searchModel[field.key];
        if (isEmptySearchValue(value)) return true;
        if (field.type === 'date-range') {
          if (!Array.isArray(value)) return true;
          const [start, end] = value as string[];
          const rowValue = String((row as any)[field.targetKey || field.key] ?? '');
          return (!start || rowValue >= start) && (!end || rowValue <= end);
        }
        if (field.type === 'number-range') {
          if (!Array.isArray(value)) return true;
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
    );
  });

  function createSearchValue(field: SearchField) {
    if (field.type === 'date-range') return null;
    if (field.type === 'number-range') return [null, null];

    return field.key === 'keyword' ? '' : null;
  }

  function isEmptySearchValue(value: any) {
    if (Array.isArray(value)) return value.every(item => item === '' || item == null);

    return value === '' || value == null;
  }

  function isSearchValueMatched(field: SearchField) {
    const value = searchModel[field.key];
    if (field.type === 'number-range') return Array.isArray(value);
    if (field.type === 'date-range')
      return value === null || (Array.isArray(value) && value.every(item => typeof item === 'string'));

    return !Array.isArray(value);
  }

  function syncSearchModel() {
    searchSchema.value.forEach(field => {
      if (!(field.key in searchModel) || !isSearchValueMatched(field))
        searchModel[field.key] = createSearchValue(field);
    });
    Object.keys(searchModel).forEach(key => {
      if (!searchSchema.value.some(field => field.key === key)) delete searchModel[key];
    });
  }

  function resetSearchModel() {
    Object.keys(searchModel).forEach(key => delete searchModel[key]);
    searchSchema.value.forEach(field => {
      searchModel[field.key] = createSearchValue(field);
    });
  }

  function getNumberRangeValue(key: string) {
    if (!Array.isArray(searchModel[key])) searchModel[key] = [null, null];

    return searchModel[key];
  }

  function syncTablePreference() {
    const keys = pageColumns.value.map(column => column.key).filter(Boolean);
    columnOrder.value = [...keys];
    visibleColumnKeys.value = [
      ...visibleColumnKeys.value.filter(key => keys.includes(key)),
      ...keys.filter(key => !visibleColumnKeys.value.includes(key))
    ];
  }

  function setTableConfig(columnsValue: PageColumn[], searchValue: SearchField[]) {
    pageColumns.value = normalizePageColumns(columnsValue);
    searchSchema.value = searchValue;
    syncStatusSearchOptions();
    resetSearchModel();
    tableJson.value = JSON.stringify({ columns: pageColumns.value, search: searchSchema.value }, null, 2);
  }

  function resetTableSchema() {
    resetPageColumns();
    searchSchema.value = cloneJson(defaultSearchSchema);
    resetSearchModel();
    tableJson.value = JSON.stringify({ columns: pageColumns.value, search: searchSchema.value }, null, 2);
  }

  function movePreferenceColumn(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= columnOrder.value.length) return;
    const [key] = columnOrder.value.splice(index, 1);
    columnOrder.value.splice(target, 0, key);
  }

  function resetTablePreference() {
    const keys = pageColumns.value.map(column => column.key);
    visibleColumnKeys.value = [...keys];
    columnOrder.value = [...keys];
    tableDensity.value = 'small';
  }

  function addActionField(type: 'input' | 'number' | 'select') {
    if (!selectedTableAction.value) return;
    selectedTableAction.value.formSchema ||= [];
    const field = `field_${Date.now().toString().slice(-5)}`;
    selectedTableAction.value.formSchema.push({
      field,
      label: type === 'input' ? '文本字段' : type === 'number' ? '数字字段' : '选择字段',
      type,
      required: false,
      options: type === 'select' ? [{ label: '选项一', value: 'option_1' }] : undefined
    });
    selectedActionFieldIndex.value = selectedTableAction.value.formSchema.length - 1;
  }

  function addTableColumn() {
    const actionIndex = pageColumns.value.findIndex(column => column.type === 'action');
    const insertIndex = actionIndex < 0 ? pageColumns.value.length : actionIndex;
    const column: PageColumn = { key: `field_${Date.now().toString().slice(-5)}`, title: '新列' };
    pageColumns.value.splice(insertIndex, 0, column);
    selectedColumnIndex.value = insertIndex;
  }

  function addSearchField(type: SearchField['type']) {
    const key = `search_${Date.now().toString().slice(-5)}`;
    const meta = {
      input: { label: '搜索字段', placeholder: '请输入关键词' },
      select: { label: '筛选字段', placeholder: '请选择' },
      'date-range': { label: '日期范围', placeholder: '请选择日期' },
      'number-range': { label: '数值范围', placeholder: '请输入数值范围' }
    }[type];
    searchSchema.value.push({
      key,
      label: meta.label,
      type,
      placeholder: meta.placeholder,
      targetKey: type === 'date-range' ? 'createdAt' : type === 'number-range' ? 'amount' : undefined,
      options: type === 'select' ? [{ label: '选项一', value: 'option_1' }] : undefined
    });
    searchModel[key] = createSearchValue(searchSchema.value[searchSchema.value.length - 1]);
    selectedSearchIndex.value = searchSchema.value.length - 1;
  }

  function removeSearchField(index: number) {
    const [field] = searchSchema.value.splice(index, 1);
    if (field) delete searchModel[field.key];
    selectedSearchIndex.value = Math.max(0, Math.min(selectedSearchIndex.value, searchSchema.value.length - 1));
  }

  function moveSearchField(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= searchSchema.value.length) return;
    const [field] = searchSchema.value.splice(index, 1);
    searchSchema.value.splice(target, 0, field);
    selectedSearchIndex.value = target;
  }

  function updateSearchOptions(text: string) {
    if (!selectedSearchField.value) return;
    selectedSearchField.value.options = text
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        const [label, value] = line.split('=').map(item => item.trim());
        return { label: label || `选项${index + 1}`, value: parseOptionValue(value || label || `option_${index + 1}`) };
      });
  }

  function removeTableColumn(index: number) {
    if (pageColumns.value[index]?.type === 'action') return window.$message?.warning('操作列请在操作按钮中配置');
    pageColumns.value.splice(index, 1);
    selectedColumnIndex.value = Math.max(0, Math.min(selectedColumnIndex.value, pageColumns.value.length - 1));
  }

  function moveTableColumn(index: number, offset: -1 | 1) {
    const target = index + offset;
    if (target < 0 || target >= pageColumns.value.length) return;
    if (pageColumns.value[index]?.type === 'action' || pageColumns.value[target]?.type === 'action') return;
    const [column] = pageColumns.value.splice(index, 1);
    pageColumns.value.splice(target, 0, column);
    selectedColumnIndex.value = target;
  }

  function updateColumnType(value: 'text' | 'tag' | 'amount') {
    if (!selectedColumn.value) return;
    if (value === 'text') {
      delete selectedColumn.value.type;
      delete selectedColumn.value.options;
      return;
    }
    selectedColumn.value.type = value;
    if (value === 'tag') {
      selectedColumn.value.options ||= createDefaultStatusOptions();
      syncStatusSearchOptions();
    } else {
      delete selectedColumn.value.options;
    }
  }

  function parseOptionValue(value: string) {
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);

    return value;
  }

  function updateColumnTagOptions(text: string) {
    if (!selectedColumn.value) return;
    selectedColumn.value.options = text
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        const [label, value, type] = line.split('=').map(item => item.trim());
        return {
          label: label || `状态${index + 1}`,
          value: parseOptionValue(value || label || String(index + 1)),
          type: ['default', 'info', 'success', 'warning', 'error'].includes(type) ? (type as any) : 'default'
        };
      });
    syncStatusSearchOptions();
  }

  function syncStatusSearchOptions() {
    const statusColumn = pageColumns.value.find(column => column.key === 'status' && column.type === 'tag');
    if (!statusColumn?.options?.length) return;
    const options = statusColumn.options.map(option => ({ label: option.label, value: option.value }));
    searchSchema.value.forEach(field => {
      if (field.type === 'select' && (field.key === 'status' || field.targetKey === 'status')) {
        if (JSON.stringify(field.options || []) !== JSON.stringify(options)) {
          field.options = cloneJson(options);
        }
      }
    });
  }

  function addTableAction() {
    const actionColumn = pageColumns.value.find(column => column.type === 'action');
    if (!actionColumn) return;
    actionColumn.actions ||= [];
    actionColumn.actions.push({
      key: `action_${Date.now().toString().slice(-5)}`,
      label: '新操作',
      mode: 'confirm',
      type: 'default',
      confirmText: '确认执行该操作？'
    });
    selectedActionIndex.value = actionColumn.actions.length - 1;
  }

  function removeTableAction(index: number) {
    const actionColumn = pageColumns.value.find(column => column.type === 'action');
    actionColumn?.actions?.splice(index, 1);
    selectedActionIndex.value = Math.max(
      0,
      Math.min(selectedActionIndex.value, (actionColumn?.actions?.length || 1) - 1)
    );
  }

  function moveTableAction(index: number, offset: -1 | 1) {
    const actions = pageColumns.value.find(column => column.type === 'action')?.actions;
    if (!actions) return;
    const target = index + offset;
    if (target < 0 || target >= actions.length) return;
    const [action] = actions.splice(index, 1);
    actions.splice(target, 0, action);
    selectedActionIndex.value = target;
  }

  function updateActionMode(mode: TableAction['mode']) {
    if (!selectedAction.value) return;
    selectedAction.value.mode = mode;
    if (mode === 'form') {
      selectedAction.value.formSchema ||= [];
      selectedActionKey.value = selectedAction.value.key;
    }
  }

  function removeActionField(index: number) {
    selectedTableAction.value?.formSchema?.splice(index, 1);
    selectedActionFieldIndex.value = Math.max(
      0,
      Math.min(selectedActionFieldIndex.value, (selectedTableAction.value?.formSchema?.length || 1) - 1)
    );
  }

  function moveActionField(index: number, offset: -1 | 1) {
    const fields = selectedTableAction.value?.formSchema;
    if (!fields) return;
    const target = index + offset;
    if (target < 0 || target >= fields.length) return;
    const [field] = fields.splice(index, 1);
    fields.splice(target, 0, field);
    selectedActionFieldIndex.value = target;
  }

  function updateActionOptions(text: string) {
    if (!selectedActionField.value) return;
    selectedActionField.value.options = text
      .split('\n')
      .map((label, index) => ({ label, value: `option_${index + 1}` }));
  }

  function executeTableAction(action: TableAction, row: Record<string, any>) {
    activeAction.value = action;
    activeRow.value = row;

    if (action.mode === 'confirm') {
      window.$dialog?.warning({
        title: action.label,
        content: action.confirmText || `确认执行“${action.label}”？`,
        positiveText: '确认',
        negativeText: '取消',
        onPositiveClick: () => window.$message?.success(`已执行：${action.label}`)
      });
      return;
    }

    Object.keys(actionModel).forEach(key => delete actionModel[key]);
    if (action.mode === 'form') {
      action.formSchema?.forEach(field => {
        actionModel[field.field] = row[field.field] ?? null;
      });
    }
    actionModalVisible.value = true;
  }

  function submitTableAction() {
    const missing = activeAction.value?.formSchema?.find(
      field => field.required && (actionModel[field.field] === '' || actionModel[field.field] == null)
    );
    if (missing) return window.$message?.warning(`请填写${missing.label}`);
    window.$message?.success(`已提交：${activeAction.value?.label}`);
    actionModalVisible.value = false;
  }

  function openPermissionConfig() {
    router.push('/demo/permission');
  }

  watch(
    [pageColumns, searchSchema],
    () => {
      syncStatusSearchOptions();
      syncSearchModel();
      tableJson.value = JSON.stringify({ columns: pageColumns.value, search: searchSchema.value }, null, 2);
    },
    { deep: true }
  );
  watch(
    pageColumns,
    () => {
      syncTablePreference();
    },
    { deep: true, immediate: true }
  );
  watch(
    [visibleColumnKeys, columnOrder, tableDensity],
    () =>
      localStorage.setItem(
        PAGE_CONFIG_STORAGE_KEYS.tablePreference,
        JSON.stringify({ visible: visibleColumnKeys.value, order: columnOrder.value, density: tableDensity.value })
      ),
    { deep: true }
  );

  syncSearchModel();

  return {
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
    resetSearchModel,
    resetTablePreference,
    resetTableSchema,
    runtimeRows,
    searchModel,
    searchSchema,
    selectedAction,
    selectedActionField,
    selectedActionFieldIndex,
    selectedActionIndex,
    selectedActionKey,
    selectedColumn,
    selectedColumnIndex,
    selectedSearchField,
    selectedSearchIndex,
    setTableConfig,
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
  };
}
