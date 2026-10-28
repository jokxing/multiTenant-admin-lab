import type { FieldType, FormField, PageType, SearchField } from './types';

export const PAGE_CONFIG_STORAGE_KEYS = {
  published: 'mtal_published_config',
  versions: 'mtal_config_versions',
  tablePreference: 'mtal_table_preference',
  contentRecommendOrder: 'mtal_content_recommend_order',
  contentRecommendFailNext: 'mtal_content_recommend_fail_next',
  langAssetDraft: 'mtal_lang_asset_draft'
} as const;

export const componentOptions: Array<{ type: FieldType; label: string; icon: string }> = [
  { type: 'input', label: '单行输入', icon: 'mdi:form-textbox' },
  { type: 'textarea', label: '多行文本', icon: 'mdi:text-box-outline' },
  { type: 'number', label: '数字输入', icon: 'mdi:numeric' },
  { type: 'select', label: '下拉选择', icon: 'mdi:form-dropdown' },
  { type: 'switch', label: '开关', icon: 'mdi:toggle-switch-outline' },
  { type: 'date', label: '日期选择', icon: 'mdi:calendar-outline' },
  { type: 'lang-asset-group', label: '多语言素材组', icon: 'mdi:translate-variant' }
];

export const defaultPageMeta = {
  pageKey: 'review',
  pageName: '申请审核列表',
  routeKey: 'review',
  routePath: '/demo/runtime/review',
  pageType: 'table-form' as PageType
};

export const pageTypeOptions: Array<{ label: string; value: PageType }> = [
  { label: '列表 + 表单', value: 'table-form' },
  { label: '列表页面', value: 'table' },
  { label: '表单页面', value: 'form' }
];

export const pageTemplateOptions = [
  { label: '审核列表模板', value: 'review' },
  { label: '运营配置模板', value: 'operations' },
  { label: '内容推荐列表', value: 'content-recommend' },
  { label: '多语言素材组表单', value: 'lang-asset-form' },
  { label: '活动素材配置表单', value: 'activity-materials' },
  { label: '空白配置页', value: 'blank' }
] as const;

export const defaultLangAssetFormSchema: FormField[] = [
  {
    field: 'materialGroup',
    label: '多语言素材组',
    type: 'lang-asset-group',
    required: true,
    span: 2,
    primaryLang: 'zh-CN',
    languages: ['zh-CN', 'zh-TW', 'en']
  },
  {
    field: 'remark',
    label: '内部备注',
    type: 'textarea',
    placeholder: '仅后台可见的备注',
    span: 2
  }
];

export const defaultFormSchema: FormField[] = [
  { field: 'name', label: '活动名称', type: 'input', required: true, placeholder: '请输入活动名称', span: 2 },
  {
    field: 'scene',
    label: '参与场景',
    type: 'select',
    required: true,
    options: [
      { label: '注册后参与', value: 'signup' },
      { label: '完成任务后参与', value: 'task' }
    ],
    span: 1
  },
  { field: 'enabled', label: '启用状态', type: 'switch', span: 1 },
  { field: 'rewardAmount', label: '奖励金额', type: 'number', min: 0, max: 10000, span: 1 }
];

export const defaultSearchSchema: SearchField[] = [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '搜索编号、标题或租户' },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '全部状态',
    options: [
      { label: '待审核', value: 1 },
      { label: '待补充', value: 2 },
      { label: '已通过', value: 3 },
      { label: '拒绝', value: 4 }
    ]
  },
  {
    key: 'createdAtRange',
    label: '创建时间',
    type: 'date-range',
    targetKey: 'createdAt',
    placeholder: '选择创建时间'
  },
  {
    key: 'amountRange',
    label: '金额区间',
    type: 'number-range',
    targetKey: 'amount',
    placeholder: '输入金额范围'
  }
];
