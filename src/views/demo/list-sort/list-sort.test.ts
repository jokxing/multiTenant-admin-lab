import assert from 'node:assert/strict';
import { applySortAction, canSortAction, findIndexById, moveItem } from './reorder';

type Row = { id: string; title: string };

function rows(): Row[] {
  return [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
    { id: 'c', title: 'C' },
    { id: 'd', title: 'D' }
  ];
}

function ids(list: Row[]) {
  return list.map(item => item.id).join(',');
}

assert.equal(findIndexById(rows(), 'c'), 2);
assert.equal(findIndexById(rows(), 'missing'), -1);

assert.equal(ids(moveItem(rows(), 3, 0)), 'd,a,b,c');
assert.equal(ids(moveItem(rows(), 0, 0)), 'a,b,c,d');

// 首项边界：置顶 / 上移无效
assert.equal(canSortAction(rows(), 'sortTop', 'a'), false);
assert.equal(canSortAction(rows(), 'sort-up', 'a'), false);
assert.equal(ids(applySortAction(rows(), 'sortTop', 'a')), 'a,b,c,d');

// 末项边界：下移无效
assert.equal(canSortAction(rows(), 'sort-down', 'd'), false);
assert.equal(ids(applySortAction(rows(), 'sort-down', 'd')), 'a,b,c,d');

// 排序成功路径
assert.equal(ids(applySortAction(rows(), 'sortTop', 'c')), 'c,a,b,d');
assert.equal(ids(applySortAction(rows(), 'sort-up', 'c')), 'a,c,b,d');
assert.equal(ids(applySortAction(rows(), 'sort-down', 'a')), 'b,a,c,d');
assert.equal(ids(applySortAction(rows(), 'drag-sort', 'd', { targetId: 'a' })), 'd,a,b,c');
assert.equal(ids(applySortAction(rows(), 'drag-sort', 'a', { orderedIds: ['c', 'a', 'b', 'd'] })), 'c,a,b,d');

// 稳定实体 ID：按 id 定位，不依赖调用方传入显示索引
const shifted = applySortAction(rows(), 'sort-up', 'c');
assert.equal(shifted[1]?.id, 'c');
assert.equal(shifted[1]?.title, 'C');

console.log('list-sort tests passed');
