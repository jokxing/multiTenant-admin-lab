<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';

defineOptions({ name: 'DemoHomeComposer' });

type ModuleType = 'hero-banner' | 'notice-ticker' | 'quick-nav' | 'content-grid' | 'benefit-cards';
type HomeModule = {
  id: string;
  type: ModuleType;
  title: string;
  visible: boolean;
  locked?: boolean;
  props: { heading?: string; description?: string; items?: string[] };
};
type HomeSchema = {
  version: 1;
  name: string;
  theme: { primary: string; background: string };
  modules: HomeModule[];
};
type ConfigVersion = { id: string; version: number; publishedAt: string; snapshot: HomeSchema };

const catalog: Array<{ type: ModuleType; label: string; description: string; icon: string }> = [
  { type: 'hero-banner', label: '主视觉横幅', description: '品牌信息与行动入口', icon: 'mdi:image-outline' },
  { type: 'notice-ticker', label: '公告栏', description: '滚动展示服务动态', icon: 'mdi:bullhorn-outline' },
  { type: 'quick-nav', label: '快捷入口', description: '常用栏目快速导航', icon: 'mdi:view-grid-outline' },
  { type: 'content-grid', label: '推荐内容', description: '卡片式内容推荐区域', icon: 'mdi:view-dashboard-outline' },
  {
    type: 'benefit-cards',
    label: '会员权益',
    description: '会员服务与权益展示',
    icon: 'mdi:card-account-details-outline'
  }
];

const defaultSchema: HomeSchema = {
  version: 1,
  name: '城市生活会员首页',
  theme: { primary: '#2563eb', background: '#f4f6f8' },
  modules: [
    {
      id: 'hero',
      type: 'hero-banner',
      title: '主视觉横幅',
      visible: true,
      locked: true,
      props: { heading: '让日常服务更简单', description: '精选内容、会员权益与城市活动，一站触达。' }
    },
    { id: 'notice', type: 'notice-ticker', title: '公告栏', visible: true, props: { heading: '本周城市活动已更新' } },
    {
      id: 'nav',
      type: 'quick-nav',
      title: '快捷入口',
      visible: true,
      props: { heading: '快捷服务', items: ['城市活动', '生活指南', '会员中心', '服务预约'] }
    },
    {
      id: 'featured',
      type: 'content-grid',
      title: '推荐内容',
      visible: true,
      props: { heading: '今日推荐', items: ['周末灵感', '人气展览', '城市漫步', '品质餐厅'] }
    },
    {
      id: 'benefits',
      type: 'benefit-cards',
      title: '会员权益',
      visible: true,
      props: { heading: '专属权益', items: ['优先预约', '活动提醒', '积分好礼'] }
    }
  ]
};

const draftKey = 'mtal_home_composer_draft';
const publishedKey = 'mtal_home_composer_published';
const versionsKey = 'mtal_home_composer_versions';
const previewBaseUrl = `${import.meta.env.VITE_MOBILE_RUNTIME_URL || 'http://localhost:4180'}/home`;
const previewUrl = `${previewBaseUrl}?preview=1&parentOrigin=${encodeURIComponent(window.location.origin)}`;
const previewOrigin = new URL(previewBaseUrl).origin;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

const schema = ref(readStorage(draftKey, clone(defaultSchema)));
const publishedSchema = ref(readStorage(publishedKey, clone(defaultSchema)));
const versions = ref<ConfigVersion[]>(readStorage(versionsKey, []));
const selectedId = ref(schema.value.modules[0]?.id || '');
const editorMode = ref<'visual' | 'json'>('visual');
const jsonText = ref(JSON.stringify(schema.value, null, 2));
const jsonError = ref('');
const iframeRef = ref<HTMLIFrameElement>();
const previewReady = ref(false);
const versionDrawerVisible = ref(false);

const selectedModule = computed(() => schema.value.modules.find(item => item.id === selectedId.value));
const hasChanges = computed(() => JSON.stringify(schema.value) !== JSON.stringify(publishedSchema.value));
const visibleCount = computed(() => schema.value.modules.filter(item => item.visible).length);

function sendPreview() {
  iframeRef.value?.contentWindow?.postMessage(
    {
      channel: 'mobile-home-composer',
      type: 'SCHEMA_UPDATE',
      payload: clone(schema.value)
    },
    previewOrigin
  );
}

