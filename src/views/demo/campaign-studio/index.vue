<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';

defineOptions({ name: 'DemoCampaignStudio' });

type CampaignType = 'onboarding' | 'check-in' | 'milestone' | 'member-benefit';
type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused';
type Campaign = {
  id: string;
  code: string;
  type: CampaignType;
  title: string;
  summary: string;
  category: string;
  status: CampaignStatus;
  visible: boolean;
  featured: boolean;
  startAt: string;
  endAt: string;
  audience: 'all' | 'new-member' | 'member' | 'premium';
  platforms: Array<'h5' | 'app' | 'pwa'>;
  theme: string;
  rules: { target: number; unit: string; benefit: string; steps: string[] };
};
type CampaignConfig = { version: 1; publishedVersion: number; categories: string[]; campaigns: Campaign[] };
type VersionRecord = { id: string; version: number; publishedAt: string; snapshot: CampaignConfig };

const typeRegistry: Array<{ value: CampaignType; label: string; description: string; icon: string; color: string }> = [
  {
    value: 'onboarding',
    label: '新人成长',
    description: '分步骤引导新会员完成关键动作',
    icon: 'mdi:account-star-outline',
    color: '#2563eb'
  },
  {
    value: 'check-in',
    label: '连续签到',
    description: '按连续天数累计任务进度',
    icon: 'mdi:calendar-check-outline',
    color: '#0f766e'
  },
  {
    value: 'milestone',
    label: '里程碑挑战',
    description: '完成阶段目标并解锁权益',
    icon: 'mdi:flag-checkered',
    color: '#b45309'
  },
  {
    value: 'member-benefit',
    label: '会员权益',
    description: '按会员身份开放专属服务',
    icon: 'mdi:crown-outline',
    color: '#7c3aed'
  }
];

const defaultConfig: CampaignConfig = {
  version: 1,
  publishedVersion: 3,
  categories: ['全部', '新人成长', '日常任务', '会员权益'],
  campaigns: [
    {
      id: 'campaign-onboarding',
      code: 'welcome-path',
      type: 'onboarding',
      title: '新人成长计划',
      summary: '完成三个简单步骤，解锁新会员专属权益。',
      category: '新人成长',
      status: 'active',
      visible: true,
      featured: true,
      startAt: '2026-07-01',
      endAt: '2026-12-31',
      audience: 'new-member',
      platforms: ['h5', 'app', 'pwa'],
      theme: '#2563eb',
      rules: {
        target: 3,
        unit: '项任务',
        benefit: '成长礼遇',
        steps: ['完善个人资料', '收藏感兴趣的内容', '完成首次服务预约']
      }
    },
    {
      id: 'campaign-checkin',
      code: 'weekly-check-in',
      type: 'check-in',
      title: '七日签到挑战',
      summary: '保持每日签到，连续七天获得会员积分。',
      category: '日常任务',
      status: 'active',
      visible: true,
      featured: false,
      startAt: '2026-07-01',
      endAt: '2026-09-30',
      audience: 'member',
      platforms: ['h5', 'app'],
      theme: '#0f766e',
      rules: {
        target: 7,
        unit: '天',
        benefit: '700 会员积分',
        steps: ['每日访问活动页', '完成当日签到', '连续七天解锁额外权益']
      }
    },
    {
      id: 'campaign-milestone',
      code: 'city-explorer',
      type: 'milestone',
      title: '城市探索里程碑',
      summary: '参与城市体验，逐步点亮探索徽章。',
      category: '日常任务',
      status: 'scheduled',
      visible: true,
      featured: true,
      startAt: '2026-08-01',
      endAt: '2026-11-30',
      audience: 'all',
      platforms: ['h5', 'app', 'pwa'],
      theme: '#b45309',
      rules: {
        target: 5,
        unit: '个地点',
        benefit: '城市探索徽章',
        steps: ['选择感兴趣的路线', '完成地点打卡', '达到里程碑领取徽章']
      }
    },
    {
      id: 'campaign-benefit',
      code: 'premium-care',
      type: 'member-benefit',
      title: '会员专属服务周',
      summary: '高级会员可预约一对一城市服务顾问。',
      category: '会员权益',
      status: 'active',
      visible: true,
      featured: false,
      startAt: '2026-07-10',
      endAt: '2026-08-10',
      audience: 'premium',
      platforms: ['h5', 'app'],
      theme: '#7c3aed',
      rules: {
        target: 1,
        unit: '次预约',
        benefit: '专属顾问服务',
        steps: ['验证会员等级', '选择可预约时间', '提交服务需求']
      }
    }
  ]
};

