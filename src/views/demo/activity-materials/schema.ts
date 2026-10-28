import type { PageConfig } from '../page-config/types';

/** 活动素材配置表单：纯表单页，仅含多语言素材组字段。 */
export const activityMaterialsPageConfig: PageConfig = {
  pageKey: 'activity-materials',
  pageName: '活动素材配置表单',
  routeKey: 'activity_materials',
  routePath: '/demo/runtime/activity-materials',
  pageType: 'form',
  savePermission: 'edit',
  table: [],
  search: [],
  form: [
    {
      field: 'materialGroup',
      label: '多语言素材组',
      type: 'lang-asset-group',
      required: true,
      span: 2,
      primaryLang: 'zh-CN',
      languages: ['zh-CN', 'en']
    }
  ]
};
