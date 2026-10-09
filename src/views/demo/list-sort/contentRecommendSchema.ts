import type { PageColumn } from '../shared';
import type { SearchField } from '../page-config/types';

/** 内容推荐列表：无分页完整列表 + 可配置排序列。 */
export const contentRecommendColumns: PageColumn[] = [
  { key: 'sort', title: '排序', type: 'sortable' },
  { key: 'id', title: '内容 ID' },
  { key: 'title', title: '推荐标题' },
  { key: 'channel', title: '投放位置' },
  { key: 'weight', title: '权重' },
  {
    key: 'status',
    title: '状态',
    type: 'tag',
    options: [
      { label: '展示中', value: 1, type: 'success' },
      { label: '待上线', value: 2, type: 'warning' },
      { label: '已下线', value: 3, type: 'default' }
    ]
  },
  { key: 'updatedAt', title: '更新时间' },
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
          { field: 'title', label: '推荐标题', type: 'input', required: true },
          { field: 'channel', label: '投放位置', type: 'input', required: true }
        ]
      }
    ]
  }
];

/** 演示用轻量筛选：有筛选时运行时会禁用排序并提示原因。 */
export const contentRecommendSearchSchema: SearchField[] = [
  { key: 'keyword', label: '关键词', type: 'input', placeholder: '搜索标题或投放位置' },
  {
    key: 'status',
    label: '状态',
    type: 'select',
    placeholder: '全部状态',
    options: [
      { label: '展示中', value: 1 },
      { label: '待上线', value: 2 },
      { label: '已下线', value: 3 }
    ]
  }
];
