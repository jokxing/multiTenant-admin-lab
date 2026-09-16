import type { PageColumn } from '../shared';

export type FieldType = 'input' | 'textarea' | 'select' | 'number' | 'switch' | 'date';

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
};

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
