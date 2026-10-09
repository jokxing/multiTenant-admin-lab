export type SortActionName = 'drag-sort' | 'sortTop' | 'sort-up' | 'sort-down';

export type ContentRecommendItem = {
  id: string;
  title: string;
  channel: string;
  weight: number;
  status: number;
  updatedAt: string;
};

export type SortActionPayload = {
  /** 拖拽落点目标实体 ID；仅 drag-sort 使用 */
  targetId?: string;
  /** 拖拽后完整有序 ID 列表；优先于 targetId */
  orderedIds?: string[];
  /**
   * 拖拽场景下 Sortable 可能已改写 rows。
   * 传入变更前快照，保存失败时才能正确回滚。
   */
  previousRows?: Array<{ id: string; [key: string]: unknown }>;
};
