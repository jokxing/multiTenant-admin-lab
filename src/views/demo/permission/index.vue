<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  activeRole,
  currentProfile,
  roleProfiles,
  type DemoAction,
  type DemoRole,
  type RouteKeyRecord
} from '../shared';
import { PAGE_CONFIG_STORAGE_KEYS } from '../page-config/constants';
import type { ConfigSnapshot, LegacyConfigSnapshot, PageConfig } from '../page-config/types';

defineOptions({ name: 'DemoPermission' });

const router = useRouter();

const checkedKeys = ref<string[]>([]);
const publishedKeys = ref<string[]>([]);
/** 加载角色时的完整权限基线（含权限树未展示的按钮），用于草稿合并与撤销。 */
const publishedRecords = ref<RouteKeyRecord[]>([]);
const auditLogs = ref<Array<{ time: string; role: string; summary: string }>>([]);
const configuredPages = ref<PageConfig[]>(loadConfiguredPages());

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

function loadConfiguredPages() {
  const snapshot = loadStoredValue<ConfigSnapshot | LegacyConfigSnapshot>(PAGE_CONFIG_STORAGE_KEYS.published);
  if (snapshot && 'pages' in snapshot && Array.isArray(snapshot.pages)) return cloneJson(snapshot.pages);
  if (snapshot && 'table' in snapshot) {
    return [
      {
        pageKey: 'review',
        pageName: '申请审核列表',
        routeKey: 'review',
        routePath: '/demo/runtime/review',
        pageType: 'table-form',
        table: snapshot.table,
        form: snapshot.form,
        search: snapshot.search || []
      } satisfies PageConfig
    ];
  }

  return [];
}

function refreshConfiguredPages() {
  configuredPages.value = loadConfiguredPages();
  loadRole(activeRole.value);
  window.$message?.success('已刷新页面配置');
}

/** 从已发布 PageConfig 发现权限点：表格操作 + 可选 savePermission；同一权限键去重。 */
function collectPagePermissionChildren(page: PageConfig) {
  const actions = page.table.find(column => column.type === 'action')?.actions || [];
  const seen = new Set<string>();
  const children: Array<{ label: string; key: string }> = [];

  actions.forEach(action => {
    if (!action.permission || seen.has(action.permission)) return;
    seen.add(action.permission);
    children.push({ label: action.label, key: `${page.routeKey}:${action.permission}` });
  });

  // 仅当页面显式声明 savePermission 时增加「保存」节点；与表格操作同键则跳过
  if (page.savePermission && !seen.has(page.savePermission)) {
    seen.add(page.savePermission);
    children.push({ label: '保存', key: `${page.routeKey}:${page.savePermission}` });
  }

  return children;
}

const schemaActionNodes = computed(() => {
  const seen = new Set<string>();
  const nodes: Array<{ label: string; key: string }> = [];

  configuredPages.value.forEach(page => {
    collectPagePermissionChildren(page).forEach(child => {
      const permission = child.key.split(':')[1];
      if (!permission || seen.has(permission)) return;
      seen.add(permission);
      nodes.push({ label: child.label, key: permission });
    });
  });

  return nodes;
});

const configuredPageNodes = computed(() =>
  configuredPages.value.map(page => ({
    label: page.pageName,
    key: page.routeKey,
    children: collectPagePermissionChildren(page)
  }))
);

const permissionTree = computed(() => [
  {
    label: '工作台',
    key: 'workspace',
    children: [{ label: '导出数据', key: 'workspace:export' }]
  },
  {
    label: '运营配置',
    key: 'operations',
    children: [
      { label: '新增', key: 'operations:add' },
      { label: '编辑', key: 'operations:edit' },
      { label: '删除', key: 'operations:delete' },
      { label: '导出', key: 'operations:export' }
    ]
  },
  ...configuredPageNodes.value,
  {
    label: '页面配置器',
    key: 'page_setting',
    children: [
      { label: '新增页面', key: 'page_setting:add' },
      { label: '编辑 JSON', key: 'page_setting:edit' }
    ]
  },
  {
    label: '移动首页编排',
    key: 'home_composer',
    children: [
      { label: '编辑版式', key: 'home_composer:edit' },
      { label: '发布配置', key: 'home_composer:publish' },
      { label: '版本回滚', key: 'home_composer:rollback' }
    ]
  },
  {
    label: '营销活动编排',
    key: 'campaign_studio',
    children: [
      { label: '新增活动', key: 'campaign_studio:add' },
      { label: '编辑规则', key: 'campaign_studio:edit' },
      { label: '发布活动', key: 'campaign_studio:publish' }
    ]
  }
]);

