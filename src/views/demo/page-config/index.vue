<script setup lang="ts">
import { computed, ref } from 'vue';
import { pageColumns } from '../shared';
import { PAGE_CONFIG_STORAGE_KEYS, defaultSearchSchema } from './constants';
import FormConfigDesigner from './components/FormConfigDesigner.vue';
import FormRuleModal from './components/FormRuleModal.vue';
import FormRuntimePreview from './components/FormRuntimePreview.vue';
import TableConfigDesigner from './components/TableConfigDesigner.vue';
import TableRuntimePreview from './components/TableRuntimePreview.vue';
import { useFormConfig } from './composables/useFormConfig';
import { useTableConfig } from './composables/useTableConfig';
import type { ConfigSnapshot, ConfigVersion } from './types';

defineOptions({ name: 'DemoPageConfig' });

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
} = useTableConfig();

const {
  conditionFieldOptions,
  formErrors,
  formJson,
  formModel,
  formSchema,
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
  setFormConfig,
  submitForm,
  updateOptions
} = useFormConfig();

const versionModalVisible = ref(false);
const publishLoading = ref(false);

function createSnapshot(): ConfigSnapshot {
  return cloneJson({ table: pageColumns.value, form: formSchema.value, search: searchSchema.value });
}

const storedPublished = loadStoredValue<ConfigSnapshot>(PAGE_CONFIG_STORAGE_KEYS.published);
if (storedPublished) {
  setTableConfig(cloneJson(storedPublished.table), cloneJson(storedPublished.search || defaultSearchSchema));
  setFormConfig(cloneJson(storedPublished.form));
}

const publishedSnapshot = ref<ConfigSnapshot>(
  storedPublished
    ? { ...storedPublished, search: cloneJson(storedPublished.search || defaultSearchSchema) }
    : createSnapshot()
);
const configVersions = ref<ConfigVersion[]>(
  (loadStoredValue<ConfigVersion[]>(PAGE_CONFIG_STORAGE_KEYS.versions) || []).map(version => ({
    ...version,
    snapshot: { ...version.snapshot, search: cloneJson(version.snapshot.search || defaultSearchSchema) }
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

const currentSnapshot = computed(() => createSnapshot());
const hasUnpublishedChanges = computed(
  () => JSON.stringify(currentSnapshot.value) !== JSON.stringify(publishedSnapshot.value)
);
const configDiff = computed(() => {
  const publishedActions = publishedSnapshot.value.table.find(column => column.type === 'action')?.actions || [];
  const currentColumns = pageColumns.value.filter(column => column.type !== 'action');
  const publishedColumns = publishedSnapshot.value.table.filter(column => column.type !== 'action');
  return {
    columns: currentColumns.length - publishedColumns.length,
    actions: configuredActions.value.length - publishedActions.length,
    fields: formSchema.value.length - publishedSnapshot.value.form.length,
    search: searchSchema.value.length - (publishedSnapshot.value.search || defaultSearchSchema).length,
    columnsChanged: JSON.stringify(currentColumns) !== JSON.stringify(publishedColumns),
    actionsChanged: JSON.stringify(configuredActions.value) !== JSON.stringify(publishedActions),
    fieldsChanged: JSON.stringify(formSchema.value) !== JSON.stringify(publishedSnapshot.value.form),
    searchChanged:
      JSON.stringify(searchSchema.value) !== JSON.stringify(publishedSnapshot.value.search || defaultSearchSchema)
  };
});

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
      if (!Array.isArray(next)) throw new Error('表单配置必须是数组');
      setFormConfig(next);
    }
    window.$message?.success('Schema 已应用');
  } catch (error: any) {
    window.$message?.error(error.message || 'JSON 格式错误');
  }
}

function validateConfiguration() {
  const errors: string[] = [];
  const duplicateValues = (values: string[]) =>
    values.filter((value, index) => !value || values.indexOf(value) !== index);
  if (duplicateValues(pageColumns.value.map(column => column.key)).length) errors.push('表格列字段名存在空值或重复');
  if (duplicateValues(configuredActions.value.map(action => action.key)).length)
    errors.push('操作按钮标识存在空值或重复');
  if (duplicateValues(formSchema.value.map(field => field.field)).length) errors.push('页面表单字段名存在空值或重复');
  if (duplicateValues(searchSchema.value.map(field => field.key)).length) errors.push('搜索字段名存在空值或重复');
  configuredActions.value
    .filter(action => action.mode === 'form')
    .forEach(action => {
      const fields = action.formSchema || [];
      if (duplicateValues(fields.map(field => field.field)).length)
        errors.push(`“${action.label}”表单字段名存在空值或重复`);
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
  setTableConfig(cloneJson(version.snapshot.table), cloneJson(version.snapshot.search || defaultSearchSchema));
  setFormConfig(cloneJson(version.snapshot.form));
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
  setTableConfig(
    cloneJson(publishedSnapshot.value.table),
    cloneJson(publishedSnapshot.value.search || defaultSearchSchema)
  );
  setFormConfig(cloneJson(publishedSnapshot.value.form));
  window.$message?.success('未发布修改已撤销');
}

function restore() {
  if (configMode.value === 'table') resetTableSchema();
  else resetFormSchema();
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
        草稿差异：{{ formatDelta(configDiff.columns, '列', configDiff.columnsChanged) }}，{{
          formatDelta(configDiff.search, '搜索项', configDiff.searchChanged)
        }}，{{ formatDelta(configDiff.actions, '按钮', configDiff.actionsChanged) }}，{{
          formatDelta(configDiff.fields, '字段', configDiff.fieldsChanged)
        }}
      </NAlert>

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
          />
        </div>
      </template>
    </NCard>

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
              {{ formatDelta(configDiff.columns, '列', configDiff.columnsChanged) }}，{{
                formatDelta(configDiff.search, '搜索项', configDiff.searchChanged)
              }}，{{ formatDelta(configDiff.actions, '按钮', configDiff.actionsChanged) }}，{{
                formatDelta(configDiff.fields, '字段', configDiff.fieldsChanged)
              }}
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