const draftKey = 'mtal_campaign_studio_draft';
const publishedKey = 'mtal_campaign_studio_published';
const versionsKey = 'mtal_campaign_studio_versions';
const runtimeBaseUrl = import.meta.env.VITE_MOBILE_RUNTIME_URL || 'http://localhost:4180';
const runtimeOrigin = new URL(runtimeBaseUrl).origin;
const previewUrl = `${runtimeBaseUrl}/campaigns?preview=1&parentOrigin=${encodeURIComponent(window.location.origin)}`;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
function load<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

const config = ref(load(draftKey, clone(defaultConfig)));
const publishedConfig = ref(load(publishedKey, clone(defaultConfig)));
const versions = ref<VersionRecord[]>(load(versionsKey, []));
const selectedId = ref(config.value.campaigns[0]?.id || '');
const keyword = ref('');
const statusFilter = ref<CampaignStatus | null>(null);
const categoryFilter = ref<string | null>(null);
const previewReady = ref(false);
const iframeRef = ref<HTMLIFrameElement>();
const editorVisible = ref(false);
const editorStep = ref(1);
const isEditing = ref(false);
const versionDrawerVisible = ref(false);

const emptyCampaign = (): Campaign => ({
  id: '',
  code: '',
  type: 'onboarding',
  title: '',
  summary: '',
  category: '新人成长',
  status: 'draft',
  visible: true,
  featured: false,
  startAt: '2026-07-07',
  endAt: '2026-12-31',
  audience: 'all',
  platforms: ['h5'],
  theme: '#2563eb',
  rules: { target: 3, unit: '项任务', benefit: '', steps: ['步骤一', '步骤二', '步骤三'] }
});
const editor = reactive<Campaign>(emptyCampaign());

const selectedCampaign = computed(() => config.value.campaigns.find(item => item.id === selectedId.value));
const filteredCampaigns = computed(() =>
  config.value.campaigns.filter(item => {
    const matchesKeyword =
      !keyword.value || `${item.title}${item.code}`.toLowerCase().includes(keyword.value.toLowerCase());
    return (
      matchesKeyword &&
      (!statusFilter.value || item.status === statusFilter.value) &&
      (!categoryFilter.value || item.category === categoryFilter.value)
    );
  })
);
const hasChanges = computed(() => JSON.stringify(config.value) !== JSON.stringify(publishedConfig.value));
const activeCount = computed(
  () => config.value.campaigns.filter(item => item.status === 'active' && item.visible).length
);
const selectedTypeMeta = computed(() => typeRegistry.find(item => item.value === editor.type)!);

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '待生效', value: 'scheduled' },
  { label: '进行中', value: 'active' },
  { label: '已暂停', value: 'paused' }
];
const audienceOptions = [
  { label: '全部用户', value: 'all' },
  { label: '新会员', value: 'new-member' },
  { label: '普通会员', value: 'member' },
  { label: '高级会员', value: 'premium' }
];
const platformOptions = [
  { label: '移动 H5', value: 'h5' },
  { label: '原生 App', value: 'app' },
  { label: 'PWA', value: 'pwa' }
];
const categoryOptions = computed(() =>
  config.value.categories.filter(item => item !== '全部').map(value => ({ label: value, value }))
);
const filterCategoryOptions = computed(() => categoryOptions.value);

function sendPreview() {
  iframeRef.value?.contentWindow?.postMessage(
    { channel: 'campaign-studio', type: 'CONFIG_UPDATE', payload: clone(config.value) },
    runtimeOrigin
  );
}
function handleMessage(event: MessageEvent) {
  if (event.origin !== runtimeOrigin || event.source !== iframeRef.value?.contentWindow) return;
  if (event.data?.channel === 'campaign-studio' && event.data?.type === 'PREVIEW_READY') {
    previewReady.value = true;
    sendPreview();
  }
}
window.addEventListener('message', handleMessage);
onBeforeUnmount(() => window.removeEventListener('message', handleMessage));
watch(
  config,
  () => {
    localStorage.setItem(draftKey, JSON.stringify(config.value));
    nextTick(sendPreview);
  },
  { deep: true }
);