/** 权限树中实际可勾选的键；树外既有权限不进勾选态，合并草稿时原样保留。 */
const visiblePermissionKeys = computed(() => {
  const keys = new Set<string>();
  permissionTree.value.forEach(route => {
    keys.add(route.key);
    (route.children || []).forEach(child => keys.add(child.key));
  });
  return keys;
});

const roleOptions = Object.entries(roleProfiles).map(([value, profile]) => ({ label: profile.label, value }));

function recordsToKeys(records: RouteKeyRecord[]) {
  return records.flatMap(route => [route.key, ...route.buttons.map(button => `${route.key}:${button}`)]);
}

function syncCheckedKeysFromPublished() {
  const visible = visiblePermissionKeys.value;
  checkedKeys.value = publishedKeys.value.filter(key => visible.has(key));
}

/**
 * 按「可见权限以勾选为准、树外权限保留」合并草稿。
 * - 父节点勾选不授予子按钮（依赖 cascade=false）
 * - 可见子节点取消勾选 → 从草稿移除对应按钮
 * - 树未展示的既有按钮（如 approve、export）保留，不被无条件覆盖
 */
function buildDraftRouteKeys(checked: string[], baseline: RouteKeyRecord[]): RouteKeyRecord[] {
  const checkedSet = new Set(checked);
  const treeByRoute = new Map(permissionTree.value.map(route => [route.key, route]));
  const result: RouteKeyRecord[] = [];
  const handled = new Set<string>();

  baseline.forEach(record => {
    const treeNode = treeByRoute.get(record.key);
    if (!treeNode) {
      result.push({ key: record.key, title: record.title, buttons: [...record.buttons] });
      handled.add(record.key);
      return;
    }

    const visibleButtons = new Set((treeNode.children || []).map(child => child.key.split(':')[1]));
    const preservedButtons = record.buttons.filter(button => !visibleButtons.has(button));
    const checkedVisibleButtons = (treeNode.children || [])
      .filter(child => checkedSet.has(child.key))
      .map(child => child.key.split(':')[1] as DemoAction);
    const buttons = [...new Set([...preservedButtons, ...checkedVisibleButtons])];
    const keepRoute = checkedSet.has(record.key) || buttons.length > 0;

    if (keepRoute) {
      result.push({ key: record.key, title: treeNode.label || record.title, buttons });
    }
    handled.add(record.key);
  });

  permissionTree.value.forEach(treeNode => {
    if (handled.has(treeNode.key)) return;
    const checkedVisibleButtons = (treeNode.children || [])
      .filter(child => checkedSet.has(child.key))
      .map(child => child.key.split(':')[1] as DemoAction);
    if (!checkedSet.has(treeNode.key) && checkedVisibleButtons.length === 0) return;
    result.push({
      key: treeNode.key,
      title: treeNode.label,
      buttons: checkedVisibleButtons
    });
  });

  return result;
}

function loadRole(role: DemoRole) {
  const records = cloneJson(roleProfiles[role].routeKeys);
  publishedRecords.value = records;
  publishedKeys.value = recordsToKeys(records);
  syncCheckedKeysFromPublished();
}

watch(activeRole, role => loadRole(role), { immediate: true });

watch(visiblePermissionKeys, () => {
  // 刷新页面配置后，仅同步可见勾选，不改动已发布基线中的隐藏权限
  syncCheckedKeysFromPublished();
});

