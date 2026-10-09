import type { SortActionName, SortActionPayload } from './types';

/** 按稳定实体 ID 查找位置，禁止把显示索引当作业务身份。 */
export function findIndexById<T extends { id: string }>(rows: T[], id: string): number {
  return rows.findIndex(row => row.id === id);
}

export function moveItem<T>(rows: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= rows.length || to >= rows.length || from === to) {
    return rows.slice();
  }
  const next = rows.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * 统一排序动作计算。输入/输出都基于实体 ID，不依赖调用方传入的显示索引。
 */
export function applySortAction<T extends { id: string }>(
  rows: T[],
  action: SortActionName,
  entityId: string,
  payload: SortActionPayload = {}
): T[] {
  if (payload.orderedIds?.length) {
    const map = new Map(rows.map(row => [row.id, row]));
    const ordered = payload.orderedIds.map(id => map.get(id)).filter(Boolean) as T[];
    if (ordered.length !== rows.length) return rows.slice();
    return ordered;
  }

  const from = findIndexById(rows, entityId);
  if (from < 0) return rows.slice();

  if (action === 'sortTop') {
    return moveItem(rows, from, 0);
  }

  if (action === 'sort-up') {
    if (from <= 0) return rows.slice();
    return moveItem(rows, from, from - 1);
  }

  if (action === 'sort-down') {
    if (from >= rows.length - 1) return rows.slice();
    return moveItem(rows, from, from + 1);
  }

  if (action === 'drag-sort') {
    if (!payload.targetId) return rows.slice();
    const to = findIndexById(rows, payload.targetId);
    if (to < 0) return rows.slice();
    return moveItem(rows, from, to);
  }

  return rows.slice();
}

export function canSortAction<T extends { id: string }>(
  rows: T[],
  action: SortActionName,
  entityId: string
): boolean {
  const index = findIndexById(rows, entityId);
  if (index < 0) return false;
  if (action === 'sortTop' || action === 'sort-up') return index > 0;
  if (action === 'sort-down') return index < rows.length - 1;
  return true;
}