function openCreate() {
  Object.assign(editor, emptyCampaign());
  editorVisible.value = true;
  editorStep.value = 1;
  isEditing.value = false;
}
function openEdit(campaign: Campaign) {
  Object.assign(editor, clone(campaign));
  editorVisible.value = true;
  editorStep.value = 2;
  isEditing.value = true;
  selectedId.value = campaign.id;
}
function chooseType(type: CampaignType) {
  const meta = typeRegistry.find(item => item.value === type)!;
  editor.type = type;
  editor.theme = meta.color;
  if (!editor.title) editor.title = meta.label;
  editor.category = type === 'onboarding' ? '新人成长' : type === 'member-benefit' ? '会员权益' : '日常任务';
  editor.rules.target = type === 'check-in' ? 7 : type === 'milestone' ? 5 : type === 'member-benefit' ? 1 : 3;
  editor.rules.unit =
    type === 'check-in' ? '天' : type === 'milestone' ? '个里程碑' : type === 'member-benefit' ? '项权益' : '项任务';
  editorStep.value = 2;
}
function saveCampaign() {
  if (!editor.title.trim() || !editor.code.trim()) return window.$message?.warning('请填写活动名称和唯一编码');
  if (!editor.rules.benefit.trim()) return window.$message?.warning('请填写完成权益');
  if (editor.platforms.length === 0) return window.$message?.warning('至少选择一个发布终端');
  if (isEditing.value) {
    const index = config.value.campaigns.findIndex(item => item.id === editor.id);
    if (index >= 0) config.value.campaigns[index] = clone(editor);
  } else {
    editor.id = `campaign-${Date.now()}`;
    config.value.campaigns.push(clone(editor));
    selectedId.value = editor.id;
  }
  editorVisible.value = false;
  window.$message?.success(isEditing.value ? '活动配置已更新' : '活动草稿已创建');
}
function duplicateCampaign(campaign: Campaign) {
  const copy = clone(campaign);
  copy.id = `campaign-${Date.now()}`;
  copy.code = `${campaign.code}-copy`;
  copy.title = `${campaign.title}（副本）`;
  copy.status = 'draft';
  config.value.campaigns.push(copy);
  selectedId.value = copy.id;
  window.$message?.success('已复制为新草稿');
}
function removeCampaign(campaign: Campaign) {
  config.value.campaigns = config.value.campaigns.filter(item => item.id !== campaign.id);
  selectedId.value = config.value.campaigns[0]?.id || '';
}
function moveCampaign(campaign: Campaign, offset: number) {
  const index = config.value.campaigns.findIndex(item => item.id === campaign.id);
  const next = index + offset;
  if (next < 0 || next >= config.value.campaigns.length) return;
  config.value.campaigns.splice(index, 1);
  config.value.campaigns.splice(next, 0, campaign);
}
function publish() {
  const nextVersion = (versions.value[0]?.version || config.value.publishedVersion) + 1;
  config.value.publishedVersion = nextVersion;
  publishedConfig.value = clone(config.value);
  versions.value.unshift({
    id: `campaign-version-${Date.now()}`,
    version: nextVersion,
    publishedAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    snapshot: clone(config.value)
  });
  localStorage.setItem(publishedKey, JSON.stringify(publishedConfig.value));
  localStorage.setItem(versionsKey, JSON.stringify(versions.value));
  window.$message?.success(`活动配置 V${nextVersion} 已发布`);
}
function rollback(record: VersionRecord) {
  config.value = clone(record.snapshot);
  versionDrawerVisible.value = false;
  window.$message?.success(`已载入 V${record.version}，发布后生效`);
}
function updateSteps(value: string) {
  editor.rules.steps = value
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}
function statusType(status: CampaignStatus) {
  return ({ draft: 'default', scheduled: 'warning', active: 'success', paused: 'error' } as const)[status];
}
function statusLabel(status: CampaignStatus) {
  return statusOptions.find(item => item.value === status)?.label || status;
}
</script>

