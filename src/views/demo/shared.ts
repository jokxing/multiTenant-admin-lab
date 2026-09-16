import { computed, h, reactive, ref } from 'vue';
import { NButton, NInput, NInputNumber, NSelect, NSwitch, NTag } from 'naive-ui';

export type DemoRole = 'platform' | 'tenant' | 'auditor';
export type DemoAction = 'add' | 'edit' | 'approve' | 'delete' | 'export' | (string & {});

export interface RouteKeyRecord {
  key: string;
  title: string;
  buttons: DemoAction[];
}

export interface SchemaField {
  field: string;
  label: string;
  type: 'input' | 'select' | 'number' | 'switch';
  required?: boolean;
  visibleWhen?: (model: Record<string, any>) => boolean;
  options?: { label: string; value: string | number }[];
}

export interface PageColumn {
  key: string;
  title: string;
  type?: 'tag' | 'amount' | 'action';
  options?: Array<{
    label: string;
    value: string | number;
    type?: 'default' | 'info' | 'success' | 'warning' | 'error';
  }>;
  actions?: TableAction[];
}

export interface TableAction {
  key: string;
  label: string;
  mode: 'form' | 'confirm' | 'slot';
  permission?: DemoAction;
  type?: 'default' | 'primary' | 'error';
  confirmText?: string;
  slot?: string;
  formSchema?: Array<{
    field: string;
    label: string;
    type: 'input' | 'number' | 'select';
    required?: boolean;
    options?: Array<{ label: string; value: string }>;
  }>;
}

export const roleProfiles = reactive<
  Record<DemoRole, { label: string; description: string; routeKeys: RouteKeyRecord[] }>
>({
  platform: {
    label: '平台超管',
    description: '可查看全部租户菜单，可配置角色、页面元数据和关键审核动作。',
    routeKeys: [
      { key: 'workspace', title: '工作台', buttons: ['export'] },
      { key: 'operations', title: '运营配置', buttons: ['add', 'edit', 'approve', 'delete', 'export'] },
      { key: 'review', title: '申请审核', buttons: ['edit', 'approve', 'delete', 'export'] },
      { key: 'page_setting', title: '页面配置器', buttons: ['add', 'edit', 'export'] }
    ]
  },
  tenant: {
    label: '租户管理员',
    description: '只能管理当前租户的业务菜单，可编辑配置但不能删除核心数据。',
    routeKeys: [
      { key: 'workspace', title: '工作台', buttons: ['export'] },
      { key: 'operations', title: '运营配置', buttons: ['add', 'edit', 'export'] },
      { key: 'review', title: '申请审核', buttons: ['edit', 'approve', 'export'] }
    ]
  },
  auditor: {
    label: '审核专员',
    description: '只开放审核列表和只读统计，按钮权限收敛到查看与通过。',
    routeKeys: [
      { key: 'workspace', title: '工作台', buttons: [] },
      { key: 'review', title: '申请审核', buttons: ['approve'] }
    ]
  }
});

export const activeRole = ref<DemoRole>('tenant');

export const currentProfile = computed(() => roleProfiles[activeRole.value]);

export function canUse(routeKey: string, action: DemoAction) {
  return Boolean(currentProfile.value.routeKeys.find(item => item.key === routeKey)?.buttons.includes(action));
}

export const reviewRows = ref([
  {
    id: 1001,
    title: '新客奖励配置',
    tenant: '租户 A',
    amount: 1200,
    status: 1,
    risk: '低',
    createdAt: '2026-07-01'
  },
  {
    id: 1002,
    title: '渠道素材发布',
    tenant: '租户 B',
    amount: 0,
    status: 2,
    risk: '中',
    createdAt: '2026-07-03'
  },
  {
    id: 1003,
    title: '用户分层规则',
    tenant: '租户 A',
    amount: 650,
    status: 3,
    risk: '低',
    createdAt: '2026-07-05'
  },
  {
    id: 1004,
    title: '大额申请复核',
    tenant: '租户 C',
    amount: 5000,
    status: 1,
    risk: '高',
    createdAt: '2026-07-08'
  }
]);

export const activityModel = reactive<Record<string, any>>({
  name: '夏季增长活动',
  scene: 'signup',
  enabled: true,
  rewardType: 'fixed',
  rewardAmount: 88,
  minAmount: 100,
  maxAmount: 500
});