function handleMessage(event: MessageEvent) {
  if (event.origin !== previewOrigin || event.source !== iframeRef.value?.contentWindow) return;
  if (event.data?.channel === 'mobile-home-composer' && event.data?.type === 'PREVIEW_READY') {
    previewReady.value = true;
    sendPreview();
  }
}

watch(
  schema,
  () => {
    localStorage.setItem(draftKey, JSON.stringify(schema.value));
    jsonText.value = JSON.stringify(schema.value, null, 2);
    nextTick(sendPreview);
  },
  { deep: true }
);

window.addEventListener('message', handleMessage);
onBeforeUnmount(() => window.removeEventListener('message', handleMessage));

function addModule(type: ModuleType) {
  const meta = catalog.find(item => item.type === type)!;
  const supportsItems = ['quick-nav', 'content-grid', 'benefit-cards'].includes(type);
  const module: HomeModule = {
    id: `${type}-${Date.now()}`,
    type,
    title: meta.label,
    visible: true,
    props: {
      heading: meta.label,
      description: meta.description,
      items: supportsItems ? ['内容一', '内容二', '内容三'] : undefined
    }
  };
  schema.value.modules.push(module);
  selectedId.value = module.id;
}

function moveModule(index: number, offset: number) {
  const nextIndex = index + offset;
  const item = schema.value.modules[index];
  if (!item || item.locked || nextIndex < 0 || nextIndex >= schema.value.modules.length) return;
  schema.value.modules.splice(index, 1);
  schema.value.modules.splice(nextIndex, 0, item);
}

function removeModule(item: HomeModule) {
  if (item.locked) return;
  schema.value.modules = schema.value.modules.filter(module => module.id !== item.id);
  selectedId.value = schema.value.modules[0]?.id || '';
}