<template>
  <NCard title="营销活动编排" :bordered="false" class="campaign-studio">
    <template #header-extra>
      <NSpace align="center">
        <NTag :type="hasChanges ? 'warning' : 'success'" :bordered="false">
          {{ hasChanges ? '有未发布变更' : `已发布 V${config.publishedVersion}` }}
        </NTag>
        <NButton @click="versionDrawerVisible = true">
          <template #icon><SvgIcon icon="mdi:history" /></template>
          版本记录
        </NButton>
        <NButton type="primary" :disabled="!hasChanges" @click="publish">
          <template #icon><SvgIcon icon="mdi:cloud-upload-outline" /></template>
          发布配置
        </NButton>
      </NSpace>
    </template>

    <NAlert type="info" :bordered="false" class="summary-alert">
      配置协议 V{{ config.version }} · {{ config.campaigns.length }} 个活动 · {{ activeCount }} 个正在投放 ·
      {{ config.categories.length - 1 }} 个活动分类
    </NAlert>

    <div class="studio-layout">
      <NCard title="活动配置" size="small" class="management-pane">
        <template #header-extra>
          <NButton type="primary" size="small" @click="openCreate">
            <template #icon><SvgIcon icon="mdi:plus" /></template>
            新建活动
          </NButton>
        </template>
        <div class="toolbar">
          <NInput v-model:value="keyword" clearable placeholder="搜索活动名称或编码">
            <template #prefix><SvgIcon icon="mdi:magnify" /></template>
          </NInput>
          <NSelect v-model:value="categoryFilter" clearable placeholder="全部分类" :options="filterCategoryOptions" />
          <NSelect v-model:value="statusFilter" clearable placeholder="全部状态" :options="statusOptions" />
          <NButton
            @click="
              keyword = '';
              categoryFilter = null;
              statusFilter = null;
            "
          >
            <template #icon><SvgIcon icon="mdi:refresh" /></template>
            重置
          </NButton>
        </div>

        <div class="campaign-table">
          <div class="table-head">
            <span>活动</span>
            <span>分类 / 人群</span>
            <span>投放周期</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          <div
            v-for="(campaign, index) in filteredCampaigns"
            :key="campaign.id"
            class="table-row"
            :class="{ selected: campaign.id === selectedId }"
            @click="selectedId = campaign.id"
          >
            <div class="campaign-cell">
              <span class="type-icon" :style="{ color: campaign.theme, background: `${campaign.theme}14` }">
                <SvgIcon :icon="typeRegistry.find(item => item.value === campaign.type)?.icon || 'mdi:calendar'" />
              </span>
              <div>
                <strong>{{ campaign.title }}</strong>
                <small>
                  {{ campaign.code }} · {{ typeRegistry.find(item => item.value === campaign.type)?.label }}
                </small>
              </div>
            </div>
            <div class="meta-cell">
              <span>{{ campaign.category }}</span>
              <small>{{ audienceOptions.find(item => item.value === campaign.audience)?.label }}</small>
            </div>
            <div class="meta-cell">
              <span>{{ campaign.startAt }}</span>
              <small>至 {{ campaign.endAt }}</small>
            </div>
            <div>
              <NTag size="small" :type="statusType(campaign.status)" :bordered="false">
                {{ statusLabel(campaign.status) }}
              </NTag>
              <NSwitch v-model:value="campaign.visible" size="small" class="visibility-switch" />
            </div>
            <NSpace :size="2" @click.stop>
              <NButton quaternary circle size="small" title="编辑" @click="openEdit(campaign)">
                <template #icon><SvgIcon icon="mdi:pencil-outline" /></template>
              </NButton>
              <NButton quaternary circle size="small" title="复制" @click="duplicateCampaign(campaign)">
                <template #icon><SvgIcon icon="mdi:content-copy" /></template>
              </NButton>
              <NButton
                quaternary
                circle
                size="small"
                title="上移"
                :disabled="index === 0"
                @click="moveCampaign(campaign, -1)"
              >
                <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
              </NButton>
              <NPopconfirm @positive-click="removeCampaign(campaign)">
                <template #trigger>
                  <NButton quaternary circle size="small" type="error" title="删除">
                    <template #icon><SvgIcon icon="mdi:delete-outline" /></template>
                  </NButton>
                </template>
                确认删除该活动？
              </NPopconfirm>
            </NSpace>
          </div>
          <NEmpty v-if="filteredCampaigns.length === 0" description="没有符合条件的活动" class="empty-table" />
        </div>
      </NCard>

      <NCard title="移动端实时预览" size="small" class="preview-pane">
        <template #header-extra>
          <NTag size="small" :type="previewReady ? 'success' : 'warning'" :bordered="false">
            {{ previewReady ? '已连接' : '等待运行端' }}
          </NTag>
        </template>
        <div class="phone-shell">
          <div class="phone-speaker" />
          <iframe ref="iframeRef" :src="previewUrl" title="活动中心实时预览" @load="sendPreview" />
        </div>
        <NButton text type="primary" tag="a" :href="`${runtimeBaseUrl}/campaigns`" target="_blank">
          <template #icon><SvgIcon icon="mdi:open-in-new" /></template>
          独立打开活动中心
        </NButton>
      </NCard>
    </div>

    <NModal
      v-model:show="editorVisible"
      preset="card"
      :title="isEditing ? '编辑活动' : '新建活动'"
      class="editor-modal"
    >
      <NSteps :current="editorStep" size="small" class="editor-steps">
        <NStep title="选择类型" />
        <NStep title="基础配置" />
        <NStep title="规则与投放" />
      </NSteps>
      <div v-if="editorStep === 1" class="type-grid">
        <button
          v-for="item in typeRegistry"
          :key="item.value"
          :class="{ active: editor.type === item.value }"
          @click="chooseType(item.value)"
        >
          <span :style="{ color: item.color, background: `${item.color}14` }"><SvgIcon :icon="item.icon" /></span>
          <strong>{{ item.label }}</strong>
          <p>{{ item.description }}</p>
        </button>
      </div>
      <NForm v-else label-placement="top" :model="editor">
        <template v-if="editorStep === 2">
          <div class="form-grid">
            <NFormItem label="活动名称"><NInput v-model:value="editor.title" /></NFormItem>
            <NFormItem label="唯一编码">
              <NInput v-model:value="editor.code" :disabled="isEditing" placeholder="例如 weekly-check-in" />
            </NFormItem>
          </div>
          <NFormItem label="活动摘要"><NInput v-model:value="editor.summary" type="textarea" :rows="3" /></NFormItem>
          <div class="form-grid">
            <NFormItem label="活动分类">
              <NSelect v-model:value="editor.category" :options="categoryOptions" />
            </NFormItem>
            <NFormItem label="活动状态"><NSelect v-model:value="editor.status" :options="statusOptions" /></NFormItem>
          </div>
          <div class="form-grid">
            <NFormItem label="开始日期"><NInput v-model:value="editor.startAt" placeholder="YYYY-MM-DD" /></NFormItem>
            <NFormItem label="结束日期"><NInput v-model:value="editor.endAt" placeholder="YYYY-MM-DD" /></NFormItem>
          </div>
        </template>
        <template v-else>
          <NAlert type="info" :bordered="false" class="type-summary">
            <SvgIcon :icon="selectedTypeMeta.icon" />
            {{ selectedTypeMeta.label }}：{{ selectedTypeMeta.description }}
          </NAlert>
          <div class="form-grid">
            <NFormItem label="目标值">
              <NInputNumber v-model:value="editor.rules.target" :min="1" class="full-width" />
            </NFormItem>
            <NFormItem label="目标单位"><NInput v-model:value="editor.rules.unit" /></NFormItem>
          </div>
          <NFormItem label="完成权益">
            <NInput v-model:value="editor.rules.benefit" placeholder="例如 700 会员积分" />
          </NFormItem>
          <NFormItem label="任务步骤（每行一项）">
            <NInput :value="editor.rules.steps.join('\n')" type="textarea" :rows="4" @update:value="updateSteps" />
          </NFormItem>
          <div class="form-grid">
            <NFormItem label="目标人群">
              <NSelect v-model:value="editor.audience" :options="audienceOptions" />
            </NFormItem>
            <NFormItem label="视觉主题"><NColorPicker v-model:value="editor.theme" :show-alpha="false" /></NFormItem>
          </div>
          <NFormItem label="发布终端">
            <NCheckboxGroup v-model:value="editor.platforms">
              <NSpace>
                <NCheckbox v-for="item in platformOptions" :key="item.value" :value="item.value" :label="item.label" />
              </NSpace>
            </NCheckboxGroup>
          </NFormItem>
          <NSpace>
            <NCheckbox v-model:checked="editor.visible">在活动中心展示</NCheckbox>
            <NCheckbox v-model:checked="editor.featured">设为精选活动</NCheckbox>
          </NSpace>
        </template>
      </NForm>
      <template #footer>
        <div class="modal-actions">
          <NButton v-if="editorStep > 1" @click="editorStep--">上一步</NButton>
          <span />
          <NButton @click="editorVisible = false">取消</NButton>
          <NButton v-if="editorStep < 3" type="primary" @click="editorStep++">下一步</NButton>
          <NButton v-else type="primary" @click="saveCampaign">保存活动</NButton>
        </div>
      </template>
    </NModal>

    <NDrawer v-model:show="versionDrawerVisible" :width="420">
      <NDrawerContent title="活动配置版本">
        <NEmpty v-if="versions.length === 0" description="发布后生成版本记录" />
        <NTimeline v-else>
          <NTimelineItem
            v-for="record in versions"
            :key="record.id"
            :title="`V${record.version}`"
            :time="record.publishedAt"
          >
            <NButton text type="primary" @click="rollback(record)">恢复此版本</NButton>
          </NTimelineItem>
        </NTimeline>
      </NDrawerContent>
    </NDrawer>
  </NCard>
