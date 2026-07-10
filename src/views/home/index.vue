<script setup lang="ts">
import { useRouter } from 'vue-router';
import { PAGE_CONFIG_STORAGE_KEYS } from '@/views/demo/page-config/constants';

defineOptions({ name: 'Home' });

const router = useRouter();
const capabilities = [
  {
    title: '页面配置与发布',
    description: '表格、表单、操作协议、版本发布与回滚。',
    icon: 'mdi:table-cog',
    route: '/demo/page-config',
    status: '核心能力'
  },
  {
    title: '移动首页编排',
    description: '后台模块配置、跨端实时预览与版本发布。',
    icon: 'mdi:cellphone-cog',
    route: '/demo/home-composer',
    status: '跨端协议'
  },
  {
    title: '营销活动编排',
    description: '类型注册、规则配置、投放范围与 Nuxt 运行端。',
    icon: 'mdi:calendar-star',
    route: '/demo/campaign-studio',
    status: 'Nuxt 闭环'
  },
  {
    title: '角色权限闭环',
    description: 'Schema 权限点发现、角色授权、运行时按钮过滤。',
    icon: 'mdi:shield-account-outline',
    route: '/demo/permission',
    status: 'RBAC'
  },
  {
    title: '权限效果验证',
    description: '切换角色，验证菜单范围和按钮级权限。',
    icon: 'mdi:shield-check-outline',
    route: '/demo/capability',
    status: '运行时'
  },
  {
    title: '实时消息可靠性',
    description: '幂等去重、顺序消费、断线重连与音频队列。',
    icon: 'mdi:access-point-network',
    route: '/demo/realtime',
    status: '实时链路'
  }
];
const demoSteps = [
  { step: '01', title: '配置页面', route: '/demo/page-config' },
  { step: '02', title: '发布版本', route: '/demo/page-config' },
  { step: '03', title: '分配权限', route: '/demo/permission' },
  { step: '04', title: '验证角色', route: '/demo/capability' }
];

function resetDemo() {
  window.$dialog?.warning({
    title: '重置演示数据',
    content: '将清除配置版本、表格偏好和声音设置，并恢复初始角色权限。',
    positiveText: '确认重置',
    negativeText: '取消',
    onPositiveClick() {
      [...Object.values(PAGE_CONFIG_STORAGE_KEYS), 'mtal_sound_settings'].forEach(key => localStorage.removeItem(key));
      window.location.reload();
    }
  });
}
</script>

<template>
  <div class="home-page">
    <header class="intro">
      <div>
        <p class="eyebrow">MULTITENANT ADMIN LAB</p>
        <h1>多租户后台能力复现</h1>
        <p>从真实管理后台抽离通用前端能力，使用模拟数据完成脱敏展示。</p>
      </div>
      <NSpace align="center">
        <NTag type="success" :bordered="false">Vue 3 · TypeScript · Naive UI</NTag>
        <NButton size="small" @click="resetDemo">
          <template #icon><SvgIcon icon="mdi:restore" /></template>
          重置 Demo
        </NButton>
      </NSpace>
    </header>

    <section class="metric-grid">
      <NCard size="small"><NStatistic label="能力模块" :value="4" /></NCard>
      <NCard size="small"><NStatistic label="演示角色" :value="3" /></NCard>
      <NCard size="small"><NStatistic label="配置执行器" :value="3" /></NCard>
      <NCard size="small"><NStatistic label="真实业务数据" value="0" /></NCard>
    </section>

    <section>
      <div class="section-heading">
        <h2>能力模块</h2>
        <span>全部使用本地 Mock 数据</span>
      </div>
      <div class="capability-grid">
        <NCard v-for="item in capabilities" :key="item.route" size="small" class="capability-card">
          <div class="capability-heading">
            <SvgIcon :icon="item.icon" class="capability-icon" />
            <NTag size="small" :bordered="false">{{ item.status }}</NTag>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.description }}</p>
          <NButton text type="primary" @click="router.push(item.route)">
            进入模块
            <template #icon><SvgIcon icon="mdi:arrow-right" /></template>
          </NButton>
        </NCard>
      </div>
    </section>

    <section class="demo-flow">
      <div class="section-heading">
        <h2>推荐演示路径</h2>
        <span>配置定义到运行时验证</span>
      </div>
      <div class="step-list">
        <button
          v-for="item in demoSteps"
          :key="item.step"
          type="button"
          class="step-item"
          @click="router.push(item.route)"
        >
          <span>{{ item.step }}</span>
          <strong>{{ item.title }}</strong>
          <SvgIcon icon="mdi:chevron-right" />
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  display: grid;
  gap: 24px;
}
.intro {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 4px 0;
}
.eyebrow {
  margin: 0 0 8px;
  color: #6366f1;
  font-size: 12px;
  font-weight: 700;
}
.intro h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.35;
  letter-spacing: 0;
}
.intro p:not(.eyebrow) {
  margin: 10px 0 0;
  color: rgba(128, 128, 128, 0.95);
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-heading h2 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0;
}
.section-heading span {
  color: rgba(128, 128, 128, 0.9);
  font-size: 13px;
}
.capability-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.capability-card {
  min-height: 190px;
}
.capability-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.capability-icon {
  width: 26px;
  height: 26px;
  color: #6366f1;
}
.capability-card h3 {
  margin: 18px 0 8px;
  font-size: 16px;
  letter-spacing: 0;
}
.capability-card p {
  min-height: 48px;
  margin: 0 0 16px;
  color: rgba(128, 128, 128, 0.95);
  line-height: 1.6;
}
.demo-flow {
  padding-top: 4px;
}
.step-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid rgba(128, 128, 128, 0.2);
  border-radius: 6px;
  overflow: hidden;
}
.step-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border: 0;
  border-right: 1px solid rgba(128, 128, 128, 0.2);
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.step-item:last-child {
  border-right: 0;
}
.step-item:hover {
  background: rgba(99, 102, 241, 0.06);
}
.step-item span {
  color: #6366f1;
  font-size: 12px;
}
@media (max-width: 1000px) {
  .capability-grid,
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .step-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .step-item:nth-child(2) {
    border-right: 0;
  }
}
@media (max-width: 600px) {
  .intro {
    flex-direction: column;
  }
  .capability-grid,
  .metric-grid,
  .step-list {
    grid-template-columns: 1fr;
  }
  .step-item {
    border-right: 0;
    border-bottom: 1px solid rgba(128, 128, 128, 0.2);
  }
  .step-item:last-child {
    border-bottom: 0;
  }
}
</style>
