import type { DemoAction, PageColumn } from '../shared';

export type FieldType = 'input' | 'textarea' | 'select' | 'number' | 'switch' | 'date' | 'lang-asset-group';

export type FormField = {
  field: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
  span?: 1 | 2;
  visibleWhen?: { field: string; equals: string };
  /** 多语言素材组：主语言，默认 zh-CN */
  primaryLang?: 'zh-CN' | 'zh-TW' | 'en';
  /** 多语言素材组：启用的语言列表 */
  languages?: Array<'zh-CN' | 'zh-TW' | 'en'>;
};

export const FORM_FIELD_TYPES: FieldType[] = [
  'input',
  'textarea',
  'select',
  'number',
  'switch',
  'date',
  'lang-asset-group'
];

export type SearchField = {
  key: string;
  label: string;
  type: 'input' | 'select' | 'date-range' | 'number-range';
  targetKey?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number }>;
};

export type PageType = 'table' | 'form' | 'table-form';

export type PageConfig = {
  pageKey: string;
  pageName: string;
  routeKey: string;
  routePath: string;
  pageType: PageType;
  table: PageColumn[];
  form: FormField[];
  search: SearchField[];
  /** 表单保存所需按钮权限点；缺省表示配置未声明保存权限元数据，不视为已授权 */
  savePermission?: DemoAction;
};

export type ConfigSnapshot = {
  activePageKey: string;
  pages: PageConfig[];
};

export type LegacyConfigSnapshot = {
  table: PageColumn[];
  form: FormField[];
  search?: SearchField[];
};

export type ConfigVersion = {
  id: string;
  version: number;
  publishedAt: string;
  summary: string;
  snapshot: ConfigSnapshot;
};