const draftRouteKeys = computed(() => buildDraftRouteKeys(checkedKeys.value, publishedRecords.value));
const effectiveDraftKeys = computed(() => recordsToKeys(draftRouteKeys.value));
const addedKeys = computed(() => effectiveDraftKeys.value.filter(key => !publishedKeys.value.includes(key)));
const removedKeys = computed(() => publishedKeys.value.filter(key => !effectiveDraftKeys.value.includes(key)));
const hasChanges = computed(() => addedKeys.value.length > 0 || removedKeys.value.length > 0);

function resetCheckedKeys() {
  syncCheckedKeysFromPublished();
}

function savePermission() {
  const nextRecords = draftRouteKeys.value.map(route => ({
    ...route,
    buttons: [...route.buttons]
  }));
  roleProfiles[activeRole.value].routeKeys = nextRecords;
  const summary = `新增 ${addedKeys.value.length} 项，移除 ${removedKeys.value.length} 项`;
  publishedRecords.value = cloneJson(nextRecords);
  publishedKeys.value = recordsToKeys(nextRecords);
  syncCheckedKeysFromPublished();
  auditLogs.value.unshift({
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    role: currentProfile.value.label,
    summary
  });
  window.$message?.success('权限策略已发布，运行时 route_keys 已同步更新');
}
</script>

<template>
  <NCard title="角色权限配置闭环" :bordered="false">
    <template #header-extra>
      <NSpace align="center">
        <NButton size="small" secondary @click="refreshConfiguredPages">
          <template #icon><SvgIcon icon="mdi:refresh" /></template>
          刷新页面配置
        </NButton>
        <NSelect v-model:value="activeRole" class="role-select" :options="roleOptions" />
      </NSpace>
    </template>
    <NAlert type="info" :bordered="false">
      当前授权角色：{{ currentProfile.label }}。已从页面配置读取 {{ configuredPages.length }} 个页面，动态发现
      {{ schemaActionNodes.length }} 个按钮权限。
    </NAlert>

    <div class="permission-layout">
      <NCard title="权限树" size="small">
        <template #header-extra>
          <NTag :type="hasChanges ? 'warning' : 'success'" :bordered="false">
            {{ hasChanges ? '待发布' : '已同步' }}
          </NTag>
        </template>
        <NTree
          v-model:checked-keys="checkedKeys"
          block-line
          :cascade="false"
          checkable
          :data="permissionTree"
          key-field="key"
          label-field="label"
        />
        <div class="actions">
          <NButton :disabled="!hasChanges" @click="resetCheckedKeys">撤销变更</NButton>
          <NButton type="primary" :disabled="!hasChanges" @click="savePermission">发布权限策略</NButton>
        </div>
      </NCard>

      <NCard title="运行时协议" size="small">
        <NAlert v-if="hasChanges" type="warning" :bordered="false" class="change-alert">
          待发布：新增 {{ addedKeys.length }} 项，移除 {{ removedKeys.length }} 项
        </NAlert>
        <NCode
          language="json"
          :code="
            JSON.stringify(
              {
                role: currentProfile.label,
                route_keys: draftRouteKeys
              },
              null,
              2
            )
          "
        />
        <NButton
          class="verify-button"
          secondary
          type="primary"
          :disabled="hasChanges"
          @click="router.push('/demo/capability')"
        >
          <template #icon><SvgIcon icon="mdi:shield-check-outline" /></template>
          以该角色验证
        </NButton>
      </NCard>
    </div>

    <NCard title="策略发布审计" size="small" class="audit-card">
      <NEmpty v-if="auditLogs.length === 0" description="发布策略后生成审计记录" size="small" />
      <NList v-else>
        <NListItem v-for="log in auditLogs" :key="log.time">
          <NThing :title="`${log.role} · ${log.time}`" :description="log.summary" />
        </NListItem>
      </NList>
    </NCard>
  </NCard>
</template>

<style scoped>
.permission-layout {
  display: grid;
  grid-template-columns: minmax(280px, 420px) 1fr;
  gap: 16px;
  margin-top: 16px;
}

.role-select {
  width: 180px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.change-alert {
  margin-bottom: 12px;
}
.audit-card {
  margin-top: 16px;
}
.verify-button {
  margin-top: 16px;
}

@media (max-width: 900px) {
  .permission-layout {
    grid-template-columns: 1fr;
  }
}
</style>
