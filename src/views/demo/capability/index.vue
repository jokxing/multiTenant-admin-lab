<script setup lang="ts">
import { computed } from 'vue';
import { activeRole, buildColumns, canUse, currentProfile, reviewRows, roleProfiles, type DemoRole } from '../shared';

defineOptions({ name: 'DemoCapability' });

const roleOptions = computed(() =>
  Object.entries(roleProfiles).map(([value, profile]) => ({
    label: profile.label,
    value
  }))
);

const visibleMenus = computed(() => currentProfile.value.routeKeys.map(item => item.title).join(' / '));
const columns = computed(() => buildColumns('review'));

function setRole(value: string) {
  activeRole.value = value as DemoRole;
}
</script>

<template>
  <div class="demo-page">
    <NCard title="权限实验台" :bordered="false">
      <div class="toolbar">
        <NSelect class="role-select" :value="activeRole" :options="roleOptions" @update:value="setRole" />
        <NText depth="3">{{ currentProfile.description }}</NText>
      </div>

      <NGrid :cols="3" :x-gap="12" :y-gap="12" responsive="screen">
        <NGi>
          <NStatistic label="当前菜单数" :value="currentProfile.routeKeys.length" />
        </NGi>
        <NGi>
          <NStatistic label="审核按钮" :value="canUse('review', 'approve') ? '可用' : '隐藏'" />
        </NGi>
        <NGi>
          <NStatistic label="删除按钮" :value="canUse('review', 'delete') ? '可用' : '隐藏'" />
        </NGi>
      </NGrid>

      <NDivider />
      <NText strong>菜单来源 route_keys：</NText>
      <div class="menu-line">{{ visibleMenus }}</div>

      <NDataTable class="mt-16px" :columns="columns" :data="reviewRows" :bordered="false" size="small" />
    </NCard>
  </div>
</template>

<style scoped>
.demo-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.role-select {
  width: 180px;
}

.menu-line {
  margin-top: 8px;
  color: #42526e;
}

.mt-16px {
  margin-top: 16px;
}
</style>