</template>

<style scoped>
.campaign-studio {
  min-height: calc(100vh - 130px);
}
.summary-alert {
  margin-bottom: 16px;
}
.studio-layout {
  display: grid;
  grid-template-columns: minmax(720px, 1fr) 430px;
  gap: 16px;
  align-items: start;
}
.management-pane {
  min-width: 0;
  min-height: 760px;
}
.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 150px 140px auto;
  gap: 8px;
  margin-bottom: 14px;
}
.campaign-table {
  overflow: hidden;
  border: 1px solid rgb(var(--border-color));
  border-radius: 6px;
}
.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(240px, 1.5fr) minmax(130px, 0.8fr) minmax(140px, 0.8fr) 105px 145px;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
}
.table-head {
  background: rgb(var(--table-header-color));
  color: rgb(var(--text-color-2));
  font-size: 13px;
  font-weight: 500;
}
.table-row {
  min-height: 64px;
  border-top: 1px solid rgb(var(--border-color));
  cursor: pointer;
}
.table-row:hover {
  background: rgb(var(--table-color-hover));
}
.table-row.selected {
  background: rgba(var(--primary-color), 0.06);
  box-shadow: inset 3px 0 rgb(var(--primary-color));
}
.campaign-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.type-icon {
  display: grid;
  flex: none;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 6px;
  font-size: 20px;
}
.campaign-cell > div,
.meta-cell {
  display: grid;
  min-width: 0;
  gap: 4px;
}
.campaign-cell strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.campaign-cell small,
.meta-cell small {
  color: rgb(var(--text-color-3));
  font-size: 11px;
}
.visibility-switch {
  margin-left: 8px;
  vertical-align: middle;
}
.empty-table {
  padding: 50px 0;
}
.preview-pane {
  min-height: 760px;
}
.preview-pane :deep(.n-card__content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 13px;
  background: rgba(var(--body-color), 0.55);
}
.phone-shell {
  position: relative;
  width: 390px;
  height: 680px;
  padding: 13px 8px 8px;
  border: 7px solid #20242a;
  border-radius: 30px;
  background: #20242a;
  box-shadow: 0 12px 24px rgba(31, 41, 55, 0.14);
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
.editor-modal {
  width: min(760px, calc(100vw - 32px));
}
.editor-steps {
  margin-bottom: 22px;
}
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.type-grid button {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 2px 12px;
  min-height: 104px;
  padding: 15px;
  border: 1px solid rgb(var(--border-color));
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-align: left;
}
.type-grid button:hover,
.type-grid button.active {
  border-color: rgb(var(--primary-color));
  background: rgba(var(--primary-color), 0.05);
}
.type-grid button > span {
  grid-row: 1/3;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 6px;
  font-size: 23px;
}
.type-grid strong {
  align-self: end;
}
.type-grid p {
  align-self: start;
  margin: 3px 0 0;
  color: rgb(var(--text-color-3));
  font-size: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.full-width {
  width: 100%;
}
.type-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.modal-actions {
  display: flex;
  gap: 8px;
}
.modal-actions > span {
  flex: 1;
}
@media (max-width: 1380px) {
  .studio-layout {
    grid-template-columns: 1fr;
  }
  .preview-pane,
  .management-pane {
    min-height: auto;
  }
  .toolbar {
    grid-template-columns: 1fr 150px 140px auto;
  }
}
@media (max-width: 900px) {
  .studio-layout {
    display: block;
  }
  .management-pane {
    overflow-x: auto;
  }
  .preview-pane {
    margin-top: 16px;
  }
  .campaign-table {
    min-width: 850px;
  }
  .toolbar {
    min-width: 850px;
  }
}
@media (max-width: 600px) {
  .type-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .phone-shell {
    width: 100%;
  }
}
</style>
