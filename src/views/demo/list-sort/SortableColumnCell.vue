<script setup lang="ts">
import { computed } from 'vue';
import type { SortActionName } from './types';

const props = defineProps<{
  entityId: string;
  index: number;
  total: number;
  disabled?: boolean;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  action: [name: SortActionName, entityId: string];
}>();

const isFirst = computed(() => props.index <= 0);
const isLast = computed(() => props.index >= props.total - 1);
const locked = computed(() => Boolean(props.disabled || props.submitting));

function trigger(action: SortActionName) {
  if (locked.value) return;
  if ((action === 'sortTop' || action === 'sort-up') && isFirst.value) return;
  if (action === 'sort-down' && isLast.value) return;
  emit('action', action, props.entityId);
}
</script>

<template>
  <div class="sortable-column-cell" :class="{ locked }">
    <NButton
      class="sort-drag-handle"
      quaternary
      circle
      size="tiny"
      title="拖拽排序"
      :disabled="locked"
      @click.stop
    >
      <template #icon><SvgIcon icon="mdi:drag" /></template>
    </NButton>
    <NButton
      quaternary
      circle
      size="tiny"
      title="置顶"
      :disabled="locked || isFirst"
      @click.stop="trigger('sortTop')"
    >
      <template #icon><SvgIcon icon="mdi:arrow-collapse-up" /></template>
    </NButton>
    <NButton
      quaternary
      circle
      size="tiny"
      title="上移"
      :disabled="locked || isFirst"
      @click.stop="trigger('sort-up')"
    >
      <template #icon><SvgIcon icon="mdi:arrow-up" /></template>
    </NButton>
    <NButton
      quaternary
      circle
      size="tiny"
      title="下移"
      :disabled="locked || isLast"
      @click.stop="trigger('sort-down')"
    >
      <template #icon><SvgIcon icon="mdi:arrow-down" /></template>
    </NButton>
  </div>
</template>

<style scoped>
.sortable-column-cell {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.sortable-column-cell.locked {
  opacity: 0.55;
}

.sort-drag-handle {
  cursor: grab;
}

.sort-drag-handle:active {
  cursor: grabbing;
}
</style>