export const activitySchema: SchemaField[] = [
  { field: 'name', label: '活动名称', type: 'input', required: true },
  {
    field: 'scene',
    label: '参与场景',
    type: 'select',
    options: [
      { label: '注册后参与', value: 'signup' },
      { label: '完成任务后参与', value: 'task' },
      { label: '审核通过后参与', value: 'review' }
    ]
  },
  { field: 'enabled', label: '启用状态', type: 'switch' },
  {
    field: 'rewardType',
    label: '奖励模式',
    type: 'select',
    options: [
      { label: '固定奖励', value: 'fixed' },
      { label: '区间奖励', value: 'range' }
    ]
  },
  {
    field: 'rewardAmount',
    label: '固定金额',
    type: 'number',
    visibleWhen: model => model.rewardType === 'fixed'
  },
  {
    field: 'minAmount',
    label: '最小金额',
    type: 'number',
    visibleWhen: model => model.rewardType === 'range'
  },
  {
    field: 'maxAmount',
    label: '最大金额',
    type: 'number',
    visibleWhen: model => model.rewardType === 'range'
  }
];

export const defaultPageColumns: PageColumn[] = [
  { key: 'id', title: '编号' },
  { key: 'title', title: '申请标题' },
  { key: 'tenant', title: '租户' },
  { key: 'amount', title: '金额', type: 'amount' },
  {
    key: 'status',
    title: '状态',
    type: 'tag',
    options: [
      { label: '待审核', value: 1, type: 'info' },
      { label: '待补充', value: 2, type: 'warning' },
      { label: '已通过', value: 3, type: 'success' },
      { label: '拒绝', value: 4, type: 'error' }
    ]
  },
  {
    key: 'action',
    title: '操作',
    type: 'action',
    actions: [
      {
        key: 'edit',
        label: '编辑',
        mode: 'form',
        permission: 'edit',
        type: 'default',
        formSchema: [
          { field: 'title', label: '申请标题', type: 'input', required: true },
          { field: 'amount', label: '金额', type: 'number', required: true }
        ]
      },
      {
        key: 'approve',
        label: '通过',
        mode: 'confirm',
        permission: 'approve',
        type: 'primary',
        confirmText: '确认通过当前申请？'
      },
      { key: 'detail', label: '详情', mode: 'slot', type: 'default', slot: 'detail-panel' },
      {
        key: 'delete',
        label: '删除',
        mode: 'confirm',
        permission: 'delete',
        type: 'error',
        confirmText: '删除后不可恢复，是否继续？'
      }
    ]
  }
];

export const pageColumns = ref<PageColumn[]>(structuredClone(defaultPageColumns));

export function resetPageColumns() {
  pageColumns.value = structuredClone(defaultPageColumns);
}

export function createFormRenderer(model: Record<string, any>) {
  return function renderField(field: SchemaField) {
    const commonProps = {
      value: model[field.field],
      'onUpdate:value': (value: any) => {
        model[field.field] = value;
      }
    };

    if (field.type === 'select') {
      return h(NSelect, { ...commonProps, options: field.options || [] });
    }

    if (field.type === 'number') {
      return h(NInputNumber, { ...commonProps, min: 0, class: 'w-full' });
    }

    if (field.type === 'switch') {
      return h(NSwitch, commonProps);
    }

    return h(NInput, { ...commonProps, placeholder: `请输入${field.label}` });
  };
}

function getPreviewCellValue(row: Record<string, any>, key: string) {
  if (row[key] != null && row[key] !== '') return row[key];
  if (/time|date|created/i.test(key)) return row.createdAt || '-';

  return '-';
}

export function buildColumns(
  routeKey = 'review',
  onAction?: (action: TableAction, row: any) => void,
  enforcePermission = true
) {
  return pageColumns.value.map(column => {
    if (column.type === 'tag') {
      return {
        title: column.title,
        key: column.key,
        render: (row: any) => {
          const rawValue = getPreviewCellValue(row, column.key);
          const option = column.options?.find(item => String(item.value) === String(rawValue));

          return h(
            NTag,
            { type: option?.type || 'default', size: 'small' },
            { default: () => option?.label || rawValue }
          );
        }
      };
    }

    if (column.type === 'amount') {
      return {
        title: column.title,
        key: column.key,
        render: (row: any) => (row.amount ? `¥${row.amount.toLocaleString()}` : '-')
      };
    }

    if (column.type === 'action') {
      const actions = column.actions || [];
      return {
        title: column.title,
        key: column.key,
        width: 220,
        render: (row: any) =>
          h(
            'div',
            { class: 'flex flex-wrap justify-center gap-8px' },
            actions
              .filter(action => !enforcePermission || !action.permission || canUse(routeKey, action.permission))
              .map(action =>
                h(
                  NButton,
                  { size: 'small', type: action.type, onClick: () => onAction?.(action, row) },
                  { default: () => action.label }
                )
              )
          )
      };
    }

    return {
      title: column.title,
      key: column.key,
      render: (row: any) => getPreviewCellValue(row, column.key)
    };
  });
}