function updateItems(value: string) {
  if (!selectedModule.value) return;
  selectedModule.value.props.items = value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function applyJson() {
  try {
    const value = JSON.parse(jsonText.value) as HomeSchema;
    if (value.version !== 1 || !Array.isArray(value.modules)) throw new Error('配置协议缺少 version 或 modules');
    const supportedTypes = new Set(catalog.map(item => item.type));
    if (value.modules.some(item => !supportedTypes.has(item.type))) throw new Error('包含未注册的组件类型');
    schema.value = value;
    selectedId.value = value.modules[0]?.id || '';
    jsonError.value = '';
    window.$message?.success('JSON 配置已应用');
  } catch (error) {
    jsonError.value = error instanceof Error ? error.message : 'JSON 格式错误';
  }
}

function publishConfig() {
  const nextVersion = (versions.value[0]?.version || 0) + 1;
  const record: ConfigVersion = {
    id: `home_version_${Date.now()}`,
    version: nextVersion,
    publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    snapshot: clone(schema.value)
  };
  versions.value.unshift(record);
  publishedSchema.value = clone(schema.value);
  localStorage.setItem(publishedKey, JSON.stringify(publishedSchema.value));
  localStorage.setItem(versionsKey, JSON.stringify(versions.value));
  window.$message?.success(`首页配置 V${nextVersion} 已发布`);
}

function rollback(version: ConfigVersion) {
  schema.value = clone(version.snapshot);
  selectedId.value = schema.value.modules[0]?.id || '';
  versionDrawerVisible.value = false;
  window.$message?.success(`已恢复 V${version.version}，发布后生效`);
}

function resetDraft() {
  schema.value = clone(publishedSchema.value);
  selectedId.value = schema.value.modules[0]?.id || '';
}
</script>

<template>
  <div class="composer-page">
    <NCard :bordered="false" class="page-card">
      <div class="page-header">
        <div>
          <h1>移动首页编排</h1>
          <p>配置运营首页模块并实时预览移动端效果。</p>
        </div>
        <NSpace>
          <NTag :type="hasChanges ? 'warning' : 'success'" :bordered="false">
            {{ hasChanges ? '有未发布变更' : `已发布 V${versions[0]?.version || 0}` }}
          </NTag>
          <NButton @click="versionDrawerVisible = true">
            <template #icon><SvgIcon icon="mdi:history" /></template>
            版本记录
          </NButton>
          <NButton type="primary" :disabled="!hasChanges" @click="publishConfig">
            <template #icon><SvgIcon icon="mdi:cloud-upload-outline" /></template>
            发布配置
          </NButton>
        </NSpace>
      </div>

      <NAlert type="info" :bordered="false">
        配置协议 V{{ schema.version }} · {{ schema.modules.length }} 个模块 · {{ visibleCount }} 个展示中
      </NAlert>

      <div class="composer-layout">
        <NCard title="页面结构" size="small" class="structure-card">
          <template #header-extra>
            <NButton text type="primary" :disabled="!hasChanges" @click="resetDraft">撤销变更</NButton>
          </template>

          <div class="catalog-grid">
            <NButton v-for="item in catalog" :key="item.type" class="catalog-button" @click="addModule(item.type)">
              <template #icon><SvgIcon :icon="item.icon" /></template>
              {{ item.label }}
            </NButton>
          </div>

          <NDivider>模块顺序</NDivider>
          <div class="module-list">
            <div
              v-for="(item, index) in schema.modules"
              :key="item.id"
              class="module-item"
              :class="{ active: selectedId === item.id }"
              @click="selectedId = item.id"
            >
              <SvgIcon icon="mdi:drag-vertical" class="drag-icon" />
              <div class="module-summary">
                <strong>{{ item.title }}</strong>
                <span>{{ item.type }}</span>
              </div>
              <NTag v-if="item.locked" size="small" :bordered="false">锁定</NTag>
              <NButton
                quaternary
                circle
                size="small"
                :title="item.visible ? '隐藏' : '显示'"
                @click.stop="item.visible = !item.visible"
              >
                <template #icon><SvgIcon :icon="item.visible ? 'mdi:eye-outline' : 'mdi:eye-off-outline'" /></template>
              </NButton>
              <NButton
                quaternary
                circle
                size="small"
                title="上移"
                :disabled="index === 0 || item.locked"
                @click.stop="moveModule(index, -1)"
              >
                <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
              </NButton>
              <NButton
                quaternary
                circle
                size="small"
                title="下移"
                :disabled="index === schema.modules.length - 1 || item.locked"
                @click.stop="moveModule(index, 1)"
              >
                <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
              </NButton>
              <NButton
                quaternary
                circle
                size="small"
                type="error"
                title="删除"
                :disabled="item.locked"
                @click.stop="removeModule(item)"
              >
                <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
              </NButton>
            </div>
          </div>
        </NCard>

        <NCard title="移动端实时预览" size="small" class="preview-card">
          <template #header-extra>
            <NTag size="small" :type="previewReady ? 'success' : 'warning'" :bordered="false">
              {{ previewReady ? '预览已连接' : '等待移动端' }}
            </NTag>
          </template>
          <div class="phone-shell">
            <div class="phone-speaker" />
            <iframe ref="iframeRef" :src="previewUrl" title="移动首页实时预览" @load="sendPreview" />
          </div>
          <NButton text type="primary" tag="a" :href="previewBaseUrl" target="_blank">
            <template #icon><SvgIcon icon="mdi:open-in-new" /></template>
            独立打开移动端
          </NButton>
        </NCard>

        <NCard title="配置属性" size="small" class="property-card">
          <template #header-extra>
            <NButtonGroup size="small">
              <NButton :type="editorMode === 'visual' ? 'primary' : 'default'" @click="editorMode = 'visual'">
                可视化
              </NButton>
              <NButton :type="editorMode === 'json' ? 'primary' : 'default'" @click="editorMode = 'json'">JSON</NButton>
            </NButtonGroup>
          </template>

          <template v-if="editorMode === 'visual'">
            <NForm label-placement="top" size="small">
              <NDivider title-placement="left">页面设置</NDivider>
              <NFormItem label="页面名称"><NInput v-model:value="schema.name" /></NFormItem>
              <div class="theme-fields">
                <NFormItem label="主题色">
                  <NColorPicker v-model:value="schema.theme.primary" :show-alpha="false" />
                </NFormItem>
                <NFormItem label="背景色">
                  <NColorPicker v-model:value="schema.theme.background" :show-alpha="false" />
                </NFormItem>
              </div>

              <template v-if="selectedModule">
                <NDivider title-placement="left">{{ selectedModule.title }}</NDivider>
                <NFormItem label="组件名称"><NInput v-model:value="selectedModule.title" /></NFormItem>
                <NFormItem label="主标题"><NInput v-model:value="selectedModule.props.heading" /></NFormItem>
                <NFormItem label="说明文字">
                  <NInput
                    v-model:value="selectedModule.props.description"
                    type="textarea"
                    :rows="3"
                    placeholder="选填"
                  />
                </NFormItem>
                <NFormItem v-if="selectedModule.props.items" label="内容项（每行一项）">
                  <NInput
                    :value="selectedModule.props.items.join('\n')"
                    type="textarea"
                    :rows="5"
                    @update:value="updateItems"
                  />
                </NFormItem>
                <div class="switch-row">
                  <div>
                    <strong>展示模块</strong>
                    <span>关闭后保留配置，但移动端不渲染</span>
                  </div>
                  <NSwitch v-model:value="selectedModule.visible" />
                </div>
              </template>
            </NForm>
          </template>
          <template v-else>
            <NInput
              v-model:value="jsonText"
              type="textarea"
              :autosize="{ minRows: 24, maxRows: 24 }"
              class="json-editor"
            />
            <NAlert v-if="jsonError" type="error" :bordered="false" class="json-error">{{ jsonError }}</NAlert>
            <NButton type="primary" block class="apply-button" @click="applyJson">应用 JSON</NButton>
          </template>
        </NCard>
      </div>
    </NCard>

    <NDrawer v-model:show="versionDrawerVisible" :width="420">
      <NDrawerContent title="首页配置版本">
        <NEmpty v-if="versions.length === 0" description="首次发布后生成版本记录" />
        <NTimeline v-else>
          <NTimelineItem
            v-for="version in versions"
            :key="version.id"
            :title="`V${version.version}`"
            :time="version.publishedAt"
          >
            <NButton text type="primary" @click="rollback(version)">恢复此版本</NButton>
          </NTimelineItem>
        </NTimeline>
      </NDrawerContent>
    </NDrawer>
  </div>
</template>

<style scoped>
.composer-page {
  min-width: 0;
}
.page-card {
  min-height: calc(100vh - 130px);
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.page-header h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: 0;
}
.page-header p {
  margin: 6px 0 0;
  color: rgb(var(--text-color-3));
}
.composer-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1fr) 430px minmax(320px, 0.85fr);
  gap: 16px;
  margin-top: 16px;
  align-items: start;
}
.structure-card,
.preview-card,
.property-card {
  min-height: 720px;
}
.catalog-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.catalog-button {
  justify-content: flex-start;
}
.module-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.module-item {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto repeat(4, 28px);
  align-items: center;
  gap: 5px;
  min-height: 58px;
  padding: 9px;
  border: 1px solid rgb(var(--border-color));
  border-radius: 6px;
  cursor: pointer;
}
.module-item.active {
  border-color: rgb(var(--primary-color));
  background: rgba(var(--primary-color), 0.06);
  box-shadow: inset 3px 0 rgb(var(--primary-color));
}
.drag-icon {
  color: rgb(var(--text-color-3));
}
.module-summary {
  display: grid;
  min-width: 0;
  gap: 3px;
}
.module-summary span {
  overflow: hidden;
  color: rgb(var(--text-color-3));
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-card :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  background: rgba(var(--body-color), 0.5);
}
.phone-shell {
  position: relative;
  width: 390px;
  height: 670px;
  padding: 13px 8px 8px;
  border: 7px solid #20242a;
  border-radius: 30px;
  background: #20242a;
  box-shadow: 0 16px 32px rgba(31, 41, 55, 0.18);
  overflow: hidden;
}
.phone-shell iframe {
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 18px;
  background: #fff;
}
.phone-speaker {
  position: absolute;
  z-index: 2;
  top: 8px;
  left: 50%;
  width: 72px;
  height: 5px;
  border-radius: 5px;
  background: #474c53;
  transform: translateX(-50%);
}
.theme-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 6px;
  background: rgba(var(--body-color), 0.7);
}
.switch-row > div {
  display: grid;
  gap: 3px;
}
.switch-row span {
  color: rgb(var(--text-color-3));
  font-size: 12px;
}
.json-editor {
  font-family: Consolas, monospace;
}
.json-error,
.apply-button {
  margin-top: 12px;
}
@media (max-width: 1380px) {
  .composer-layout {
    grid-template-columns: minmax(340px, 1fr) 420px;
  }
  .property-card {
    grid-column: 1 / -1;
    min-height: auto;
  }
}
@media (max-width: 900px) {
  .composer-layout {
    grid-template-columns: 1fr;
  }
  .property-card {
    grid-column: auto;
  }
  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .structure-card,
  .preview-card {
    min-height: auto;
  }
}
@media (max-width: 520px) {
  .phone-shell {
    width: 100%;
  }
  .catalog-grid,
  .theme-fields {
    grid-template-columns: 1fr;
  }
  .module-item {
    grid-template-columns: 20px minmax(0, 1fr) repeat(4, 28px);
  }
  .module-item .n-tag {
    display: none;
  }
}
</style>
