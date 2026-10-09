import { computed, ref, type Ref } from 'vue';
import {
  contentRecommendRows,
  saveContentRecommendOrder,
  setFailNextSave,
  getFailNextSave
} from './contentRecommendStore';
import { applySortAction, canSortAction, findIndexById } from './reorder';
import type { ContentRecommendItem, SortActionName, SortActionPayload } from './types';

export type ListSortOptions = {
  rows?: Ref<ContentRecommendItem[]>;
  /** 是否存在筛选（有筛选时禁用排序） */
  isFiltered: Ref<boolean> | (() => boolean);
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
};

function readFiltered(isFiltered: ListSortOptions['isFiltered']) {
  return typeof isFiltered === 'function' ? isFiltered() : isFiltered.value;
}

/**
 * 列表排序统一动作入口。拖拽与按钮均走 dispatchSortAction，避免各自改数据。
 */
export function useListSortActions(options: ListSortOptions) {
  const rows = options.rows || contentRecommendRows;
  const submitting = ref(false);
  const lastError = ref('');
  const failNext = ref(getFailNextSave());

  const sortBlockedReason = computed(() => {
    if (readFiltered(options.isFiltered)) {
      return '当前存在筛选条件，已禁用排序。请先清空筛选后再调整完整列表顺序（本演示不支持跨筛选结果排序）。';
    }
    if (submitting.value) return '排序保存中，请等待当前操作完成后再继续。';
    return '';
  });

  const sortEnabled = computed(() => !sortBlockedReason.value);

  function getRowIndex(entityId: string) {
    return findIndexById(rows.value, entityId);
  }

  function canPerform(action: SortActionName, entityId: string) {
    if (!sortEnabled.value) return false;
    return canSortAction(rows.value, action, entityId);
  }

  function setFailNext(enabled: boolean) {
    failNext.value = enabled;
    setFailNextSave(enabled);
  }

  async function dispatchSortAction(
    action: SortActionName,
    entityId: string,
    payload: SortActionPayload = {}
  ): Promise<boolean> {
    if (submitting.value) {
      options.onError?.('已有排序操作提交中，请勿连续操作。');
      return false;
    }

    if (readFiltered(options.isFiltered)) {
      options.onError?.(sortBlockedReason.value);
      return false;
    }

    if (action !== 'drag-sort' && !canSortAction(rows.value, action, entityId)) {
      return false;
    }

    const previous = (payload.previousRows?.length ? payload.previousRows : rows.value).map(row => ({
      ...(row as ContentRecommendItem)
    }));
    const baseRows = payload.previousRows?.length
      ? (payload.previousRows as ContentRecommendItem[])
      : rows.value;
    const next = applySortAction(baseRows, action, entityId, payload);
    const nextIds = next.map(row => row.id);
    const prevIds = previous.map(row => row.id);
    if (nextIds.join('|') === prevIds.join('|')) return true;

    // 乐观更新显示顺序，失败时回滚；实体内容字段保持不变。
    rows.value = next;
    submitting.value = true;
    lastError.value = '';

    try {
      const result = await saveContentRecommendOrder(nextIds);
      if (!result.ok) {
        rows.value = previous;
        lastError.value = result.message;
        failNext.value = getFailNextSave();
        options.onError?.(result.message);
        return false;
      }

      failNext.value = getFailNextSave();
      options.onSuccess?.('排序已保存，刷新后可恢复当前顺序。');
      return true;
    } catch (error) {
      rows.value = previous;
      const message = error instanceof Error ? error.message : '排序保存异常，已恢复原顺序。';
      lastError.value = message;
      options.onError?.(message);
      return false;
    } finally {
      submitting.value = false;
    }
  }

  return {
    rows,
    submitting,
    lastError,
    failNext,
    sortEnabled,
    sortBlockedReason,
    canPerform,
    dispatchSortAction,
    getRowIndex,
    setFailNext
  };
}
