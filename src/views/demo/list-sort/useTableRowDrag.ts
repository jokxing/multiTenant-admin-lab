import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import { useDraggable } from 'vue-draggable-plus';

type RowLike = { id: string };

/**
 * 在 Naive DataTable 的 tbody 上复用 vue-draggable-plus。
 * 拖拽结束后通过完整有序 ID 回调，由统一动作入口落库。
 */
export function useTableRowDrag<T extends RowLike>(options: {
  wrapRef: Ref<HTMLElement | null | undefined>;
  rows: Ref<T[]>;
  disabled: Ref<boolean> | (() => boolean);
  onReorder: (orderedIds: string[], previousRows: T[]) => void | Promise<void>;
}) {
  const tbodyRef = ref<HTMLElement | null>(null);
  let dragging = false;
  let snapshot: T[] = [];
  let disposed = false;

  function isDisabled() {
    return typeof options.disabled === 'function' ? options.disabled() : options.disabled.value;
  }

  async function syncTbody() {
    await nextTick();
    if (disposed) return;
    const target = options.wrapRef.value?.querySelector('tbody') ?? null;
    if (target === tbodyRef.value) return;
    destroy();
    tbodyRef.value = target;
    if (target) {
      start(target);
      if (isDisabled()) pause();
    }
  }

  watch([options.wrapRef, () => options.rows.value.map(row => row.id).join('|')], () => {
    void syncTbody();
  }, { flush: 'post', immediate: true });

  const { start, destroy, pause, resume } = useDraggable(tbodyRef, options.rows, {
    immediate: false,
    animation: 150,
    handle: '.sort-drag-handle',
    draggable: 'tr',
    onStart() {
      dragging = true;
      snapshot = options.rows.value.map(row => ({ ...row }));
      if (isDisabled()) pause();
    },
    async onEnd() {
      if (!dragging) return;
      dragging = false;
      if (isDisabled()) {
        options.rows.value = snapshot.map(row => ({ ...row }));
        return;
      }
      const orderedIds = options.rows.value.map(row => row.id);
      const previousIds = snapshot.map(row => row.id);
      if (orderedIds.join('|') === previousIds.join('|')) return;
      await options.onReorder(orderedIds, snapshot);
    }
  });

  watch(
    () => isDisabled(),
    disabled => {
      if (disabled) pause();
      else resume();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    disposed = true;
    destroy();
  });
}
