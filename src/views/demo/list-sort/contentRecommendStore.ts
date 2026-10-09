import { ref } from 'vue';
import type { ContentRecommendItem } from './types';

export const CONTENT_RECOMMEND_STORAGE_KEYS = {
  order: 'mtal_content_recommend_order',
  failNext: 'mtal_content_recommend_fail_next'
} as const;

export const DEFAULT_CONTENT_RECOMMEND_ROWS: ContentRecommendItem[] = [
  {
    id: 'cr_1001',
    title: '首页焦点图 · 春季主题',
    channel: '首页',
    weight: 100,
    status: 1,
    updatedAt: '2026-09-01'
  },
  {
    id: 'cr_1002',
    title: '活动入口 · 新客礼包',
    channel: '活动页',
    weight: 90,
    status: 1,
    updatedAt: '2026-09-03'
  },
  {
    id: 'cr_1003',
    title: '内容卡片 · 运营周报',
    channel: '资讯流',
    weight: 80,
    status: 2,
    updatedAt: '2026-09-05'
  },
  {
    id: 'cr_1004',
    title: '横幅 · 版本更新说明',
    channel: '首页',
    weight: 70,
    status: 1,
    updatedAt: '2026-09-08'
  },
  {
    id: 'cr_1005',
    title: '推荐位 · 热门专题',
    channel: '发现',
    weight: 60,
    status: 3,
    updatedAt: '2026-09-10'
  }
];

function cloneRows(rows: ContentRecommendItem[]): ContentRecommendItem[] {
  return rows.map(row => ({ ...row }));
}

function loadOrderIds(): string[] | null {
  try {
    const raw = localStorage.getItem(CONTENT_RECOMMEND_STORAGE_KEYS.order);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function applyOrder(rows: ContentRecommendItem[], orderIds: string[] | null): ContentRecommendItem[] {
  if (!orderIds?.length) return cloneRows(rows);
  const map = new Map(rows.map(row => [row.id, row]));
  const ordered = orderIds.map(id => map.get(id)).filter(Boolean) as ContentRecommendItem[];
  const missing = rows.filter(row => !orderIds.includes(row.id));
  return cloneRows([...ordered, ...missing]);
}

export const contentRecommendRows = ref<ContentRecommendItem[]>(
  applyOrder(DEFAULT_CONTENT_RECOMMEND_ROWS, typeof localStorage === 'undefined' ? null : loadOrderIds())
);

export function resetContentRecommendRows() {
  contentRecommendRows.value = cloneRows(DEFAULT_CONTENT_RECOMMEND_ROWS);
  localStorage.removeItem(CONTENT_RECOMMEND_STORAGE_KEYS.order);
  localStorage.removeItem(CONTENT_RECOMMEND_STORAGE_KEYS.failNext);
}

export function getFailNextSave(): boolean {
  return localStorage.getItem(CONTENT_RECOMMEND_STORAGE_KEYS.failNext) === '1';
}

export function setFailNextSave(enabled: boolean) {
  if (enabled) localStorage.setItem(CONTENT_RECOMMEND_STORAGE_KEYS.failNext, '1');
  else localStorage.removeItem(CONTENT_RECOMMEND_STORAGE_KEYS.failNext);
}

export type SaveOrderResult = { ok: true } | { ok: false; message: string };

/** 本地异步 Mock：持久化有序 ID，不改动实体内容字段。 */
export async function saveContentRecommendOrder(
  orderedIds: string[],
  options?: { delayMs?: number }
): Promise<SaveOrderResult> {
  const delayMs = options?.delayMs ?? 420;
  await new Promise(resolve => setTimeout(resolve, delayMs));

  if (getFailNextSave()) {
    setFailNextSave(false);
    return { ok: false, message: 'Mock 保存失败：排序服务暂不可用，已恢复原顺序，可重试。' };
  }

  localStorage.setItem(CONTENT_RECOMMEND_STORAGE_KEYS.order, JSON.stringify(orderedIds));
  return { ok: true };
}

export function restoreContentRecommendOrderFromStorage() {
  contentRecommendRows.value = applyOrder(DEFAULT_CONTENT_RECOMMEND_ROWS, loadOrderIds());
}
