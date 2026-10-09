import assert from 'node:assert/strict';
import { ref } from 'vue';

const memory = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem(key: string) {
      return memory.has(key) ? memory.get(key)! : null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
    },
    removeItem(key: string) {
      memory.delete(key);
    }
  },
  configurable: true
});

const {
  CONTENT_RECOMMEND_STORAGE_KEYS,
  DEFAULT_CONTENT_RECOMMEND_ROWS,
  saveContentRecommendOrder,
  setFailNextSave
} = await import('./contentRecommendStore');
const { useListSortActions } = await import('./useListSortActions');

async function testSaveSuccessAndRestore() {
  memory.clear();
  const ordered = DEFAULT_CONTENT_RECOMMEND_ROWS.map(row => row.id).reverse();
  const result = await saveContentRecommendOrder(ordered, { delayMs: 0 });
  assert.equal(result.ok, true);
  assert.equal(localStorage.getItem(CONTENT_RECOMMEND_STORAGE_KEYS.order), JSON.stringify(ordered));
}

async function testSaveFailureFlag() {
  memory.clear();
  setFailNextSave(true);
  const ordered = DEFAULT_CONTENT_RECOMMEND_ROWS.map(row => row.id);
  const result = await saveContentRecommendOrder(ordered, { delayMs: 0 });
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.message, /Mock 保存失败/);
  assert.equal(localStorage.getItem(CONTENT_RECOMMEND_STORAGE_KEYS.failNext), null);
}

async function testDispatchRollbackAndDuplicateGuard() {
  memory.clear();
  const rows = ref(DEFAULT_CONTENT_RECOMMEND_ROWS.map(row => ({ ...row })));
  const filtered = ref(false);
  const errors: string[] = [];
  const sort = useListSortActions({
    rows,
    isFiltered: filtered,
    onError: message => errors.push(message)
  });

  setFailNextSave(true);
  const before = rows.value.map(row => row.id).join(',');
  const failed = await sort.dispatchSortAction('sortTop', 'cr_1003');
  assert.equal(failed, false);
  assert.equal(rows.value.map(row => row.id).join(','), before);
  assert.ok(errors.some(item => /保存失败|恢复原顺序/.test(item)));

  sort.submitting.value = true;
  const blocked = await sort.dispatchSortAction('sort-down', 'cr_1001');
  assert.equal(blocked, false);
  assert.ok(errors.some(item => /提交中|连续操作/.test(item)));
  sort.submitting.value = false;

  filtered.value = true;
  const filteredBlocked = await sort.dispatchSortAction('sort-up', 'cr_1002');
  assert.equal(filteredBlocked, false);
  assert.ok(errors.some(item => /筛选/.test(item)));
}

await testSaveSuccessAndRestore();
await testSaveFailureFlag();
await testDispatchRollbackAndDuplicateGuard();
console.log('list-sort-save tests passed');
