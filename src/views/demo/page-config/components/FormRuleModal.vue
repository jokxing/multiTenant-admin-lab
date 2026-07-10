<script setup lang="ts">
import type { FormField } from '../types';

defineProps<{
  selectedField?: FormField;
  conditionFieldOptions: Array<{ label: string; value: string }>;
  clearCondition: () => void;
  saveRules: () => void;
}>();

const show = defineModel<boolean>('show', { required: true });
</script>

<template>
  <NModal v-model:show="show" preset="card" title="规则配置" class="rule-modal">
    <NForm v-if="selectedField" label-placement="left" label-width="110">
      <NFormItem label="必填校验"><NSwitch v-model:value="selectedField.required" /></NFormItem>
      <NFormItem v-if="selectedField.type === 'number'" label="数值范围">
        <NSpace>
          <NInputNumber v-model:value="selectedField.min" placeholder="最小值" />
          <NInputNumber v-model:value="selectedField.max" placeholder="最大值" />
        </NSpace>
      </NFormItem>
      <NFormItem label="正则表达式">
        <NInput v-model:value="selectedField.pattern" placeholder="例如 ^[A-Za-z0-9]+$" />
      </NFormItem>
      <NFormItem label="错误提示">
        <NInput v-model:value="selectedField.message" placeholder="校验失败时展示" />
      </NFormItem>
      <NDivider>条件显隐</NDivider>
      <NFormItem v-if="selectedField.visibleWhen" label="依赖字段">
        <NSelect
          v-model:value="selectedField.visibleWhen.field"
          clearable
          :options="conditionFieldOptions"
          placeholder="不设置则始终显示"
        />
      </NFormItem>
      <NFormItem v-if="selectedField.visibleWhen" label="等于">
        <NInput v-model:value="selectedField.visibleWhen.equals" placeholder="触发显示的值" />
      </NFormItem>
    </NForm>
    <template #footer>
      <div class="actions">
        <NButton @click="clearCondition">清空条件</NButton>
        <NButton type="primary" @click="saveRules">保存规则</NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
.rule-modal {
  width: min(680px, calc(100vw - 32px));
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
